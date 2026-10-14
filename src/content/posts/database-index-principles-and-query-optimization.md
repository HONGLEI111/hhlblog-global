---
title: 'Database Indexing Principles and Query Optimization: B+ Trees, Leftmost Prefix, and EXPLAIN in Practice'
published: 2026-09-23
description: 'Using reproducible benchmark data, this post explains why indexes are fast and why they often silently fail: from B+ tree height and the cost of lookups back to the table, to four failure scenarios involving the leftmost prefix, covering indexes, wrapping columns in functions, and LIKE prefixes, each with real EXPLAIN output and timing comparisons.'
image: ''
tags: [Database, Indexing, Query Optimization, SQL, SQLite, Internet]
category: Internet
draft: false
---
## 1. The Same Query, a 6000x Difference

The same point lookup, differing by just one index, measured a time difference of three orders of magnitude.

A `orders` table with 200,000 rows, querying `WHERE user_id = 12345`:

| Case | Execution Plan | Time per Query |
| --- | --- | --- |
| No index | `SCAN orders` | 15.80 ms |
| Index present, but requires table lookup | `SEARCH orders USING INDEX ix_user_amount (user_id=?)` | 0.0041 ms |
| Index present, and covered | `SEARCH orders USING COVERING INDEX ix_user_amount (user_id=?)` | 0.0026 ms |

More common and more troublesome than "no index added" is **an index was added but didn't take effect**. For example, this one:

```sql
SELECT COUNT(*) FROM o WHERE created_at LIKE '2026-06%';
```

There's clearly an index on `created_at`, yet `EXPLAIN QUERY PLAN` gives:

```text
SCAN o USING COVERING INDEX ix_c
```

The entire index was scanned, **18.5 ms**. Yet a semantically almost equivalent formulation:

```sql
SELECT COUNT(*) FROM o WHERE created_at BETWEEN '2026-06-01' AND '2026-06-30';
```

The plan becomes `SEARCH o USING COVERING INDEX ix_c (created_at>? AND created_at<?)`, **0.97 ms**. A 19x difference, just from the choice of formulation (the reason is in Section 5).

:::note
**Experimental environment**: SQLite 3.42 (Python's built-in `sqlite3` module, in-memory database), `orders` table with 200,000 rows of random data, fixed seed to ensure reproducibility. SQLite was chosen because it has zero dependencies and the conclusions can be verified on the spot. **The principles also hold for MySQL and PostgreSQL, but the execution plan output format and several optimization details vary by engine**—Section 8 provides a comparison. The in-memory database has no disk I/O, so the absolute timings below are all optimistic, and the cost of table lookups is especially underestimated.
:::

The table creation and data generation script for reproduction:

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

rnd = random.Random(42)      #Fixed seed, data is reproducible
cur.executemany("INSERT INTO orders(user_id,status,amount,created_at,note) VALUES (?,?,?,?,?)",
    [(rnd.randint(1, 50_000), rnd.choice(["paid", "pending", "refunded"]),
      rnd.randint(1, 100_000),
      f"2026-{rnd.randint(1,12):02d}-{rnd.randint(1,28):02d}T10:00:00", "n" * 20)
     for _ in range(200_000)])
con.commit()

cur.execute("CREATE INDEX idx_user_status_amount ON orders(user_id, status, amount)")
con.commit()
cur.execute("ANALYZE")       #Update statistics, otherwise the cost model may be guessing blindly
con.commit()
```

## 2. B+ Tree: Where the Speed Comes From

The essence of an index is replacing "row-by-row scanning" with "tree lookup." A B+ tree has three key properties:

1. **Only leaf nodes store data** (or pointers to data); internal nodes store only keys and child pointers;
2. **Leaf nodes are linked by a linked list**, naturally supporting range scans and sequential traversal;
3. **All leaf nodes have the same depth**, so the query path length is predictable—there's no "lucky and fast" scenario.

Property 1 determines how short the tree can be. Taking InnoDB as an example, a page is 16 KB, the primary key is a bigint (8 bytes) plus an in-page pointer (about 6 bytes), so an internal node can hold about `16KB / 14B ≈ 1170` key-value pairs; a leaf page, estimating 1 KB per row, can hold about 16 rows. Thus:

| Tree Height | Rows Accommodated (order-of-magnitude estimate) |
| --- | --- |
| 2 | 1170 × 16 ≈ 19,000 |
| 3 | 1170² × 16 ≈ 21.9 million |

In other words, a table with twenty million rows takes only 3 page accesses to go from root to leaf. This is the decisive advantage of B+ trees over B trees: **internal nodes carry no data, so the same page can hold more branches**, making the tree shorter—and each level reduced in tree height means one fewer random I/O. Although hash indexes can achieve O(1) equality lookups, they completely lack support for ranges and sorting, so they cannot replace B+ trees as general-purpose indexes.

:::tip
The row counts above are order-of-magnitude estimates; the actual numbers depend on page size, row width, and primary key type. Just remember the intuition that "three levels can hold tens of millions"—don't treat the specific numbers as conclusions.
:::

### Where the Data Actually Lives: Clustered Indexes and Table Lookups

How costly a "table lookup" is depends on how the engine organizes data:

| Engine | Primary Key Index | What Secondary Index Leaves Store | Table Lookup Action |
| --- | --- | --- | --- |
| InnoDB | Clustered index, row data is in the primary key B+ tree leaves | Primary key value | Take the primary key and traverse the primary key B+ tree again |
| PostgreSQL | Heap table, no clustered index | Row's physical location `ctid` | Access the heap page by `ctid` |
| SQLite | rowid table, `INTEGER PRIMARY KEY` is the rowid | rowid | Look up the table by rowid |

This table incidentally explains a common confusion: why are primary key queries always the fastest? Because in InnoDB, a primary key query **doesn't need a table lookup at all**—what it retrieves is the row itself.

## 3. Leftmost Prefix: The Column Order of a Composite Index Is the Rule

A composite index `(user_id, status, amount)` is sorted in the B+ tree in this order: first compare `user_id`, if equal then compare `status`, then compare `amount`. This yields a hard rule: **an index can only be used for lookup by conditions that "match consecutively starting from the leftmost column."**

Measured (index is `(user_id, status, amount)`):

```text
WHERE user_id = 1
  -> SEARCH orders USING COVERING INDEX idx_user_status_amount (user_id=?)

WHERE user_id = 1 AND status = 'paid'
  -> SEARCH ... (user_id=? AND status=?)

WHERE user_id = 1 AND status = 'paid' AND amount > 100
  -> SEARCH ... (user_id=? AND status=? AND amount>?)

WHERE status = 'paid'                      --Skip the leftmost column
  -> SEARCH orders USING COVERING INDEX idx_status (status=?)   ← took a different index

WHERE amount > 100
  -> SCAN orders USING COVERING INDEX idx_user_status_amount    ← note this line
```

The last one is particularly worth staring at: it's not "using the index for lookup," but **scanning the entire index**. The index is smaller than the table, so scanning the index is still cheaper than scanning the table, but it's still O(n). **`SEARCH` (tree lookup) and `SCAN ... USING INDEX` (full index scan) are two completely different things**—be sure to distinguish them when reading execution plans. This is also where many people mistakenly believe "the index took effect."

### Range Conditions Truncate Subsequent Columns

This is the most easily misunderstood point. Compare these two queries that differ by only one operator:

```text
WHERE user_id = 1 AND status > 'paid' AND amount = 500
  -> SEARCH ... (user_id=? AND status>?)              ← amount is not in the lookup key

WHERE user_id = 1 AND status = 'paid' AND amount = 500
  -> SEARCH ... (user_id=? AND status=? AND amount=?)  ← all three columns are used
```

The reason lies in the fact that B+ tree positioning relies on "order": `status > 'paid'` hits a **range**, and within that range `amount` is not ordered, so it cannot be used to further narrow the lookup. At this point `amount = 500` can only degrade to a row-by-row filter condition (residual filter; InnoDB pushes this filtering down to the index layer, i.e., index condition pushdown, saving some table lookups, but **not reducing the number of rows that need to be checked**).

From this we get the principles for column order in a composite index:

1. **Equality conditions go leftmost**;
2. **Range conditions go after equality conditions**;
3. **Sort columns go last** (see Section 6);
4. High-selectivity columns should be as far left as possible, but must yield to the first three rules.
## 4. Covering Indexes: Eliminating Table Lookups

If all the columns a query needs are in the index, the engine doesn't have to go back to the table. SQLite will explicitly write `USING COVERING INDEX` in the plan:

```text
SELECT user_id, amount FROM orders WHERE user_id = 12345
  -> SEARCH orders USING COVERING INDEX ix_user_amount (user_id=?)   0.0026 ms

SELECT user_id, amount, note FROM orders WHERE user_id = 12345
  -> SEARCH orders USING INDEX ix_user_amount (user_id=?)            0.0041 ms
                                                       ↑ missing COVERING, requires table lookup
```

In the microbenchmark on this in-memory database, the table lookup was only about 1.6 times more expensive—but this is precisely **an illusion flattened out by memory**: an in-memory database has no random disk I/O, and the essential cost of a table lookup is "random access by primary key/physical location." On real storage, this gap is often on the order of dozens of times, which is also why "put all the columns the query needs into the index" has become one of the most effective optimization techniques.

The other side of the coin is: a covering index usually means a wider index, taking up more space and writing more slowly (Section 7). In addition, PostgreSQL's index-only scan also requires visibility map support—**only pages marked by VACUUM can completely avoid accessing the heap**, and tables that have just been bulk-written often cannot enjoy this optimization.

## 5. Four Ways to Silently Invalidate an Index

### 1. Wrapping a Function Around an Indexed Column

```text
WHERE substr(created_at,1,4) = '2026'      --There is an index on created_at
  -> SCAN orders USING COVERING INDEX idx_created
```

The engine compares the computed result of `substr(created_at,1,4)`, not `created_at` itself, and there is no place for this value in the B+ tree.

One solution is an **expression index** (also called a function index). After creating it, run the same SQL again:

```sql
CREATE INDEX idx_year ON orders(substr(created_at,1,4));

--The plan immediately becomes:
-- SEARCH orders USING INDEX idx_year (<expr>=?)
```

MySQL 8.0.13+ and PostgreSQL both support function indexes. But a better approach is usually to **rewrite the SQL**, so that the existing index can be hit without changing the schema:

```sql
--Don't write it this way
WHERE substr(created_at,1,4) = '2026'
--Change to an explicit range
WHERE created_at >= '2026-01-01' AND created_at < '2027-01-01'
```

### 2. LIKE Prefix Matching: A Trap That Depends on an Engine Default

While writing this article, I was tripped up hard by this one. There is an index on `created_at`, and `LIKE '2026-06%'` is the most standard prefix match, which in theory can absolutely use the index—but in practice it was an 18.5 ms full index scan, while the equivalent `BETWEEN` took only 0.97 ms.

The root cause lies in collation and the semantics of LIKE: **SQLite defaults to `case_sensitive_like=OFF`**, and LIKE is case-insensitive for ASCII, so it cannot directly use a BINARY-collated index for acceleration. After explicitly turning this switch on, the same SQL immediately became a range lookup:

```sql
PRAGMA case_sensitive_like = ON;
--Afterward: SEARCH o USING COVERING INDEX ix_c (created_at>? AND created_at<?)
```

PostgreSQL has a similar constraint: `LIKE 'abc%'` can use a B-tree only when the index uses the C collation, or when `text_pattern_ops` is specified at index creation time. MySQL's behavior depends on the column's collation.

Conclusion: **Whether LIKE prefix matching can use an index is an engine detail that must be tested in practice and cannot be assumed**. When in doubt, always rewrite it as an explicit range condition.

### 3. Letting an Indexed Column Participate in an Operation or Type Conversion

```text
WHERE user_id + 0 = 1        -> SCAN orders USING COVERING INDEX ...
```

Any form of wrapping an indexed column in an expression destroys its ordering. A more subtle version is type inconsistency: **when a string column is compared with a number, the engine may perform an implicit conversion on the column, and the index then becomes unusable**. The rule is simple—the types on both sides of the comparison must match the column's declared type.

### 4. Leading Wildcard

```text
WHERE created_at LIKE '%06-12%'   --Contains a leading %
```

A leading `%` means the starting point is unknown, and "ordering" cannot help at all. This kind of requirement should be handed to a full-text index or a search engine, rather than forcing a B-tree to do the job.

## 6. Sorting, Pagination, and Indexes

The leaves of a B+ tree are ordered, so **if the sort columns can follow the index order, an extra sort can be avoided**. SQLite will explicitly tell you with `USE TEMP B-TREE FOR ORDER BY` that it sorted one extra time.

Under the premise of `user_id = 1`, when the index is `(user_id, status, amount)`:

```text
ORDER BY status
  -> SEARCH ... (user_id=?)                        ← no additional sorting

ORDER BY amount
  -> SEARCH ... (user_id=?)
  -> USE TEMP B-TREE FOR ORDER BY                  ← one extra sort

ORDER BY created_at
  -> SEARCH ... (user_id=?)
  -> USE TEMP B-TREE FOR ORDER BY
```

Reason: once `user_id` is fixed, the remaining order in the index is `(status, amount)`. `ORDER BY status` follows exactly this order; `ORDER BY amount` skips `status`, and the order is no longer guaranteed in any way.

This explains why **sort columns should be placed at the end of a composite index**: equality conditions lock down the prefix, the sort columns follow the index order, and there must be no break in between.

### Deep Pagination: The Cost of OFFSET Is Not in the Index

```sql
SELECT id, amount FROM orders ORDER BY id LIMIT 20 OFFSET 100000;
```

The problem is not the index, but the semantics of OFFSET: the engine must **first locate and discard the first 100,000 rows** before it can return these 20 rows. The index makes locating faster, but the work of "discarding" is not reduced at all, and it grows linearly with the page number.

The solution is **keyset pagination**, replacing the offset with "the position of the last row on the previous page":

```sql
SELECT id, amount FROM orders
WHERE user_id = 1 AND id > :last_id    --The id of the last record on the previous page
ORDER BY id
LIMIT 20;
```

In this way, every time it is "index seek + sequentially fetch 20 rows," and the cost is independent of the page number.

## 7. Selectivity, and Indexes Are Not Free

Selectivity = number of distinct values / total number of rows. A column with selectivity close to 1 (primary key, `user_id`) allows the index to cut the result down to very few rows; a column with selectivity close to 0 (`status` with only three possible values) may have an equality query hit one third of the rows.

Here I need to correct a popular claim. I tested it with `status`:

```text
WHERE status = 'paid'     --Only 3 distinct values, matching about 1/3 of the rows
  -> SEARCH orders USING INDEX idx_status2 (status=?)
```

**The optimizer did not abandon the index.** So "an index on a low-cardinality column is bound to be useless" is an overly absolute conclusion. The real problem with low cardinality is not "the index cannot be used," but that **the large number of rows filtered out still have to be looked up one by one in the table**—too many random accesses, and the benefit is eaten up by the table lookup cost. Whether to abandon the index depends on the engine's cost model and statistics, which is also why stale statistics can suddenly make a plan worse.

### Write Cost: An Index Trades Writes for Reads

Every secondary index must be maintained synchronously on every INSERT / UPDATE / DELETE, and the cost is even higher when indexed columns are updated. Measured inserting 30,000 rows:

| Number of secondary indexes | Time |
| --- | --- |
| 0 | 25.4 ms |
| 1 | 44.5 ms |
| 3 | 107.0 ms |
| 5 | 169.0 ms |

Five indexes made writes about **6.7 times** slower. So adding an index is not a free speedup, but a **clear trade-off**: tables with many reads and few writes can have more, while write-intensive tables (logs, event streams) must be restrained. Indexes also take up extra space and slow down backups and DDL, and these costs should all be thought through before creating an index.

## 8. How to Diagnose: An Actionable Process

Don't guess—let the engine speak for itself.

**Step 1: Get the execution plan.**

| Engine | Command |
| --- | --- |
| SQLite | `EXPLAIN QUERY PLAN <sql>` |
| PostgreSQL | `EXPLAIN (ANALYZE, BUFFERS) <sql>` |
| MySQL | `EXPLAIN ANALYZE <sql>` (8.0.18+) or `EXPLAIN FORMAT=JSON` |

PostgreSQL's `ANALYZE` gives the real elapsed time and actual row counts, and `BUFFERS` gives cache hit information—**when "the optimizer's estimated row count" differs greatly from "the actual row count," it is usually stale statistics**, and this itself is an important clue.

**Step 2: Look at the keywords.** `SCAN` / `Seq Scan` / `type: ALL` are bad signals; `SEARCH ... USING INDEX` / `Index Scan` / `Index Only Scan` / `ref` / `range` are good signals. Be sure to distinguish `SEARCH` (tree search) from `SCAN ... USING INDEX` (full index scan)—the difference is O(log n) versus O(n).

**Step 3: Controlled experiments.** Comment out the suspicious conditions one by one, then get the plan again. Whether an equality condition was changed to a range, or a function was wrapped around a column, the plan will tell you immediately.

**Step 4: Small first, then large.** First confirm that the plan is correct at a small data volume (if the plan is wrong, it will only get worse as the data grows), then measure the real elapsed time with the real data volume. If the plan looks good but the elapsed time is poor, the problem is most likely in the number of table lookups or the data distribution, not in the index itself.

**Step 5: Update statistics.** `ANALYZE` (SQLite / PostgreSQL) or `ANALYZE TABLE` (MySQL). When a plan suddenly gets worse, this is the first thing to do.
## 9. Summary

- Indexes replace linear scans with tree lookups; the "shortness" of the B+ tree and its "ordered leaves" are the two core advantages;
- The column order of a composite index determines whether it can be used: **equality first, range after, sort last**;
- Covering indexes eliminate table lookups and are usually the single-point optimization with the biggest payoff;
- Wrapping columns in functions, type mismatches, LIKE prefixes (depending on the engine and collation), and leading wildcards are the four most common silent failures;
- Indexes have a clear write cost and space cost—it's a trade-off, not free acceleration.

One final piece of advice: every conclusion in this article comes with actual measured output, but they **all come from SQLite**. The principles can be transferred, but the specifics may differ for a given engine, a given version, or even a given state of statistics. **Run EXPLAIN once on the database you're actually optimizing**—that's more reliable than memorizing any conclusion.

## References

- [SQLite: EXPLAIN QUERY PLAN output description](https://www.sqlite.org/eqp.html)
- [SQLite: Query Optimizer Overview (including LIKE optimization and leftmost prefix)](https://www.sqlite.org/optoverview.html)
- [SQLite: The Query Planner](https://www.sqlite.org/queryplanner.html)
- [PostgreSQL: Using EXPLAIN](https://www.postgresql.org/docs/current/using-explain.html)
- [PostgreSQL: Index-Only Scans and Covering Indexes](https://www.postgresql.org/docs/current/indexes-index-only-scans.html)
- [Use The Index, Luke!—A guide to SQL indexing and tuning for developers](https://use-the-index-luke.com/)