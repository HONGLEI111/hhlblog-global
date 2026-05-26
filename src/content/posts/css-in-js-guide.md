---
title: CSS in JS 技术详解：从 styled-components 到 Panda CSS
published: 2026-05-26
description: '深入探讨 CSS in JS 技术的发展历程、核心方案对比（styled-components、Emotion、Vanilla Extract、Panda CSS），以及编译时零运行时方案的优势与选型建议'
image: ''
tags: [CSS, 前端, React]
category: '前端'
draft: false
lang: ''
---

## 什么是 CSS in JS

CSS in JS 是一种将 CSS 样式编写在 JavaScript/TypeScript 文件中的技术方案。它允许开发者利用 JavaScript 的能力来管理样式，实现动态样式、主题切换、样式隔离等功能。自 2014 年 Facebook 的 Christopher Chedeau 在 NationJS 大会上提出这一概念以来，CSS in JS 已经成为现代前端开发的主流选择之一。

## 发展历程

### 第一代：运行时方案

最早期的 CSS in JS 库如 **styled-components** 和 **Emotion** 采用运行时方案，样式在 JavaScript 运行时被注入到 DOM 中。

**核心特征：**

- 样式在 JS 运行时计算和注入
- 利用模板字面量或对象语法定义样式
- 支持基于 props 的动态样式
- 自动处理浏览器前缀和关键帧动画

#### styled-components 示例

```jsx
import styled from 'styled-components'

const Button = styled.button`
  background: ${props => props.primary ? '#3b82f6' : '#fff'};
  color: ${props => props.primary ? '#fff' : '#3b82f6'};
  padding: 10px 20px;
  border-radius: 8px;
  border: 2px solid #3b82f6;
  cursor: pointer;
  font-size: 16px;
  transition: all 0.2s ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
  }
`

// 使用时
<Button primary>提交</Button>
```

#### Emotion (CSS Prop 方式)

```jsx
/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react'

const buttonStyle = css`
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 16px;
`

function App() {
  return (
    <button css={buttonStyle}>
      点击我
    </button>
  )
}
```

### 第二代：编译时零运行时方案

随着性能要求的提升，**编译时零运行时** 的 CSS in JS 方案开始兴起。这类方案在构建阶段将样式提取为静态 CSS 文件，运行时不再执行 JavaScript 来生成样式。

**核心优势：**

- 零运行时开销，打包体积更小
- 样式在构建时提取为 .css 文件
- 更好的 SSR 和 SSG 支持
- 接近原生 CSS 的性能表现

#### Vanilla Extract

Vanilla Extract 在 TypeScript 中编写类型安全的样式，编译时生成静态 CSS：

```typescript
// styles.css.ts
import { style } from '@vanilla-extract/css'

export const button = style({
  padding: '10px 20px',
  borderRadius: '8px',
  fontSize: '16px',
  border: 'none',
  cursor: 'pointer',
  transition: 'all 0.2s ease',

  ':hover': {
    transform: 'translateY(-1px)',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
  }
})

export const primary = style({
  background: '#3b82f6',
  color: '#fff'
})
```

#### Panda CSS

Panda CSS 是目前最受欢迎的零运行时方案，提供了完整的类型安全和设计令牌系统：

```tsx
import { css } from '../styled-system/css'

function App() {
  return (
    <button
      className={css({
        bg: 'blue.500',
        color: 'white',
        px: '5',
        py: '2.5',
        rounded: 'lg',
        cursor: 'pointer',
        _hover: {
          transform: 'translateY(-1px)',
          boxShadow: 'lg'
        }
      })}
    >
      提交
    </button>
  )
}
```

Panda CSS 还可以配置设计令牌（Design Tokens），实现设计系统的一致化管理：

```typescript
// panda.config.ts
import { defineConfig } from '@pandacss/dev'

export default defineConfig({
  theme: {
    tokens: {
      colors: {
        blue: {
          500: { value: '#3b82f6' }
        }
      },
      spacing: {
        5: { value: '1.25rem' },
        2.5: { value: '0.625rem' }
      }
    }
  }
})
```

## 主流方案对比

| 特性 | styled-components | Emotion | Vanilla Extract | Panda CSS |
|------|-------------------|---------|-----------------|-----------|
| 运行方式 | 运行时 | 运行时 | 编译时 | 编译时 |
| 打包体积 | ~14KB | ~8KB | 0 (运行时) | 0 (运行时) |
| TypeScript 支持 | 中等 | 中等 | 完善 | 完善 |
| 动态样式 | props | props / css prop | recipes | recipes / cva |
| SSR 友好度 | 一般 | 较好 | 优秀 | 优秀 |
| 学习成本 | 低 | 低 | 中 | 中 |
| 生态成熟度 | 非常成熟 | 成熟 | 中等 | 快速发展 |

## 零运行时方案为什么更优

### 1. 性能提升

传统的运行时 CSS in JS 在组件渲染时需要计算样式哈希、插入样式标签，这些操作会消耗主线程时间。在大型应用中，这些开销会累积成明显的性能瓶颈。

零运行时方案将这一过程移到了构建阶段，运行时直接使用预生成的 CSS 类名，配合浏览器的 CSS 解析引擎，性能更优。

### 2. 更好的 SSR 支持

运行时方案在服务端渲染时需要提取样式并注入到 HTML 中，这一过程需要额外的配置和处理。而零运行时方案生成的静态 CSS 文件可以直接通过 `<link>` 标签引入，SSR 的流程更加简洁自然。

### 3. 更小的打包体积

零运行时方案去除了样式运行时的库代码，JavaScript bundle 体积显著减小。对于性能敏感的应用来说，这是一个重要的优势。

### 4. 与 React Server Components 的良好兼容

React Server Components 在服务端渲染，不支持运行时 CSS in JS。零运行时方案天然兼容 RSC，是构建 Next.js 14+ 应用的理想选择。

## 选型建议

- **快速迭代的小型项目**：styled-components 或 Emotion 上手快，生态丰富
- **性能敏感的生产项目**：优先考虑 Vanilla Extract 或 Panda CSS
- **使用 Next.js 14+ 或 RSC**：选择编译时零运行时方案
- **需要完整设计系统**：Panda CSS 的设计令牌体系是最佳选择
- **Tailwind 用户迁移**：Panda CSS 的原子化 CSS 模式更容易上手

## 总结

CSS in JS 技术正在从运行时方案向编译时零运行时方案演进。如果你的项目对性能有较高要求，或者正在使用 React Server Components，强烈建议选择 Vanilla Extract 或 Panda CSS 这类编译时方案。它们保留了 TypeScript 类型安全和组件化样式的优势，同时消除了运行时的性能开销。

未来，随着浏览器原生 CSS 能力的不断增强（CSS Nesting、CSS Layers、CSS Container Queries），CSS in JS 的方案可能会进一步与平台特性融合，让 Web 样式开发变得更加高效和可控。
