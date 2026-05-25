---
title: Claude Code 安装与使用教程：从零开始的 AI 编程助手
published: 2026-05-08
description: '详细介绍 Claude Code 的安装方法、基础使用技巧与进阶工作流，帮助你快速将 AI 编程助手融入日常开发。'
image: ''
tags: [Claude Code, AI 编程, 开发工具]
category: 'AI'
draft: false
lang: ''
---

## 1. 什么是 Claude Code

Claude Code 是 Anthropic 推出的**命令行 AI 编程助手**，与 Copilot（IDE 插件）或 Cursor（AI IDE）不同，它直接在终端中运行，能够理解整个项目上下文，执行文件操作、运行命令、管理 Git 等。

它的核心差异在于：
- **终端原生**：不需要离开命令行，适合习惯 CLI 的开发者
- **项目级理解**：能读取整个项目的文件结构和代码逻辑
- **自主行动**：不仅能回答问题，还能直接编辑文件、运行测试、提交代码

---

## 2. 安装

### 2.1 前置条件

- Node.js 18 或更高版本
- 一个 Anthropic API Key（在 [console.anthropic.com](https://console.anthropic.com) 获取）

### 2.2 全局安装

```bash
npm install -g @anthropic-ai/claude-code
```

安装完成后验证：

```bash
claude --version
```

### 2.3 配置 API Key

将 API Key 设置为环境变量：

```bash
# macOS / Linux — 添加到 ~/.bashrc 或 ~/.zshrc
export ANTHROPIC_API_KEY="sk-ant-xxx"

# Windows PowerShell
$env:ANTHROPIC_API_KEY="sk-ant-xxx"
```

或者使用 Claude Code 自带的登录方式：

```bash
claude login
```

这会打开浏览器引导你完成 OAuth 认证，无需手动处理 API Key。

### 2.4 更新

```bash
npm update -g @anthropic-ai/claude-code
```

---

## 3. 基础使用

### 3.1 启动

在项目目录下运行：

```bash
claude
```

你会看到一个交互式终端界面，可以直接用自然语言与 Claude 交流。

### 3.2 常用指令

```bash
# 初始化项目配置文件（生成 CLAUDE.md）
claude init

# 查看当前配置
claude config

# 更新到最新版本
claude update
```

### 3.3 典型工作流

**代码审查**

```
> 审查当前分支的改动，重点关注安全问题
```

Claude 会读取 `git diff`，分析代码变更，指出潜在的安全隐患。

**Bug 修复**

```
> 用户反馈登录后页面白屏，帮我排查原因
```

Claude 会搜索相关文件、检查组件逻辑，定位问题并直接修复。

**功能开发**

```
> 在 API 中添加一个获取用户收藏列表的接口，包含分页
```

Claude 会分析现有路由结构，生成路由定义、控制器逻辑和数据库查询。

---

## 4. 进阶技巧

### 4.1 CLAUDE.md 文件

在项目根目录创建 `CLAUDE.md`，告诉 Claude 关于项目的关键信息：

```markdown
# 项目名称

## 技术栈
- 前端：React 18 + TypeScript + Tailwind
- 后端：Go + PostgreSQL
- 部署：Docker + K8s

## 代码规范
- 使用 Prettier 格式化，单引号，无分号
- 组件命名使用 PascalCase
- API 路由使用 kebab-case

## 注意事项
- 不要直接修改生成的代码文件
- 测试使用 Vitest，不要用 Jest
```

有了这份文件，Claude 每次启动时都会自动加载，减少反复解释。

### 4.2 权限控制

Claude Code 默认对敏感操作（如网络请求、文件写入）会请求确认。你可以通过 `/permissions` 管理权限级别。

### 4.3 管道模式

Claude 也支持管道输入，适合脚本场景：

```bash
cat error.log | claude "分析这些日志，找出关键错误"
```

### 4.4 会话管理

```bash
# 恢复上一次会话
claude --continue

# 以特定会话 ID 继续
claude --resume <session-id>
```

---

## 5. Claude Code vs 其他 AI 编程工具

| 维度 | Claude Code | GitHub Copilot | Cursor |
|------|------------|----------------|--------|
| 运行环境 | 终端 | IDE 插件 | AI IDE |
| 交互方式 | 对话式 | 代码补全 + 聊天 | 对话式 |
| 文件操作 | 可写 | 只能写代码 | 可写 |
| 命令执行 | 支持 | 不支持 | 支持 |
| 上下文范围 | 全项目 | 当前文件 + 打开文件 | 全项目 |
| 定价 | API 按量计费 | $10/月起 | $20/月起 |

Claude Code 特别适合以下场景：
- 需要多文件重构的大型任务
- 日常重度使用终端的开发者
- 希望 AI 自主处理"跑测试 → 修复 → 再跑"循环

---

## 6. 常见问题

### 6.1 国内网络问题

如果在国内访问 Anthropic API 遇到网络问题，可以：
- 使用 API 代理地址，设置环境变量 `ANTHROPIC_BASE_URL`
- 配置 HTTPS 代理：`export HTTPS_PROXY=http://127.0.0.1:7890`

### 6.2 成本控制

Claude Code 每次对话都会消耗 API token。控制成本的建议：
- 在 `.claude/settings.json` 中设置最大 token 限制
- 使用短会话，任务完成后及时 `exit`
- 对于简单问题，直接在代码中加注释而不是启动完整会话

### 6.3 国内镜像加速

```bash
# npm 安装时使用国内镜像
npm install -g @anthropic-ai/claude-code --registry=https://registry.npmmirror.com
```

---

## 7. 总结

Claude Code 代表了 AI 编程工具从"IDE 内的辅助插件"到"终端中的自主助手"的转变。它更强的项目理解能力和自主行动权限，让开发者能够把更多精力放在架构设计而非重复编码上。

安装只需两条命令，值得每个习惯命令行的开发者尝试。
