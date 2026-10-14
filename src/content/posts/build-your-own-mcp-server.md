---
title: 构建你自己的 MCP Server：从零到一的实践指南
published: 2026-08-06
description: '手把手教你用 Python 构建一个 MCP Server，让 Claude 等 LLM 通过标准协议调用你的自定义工具和数据源。'
image: ''
tags: [MCP, AI, LLM, Python, 工具开发]
category: 'AI'
draft: false
lang: ''
---

## 1. 引言

MCP（Model Context Protocol，模型上下文协议）是 Anthropic 于 2024 年底开源的一套标准协议，目的是让大语言模型（LLM）能够以统一的方式访问外部工具和数据源。如果说 LLM 是大脑，MCP 就是神经系统——它让模型拥有了「做事」的能力，而不仅仅是「说话」。

2026 年，MCP 生态已经相当成熟：Claude Desktop、Claude Code、Cursor、Continue 等主流 AI 工具都已内置 MCP 支持。但更重要的是，**你可以自己写 MCP Server**——把公司的内部 API、数据库查询、文档检索、甚至是控制智能家居的能力，以标准化的方式暴露给 AI。

本文将带你从零开始，用 Python 构建一个完整的 MCP Server。

## 2. MCP 架构速览

在动手之前，先理解 MCP 的核心架构：

```
┌──────────────┐     MCP Protocol     ┌──────────────┐
│  MCP Client  │ ◄──────────────────► │  MCP Server  │
│  (Claude)    │    (stdio / SSE)     │  (你的代码)   │
└──────────────┘                      └──────────────┘
                                           │
                                      ┌────┴────┐
                                      │  Tools  │  ← LLM 可调用的函数
                                      │Resources│  ← LLM 可读取的数据
                                      │ Prompts │  ← 预置提示模板
                                      └─────────┘
```

MCP Server 提供三种原语：
- **Tools**：模型可调用的函数，类似 OpenAI Function Calling
- **Resources**：模型可读取的只读数据，类似 REST API 的 GET 端点
- **Prompts**：预定义的提示模板，帮助用户快速开始

通信方式有两种：
- **stdio**：通过标准输入/输出，适合本地进程间通信
- **SSE（Server-Sent Events）**：通过 HTTP，适合远程服务

本文将使用 stdio 模式，这是最常见也最简单的集成方式。

## 3. 环境准备

### 3.1 安装依赖

```bash
mkdir my-mcp-server && cd my-mcp-server
python3 -m venv venv
source venv/bin/activate
pip install mcp
```

核心依赖只需要一个包：`mcp`，它是 Anthropic 官方提供的 Python SDK。

### 3.2 项目结构

```
my-mcp-server/
├── server.py          # MCP Server 主入口
├── tools/
│   ├── __init__.py
│   ├── weather.py     # 天气查询工具
│   └── database.py    # 数据库查询工具
├── resources/
│   ├── __init__.py
│   └── docs.py        # 文档资源
└── pyproject.toml
```

## 4. 编写第一个 MCP Server

### 4.1 最简示例

先写一个最简的 MCP Server，只暴露一个工具：

```python
# server.py
import asyncio
from mcp.server import Server
from mcp.server.stdio import stdio_server

# 创建 Server 实例
server = Server("my-first-mcp-server")

@server.tool()
async def get_current_time() -> str:
    """获取当前系统时间"""
    from datetime import datetime
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")

async def main():
    async with stdio_server() as (read_stream, write_stream):
        await server.run(
            read_stream,
            write_stream,
            server.create_initialization_options()
        )

if __name__ == "__main__":
    asyncio.run(main())
```

这段代码做了什么：
1. `Server("my-first-mcp-server")` 创建一个 MCP Server 实例
2. `@server.tool()` 装饰器将一个 Python 函数注册为 MCP Tool
3. 函数 docstring `"""获取当前系统时间"""` 自动成为工具描述——**写好 docstring 至关重要**，因为 LLM 就是根据它来决定何时调用这个工具
4. `stdio_server()` 通过标准输入/输出与客户端通信

### 4.2 配置 Claude Desktop

要让 Claude Desktop 识别你的 MCP Server，编辑 Claude Desktop 配置文件：

```json
// macOS: ~/Library/Application Support/Claude/claude_desktop_config.json
// Windows: %APPDATA%\Claude\claude_desktop_config.json
{
  "mcpServers": {
    "my-first-server": {
      "command": "python3",
      "args": ["/path/to/my-mcp-server/server.py"]
    }
  }
}
```

重启 Claude Desktop 后，点击输入框旁的 🔌 图标，就能看到 `get_current_time` 工具已经可用。

### 4.3 在 Claude Code 中使用

Claude Code 的配置更简单——直接编辑项目根目录的 `.mcp.json`：

```json
{
  "mcpServers": {
    "my-first-server": {
      "type": "stdio",
      "command": "python3",
      "args": ["server.py"],
      "env": {
        "API_KEY": "${MY_API_KEY}"
      }
    }
  }
}
```

配置完成后，Claude Code 会在启动时自动连接你的 MCP Server。

## 5. 实战：构建天气查询 MCP Server

现在来一个更真实的例子——构建一个支持多城市天气查询的 MCP Server。

### 5.1 完整代码

```python
# server.py
import asyncio
import httpx
from typing import Optional
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool, TextContent

server = Server("weather-mcp-server")

# 模拟天气数据（实际项目中替换为真实 API 调用）
WEATHER_DATA = {
    "北京": {"temp": 32, "humidity": 65, "condition": "晴"},
    "上海": {"temp": 35, "humidity": 70, "condition": "多云"},
    "深圳": {"temp": 30, "humidity": 80, "condition": "雷阵雨"},
    "东京": {"temp": 28, "humidity": 60, "condition": "阴"},
}

@server.tool()
async def get_weather(city: str, unit: Optional[str] = "celsius") -> str:
    """查询指定城市的天气信息。

    Args:
        city: 城市名称，如 "北京"、"上海"、"深圳"
        unit: 温度单位，celsius（摄氏度）或 fahrenheit（华氏度）
    """
    data = WEATHER_DATA.get(city)
    if not data:
        return f"未找到城市「{city}」的天气数据。支持的城市：{', '.join(WEATHER_DATA.keys())}"

    temp = data["temp"]
    if unit == "fahrenheit":
        temp = temp * 9 / 5 + 32
        unit_str = "°F"
    else:
        unit_str = "°C"

    return (
        f"🌍 {city} 天气报告\n"
        f"━━━━━━━━━━━━━━\n"
        f"🌡️  温度：{temp:.1f}{unit_str}\n"
        f"💧 湿度：{data['humidity']}%\n"
        f"☁️  天气：{data['condition']}\n"
    )


@server.tool()
async def compare_weather(city_a: str, city_b: str) -> str:
    """比较两个城市的天气情况。

    Args:
        city_a: 第一个城市名称
        city_b: 第二个城市名称
    """
    data_a = WEATHER_DATA.get(city_a)
    data_b = WEATHER_DATA.get(city_b)

    if not data_a or not data_b:
        missing = city_a if not data_a else city_b
        return f"未找到城市「{missing}」的天气数据"

    comparison = f"📊 天气对比：{city_a} vs {city_b}\n"
    comparison += f"━━━━━━━━━━━━━━━━━━━━\n"
    comparison += f"🌡️   {city_a}：{data_a['temp']}°C  |  {city_b}：{data_b['temp']}°C\n"
    comparison += f"💧 {city_a}：{data_a['humidity']}%  |  {city_b}：{data_b['humidity']}%\n"
    comparison += f"☁️  {city_a}：{data_a['condition']}  |  {city_b}：{data_b['condition']}\n"

    cooler = city_a if data_a['temp'] < data_b['temp'] else city_b
    comparison += f"\n💡 {cooler} 更凉快，适合出门！"

    return comparison


async def main():
    async with stdio_server() as (read_stream, write_stream):
        await server.run(
            read_stream,
            write_stream,
            server.create_initialization_options()
        )

if __name__ == "__main__":
    asyncio.run(main())
```

### 5.2 关键设计要点

**1. 类型注解决定参数 Schema**

MCP Python SDK 会自动从函数签名中提取参数 schema。`city: str` → 字符串参数，`unit: Optional[str] = "celsius"` → 可选的字符串参数带默认值。不需要手写 JSON Schema——但前提是类型注解要准确。

**2. Docstring 是 Prompt Engineering**

工具的 docstring 会直接发送给 LLM，作为它判断「何时调用该工具」的依据。遵循 Google 风格（Args/Returns）能让描述结构化且清晰。

**3. 返回值是纯文本**

MCP Tool 的返回值是 `str` 类型。你可以在返回值中使用 emoji、格式化文本、甚至 Markdown——LLM 会原样展示给用户。这让输出既有信息量又有可读性。

## 6. 进阶：添加 Resources

除了可调用的 Tools，MCP Server 还能暴露 Resources——模型可以主动读取的只读数据：

```python
from mcp.server import Server
from mcp.server.stdio import stdio_server

server = Server("docs-mcp-server")

@server.resource("docs://readme")
async def get_readme() -> str:
    """项目的 README 文档"""
    return open("README.md", "r").read()

@server.resource("docs://api/{endpoint}")
async def get_api_doc(endpoint: str) -> str:
    """获取指定 API 端点的文档"""
    docs = {
        "auth": "POST /api/auth - 用户认证接口...",
        "users": "GET /api/users - 获取用户列表...",
        "weather": "GET /api/weather - 查询天气数据...",
    }
    return docs.get(endpoint, f"未找到端点「{endpoint}」的文档")

async def main():
    async with stdio_server() as (read_stream, write_stream):
        await server.run(
            read_stream,
            write_stream,
            server.create_initialization_options()
        )
```

配置好之后，当 Claude 需要读取项目 README 时，它会自动调用 `docs://readme` 资源。注意 `docs://api/{endpoint}` 中的 `{endpoint}` 是**路径参数**——MCP 会将其提取并传入函数。

## 7. 最佳实践

通过构建上述示例，我总结了五条 MCP Server 开发最佳实践：

### 7.1 一个 Server 一个职责

不要把天气查询、数据库操作、文件管理全塞进一个 Server。保持每个 MCP Server 职责单一——

```json
{
  "mcpServers": {
    "weather": { "command": "python3", "args": ["servers/weather.py"] },
    "database": { "command": "python3", "args": ["servers/database.py"] },
    "filesystem": { "command": "npx", "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path"] }
  }
}
```

这样出问题时更容易定位，也更方便复用。

### 7.2 做好错误处理

LLM 调用工具时可能会传奇怪的参数。做好边界检查：

```python
@server.tool()
async def query_database(sql: str) -> str:
    """在只读副本上执行 SQL 查询"""
    # 安全检查：只允许 SELECT
    if not sql.strip().upper().startswith("SELECT"):
        return "❌ 错误：仅允许 SELECT 查询"
    # 安全检查：禁止危险关键字
    dangerous = ["DROP", "DELETE", "INSERT", "UPDATE", "ALTER"]
    for keyword in dangerous:
        if keyword in sql.upper():
            return f"❌ 错误：查询包含禁止的关键字 {keyword}"

    try:
        result = execute_readonly_query(sql)
        return format_table(result)
    except Exception as e:
        return f"❌ 查询失败：{str(e)}"
```

### 7.3 工具描述要具体

比较以下两种描述：

| ❌ 差的描述 | ✅ 好的描述 |
|------------|------------|
| "查询数据" | "在 MySQL 只读副本上执行 SELECT 查询。支持标准的 SQL 语法，返回前 100 行结果。" |
| "获取天气" | "查询指定城市的实时天气，包含温度（°C/°F）、湿度、天气状况。支持的城市列表见参数说明。" |

详细的描述帮助 LLM 准确判断何时该调用你的工具——这直接决定了用户体验。

### 7.4 利用环境变量管理敏感信息

```python
import os

@server.tool()
async def search_knowledge_base(query: str) -> str:
    """搜索公司内部知识库"""
    api_key = os.environ["KB_API_KEY"]
    base_url = os.environ.get("KB_BASE_URL", "https://kb.internal.example.com")
    # ... 调用 API
```

在 `.mcp.json` 中注入环境变量，避免硬编码：

```json
{
  "mcpServers": {
    "kb-search": {
      "type": "stdio",
      "command": "python3",
      "args": ["servers/kb_search.py"],
      "env": {
        "KB_API_KEY": "${KB_API_KEY}",
        "KB_BASE_URL": "https://kb.mycompany.com"
      }
    }
  }
}
```

### 7.5 写测试

MCP Server 本质上是一个异步函数集合，完全可以做单元测试：

```python
import pytest
from server import get_weather

@pytest.mark.asyncio
async def test_get_weather_beijing():
    result = await get_weather("北京")
    assert "32" in result
    assert "°C" in result

@pytest.mark.asyncio
async def test_get_weather_unknown_city():
    result = await get_weather("火星")
    assert "未找到" in result
```

工具逻辑与 MCP 协议层解耦后，测试就和普通 Python 函数一样简单。

## 8. 结语

MCP 正在成为 AI 应用开发的基础设施——就像 HTTP 之于 Web，SQL 之于数据库。掌握 MCP Server 的开发能力，意味着你可以让 AI 真正「动手做事」——不管是查天气、读文档，还是操控公司内部的业务系统。

顺着本文的思路，你从今天开始就能构建自己的 MCP Server。建议先从一个简单的工具入手（比如获取 Git 提交记录、查询 Jira Issue），逐步扩展到更复杂的场景。

---

**参考来源**
- [Model Context Protocol 官方文档](https://modelcontextprotocol.io/)
- [MCP Python SDK - GitHub](https://github.com/modelcontextprotocol/python-sdk)
- [Claude Code MCP 集成指南](https://docs.anthropic.com/en/docs/claude-code/mcp)
- [Anthropic MCP 介绍博文](https://www.anthropic.com/news/model-context-protocol)
