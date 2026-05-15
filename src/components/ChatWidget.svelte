<script lang="ts">
  import { onMount } from 'svelte';
  import Icon from '@iconify/svelte';

  interface Message {
    role: 'user' | 'assistant';
    content: string;
  }

  
  const PROXY_URL = 'https://ai-api.hehonglei.com/';

  let isOpen = $state(false);
  let messages = $state<Message[]>([]);
  let inputText = $state('');
  let isLoading = $state(false);
  let error = $state<string | null>(null);
  let abortController: AbortController | null = null;

  // Text selection context
  let selectedText = $state('');
  let showSelectionPopup = $state(false);
  let popupPos = $state({ x: 0, y: 0 });
  const MAX_SELECTION_LENGTH = 8000;

  let chatPanel: HTMLDivElement;
  let msgList: HTMLDivElement;
  let inputEl: HTMLTextAreaElement;

  function scrollToBottom() {
    requestAnimationFrame(() => {
      if (msgList) {
        msgList.scrollTop = msgList.scrollHeight;
      }
    });
  }

  function togglePanel() {
    isOpen = !isOpen;
    if (isOpen) {
      error = null;
      requestAnimationFrame(() => inputEl?.focus());
    }
  }

  function stopStreaming() {
    abortController?.abort();
    abortController = null;
    isLoading = false;
  }

  async function sendMessage() {
    const text = inputText.trim();
    if (!text || isLoading) return;

    let finalContent = text;
    if (selectedText) {
      const truncated = selectedText.length > MAX_SELECTION_LENGTH
        ? selectedText.slice(0, MAX_SELECTION_LENGTH) + '...'
        : selectedText;
      const extra = text.startsWith(selectedText) ? text.slice(selectedText.length).trim() : text;
      if (extra) {
        finalContent = `用户选取了以下文字：\n\n"""\n${truncated}\n"""\n\n问题：${extra}`;
      } else {
        finalContent = `用户选取了以下文字：\n\n"""\n${truncated}\n"""`;
      }
      selectedText = '';
      showSelectionPopup = false;
    }

    const userMessage: Message = { role: 'user', content: finalContent };
    messages = [...messages, userMessage];
    inputText = '';
    isLoading = true;
    error = null;
    scrollToBottom();

    const assistantMessage: Message = { role: 'assistant', content: '' };
    messages = [...messages, assistantMessage];

    const controller = new AbortController();
    abortController = controller;

    try {
      const apiMessages = messages
        .slice(0, -1)
        .map(m => ({ role: m.role, content: m.content }));

      const response = await fetch(PROXY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') continue;
            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta?.content;
              if (delta) {
                assistantMessage.content += delta;
                messages = [...messages.slice(0, -1), { ...assistantMessage }];
                scrollToBottom();
              }
            } catch {
              // skip unparseable chunks
            }
          }
        }
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        error = '请求失败，请稍后重试';
        if (assistantMessage.content === '') {
          messages = messages.slice(0, -1);
        }
      }
    } finally {
      isLoading = false;
      abortController = null;
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function handleInput() {
    inputEl.style.height = 'auto';
    inputEl.style.height = Math.min(inputEl.scrollHeight, 120) + 'px';
  }

  function closePanel() {
    isOpen = false;
  }

  function handleMouseUp(_e: MouseEvent) {
    setTimeout(() => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) {
        showSelectionPopup = false;
        return;
      }

      const text = selection.toString().trim();
      if (!text || text.length < 2) {
        showSelectionPopup = false;
        return;
      }

      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        if (chatPanel?.contains(range.commonAncestorContainer)) {
          return;
        }
      }

      selectedText = text;

      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const popupHeight = 36;
      let top = rect.bottom + 6;
      if (top + popupHeight > window.innerHeight - 10) {
        top = rect.top - popupHeight - 6;
      }
      popupPos = {
        x: Math.max(16, Math.min(rect.left + rect.width / 2, window.innerWidth - 16)),
        y: Math.max(4, top),
      };
      showSelectionPopup = true;
    }, 10);
  }

  function handleSelectionClick() {
    isOpen = true;
    error = null;
    showSelectionPopup = false;
    inputText = selectedText;
    requestAnimationFrame(() => {
      inputEl?.focus();
      inputEl?.setSelectionRange(inputEl.value.length, inputEl.value.length);
      handleInput();
    });
  }

  function dismissSelectionPopup() {
    showSelectionPopup = false;
    selectedText = '';
    window.getSelection()?.removeAllRanges();
  }

  onMount(() => {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (isOpen) {
          closePanel();
        } else if (showSelectionPopup) {
          dismissSelectionPopup();
        }
      }
    });

    document.addEventListener('mouseup', handleMouseUp);
  });

  $effect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  });
</script>

<!-- Selection popup -->
{#if showSelectionPopup}
  <button
    onclick={handleSelectionClick}
    class="fixed z-[99] px-3 py-1.5 rounded-full shadow-lg
           bg-[var(--primary)] text-white text-sm
           flex items-center gap-1.5
           hover:shadow-xl active:scale-95 transition-all"
    style="top: {popupPos.y}px; left: {popupPos.x}px; transform: translateX(-50%);"
  >
    <Icon icon="material-symbols:smart-toy-outline" class="text-base" />
    <span>问 AI</span>
  </button>
{/if}

<!-- Floating button -->
<button
  onclick={togglePanel}
  aria-label="AI 助手"
  class="fixed bottom-6 right-6 z-[100] w-12 h-12 rounded-full
         btn-regular shadow-lg !rounded-full active:scale-90"
  class:!bg-[var(--primary)]={isOpen}
  class:!text-white={isOpen}
>
  <Icon
    icon={isOpen ? 'material-symbols:close' : 'material-symbols:smart-toy-outline'}
    class="text-[1.375rem]"
  />
</button>

<!-- Chat panel -->
{#if isOpen}
  <div
    bind:this={chatPanel}
    class="fixed bottom-20 right-6 z-[100] w-[360px] max-w-[calc(100vw-2rem)]
           h-[500px] max-h-[calc(100vh-8rem)]
           card-base shadow-xl rounded-2xl flex flex-col"
    role="dialog"
    aria-label="AI 对话"
  >
    <!-- Header -->
    <div class="flex items-center justify-between px-4 py-3 border-b
                border-black/[0.06] dark:border-white/[0.08] shrink-0">
      <div class="flex items-center gap-2">
        <Icon icon="material-symbols:smart-toy-outline" class="text-lg text-[var(--primary)]" />
        <span class="font-medium text-sm text-[var(--deep-text)]">AI 助手</span>
      </div>
      <button onclick={closePanel} class="btn-plain w-8 h-8 rounded-lg">
        <Icon icon="material-symbols:close" class="text-lg" />
      </button>
    </div>

    <!-- Messages -->
    <div
      bind:this={msgList}
      class="flex-1 overflow-y-auto px-4 py-3 space-y-3"
    >
      {#if messages.length === 0}
        <div class="flex flex-col items-center justify-center h-full
                    text-[var(--shallow-text)] text-sm gap-2">
          <Icon icon="material-symbols:smart-toy-outline" class="text-3xl opacity-40" />
          <p>有什么可以帮你的？</p>
        </div>
      {/if}

      {#each messages as msg}
        {#if msg.role === 'user'}
          <div class="flex justify-end">
            <div class="max-w-[85%] px-3.5 py-2 rounded-2xl rounded-br-md
                        bg-[var(--primary)] text-white text-sm leading-relaxed
                        break-words whitespace-pre-wrap">
              {msg.content}
            </div>
          </div>
        {:else}
          <div class="flex justify-start">
            <div class="max-w-[85%] px-3.5 py-2 rounded-2xl rounded-bl-md
                        bg-[var(--btn-regular-bg)] text-[var(--deep-text)] text-sm
                        leading-relaxed break-words whitespace-pre-wrap
                        dark:text-white/85">
              {#if msg.content}
                {msg.content}
              {:else if isLoading}
                <span class="flex gap-1 py-1">
                  <span class="w-1.5 h-1.5 rounded-full bg-[var(--primary)] animate-bounce" style="animation-delay: 0ms"></span>
                  <span class="w-1.5 h-1.5 rounded-full bg-[var(--primary)] animate-bounce" style="animation-delay: 150ms"></span>
                  <span class="w-1.5 h-1.5 rounded-full bg-[var(--primary)] animate-bounce" style="animation-delay: 300ms"></span>
                </span>
              {/if}
            </div>
          </div>
        {/if}
      {/each}

      {#if error}
        <div class="flex justify-center">
          <span class="text-xs text-red-500 dark:text-red-400">{error}</span>
        </div>
      {/if}
    </div>

    <!-- Input -->
    <div class="shrink-0 px-3 py-2.5 border-t border-black/[0.06] dark:border-white/[0.08]">
      <div class="flex items-end gap-2">
        <textarea
          bind:this={inputEl}
          bind:value={inputText}
          onkeydown={handleKeydown}
          oninput={handleInput}
          rows="1"
          placeholder="输入问题..."
          disabled={isLoading}
          class="flex-1 resize-none rounded-xl px-3 py-2 text-sm
                 bg-black/[0.04] dark:bg-white/5
                 text-[var(--deep-text)] dark:text-white/85
                 placeholder:text-black/30 dark:placeholder:text-white/25
                 outline-none max-h-[120px]"
        />
        {#if isLoading}
          <button
            onclick={stopStreaming}
            class="btn-regular w-9 h-9 rounded-xl shrink-0 !bg-red-500 !text-white"
            aria-label="停止"
          >
            <Icon icon="material-symbols:stop" class="text-lg" />
          </button>
        {:else}
          <button
            onclick={sendMessage}
            disabled={!inputText.trim()}
            class="btn-regular w-9 h-9 rounded-xl shrink-0 disabled:opacity-40"
            class:!bg-[var(--primary)]={!!inputText.trim()}
            class:!text-white={!!inputText.trim()}
            aria-label="发送"
          >
            <Icon icon="material-symbols:arrow-upward" class="text-lg" />
          </button>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  @tailwind components;
  @layer components {
    /* auto-size textarea */
    textarea {
      field-sizing: content;
    }
  }
</style>
