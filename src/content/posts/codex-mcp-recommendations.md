---
title: Codex MCP 推荐：8 款必备 MCP Server 让你的 AI 开发效率翻倍
published: 2026-06-03
description: '盘点 8 款实用的 Codex MCP Server，涵盖通用集成、会话持久化、多 Agent 协作、用量监控、TDD 开发、浏览器自动化等场景，助你打造最强 AI 开发工作流。'
image: ''
tags: [Codex, MCP, OpenAI, AI开发, 工具推荐]
category: '后端'
draft: false
lang: ''
---

## 什么是 Codex MCP？

OpenAI Codex CLI 自 0.40 版本起全面支持 **MCP（Model Context Protocol，模型上下文协议）**。MCP 原本由 Anthropic 为 Claude 设计，如今已成为 AI 工具生态的通用标准。通过 MCP，Codex 能够连接外部工具、数据源和服务，从浏览器自动化到数据库查询，从 Figma 设计到 GitHub 仓库管理，极大地扩展了其能力边界。

Codex 支持两种 MCP 传输方式：

| 类型 | 说明 |
|------|------|
| **STDIO** | 启动本地子进程（如通过 `npx`），适合本地工具 |
| **Streamable HTTP** | 连接远程 URL，适合云服务与 API |

配置统一存放在 `~/.codex/config.toml`（或项目级 `.codex/config.toml`）中。

```toml
# STDIO 示例
[mcp_servers.context7]
command = "npx"
args = ["-y", "@upstash/context7-mcp"]

# HTTP 示例
[mcp_servers.figma]
url = "https://mcp.figma.com/mcp"
bearer_token_env_var = "FIGMA_OAUTH_TOKEN"
```

---

## 8 款必装 Codex MCP Server 推荐

### 1. codex-mcp — 将 Codex 完整能力封装为 MCP

- **npm**: `@leo000001/codex-mcp`
- **安装**: `npx -y @leo000001/codex-mcp`

**亮点**：

- 5 个工具：`codex_setup`、`codex`、`codex_reply`、`codex_session`、`codex_check`
- 异步非阻塞执行，后台轮询结果
- **三层权限管理模型**：审批策略、沙箱隔离、异步审批仲裁
- 零配置，自动继承本地 `~/.codex/config.toml`
- 会话持久化，支持崩溃恢复
- 支持 app-server 和 exec 双模式

适合需要将 Codex CLI 完整能力集成到 MCP 生态中的场景。

---

### 2. codex-mcp-bridge — 通用 Codex CLI 桥接层

- **npm**: `codex-mcp-bridge`
- **安装**: `npx -y codex-mcp-bridge`

**亮点**：

- 5 个工具：`codex`、`review`、`search`、`structured`、`ping`
- **Agentic 代码审查**：Codex 在 `--full-auto` 模式下探索整个仓库
- 安全增强：环境变量白名单、路径沙箱、日志脱敏
- 并发控制（最大 3 并发，FIFO 队列）
- JSON Schema 验证的结构化输出
- 自动模型降级（配额耗尽时切换备用模型）

适合需要安全、可控地桥接 Codex CLI 到 MCP 客户端的场景。

---

### 3. codex-persistent-mcp — 轻量级会话持久化

- **npm**: `codex-persistent-mcp`
- **安装**: `npx -y codex-persistent-mcp`

**亮点**：

- 3 个工具：`codex_chat`、`codex_plan`、`codex_review`
- MCP 调用创建真实持久化会话，支持 `codex resume <session_id>` 恢复
- 服务器重启不丢失上下文
- 同一项目（CWD）会话自动关联

对于需要长对话、上下文保持的开发任务来说，会话持久化是刚需。这款工具轻量且专注，非常适合日常使用。

---

### 4. Radio MCP — 多 AI Agent 协作平台

- **npm**: `radio-mcp`
- **安装**: `npx -y radio-mcp`

**亮点**：

- 让 Claude Code 和 Codex 在**同一仓库**中协作
- 三种工作流：快速提问、代码审查、**双 Agent 盲审协作**
- 异步 Job/Poll 模式，避免长时间占用 MCP 连接
- 支持 `.radio/` 目录持久化所有记录

如果你同时使用 Claude Code 和 Codex，Radio MCP 让你可以发挥二者之长。比如让 Codex 写代码、Claude 审查，或者反之——盲审模式下它们互不干扰，结果合并后往往比单打独斗更靠谱。

---

### 5. codex-usage-mcp — Token 用量与成本监控

- **npm**: `codex-usage-mcp`
- **安装**: `npx -y codex-usage-mcp`

**亮点**：

- 8 个 MCP 工具，覆盖用量概览、项目聚合、模型分布、速率限制
- 支持 5 小时滚动窗口、本周累计、自定义时间范围
- 费用估算（含未知模型优雅降级）
- 本地只读，解析 `~/.codex/sessions/**/*.jsonl`

Codex 用多了，Token 费用很容易失控。这款工具让你随时掌握用量和成本，是重度用户的必备。

---

### 6. mcp-codex-dev — TDD 开发工作流

- **npm**: `mcp-codex-dev`
- **安装**: `npx -y mcp-codex-dev`

**亮点**：

- 工具：`exec`、`tdd`（测试驱动开发）、`review`、`health`、`session_list`、`session_discard`
- 内置 TDD 提示模板
- 本地 HTTP 进度服务器（`localhost:23120`）
- 全局/项目级配置覆盖

如果你遵循 TDD（测试驱动开发）流程，这款工具内置了专用模板和进度监控，让 Codex 更好地融入你的开发节奏。

---

### 7. mcp-codex-agent-teams — 多 Agent 团队编排

- **npm**: `mcp-codex-agent-teams`
- **安装**: `npx -y mcp-codex-agent-teams`

**亮点**：

- DAG 任务图编排，依赖安全执行
- Git worktree/branch 隔离
- 收件箱协议（直接消息、广播、plan/shutdown 信号）
- 自动提交支持

适合复杂项目的多 Agent 协作场景。你可以定义任务依赖图，让多个 Codex 实例在不同的 Git worktree 中并行工作，最后自动合并提交。

---

### 8. Codex Browser Bridge — 浏览器自动化桥接

- **发布平台**: PulseMCP
- **类型**: Chrome 扩展

**亮点**：

- 桥接 Claude Code / MCP Agent 到 Codex Desktop
- 标签管理、导航、DOM 检查
- 完整的浏览器交互能力

前端开发者或需要浏览器自动化的场景，这款 Chrome 扩展让 Codex 可以直接操控浏览器，从截图到 DOM 操作一应俱全。

---

## 选型速查表

| 场景 | 推荐 |
|------|------|
| 通用 Codex 集成 | `codex-mcp` 或 `codex-mcp-bridge` |
| 会话持久化/恢复 | `codex-persistent-mcp` |
| 多 Agent 协作 | `Radio MCP` 或 `mcp-codex-agent-teams` |
| 用量监控/成本分析 | `codex-usage-mcp` |
| TDD 开发流程 | `mcp-codex-dev` |
| 浏览器自动化 | `Codex Browser Bridge` |

---

## 快速安装指南

大多数 MCP Server 都可以通过一行命令安装到 Codex：

```bash
# 添加 STDIO 类型的 MCP Server
codex mcp add codex-mcp -- npx -y @leo000001/codex-mcp

# 添加 HTTP 类型的 MCP Server（以 OpenAI 官方文档为例）
codex mcp add openai-docs --url https://developers.openai.com/mcp

# 查看已安装的 MCP Server
codex mcp list

# 移除某个 MCP Server
codex mcp remove codex-mcp
```

---

## 注意事项

1. **模型兼容性**：`gpt-5-codex` 模型曾报告（0.40.0 版本）MCP Server 静默失败的问题，建议使用 `gpt-5` 或其他模型。请关注 [GitHub Issue #4117](https://github.com/openai/codex/issues/4117) 获取最新进展。

2. **结构化输出**：部分 MCP 工具同时返回 `content[]` 和 `structuredContent` 时，可能导致 `content[]` 被丢弃。详见 [GitHub Issue #10334](https://github.com/openai/codex/issues/10334)。

3. **安全考虑**：MCP Server 拥有执行本地命令的能力，请仅安装可信来源的包，并善用 `enabled_tools` 白名单限制工具范围。

4. **反方向**：Codex 本身也可以作为 MCP Server 运行（`codex mcp-server`），让其他 Agent（如通过 OpenAI Agents SDK 构建的应用）将 Codex 作为工具调用，实现多 Agent 开发。

---

Codex 的 MCP 生态正在快速发展，本文推荐的 8 款工具覆盖了从编码、审查、协作到监控的完整开发链路。根据你的具体需求选择合适的组合，让 AI 开发效率真正翻倍。
