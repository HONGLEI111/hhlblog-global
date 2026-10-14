# HHLBlog

基于 [Astro](https://astro.build) + [Svelte 5](https://svelte.dev) + [Tailwind CSS](https://tailwindcss.com) 构建的个人博客，fork 自 [Fuwari](https://github.com/saicaca/fuwari) 主题。

> 📖 [English README](README.md)

## ✨ 特性

- **Astro 5** 静态站点生成 + **Svelte 5** 交互岛屿
- **深色 / 浅色 / 跟随系统** 三种主题模式，访客可调节主题色相
- **Pagefind** 全文搜索，导航栏内联搜索框
- **i18n** —— 界面文案支持 10 种语言（默认 `zh_CN`，单篇文章可用 `lang` 字段覆盖）
- **Swup** 页面切换动画，类 SPA 的平滑浏览体验
- **Markdown 扩展语法** —— KaTeX 数学公式、Mermaid 图表、Expressive Code 代码高亮、提示块（admonitions）、GitHub 仓库卡片
- **响应式布局** —— 桌面端侧边栏 + 移动端浮动面板
- **RSS**、sitemap、SEO meta 标签、PhotoSwipe 图片查看器
- **AI 聊天组件**，由 Cloudflare Worker 代理后端支持

## 🚀 快速开始

```bash
# 1. 安装依赖（需要 Node.js >= 20、pnpm >= 9）
pnpm install

# 2. 在 src/config.ts 中自定义站点信息

# 3. 启动开发服务器
pnpm dev          # http://localhost:4321

# 4. 生产构建（输出到 ./dist 并生成 Pagefind 索引）
pnpm build
```

## 📁 项目结构

```
.
├── public/                   # 静态资源（favicon、图片）
├── scripts/                  # 内容脚手架脚本
├── src/
│   ├── assets/               # 源码引用的图片
│   ├── components/
│   │   ├── blog/             # 博客集合组件
│   │   ├── common/           # 共享 UI 原语（Image）
│   │   ├── controls/         # 交互控件（搜索、主题切换、分页、返回顶部）
│   │   ├── features/         # 功能组件（AI 聊天组件）
│   │   ├── landing/          # 首页 landing 区块
│   │   ├── layout/           # 结构布局组件（Navbar、Footer、PostCard 等）
│   │   ├── misc/             # Markdown 渲染、License、图片包装
│   │   ├── read/             # 阅读集合组件
│   │   ├── technology/       # 技术集合组件
│   │   ├── ui/               # 设计系统原语
│   │   └── widget/           # 侧边栏组件
│   ├── config.ts             # 站点配置（标题、主题、横幅、个人资料等）
│   ├── content/              # Markdown 内容集合
│   ├── i18n/                 # 国际化（10 种语言）
│   ├── layouts/              # 页面布局
│   ├── pages/                # 路由页面
│   ├── plugins/              # Remark/Rehype 插件
│   ├── styles/               # CSS / Stylus 样式
│   ├── types/                # TypeScript 类型定义
│   └── utils/                # 工具函数
└── workers/
    └── chat-proxy/           # Cloudflare Worker —— AI 聊天代理
```

## 🛠️ 技术栈

| 类别 | 技术 |
| --- | --- |
| 框架 | Astro 5 |
| UI 运行时 | Svelte 5 |
| 样式 | Tailwind CSS 3、Stylus |
| 内容 | Markdown |
| 搜索 | Pagefind |
| 图标 | astro-icon（Iconify） |
| 数学公式 | KaTeX、remark-math |
| 图表 | Mermaid 语法、beautiful-mermaid（构建期内联 SVG） |
| 代码块 | Expressive Code |
| 页面过渡 | Swup |
| 图片 | sharp、PhotoSwipe |
| 检查 / 格式化 | Biome |
| 聊天后端 | Cloudflare Workers |

## 📝 内容集合

| 集合 | 路径 | 用途 |
| --- | --- | --- |
| `posts` | `src/content/posts/` | 博客文章 |
| `technology` | `src/content/technology/` | 技术教程与笔记 |
| `read` | `src/content/read/` | 读书笔记 |
| `spec` | `src/content/spec/` | 特殊页面（如关于页） |

使用脚手架脚本创建新内容：

```bash
pnpm new-post <文件名>          # 新建博客文章
pnpm new-technology <文件名>    # 新建技术文章
pnpm new-read <文件名>          # 新建读书笔记
```

文章 frontmatter 示例：

```yaml
---
title: 我的第一篇文章
published: 2024-01-01
updated: 2024-06-01      # 可选
description: 文章简介。
image: ./cover.jpg       # 可选
tags: [博客, Astro]
category: 前端            # 可选
draft: false             # 设为 true 时生产构建不会输出该文章
lang: zh_CN              # 可选；默认使用站点语言
---
```

## 🌍 国际化

界面文案支持 10 种语言：`zh_CN`、`zh_TW`、`en`、`ja`、`ko`、`es`、`vi`、`id`、`th`、`tr`。

- 在 `src/config.ts` 中通过 `siteConfig.lang` 设置站点默认语言。
- 单篇文章可通过 frontmatter 的 `lang` 字段单独指定语言。

## 🤖 聊天组件（可选）

侧边栏的 AI 聊天组件由 `workers/chat-proxy/` 下的 Cloudflare Worker 代理，将请求转发给 DeepSeek 兼容 API，避免在前端暴露 API Key。

```bash
cd workers/chat-proxy
pnpm install
wrangler secret put DEEPSEEK_API_KEY
wrangler deploy
```

站点本身不依赖该 Worker 也能正常构建，未部署时聊天组件只是没有后端。

## ⚡ 常用命令

所有命令都在项目根目录执行：

| 命令 | 说明 |
| --- | --- |
| `pnpm install` | 安装依赖 |
| `pnpm dev` | 启动开发服务器 `localhost:4321` |
| `pnpm build` | 生产构建并生成 Pagefind 索引到 `./dist/` |
| `pnpm preview` | 本地预览生产构建 |
| `pnpm check` | Astro 诊断检查 |
| `pnpm new-post <文件名>` | 新建博客文章 |
| `pnpm new-technology <文件名>` | 新建技术文章 |
| `pnpm new-read <文件名>` | 新建读书笔记 |
| `pnpm format` | 使用 Biome 格式化代码 |
| `pnpm lint` | 使用 Biome 检查代码 |

## ✏️ 参与贡献

见 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 📄 许可证

本项目采用 [MIT License](LICENSE)。

主题基于 [Fuwari](https://github.com/saicaca/fuwari)，作者 [saicaca](https://github.com/saicaca)。
