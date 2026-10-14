---
title: 'CSS in JS Explained: From styled-components to Panda CSS'
published: 2026-05-26
description: A deep dive into the evolution of CSS in JS, comparing core approaches like styled-components, Emotion, Vanilla Extract, and Panda CSS, along with the advantages of zero-runtime compile-time solutions and guidance on choosing the right one.
image: ''
tags: [CSS, Frontend, React]
category: Frontend
draft: false
---
## What Is CSS in JS

CSS in JS is a technical approach that involves writing CSS styles within JavaScript/TypeScript files. It allows developers to leverage the power of JavaScript to manage styles, enabling dynamic styling, theme switching, style isolation, and other features. Since Facebook's Christopher Chedeau introduced this concept at the NationJS conference in 2014, CSS in JS has become one of the mainstream choices in modern frontend development.

## Evolution

### First Generation: Runtime Approaches

The earliest CSS in JS libraries, such as **styled-components** and **Emotion**, used runtime approaches where styles were injected into the DOM at JavaScript runtime.

**Core Characteristics:**

- Styles are computed and injected at JS runtime
- Styles are defined using template literals or object syntax
- Support for dynamic styles based on props
- Automatic handling of browser prefixes and keyframe animations

#### styled-components Example

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

//When in use
<Button primary>提交</Button>
```

#### Emotion (CSS Prop Approach)

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

### Second Generation: Compile-Time Zero-Runtime Approaches

As performance requirements increased, **compile-time zero-runtime** CSS in JS solutions began to emerge. These approaches extract styles into static CSS files at build time, and no JavaScript is executed at runtime to generate styles.

**Core Advantages:**

- Zero runtime overhead, smaller bundle size
- Styles are extracted into .css files at build time
- Better SSR and SSG support
- Performance close to native CSS

#### Vanilla Extract

Vanilla Extract lets you write type-safe styles in TypeScript and generates static CSS at compile time:

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

Panda CSS is currently the most popular zero-runtime solution, offering full type safety and a design token system:

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

Panda CSS can also be configured with Design Tokens to achieve consistent management of a design system:

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

## Comparison of Mainstream Solutions

| Feature | styled-components | Emotion | Vanilla Extract | Panda CSS |
|------|-------------------|---------|-----------------|-----------|
| Runtime mode | Runtime | Runtime | Compile-time | Compile-time |
| Bundle size | ~14KB | ~8KB | 0 (runtime) | 0 (runtime) |
| TypeScript support | Moderate | Moderate | Complete | Complete |
| Dynamic styles | props | props / css prop | recipes | recipes / cva |
| SSR friendliness | Average | Good | Excellent | Excellent |
| Learning curve | Low | Low | Medium | Medium |
| Ecosystem maturity | Very mature | Mature | Medium | Rapidly growing |

## Why Zero-Runtime Approaches Are Better

### 1. Performance Improvement

Traditional runtime CSS in JS requires computing style hashes and inserting style tags during component rendering, and these operations consume main thread time. In large applications, this overhead accumulates into a noticeable performance bottleneck.

Zero-runtime approaches move this process to the build stage. At runtime, pre-generated CSS class names are used directly, working in conjunction with the browser's CSS parsing engine for better performance.

### 2. Better SSR Support

Runtime approaches require extracting styles and injecting them into HTML during server-side rendering, which demands additional configuration and handling. In contrast, the static CSS files generated by zero-runtime approaches can be included directly via `<link>` tags, making the SSR process simpler and more natural.

### 3. Smaller Bundle Size

Zero-runtime approaches eliminate the style runtime library code, significantly reducing the JavaScript bundle size. For performance-sensitive applications, this is an important advantage.

### 4. Good Compatibility with React Server Components

React Server Components render on the server and do not support runtime CSS in JS. Zero-runtime approaches are naturally compatible with RSC, making them the ideal choice for building Next.js 14+ applications.

## Selection Recommendations

- **Small projects with rapid iteration**: styled-components or Emotion are quick to get started with and have rich ecosystems
- **Performance-sensitive production projects**: Prioritize Vanilla Extract or Panda CSS
- **Using Next.js 14+ or RSC**: Choose compile-time zero-runtime approaches
- **Need a complete design system**: Panda CSS's design token system is the best choice
- **Tailwind users migrating**: Panda CSS's atomic CSS pattern is easier to pick up

## Summary

CSS in JS technology is evolving from runtime approaches to compile-time zero-runtime approaches. If your project has high performance requirements, or if you are using React Server Components, it is strongly recommended to choose compile-time solutions like Vanilla Extract or Panda CSS. They retain the advantages of TypeScript type safety and componentized styles while eliminating runtime performance overhead.

In the future, as browser-native CSS capabilities continue to advance (CSS Nesting, CSS Layers, CSS Container Queries), CSS in JS solutions may further integrate with platform features, making web style development more efficient and controllable.