---
title: 'Running Local LLMs: Building Ollama + Open WebUI from Scratch'
published: 2026-09-17
description: Run your own ChatGPT on your own machine, covering Ollama installation, Modelfile customization, the Open WebUI graphical interface, and a RAG knowledge base, with complete configuration and a list of pitfalls.
image: ''
tags: [Ollama, Local LLM, Open WebUI, LLM]
category: 'AI'
draft: false
---
Cloud APIs are convenient, but there are always moments when you want a model that "runs on your own machine": when handling internal company documents and you don't want to send data out, when you want to keep writing code on a plane, or when you just want to tinker around without the anxiety of a token bill. Ollama makes this simpler than you'd imagine—it wraps a layer of model management and inference serving on top of llama.cpp, compressing the whole "download, quantize, load, expose API" workflow into a few commands.

This article builds a local large model environment from scratch: Ollama as the inference backend, Open WebUI as the graphical frontend, and finally hooking up documents to make a private knowledge base.

## 1. Install Ollama

One line on macOS and Linux:

```bash
curl -fsSL https://ollama.com/install.sh | sh

# 验证
ollama --version
```

On Windows, use PowerShell:

```powershell
irm https://ollama.com/install.ps1 | iex
```

macOS users can also use Homebrew: `brew install ollama`.

The install script also registers Ollama as a background service (systemd on Linux, launchd on macOS), so after installation the API is already listening on `http://localhost:11434`. If `ollama serve` reports `address already in use`, don't panic—that just means the service was already running.

### Pick a model

The first run will pull down the model weights, so don't go straight for 70B. Estimate by VRAM/RAM:

| Parameter count | Approximate memory usage | Suitable scenarios |
| --- | --- | --- |
| 3B | ~2 GB | Old laptops, Raspberry Pi, quick experiments |
| 7–8B | ~5 GB | The main range for everyday Q&A and code completion |
| 13B | ~8 GB | When you need stronger reasoning and have enough VRAM |
| 34B | ~20 GB | The sweet spot for 24G GPUs |
| 70B | ~40 GB | Dual-GPU or large-memory workstations |

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

By default, models automatically unload after about 5 minutes idle. If you want them to stay resident (saving the few seconds of cold start from reloading each time), set an environment variable:

```bash
export OLLAMA_KEEP_ALIVE=30m
```

## 2. Customize your own model with a Modelfile

A Modelfile is to a model what a Dockerfile is to a container—it bakes in "the parameters you'd otherwise have to pass repeatedly on every call." This is Ollama's most underrated feature.

Create a `Modelfile`:

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

Then build and run:

```bash
ollama create code-reviewer -f ./Modelfile
ollama run code-reviewer
```

Want to modify an existing model? `ollama show --modelfile <model>` can print out its full recipe; change a few lines and then `create`.

Two parameters are worth expanding on:

- **`num_ctx`**: Ollama's default context window is relatively conservative (commonly 2048 by default). When doing RAG or throwing long documents in, you must increase it, otherwise the excess will be silently truncated—this is the number one reason for "the document clearly contains this passage, but the model says it doesn't know." The cost is VRAM and speed.
- **Quantization level**: The `q4_K_M` in the model name is the default recommended quantization tier, roughly 4 times smaller than FP16, with very little quality loss on most tasks. When VRAM is tight, drop to `q4_0`; if you're chasing quality, you can go up to `q8_0`.

## 3. Use it like OpenAI

Besides the native API (`/api/generate`, `/api/chat`), Ollama also exposes an OpenAI-compatible interface `http://localhost:11434/v1`. This means LangChain, LlamaIndex, various Agent frameworks, and IDE plugins often only need a single `base_url` changed.

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

If you don't want to install an SDK, the native interface is more direct with curl:

```bash
curl http://localhost:11434/api/chat -d '{
  "model": "llama3.1:8b",
  "messages": [{"role": "user", "content": "你好"}],
  "stream": false
}'
```

Setting `stream` to `false` returns the complete result in one go; streaming is NDJSON, one JSON object per line. Use non-streaming when debugging, and streaming in production to improve perceived responsiveness.

## 4. Install the graphical interface Open WebUI

The command line is enough to get by, but an interface with chat history, multiple sessions, and document upload is a much better experience. Open WebUI is a self-hosted ChatGPT-style frontend with all data kept locally.

```bash
docker run -d -p 3000:8080 \
  --add-host=host.docker.internal:host-gateway \
  -v open-webui:/app/backend/data \
  --name open-webui --restart always \
  ghcr.io/open-webui/open-webui:main
```

A few parameters explained:

- `-p 3000:8080`: Listens on 8080 inside the container, mapped to port 3000 on the host, so you access `http://localhost:3000`.
- `-v open-webui:/app/backend/data`: Persists chat history, accounts, and settings to a named volume. **Without this, all data is gone once the container is deleted.**
- `--add-host=host.docker.internal:host-gateway`: Lets the container access Ollama on the host. Ollama is installed on the host rather than in the container because this way you can reuse the existing GPU drivers and model cache, avoiding re-downloading tens of GB.

If you have an NVIDIA GPU, add `docker run` to `--gpus all`, and switch the image name to the `:cuda` tag.

After startup, open `http://localhost:3000`. **The first registered account automatically becomes the administrator**, then:

1. Avatar in the top right → **Admin Panel** → **Settings** → **External Connections**
2. Fill in the Ollama API address as `http://host.docker.internal:11434`
3. Click **Verify Connection**; if you see a green checkmark, you're done

If the connection fails, first confirm that `curl http://localhost:11434` returns "Ollama is running." If the list in the UI is empty, it's usually because no models have been pulled yet.

### Privacy reminder

`docker run -p 3000:8080` means anyone on the same LAN can access your interface. Don't just change the binding to `0.0.0.0` and call it done; the proper approach is to put Nginx/Caddy in front for TLS and authentication. Likewise, never set `OLLAMA_HOST=0.0.0.0` without reverse proxy protection—that's equivalent to exposing your model API naked to the public internet.

## 5. Turn it into a private knowledge base (RAG)

Open WebUI has a built-in RAG engine, so no extra code is needed.

First install an embedding model, used to convert document chunks into vectors:

```bash
ollama pull nomic-embed-text
# 中文文档效果更好可以选择 bge-m3
ollama pull bge-m3
```

Then in **Admin Panel → Settings → Documents**, set **Semantic Vector Model Engine** to **Ollama**, choose `bge-m3` as the Embedding model, and save.

Two ways to use it:

- **Ask documents temporarily**: In the chat input box, click the paperclip icon to upload a PDF/Word/TXT, and subsequent questions will automatically include the context of this document. The first upload will be slower because the embedding model has to be loaded on the spot.
- **Long-term knowledge base**: **Workspace → Knowledge → +** to create a new knowledge base, and upload files in batches. After that, typing `#` in chat will attach the entire knowledge base to the current conversation.

Once the volume of documents grows large, the default vector storage becomes a bottleneck. You can migrate vector retrieval to a dedicated vector database like Qdrant; Open WebUI supports switching via environment variables.

## Pitfall checklist

A few problems I actually ran into during setup:

**1. Irrelevant answers / claiming content isn't in the document.** First check `num_ctx`. The default context often can't fit the chunks that RAG stuffs in, and the excess is silently discarded; the symptom is "I clearly uploaded it, but it says it doesn't know." Set it to 8192 or 16384 and try again.

**2. Running out of RAM rather than VRAM.** When VRAM is insufficient, Ollama automatically puts some layers on the CPU, and the result isn't an error but extreme slowness. Check with `ollama ps`; if the PROCESSOR column shows `CPU/GPU` mixed, that's the situation. Use a smaller model or lower the quantization tier.

**3. Slow model loading.** The few seconds of lag before each conversation is cold start. Set `OLLAMA_KEEP_ALIVE=30m` to keep commonly used models resident.

**4. It can only run GGUF.** Ollama is built on llama.cpp and only accepts the GGUF format. safetensors models on HuggingFace need to be converted first, or you should just switch to an inference framework like vLLM.

**5. It's a single-user tool, don't treat it as a production service.** Ollama has no concurrent scheduling or queue management; if several people use it at the same time, they'll queue behind each other. If you really need a multi-user production-grade deployment, vLLM or TGI is a more suitable choice.
## Conclusion

The value of local large models isn't in "free replacement for GPT-4"—the reasoning ability of 7B models is indeed still far behind. Their value lies in **controllability**: data never leaves the machine, no network dependency, no pay-per-use billing, you can freely tweak the system prompt, and you can keep using it on the subway with no signal. For scenarios involving sensitive data, or if you just want to understand what LLMs are really about at low cost, this combo offers great value for money.

From `curl` one-line installation to chatting your first sentence in the browser, ten minutes is enough if you're proficient. The rest of the time, spend it on tuning `num_ctx` and picking models—that's where the real fun of local deployment lies.

## References

- Ollama official documentation and API reference: https://github.com/ollama/ollama/blob/main/docs/api.md
- Ollama OpenAI-compatible API documentation: https://github.com/ollama/ollama/blob/main/docs/openai.md
- Open WebUI official documentation: https://docs.openwebui.com/
- Ollama model library: https://ollama.com/library
- llama.cpp project homepage: https://github.com/ggml-org/llama.cpp