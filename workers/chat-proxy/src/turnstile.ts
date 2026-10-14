// Turnstile verification for the chat proxy.
//
// Why this exists: the proxy's only previous gate was a comparison against the
// `Origin` header, and `Origin` is a header the *caller* writes — curl can set
// it to anything, so an allowlist built on it stops a browser and a lazy scanner
// but not a determined caller. A static site cannot keep a secret either, so it
// cannot mint a token the proxy would recognise. Turnstile is the one check that
// separates "a human in a browser on our site" from "a script that knows the
// endpoint", because the token is issued by Cloudflare's challenge and is
// single-use.
//
// Kept free of Cloudflare-only globals (no `Response`/`Request` in the signature)
// so it can be unit-tested with plain objects, like request.ts.

/** Machine-readable outcomes; the reason is logged, never returned to a client. */
export type TurnstileFailure =
  | "missing-token"
  | "verify-unreachable"
  | "verify-bad-response"
  | `verify-http-${number}`
  | `rejected:${string}`;

export type TurnstileResult = { ok: true } | { ok: false; reason: TurnstileFailure };

/** The subset of `fetch` this module needs, so tests can stub it. */
export type FetchLike = (
  url: string,
  init: { method: string; body: URLSearchParams },
) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>;

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export interface VerifyOptions {
  /** The `turnstileToken` the client sent; untrusted. */
  token: unknown;
  secret: string;
  /** `CF-Connecting-IP`, when Cloudflare provided one. */
  remoteIp?: string;
  fetchImpl?: FetchLike;
}

/**
 * Verify one Turnstile token.
 *
 * Fails closed on every unexpected condition: an unreachable or non-2xx
 * verification endpoint, a body that is not an object, or a `success` that is
 * not literally `true` all deny the request. There is no path that turns an
 * error into an allow.
 */
export async function verifyTurnstile({
  token,
  secret,
  remoteIp,
  fetchImpl,
}: VerifyOptions): Promise<TurnstileResult> {
  if (typeof token !== "string" || token.trim().length === 0) {
    return { ok: false, reason: "missing-token" };
  }

  // Form-encoded rather than multipart: simpler to assert on in tests, and it is
  // a documented content type for siteverify.
  const body = new URLSearchParams({ secret, response: token.trim() });
  if (remoteIp && remoteIp !== "unknown") body.set("remoteip", remoteIp);

  const doFetch: FetchLike = fetchImpl ?? (fetch as unknown as FetchLike);

  let payload: unknown;
  try {
    const response = await doFetch(VERIFY_URL, { method: "POST", body });
    if (!response.ok) return { ok: false, reason: `verify-http-${response.status}` };
    payload = await response.json();
  } catch {
    return { ok: false, reason: "verify-unreachable" };
  }

  if (!payload || typeof payload !== "object") {
    return { ok: false, reason: "verify-bad-response" };
  }

  const result = payload as { success?: unknown; "error-codes"?: unknown };
  if (result.success === true) return { ok: true };

  const codes = Array.isArray(result["error-codes"])
    ? result["error-codes"].filter((code) => typeof code === "string").join(",")
    : "";
  return { ok: false, reason: `rejected:${codes || "unknown"}` };
}
