---
title: Mermaid 图表演示
published: 2026-04-15
description: '使用 Mermaid 语法绘制思维导图、流程图等各类图表的演示'
image: ''
tags: [Mermaid, 思维导图, 可视化]
category: 'Guides'
draft: false
lang: 'zh'
---

## 什么是 Mermaid？

[Mermaid](https://mermaid.js.org/) 是一种基于 Markdown 语法的图表绘制工具，只需在代码块中写几行文字，即可生成流程图、思维导图、时序图等多种图表。

在 Markdown 中使用 ` ```mermaid ` 代码块即可启用。

---

## 思维导图

```mermaid
mindmap
  root((编程学习路径))
    前端开发
      HTML & CSS
        语义化标签
        Flexbox / Grid
        响应式设计
      JavaScript
        ES6+ 语法
        DOM 操作
        异步编程
      框架
        React
        Vue
        Svelte
    后端开发
      语言选择
        Python
        Go
        Node.js
      数据库
        关系型
          PostgreSQL
          MySQL
        非关系型
          Redis
          MongoDB
      API 设计
        REST
        GraphQL
    运维与部署
      容器化
        Docker
        Kubernetes
      CI/CD
        GitHub Actions
        Jenkins
      云服务
        AWS
        阿里云
```

---

## 流程图

```mermaid
flowchart TD
    A([开始]) --> B{是否已有项目？}
    B -- 是 --> C[克隆仓库]
    B -- 否 --> D[初始化新项目]
    C --> E[安装依赖]
    D --> E
    E --> F[本地开发]
    F --> G{代码审查}
    G -- 通过 --> H[合并到主分支]
    G -- 未通过 --> F
    H --> I[自动化测试]
    I -- 失败 --> F
    I -- 通过 --> J[部署上线]
    J --> K([结束])
```

---

## 时序图

```mermaid
sequenceDiagram
    participant 用户
    participant 浏览器
    participant 服务器
    participant 数据库

    用户->>浏览器: 输入 URL
    浏览器->>服务器: GET /api/posts
    服务器->>数据库: SELECT * FROM posts
    数据库-->>服务器: 返回数据
    服务器-->>浏览器: JSON 响应
    浏览器-->>用户: 渲染页面
```

---

## 甘特图

```mermaid
gantt
    title 博客开发计划
    dateFormat  YYYY-MM-DD
    section 设计阶段
    需求分析        :done,    des1, 2026-04-01, 2026-04-03
    UI 设计         :done,    des2, 2026-04-03, 2026-04-07
    section 开发阶段
    前端开发        :active,  dev1, 2026-04-07, 2026-04-15
    后端开发        :         dev2, 2026-04-10, 2026-04-18
    section 测试上线
    测试            :         test, 2026-04-18, 2026-04-22
    部署上线        :         dep,  2026-04-22, 2026-04-23
```

---

## 类图

```mermaid
classDiagram
    class Post {
        +String title
        +Date published
        +String description
        +String[] tags
        +String category
        +Boolean draft
        +render() String
    }

    class Category {
        +String name
        +String slug
        +Post[] posts
        +getPosts() Post[]
    }

    class Tag {
        +String name
        +String slug
        +Post[] posts
    }

    Post "many" --> "1" Category : 属于
    Post "many" --> "many" Tag : 拥有
```

---

## Mermaid 语法速查

| 图表类型 | 关键字 | 用途 |
|---------|--------|------|
| 思维导图 | `mindmap` | 概念发散、知识梳理 |
| 流程图 | `flowchart` / `graph` | 流程描述、决策树 |
| 时序图 | `sequenceDiagram` | 交互流程、API 调用 |
| 甘特图 | `gantt` | 项目计划、时间线 |
| 类图 | `classDiagram` | 数据结构、UML |
| 状态图 | `stateDiagram-v2` | 状态机、生命周期 |
| 饼图 | `pie` | 数据占比 |
| ER 图 | `erDiagram` | 数据库设计 |
