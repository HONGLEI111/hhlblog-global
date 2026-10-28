import { needsTurnstile } from "./gate.ts";
import { buildSystemPrompt } from "./prompt.ts";
import { ARTICLE_HOSTS, parseBody, resolveGrounding } from "./request.ts";
import { verifyTurnstile } from "./turnstile.ts";

interface Env {
  DEEPSEEK_API_KEY: string;
  /**
   * Turnstile secret. When set, requests that have used up the free quota must
   * carry a token the challenge issued. When absent the proxy only serves the
   * local dev origin — see the check in `fetch`, because "no secret" must not
   * mean "no gate".
   */
  TURNSTILE_SECRET_KEY?: string;
  /** Comma-separated exact origins allowed to call this proxy. */
  ALLOWED_ORIGINS?: string;
  /**
   * Address the assistant should give when asked how to reach the author. Empty
   * by default so a fork does not advertise someone else's inbox.
   */
  CONTACT_EMAIL?: string;
  /**
   * Temporary, explicit escape hatch: `"1"` serves the allowlisted origins
   * WITHOUT a Turnstile token at any point in a conversation.
   *
   * Why it exists: this proxy is called from `nextjs.hehonglei.cn`, which is
   * hosted on EdgeOne and is not a zone on this Cloudflare account. A Turnstile
   * widget's managed domains are checked against the account's zones, so the
   * challenge can never issue a token there. Setting this accepts that
   * degradation instead of pretending the layer works. The same is true of
   * `www.hehonglei.cn` on a mainland-China network, where the challenge loads
   * but never completes.
   *
   * What still protects the endpoint with this on: the exact-match origin
   * allowlist (browsers only), the durable per-IP rate limit via the Cache API,
   * `max_tokens` per reply, and — the real ceiling — the DeepSeek console
   * spending cap.
   *
   * Unset/anything else keeps the previous fail-closed behaviour on gated
   * requests, so removing the var restores the challenge without a code change.
   */
  ALLOW_UNVERIFIED?: string;
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
 *
 * Delimiters: commas OR newlines/whitespace. Commas are what the docs and
 * wrangler.toml describe, but pasting one origin per line into the dashboard
 * is the natural thing to do — and it FAILS SILENTLY, because a multi-line
 * value is one non-empty "origin" that matches nothing while also
 * suppressing the DEV_ORIGIN fallback. That happened once in production;
 * accepting whitespace makes the mistake harmless.
 */
export function allowedOrigins(env: Env): Set<string> {
  const configured = (env.ALLOWED_ORIGINS ?? '')
    .split(/[,\s]+/)
    .map((value) => value.trim())
    .filter(Boolean);
  return new Set(configured.length > 0 ? configured : [DEV_ORIGIN]);
}

/**
 * Whether the Turnstile gate applies.
 *
 * Separate and exported so the two places in `fetch` that depend on it cannot
 * drift, and so the opt-out is covered by a test rather than only by a comment.
 * Any value other than the literal "1" keeps the gate on — including a typo
 * like "true" or "yes", because silently disabling a security gate by
 * near-miss is the failure worth avoiding.
 */
export function isChallengeRequired(env: Env): boolean {
  return env.ALLOW_UNVERIFIED !== '1';
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

    // Whether the Turnstile gate applies to this request. `ALLOW_UNVERIFIED=1`
    // is the explicit, documented opt-out for hosts where the widget cannot
    // issue a token at all (see the Env comment). Read once, so the checks below
    // cannot disagree.
    const challengeRequired = isChallengeRequired(env);

    // Fail closed: with no Turnstile secret the proxy cannot tell a reader from a
    // script, and the Origin check cannot either. Rather than run open, it serves
    // local development only — so a deployment that forgets the secret stops
    // working instead of quietly becoming a free LLM endpoint. This is about a
    // broken deploy, not about the quota: it does not wait for the quota to run
    // out, because "no secret" must never mean "some free turns for everyone".
    if (challengeRequired && !env.TURNSTILE_SECRET_KEY && origin !== DEV_ORIGIN) {
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

    // The gate. It is a quota on the conversation, counted from the very payload
    // that is about to be sent (see `gate.ts`), so the opening questions never
    // meet the challenge — including on the networks where the challenge cannot
    // complete and would otherwise lock the chat shut. Only a conversation that
    // has kept going is asked to prove it comes from a person.
    const gated = challengeRequired && needsTurnstile(messages);

    if (gated) {
      // Verified before anything is sent upstream. The failure *reason* stays in
      // the log, but the body is a marker the widget acts on: it re-renders the
      // challenge instead of showing a generic error.
      const turnstile = await verifyTurnstile({
        token: parsed.turnstileToken,
        secret: env.TURNSTILE_SECRET_KEY as string,
        remoteIp: ip,
      });
      if (!turnstile.ok) {
        console.error('Turnstile rejected', turnstile.reason);
        return new Response('turnstile-required', {
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
