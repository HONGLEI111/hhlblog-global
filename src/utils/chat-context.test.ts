import { describe, expect, it, vi } from "vitest";
import {
	allocateWithinBudget,
	buildWorkspace,
	type ChatMessage,
	EMPTY_HITS,
	extractArticleText,
	HISTORY_MAX_CHARS,
	queryHits,
	queryTerms,
	queryTermsWithFallbacks,
	splitSections,
	toGroundingSnippets,
	trimHistory,
	WORKSPACE_MIN_CHARS,
	waitForReady,
} from "./chat-context.ts";

/**
 * Minimal fake of the parts of `Element` the extractor touches. The project
 * runs Vitest without jsdom, and `extractArticleText` is deliberately written
 * against this small surface so it can be driven directly.
 */
class FakeEl {
	nodeType = 1;
	nodeValue: string | null = null;
	tagName: string;
	childNodes: Array<FakeEl | FakeText> = [];
	hidden = false;
	style: { display: string } = { display: "" };
	skipped = false;
	codeText: string | null = null;

	constructor(tagName: string) {
		this.tagName = tagName;
	}

	matches(_selector: string): boolean {
		return this.skipped;
	}

	querySelector(selector: string): { textContent: string } | null {
		if (selector === "code" && this.codeText !== null) {
			return { textContent: this.codeText };
		}
		return null;
	}

	get textContent(): string {
		return this.childNodes
			.map((child) =>
				child instanceof FakeEl ? child.textContent : (child.nodeValue ?? ""),
			)
			.join("");
	}
}

class FakeText {
	nodeType = 3;

	constructor(public nodeValue: string) {}
}

function el(
	tagName: string,
	...children: Array<FakeEl | FakeText | string>
): FakeEl {
	const node = new FakeEl(tagName);
	node.childNodes = children.map((child) =>
		typeof child === "string" ? new FakeText(child) : child,
	);
	return node;
}

const asElement = (node: FakeEl) => node as unknown as Element;

describe("extractArticleText", () => {
	it("turns headings, lists, paragraphs and code into Markdown", () => {
		const hidden = el("div", "hidden text");
		hidden.style.display = "none";

		const article = el(
			"div",
			el("h2", "第一节"),
			el("p", "这是", el("strong", "正文"), "。"),
			el("ul", el("li", "要点一"), el("li", "要点二")),
			el("pre", el("code", "const a = 1;\nconst b = 2;")),
			hidden,
		);

		const text = extractArticleText(asElement(article));

		expect(text).toContain("## 第一节");
		expect(text).toContain("这是正文。");
		expect(text).toContain("- 要点一");
		expect(text).toContain("- 要点二");
		expect(text).toContain("```\nconst a = 1;\nconst b = 2;\n```");
		// Hidden subtrees (code tabs render every panel) must not be read.
		expect(text).not.toContain("hidden text");
	});

	it("skips elements the extractor is told to ignore", () => {
		const math = el("span", "x^2");
		math.skipped = true;

		const text = extractArticleText(asElement(el("p", "前", math, "后")));

		expect(text).toBe("前后");
	});

	it("collapses horizontal whitespace but keeps line breaks", () => {
		const text = extractArticleText(asElement(el("p", "  a   b \n\n\n c  ")));

		expect(text).toBe("a b\nc");
	});
});

describe("splitSections", () => {
	it("keeps text before the first heading in its own section", () => {
		const sections = splitSections("引言\n## 一\n内容一\n### 一.1\n内容二");

		expect(sections).toHaveLength(3);
		expect(sections[0]).toEqual({ heading: "", body: "引言" });
		expect(sections[1].heading).toBe("## 一");
		expect(sections[1].body).toBe("内容一");
		expect(sections[2].heading).toBe("### 一.1");
	});
});

describe("allocateWithinBudget", () => {
	it("returns the text unchanged when it already fits", () => {
		expect(allocateWithinBudget("short", ["x"], 100)).toBe("short");
	});

	it("prefers the sections that match the question", () => {
		const text = [
			"## 缓存",
			"a".repeat(60),
			"## 部署",
			"部署相关的详细说明 ".repeat(4),
		].join("\n");

		const picked = allocateWithinBudget(text, ["部署"], 80);

		expect(picked.length).toBeLessThanOrEqual(80);
		expect(picked).toContain("部署");
		expect(picked).not.toContain("## 缓存");
	});

	it("keeps reading order once the relevant section is chosen", () => {
		const text = [
			"## 一",
			"x".repeat(30),
			"## 二",
			"y".repeat(30),
			"## 三",
			"z".repeat(30),
		].join("\n");

		const picked = allocateWithinBudget(text, [], 200);

		expect(picked.indexOf("## 一")).toBeLessThan(picked.indexOf("## 二"));
		expect(picked.length).toBeLessThanOrEqual(200);
	});
});

describe("buildWorkspace", () => {
	it("returns null without an article root", () => {
		expect(buildWorkspace(null, "标题", "https://x/", [], 12000)).toBeNull();
	});

	it("returns null when the article is too short to be meaningful", () => {
		const result = buildWorkspace(
			asElement(el("div")),
			"标题",
			"https://x/",
			[],
			12000,
			() => "短",
		);

		expect(result).toBeNull();
	});

	it("reports truncation and keeps the title within the proxy limit", () => {
		// Several sections, so the budget has to choose between them.
		const article = ["## 一", "甲".repeat(300), "## 二", "乙".repeat(300)].join(
			"\n",
		);
		const budget = WORKSPACE_MIN_CHARS * 2;

		const result = buildWorkspace(
			asElement(el("div")),
			"标题".repeat(300),
			"https://www.hehonglei.cn/posts/x/",
			[],
			budget,
			() => article,
		);

		expect(result).not.toBeNull();
		expect(result?.truncated).toBe(true);
		expect(result?.title.length).toBe(200);
		expect(result?.url).toBe("https://www.hehonglei.cn/posts/x/");
		expect((result?.text ?? "").length).toBeLessThanOrEqual(budget);
	});
});

describe("trimHistory", () => {
	const message = (
		role: "user" | "assistant",
		length: number,
	): ChatMessage => ({
		role,
		content: "x".repeat(length),
	});

	it("keeps the newest turns when the message count is exceeded", () => {
		const messages = Array.from({ length: 10 }, () => message("user", 5));

		const { messages: kept, dropped } = trimHistory(messages, 4, 100000);

		expect(kept).toHaveLength(4);
		expect(dropped).toBe(6);
		// The newest message always survives.
		expect(kept[kept.length - 1]).toBe(messages[9]);
	});

	it("re-attaches the first turn so follow-up questions stay meaningful", () => {
		const first = message("user", 10);
		const rest = Array.from({ length: 6 }, () => message("assistant", 10));

		const { messages: kept } = trimHistory([first, ...rest], 3, 100000);

		expect(kept[0]).toBe(first);
		expect(kept).toHaveLength(3);
		expect(kept[kept.length - 1]).toBe(rest[rest.length - 1]);
	});

	it("stops accumulating once the character budget is spent", () => {
		const messages = [
			message("user", 10),
			message("assistant", 10),
			message("user", 50),
		];

		const { messages: kept } = trimHistory(messages, 10, 60);

		expect(kept).toHaveLength(2);
		expect(kept[kept.length - 1].content).toHaveLength(50);
	});

	it("keeps a single oversized message rather than sending nothing", () => {
		const messages = [message("user", HISTORY_MAX_CHARS + 1000)];

		const { messages: kept } = trimHistory(messages);

		expect(kept).toHaveLength(1);
	});

	it("handles an empty conversation", () => {
		expect(trimHistory([])).toEqual({ messages: [], dropped: 0 });
	});
});

describe("queryTerms", () => {
	it("drops stopwords and keeps substantive terms", () => {
		expect(queryTerms("为什么这个 RAG 检索效果不好？")).toEqual([
			"rag",
			"检索效果不好",
		]);
	});

	it("deduplicates terms and respects the limit", () => {
		expect(queryTerms("vitest vitest react vue svelte", 3)).toEqual([
			"vitest",
			"react",
			"vue",
		]);
	});

	it("returns nothing for a question made only of stopwords", () => {
		expect(queryTerms("为什么")).toEqual([]);
	});

	it("splits Chinese stopword compounds out of a single run", () => {
		expect(queryTerms("什么是向量数据库")).toEqual(["向量数据库"]);
	});
});

describe("toGroundingSnippets", () => {
	it("strips highlight markup from excerpts and caps them", () => {
		const snippets = toGroundingSnippets([
			{
				url: "/posts/a/",
				meta: { title: "文章 A" },
				excerpt: `关于 <mark>检索</mark> 的说明 ${"y".repeat(600)}`,
			},
		]);

		expect(snippets).toHaveLength(1);
		expect(snippets[0].title).toBe("文章 A");
		expect(snippets[0].excerpt).not.toContain("<mark>");
		expect(snippets[0].excerpt.length).toBeLessThanOrEqual(400);
	});

	it("drops entries without a URL", () => {
		expect(
			toGroundingSnippets([{ url: "", meta: { title: "x" } }]),
		).toHaveLength(0);
	});
});

describe("waitForReady", () => {
	it("resolves immediately when already ready", async () => {
		const subscribe = vi.fn(() => () => {});

		await expect(waitForReady(() => true, subscribe)).resolves.toBe(true);
		expect(subscribe).not.toHaveBeenCalled();
	});

	it("resolves true when the subscription fires", async () => {
		await expect(
			waitForReady(
				() => false,
				// Fire synchronously from the subscribe call so the resolution is
				// independent of test timing.
				(onReady) => {
					onReady();
					return () => {};
				},
			),
		).resolves.toBe(true);
	});

	it("gives up after the timeout and cancels the subscription", async () => {
		const cancel = vi.fn();

		await expect(
			waitForReady(
				() => false,
				() => cancel,
				1,
			),
		).resolves.toBe(false);
		expect(cancel).toHaveBeenCalled();
	});
});

describe("queryTermsWithFallbacks", () => {
	it("tries the full query first, then progressively shorter ones", () => {
		expect(queryTermsWithFallbacks("向量数据库 检索 性能")).toEqual([
			"向量数据库 检索 性能",
			"向量数据库 检索",
			"向量数据库",
		]);
	});

	it("returns nothing when the question has no substantive terms", () => {
		expect(queryTermsWithFallbacks("为什么")).toEqual([]);
	});

	it("produces a single query when the question yields one term", () => {
		expect(queryTermsWithFallbacks("向量数据库")).toEqual(["向量数据库"]);
	});
});

describe("queryHits", () => {
	it("returns no hits in dev, where no pagefind index exists", async () => {
		await expect(queryHits("检索")).resolves.toEqual(EMPTY_HITS);
	});

	it("falls back to a broader query when the full one matches nothing", async () => {
		const searched: string[] = [];
		const hadWindow = "window" in globalThis;
		const originalWindow = (globalThis as { window?: unknown }).window;
		vi.stubEnv("DEV", false);
		(globalThis as { window?: unknown }).window = {
			pagefind: {
				search: async (terms: string) => {
					searched.push(terms);
					// Only the broadest query matches, mirroring pagefind's AND behaviour.
					return terms === "向量数据库"
						? {
								results: [
									{
										data: async () => ({
											url: "/posts/vector-database-intro/",
											meta: { title: "向量数据库入门" },
											excerpt: "关于 <mark>向量</mark> 的说明",
										}),
									},
								],
							}
						: { results: [] };
				},
			},
		};

		try {
			const hits = await queryHits("向量数据库 做检索 性能");

			expect(searched).toEqual([
				"向量数据库 做检索 性能",
				"向量数据库 做检索",
				"向量数据库",
			]);
			expect(hits.results).toHaveLength(1);
			expect(hits.snippets[0].title).toBe("向量数据库入门");
			expect(hits.snippets[0].excerpt).not.toContain("<mark>");
		} finally {
			vi.unstubAllEnvs();
			if (hadWindow)
				(globalThis as { window?: unknown }).window = originalWindow;
			else delete (globalThis as { window?: unknown }).window;
		}
	});
});
