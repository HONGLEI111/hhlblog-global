// Pure request validation for the chat proxy. Kept free of Cloudflare-only
// globals (Request/Response/caches) so it can be unit-tested with plain objects.

export type Role = "user" | "assistant";

export interface ChatMessage {
  role: Role;
  content: string;
}

/** Article context supplied by the client for the page the reader is on. */
export interface RawContext {
  url?: unknown;
  title?: unknown;
  text?: unknown;
}

export interface ResolvedContext {
  url: string;
  title: string;
  text: string;
  /** True when `text` was cut down to CONTEXT_MAX_CHARS. */
  truncated: boolean;
}

export type ParseResult =
  | { ok: true; messages: ChatMessage[]; context: ResolvedContext | null; turnstileToken: string }
  | { ok: false; error: string; status: number };

/** Site-wide retrieval snippets (from the reader's pagefind index). */
export interface GroundingSnippet {
  title: string;
  url: string;
  excerpt: string;
}

// Abuse guardrails. The client trims history before sending, so hitting these
// means a non-browser caller (or a bug) rather than a normal long conversation.
export const MAX_MESSAGES = 30;
export const MAX_TOTAL_CHARS = 30_000;
export const ALLOWED_ROLES = new Set<string>(["user", "assistant"]);

/**
 * Turnstile tokens are roughly 2 KB; anything longer is not a real one, and
 * bounding it here keeps an oversized token out of the verification call.
 */
export const MAX_TURNSTILE_TOKEN_CHARS = 2048;

// Article context limits. CONTEXT_MIN_CHARS exists so that a stray element
// (a nav bar, a single heading) is never mistaken for article body text.
export const CONTEXT_MIN_CHARS = 200;
export const CONTEXT_MAX_CHARS = 12_000;
export const CONTEXT_MAX_TITLE = 200;
export const MAX_SNIPPETS = 4;
const MAX_SNIPPET_TITLE = 200;

/**
 * Hosts whose URLs may appear in the article context. Checked separately from
 * the CORS Origin header: the Origin says who is calling, these say what the
 * context is allowed to claim it is quoting.
 *
 * Keep this in step with the deployment's ALLOWED_ORIGINS var. An origin that
 * passes CORS but is missing here does not error — `resolveContext` returns
 * null, so the proxy answers WITHOUT the reader's article and nothing
 * surfaces the loss.
 *
 * `nextjs.hehonglei.cn` is the Next.js rewrite's production origin (EdgeOne);
 * `www.hehonglei.com` / `hehonglei.com` belong to the original Astro site.
 */
export const ARTICLE_HOSTS: ReadonlySet<string> = new Set([
  "www.hehonglei.com",
  "hehonglei.com",
  "nextjs.hehonglei.cn",
  // The .cn blog shares this worker, and its readers are the ones most likely to
  // be on an article page: leaving its hosts out silently disables grounding
  // there (the prompt then claims the reader is not on an article at all).
  "www.hehonglei.cn",
  "hehonglei.cn",
  "localhost:4321",
  "127.0.0.1:4321",
]);

/** Article path prefixes that may be quoted back into the prompt. */
const ARTICLE_PATH = /^\/(posts|read|technology)\//;

/**
 * Client-supplied retrieval snippets (from the reader's pagefind index).
 *
 * These become prompt text, so a URL that does not resolve to an article path on
 * the proxy's own origin is dropped rather than trusted — otherwise the model
 * could be pointed at arbitrary third-party links by whoever calls the proxy.
 * `origin` must come from the request itself, never from the client.
 */
export function resolveGrounding(raw: unknown, origin: string): GroundingSnippet[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .filter(
      (item): item is { title?: unknown; url?: unknown; excerpt?: unknown } =>
        !!item && typeof item === "object",
    )
    .map((item) => {
      const rawUrl = typeof item.url === "string" ? item.url.trim() : "";
      let path = "";
      try {
        const url = new URL(rawUrl, origin);
        if (url.origin === origin && ARTICLE_PATH.test(url.pathname)) {
          path = url.pathname + url.search;
        }
      } catch {
        // Fall through with an empty path: the filter below drops the entry.
      }
      return {
        title: typeof item.title === "string" ? item.title.trim().slice(0, MAX_SNIPPET_TITLE) : "",
        url: path,
        excerpt: typeof item.excerpt === "string" ? item.excerpt : "",
      };
    })
    .filter((item) => item.title.length > 0 && item.url.length > 0)
    .slice(0, MAX_SNIPPETS);
}

/**
 * Normalize an untrusted article context payload.
 *
 * Only same-site URLs are accepted, because the context is injected into the
 * system prompt: without this check any caller could label arbitrary text as
 * "this site's article". Returns null when the payload is unusable, so callers
 * can simply proceed without grounding.
 */
export function resolveContext(
  raw: unknown,
  allowedHosts: ReadonlySet<string>,
): ResolvedContext | null {
  if (!raw || typeof raw !== "object") return null;
  const candidate = raw as RawContext;
  if (typeof candidate.url !== "string" || typeof candidate.text !== "string") {
    return null;
  }

  let url: URL;
  try {
    url = new URL(candidate.url);
  } catch {
    return null;
  }
  // "http:" is included deliberately: `wrangler dev` serves the site over
  // plain HTTP on localhost, and an https-only rule would silently disable
  // grounding in every local test.
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (!allowedHosts.has(url.host)) return null;

  const text = candidate.text.trim();
  if (text.length < CONTEXT_MIN_CHARS) return null;

  const title = typeof candidate.title === "string"
    ? candidate.title.trim().slice(0, CONTEXT_MAX_TITLE)
    : "";

  return {
    url: url.href,
    title: title || url.pathname,
    text: text.slice(0, CONTEXT_MAX_CHARS),
    truncated: text.length > CONTEXT_MAX_CHARS,
  };
}

/** Parse and validate a `/` request body. Never throws. */
export function parseBody(body: unknown, allowedHosts: ReadonlySet<string>): ParseResult {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Invalid JSON", status: 400 };
  }

  const raw = body as { messages?: unknown; context?: unknown; turnstileToken?: unknown };

  if (!Array.isArray(raw.messages) || raw.messages.length === 0) {
    return { ok: false, error: "Missing messages array", status: 400 };
  }

  if (raw.messages.length > MAX_MESSAGES) {
    return { ok: false, error: `Too many messages (max ${MAX_MESSAGES})`, status: 400 };
  }

  // Filter first, then bound the total size: an oversized single message is
  // clamped rather than rejected, so one pasted wall of text cannot 413 the
  // whole request.
  const messages = raw.messages
    .filter(
      (m): m is ChatMessage =>
        !!m &&
        typeof m === "object" &&
        ALLOWED_ROLES.has((m as ChatMessage).role) &&
        typeof (m as ChatMessage).content === "string",
    )
    .map((m) => ({ role: m.role, content: m.content.trim().slice(0, MAX_TOTAL_CHARS) }))
    .filter((m) => m.content.length > 0);

  if (messages.length === 0) {
    return { ok: false, error: "No valid messages", status: 400 };
  }

  const totalChars = messages.reduce((sum, m) => sum + m.content.length, 0);
  if (totalChars > MAX_TOTAL_CHARS) {
    return { ok: false, error: "Payload too large", status: 413 };
  }

  // Carried through unverified on purpose: whether a token is *required* is a
  // deployment decision (see index.ts), so parseBody only normalizes its shape.
  const turnstileToken =
    typeof raw.turnstileToken === "string"
      ? raw.turnstileToken.trim().slice(0, MAX_TURNSTILE_TOKEN_CHARS)
      : "";

  return { ok: true, messages, context: resolveContext(raw.context, allowedHosts), turnstileToken };
}
