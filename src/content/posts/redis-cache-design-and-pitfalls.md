---
title: Redis 缓存设计与常见陷阱：穿透、击穿、雪崩与一致性
published: 2026-09-30
description: '把缓存当成「可以随时丢掉的副本」是设计的第一原则。本文用可运行的 Node.js 代码拆开缓存穿透、击穿、雪崩的根因差异，讲清为什么「先更新库再删缓存」优于「更新缓存」、volatile-* 淘汰策略为什么会把写入打死，以及命中率异常时该看哪几个 INFO 字段。'
image: ''
tags: [Redis, 缓存, 高并发, 后端, 架构, 性能优化]
category: '互联网'
draft: false
lang: ''
---

## 1. 一个「命中率 99%」却仍然打垮数据库的缓存

先说结论：**缓存不是数据库的加速器，它是数据库的一份可丢弃副本**。这句话决定了后面所有设计的边界——副本可以随时丢，所以任何「丢了就出事故」的逻辑都不该放在缓存里。

绝大多数项目用的都是 Cache-Aside（旁路缓存）模式，读路径就三行：

```js
async function getUserCached(id) {
  const key = `user:${id}`;
  const hit = await redis.get(key);
  if (hit !== null) return JSON.parse(hit); // 命中

  const user = await db.findUser(id); // 回源
  if (user) await redis.set(key, JSON.stringify(user), { EX: 300 });
  return user;
}
```

这段代码在演示里永远是对的，在生产里会以三种完全不同的方式失效。而它们的**根因彼此无关，修法也互不通用**——把它们统称为「缓存问题」一并「加个锁」或「加个布隆过滤器」，是线上事故最常见的起点。

下面这张表是全文的骨架：

| 问题 | 触发条件 | 特征 | 对症手段 |
| --- | --- | --- | --- |
| **穿透** | 查一个**根本不存在**的数据 | 缓存和数据库**都没命中**，每次都打到 DB | 空值缓存、布隆过滤器、参数校验 |
| **击穿** | **单个热点 Key** 恰好过期 | 瞬时并发全部落到**同一行**数据上 | 互斥锁、逻辑过期、本地缓存 |
| **雪崩** | **大量 Key 同时失效** 或集群整体不可用 | 请求**无差别**压向 DB | TTL 打散、高可用架构、熔断降级 |

注意「穿透」和「击穿」只差一个字，但前者是**数据不存在**，后者是**数据存在但缓存刚过期**。用布隆过滤器去治击穿是无效的（那个 Key 在数据库里明明存在），用互斥锁去治穿透也是无效的（锁释放后下一次请求照样未命中）。这是最容易搞反的一对。

## 2. 穿透：当数据「根本不存在」

恶意请求或脏数据参数（`id=-1`、`id=999999999`）会稳定地绕过缓存。空值缓存是最省事的方案：

```js
const NULL_SENTINEL = "\u0000null"; // 用一个不可能出现在业务 JSON 里的哨兵值

async function getUserWithNullCache(id) {
  const key = `user:${id}`;
  const hit = await redis.get(key);
  if (hit === NULL_SENTINEL) return null; // 已知不存在，直接短路
  if (hit !== null) return JSON.parse(hit);

  const user = await db.findUser(id);
  if (user) {
    await redis.set(key, JSON.stringify(user), { EX: 300 });
  } else {
    await redis.set(key, NULL_SENTINEL, { EX: 30 }); // 短 TTL
  }
  return user;
}
```

**空值的 TTL 必须远短于正常数据。** 它的作用只是「把 N 次穿透压缩成 1 次回源」，而不是长期保存一个否定结论——否则一旦这个 ID 对应的数据被创建出来，你会在 TTL 内持续返回「不存在」。30 秒到 5 分钟是常见区间。

代价是：如果攻击者每次都用不同的随机 ID，空值缓存会被写爆，反而变成一种内存攻击。这时候要上**布隆过滤器**做前置拦截。Redis 8 起布隆过滤器已经是内置数据结构，不再需要单独安装 Redis Stack 或 RedisBloom 模块（[RedisBloom v2.8.20 发布说明](https://github.com/RedisBloom/RedisBloom/releases/tag/v2.8.20)明确写了这一点）：

```text
BF.RESERVE user:exists 0.01 1000000   # 误判率 1%，容量 100 万
BF.ADD user:exists 1001
(integer) 1
BF.EXISTS user:exists 1001
(integer) 1
BF.EXISTS user:exists 9999
(integer) 0
```

读结果的语义要记牢，这是布隆过滤器的全部要害：

- 返回 `0` → **一定不存在**，可以直接返回空，不查数据库；
- 返回 `1` → **只是可能存在**，仍要回源确认。

代价是它有误判率、并且标准布隆过滤器**不支持删除**（要删除得换 Cuckoo Filter）。所以它适合「只增不删」的 ID 集合，一旦业务上存在删除，就必须接受「删了之后一段时间内仍然被判为存在」——这通常是可以接受的，因为回源会兜住。

:::note
拦截器要放在**最外层**：网关层先做参数格式校验（正整数、长度上限、ID 范围），再做布隆过滤，最后才进应用逻辑。放到业务代码深处，等于把无效请求的解析开销也一并付了。
:::

## 3. 击穿：一个热点 Key 过期的瞬间

击穿的关键词是「单个」和「瞬时」。典型场景是一个爆款商品的详情页——缓存里就一个 Key，QPS 却有几万。它过期的那 10 毫秒内，所有并发都会去查同一行数据库记录。

方案一是**互斥重建**，只放一个请求去回源：

```js
const UNLOCK = `
if redis.call("GET", KEYS[1]) == ARGV[1] then
  return redis.call("DEL", KEYS[1])
end
return 0
`;

async function getHotProduct(id, retries = 3) {
  const key = `product:${id}`;
  const hit = await redis.get(key);
  if (hit !== null) return JSON.parse(hit);

  const token = crypto.randomUUID();
  // SET key value NX EX：加锁与设置过期时间是一条原子命令
  const locked = await redis.set(`lock:product:${id}`, token, { NX: true, EX: 10 });

  if (!locked) {
    if (retries <= 0) return null; // 降级，别把自己拖死
    await new Promise((r) => setTimeout(r, 50));
    return getHotProduct(id, retries - 1);
  }

  try {
    // 双检：等锁期间可能已经被别的请求回填了
    const again = await redis.get(key);
    if (again !== null) return JSON.parse(again);

    const product = await db.findProduct(id);
    if (product) await redis.set(key, JSON.stringify(product), { EX: 600 });
    return product;
  } finally {
    // 用 Lua 比对 token 再删：保证「判断持有者」和「删除」原子完成
    await redis.eval(UNLOCK, { keys: [`lock:product:${id}`], arguments: [token] });
  }
}
```

两个容易被忽略的细节：

1. **解锁必须比对 token。** 如果只是 `DEL lock:key`，一个因为超时而早被释放的锁，可能被后来的持有者误删——你的业务代码执行到一半，锁已经不属于自己了。`SET NX EX` + Lua 比对删除是标准写法，`EX` 是防死锁的兜底。
2. **重试一定要有上限和退避。** 上面那个递归如果去掉 `retries`，未抢到锁的请求会形成同步重试风暴——**你本来是为了防击穿，结果亲手造了一次雪崩**。

方案二是**逻辑过期**：物理上永不过期，把过期时间写进 value 里，读到时若已逻辑过期，就返回旧值并异步触发一次刷新。它的取舍很清楚——**牺牲一致性换取零等待**，适合能容忍短暂陈旧的热点数据（排行榜、推荐位）。对账、库存这类数据不能用。

## 4. 雪崩：批量失效与集群宕机

雪崩有两种来源，修法完全不同。

**来源一：TTL 撞车。** 如果一批数据在同一个时间点被批量写入（比如凌晨跑批预热），TTL 又都设成固定的 3600 秒，那它们会在同一个秒级窗口集体失效。修法是在 TTL 上叠加随机抖动：

```js
function jitter(baseSeconds, ratio = 0.1) {
  const delta = baseSeconds * ratio;
  return Math.floor(baseSeconds + (Math.random() * 2 - 1) * delta);
}

await redis.set(key, JSON.stringify(data), { EX: jitter(3600) });
// 3600s ± 360s，把失效点摊平到 12 分钟窗口内
```

**来源二：Redis 整体不可用。** 这种抖动救不了，只能靠架构和降级：主从 + 哨兵或 Cluster 分片保证可用性；客户端对慢请求和故障要有熔断；最外层要有本地缓存或兜底数据。华为云 DCS 的业务使用规范里有一条值得抄下来——**客户端重试时间不要设得过短（例如低于 200ms），过短的重试极易引发重试风暴，反而把业务层打成雪崩**。也就是说，Redis 宕机时最危险的不是 Redis 本身，而是你的客户端决定集体重试。

## 5. 真正难的不是这三件事，是「不一致」

上面三个问题都有明确的工程答案。而「缓存和数据库不一致」没有银弹，只有取舍。

先明确一条：**写路径应该是「先更新数据库，再删除缓存」，而不是「更新缓存」。**

为什么是「删除」而不是「更新」？因为更新缓存意味着把一份**计算结果**写进缓存，而并发写会以错误的顺序落盘：请求 A 算出新值、请求 B 也算出新值，B 先写入、A 后写入，缓存里最终留下的是 A 的旧结果。删除则把「下次读的时候再算」的语义交给缓存系统本身，天然幂等，也不会因为计算逻辑变更留下脏数据。

那「先删缓存再更新库」行不行？不行。删除之后、更新之前有一个窗口，此时进来的读请求会把**旧值**重新加载进缓存，而它不会因为随后的更新而失效——脏数据会一直留到 TTL 到期。所以顺序是「先库后删」。

剩下的是删除失败怎么办。业界常见的补救是**延迟双删**：更新库、删缓存、等一小段时间（比如 500ms）再删一次，用来兜住「第一次删除后、主从复制完成前被读回脏值」的情况。但它本质上是靠延时去赌，**覆盖不了主从复制延迟波动和 GC 停顿**。

真正可靠的做法是把删缓存从业务代码里拿出来——**订阅数据库 binlog（Canal、Debezium 这类工具）**，由独立的消费者在数据变更后驱动缓存失效。它的好处是：缓存失效不再依赖业务代码有没有记得写、写没写错，而且能覆盖所有写入路径（包括运维手工改数据）。

## 6. 内存：淘汰策略选错的代价

`maxmemory` 决定 Redis 能用多少内存，`maxmemory-policy` 决定超限时怎么办（[官方 Key eviction 文档](https://redis.io/docs/latest/develop/reference/eviction/)给了完整清单）：

| 策略 | 淘汰范围 |
| --- | --- |
| `noeviction` | **不淘汰**，写入命令直接返回错误（默认值） |
| `allkeys-lru` / `allkeys-lfu` / `allkeys-random` | 全部 Key |
| `volatile-lru` / `volatile-lfu` / `volatile-random` / `volatile-ttl` | 仅淘汰**设置了过期时间**的 Key |

这里埋着一个非常经典的坑：**`volatile-*` 系列在「没有任何 Key 设置过期时间」时，行为等同于 `noeviction`**——也就是写入全部失败。如果你把会话、排行榜这类无 TTL 数据和生产缓存放在同一个实例里，某天缓存 Key 被清空后，剩下的全是无 TTL 的 Key，你就会看到一个「内存没满却写不进去」的诡异故障。

两个直接可用的结论：

- **选不准就用 `allkeys-lru`。** 官方文档也是这么建议的（请求分布通常是幂律分布），而且它不依赖 `expire` 字段，比 `volatile-*` 更省内存。
- **缓存和其它用途的 Key 分开实例。** 用 `volatile-*` 的典型理由就是「一个实例同时放缓存和持久数据」，而官方文档明确说拆成两个实例通常更好。

## 7. 命中率不对时，先看这几个字段

缓存的观测几乎全在 `INFO` 里，第一件事是算出真实命中率：

```text
INFO stats
keyspace_hits:  94230
keyspace_misses: 5770
→ 命中率 = 94230 / (94230 + 5770) ≈ 94.2%
```

注意 `EXISTS` 报告 Key 不存在时也计入 miss——所以用 `EXISTS` 做存在性判断的代码会拉低这个数字，阅读指标时要心里有数。命中率低于预期时，往下对照两个字段：

- `evicted_keys` 偏高 → 内存不够，**正在被淘汰的 Key 里有你需要的那些**。这时候要么扩容，要么换 LRU/LFU 策略（官方文档的建议：命中率低且 `evicted_keys` 高，`allkeys-lru` 往往是个好选择）。
- `expired_keys` 偏高 → TTL 设得太短，或者过期时间分布有问题（回到第四节的 TTL 抖动）。

另外 `commandstats` 里能看到命令被拒绝的次数——在 `noeviction` 或 `volatile-*` 策略下，这是发现「写入静默失败」的唯一途径。

## 8. 小结

- **缓存是可丢弃的副本。** Cache-Aside 的读路径只有三行，但穿透、击穿、雪崩的根因互不相关：穿透是数据不存在，击穿是单个热点 Key 过期，雪崩是批量失效或集群宕机。**修法不通用，别一把梭。**
- **空值缓存的 TTL 要短，布隆过滤器放在最外层，** 并且记住它的语义：`0` 一定不存在，`1` 只是可能存在，且标准布隆过滤器不支持删除。
- **互斥重建的两个必写项**：锁的 value 用唯一 token，解锁用 Lua 比对后再删；重试必须有上限和退避。
- **写路径是「先更新库，再删缓存」。** 延迟双删靠延时赌博，订阅 binlog 才是把一致性从业务代码里拿出去的办法。
- **`volatile-*` 在没有 TTL Key 时等同 `noeviction`**，会表现为「内存没满却写不进去」。选不准就用 `allkeys-lru`。
- **命中率异常先看 `evicted_keys` 和 `expired_keys`**，它们分别指向内存不足和 TTL 分布问题。

和[《HTTP 缓存策略完全指南》](/posts/http-caching-guide)那篇放在一起看会更清楚：**那一层是协议规定的缓存语义（`Cache-Control`、`ETag`、CDN），语义由浏览器和 RFC 保证；这一层是你自己实现的缓存，语义全靠代码纪律保证。**HTTP 缓存配错了顶多是「用户看到旧页面」，Redis 缓存配错了是「数据库被打穿」——这也是为什么这一层更值得花时间把边界想清楚。

## 参考资料

- [Redis 官方文档：Key eviction（`maxmemory` 与 `maxmemory-policy` 全部策略、近似 LRU 实现、命中率诊断）](https://redis.io/docs/latest/develop/reference/eviction/)
- [Redis 官方文档：Client-side caching / 分布式锁等客户端模式](https://redis.io/docs/latest/develop/clients/patterns/)
- [RedisBloom v2.8.20 发布说明：自 Redis 8 起概率数据结构已内置于 Redis，无需单独安装模块](https://github.com/RedisBloom/RedisBloom/releases/tag/v2.8.20)
- [Microsoft Azure Architecture Center：Caching best practices（Cache-Aside、TTL 设置、缓存与 CAP 取舍）](https://learn.microsoft.com/en-us/azure/architecture/best-practices/caching)
- [华为云 DCS 业务使用规范：防止缓存击穿、防止缓存穿透、过期时间打散、重试时间不宜过短](https://support.huaweicloud.com/bestpractice-dcs/bestpractice-dcs-pdf.pdf)
