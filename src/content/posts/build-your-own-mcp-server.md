---
title: 'Build Your Own MCP Server: A Practical Guide from Zero to One'
published: 2026-08-06
description: A step-by-step guide to building an MCP Server in Python, enabling Claude and other LLMs to call your custom tools and data sources through a standard protocol.
image: ''
tags: [MCP, AI, LLM, Python, Tool Development]
category: 'AI'
draft: false
---
## 1. Introduction

MCP (Model Context Protocol) is a standard protocol open-sourced by Anthropic at the end of 2024, designed to enable large language models (LLMs) to access external tools and data sources in a unified way. If the LLM is the brain, MCP is the nervous system—it gives the model the ability to "do things," not just "talk."

In 2026, the MCP ecosystem has matured considerably: mainstream AI tools like Claude Desktop, Claude Code, Cursor, and Continue all have built-in MCP support. But more importantly, **you can write your own MCP Server**—exposing your company's internal APIs, database queries, document retrieval, or even smart home control capabilities to AI in a standardized way.

This article will take you from zero to building a complete MCP Server in Python.

## 2. MCP Architecture at a Glance

Before diving in, let's understand the core architecture of MCP:

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

An MCP Server provides three primitives:
- **Tools**: Functions the model can call, similar to OpenAI Function Calling
- **Resources**: Read-only data the model can read, similar to REST API GET endpoints
- **Prompts**: Predefined prompt templates that help users get started quickly

There are two communication methods:
- **stdio**: Via standard input/output, suitable for local inter-process communication
- **SSE (Server-Sent Events)**: Via HTTP, suitable for remote services

This article will use stdio mode, which is the most common and simplest integration method.

## 3. Environment Setup

### 3.1 Installing Dependencies

```bash
mkdir my-mcp-server && cd my-mcp-server
python3 -m venv venv
source venv/bin/activate
pip install mcp
```

The only core dependency you need is one package: `mcp`, the official Python SDK provided by Anthropic.

### 3.2 Project Structure

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

## 4. Writing Your First MCP Server

### 4.1 Minimal Example

Let's start with a minimal MCP Server that exposes just one tool:

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

What this code does:
1. `Server("my-first-mcp-server")` creates an MCP Server instance
2. The `@server.tool()` decorator registers a Python function as an MCP Tool
3. The function docstring `"""获取当前系统时间"""` automatically becomes the tool description—**writing a good docstring is crucial**, because the LLM uses it to decide when to call this tool
4. `stdio_server()` communicates with the client via standard input/output

### 4.2 Configuring Claude Desktop

To make Claude Desktop recognize your MCP Server, edit the Claude Desktop configuration file:

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

After restarting Claude Desktop, click the 🔌 icon next to the input box, and you'll see the `get_current_time` tool is now available.

### 4.3 Using in Claude Code

Claude Code's configuration is even simpler—just edit the `.mcp.json` in the project root directory:

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

Once configured, Claude Code will automatically connect to your MCP Server on startup.
## 5. Hands-On: Building a Weather Query MCP Server

Now let's look at a more realistic example—building an MCP Server that supports weather queries for multiple cities.

### 5.1 Complete Code

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

### 5.2 Key Design Points

**1. Type Annotations Determine the Parameter Schema**

The MCP Python SDK automatically extracts the parameter schema from the function signature. `city: str` → string parameter, `unit: Optional[str] = "celsius"` → optional string parameter with a default value. No need to hand-write JSON Schema—but only if the type annotations are accurate.

**2. Docstrings Are Prompt Engineering**

A tool's docstring is sent directly to the LLM as the basis for it to decide "when to call this tool." Following the Google style (Args/Returns) keeps descriptions structured and clear.

**3. Return Values Are Plain Text**

An MCP Tool's return value is of type `str`. You can use emoji, formatted text, or even Markdown in the return value—the LLM will display it to the user as-is. This makes the output both informative and readable.

## 6. Advanced: Adding Resources

Besides callable Tools, an MCP Server can also expose Resources—read-only data that the model can proactively read:

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

Once configured, when Claude needs to read the project README, it will automatically call the `docs://readme` resource. Note that `{endpoint}` in `docs://api/{endpoint}` is a **path parameter**—MCP will extract it and pass it into the function.
## 7. Best Practices

Through building the above examples, I've summarized five best practices for MCP Server development:

### 7.1 One Server, One Responsibility

Don't cram weather queries, database operations, and file management all into one Server. Keep each MCP Server focused on a single responsibility——

```json
{
  "mcpServers": {
    "weather": { "command": "python3", "args": ["servers/weather.py"] },
    "database": { "command": "python3", "args": ["servers/database.py"] },
    "filesystem": { "command": "npx", "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path"] }
  }
}
```

This makes it easier to pinpoint issues when they arise, and easier to reuse.

### 7.2 Handle Errors Well

The LLM may pass strange parameters when calling tools. Do proper boundary checks:

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

### 7.3 Tool Descriptions Should Be Specific

Compare the following two types of descriptions:

| ❌ Bad description | ✅ Good description |
|------------|------------|
| "Query data" | "Execute a SELECT query on a MySQL read replica. Supports standard SQL syntax, returns the first 100 rows." |
| "Get weather" | "Query real-time weather for a specified city, including temperature (°C/°F), humidity, and weather conditions. See the parameter description for the list of supported cities." |

Detailed descriptions help the LLM accurately determine when to call your tool—this directly determines the user experience.

### 7.4 Use Environment Variables to Manage Sensitive Information

```python
import os

@server.tool()
async def search_knowledge_base(query: str) -> str:
    """搜索公司内部知识库"""
    api_key = os.environ["KB_API_KEY"]
    base_url = os.environ.get("KB_BASE_URL", "https://kb.internal.example.com")
    # ... 调用 API
```

Inject environment variables in `.mcp.json` to avoid hardcoding:

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

### 7.5 Write Tests

An MCP Server is essentially a collection of async functions, so it can absolutely be unit tested:

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

Once the tool logic is decoupled from the MCP protocol layer, testing becomes as simple as testing ordinary Python functions.

## 8. Conclusion

MCP is becoming the infrastructure for AI application development—just as HTTP is to the Web, and SQL is to databases. Mastering MCP Server development means you can make AI truly "get things done"—whether it's checking the weather, reading documents, or operating a company's internal business systems.

Following the approach in this article, you can start building your own MCP Server today. It's recommended to start with a simple tool (such as fetching Git commit records or querying Jira Issues), then gradually expand to more complex scenarios.

---

**References**
- [Model Context Protocol Official Documentation](https://modelcontextprotocol.io/)
- [MCP Python SDK - GitHub](https://github.com/modelcontextprotocol/python-sdk)
- [Claude Code MCP Integration Guide](https://docs.anthropic.com/en/docs/claude-code/mcp)
- [Anthropic MCP Introduction Blog Post](https://www.anthropic.com/news/model-context-protocol)