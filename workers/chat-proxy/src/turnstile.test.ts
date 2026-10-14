import { describe, expect, it } from "vitest";
import { type FetchLike, verifyTurnstile } from "./turnstile.ts";

const SECRET = "test-secret";

/** A stub that records the call and replies with `payload`. */
function stubFetch(payload: unknown, init: { ok?: boolean; status?: number } = {}) {
  const calls: Array<{ url: string; body: URLSearchParams }> = [];
  const impl: FetchLike = async (url, options) => {
    calls.push({ url, body: options.body });
    return {
      ok: init.ok ?? true,
      status: init.status ?? 200,
      json: async () => payload,
    };
  };
  return { impl, calls };
}

describe("verifyTurnstile", () => {
  it("accepts a token the endpoint confirms", async () => {
    const { impl, calls } = stubFetch({ success: true });

    await expect(verifyTurnstile({ token: "tok", secret: SECRET, fetchImpl: impl })).resolves.toEqual({
      ok: true,
    });
    expect(calls[0].url).toBe("https://challenges.cloudflare.com/turnstile/v0/siteverify");
    expect(calls[0].body.get("secret")).toBe(SECRET);
    expect(calls[0].body.get("response")).toBe("tok");
  });

  it("passes remoteip only when Cloudflare gave a real one", async () => {
    const withIp = stubFetch({ success: true });
    await verifyTurnstile({ token: "t", secret: SECRET, remoteIp: "203.0.113.7", fetchImpl: withIp.impl });
    expect(withIp.calls[0].body.get("remoteip")).toBe("203.0.113.7");

    const unknownIp = stubFetch({ success: true });
    await verifyTurnstile({ token: "t", secret: SECRET, remoteIp: "unknown", fetchImpl: unknownIp.impl });
    expect(unknownIp.calls[0].body.has("remoteip")).toBe(false);
  });

  it("rejects a missing, empty, whitespace-only or non-string token without calling out", async () => {
    const { impl, calls } = stubFetch({ success: true });

    for (const token of [undefined, null, "", "   ", 42, {}]) {
      await expect(verifyTurnstile({ token, secret: SECRET, fetchImpl: impl })).resolves.toMatchObject({
        ok: false,
        reason: "missing-token",
      });
    }
    expect(calls).toHaveLength(0);
  });

  it("rejects when the endpoint says success is not true", async () => {
    for (const payload of [{ success: false }, { success: "true" }, {}, { "error-codes": ["invalid-input"] }]) {
      const { impl } = stubFetch(payload);
      await expect(verifyTurnstile({ token: "t", secret: SECRET, fetchImpl: impl })).resolves.toMatchObject({
        ok: false,
      });
    }
  });

  it("reports the upstream error codes for diagnosis", async () => {
    const { impl } = stubFetch({ success: false, "error-codes": ["timeout-or-duplicate", "bad-request"] });

    await expect(verifyTurnstile({ token: "t", secret: SECRET, fetchImpl: impl })).resolves.toEqual({
      ok: false,
      reason: "rejected:timeout-or-duplicate,bad-request",
    });
  });

  it("fails closed on a non-2xx verification response", async () => {
    const { impl } = stubFetch({ success: true }, { ok: false, status: 500 });

    await expect(verifyTurnstile({ token: "t", secret: SECRET, fetchImpl: impl })).resolves.toEqual({
      ok: false,
      reason: "verify-http-500",
    });
  });

  it("fails closed when the network throws", async () => {
    const impl: FetchLike = async () => {
      throw new Error("offline");
    };

    await expect(verifyTurnstile({ token: "t", secret: SECRET, fetchImpl: impl })).resolves.toEqual({
      ok: false,
      reason: "verify-unreachable",
    });
  });

  it("fails closed on a body that is not an object", async () => {
    for (const payload of [null, "nope", 7]) {
      const { impl } = stubFetch(payload);
      await expect(verifyTurnstile({ token: "t", secret: SECRET, fetchImpl: impl })).resolves.toMatchObject({
        ok: false,
        reason: "verify-bad-response",
      });
    }
  });

  it("fails closed when the body cannot be parsed", async () => {
    const impl: FetchLike = async () => ({
      ok: true,
      status: 200,
      json: async () => {
        throw new Error("bad json");
      },
    });

    await expect(verifyTurnstile({ token: "t", secret: SECRET, fetchImpl: impl })).resolves.toEqual({
      ok: false,
      reason: "verify-unreachable",
    });
  });
});
