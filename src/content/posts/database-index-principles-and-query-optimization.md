---
title: 数据库索引原理与查询优化：B+ 树、最左前缀与 EXPLAIN 实战
published: 2026-09-23
description: '用可复现的实测数据讲清索引为什么快、又为什么常常静默失效：从 B+ 树的高度与回表代价，到最左前缀、覆盖索引、函数包列与 LIKE 前缀四种失效场景，每种都附真实的 EXPLAIN 输出与耗时对比。'
image: ''
tags: [数据库, 索引, 查询优化, SQL, SQLite, 互联网]
category: '互联网'
draft: false
lang: ''
---

## 一、同一个查询，6000 倍的差距

同一个点查，只差一个索引，实测耗时差三个数量级。

20 万行的 `orders` 表，查 `WHERE user_id = 12345`：

| 情况 | 执行计划 | 单次耗时 |
| --- | --- | --- |
| 无索引 | `SCAN orders` | 15.80 ms |
| 有索引，但需回表 | `SEARCH orders USING INDEX ix_user_amount (user_id=?)` | 0.0041 ms |
| 有索引，且被覆盖 | `SEARCH orders USING COVERING INDEX ix_user_amount (user_id=?)` | 0.0026 ms |

比「没加索引」更常见、也更麻烦的是**加了索引但没生效**。比如这条：

```sql
SELECT COUNT(*) FROM o WHERE created_at LIKE '2026-06%';
```

`created_at` 上明明有索引，`EXPLAIN QUERY PLAN` 给出的却是：

```text
SCAN o USING COVERING INDEX ix_c
```

整棵索引被扫了一遍，**18.5 ms**。而语义上几乎等价的写法：

```sql
SELECT COUNT(*) FROM o WHERE created_at BETWEEN '2026-06-01' AND '2026-06-30';
```

计划变成 `SEARCH o USING COVERING INDEX ix_c (created_at>? AND created_at<?)`，**0.97 ms**。19 倍差距，只差一个写法的选择（原因在第五节）。

:::note
**实验环境**：SQLite 3.42（Python 内置 `sqlite3` 模块，内存库），`orders` 表 20 万行随机数据，固定 seed 保证可复现。选 SQLite 是因为零依赖、结论可当场验证。**原理部分对 MySQL、PostgreSQL 同样成立，但执行计划的输出格式和若干优化细节因引擎而异**——第八节给出对照。内存库没有磁盘 I/O，所以下面的绝对耗时都偏乐观，回表代价尤其被低估。
:::

复现用的建表与造数脚本：

```python
import sqlite3, random

con = sqlite3.connect(":memory:")
cur = con.cursor()
cur.execute("""
CREATE TABLE orders (
  id INTEGER PRIMARY KEY,   -- SQLite 中即 rowid，相当于聚簇索引
  user_id INTEGER NOT NULL, status TEXT NOT NULL,
  amount INTEGER NOT NULL, created_at TEXT NOT NULL, note TEXT)
""")

rnd = random.Random(42)      # 固定 seed，数据可复现
cur.executemany("INSERT INTO orders(user_id,status,amount,created_at,note) VALUES (?,?,?,?,?)",
    [(rnd.randint(1, 50_000), rnd.choice(["paid", "pending", "refunded"]),
      rnd.randint(1, 100_000),
      f"2026-{rnd.randint(1,12):02d}-{rnd.randint(1,28):02d}T10:00:00", "n" * 20)
     for _ in range(200_000)])
con.commit()

cur.execute("CREATE INDEX idx_user_status_amount ON orders(user_id, status, amount)")
con.commit()
cur.execute("ANALYZE")       # 更新统计信息，否则代价模型可能在瞎猜
con.commit()
```

## 二、B+ 树：索引快在哪

索引的本质，是把「逐行扫描」换成「树查找」。B+ 树有三条关键性质：

1. **只有叶子节点存数据**（或指向数据的指针），内部节点只存键和子指针；
2. **叶子节点之间用链表相连**，天然支持范围扫描和顺序遍历；
3. **所有叶子节点深度相同**，查询路径长度可预测，不存在「运气好就快」的情况。

第 1 条决定了树能有多矮。以 InnoDB 为例，一个页 16 KB，主键为 bigint（8 字节）加上页内指针（约 6 字节），一个内部节点能放约 `16KB / 14B ≈ 1170` 个键值对；叶子页按每行 1 KB 估算约能放 16 行。于是：

| 树高 | 可容纳行数（量级估算） |
| --- | --- |
| 2 | 1170 × 16 ≈ 1.9 万 |
| 3 | 1170² × 16 ≈ 2190 万 |

也就是说，两千万行的表从根走到叶子不过 3 次页访问。这是 B+ 树相对 B 树的决定性优势：**内部节点不携带数据，同样的页能装下更多分叉**，树就更矮——而树高每减少一层，就少一次随机 I/O。哈希索引虽然能做到 O(1) 等值查找，却完全不支持范围与排序，因此无法取代 B+ 树做通用索引。

:::tip
上面的行数是量级估算，实际取决于页大小、行宽和主键类型。记住「三层能装千万级」这个直觉就够了，别把具体数字当结论。
:::

### 数据到底存在哪：聚簇索引与回表

「回表」的代价有多大，取决于引擎怎么组织数据：

| 引擎 | 主键索引 | 二级索引叶子存什么 | 回表的动作 |
| --- | --- | --- | --- |
| InnoDB | 聚簇索引，行数据就在主键 B+ 树叶子 | 主键值 | 拿主键再走一次主键 B+ 树 |
| PostgreSQL | 堆表，没有聚簇索引 | 行的物理位置 `ctid` | 按 `ctid` 访问堆页 |
| SQLite | rowid 表，`INTEGER PRIMARY KEY` 即 rowid | rowid | 按 rowid 回查表 |

这张表顺带解释了一个常见困惑：为什么主键查询总是最快？因为在 InnoDB 里，主键查询**根本不需要回表**——它拿到的就是行本身。

## 三、最左前缀：联合索引的列顺序就是规则

联合索引 `(user_id, status, amount)` 在 B+ 树里按这个顺序排序：先比 `user_id`，相同再比 `status`，再比 `amount`。由此得到一条硬规则：**索引只能被「从最左列开始连续匹配」的条件用于查找**。

实测（索引为 `(user_id, status, amount)`）：

```text
WHERE user_id = 1
  -> SEARCH orders USING COVERING INDEX idx_user_status_amount (user_id=?)

WHERE user_id = 1 AND status = 'paid'
  -> SEARCH ... (user_id=? AND status=?)

WHERE user_id = 1 AND status = 'paid' AND amount > 100
  -> SEARCH ... (user_id=? AND status=? AND amount>?)

WHERE status = 'paid'                      -- 跳过最左列
  -> SEARCH orders USING COVERING INDEX idx_status (status=?)   ← 走了另一条索引

WHERE amount > 100
  -> SCAN orders USING COVERING INDEX idx_user_status_amount    ← 注意这句
```

最后一条特别值得盯着看：它不是「用了索引查找」，而是**把整棵索引扫了一遍**。索引比表小，所以扫索引仍然比扫表划算，但这依然是 O(n)。**`SEARCH`（树查找）和 `SCAN ... USING INDEX`（整索引扫描）是两件完全不同的事**，看执行计划时务必分清——这也是很多人误以为「索引生效了」的地方。

### 范围条件会截断后面的列

这是最容易被误解的一条。对比这两条只差一个运算符的查询：

```text
WHERE user_id = 1 AND status > 'paid' AND amount = 500
  -> SEARCH ... (user_id=? AND status>?)              ← amount 不在查找键里

WHERE user_id = 1 AND status = 'paid' AND amount = 500
  -> SEARCH ... (user_id=? AND status=? AND amount=?)  ← 三列都用上了
```

原因在于 B+ 树的定位依赖「有序」：`status > 'paid'` 命中一片**范围**，而在这个范围内 `amount` 并不有序，无法再用它继续收窄查找。此时 `amount = 500` 只能退化为逐行过滤条件（residual filter；InnoDB 会把这种过滤下推到索引层，即 index condition pushdown，省掉一部分回表，但**不减少需要检查的行数**）。

由此得到联合索引的列顺序原则：

1. **等值条件放最左**；
2. **范围条件放在等值条件之后**；
3. **排序列放最后**（见第六节）；
4. 选择性高的列尽量靠左，但要让位于前三条。

## 四、覆盖索引：消灭回表

如果一条查询需要的列全都在索引里，引擎就不必回表。SQLite 会在计划里明确写出 `USING COVERING INDEX`：

```text
SELECT user_id, amount FROM orders WHERE user_id = 12345
  -> SEARCH orders USING COVERING INDEX ix_user_amount (user_id=?)   0.0026 ms

SELECT user_id, amount, note FROM orders WHERE user_id = 12345
  -> SEARCH orders USING INDEX ix_user_amount (user_id=?)            0.0041 ms
                                                       ↑ 少了 COVERING，需要回表
```

在这个内存库的微基准里，回表只贵了约 1.6 倍——但这恰恰是**被内存抹平后的假象**：内存库没有磁盘随机 I/O，而回表的本质代价就是「按主键/物理位置随机访问」。真实存储上，这个差距常常是几十倍量级，这也是「把查询需要的列都放进索引」成为最有效优化手段之一的原因。

硬币的另一面是：覆盖索引通常意味着更宽的索引，占更多空间、写更慢（第七节）。另外 PostgreSQL 的 index-only scan 还需要 visibility map 支持——**只有被 VACUUM 标记过的页才能完全避免访问堆**，刚批量写入的表往往享受不到这个优化。

## 五、四种让索引静默失效的写法

### 1. 在索引列上套函数

```text
WHERE substr(created_at,1,4) = '2026'      -- created_at 上有索引
  -> SCAN orders USING COVERING INDEX idx_created
```

引擎比较的是 `substr(created_at,1,4)` 的计算结果，而不是 `created_at` 本身，B+ 树里没有这个值的位置。

解法之一是**表达式索引**（也叫函数索引）。建好之后再跑同一条 SQL：

```sql
CREATE INDEX idx_year ON orders(substr(created_at,1,4));

-- 计划立刻变成：
-- SEARCH orders USING INDEX idx_year (<expr>=?)
```

MySQL 8.0.13+ 和 PostgreSQL 都支持函数索引。但更好的做法通常是**改写 SQL**，不改 schema 就能命中已有索引：

```sql
-- 不要这样写
WHERE substr(created_at,1,4) = '2026'
-- 改成显式范围
WHERE created_at >= '2026-01-01' AND created_at < '2027-01-01'
```

### 2. LIKE 前缀匹配：一个依赖引擎默认值的坑

写这篇文章时，我在这一条上被结结实实绊了一下。`created_at` 上有索引，`LIKE '2026-06%'` 是最标准的前缀匹配，理论上完全能走索引——实测却是 18.5 ms 的整索引扫描，而等价的 `BETWEEN` 只要 0.97 ms。

根因在排序规则（collation）与 LIKE 的语义：**SQLite 默认 `case_sensitive_like=OFF`**，LIKE 对 ASCII 大小写不敏感，因此不能直接用一个 BINARY 排序的索引来加速。显式打开这个开关后，同一条 SQL 立刻变成范围查找：

```sql
PRAGMA case_sensitive_like = ON;
-- 之后：SEARCH o USING COVERING INDEX ix_c (created_at>? AND created_at<?)
```

PostgreSQL 有类似约束：`LIKE 'abc%'` 只有在索引使用 C 排序规则、或建索引时指定 `text_pattern_ops` 时才能走 B-tree。MySQL 的行为则取决于列的 collation。

结论：**LIKE 前缀匹配能否走索引是一个必须实测的引擎细节，不能假设**。拿不准时，一律改写成显式的范围条件。

### 3. 让索引列参与运算或类型转换

```text
WHERE user_id + 0 = 1        -> SCAN orders USING COVERING INDEX ...
```

任何把索引列包进表达式的写法都会破坏有序性。更隐蔽的版本是类型不一致：**字符串列与数字比较时，引擎可能对列做隐式转换，索引随之失效**。规矩很简单——比较双方的类型要和列的声明类型一致。

### 4. 前导通配符

```text
WHERE created_at LIKE '%06-12%'   -- 包含前导 %
```

前导 `%` 意味着起点未知，「有序」帮不上任何忙。这类需求应该交给全文索引或搜索引擎，而不是硬撑 B-tree。

## 六、排序、分页与索引

B+ 树的叶子是有序的，所以**排序列如果能顺着索引顺序走，就能省掉一次额外排序**。SQLite 会用 `USE TEMP B-TREE FOR ORDER BY` 明确告诉你它多排了一次。

在 `user_id = 1` 的前提下、索引为 `(user_id, status, amount)` 时：

```text
ORDER BY status
  -> SEARCH ... (user_id=?)                        ← 无额外排序

ORDER BY amount
  -> SEARCH ... (user_id=?)
  -> USE TEMP B-TREE FOR ORDER BY                  ← 多了一次排序

ORDER BY created_at
  -> SEARCH ... (user_id=?)
  -> USE TEMP B-TREE FOR ORDER BY
```

原因：`user_id` 固定后，索引里剩余的顺序是 `(status, amount)`。`ORDER BY status` 正好顺着这个顺序；`ORDER BY amount` 跳过了 `status`，顺序就不再有任何保证。

这解释了为什么**排序列应该放在联合索引的最后**：等值条件锁定前缀，排序列顺着索引走，中间不能断。

### 深分页：OFFSET 的成本不在索引

```sql
SELECT id, amount FROM orders ORDER BY id LIMIT 20 OFFSET 100000;
```

问题不在索引，而在 OFFSET 的语义：引擎必须**先定位并丢弃前 100000 行**才能返回这 20 行。索引让定位变快了，但「丢弃」的工作量一点没少，而且随页码线性增长。

解法是**键集分页（keyset pagination）**，用「上一页最后一条的位置」代替偏移量：

```sql
SELECT id, amount FROM orders
WHERE user_id = 1 AND id > :last_id    -- 上一页最后一条的 id
ORDER BY id
LIMIT 20;
```

这样每次都是「索引定位 + 顺序取 20 行」，代价与页码无关。

## 七、选择性，以及索引不是免费的

选择性 = 不同值的个数 / 总行数。选择性接近 1 的列（主键、`user_id`），索引能把结果砍到极少数几行；选择性接近 0 的列（只有三种取值的 `status`），一次等值查询可能命中三分之一的行。

这里要纠正一个流行的说法。我用 `status` 实测：

```text
WHERE status = 'paid'     -- 只有 3 种取值，命中约 1/3 的行
  -> SEARCH orders USING INDEX idx_status2 (status=?)
```

**优化器并没有放弃索引。** 所以「低区分度列的索引一定失效」是个过于绝对的结论。低区分度的真正问题不是「索引用不上」，而是**筛出来的大量行还要逐个回表**——随机访问次数太多，收益被回表成本吃掉。是否放弃索引取决于引擎的代价模型和统计信息，这也是统计信息过期会让计划突然变差的原因。

### 写代价：索引是拿写入换读取

每个二级索引都要在每次 INSERT / UPDATE / DELETE 时同步维护，更新到索引列时成本更高。实测插入 3 万行：

| 二级索引个数 | 耗时 |
| --- | --- |
| 0 | 25.4 ms |
| 1 | 44.5 ms |
| 3 | 107.0 ms |
| 5 | 169.0 ms |

五个索引让写入慢了约 **6.7 倍**。所以加索引不是免费的加速，而是一次**明确的取舍**：读多写少的表可以多加，写密集的表（日志、事件流）必须克制。索引还额外占用空间、拖慢备份与 DDL，这些成本都应该在建索引之前想清楚。

## 八、怎么诊断：一份可执行的流程

不要猜，让引擎自己说。

**第一步：拿执行计划。**

| 引擎 | 命令 |
| --- | --- |
| SQLite | `EXPLAIN QUERY PLAN <sql>` |
| PostgreSQL | `EXPLAIN (ANALYZE, BUFFERS) <sql>` |
| MySQL | `EXPLAIN ANALYZE <sql>`（8.0.18+）或 `EXPLAIN FORMAT=JSON` |

PostgreSQL 的 `ANALYZE` 给出真实耗时与实际行数，`BUFFERS` 给出缓存命中情况——**「优化器估算行数」与「实际行数」差得远，通常是统计信息过期**，这本身就是一条重要线索。

**第二步：看关键词。** `SCAN` / `Seq Scan` / `type: ALL` 是坏信号；`SEARCH ... USING INDEX` / `Index Scan` / `Index Only Scan` / `ref` / `range` 是好信号。务必区分 `SEARCH`（树查找）与 `SCAN ... USING INDEX`（整索引扫描）——差别是 O(log n) 与 O(n)。

**第三步：对照实验。** 把可疑条件逐个注释掉，再取一次计划。是把等值换成了范围、还是在列上套了函数，计划会立刻告诉你。

**第四步：先小后大。** 在小数据量下先确认计划是对的（计划错了，数据量一大只会更糟），再用真实数据量测真实耗时。如果计划看着很好但耗时很差，问题多半在回表次数或数据分布，而不在索引本身。

**第五步：更新统计信息。** `ANALYZE`（SQLite / PostgreSQL）或 `ANALYZE TABLE`（MySQL）。计划突然变差时，第一件事就是它。

## 九、小结

- 索引把线性扫描换成树查找；B+ 树的「矮」与「叶子有序」是两个核心优势；
- 联合索引的列顺序决定它能否被用上：**等值在前、范围在后、排序垫底**；
- 覆盖索引消除回表，通常是收益最大的单点优化；
- 函数包列、类型不一致、LIKE 前缀（取决于引擎与排序规则）、前导通配符，是四种最常见的静默失效；
- 索引有明确的写代价与空间代价，是一次取舍而不是免费的加速。

最后一句忠告：本文的每个结论都附了实测输出，但它们**全部来自 SQLite**。原理层面可以迁移，具体到某个引擎、某个版本、甚至某个统计信息状态，都可能不一样。**在你要优化的那个库上跑一次 EXPLAIN**——这比记住任何结论都可靠。

## 参考资料

- [SQLite：EXPLAIN QUERY PLAN 输出说明](https://www.sqlite.org/eqp.html)
- [SQLite：查询优化器概述（含 LIKE 优化与最左前缀）](https://www.sqlite.org/optoverview.html)
- [SQLite：The Query Planner](https://www.sqlite.org/queryplanner.html)
- [PostgreSQL：Using EXPLAIN](https://www.postgresql.org/docs/current/using-explain.html)
- [PostgreSQL：Index-Only Scans and Covering Indexes](https://www.postgresql.org/docs/current/indexes-index-only-scans.html)
- [Use The Index, Luke!——面向开发者的 SQL 索引与调优教程](https://use-the-index-luke.com/)
