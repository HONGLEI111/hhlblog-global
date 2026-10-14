import { describe, expect, it } from "vitest";

import { allowedOrigins } from "./index.ts";

/**
 * ALLOWED_ORIGINS parsing.
 *
 * This is configuration parsing, so a mistake here fails as a bare 403 with no
 * server-side error and no test coverage — which is exactly what happened in
 * production once: the dashboard value was filled in one origin per line, the
 * whole multi-line string became a single non-empty "origin", every real
 * origin was rejected, AND the DEV_ORIGIN fallback was suppressed because the
 * set looked non-empty.
 */
describe("allowedOrigins", () => {
	it("parses the comma-separated form the docs describe", () => {
		const origins = allowedOrigins({
			ALLOWED_ORIGINS: "https://a.example,https://b.example",
		});
		expect([...origins].sort()).toEqual([
			"https://a.example",
			"https://b.example",
		]);
	});

	it("parses the one-per-line form the dashboard invites", () => {
		// The incident this pins: a trailing newline and per-line entries.
		const origins = allowedOrigins({
			ALLOWED_ORIGINS:
				"https://a.example\nhttps://b.example\nhttps://c.example\n",
		});
		expect(origins.size).toBe(3);
		expect(origins.has("https://a.example")).toBe(true);
		expect(origins.has("https://c.example")).toBe(true);
	});

	it("tolerates mixed delimiters, stray spaces and blank lines", () => {
		const origins = allowedOrigins({
			ALLOWED_ORIGINS: " https://a.example ,\n\n  https://b.example \n",
		});
		expect([...origins].sort()).toEqual([
			"https://a.example",
			"https://b.example",
		]);
	});

	it("does not keep a trailing newline inside an origin", () => {
		// The specific shape a textarea paste produces.
		const origins = allowedOrigins({ ALLOWED_ORIGINS: "https://a.example\n" });
		expect([...origins]).toEqual(["https://a.example"]);
		expect([...origins][0].endsWith("\n")).toBe(false);
	});

	it("falls back to the dev origin when unset or empty", () => {
		expect([...allowedOrigins({})]).toEqual(["http://localhost:4321"]);
		expect([...allowedOrigins({ ALLOWED_ORIGINS: "" })]).toEqual([
			"http://localhost:4321",
		]);
		expect([...allowedOrigins({ ALLOWED_ORIGINS: "  \n " })]).toEqual([
			"http://localhost:4321",
		]);
	});

	it("does not fall back when something IS configured", () => {
		// The fallback must not rescue a misconfigured list: if it did, a typo
		// would silently keep only localhost working.
		const origins = allowedOrigins({ ALLOWED_ORIGINS: "https://a.example" });
		expect(origins.has("http://localhost:4321")).toBe(false);
	});

	it("keeps exact-match semantics (no prefix or suffix matching)", () => {
		const origins = allowedOrigins({ ALLOWED_ORIGINS: "https://a.example" });
		expect(origins.has("https://a.example.evil.com")).toBe(false);
		expect(origins.has("https://a.example/")).toBe(false);
		expect(origins.has("a.example")).toBe(false);
	});
});
