---
title: 'Redis Cache Design and Common Pitfalls: Penetration, Breakdown, Avalanche, and Consistency'
published: 2026-09-30
description: Treating the cache as a disposable copy is the first principle of design. This article uses runnable Node.js code to break down the root-cause differences between cache penetration, breakdown, and avalanche, explains why "update the database first, then delete the cache" beats "update the cache," why volatile-* eviction policies can kill writes, and which INFO fields to check when hit rate looks abnormal.
image: ''
tags: [Redis, Caching, High Concurrency, Backend, Architecture, Performance Optimization]
category: Internet
draft: false
---
## 1. A cache with a "99% hit rate" that still brings down the database

Let's start with the conclusion: **a cache is not an accelerator for the database, it is a disposable copy of the database**. This statement defines the boundary for all the design that follows—a copy can be discarded at any time, so any logic where "losing it causes an incident" should never live in the cache.

The vast majority of projects use the Cache-Aside pattern, and the read path is just three lines:

```js
async function getUserCached(id) {
  const key = `user:${id}`;
  const hit = await redis.get(key);
  if (hit !== null) return JSON.parse(hit); //Hit

  const user = await db.findUser(id); //Origin fetch
  if (user) await redis.set(key, JSON.stringify(user), { EX: 300 });
  return user;
}
```

This code is always correct in a demo, but in production it fails in three completely different ways. And their **root causes are unrelated to each other, and the fixes are not interchangeable**—lumping them all together as "cache problems" and "just add a lock" or "just add a Bloom filter" is the most common starting point for production incidents.

The table below is the skeleton of this article:

| Problem | Trigger condition | Characteristics | Targeted remedy |
| --- | --- | --- | --- |
| **Penetration** | Querying data that **simply doesn't exist** | **Neither** the cache **nor** the database hits, every request hits the DB | Null-value caching, Bloom filter, parameter validation |
| **Breakdown** | A **single hot Key** happens to expire | Instantaneous concurrency all lands on the **same row** of data | Mutex lock, logical expiration, local cache |
| **Avalanche** | **A large number of Keys expire at the same time** or the cluster becomes entirely unavailable | Requests **indiscriminately** hammer the DB | TTL jitter, high-availability architecture, circuit breaking and degradation |

Note that "penetration" and "breakdown" differ by only one character, but the former is **data that doesn't exist**, while the latter is **data that exists but whose cache just expired**. Using a Bloom filter to treat breakdown is ineffective (that Key clearly exists in the database), and using a mutex lock to treat penetration is also ineffective (after the lock is released, the next request still misses). This is the pair most easily confused.

## 2. Penetration: when the data "simply doesn't exist"

Malicious requests or dirty-data parameters (`id=-1`, `id=999999999`) will reliably bypass the cache. Null-value caching is the least troublesome solution:

```js
const NULL_SENTINEL = "\u0000null"; //Use a sentinel value that can never appear in business JSON

async function getUserWithNullCache(id) {
  const key = `user:${id}`;
  const hit = await redis.get(key);
  if (hit === NULL_SENTINEL) return null; //Known not to exist, short-circuit directly
  if (hit !== null) return JSON.parse(hit);

  const user = await db.findUser(id);
  if (user) {
    await redis.set(key, JSON.stringify(user), { EX: 300 });
  } else {
    await redis.set(key, NULL_SENTINEL, { EX: 30 }); //Short TTL
  }
  return user;
}
```

**The TTL for null values must be far shorter than that for normal data.** Its purpose is merely to "compress N penetrations into 1 origin fetch", not to store a negative conclusion for the long term—otherwise, once the data corresponding to this ID is created, you will keep returning "doesn't exist" for the duration of the TTL. 30 seconds to 5 minutes is a common range.

The cost is: if an attacker uses a different random ID every time, the null-value cache will be flooded, turning into a memory attack instead. In that case you need a **Bloom filter** as a front-line interception. Since Redis 8, the Bloom filter has been a built-in data structure, and you no longer need to install Redis Stack or the RedisBloom module separately (the [RedisBloom v2.8.20 release notes](https://github.com/RedisBloom/RedisBloom/releases/tag/v2.8.20) state this explicitly):

```text
BF.RESERVE user:exists 0.01 1000000   #1% false positive rate, 1 million capacity
BF.ADD user:exists 1001
(integer) 1
BF.EXISTS user:exists 1001
(integer) 1
BF.EXISTS user:exists 9999
(integer) 0
```

You must remember the semantics of the read result—this is the entire crux of the Bloom filter:

- Returns `0` → **definitely doesn't exist**, you can return empty directly without querying the database;
- Returns `1` → **only possibly exists**, you still need to go back to the origin to confirm.

The cost is that it has a false-positive rate, and a standard Bloom filter **does not support deletion** (to support deletion you'd have to switch to a Cuckoo Filter). So it is suitable for ID sets that "only grow and never shrink". Once deletion exists in the business, you must accept that "for a period after deletion it is still judged as existing"—this is usually acceptable, because the origin fetch will cover it.

:::note
The interceptor must be placed at the **outermost layer**: the gateway layer first does parameter format validation (positive integer, length limit, ID range), then does Bloom filtering, and only then enters the application logic. Placing it deep inside the business code means you also pay the parsing overhead of invalid requests.
:::

## 3. Breakdown: the instant a single hot Key expires

The keywords of breakdown are "single" and "instantaneous". A typical scenario is the detail page of a hit product—there is just one Key in the cache, yet the QPS is in the tens of thousands. Within the 10 milliseconds when it expires, all concurrency will query the same row of the database record.

Solution one is **mutual-exclusion rebuild**, letting only one request go back to the origin:

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
  //SET key value NX EX: locking and setting expiration is a single atomic command
  const locked = await redis.set(`lock:product:${id}`, token, { NX: true, EX: 10 });

  if (!locked) {
    if (retries <= 0) return null; //Degrade, don't drag yourself down
    await new Promise((r) => setTimeout(r, 50));
    return getHotProduct(id, retries - 1);
  }

  try {
    //Double-check: it may have already been backfilled by another request while waiting for the lock
    const again = await redis.get(key);
    if (again !== null) return JSON.parse(again);

    const product = await db.findProduct(id);
    if (product) await redis.set(key, JSON.stringify(product), { EX: 600 });
    return product;
  } finally {
    //Use Lua to compare the token before deleting: ensures "checking the holder" and "deleting" complete atomically
    await redis.eval(UNLOCK, { keys: [`lock:product:${id}`], arguments: [token] });
  }
}
```

Two details that are easily overlooked:

1. **Unlocking must compare the token.** If you just do `DEL lock:key`, a lock that was released early due to a timeout might be mistakenly deleted by a later holder—your business code is halfway through execution, and the lock no longer belongs to you. `SET NX EX` + Lua comparison-and-delete is the standard approach, and `EX` is the fallback against deadlock.
2. **Retries must have an upper limit and backoff.** If the recursion above removes `retries`, requests that fail to acquire the lock will form a synchronous retry storm—**you originally intended to prevent breakdown, but ended up personally causing an avalanche**.

Solution two is **logical expiration**: physically it never expires, and the expiration time is written into the value. When read and found to be logically expired, it returns the old value and asynchronously triggers a refresh. Its trade-off is very clear—**sacrificing consistency in exchange for zero waiting**, suitable for hot data that can tolerate brief staleness (leaderboards, recommendation slots). It cannot be used for data such as reconciliation or inventory.

## 4. Avalanche: batch invalidation and cluster downtime

An avalanche has two sources, and the fixes are completely different.

**Source one: TTL collision.** If a batch of data is written in bulk at the same point in time (for example, a preheating batch job run in the early morning), and the TTLs are all set to a fixed 3600 seconds, then they will all expire together within the same second-level window. The fix is to add random jitter on top of the TTL:

```js
function jitter(baseSeconds, ratio = 0.1) {
  const delta = baseSeconds * ratio;
  return Math.floor(baseSeconds + (Math.random() * 2 - 1) * delta);
}

await redis.set(key, JSON.stringify(data), { EX: jitter(3600) });
//3600s ± 360s, spreading expiration points across a 12-minute window
```

**Source two: Redis becomes entirely unavailable.** This kind of jitter can't save you; you can only rely on architecture and degradation: master-replica + Sentinel or Cluster sharding to ensure availability; the client must have circuit breaking for slow requests and failures; the outermost layer must have a local cache or fallback data. There is one item in Huawei Cloud DCS's business usage guidelines worth copying down—**do not set the client retry time too short (for example, below 200ms); too short a retry very easily triggers a retry storm, which instead hammers the business layer into an avalanche**. In other words, when Redis goes down, the most dangerous thing is not Redis itself, but your clients deciding to retry en masse.
## 5. What's truly hard isn't these three things, it's "inconsistency"

The three problems above all have clear engineering answers. But "cache and database inconsistency" has no silver bullet, only trade-offs.

First, let's be clear about one thing: **the write path should be "update the database first, then delete the cache," not "update the cache."**

Why "delete" instead of "update"? Because updating the cache means writing a **computed result** into the cache, and concurrent writes can land in the wrong order: request A computes a new value, request B also computes a new value, B writes first, A writes after, and the cache ends up holding A's stale result. Deletion, on the other hand, hands the semantics of "recompute on the next read" to the cache system itself—it's naturally idempotent and won't leave dirty data behind when the computation logic changes.

So is "delete the cache first, then update the database" acceptable? No. After the deletion and before the update there's a window during which an incoming read request will reload the **old value** into the cache, and it won't be invalidated by the subsequent update—the dirty data will linger until the TTL expires. So the order is "database first, then delete."

What remains is what to do when the deletion fails. A common industry remedy is **delayed double deletion**: update the database, delete the cache, wait a short while (say 500ms), then delete again, to cover the case where "a stale value is read back after the first deletion but before replication completes." But it's essentially gambling on a delay, and **it can't cover fluctuations in replication lag or GC pauses**.

The truly reliable approach is to pull cache deletion out of the business code—**subscribe to the database binlog (tools like Canal, Debezium)**, and have an independent consumer drive cache invalidation after data changes. The benefits: cache invalidation no longer depends on whether the business code remembered to write it or wrote it correctly, and it covers all write paths (including manual data changes by ops).

## 6. Memory: the cost of choosing the wrong eviction policy

`maxmemory` determines how much memory Redis can use, and `maxmemory-policy` determines what happens when the limit is exceeded (the [official Key eviction documentation](https://redis.io/docs/latest/develop/reference/eviction/) gives the full list):

| Policy | Eviction scope |
| --- | --- |
| `noeviction` | **No eviction**, write commands return an error directly (the default) |
| `allkeys-lru` / `allkeys-lfu` / `allkeys-random` | All keys |
| `volatile-lru` / `volatile-lfu` / `volatile-random` / `volatile-ttl` | Only evict keys **with an expiration time set** |

There's a very classic pitfall buried here: **the `volatile-*` family behaves identically to `noeviction` when "no key has an expiration time set"**—that is, all writes fail. If you put session data, leaderboards, and other TTL-less data in the same instance as production cache, then one day after the cache keys are cleared, all that's left are TTL-less keys, and you'll see a bizarre failure where "memory isn't full but you can't write."

Two directly usable conclusions:

- **If you can't decide, use `allkeys-lru`.** The official documentation recommends this too (request distributions are usually power-law), and it doesn't depend on the `expire` field, making it more memory-efficient than `volatile-*`.
- **Keep cache and other-purpose keys in separate instances.** The typical reason to use `volatile-*` is "one instance holding both cache and persistent data," and the official documentation explicitly says splitting into two instances is usually better.

## 7. When the hit rate looks wrong, check these fields first

Cache observability lives almost entirely in `INFO`, and the first thing to do is compute the real hit rate:

```text
INFO stats
keyspace_hits:  94230
keyspace_misses: 5770
→ 命中率 = 94230 / (94230 + 5770) ≈ 94.2%
```

Note that `EXISTS` counts a missing key as a miss too—so code that uses `EXISTS` for existence checks will drag this number down, so keep that in mind when reading the metric. When the hit rate is below expectations, compare against two fields:

- `evicted_keys` is high → not enough memory, **and the keys being evicted include the ones you need**. Either scale up or switch to an LRU/LFU policy (the official documentation's advice: when the hit rate is low and `evicted_keys` is high, `allkeys-lru` is often a good choice).
- `expired_keys` is high → the TTL is set too short, or the expiration time distribution is problematic (back to the TTL jitter in section 4).

Also, `commandstats` shows the number of rejected commands—under the `noeviction` or `volatile-*` policy, this is the only way to discover "silent write failures."

## 8. Summary

- **The cache is a disposable copy.** The read path of Cache-Aside is only three lines, but the root causes of penetration, breakdown, and avalanche are unrelated to each other: penetration is data that doesn't exist, breakdown is a single hot key expiring, and avalanche is mass invalidation or a cluster outage. **The fixes aren't interchangeable, so don't apply one blindly.**
- **The TTL for null-value caching should be short, and the Bloom filter goes on the outermost layer,** and remember its semantics: `0` definitely doesn't exist, `1` only might exist, and a standard Bloom filter doesn't support deletion.
- **Two must-dos for mutex-based rebuilding**: use a unique token as the lock's value, and unlock via a Lua compare-then-delete; retries must have an upper bound and backoff.
- **The write path is "update the database first, then delete the cache."** Delayed double deletion gambles on a delay; subscribing to the binlog is the way to move consistency out of the business code.
- **`volatile-*` is equivalent to `noeviction` when there are no TTL keys**, and it manifests as "memory isn't full but you can't write." If you can't decide, use `allkeys-lru`.
- **When the hit rate is abnormal, check `evicted_keys` and `expired_keys` first**—they point to insufficient memory and TTL distribution problems respectively.

Reading this alongside [The Complete Guide to HTTP Caching Strategies: From Browser to CDN](/posts/http-caching-guide/) makes things clearer: **that layer is the caching semantics defined by the protocol (`Cache-Control`, `ETag`, CDN), with semantics guaranteed by the browser and the RFC; this layer is a cache you implement yourself, with semantics guaranteed entirely by code discipline.** Misconfiguring HTTP caching at worst means "users see a stale page," but misconfiguring Redis caching means "the database gets hammered through"—which is exactly why this layer is worth the time to think through its boundaries clearly.

## References

- [Redis official documentation: Key eviction (all `maxmemory` and `maxmemory-policy` policies, approximate LRU implementation, hit rate diagnostics)](https://redis.io/docs/latest/develop/reference/eviction/)
- [Redis official documentation: Client-side caching / distributed locks and other client-side patterns](https://redis.io/docs/latest/develop/clients/patterns/)
- [RedisBloom v2.8.20 release notes: since Redis 8, probabilistic data structures are built into Redis, no separate module installation needed](https://github.com/RedisBloom/RedisBloom/releases/tag/v2.8.20)
- [Microsoft Azure Architecture Center: Caching best practices (Cache-Aside, TTL settings, cache and CAP trade-offs)](https://learn.microsoft.com/en-us/azure/architecture/best-practices/caching)
- [Huawei Cloud DCS usage guidelines: preventing cache breakdown, preventing cache penetration, spreading out expiration times, retry times should not be too short](https://support.huaweicloud.com/bestpractice-dcs/bestpractice-dcs-pdf.pdf)