import { buildSystemPrompt } from "./prompt.ts";
import { ARTICLE_HOSTS, parseBody, resolveGrounding } from "./request.ts";
import { verifyTurnstile } from "./turnstile.ts";

interface Env {
  DEEPSEEK_API_KEY: string;
  /**
   * Turnstile secret. When set, every request must carry a token the challenge
   * issued. When absent the proxy only serves the local dev origin — see the
   * check in `fetch`, because "no secret" must not mean "no gate".
   */
  TURNSTILE_SECRET_KEY?: string;
  /** Comma-separated exact origins allowed to call this proxy. */
  ALLOWED_ORIGINS?: string;
  /**
   * Address the assistant should give when asked how to reach the author. Empty
   * by default so a fork does not advertise someone else's inbox.
   */
  CONTACT_EMAIL?: string;
}

// Current DeepSeek model. The legacy names `deepseek-chat` / `deepseek-reasoner`
// were retired on 2026-07-24; `deepseek-flash` is the V4.1 Flash model.
const MODEL = "deepseek-flash";

/**
 * Ceiling on a single reply, so one request cannot turn into an unbounded bill.
 * A blog answer is a few paragraphs; the widget renders no long-form output.
 */
const MAX_OUTPUT_TOKENS = 1024;

/** The dev origin `allowedOrigins` falls back to when ALLOWED_ORIGINS is unset. */
const DEV_ORIGIN = "http://localhost:4321";

/**
 * Exact-match CORS allowlist, read from the ALLOWED_ORIGINS var so a fork never
 * inherits someone else's domain. Do NOT use prefix matching: an origin such as
 * "https://example.com.evil.com" must never pass the check. Do not put server
 * IPs in here — they would be visible in this public repo; for remote dev,
 * tunnel the dev server instead:
 *   ssh -L 4321:127.0.0.1:4321 user@server   →   open http://localhost:4321
 *
 * This is NOT a security boundary on its own: `Origin` is a header the caller
 * writes, so any non-browser client can forge it. Turnstile is what actually
 * gates the endpoint; this list only stops a browser on another site and a
 * scanner that does not bother to spoof.
 */
function allowedOrigins(env: Env): Set<string> {
  const configured = (env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  return new Set(configured.length > 0 ? configured : [DEV_ORIGIN]);
}

// Simple per-IP sliding-window rate limit backed by the Cache API. With Turnstile
// in front this is a second layer, not the gate, so it stays generous enough for
// a reader typing quickly and low enough to blunt a script.
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 6;

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
    const isAllowed = allowedOrigins(env).has(origin);

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

    // Fail closed: with no Turnstile secret the proxy cannot tell a reader from a
    // script, and the Origin check cannot either. Rather than run open, it serves
    // local development only — so a deployment that forgets the secret stops
    // working instead of quietly becoming a free LLM endpoint.
    if (!env.TURNSTILE_SECRET_KEY && origin !== DEV_ORIGIN) {
      return new Response('Turnstile is not configured', {
        status: 503,
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

    // The token is verified before anything is sent upstream, and the reason is
    // logged rather than returned: it would tell a caller which part to fix.
    if (env.TURNSTILE_SECRET_KEY) {
      const turnstile = await verifyTurnstile({
        token: parsed.turnstileToken,
        secret: env.TURNSTILE_SECRET_KEY,
        remoteIp: ip,
      });
      if (!turnstile.ok) {
        console.error('Turnstile rejected', turnstile.reason);
        return new Response('Forbidden', {
          status: 403,
          headers: corsHeaders(origin),
        });
      }
    }

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
          { role: 'system', content: buildSystemPrompt(context, grounding, env.CONTACT_EMAIL ?? '') },
          ...messages,
        ],
        // Blog Q&A wants a fast answer, not a chain of thought: Flash enables
        // thinking by default, and reasoning deltas would be billed, streamed to
        // the browser and then discarded.
        thinking: { type: 'disabled' },
        max_tokens: MAX_OUTPUT_TOKENS,
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
