import { type CollectionEntry, getCollection } from "astro:content";
import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";
import {
	getCategoryUrl,
	getReadCategoryUrl,
	getTechnologyCategoryUrl,
} from "@utils/url-utils.ts";
import MarkdownIt from "markdown-it";
import getReadingTime from "reading-time";

type ContentCollection = "posts" | "read" | "technology";

const md = new MarkdownIt({ html: true });

/**
 * Render markdown once and derive both the plain text (for reading time)
 * and the excerpt (first paragraph) from that single HTML output, instead
 * of invoking markdown-it twice per entry.
 */
function renderOnce(markdown: string): { text: string; excerpt: string } {
	const html = md.render(markdown);
	const text = html.replace(/<[^>]*>/g, " ");
	const match = html.match(/<p>(.*?)<\/p>/s);
	const excerpt = match ? match[1].replace(/<[^>]*>/g, "").trim() : "";
	return { text, excerpt };
}

/**
 * Prefer the entry slug; glob-loaded collections (read/technology) expose the
 * slug through `id` ("path/file.md") instead.
 */
function getEntrySlug(entry: { id: string; slug?: string }): string {
	return entry.slug ?? entry.id.replace(/\.mdx?$/, "");
}

// Retrieve entries of a collection and sort them by publication date (desc)
async function getRawSortedEntries<C extends ContentCollection>(collection: C) {
	const entries = await getCollection(collection, ({ data }) => {
		return import.meta.env.PROD ? data.draft !== true : true;
	});

	return entries
		.sort((a, b) => {
			const dateA = new Date(a.data.published);
			const dateB = new Date(b.data.published);
			return dateA > dateB ? -1 : 1;
		})
		.map((entry) => {
			// Compute card metadata (words/minutes/excerpt) once here instead of
			// running the full remark+rehype pipeline via `render()` per card.
			const body = entry.body ?? "";
			const { text, excerpt } = renderOnce(body);
			const readingTime = getReadingTime(text);
			const data = entry.data as unknown as Record<string, unknown> & {
				words: number;
				minutes: number;
				excerpt: string;
			};
			data.words = readingTime.words;
			data.minutes = Math.max(1, Math.round(readingTime.minutes));
			data.excerpt = excerpt;
			return entry;
		});
}

type NavigableEntry = {
	id: string;
	slug?: string;
	data: {
		title: string;
		prevSlug: string;
		prevTitle: string;
		nextSlug: string;
		nextTitle: string;
	};
};

/** Fill in prev/next navigation links between adjacent entries, in place. */
function attachPrevNext<E extends NavigableEntry>(sorted: E[]): E[] {
	for (let i = 1; i < sorted.length; i++) {
		sorted[i].data.nextSlug = getEntrySlug(sorted[i - 1]);
		sorted[i].data.nextTitle = sorted[i - 1].data.title;
	}
	for (let i = 0; i < sorted.length - 1; i++) {
		sorted[i].data.prevSlug = getEntrySlug(sorted[i + 1]);
		sorted[i].data.prevTitle = sorted[i + 1].data.title;
	}
	return sorted;
}

export async function getSortedPosts() {
	return attachPrevNext(await getRawSortedEntries("posts"));
}
export async function getSortedRead() {
	return attachPrevNext(await getRawSortedEntries("read"));
}
export async function getSortedTechnology() {
	return attachPrevNext(await getRawSortedEntries("technology"));
}

export type PostForList = {
	slug: string;
	data: CollectionEntry<"posts">["data"];
};
export type ReadForList = {
	slug: string;
	data: CollectionEntry<"read">["data"];
};
export type TechnologyForList = {
	slug: string;
	data: CollectionEntry<"technology">["data"];
};
export async function getSortedPostsList(): Promise<PostForList[]> {
	const sortedFullPosts = await getRawSortedEntries("posts");

	// delete post.body
	const sortedPostsList = sortedFullPosts.map((post) => ({
		slug: getEntrySlug(post),
		data: post.data,
	}));

	return sortedPostsList;
}
export async function getSortedReadList(): Promise<ReadForList[]> {
	const sortedFullRead = await getRawSortedEntries("read");

	const sortedReadList = sortedFullRead.map((read) => ({
		slug: getEntrySlug(read),
		data: read.data,
	}));

	return sortedReadList;
}
export async function getSortedTechnologyList(): Promise<TechnologyForList[]> {
	const sortedFullTechnology = await getRawSortedEntries("technology");

	const sortedTechnologyList = sortedFullTechnology.map((technology) => ({
		slug: getEntrySlug(technology),
		data: technology.data,
	}));

	return sortedTechnologyList;
}

export interface FindLatestPostsOptions {
	count?: number;
}

/** Latest posts for the landing page widgets. */
export async function findLatestPosts({
	count = 4,
}: FindLatestPostsOptions = {}) {
	const posts = await getSortedPosts();
	return posts.slice(0, count).map((post) => ({
		id: post.id,
		slug: post.slug,
		permalink: `/posts/${post.slug}/`,
		publishDate: post.data.published,
		title: post.data.title,
		excerpt: post.data.description,
		image: post.data.image,
		category: post.data.category
			? { slug: post.data.category, title: post.data.category }
			: undefined,
		tags: post.data.tags?.map((t: string) => ({ slug: t, title: t })),
	}));
}

export type Tag = {
	name: string;
	count: number;
};

type StatsCollection = "posts" | "read" | "technology";

async function getTagListForCollection(
	collection: StatsCollection,
): Promise<Tag[]> {
	const allPosts = await getCollection(collection, ({ data }) => {
		return import.meta.env.PROD ? data.draft !== true : true;
	});

	const countMap: { [key: string]: number } = {};
	allPosts.forEach((post) => {
		post.data.tags.forEach((tag: string) => {
			if (!countMap[tag]) countMap[tag] = 0;
			countMap[tag]++;
		});
	});

	const keys: string[] = Object.keys(countMap).sort((a, b) => {
		return a.toLowerCase().localeCompare(b.toLowerCase());
	});

	return keys.map((key) => ({ name: key, count: countMap[key] }));
}

export async function getTagList(): Promise<Tag[]> {
	return getTagListForCollection("posts");
}

export async function getReadTagList(): Promise<Tag[]> {
	return getTagListForCollection("read");
}

export async function getTechnologyTagList(): Promise<Tag[]> {
	return getTagListForCollection("technology");
}

export type Category = {
	name: string;
	count: number;
	url: string;
};

async function getCategoryListForCollection(
	collection: StatsCollection,
	getUrl: (category: string | null) => string,
): Promise<Category[]> {
	const allPosts = await getCollection(collection, ({ data }) => {
		return import.meta.env.PROD ? data.draft !== true : true;
	});
	const count: { [key: string]: number } = {};
	allPosts.forEach((post) => {
		if (!post.data.category) {
			const ucKey = i18n(I18nKey.uncategorized);
			count[ucKey] = count[ucKey] ? count[ucKey] + 1 : 1;
			return;
		}

		const categoryName =
			typeof post.data.category === "string"
				? post.data.category.trim()
				: String(post.data.category).trim();

		count[categoryName] = count[categoryName] ? count[categoryName] + 1 : 1;
	});

	const lst = Object.keys(count).sort((a, b) => {
		return a.toLowerCase().localeCompare(b.toLowerCase());
	});

	const ret: Category[] = [];
	for (const c of lst) {
		ret.push({
			name: c,
			count: count[c],
			url: getUrl(c),
		});
	}
	return ret;
}

export async function getCategoryList(): Promise<Category[]> {
	return getCategoryListForCollection("posts", getCategoryUrl);
}

export async function getReadCategoryList(): Promise<Category[]> {
	return getCategoryListForCollection("read", getReadCategoryUrl);
}

export async function getTechnologyCategoryList(): Promise<Category[]> {
	return getCategoryListForCollection("technology", getTechnologyCategoryUrl);
}
