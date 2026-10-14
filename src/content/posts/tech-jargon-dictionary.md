---
title: 'Tech Jargon Dictionary: From "It Works on My Machine" to "It''s a Feature"'
published: 2026-09-20
description: '"Intermittent," "it works on my machine," "just add a retry" — every piece of tech jargon masks a real technical problem. Translate them one by one into plain language, then see what each one is hiding.'
image: ''
tags: [programmer humor, tech jargon, team collaboration, debugging, software engineering]
category: Other
draft: false
---
An incident postmortem meeting was underway when someone said, "This is a probabilistic issue," and the meeting just ended.

The information content of that sentence is zero, but its efficiency is perfect. It sounds like a technical judgment, but it's actually a social move—it means "I haven't figured it out yet, but if we keep digging, we're not getting off work today."

Technical jargon isn't the rhetoric of liars; it's language compression formed under long-term pressure. The cost of that compression is straightforward: **information is lost, and accountability is blurred**. This dictionary below tries to decompress each entry, one by one, to see what's hidden underneath.

## 1. Blame-Shifting: Pushing the Problem onto an Unfalsifiable Target

### "It works on my machine"

**Translation**: The code is fine, it's your environment that's the problem—and I don't plan to investigate what's different.

The most infuriating thing about this sentence is that it's often **correct**. Environment differences are real technical problems; it's just that nobody wants to take responsibility for them. The common root causes are just a few:

- **The lockfile wasn't committed**, or someone ran `npm install` instead of `npm ci`, so transitive dependencies resolve to different versions each time;
- **Two copies of Node are sitting in PATH**—v22 in the terminal, v18 in the IDE;
- **Environment variables only exist in `.env`**, aren't configured on CI at all, so it's connecting to a different database;
- **Filesystem case sensitivity**: macOS's APFS is case-insensitive by default, so `import './Button'` passes locally, but on Linux it errors out because the actual file is named `button.tsx`;
- Local timezone, local glibc version, some global tool installed locally.

The remedies have long existed—it just takes someone willing to do them: lockfile into the repo, CI uses `npm ci`, runtime version written into `.nvmrc` or `mise.toml`, configuration banished from code (the third factor of 12-Factor). The payoff of this setup isn't "fewer arguments"—it's **making the sentence "it works on my machine" meaningless**.

### "Try restarting it"

This is the most honest sentence in the entire dictionary—it admits it doesn't know the cause, but it knows an operation that almost always works.

Restarting isn't mysticism; restarting is **state reset**. The fact that it works means the problem lies in the process's accumulated state. Candidates: memory leaks, connection pool or file descriptor leaks (unclosed sockets eventually hitting `EMFILE`), objects piling up in global singletons, dirty data in caches, an uncaught Promise rejection permanently freezing a state machine somewhere.

So "restarting fixed it" should be treated as a **clue**, not a **conclusion**. If a service needs restarting every week, it's already telling you where it's sick through its leak rate.

### "It's a caching issue"

Caching is the component most easily framed: it genuinely is often the cause, and clearing it looks cheap.

But "caching issue" isn't a diagnosis—it's a guess. Verifying it isn't expensive either:

```bash
curl -sI https://example.com/api/posts \
  -H 'Cache-Control: no-cache' \
  | grep -iE 'age|x-cache|cache-control|etag'
```

A large `Age` means you're hitting a stale copy; `X-Cache: HIT` means there really is a cache layer intercepting in front.

And real caching problems come in basically only three forms, and **clearing the cache cures none of them**:

1. **The cache key is missing a dimension**—in a multi-tenant scenario, the key has only the resource id and no tenant id, so A's data gets returned to B. This is an incident, not a performance issue.
2. **Wrong invalidation strategy**—forgetting to invalidate the cache on write, or a TTL that's absurdly long, so users refresh ten times after editing their profile and still see the old version.
3. **Cache stampede**—a large batch of keys expires simultaneously, traffic punches straight through to the database, and takes the database down with it.

## 2. Status-Description: Framing a Bug as a Design

### "It's a feature, not a bug"

This sentence is true half the time, and the mechanism by which it becomes true has a name: **Hyrum's Law**—once your interface has enough users, dependence on **all observable behavior** is no longer accidental; it's part of the contract.

A real-world example: some API returns `null` instead of `[]` when the list is empty. Five hundred downstream services dutifully wrote `if (res == null) { ... }`. Three years later you want to fix this "obvious bug," and the cost is a major version bump, a migration guide, and notifying every caller one by one. **The compatibility cost has exceeded the correctness benefit**, so the bug gets promoted on the spot and receives its "feature" headcount.

This piece of jargon is self-deprecating in most contexts, but its technical core is hard: correctness isn't free—it has to bid against compatibility.

### "Expected behavior"

The formal version of the previous sentence, usually appearing as the closing reason in an issue tracker, differing from `WONTFIX` only in politeness level.

## 3. Intermittent: Treating Uncertainty as Unknowability

### "Intermittent" / "Probabilistic issue"

**Translation**: I can't reproduce it, and I suspect reproduction requires conditions.

The root causes of these problems almost always fall into these categories: **race conditions** (multi-threaded/multi-coroutine reads and writes to shared state without synchronization), **timing dependencies** (an implicit assumption that some network request will return first), **uninitialized or already-freed resources**, GC timing, clocks.

Their commonality deserves to be called out separately: **the code isn't "sometimes wrong"—it's that the code has implicit assumptions about execution order, and those assumptions don't always hold**.

So the right approach isn't repeatedly trying to "reproduce," but turning uncertainty into observability:

```bash
# Go：竞态检测器，专治「本地跑一万次都没事」
go test -race -count=10000 ./...

# Node：把未捕获的 Promise 拒绝变成崩溃，而不是静默
node --unhandled-rejections=strict app.js
```

Add logging with request id and coroutine/thread id, and record the order. A probabilistic bug, given enough samples, **will definitely reproduce**—what it lacks is sample size, not luck.

### "Couldn't reproduce it in production"

**Translation**: Production and the environment we can touch are different.

The real difference usually isn't in the code, but in the **data**: production has hundreds of millions of rows, real concurrency, and empty fields left over from a migration three years ago. Testing locally with a ten-row `users` table and concluding "no problem" proves nothing.

The ways to close the gap are concrete: sanitize production data and load it into staging, do traffic replay, use feature flags for canary rollouts instead of going all-in at once.

## 4. Stability: Treating an Amplifier as a Fix

### "Just add a retry"

This is the **most dangerous** sentence in the entire dictionary.

What retries can genuinely cure is only one category of problem: **transient failures**—network jitter, a single replica restarting, being rate-limited. Beyond these three, retries are doing harm:

- If the downstream is timing out due to **overload**, retrying is just adding more pressure. This is exactly how one failure gets amplified into a site-wide outage, and it has a name: **retry storm**.
- If the operation isn't idempotent, retrying becomes duplicate charges, duplicate coupon issuance, duplicate order creation.

A production-worthy retry needs at least five conditions: a cap, exponential backoff, **jitter** (otherwise all clients retry at the same millisecond, creating a synchronized spike), retrying only retryable error codes (retrying `400`/`404` is meaningless), and a circuit breaker. Write operations must also carry an idempotency key.

```js
// 退避 + 抖动 + 上限 + 熔断，一个都不能少
const base = 100, cap = 5000, maxAttempts = 5;

async function retryable(fn, attempt = 1) {
  try {
    return await fn();
  } catch (err) {
    if (attempt >= maxAttempts || !isTransient(err)) throw err;
    const exp = Math.min(cap, base * 2 ** (attempt - 1));
    // full jitter：在 [0, exp] 里随机，避免重试风暴
    await sleep(Math.random() * exp);
    return retryable(fn, attempt + 1);
  }
}
```

Miss any one condition, and this code is a time bomb.

### "Let's ship it for now, optimize later"

**Translation**: A refactor without a ticket equals a refactor that never happens.

This isn't just a joke. Temporary solutions have a fatal property: they become the de facto standard, then get depended upon, then become irremovable per Hyrum's Law. So the sincerity of "optimize later" can be **verified**—is there an issue filed, is it written into this quarter's backlog, is there a reminder that will actually fire. None of the three, and it means "never."

## 5. New Jargon in the AI Era

The old jargon hasn't retired yet, and a new batch has already clocked in.

### "Model hallucination"

"Hallucination" is a legitimate academic term, now used as a universal scapegoat. But there are at least four real failure modes, and **the remedies are completely different**:

| What you see | Real cause | What to do |
|---|---|---|
| Answered but completely fabricated | Knowledge isn't in the model | Add RAG, retrieve documents into context |
| Gave it the documents and it still answers wrong | Retrieved chunks are wrong | Tune chunking strategy, add reranking |
| Format/fields always wrong | Instruction-following failure | Structured output, constrained decoding |
| Answers to the same question fluctuate | Sampling randomness | Lower temperature, self-consistency voting |

Calling all four categories "hallucination" is roughly equivalent to lumping `404`, `500`, and timeouts under "the network is bad"—it sounds like a conclusion, but it's actually giving up.

### "It's a prompt problem"

**First confirm whether the information you want is even in the context.** No matter how beautifully you tune the prompt, you can't conjure facts that weren't given to it. The vast majority of failures attributed to "prompt problems," when you dig to the bottom, turn out to be that the context simply didn't contain that piece of information.

### "The model hasn't learned this case"

Most of the time, it has learned it—but your invocation method gave it no chance to answer correctly.

## The Self-Cultivation of Jargon

Jargon isn't a sin. It's the team's shorthand: saying "it works on my machine" is ten times faster than saying "I suspect transitive dependency drift caused by an uncommitted lockfile."

The problem lies in the information gap. The former makes people **stop**; the latter makes people **continue**.

So here's one actionable piece of advice: jargon is fine, but follow it with a direction for inquiry.

- "It's a caching issue."—Discussion over.
- "Is it a caching issue? Let me check whether `X-Cache` is a HIT."—Discussion begins.

The most expensive cost in a postmortem is never the incident itself, but words like "intermittent" and "probabilistic" pressing pause on the postmortem prematurely. The core principle of a blameless postmortem is to chase mechanisms, not people—but all of this has a prerequisite: **the mechanism has to be spoken aloud first**.

## References

- [Hyrum's Law](https://www.hyrumslaw.com/)
- [The Twelve-Factor App — Config](https://12factor.net/config)
- [Exponential Backoff And Jitter — AWS Architecture Blog](https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/)
- [Idempotent requests — Stripe API Docs](https://docs.stripe.com/api/idempotent_requests)
- [Blameless PostMortems and a Just Culture — PagerDuty](https://postmortems.pagerduty.com/culture/blameless/)
- [RFC 1122 — Requirements for Internet Hosts (Robustness Principle)](https://www.rfc-editor.org/rfc/rfc1122)