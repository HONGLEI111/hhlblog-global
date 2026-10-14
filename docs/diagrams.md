# 图表（Mermaid）系统

站内所有图表都是**构建期渲染成内联 SVG** 的，浏览器端没有任何图表运行时。

## 工作方式

````text
```mermaid 代码块
   ↓  astro build 时
src/plugins/rehype-mermaid-svg.mjs   （rehype 阶段，HAST）
   ↓  beautiful-mermaid 渲染
<figure class="diagram"><div class="diagram-canvas"><svg …></div></figure>
````

- **渲染器**：`beautiful-mermaid`（纯 TS，无 DOM 依赖，同步渲染）。
  它只支持 Mermaid 语法的一个子集，见下方「限制」。
- **插件**：`src/plugins/rehype-mermaid-svg.mjs`，挂在 `astro.config.mjs` 的
  `markdown.rehypePlugins` 首位。在 rehype 阶段替换元素，因此
  astro-expressive-code **不会**把图表包进代码块。
- **配色**：插件不写死任何颜色，只把 `var(--diagram-*)` 引用交给渲染器。
  真实色值定义在 `src/styles/variables.styl`，明暗两套；样式在
  `src/styles/markdown.css` 的 `figure.diagram` 一节。
  因为色值是 CSS 变量，**切换主题/色相不需要重新渲染图表**。

## 为什么不用 mermaid 官方包

先前用的是 `mermaid` + 客户端渲染，代价是：

- 每个含图表的页面要下载约 587KB 运行时，渲染前还会闪一下源码；
- 官方主题只能吃 `theme: 'default' | 'dark'` 两个字符串，读不到站点的
  `--hue`，配色与全站脱钩；
- 想贴近主题只能靠 `themeCSS` + `!important` 与 Mermaid 内联样式对抗。

`beautiful-mermaid` 原生接受 CSS 变量，因此上述问题整体消失，并顺带
移除了运行时依赖（构建期完成，无 JS 也能看到图）。

## 限制（写图前必读）

`beautiful-mermaid` 是 Mermaid 语法的**子集实现**，以下写法会出问题：

| 写法 | 后果 |
| --- | --- |
| 标签里含 `<br/>`、`<b>` 等 HTML | **静默丢节点**（不报错，整个节点消失） |
| `subgraph` 分组 | 分组标题重复、所有分组都显示成第一个的名字、节点可能被裁切 |
| `pie` 饼图 | 不支持，构建时抛错 |
| `classDef` / `:::` / `style X fill:` | 不支持；语法类渲染失败会打警告，但颜色不会被应用 |

**支持的图表类型**：`graph` / `flowchart`、`stateDiagram-v2`、`sequenceDiagram`、
`classDiagram`、`erDiagram`、`xychart-beta`。

### 由此得出的写法约定

1. **标签只用一行纯文本**，不要 `<br/>`、不要 `<b>`。
   需要表达层级，把层级名并进标签：`A["内核内存层 · page cache（缓存页）"]`。
2. **不要用 `subgraph`**。改为把分组信息写进节点标签。
3. **不要用 `classDef` / `style fill:` 表达语义色**。渲染器不接管这些颜色，
   且它们无法适配暗色模式。
4. **饼图改用 `xychart-beta`**：

   ```mermaid
   xychart-beta horizontal
       title "字符频率分布"
       x-axis [A, B, R, C, D]
       y-axis "出现次数" 0 --> 5
       bar [5, 2, 2, 1, 1]
   ```

5. 象限图 `quadrantChart` 若使用中文，**标签必须加引号**，否则 lexical error
   （轴标签、`quadrant-1..4`、数据点名称都是）。

## 失败行为

单个图表渲染失败时，插件打印

```text
[mermaid] could not render diagram (<源文件路径>): <原因>
```

并**保留原始代码块**，构建继续成功。所以：

- 构建通过 ≠ 所有图表都渲染成功，**要留意这行警告**；
- 一旦看到它，先检查上面的「限制」表。

验证渲染结果是否齐全：

```bash
npx astro build
# 统计渲染出的图表数量，应与源码中的 ```mermaid 块数一致
grep -ro 'figure class="diagram"' dist --include=*.html | wc -l
grep -ro '```mermaid' src/content | wc -l
```

## 自动化检查

`scripts/verify-optimizations.mjs` 里有一组针对图表的断言，随 CI 运行：

- 图表页面**完全不请求** mermaid 运行时；
- 图表以**内联 SVG** 形式存在于 HTML 中；
- 不再残留客户端渲染目标（`pre.mermaid`）；
- 图表不产生任何 Google Fonts 请求
  （渲染器默认会注入 `@import`，插件已剥离）。
