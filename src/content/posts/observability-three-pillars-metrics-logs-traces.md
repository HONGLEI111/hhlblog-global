---
title: 'The Three Pillars of Observability: Metrics, Logs, and Traces Are Not Three Types of Data, but Three Granularities of the Same Event Stream'
published: 2026-10-07
description: 'You have Metrics, Logs, and Traces all in place, yet you still can''t pinpoint the incident—because the problem isn''t whether you have three systems, but whether they can be correlated with each other. This article explains how each pillar fails in its own way (high cardinality, sampling dropping the tail, logs being non-aggregatable), and presents three ways to connect a metric spike to a specific trace: unified resource attributes, exemplars, and injecting trace_id into logs.'
image: ''
tags: [Observability, OpenTelemetry, Prometheus, Distributed Systems, Backend, Architecture]
category: Internet
draft: false
---
## 1. All three pillars are installed, yet incidents still can't be diagnosed

Let's start with a very typical incident scene. The p99 of a `GET /api/orders` endpoint rose from 80ms to 2.4s and stayed there for twenty minutes.

Digging through three systems, here's what you get back:

- **Metrics**: The p99 of `http_server_request_duration_seconds` does show a spike. But that curve only has three labels—`method`, `route`, `status_code`—and after aggregation you can't tell which downstream is dragging it down. All you know is "this endpoint got slower."
- **Logs**: For the `grep` endpoint, the logs are wall-to-wall `200`. Because it's slow, not broken.
- **Traces**: The sampling rate is set to 1%, and in those twenty minutes not a single slow request happened to get sampled. On the graph, the call chain looks perfectly healthy.

Each of the three systems is "fine" on its own. The problem is they **don't line up**: there's no `trace_id` in the logs, so you can't jump from a suspicious log line to the full call chain; that blip on the metric can't be traced to a specific slow trace; and the trace sampling policy filtered out the evidence exactly when you needed it most.

This is the most common misuse of the three pillars—treating them as "buy three tools" rather than "make one event stream joinable across three granularities." The table below is the skeleton of this whole article.

## 2. Each pillar answers a fundamentally different question

| Pillar | What it answers | Data shape | Unit cost | Typical failure mode |
| --- | --- | --- | --- | --- |
| **Metrics** | **Whether** there's a problem, and how big | Pre-aggregated numeric time series | Low (few dimensions) | High cardinality blows up the TSDB; over-aggregation loses the dimensions you need for diagnosis |
| **Traces** | **Which step** the problem is in | Span trees with parent-child relationships | Medium (volume compressed via sampling) | Sampling filters out errors/slow requests; too few span attributes, leaving you with just a call graph |
| **Logs** | **Why** it's happening | Full-volume event text | High (almost no compression) | Unstructured, can't be aggregated or counted; no context, so an isolated line means nothing |

So the correct order of questioning is: **Metrics tell you "there's a problem," Traces tell you "where it's slow," Logs tell you "why it's slow."** The three aren't three answers to the same question—they're three links in a diagnostic chain. Break any one link and the chain won't connect.

The easiest thing to overlook when doing Metrics is the emphasis on latency in Google SRE's "four golden signals": **the latency of successful and failed requests must be tracked separately**. A request that returns a 500 in 2ms will drag down the average latency, making you see "all good" at exactly the moment you should be alerting.

## 3. Metrics: high cardinality is the most common self-inflicted wound

Metrics are cheap on the premise of **few dimensions**. They're cheap not because storage is saved, but because you've already paid the "aggregation" bill—once aggregation happens, the original information is gone.

High-cardinality incidents in PostgreSQL almost always look like this:

```js
// ❌ Disaster approach
const httpDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  labelNames: ['method', 'url', 'user_id', 'request_id'],
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
});
```

Do the math on how many time series this metric will produce: `method`(5) × `url`(say 200 distinct paths) × `user_id`(100k) × 7 histogram buckets ≈ **700 million**. This isn't "using a bit more memory"—it's scrape targets timing out outright and Prometheus memory exploding.

`user_id`, `request_id`, raw URLs, timestamps, IPs—these are all **unbounded values** and must be replaced with bounded, enumerable labels:

```js
// ✅ Correct approach: route template instead of raw URL, keeping only bounded dimensions
const httpDuration = new client.Histogram({
  name: 'http_server_request_duration_seconds',
  help: 'HTTP request duration (seconds)',
  labelNames: ['method', 'route', 'status_code'], // route looks like /users/:id
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
});
```

On naming, the official Prometheus conventions are worth treating as hard constraints: **single prefix + base unit + unit suffix**, counters ending in `_total`, and cumulative quantities using base units (seconds, not milliseconds). These aren't aesthetic concerns—metrics with mixed units produce silently wrong results when aggregated across services.

As for where "the unique identifier of each request" should go, the answer is **exemplar**: it hangs off the histogram buckets, takes up no extra label dimensions, and exists specifically to solve "jumping from an aggregated metric back to a single request."

## 4. Traces: the value is in span attributes, not the call graph

Auto-instrumentation gives you a call graph, but diagnosis relies on **attributes**—attributes are the dimensions you can query and filter on.

```js
const { trace, SpanStatusCode } = require('@opentelemetry/api');
const tracer = trace.getTracer('order-service');

async function createOrder(req) {
  return tracer.startActiveSpan('create_order', async (span) => {
    // These attributes determine whether this trace can be queried in the future
    span.setAttribute('order.item_count', req.items.length);
    span.setAttribute('user.tier', req.user.tier);
    span.setAttribute('payment.provider', req.paymentProvider);

    try {
      const order = await db.insertOrder(req);
      span.setAttribute('order.id', order.id);
      return order;
    } catch (err) {
      // If exceptions aren't recorded, this trace is just a silent span of elapsed time
      span.recordException(err);
      span.setStatus({ code: SpanStatusCode.ERROR, message: err.message });
      throw err;
    } finally {
      span.end();
    }
  });
}
```

Even easier to trip over than attributes is **sampling**, and it happens to be the direct cause of the incident in section 1:

- **Head-based sampling**: the decision to sample is made the moment a request comes in, and the `sampled` flag is propagated downstream via W3C `traceparent`. Cheap, no buffering needed, built into SDKs (`traceidratio`, `parentbased_traceidratio`, etc.). Fatal flaw: **at decision time, you don't yet know whether this request will be fast or slow, successful or not**—so it will inevitably drop some errors and slow requests at random.
- **Tail-based sampling**: buffer spans in the OpenTelemetry Collector's `tail_sampling` processor, aggregate by trace ID, and decide after `decision_wait`, so you can "keep all ERRORs, keep everything over 1s, sample the rest at 1%." The cost is that **all spans must be held in memory**, and spans of the same trace must converge on the same Collector instance, or they can't be assembled.

The common production setup is two layers: head-based sampling first to cut obviously useless volume, then tail-based sampling to pick out the part with signal.

There's also a trap that takes effect silently: the environment variable `OTEL_TRACES_SAMPLER=always_off` causes the entire pipeline to report not a single trace—no errors, no alerts, until one day you notice the tracing dashboard is empty.

## 5. Logs: the goal is to be joinable, not greppable

The problem with logs was never "nothing was recorded," but "it was recorded and still can't be used." A line assembled from concatenated strings:

```js
console.log(`Order ${orderId} created successfully, took ${ms}ms`);
```

This log line can only be `grep`—it can't be `count by`, can't be `group by`, and can't jump to any trace.

Switch to structured output and **stuff the current span's context into it**—this is the highest-ROI change you can make:

```js
const { trace } = require('@opentelemetry/api');

function log(level, msg, fields = {}) {
  const ctx = trace.getActiveSpan()?.spanContext();
  console.log(JSON.stringify({
    ts: new Date().toISOString(),
    level,
    msg,
    // In OpenTelemetry's log data model, these two fields are meant for correlation
    trace_id: ctx?.traceId,
    span_id: ctx?.spanId,
    ...fields,
  }));
}
```

Once that's done, the "some log line → full call chain" jump from the incident in section 1 works. Incidentally, logs are billed by volume, so downgrading high-frequency INFO noise to DEBUG usually pays off faster than switching to a cheaper log backend.
## 6. Connecting the Three: Three Ways to Wire Them Together

The real engineering effort of the three pillars isn't in collection—it's in **correlation**. Ranked by cost-effectiveness:

**1. Unify resource attributes (do this first)**

Make all three signals share the same `service.name`, `service.version`, `deployment.environment`. This is what Resource in OpenTelemetry is for—with it, you can filter by `service.name` in your logging system, filter by the same value in traces, and make the `job` label on metrics line up.

**2. Inject `trace_id` into logs (do this second)**

If you could only do one thing in the entire overhaul, do this. It turns "an isolated log line" into "a step on some trace."

**3. Use exemplars to jump from metrics to traces**

By attaching a trace ID when recording observations on a histogram, you can click directly from that p99 spike in Grafana into the specific slow trace. Two things to watch out for: the Prometheus side needs exemplar storage enabled (early versions required explicitly adding `--enable-feature=exemplar-storage`), and the exposition format must be OpenMetrics—the standard Prometheus text format doesn't support exemplars, and this is where a lot of instrumentation gets stuck.

But here's an easily overlooked pitfall: **an exemplar is not "using trace_id as a label."** A trace ID can only hang off an exemplar and must never be added to regular labels—otherwise you're back to the high-cardinality disaster from Section 3.

## 7. A More Radical View

Honeycomb CTO Charity Majors has a widely circulated judgment: **"there are no pillars"**—pillar is a marketing word; the technical word is "signal." She argues that splitting metrics, logs, and traces into three separate stores is essentially paying three times for the same data while also creating three dead zones that can't connect to each other; the more reasonable approach is **wide events**: compress the entire context of a request into a single structured event, store it once, and derive metrics and traces as read-time views from that unified store—and **embrace high cardinality**, because for questions like "which request from which user failed," the dimensions you aggregated away happen to be the answer.

To be fair, the three-separate-systems model still holds up in infrastructure and ops feedback loops (where the telemetry isn't written by you). What's genuinely awkward is **the business code you write yourself**.

So the pragmatic attitude isn't to overthrow the existing stack, but to design events with the "wide event" mindset from the start: **cram as much context as possible into a single event, rather than splitting it across three systems first and then figuring out how to join it back.**

## 8. Summary

- **The value of the three pillars lies in being able to join with each other.** Installing three systems without `trace_id` in your logs or exemplars on your metrics is the same as installing three isolated islands.
- **High cardinality in metrics is almost always self-inflicted.** `user_id`, `request_id`, and raw URLs must never go into labels; switch to route templates and bounded enumeration values, and hand unique identifiers to exemplars.
- **Head sampling is "blind"**—it inevitably drops a random portion of errors and slow requests. To guarantee errors and slow requests aren't dropped, you need the Collector's tail sampling, at the cost of memory and same-instance aggregation.
- **Span attributes matter more than the call graph.** With only the call graph, you can only know "it's slow," not "why it's slow."
- **Structure logs first, then inject `trace_id`.** If you only do one thing, do this.
- **In the four golden signals, latency must be viewed separately for success/failure**, otherwise fail-fast 500s will whitewash your latency curve.
- **Exemplars are for connecting, not for use as labels.** Writing a trace ID into a label turns a correlation mechanism into a cardinality bomb.

## References

- [OpenTelemetry official docs: Signals (definitions and positioning of Traces / Metrics / Logs / Baggage)](https://opentelemetry.io/docs/concepts/signals/)
- [Google SRE Book Chapter 6: Monitoring Distributed Systems (the four golden signals: latency, traffic, errors, saturation, and latency needing to distinguish success from failure)](https://sre.google/sre-book/monitoring-distributed-systems/)
- [Prometheus official docs: Metric and label naming (application prefix, base units, unit suffixes, `_total` conventions)](https://prometheus.io/docs/practices/naming/)
- [Prometheus official docs: Data model (legal characters for metric names and labels, the dimensional model of time series, `__` prefix reservation)](https://prometheus.io/docs/concepts/data_model/)
- [OpenTelemetry official docs: Tail-based sampling (head+tail hybrid sampling on the .NET SDK side, implementation and trade-offs for retaining all failed spans)](https://opentelemetry.io/docs/languages/dotnet/traces/tail-based-sampling/)
- [Charity Majors: The pillar is a lie ("there are no pillars, only signals"; pillar is a marketing word, not a technical one)](https://charity.wtf/2025/10/30/the-pillar-is-a-lie/)
- [Honeycomb: Wide Events vs. Three Pillars (the cost multiplication of three separate stores vs. "unified storage, read-time derivation")](https://www.honeycomb.io/blog/wide-events-vs-three-pillars-ai-observability-costs)
- [Grafana official docs: Configure and use exemplars (correlating exemplars with trace IDs, how to enable in TimeSeries panels)](https://grafana.com/docs/grafana-cloud/observe-and-act/send-data/traces/configure/exemplars/)
- [Prometheus Python Client: Exemplars (attaching trace_id / span_id to histogram observations, and the OpenMetrics exposition format requirement)](https://prometheus.github.io/client_python/instrumenting/exemplars/)