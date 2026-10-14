import { buildSystemPrompt } from "./prompt.ts";
import { ARTICLE_HOSTS, parseBody, resolveGrounding } from "./request.ts";

interface Env {
  DEEPSEEK_API_KEY: string;
}

// Current DeepSeek model. The legacy names `deepseek-chat` / `deepseek-reasoner`
// were retired on 2026-07-24; `deepseek-flash` is the V4.1 Flash model.
const MODEL = "deepseek-flash";

// Exact-match CORS allowlist. Do NOT use prefix matching here: an origin such
// as "https://www.hehonglei.cn.evil.com" must never pass the check.
// Do not put server IPs here (they would be visible in this public repo).
// For remote dev, tunnel the dev server to your local machine instead:
//   ssh -L 4321:127.0.0.1:4321 user@server   →   open http://localhost:4321
const ALLOWED_ORIGINS = new Set([
  'https://www.hehonglei.cn',
  'https://hehonglei.cn',
  'http://localhost:4321',
]);

// Simple per-IP sliding-window rate limit backed by the Cache API.
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 10;

const corsHeaders = (origin: string) => ({
  'Access-Control-Allow-Origin': origin,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Vary': 'Origin',
});

interface RateLimitState {
  windowStart: number;
  count: number;
}

async function isRateLimited(ip: string): Promise<boolean> {
  const now = Date.now();
  // Fake URL: the Cache API requires a full URL as the key.
  const key = `https://chat-proxy-ratelimit/${encodeURIComponent(ip)}`;
  try {
    const cache = caches.default;
    const cached = await cache.match(key);
    let state: RateLimitState = { windowStart: now, count: 0 };
    if (cached) {
      try {
        state = JSON.parse(await cached.text()) as RateLimitState;
      } catch {
        state = { windowStart: now, count: 0 };
      }
    }
    if (now - state.windowStart >= RATE_LIMIT_WINDOW_MS) {
      state = { windowStart: now, count: 0 };
    }
    state.count += 1;
    // Responses are only stored when they carry a Cache-Control header.
    await cache.put(
      key,
      new Response(JSON.stringify(state), {
        headers: { 'Cache-Control': `max-age=${Math.ceil(RATE_LIMIT_WINDOW_MS / 1000)}` },
      }),
    );
    return state.count > RATE_LIMIT_MAX_REQUESTS;
  } catch {
    // Fail open: never let a rate-limit storage error block legitimate traffic.
    return false;
  }
}

/**
 * The origin that grounding URLs must resolve to. The request's own URL is
 * authoritative; the client-supplied `Origin` header is only a fallback, so a
 * caller can never talk the proxy into accepting its own origin as "ours".
 */
function requestOrigin(request: Request, originHeader: string): string {
  try {
    return new URL(request.url).origin;
  } catch {
    return originHeader;
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get('Origin') || '';
    const isAllowed = ALLOWED_ORIGINS.has(origin);

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: isAllowed ? corsHeaders(origin) : {},
      });
    }

    if (!isAllowed) {
      return new Response('Forbidden', { status: 403 });
    }

    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', {
        status: 405,
        headers: corsHeaders(origin),
      });
    }

    if (!env.DEEPSEEK_API_KEY) {
      return new Response('Server configuration error', {
        status: 500,
        headers: corsHeaders(origin),
      });
    }

    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    if (await isRateLimited(ip)) {
      return new Response('Too Many Requests', {
        status: 429,
        headers: {
          ...corsHeaders(origin),
          'Retry-After': String(Math.ceil(RATE_LIMIT_WINDOW_MS / 1000)),
        },
      });
    }

    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return new Response('Invalid JSON', {
        status: 400,
        headers: corsHeaders(origin),
      });
    }

    // Sanitize: keep only user/assistant turns (never let the client inject a
    // system prompt), bound the payload size, and validate the article context.
    const parsed = parseBody(rawBody, ARTICLE_HOSTS);
    if (!parsed.ok) {
      return new Response(parsed.error, {
        status: parsed.status,
        headers: corsHeaders(origin),
      });
    }

    const { messages, context } = parsed;
    const grounding = resolveGrounding(
      (rawBody as { grounding?: unknown }).grounding,
      requestOrigin(request, origin),
    );

    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: buildSystemPrompt(context, grounding) },
          ...messages,
        ],
        // Blog Q&A wants a fast answer, not a chain of thought: Flash enables
        // thinking by default, and reasoning deltas would be billed, streamed to
        // the browser and then discarded.
        thinking: { type: 'disabled' },
        stream: true,
      }),
    });

    if (!response.ok) {
      // Surface the upstream reason (truncated) so a model-name or quota
      // failure is diagnosable from the client instead of a bare 502.
      const detail = (await response.text().catch(() => '')).slice(0, 300);
      console.error('DeepSeek API error', response.status, detail);
      return new Response(`DeepSeek API error: ${response.status}`, {
        status: 502,
        headers: corsHeaders(origin),
      });
    }

    return new Response(response.body, {
      headers: {
        ...corsHeaders(origin),
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
      },
    });
  },
};
