---
title: 'Claude Code Installation and Usage Tutorial: An AI Programming Assistant from Scratch'
published: 2026-05-08
description: A detailed guide to installing Claude Code, along with basic usage tips and advanced workflows to help you quickly integrate an AI programming assistant into your daily development.
image: ''
tags: [Claude Code, AI programming, developer tools]
category: 'AI'
draft: false
---
## 1. What Is Claude Code

Claude Code is a **command-line AI programming assistant** launched by Anthropic. Unlike Copilot (an IDE plugin) or Cursor (an AI IDE), it runs directly in the terminal and can understand the entire project context, perform file operations, run commands, manage Git, and more.

Its core differences are:
- **Terminal-native**: No need to leave the command line, ideal for developers accustomed to the CLI
- **Project-level understanding**: Can read the entire project's file structure and code logic
- **Autonomous action**: Not only answers questions, but can directly edit files, run tests, and commit code

---

## 2. Installation

### 2.1 Prerequisites

- Node.js 18 or higher
- An Anthropic API Key (obtained at [console.anthropic.com](https://console.anthropic.com))

### 2.2 Global Installation

```bash
npm install -g @anthropic-ai/claude-code
```

Verify after installation:

```bash
claude --version
```

### 2.3 Configuring the API Key

Set the API Key as an environment variable:

```bash
# macOS / Linux — 添加到 ~/.bashrc 或 ~/.zshrc
export ANTHROPIC_API_KEY="sk-ant-xxx"

# Windows PowerShell
$env:ANTHROPIC_API_KEY="sk-ant-xxx"
```

Or use Claude Code's built-in login method:

```bash
claude login
```

This will open a browser to guide you through OAuth authentication, with no need to manually handle the API Key.

### 2.4 Updating

```bash
npm update -g @anthropic-ai/claude-code
```

---

## 3. Basic Usage

### 3.1 Starting

Run in your project directory:

```bash
claude
```

You will see an interactive terminal interface where you can communicate with Claude directly in natural language.

### 3.2 Common Commands

```bash
# 初始化项目配置文件（生成 CLAUDE.md）
claude init

# 查看当前配置
claude config

# 更新到最新版本
claude update
```

### 3.3 Typical Workflows

**Code Review**

```
> 审查当前分支的改动，重点关注安全问题
```

Claude will read `git diff`, analyze the code changes, and point out potential security risks.

**Bug Fixing**

```
> 用户反馈登录后页面白屏，帮我排查原因
```

Claude will search for relevant files, inspect component logic, locate the problem, and fix it directly.

**Feature Development**

```
> 在 API 中添加一个获取用户收藏列表的接口，包含分页
```

Claude will analyze the existing route structure and generate route definitions, controller logic, and database queries.

---

## 4. Advanced Techniques

### 4.1 The CLAUDE.md File

Create `CLAUDE.md` in the project root directory to tell Claude key information about the project:

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

With this file in place, Claude will automatically load it on every startup, reducing repeated explanations.

### 4.2 Permission Control

By default, Claude Code requests confirmation for sensitive operations (such as network requests and file writes). You can manage permission levels through `/permissions`.

### 4.3 Pipe Mode

Claude also supports piped input, suitable for scripting scenarios:

```bash
cat error.log | claude "分析这些日志，找出关键错误"
```

### 4.4 Session Management

```bash
# 恢复上一次会话
claude --continue

# 以特定会话 ID 继续
claude --resume <session-id>
```

---

## 5. Claude Code vs Other AI Programming Tools

| Dimension | Claude Code | GitHub Copilot | Cursor |
|------|------------|----------------|--------|
| Runtime environment | Terminal | IDE plugin | AI IDE |
| Interaction mode | Conversational | Code completion + chat | Conversational |
| File operations | Can write | Can only write code | Can write |
| Command execution | Supported | Not supported | Supported |
| Context scope | Entire project | Current file + open files | Entire project |
| Pricing | API pay-as-you-go | $10/月起 | $20/month and up |

Claude Code is especially suited for the following scenarios:
- Large tasks requiring multi-file refactoring
- Developers who heavily use the terminal daily
- Those who want AI to autonomously handle the "run tests → fix → run again" loop

---

## 6. FAQ

### 6.1 Network Issues in China

If you encounter network issues accessing the Anthropic API from China, you can:
- Use an API proxy address by setting the environment variable `ANTHROPIC_BASE_URL`
- Configure an HTTPS proxy: `export HTTPS_PROXY=http://127.0.0.1:7890`

### 6.2 Cost Control

Claude Code consumes API tokens with every conversation. Suggestions for controlling costs:
- Set a maximum token limit in `.claude/settings.json`
- Use short sessions and promptly `exit` after completing tasks
- For simple questions, add comments directly in the code instead of starting a full session

### 6.3 Domestic Mirror Acceleration

```bash
# npm 安装时使用国内镜像
npm install -g @anthropic-ai/claude-code --registry=https://registry.npmmirror.com
```

---

## 7. Summary

Claude Code represents the shift of AI programming tools from "auxiliary plugins within an IDE" to "autonomous assistants in the terminal." Its stronger project understanding and autonomous action permissions allow developers to focus more energy on architecture design rather than repetitive coding.

Installation takes just two commands, and it's worth trying for every developer who is comfortable with the command line.