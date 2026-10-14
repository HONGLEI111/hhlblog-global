<script lang="ts">
import Icon from "@components/common/Icon.svelte";
import {
	buildWorkspace,
	type ChatMessage,
	EMPTY_HITS,
	HISTORY_MAX_CHARS,
	HISTORY_MAX_MESSAGES,
	type QueryHits,
	queryHits,
	queryTerms,
	trimHistory,
	waitForReady,
} from "@utils/chat-context.ts";
import { renderMarkdown } from "@utils/chat-markdown.ts";
import sanitizeHtml from "sanitize-html";
import { onMount } from "svelte";
import type { SearchResult } from "@/global";

interface UiMessage extends ChatMessage {
	relatedArticles?: SearchResult[];
	/** Set when the reader pressed stop before the reply finished. */
	interrupted?: boolean;
}

const PROXY_URL = "https://ai-api.hehonglei.com/";

/**
 * The rendered article root. Identical selector to the one pagefind indexes, so
 * "what the AI may read" and "what the search index knows" cannot drift apart:
 * pages without it (home, archive, tag lists) simply get no article context.
 */
const ARTICLE_BODY_SELECTOR = ".custom-md[data-pagefind-body]";

const MAX_SELECTION_LENGTH = 8000;
const PERSIST_KEY = "ai-chat-history-v1";
const MAX_PERSISTED_MESSAGES = 30;

/** Bumped whenever the payload shape changes, so stale sessions are ignored. */
const PERSIST_VERSION = 1;

interface PersistedState {
	version: number;
	messages: UiMessage[];
}

const GENERIC_SUGGESTIONS = [
	"What is this blog about?",
	"Find me a few posts about RAG",
	"How can I get in touch?",
];

const ARTICLE_SUGGESTIONS = [
	"Summarize this article in a few sentences",
	"What is the key takeaway of this article?",
	"Can you explain the example in the article again?",
];

let isOpen = $state(false);
let messages = $state<UiMessage[]>([]);
let inputText = $state("");
let isLoading = $state(false);
let error = $state<string | null>(null);
let abortController: AbortController | null = null;
let droppedTurns = $state(0);

// Text selection context
let selectedText = $state("");
let showSelectionPopup = $state(false);
let popupPos = $state({ x: 0, y: 0 });

// Article context (the page the reader is currently on)
let articleTitle = $state("");
let hasArticle = $state(false);

// Pagefind state: the search bundle is loaded on demand from the navbar, and is
// unavailable in dev (no index is built).
let pagefindLoaded = $state(false);
let pagefindInit = false;
let pagefindWaiters: Array<() => void> = [];
/** URLs already shown in this conversation, so links are not repeated. */
const shownArticleUrls = new Set<string>();

let chatPanel: HTMLDivElement;
let msgList: HTMLDivElement;
let inputEl: HTMLTextAreaElement;
let restoreFocusEl: HTMLElement | null = null;

function scrollToBottom() {
	requestAnimationFrame(() => {
		if (msgList) {
			msgList.scrollTop = msgList.scrollHeight;
		}
	});
}

/**
 * Ask the navbar to load pagefind and resolve once it is usable. The wait is
 * bounded, so a failed or slow bundle only costs retrieval (grounding), never
 * the answer itself.
 */
function ensurePagefind(): Promise<boolean> {
	// Request the bundle first, then wait for readiness: sampling `pagefindLoaded`
	// before dispatching would check too early on the very first question and the
	// wait would then time out, silently costing every request its grounding.
	if (!pagefindInit) {
		pagefindInit = true;
		if (
			!import.meta.env.DEV &&
			typeof window !== "undefined" &&
			!window.pagefind?.search
		) {
			document.dispatchEvent(new CustomEvent("pagefind:load"));
		}
		document.addEventListener("pagefindready", () => {
			pagefindLoaded = true;
			for (const waiter of pagefindWaiters) waiter();
			pagefindWaiters = [];
		});
	}

	return waitForReady(
		// Test the capability, not a state flag: pagefind may have been loaded by a
		// search before this widget mounted, in which case `pagefindready` has
		// already fired and would never fire again.
		() => pagefindLoaded || typeof window?.pagefind?.search === "function",
		(onReady) => {
			pagefindWaiters.push(onReady);
			return () => {
				pagefindWaiters = pagefindWaiters.filter(
					(waiter) => waiter !== onReady,
				);
			};
		},
	);
}

function currentArticleBody(): Element | null {
	return document.querySelector(ARTICLE_BODY_SELECTOR);
}

/**
 * Refresh which article is "current". Called before every request and after
 * every Swup navigation, since the widget itself lives outside the swapped
 * containers and therefore survives page changes.
 */
function syncArticleContext(): void {
	const titleEl = document.querySelector<HTMLElement>(
		'[data-pagefind-body][data-pagefind-meta="title"]',
	);
	hasArticle = currentArticleBody() !== null;
	articleTitle = hasArticle
		? (titleEl?.textContent ?? document.title).trim()
		: "";
}

/** Article context for this request, or null on pages without an article. */
function currentWorkspace(terms: string[]) {
	if (!hasArticle) return null;
	return buildWorkspace(
		currentArticleBody(),
		articleTitle,
		window.location.href,
		terms,
	);
}

function persistedMessages(): UiMessage[] {
	try {
		const raw = sessionStorage.getItem(PERSIST_KEY);
		if (!raw) return [];
		const parsed = JSON.parse(raw) as PersistedState;
		if (parsed?.version !== PERSIST_VERSION || !Array.isArray(parsed.messages))
			return [];
		return parsed.messages.filter(
			(m): m is UiMessage =>
				!!m &&
				(m.role === "user" || m.role === "assistant") &&
				typeof m.content === "string",
		);
	} catch {
		return [];
	}
}

function clearConversation(): void {
	messages = [];
	droppedTurns = 0;
	error = null;
	shownArticleUrls.clear();
	try {
		sessionStorage.removeItem(PERSIST_KEY);
	} catch {
		// Persistence is best-effort: private mode can throw on write.
	}
}

function copyMessage(content: string): void {
	navigator.clipboard?.writeText(content).catch(() => {});
}

function togglePanel() {
	isOpen = !isOpen;
	if (isOpen) {
		restoreFocusEl = document.activeElement as HTMLElement | null;
		document.dispatchEvent(new CustomEvent("pagefind:load"));
		error = null;
		syncArticleContext();
		requestAnimationFrame(() => inputEl?.focus());
	} else {
		restoreFocusEl?.focus();
		restoreFocusEl = null;
	}
}

function stopStreaming() {
	abortController?.abort();
	abortController = null;
	isLoading = false;
}

/** Keep Tab inside the dialog while it is open. */
function handlePanelKeydown(e: KeyboardEvent) {
	if (e.key !== "Tab" || !chatPanel) return;

	const focusable = Array.from(
		chatPanel.querySelectorAll<HTMLElement>(
			'button:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
		),
	).filter((el) => el.offsetParent !== null || el === inputEl);

	if (focusable.length === 0) return;

	const first = focusable[0];
	const last = focusable[focusable.length - 1];
	const active = document.activeElement;

	if (e.shiftKey && (active === first || !chatPanel.contains(active))) {
		e.preventDefault();
		last.focus();
	} else if (!e.shiftKey && active === last) {
		e.preventDefault();
		first.focus();
	}
}

/** Open links from a rendered reply in a new tab, safely. */
function handlePanelClick(e: MouseEvent) {
	const anchor = (e.target as Element | null)?.closest?.("a[href]");
	if (!(anchor instanceof HTMLAnchorElement)) return;
	if (!/^https?:/i.test(anchor.getAttribute("href") ?? "")) return;
	if (anchor.target) return;
	e.preventDefault();
	window.open(anchor.href, "_blank", "noopener,noreferrer");
}

async function sendMessage(preset?: string) {
	const text = (preset ?? inputText).trim();
	if (!text || isLoading) return;
	document.dispatchEvent(new CustomEvent("pagefind:load"));

	let finalContent = text;
	if (selectedText) {
		const truncated =
			selectedText.length > MAX_SELECTION_LENGTH
				? `${selectedText.slice(0, MAX_SELECTION_LENGTH)}...`
				: selectedText;
		const extra = text.startsWith(selectedText)
			? text.slice(selectedText.length).trim()
			: text;
		if (extra) {
			finalContent = `The user selected the following text:\n\n"""\n${truncated}\n"""\n\nQuestion: ${extra}`;
		} else {
			finalContent = `The user selected the following text:\n\n"""\n${truncated}\n"""`;
		}
		selectedText = "";
		showSelectionPopup = false;
	}

	messages = [...messages, { role: "user", content: finalContent }];
	inputText = "";
	isLoading = true;
	error = null;
	syncArticleContext();
	scrollToBottom();

	// Direct reference: the streaming loop mutates it and re-publishes the list,
	// so related articles can be attached once retrieval resolves.
	const assistantMessage: UiMessage = { role: "assistant", content: "" };
	messages = [...messages, assistantMessage];

	// Retrieval now runs *before* the request, because its snippets are part of
	// the prompt rather than a decorative afterthought. The pagefind bundle is
	// loaded on demand, so wait (bounded) for it: on the very first question it
	// may not have arrived yet, and without it the model cannot answer
	// "site-wide" questions at all.
	const retrieval: Promise<QueryHits> = ensurePagefind()
		.then((ready) => (ready ? queryHits(text) : EMPTY_HITS))
		.catch(() => EMPTY_HITS);

	const controller = new AbortController();
	abortController = controller;

	try {
		const trimmed = trimHistory(
			messages.slice(0, -1).map((m) => ({ role: m.role, content: m.content })),
		);
		droppedTurns = trimmed.dropped;

		const workspace = currentWorkspace(queryTerms(text));
		const { snippets } = await retrieval;

		const response = await fetch(PROXY_URL, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				messages: trimmed.messages,
				...(workspace ? { context: workspace } : {}),
				...(snippets.length > 0 ? { grounding: snippets } : {}),
			}),
			signal: controller.signal,
		});

		if (!response.ok) {
			throw new Error(`HTTP ${response.status}`);
		}

		const reader = response.body?.getReader();
		if (!reader) throw new Error("No response body");

		const decoder = new TextDecoder();
		let buffer = "";

		while (true) {
			const { done, value } = await reader.read();
			if (done) break;

			buffer += decoder.decode(value, { stream: true });
			const lines = buffer.split("\n");
			buffer = lines.pop() || "";

			for (const line of lines) {
				if (!line.startsWith("data: ")) continue;
				const data = line.slice(6).trim();
				if (data === "[DONE]") continue;
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
	} catch (e: unknown) {
		const aborted = e instanceof Error && e.name === "AbortError";
		if (aborted) {
			if (assistantMessage.content) {
				assistantMessage.interrupted = true;
				messages = [...messages.slice(0, -1), { ...assistantMessage }];
			} else {
				messages = messages.slice(0, -1);
			}
		} else {
			// A 429 has a specific meaning (too many questions in a minute) and
			// saying so is more useful than a generic failure.
			error =
				e instanceof Error && e.message === "HTTP 429"
					? "Too many questions in a row — please wait a minute and try again"
					: "Request failed. Please try again later.";
			if (assistantMessage.content === "") {
				messages = messages.slice(0, -1);
			}
		}
	} finally {
		isLoading = false;
		abortController = null;

		// Attach the retrieval hits to the reply, skipping any URL already shown
		// earlier in the conversation.
		const { results } = await retrieval;
		const fresh = results.filter((article) => {
			if (shownArticleUrls.has(article.url)) return false;
			shownArticleUrls.add(article.url);
			return true;
		});
		if (fresh.length > 0) {
			const last = messages[messages.length - 1];
			if (last?.role === "assistant") {
				last.relatedArticles = fresh;
				messages = [...messages];
			}
		}
		scrollToBottom();
	}
}

function handleKeydown(e: KeyboardEvent) {
	if (e.key === "Enter" && !e.shiftKey) {
		e.preventDefault();
		sendMessage();
	}
}

function handleInput() {
	if (!inputEl) return;
	inputEl.style.height = "auto";
	inputEl.style.height = `${Math.min(inputEl.scrollHeight, 120)}px`;
}

function closePanel() {
	isOpen = false;
	restoreFocusEl?.focus();
	restoreFocusEl = null;
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
			x: Math.max(
				16,
				Math.min(rect.left + rect.width / 2, window.innerWidth - 16),
			),
			y: Math.max(4, top),
		};
		showSelectionPopup = true;
	}, 10);
}

function handleSelectionClick() {
	isOpen = true;
	error = null;
	showSelectionPopup = false;
	syncArticleContext();
	inputText = selectedText;
	requestAnimationFrame(() => {
		inputEl?.focus();
		inputEl?.setSelectionRange(inputEl.value.length, inputEl.value.length);
		handleInput();
	});
}

function dismissSelectionPopup() {
	showSelectionPopup = false;
	selectedText = "";
	window.getSelection()?.removeAllRanges();
}

onMount(() => {
	// pagefind may already be loaded by an earlier search on this page.
	if (typeof window !== "undefined" && window.pagefind?.search)
		pagefindLoaded = true;
	syncArticleContext();

	// Restore the conversation after a reload (sessionStorage: one tab, no
	// cross-visit tracking).
	const restored = persistedMessages();
	if (restored.length > 0) {
		messages = restored;
		for (const message of restored) {
			for (const article of message.relatedArticles ?? []) {
				shownArticleUrls.add(article.url);
			}
		}
	}

	document.addEventListener("keydown", (e) => {
		if (e.key === "Escape") {
			if (showSelectionPopup) {
				dismissSelectionPopup();
			} else if (isOpen) {
				closePanel();
			}
		}
	});

	document.addEventListener("mouseup", handleMouseUp);

	// Swup swaps `main` (not the widget) and updates the document title, so the
	// article label has to be refreshed on every navigation.
	const onNavigate = () => {
		syncArticleContext();
		inputEl?.blur();
	};
	if (window.swup?.hooks) {
		window.swup.hooks.on("content:replace", onNavigate);
	} else {
		document.addEventListener("swup:enable", () => {
			window.swup.hooks.on("content:replace", onNavigate);
		});
	}
});

$effect(() => {
	if (isOpen) {
		scrollToBottom();
	}
});

// Persist on every change; the payload is small and sessionStorage writes are
// synchronous, so a plain effect is enough here.
$effect(() => {
	const snapshot = messages.slice(-MAX_PERSISTED_MESSAGES);
	try {
		if (snapshot.length === 0) {
			sessionStorage.removeItem(PERSIST_KEY);
		} else {
			const payload: PersistedState = {
				version: PERSIST_VERSION,
				messages: snapshot,
			};
			sessionStorage.setItem(PERSIST_KEY, JSON.stringify(payload));
		}
	} catch {
		// Ignore quota / private-mode failures.
	}
});

$effect(() => {
	if (!showSelectionPopup) return;

	let rafId: number;
	function onScroll() {
		cancelAnimationFrame(rafId);
		rafId = requestAnimationFrame(() => {
			const selection = window.getSelection();
			if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
				showSelectionPopup = false;
				return;
			}
			const range = selection.getRangeAt(0);
			const rect = range.getBoundingClientRect();
			const popupHeight = 36;
			let top = rect.bottom + 6;
			if (top + popupHeight > window.innerHeight - 10) {
				top = rect.top - popupHeight - 6;
			}
			popupPos = {
				x: Math.max(
					16,
					Math.min(rect.left + rect.width / 2, window.innerWidth - 16),
				),
				y: Math.max(4, top),
			};
		});
	}

	window.addEventListener("scroll", onScroll, { passive: true });
	return () => {
		window.removeEventListener("scroll", onScroll);
		cancelAnimationFrame(rafId);
	};
});

const suggestions = $derived(
	hasArticle ? ARTICLE_SUGGESTIONS : GENERIC_SUGGESTIONS,
);
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
    <span>Ask AI</span>
  </button>
{/if}

<!-- Floating button -->
<button
  onclick={togglePanel}
  aria-label="AI assistant"
  aria-expanded={isOpen}
  aria-controls="ai-chat-panel"
  style="bottom: calc(1.5rem + env(safe-area-inset-bottom, 0px)); right: calc(1.5rem + env(safe-area-inset-right, 0px));"
  class="fixed z-[100] w-12 h-12 rounded-full
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
    id="ai-chat-panel"
    bind:this={chatPanel}
    onkeydown={handlePanelKeydown}
    onclick={handlePanelClick}
    style="bottom: calc(5rem + env(safe-area-inset-bottom, 0px)); right: calc(1.5rem + env(safe-area-inset-right, 0px));"
    class="chat-panel fixed z-[100] w-[360px] max-w-[calc(100vw-2rem)]
           h-[500px] max-h-[calc(100vh-8rem)]
           card-base shadow-xl rounded-2xl flex flex-col"
    role="dialog"
    aria-modal="true"
    aria-label="AI chat"
  >
    <!-- Header -->
    <div class="flex items-center justify-between px-4 py-3 border-b
                border-black/[0.06] dark:border-white/[0.08] shrink-0">
      <div class="flex flex-col min-w-0">
        <div class="flex items-center gap-2">
          <Icon icon="material-symbols:smart-toy-outline" class="text-lg text-[var(--primary)]" />
          <span class="font-medium text-sm text-[var(--deep-text)]">AI assistant</span>
        </div>
        {#if hasArticle && articleTitle}
          <span
            class="text-[0.6875rem] text-[var(--shallow-text)] truncate max-w-[210px] mt-0.5"
            title="Answers will reference this article"
          >
            Grounded in “{articleTitle}”
          </span>
        {/if}
      </div>
      <div class="flex items-center gap-1 shrink-0">
        {#if messages.length > 0}
          <button
            onclick={clearConversation}
            class="btn-plain w-8 h-8 rounded-lg"
            aria-label="Clear conversation"
            title="Clear conversation"
          >
            <Icon icon="material-symbols:delete-outline" class="text-lg" />
          </button>
        {/if}
        <button onclick={closePanel} class="btn-plain w-8 h-8 rounded-lg" aria-label="Close">
          <Icon icon="material-symbols:close" class="text-lg" />
        </button>
      </div>
    </div>

    <!-- Messages -->
    <div
      bind:this={msgList}
      class="flex-1 overflow-y-auto px-4 py-3 space-y-3"
      aria-live="polite"
      aria-busy={isLoading}
    >
      {#if messages.length === 0}
        <div class="flex flex-col items-center justify-center h-full
                    text-[var(--shallow-text)] text-sm gap-3">
          <Icon icon="material-symbols:smart-toy-outline" class="text-3xl opacity-40" />
          <p>
            {hasArticle ? "Ask me anything about this article" : "What can I help you with?"}
          </p>
          <div class="flex flex-wrap gap-2 justify-center px-2">
            {#each suggestions as suggestion}
              <button
                onclick={() => sendMessage(suggestion)}
                class="px-3 py-1.5 rounded-full text-xs
                       bg-[var(--btn-regular-bg)] hover:bg-[var(--btn-plain-bg-hover)]
                       text-[var(--deep-text)] transition-colors"
              >
                {suggestion}
              </button>
            {/each}
          </div>
        </div>
      {/if}

      {#each messages as msg, index (index)}
        {#if msg.role === 'user'}
          <div class="flex justify-end group">
            <div class="max-w-[85%] px-3.5 py-2 rounded-2xl rounded-br-md
                        bg-[var(--primary)] text-white text-sm leading-relaxed
                        break-words whitespace-pre-wrap">
              {msg.content}
            </div>
          </div>
        {:else}
          <div class="flex flex-col items-start gap-1 group">
            <div class="chat-markdown max-w-[90%] px-3.5 py-2 rounded-2xl rounded-bl-md
                        bg-[var(--btn-regular-bg)] text-[var(--deep-text)] text-sm
                        leading-relaxed break-words
                        dark:text-white/85">
              {#if msg.content}
                <!-- Rendered as sanitized Markdown (see @utils/chat-markdown.ts). -->
                <div data-chat-markdown>{@html renderMarkdown(msg.content)}</div>
                {#if msg.interrupted}
                  <div class="text-[0.6875rem] text-[var(--shallow-text)] mt-1">Stopped</div>
                {/if}
              {:else if isLoading}
                <span class="flex gap-1 py-1">
                  <span class="w-1.5 h-1.5 rounded-full bg-[var(--primary)] animate-bounce" style="animation-delay: 0ms"></span>
                  <span class="w-1.5 h-1.5 rounded-full bg-[var(--primary)] animate-bounce" style="animation-delay: 150ms"></span>
                  <span class="w-1.5 h-1.5 rounded-full bg-[var(--primary)] animate-bounce" style="animation-delay: 300ms"></span>
                </span>
              {/if}
            </div>
            {#if msg.content}
              <button
                onclick={() => copyMessage(msg.content)}
                class="btn-plain text-[0.6875rem] px-2 py-0.5 rounded-md opacity-0
                       group-hover:opacity-100 focus-visible:opacity-100
                       text-[var(--shallow-text)] transition-opacity"
                aria-label="Copy answer"
              >
                Copy
              </button>
            {/if}
          </div>

          {#if msg.relatedArticles && msg.relatedArticles.length > 0}
            <div class="flex justify-start mt-2">
              <div class="max-w-[85%] space-y-1.5">
                <div class="text-xs font-medium text-[var(--shallow-text)] ml-1">
                  Related posts
                </div>
                {#each msg.relatedArticles as article}
                  <a
                    href={article.url}
                    class="block px-3 py-2 rounded-xl
                           bg-[var(--btn-regular-bg)] hover:bg-[var(--btn-plain-bg-hover)]
                           dark:bg-white/5 dark:hover:bg-white/8
                           transition-colors group"
                  >
                    <div class="text-sm font-medium text-[var(--deep-text)]
                                group-hover:text-[var(--primary)] transition-colors
                                line-clamp-1">
                      {article.meta.title}
                    </div>
                    {#if article.excerpt}
                      <div class="text-xs text-[var(--shallow-text)] mt-0.5 line-clamp-2">
                        {@html sanitizeHtml(article.excerpt, { allowedTags: ['mark'] })}
                      </div>
                    {/if}
                  </a>
                {/each}
              </div>
            </div>
          {/if}
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
      {#if droppedTurns > 0}
        <div class="text-[0.6875rem] text-[var(--shallow-text)] px-1 pb-1.5">
          Conversation is long — the earliest {droppedTurns} messages were dropped
        </div>
      {/if}
      <div class="flex items-end gap-2">
        <textarea
          bind:this={inputEl}
          bind:value={inputText}
          onkeydown={handleKeydown}
          oninput={handleInput}
          rows="1"
          placeholder={hasArticle ? "Ask about this article..." : "Type a question..."}
          aria-label="Ask a question"
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
            aria-label="Stop"
          >
            <Icon icon="material-symbols:stop" class="text-lg" />
          </button>
        {:else}
          <button
            onclick={() => sendMessage()}
            disabled={!inputText.trim()}
            class="btn-regular w-9 h-9 rounded-xl shrink-0 disabled:opacity-40"
            class:!bg-[var(--primary)]={!!inputText.trim()}
            class:!text-white={!!inputText.trim()}
            aria-label="Send"
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

  /* Prefer dvh on mobile browsers with dynamic toolbars (the Tailwind class
     provides the 100vh fallback). */
  @supports (height: 100dvh) {
    .chat-panel {
      max-height: calc(100dvh - 8rem);
    }
  }

  /* Markdown inside a reply: compact vertical rhythm, since the bubble is only
     ~330px wide and every extra margin eats reading space. */
  .chat-markdown :global([data-chat-markdown] > :first-child) {
    margin-top: 0;
  }
  .chat-markdown :global([data-chat-markdown] > :last-child) {
    margin-bottom: 0;
  }
  .chat-markdown :global(p) {
    margin: 0.5em 0;
  }
  .chat-markdown :global(ul),
  .chat-markdown :global(ol) {
    margin: 0.5em 0;
    padding-left: 1.25em;
    list-style: revert;
  }
  .chat-markdown :global(li) {
    margin: 0.15em 0;
  }
  .chat-markdown :global(pre) {
    margin: 0.5em 0;
    padding: 0.6em 0.75em;
    border-radius: 0.5rem;
    background: rgb(0 0 0 / 0.06);
    overflow-x: auto;
    font-size: 0.8125rem;
    line-height: 1.5;
  }
  .chat-markdown :global(code) {
    font-family: var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace);
    font-size: 0.8125rem;
    word-break: break-word;
  }
  .chat-markdown :global(:not(pre) > code) {
    padding: 0.1em 0.35em;
    border-radius: 0.25rem;
    background: rgb(0 0 0 / 0.06);
  }
  .chat-markdown :global(blockquote) {
    margin: 0.5em 0;
    padding-left: 0.75em;
    border-left: 3px solid var(--primary);
    opacity: 0.9;
  }
  .chat-markdown :global(a) {
    color: var(--primary);
    text-decoration: underline;
    text-underline-offset: 2px;
  }
  .chat-markdown :global(h1),
  .chat-markdown :global(h2),
  .chat-markdown :global(h3),
  .chat-markdown :global(h4) {
    font-weight: 600;
    font-size: 0.9375rem;
    margin: 0.7em 0 0.35em;
  }
  .chat-markdown :global(table) {
    display: block;
    max-width: 100%;
    overflow-x: auto;
    margin: 0.5em 0;
    font-size: 0.8125rem;
  }
  .chat-markdown :global(th),
  .chat-markdown :global(td) {
    border: 1px solid rgb(0 0 0 / 0.12);
    padding: 0.25em 0.5em;
  }
  :global(.dark) .chat-markdown :global(pre),
  :global(.dark) .chat-markdown :global(:not(pre) > code) {
    background: rgb(255 255 255 / 0.08);
  }
  :global(.dark) .chat-markdown :global(th),
  :global(.dark) .chat-markdown :global(td) {
    border-color: rgb(255 255 255 / 0.15);
  }
</style>
