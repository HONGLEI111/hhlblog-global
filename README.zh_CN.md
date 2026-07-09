# hhlblog-global

基于 [Astro](https://astro.build) + [Svelte 5](https://svelte.dev) + [Tailwind CSS](https://tailwindcss.com) 构建的个人博客，派生自 [Fuwari](https://github.com/saicaca/fuwari) 主题。

> [English](README.md)

## ✨ 特性

- **Astro 5** 静态站点生成 + **Svelte 5** 交互式岛屿架构
- **暗色 / 亮色 / 跟随系统** 三种主题模式，动态色相调节
- **Pagefind** 全文搜索：导航栏内联搜索 + 独立搜索页 `/search`
- **i18n 国际化** — 7 种语言（zh_CN, en, zh_TW, ja, ko, vi, es），AI 编译时自动翻译
- **Swup** 页面过渡动画，类 SPA 体验
- **Markdown** 增强：KaTeX 数学公式、Mermaid 图表、Expressive Code 代码高亮
- **响应式** — 桌面端侧边栏 + 移动端浮动面板
- **RSS**、站点地图、SEO 元标签、PhotoSwipe 图片灯箱
- **AI 聊天助手** 小部件

## 🚀 快速开始

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev

# 生产构建（含 AI 翻译）
ANTHROPIC_API_KEY=sk-ant-... pnpm build

# 生产构建（不含 AI 翻译，使用缓存/回退翻译）
pnpm build
```

## 📁 项目结构

```
src/
├── components/
│   ├── blog/          # 博客集合组件
│   ├── common/        # 通用 UI 基础组件
│   ├── controls/      # 交互控件（搜索、主题切换）
│   ├── features/      # 功能组件（聊天、搜索页）
│   ├── landing/       # 首页着陆区块
│   ├── layout/        # 结构布局组件
│   ├── misc/          # 杂项（Markdown、许可协议、图片）
│   ├── read/          # 阅读集合组件
│   ├── technology/    # 技术集合组件
│   ├── ui/            # 设计系统基础组件
│   └── widget/        # 侧边栏小部件
├── config.ts          # 站点配置
├── content/           # Markdown 内容集合
├── i18n/              # 国际化（7 种语言）
├── layouts/           # 页面布局
├── pages/             # 路由页面
├── plugins/           # Remark/Rehype 插件
├── styles/            # CSS / Stylus 样式
├── types/             # TypeScript 类型定义
└── utils/             # 工具函数
```

## 🛠️ 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | Astro 5.13 |
| UI 运行时 | Svelte 5 |
| 样式 | Tailwind CSS 3, Stylus |
| 内容 | Markdown / MDX |
| 搜索 | Pagefind 1.4 |
| 图标 | astro-icon (Iconify) |
| 数学 | KaTeX, remark-math |
| 图表 | Mermaid |
| 代码 | Expressive Code |
| 过渡 | Swup |
| 图片 | sharp, PhotoSwipe |
| 代码规范 | Biome |

## 🌍 国际化

博客支持 7 种语言。`zh_CN` 和 `en` 为手动维护；其余语言（`ja`、`ko`、`zh_TW`、`vi`、`es`）通过 Anthropic Claude API 在构建时自动生成。

```bash
# 手动生成翻译
ANTHROPIC_API_KEY=sk-ant-... pnpm translate
```

详见 [scripts/translate-i18n.mjs](scripts/translate-i18n.mjs)。

## 📝 内容集合

- **posts** — 博客文章
- **technology** — 技术教程与笔记
- **read** — 读书笔记
- **spec** — 特殊页面（关于、友链、留言板）

创建新内容：

```bash
pnpm new-post       # 新建博客文章
pnpm new-technology # 新建技术文章
pnpm new-read       # 新建阅读笔记
```

## 📄 开源协议

本项目基于 [MIT License](LICENSE) 开源。

主题基于 [saicaca](https://github.com/saicaca) 的 [Fuwari](https://github.com/saicaca/fuwari)。
