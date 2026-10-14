---
title: 可观测性三支柱：Metrics、Logs 与 Traces 不是三种数据，而是同一条事件流的三种粒度
published: 2026-10-07
description: 'Metrics、Logs、Traces 都齐了，事故还是定位不了——因为问题不在「有没有三个系统」，而在三者能不能互相对上。本文讲清每条支柱各自的失效方式（高基数、采样丢尾、日志不可聚合），并给出把 metric 毛刺跳到具体 trace 的三种接法：统一 resource attributes、exemplar、日志注入 trace_id。'
image: ''
tags: [可观测性, OpenTelemetry, Prometheus, 分布式系统, 后端, 架构]
category: '互联网'
draft: false
lang: ''
---

## 一、三支柱全都装了，事故依然定位不了

先看一个很典型的事故现场。某个 `GET /api/orders` 接口的 p99 从 80ms 涨到 2.4s，持续了二十分钟。

翻三个系统，得到的答复是这样的：

- **Metrics**：`http_server_request_duration_seconds` 的 p99 确实有个尖峰。但那条曲线上一共只有 `method`、`route`、`status_code` 三个标签，聚合之后看不出是哪个下游拖的——只知道"这个接口变慢了"。
- **Logs**：`grep` 这个接口的日志，满屏都是 `200`。因为慢，不是错。
- **Traces**：采样率设的是 1%，那二十分钟里恰好一条慢请求都没被采到。图上看，调用链一片健康。

三个系统各自都是"正常"的。问题出在它们**对不上**：日志里没有 `trace_id`，所以你无法从一个可疑的日志行跳到完整的调用链；metric 上的那个毛刺也无法定位到某一条具体的慢 trace；而 trace 的采样策略又在最需要它的时候把证据筛掉了。

这就是三支柱最常见的误用——把它当成"买三个工具"，而不是"让一条事件流在三个粒度上都能互相 join"。下面这张表是全文的骨架。

## 二、每条支柱回答的问题根本不同

| 支柱 | 回答什么 | 数据形态 | 单位成本 | 典型失效方式 |
| --- | --- | --- | --- | --- |
| **Metrics** | **有没有**问题、影响多大 | 预聚合的数值时间序列 | 低（维度少） | 高基数把 TSDB 打爆；聚合过头，丢了排查所需的维度 |
| **Traces** | 问题在**哪个环节** | 带父子关系的 span 树 | 中（靠采样压量） | 采样把错误/慢请求筛掉了；span 属性太少，等于只有调用图 |
| **Logs** | **为什么**会这样 | 全量事件文本 | 高（几乎无压缩） | 非结构化，无法聚合统计；没带上下文，孤立的一行毫无意义 |

所以正确的追问顺序是：**Metrics 告诉你"有问题"，Traces 告诉你"哪里慢"，Logs 告诉你"为什么慢"**。三者不是同一个问题的三种答案，而是排查链条上的三个环节。任何一环断掉，链条就接不起来。

做 Metrics 时最容易忽略的一点，是 Google SRE 那套"四大黄金指标"里对 latency 的强调：**成功请求和失败请求的延迟必须分开统计**。一个 2ms 就返回 500 的请求会把平均延迟拉低，让你在最该报警的时候看到"一切正常"。

## 三、Metrics：高基数是最常见的"自作自受"

Metrics 便宜的前提是**维度少**。它便宜不是因为存储省，而是因为你已经付过"聚合"这笔账了——聚合发生之后，原始信息就没了。

PostgreSQL 的高基数事故几乎都长这样：

```js
// ❌ 灾难写法
const httpDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  labelNames: ['method', 'url', 'user_id', 'request_id'],
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
});
```

算一下这条度量会产生多少个时间序列：`method`(5) × `url`(假设 200 个不同路径) × `user_id`(10 万) × 直方图 7 个桶 ≈ **7 亿条**。这不是"内存占得多一点"，而是 scrape 目标直接超时、Prometheus 内存爆掉。

`user_id`、`request_id`、原始 URL、时间戳、IP，这些都是**无界值**，必须换成有界的、可枚举的标签：

```js
// ✅ 正确写法：路由模板而非原始 URL，只保留有界维度
const httpDuration = new client.Histogram({
  name: 'http_server_request_duration_seconds',
  help: 'HTTP 请求耗时（秒）',
  labelNames: ['method', 'route', 'status_code'], // route 形如 /users/:id
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
});
```

命名上，Prometheus 官方规范值得当成硬约束：**单一前缀 + 基础单位 + 单位后缀**，计数器以 `_total` 结尾，累积量的单位用基础单位（秒而不是毫秒）。这些不是审美问题——单位混用的度量在跨服务聚合时会产生静默的错误结果。

至于"每条请求的唯一标识"该放哪，答案是 **exemplar**：它挂在直方图的桶上，不占额外的标签维度，专门解决"从聚合指标跳回单次请求"这件事。

## 四、Traces：价值在 span 属性，不在调用图

自动埋点给你的是一张调用图，而排查靠的是**属性**——属性才是可查询、可过滤的维度。

```js
const { trace, SpanStatusCode } = require('@opentelemetry/api');
const tracer = trace.getTracer('order-service');

async function createOrder(req) {
  return tracer.startActiveSpan('create_order', async (span) => {
    // 这些属性决定了这条 trace 将来能不能被查出来
    span.setAttribute('order.item_count', req.items.length);
    span.setAttribute('user.tier', req.user.tier);
    span.setAttribute('payment.provider', req.paymentProvider);

    try {
      const order = await db.insertOrder(req);
      span.setAttribute('order.id', order.id);
      return order;
    } catch (err) {
      // 不记录异常，这条 trace 就只是一段静默的耗时
      span.recordException(err);
      span.setStatus({ code: SpanStatusCode.ERROR, message: err.message });
      throw err;
    } finally {
      span.end();
    }
  });
}
```

比属性更容易踩坑的是**采样**，而它恰好是第一节事故的直接原因：

- **头部采样（head-based）**：请求一进来就决定采不采，通过 W3C `traceparent` 把 `sampled` 标记传给下游。便宜、无需缓冲，SDK 内置（`traceidratio`、`parentbased_traceidratio` 等）。致命缺点：**做决定的时候，这条请求是快是慢、成没成功都还不知道**——它必然会随机丢掉一部分错误和慢请求。
- **尾部采样（tail-based）**：在 OpenTelemetry Collector 的 `tail_sampling` processor 里缓冲 span，按 trace ID 聚合，等 `decision_wait` 之后再决定，因此可以"保留所有 ERROR、保留所有超过 1s 的、其余按 1% 概率抽"。代价是**所有 span 都要在内存里压着**，而且同一条 trace 的 span 必须汇聚到同一个 Collector 实例上，否则拼不完整。

生产环境的常见组合是两层：先头部采样砍掉明显无用的量，再尾部采样从中挑出有信号的那部分。

还有一个会静默生效的坑：环境变量 `OTEL_TRACES_SAMPLER=always_off` 会让整条链路一条 trace 都不上报，不报错、不告警，只在某个时刻你发现追踪面板是空的。

## 五、Logs：目标是能被 join，不是能被 grep

日志的问题从来不是"没记"，而是"记了但用不上"。一行拼接出来的字符串：

```js
console.log(`订单 ${orderId} 创建成功，耗时 ${ms}ms`);
```

这行日志只能被 `grep`，不能被 `count by`、不能被 `group by`、也跳不到任何 trace。

改成结构化输出，并且**把当前 span 的上下文塞进去**——这是投入产出比最高的一处改动：

```js
const { trace } = require('@opentelemetry/api');

function log(level, msg, fields = {}) {
  const ctx = trace.getActiveSpan()?.spanContext();
  console.log(JSON.stringify({
    ts: new Date().toISOString(),
    level,
    msg,
    // OpenTelemetry 的日志数据模型里，这两个字段就是用来做关联的
    trace_id: ctx?.traceId,
    span_id: ctx?.spanId,
    ...fields,
  }));
}
```

完成后，第一节那个事故里"某条日志 → 完整调用链"的跳转就成立了。顺带一提，日志是按量计费的，把高频 INFO 噪声降级到 DEBUG，通常比换一个更便宜的日志后端见效更快。

## 六、把三者接起来：三种接法

三支柱真正的工程量不在采集，而在**关联**。按性价比排序：

**1. 统一 resource attributes（先做这个）**

让三个信号共用同一套 `service.name`、`service.version`、`deployment.environment`。这是 OpenTelemetry 里 Resource 的用途——有了它，你才能在日志系统里按 `service.name` 过滤、在 trace 里按同一个值筛选、让 metric 的 `job` 标签对得上。

**2. 日志里注入 `trace_id`（第二做这个）**

如果整个改造只能做一件事，就做这件。它把"孤立的一行日志"变成"某条 trace 上的一步"。

**3. 用 exemplar 从 metric 跳到 trace**

在直方图上记录观测值时附带 trace ID，就能在 Grafana 里从 p99 那个毛刺直接点进那条具体的慢 trace。要注意两件事：Prometheus 侧需要开启 exemplar 存储（早期版本要显式加 `--enable-feature=exemplar-storage`），且暴露格式得是 OpenMetrics——标准 Prometheus 文本格式不支持 exemplar，很多埋点跑不通就卡在这。

但这里有个容易忽略的反面：**exemplar 不是"把 trace_id 当标签用"**。trace ID 只能挂在 exemplar 上，绝不能加进普通标签——否则就回到了第三节的高基数灾难。

## 七、一个更激进的看法

Honeycomb 的 CTO Charity Majors 有个流传很广的判断：**"there are no pillars"**——支柱是个营销词，技术词是"信号"（signal）。她认为把 metrics、logs、traces 分成三份独立存储，本质上是同一份数据付了三次钱，还制造了三处互相接不上的死角；更合理的做法是**宽事件（wide events）**：把请求的全部上下文压进一条结构化事件、只存一次，metrics 和 trace 都是读时从这个统一存储里派生出来的视图，并且**拥抱高基数**——因为"哪个用户的哪次请求失败了"这种问题，聚合掉的维度恰好就是答案。

公平地说，三家分立的模型在基础设施和运维反馈环里仍然成立（那里的遥测不由你写），真正别扭的是**你自己写的业务代码**。

所以务实的态度不是推翻现有技术栈，而是在设计事件时就按"宽事件"的思路来：**把上下文尽量塞进同一条事件里，而不是先拆到三个系统，再想办法 join 回来**。

## 八、小结

- **三支柱的价值在于能互相 join。** 装了三个系统而日志里没有 `trace_id`、metric 上没有 exemplar，等于装了三个孤岛。
- **Metrics 的高基数几乎都是自己造的。** `user_id`、`request_id`、原始 URL 一律不许进标签；改用路由模板和有界枚举值，唯一标识交给 exemplar。
- **头部采样是"盲"的**，它必然随机丢掉一部分错误和慢请求。要保证错误与慢请求不丢，得靠 Collector 的尾部采样，代价是内存和同实例汇聚。
- **span 的属性比调用图重要。** 只有调用图，你只能知道"慢"，不知道"为什么慢"。
- **日志先结构化，再注入 `trace_id`。** 只做一件事的话就做这件。
- **四黄金指标里 latency 要成功/失败分开看**，否则 fail-fast 的 500 会把延迟曲线洗白。
- **exemplar 用来连接，不能用来当标签。** 把 trace ID 写进标签是把关联手段变成了基数炸弹。

## 参考来源

- [OpenTelemetry 官方文档：Signals（Traces / Metrics / Logs / Baggage 的定义与定位）](https://opentelemetry.io/docs/concepts/signals/)
- [Google SRE Book 第 6 章：Monitoring Distributed Systems（四大黄金指标：latency、traffic、errors、saturation，以及 latency 需区分成功与失败）](https://sre.google/sre-book/monitoring-distributed-systems/)
- [Prometheus 官方文档：Metric and label naming（应用前缀、基础单位、单位后缀、`_total` 约定）](https://prometheus.io/docs/practices/naming/)
- [Prometheus 官方文档：Data model（指标名与标签的合法字符、时间序列的维度模型、`__` 前缀保留）](https://prometheus.io/docs/concepts/data_model/)
- [OpenTelemetry 官方文档：Tail-based sampling（.NET SDK 侧头部+尾部混合采样，保留全部失败 span 的实现与取舍）](https://opentelemetry.io/docs/languages/dotnet/traces/tail-based-sampling/)
- [Charity Majors：The pillar is a lie（"没有支柱，只有信号"；支柱是营销词而非技术词）](https://charity.wtf/2025/10/30/the-pillar-is-a-lie/)
- [Honeycomb：Wide Events vs. Three Pillars（三份独立存储的成本倍增与"统一存储、读时派生"的对照）](https://www.honeycomb.io/blog/wide-events-vs-three-pillars-ai-observability-costs)
- [Grafana 官方文档：Configure and use exemplars（exemplar 与 trace ID 的关联、TimeSeries 面板启用方式）](https://grafana.com/docs/grafana-cloud/observe-and-act/send-data/traces/configure/exemplars/)
- [Prometheus Python Client：Exemplars（在直方图观测值上附加 trace_id / span_id，以及 OpenMetrics 暴露格式要求）](https://prometheus.github.io/client_python/instrumenting/exemplars/)
