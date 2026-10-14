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
# macOS / Linux — add to ~/.bashrc or ~/.zshrc
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
# Initialize the project config file (generates CLAUDE.md)
claude init

# View the current configuration
claude config

# Update to the latest version
claude update
```

### 3.3 Typical Workflows

**Code Review**

```
> Review the changes on the current branch, focusing on security issues
```

Claude will read `git diff`, analyze the code changes, and point out potential security risks.

**Bug Fixing**

```
> User reports a blank page after login; help me troubleshoot the cause
```

Claude will search for relevant files, inspect component logic, locate the problem, and fix it directly.

**Feature Development**

```
> Add an API endpoint to retrieve a user's favorites list, including pagination
```

Claude will analyze the existing route structure and generate route definitions, controller logic, and database queries.

---

## 4. Advanced Techniques

### 4.1 The CLAUDE.md File

Create `CLAUDE.md` in the project root directory to tell Claude key information about the project:

```markdown
# Project Name

## Tech Stack
- Frontend: React 18 + TypeScript + Tailwind
- Backend: Go + PostgreSQL
- Deployment: Docker + K8s

## Code Standards
- Use Prettier for formatting, single quotes, no semicolons
- Use PascalCase for component naming
- Use kebab-case for API routes

## Notes
- Do not directly modify generated code files
- Use Vitest for testing, do not use Jest
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
# Resume the previous session
claude --continue

# Continue with a specific session ID
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
# Use a domestic mirror when installing with npm
npm install -g @anthropic-ai/claude-code --registry=https://registry.npmmirror.com
```

---

## 7. Summary

Claude Code represents the shift of AI programming tools from "auxiliary plugins within an IDE" to "autonomous assistants in the terminal." Its stronger project understanding and autonomous action permissions allow developers to focus more energy on architecture design rather than repetitive coding.

Installation takes just two commands, and it's worth trying for every developer who is comfortable with the command line.