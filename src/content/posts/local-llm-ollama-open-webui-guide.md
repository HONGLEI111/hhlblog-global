---
title: 本地大模型运行指南：Ollama + Open WebUI 从零搭建
published: 2026-09-17
description: '在自己的机器上跑起一个 ChatGPT，从 Ollama 安装、Modelfile 定制到 Open WebUI 图形界面与 RAG 知识库，附完整配置与踩坑清单'
image: ''
tags: [Ollama, 本地大模型, Open WebUI, LLM]
category: 'AI'
draft: false
lang: ''
---

云端 API 很方便，但总有些时刻你会想要一个「跑在自己机器上」的模型：处理公司内部文档时不想把数据发出去、飞机上想继续写代码、或者只是想在没有 token 账单焦虑的前提下随便折腾。Ollama 让这件事变得比想象中简单——它在 llama.cpp 之上包了一层模型管理和推理服务，把「下载、量化、加载、暴露 API」这套流程压缩成了几条命令。

这篇文章从零开始，把本地大模型环境搭起来：Ollama 做推理后端，Open WebUI 做图形前端，最后接上文档做成一个私有知识库。

## 第一步：安装 Ollama

macOS 和 Linux 一行搞定：

```bash
curl -fsSL https://ollama.com/install.sh | sh

# 验证
ollama --version
```

Windows 用 PowerShell：

```powershell
irm https://ollama.com/install.ps1 | iex
```

macOS 用户也可以用 Homebrew：`brew install ollama`。

安装脚本会顺带把 Ollama 注册成后台服务（Linux 上是 systemd，macOS 是 launchd），所以装完之后 API 已经在 `http://localhost:11434` 监听了。如果 `ollama serve` 报 `address already in use`，不用慌——那说明服务本来就在跑。

### 挑一个模型

第一次跑会先把模型权重拉下来，所以别一上来就冲 70B。按显存/内存估算：

| 参数量 | 大致内存占用 | 适合场景 |
| --- | --- | --- |
| 3B | ~2 GB | 老笔记本、树莓派、快速试验 |
| 7–8B | ~5 GB | 日常问答、代码补全的主力区间 |
| 13B | ~8 GB | 需要更强推理，显存尚可 |
| 34B | ~20 GB | 24G 显卡的甜点 |
| 70B | ~40 GB | 双卡或大内存工作站 |

```bash
# 拉取并进入交互式 REPL
ollama run llama3.1:8b

# 常用管理命令
ollama list          # 已下载的模型
ollama ps            # 当前加载进显存/内存的模型
ollama show llama3.1:8b
ollama stop llama3.1:8b   # 手动卸载，释放显存
ollama rm llama3.1:8b
```

模型默认空闲约 5 分钟后自动卸载。想让它常驻（省掉每次重新加载的几秒冷启动），设环境变量：

```bash
export OLLAMA_KEEP_ALIVE=30m
```

## 第二步：用 Modelfile 定制自己的模型

Modelfile 之于模型，就像 Dockerfile 之于容器——把「每次调用都要重复传的参数」固化下来。这是 Ollama 最被低估的功能。

创建一个 `Modelfile`：

```dockerfile
FROM qwen2.5:7b

# 采样参数
PARAMETER temperature 0.3
PARAMETER num_ctx 8192
PARAMETER top_p 0.9

# 系统提示词，决定模型的默认人格
SYSTEM """你是一位严谨的代码审查助手。
你会指出问题所在，并给出可直接替换的修改建议。
不要赘述显而易见的正确代码。"""
```

然后构建并运行：

```bash
ollama create code-reviewer -f ./Modelfile
ollama run code-reviewer
```

想基于已有模型改造？`ollama show --modelfile <model>` 能打印出它的完整配方，改几行再 `create` 就行。

关于两个参数值得展开说一下：

- **`num_ctx`**：Ollama 的默认上下文窗口相对保守（常见默认 2048），做 RAG 或者丢长文档进去时一定要调大，否则超出部分会被静默截断——这是「明明文档里有这段话，模型却说不知道」的头号原因。代价是显存和速度。
- **量化等级**：模型名里的 `q4_K_M` 是默认推荐的量化档位，相比 FP16 大约小 4 倍，在多数任务上质量损失很小。显存紧张时降到 `q4_0`，追求质量可以上 `q8_0`。

## 第三步：把它当成 OpenAI 用

除了原生 API（`/api/generate`、`/api/chat`），Ollama 还暴露了一套 OpenAI 兼容接口 `http://localhost:11434/v1`。这意味着 LangChain、LlamaIndex、各种 Agent 框架、IDE 插件，往往只需要改一个 `base_url`。

```python
from openai import OpenAI

client = OpenAI(base_url="http://localhost:11434/v1", api_key="ollama")
# api_key 是客户端库强制要求的必填项，但 Ollama 会忽略它的值

resp = client.chat.completions.create(
    model="llama3.1:8b",
    messages=[{"role": "user", "content": "用一句话解释什么是量化"}],
    temperature=0.3,
)
print(resp.choices[0].message.content)
```

不装 SDK 的话，原生接口用 curl 更直接：

```bash
curl http://localhost:11434/api/chat -d '{
  "model": "llama3.1:8b",
  "messages": [{"role": "user", "content": "你好"}],
  "stream": false
}'
```

把 `stream` 设为 `false` 会一次性返回完整结果；流式则是 NDJSON，每行一个 JSON 对象。调试时用非流式，生产里用流式提升体感。

## 第四步：装上图形界面 Open WebUI

命令行够用，但一个带聊天记录、多会话、文档上传的界面体验好得多。Open WebUI 是自托管的 ChatGPT 风格前端，数据全在本地。

```bash
docker run -d -p 3000:8080 \
  --add-host=host.docker.internal:host-gateway \
  -v open-webui:/app/backend/data \
  --name open-webui --restart always \
  ghcr.io/open-webui/open-webui:main
```

几个参数解释一下：

- `-p 3000:8080`：容器内监听 8080，映射到宿主机的 3000，所以访问 `http://localhost:3000`。
- `-v open-webui:/app/backend/data`：把聊天记录、账号、设置持久化到命名卷。**不加这个，容器一删数据全没。**
- `--add-host=host.docker.internal:host-gateway`：让容器能访问宿主机上的 Ollama。Ollama 装在宿主机而不是容器里，是因为这样可以复用已有的 GPU 驱动和模型缓存，避免重复下载几十 GB。

有 NVIDIA 显卡就给 `docker run` 加上 `--gpus all`，镜像名换成 `:cuda` 标签。

启动后打开 `http://localhost:3000`，**第一个注册的账号自动成为管理员**，然后：

1. 右上角头像 → **Admin Panel** → **Settings** → **External Connections**
2. Ollama API 地址填 `http://host.docker.internal:11434`
3. 点 **Verify Connection**，看到绿色对勾就成了

如果连接失败，先确认 `curl http://localhost:11434` 能返回 "Ollama is running"。若 UI 里列表是空的，通常是还没 pull 任何模型。

### 隐私提醒

`docker run -p 3000:8080` 意味着同局域网的任何人都能访问你的界面。不要直接改绑定到 `0.0.0.0` 就完事，正经做法是在前面挂一层 Nginx/Caddy 做 TLS 和认证。同理，`OLLAMA_HOST=0.0.0.0` 在没有反代保护的情况下绝不要设——那等于把你的模型 API 裸奔到公网。

## 第五步：做成私有知识库（RAG）

Open WebUI 内置了 RAG 引擎，不需要额外写代码。

先装一个嵌入模型，用于把文档切块后转成向量：

```bash
ollama pull nomic-embed-text
# 中文文档效果更好可以选择 bge-m3
ollama pull bge-m3
```

然后在 **Admin Panel → Settings → Documents** 里，把 **Semantic Vector Model Engine** 设为 **Ollama**，Embedding 模型选 `bge-m3`，保存。

两种用法：

- **临时问文档**：在聊天输入框点回形针图标上传 PDF/Word/TXT，之后的问题会自动带上这份文档的上下文。第一次上传会慢一些，因为要现加载嵌入模型。
- **长期知识库**：**Workspace → Knowledge → +** 新建知识库，批量上传文件。之后在聊天里输入 `#` 就能把整个知识库挂进当前对话。

文档量大了之后，默认的向量存储会成为瓶颈，可以把向量检索迁到 Qdrant 这类专用向量库，Open WebUI 支持通过环境变量切换。

## 踩坑清单

几个我在搭建过程中真实撞过的问题：

**1. 答非所问 / 说文档里没有的内容。** 先查 `num_ctx`。默认上下文常常装不下 RAG 塞进去的 chunk，超出部分被静默丢弃，症状就是「明明上传了却说不知道」。把它调到 8192 或 16384 再试。

**2. 内存爆掉而不是显存爆掉。** 显存不够时 Ollama 会自动把部分层放到 CPU 上跑，结果不是报错而是变得极慢。用 `ollama ps` 看，如果 PROCESSOR 那列是 `CPU/GPU` 混合，就是这个情况。调小模型或调低量化档位。

**3. 模型加载慢。** 每次对话前几秒的卡顿是冷启动。设 `OLLAMA_KEEP_ALIVE=30m` 让常用模型常驻。

**4. 只能跑 GGUF。** Ollama 底层是 llama.cpp，只吃 GGUF 格式。HuggingFace 上的 safetensors 模型需要先转换，或者干脆换 vLLM 这类推理框架。

**5. 单用户工具，别当生产服务。** Ollama 没有并发调度和队列管理，几个人同时用就会互相排队。真要做多用户的生产级部署，vLLM 或 TGI 是更合适的选择。

## 结语

本地大模型的价值不在于「免费替代 GPT-4」——7B 模型的推理能力确实还差得远。它的价值在于**可控**：数据不出机器、没有网络依赖、没有按量计费、可以随意微调系统提示词、可以在断网的地铁上继续用。对涉及敏感数据的场景，或者只是想低成本理解 LLM 到底是怎么回事，这套组合拳的性价比很高。

从 `curl` 一行安装到浏览器里聊上第一句，熟练的话十分钟够了。剩下的时间，就花在调 `num_ctx` 和挑模型上吧——那才是本地部署真正的乐趣所在。

## 参考来源

- Ollama 官方文档与 API 参考：https://github.com/ollama/ollama/blob/main/docs/api.md
- Ollama OpenAI 兼容接口说明：https://github.com/ollama/ollama/blob/main/docs/openai.md
- Open WebUI 官方文档：https://docs.openwebui.com/
- Ollama 模型库：https://ollama.com/library
- llama.cpp 项目主页：https://github.com/ggml-org/llama.cpp
