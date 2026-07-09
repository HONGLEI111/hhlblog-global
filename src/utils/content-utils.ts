import { type CollectionEntry, getCollection } from "astro:content";
import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";
import {
	getCategoryUrl,
	getReadCategoryUrl,
	getTechnologyCategoryUrl,
} from "@utils/url-utils.ts";
import { loadTranslations, translateField } from "./translated-content";

// // Retrieve posts and sort them by publication date
async function getRawSortedPosts() {
	const allBlogPosts = await getCollection("posts", ({ data }) => {
		return import.meta.env.PROD ? data.draft !== true : true;
	});

	const sorted = allBlogPosts.sort((a, b) => {
		const dateA = new Date(a.data.published);
		const dateB = new Date(b.data.published);
		return dateA > dateB ? -1 : 1;
	});
	return sorted;
}

async function getRawSortedRead() {
	const allRead = await getCollection("read", ({ data }) => {
		return import.meta.env.PROD ? data.draft !== true : true;
	});

	const sorted = allRead.sort((a, b) => {
		const dateA = new Date(a.data.published);
		const dateB = new Date(b.data.published);
		return dateA > dateB ? -1 : 1;
	});
	return sorted;
}

async function getRawSortedTechnology() {
	const allTechnology = await getCollection("technology", ({ data }) => {
		return import.meta.env.PROD ? data.draft !== true : true;
	});

	const sorted = allTechnology.sort((a, b) => {
		const dateA = new Date(a.data.published);
		const dateB = new Date(b.data.published);
		return dateA > dateB ? -1 : 1;
	});
	return sorted;
}

export async function getSortedPosts(locale?: string) {
	const sorted = await getRawSortedPosts();

	if (!locale || locale === "zh_CN" || locale === "zh_cn") {
		for (let i = 1; i < sorted.length; i++) {
			sorted[i].data.nextSlug = sorted[i - 1].slug;
			sorted[i].data.nextTitle = sorted[i - 1].data.title;
		}
		for (let i = 0; i < sorted.length - 1; i++) {
			sorted[i].data.prevSlug = sorted[i + 1].slug;
			sorted[i].data.prevTitle = sorted[i + 1].data.title;
		}
		return sorted;
	}

	const translations = await loadTranslations(locale, "posts");

	// Apply translated title/description
	for (const post of sorted) {
		post.data.title = translateField(translations, post.slug, "title", post.data.title);
		post.data.description = translateField(translations, post.slug, "description", post.data.description);
	}

	// Translate prev/next titles too
	for (let i = 1; i < sorted.length; i++) {
		sorted[i].data.nextSlug = sorted[i - 1].slug;
		sorted[i].data.nextTitle = translateField(translations, sorted[i - 1].slug, "title", sorted[i - 1].data.title);
	}
	for (let i = 0; i < sorted.length - 1; i++) {
		sorted[i].data.prevSlug = sorted[i + 1].slug;
		sorted[i].data.prevTitle = translateField(translations, sorted[i + 1].slug, "title", sorted[i + 1].data.title);
	}

	return sorted;
}
export async function getSortedRead(locale?: string) {
	const sorted = await getRawSortedRead();

	if (!locale || locale === "zh_CN" || locale === "zh_cn") {
		for (let i = 1; i < sorted.length; i++) {
			sorted[i].data.nextSlug = sorted[i - 1].id.replace(/\.mdx?$/, "");
			sorted[i].data.nextTitle = sorted[i - 1].data.title;
		}
		for (let i = 0; i < sorted.length - 1; i++) {
			sorted[i].data.prevSlug = sorted[i + 1].id.replace(/\.mdx?$/, "");
			sorted[i].data.prevTitle = sorted[i + 1].data.title;
		}
		return sorted;
	}

	const translations = await loadTranslations(locale, "read");

	for (const post of sorted) {
		post.data.title = translateField(translations, post.id.replace(/\.mdx?$/, ""), "title", post.data.title);
		post.data.description = translateField(translations, post.id.replace(/\.mdx?$/, ""), "description", post.data.description);
	}

	for (let i = 1; i < sorted.length; i++) {
		sorted[i].data.nextSlug = sorted[i - 1].id.replace(/\.mdx?$/, "");
		sorted[i].data.nextTitle = translateField(translations, sorted[i - 1].id.replace(/\.mdx?$/, ""), "title", sorted[i - 1].data.title);
	}
	for (let i = 0; i < sorted.length - 1; i++) {
		sorted[i].data.prevSlug = sorted[i + 1].id.replace(/\.mdx?$/, "");
		sorted[i].data.prevTitle = translateField(translations, sorted[i + 1].id.replace(/\.mdx?$/, ""), "title", sorted[i + 1].data.title);
	}

	return sorted;
}
export async function getSortedTechnology(locale?: string) {
	const sorted = await getRawSortedTechnology();

	if (!locale || locale === "zh_CN" || locale === "zh_cn") {
		for (let i = 1; i < sorted.length; i++) {
			sorted[i].data.nextSlug = sorted[i - 1].id.replace(/\.mdx?$/, "");
			sorted[i].data.nextTitle = sorted[i - 1].data.title;
		}
		for (let i = 0; i < sorted.length - 1; i++) {
			sorted[i].data.prevSlug = sorted[i + 1].id.replace(/\.mdx?$/, "");
			sorted[i].data.prevTitle = sorted[i + 1].data.title;
		}
		return sorted;
	}

	const translations = await loadTranslations(locale, "technology");

	for (const post of sorted) {
		post.data.title = translateField(translations, post.id.replace(/\.mdx?$/, ""), "title", post.data.title);
		post.data.description = translateField(translations, post.id.replace(/\.mdx?$/, ""), "description", post.data.description);
	}

	for (let i = 1; i < sorted.length; i++) {
		sorted[i].data.nextSlug = sorted[i - 1].id.replace(/\.mdx?$/, "");
		sorted[i].data.nextTitle = translateField(translations, sorted[i - 1].id.replace(/\.mdx?$/, ""), "title", sorted[i - 1].data.title);
	}
	for (let i = 0; i < sorted.length - 1; i++) {
		sorted[i].data.prevSlug = sorted[i + 1].id.replace(/\.mdx?$/, "");
		sorted[i].data.prevTitle = translateField(translations, sorted[i + 1].id.replace(/\.mdx?$/, ""), "title", sorted[i + 1].data.title);
	}

	return sorted;
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
export async function getSortedPostsList(locale?: string): Promise<PostForList[]> {
	const sortedFullPosts = await getRawSortedPosts();

	const entries = sortedFullPosts.map((post) => ({
		slug: post.slug,
		data: post.data,
	}));

	if (!locale || locale === "zh_CN" || locale === "zh_cn") return entries;

	const translations = await loadTranslations(locale, "posts");
	for (const entry of entries) {
		entry.data.title = translateField(translations, entry.slug, "title", entry.data.title);
		entry.data.description = translateField(translations, entry.slug, "description", entry.data.description);
	}

	return entries;
}
export async function getSortedReadList(locale?: string): Promise<ReadForList[]> {
	const sortedFullRead = await getRawSortedRead();

	const entries = sortedFullRead.map((read) => ({
		slug: read.id.replace(/\.mdx?$/, ""),
		data: read.data,
	}));

	if (!locale || locale === "zh_CN" || locale === "zh_cn") return entries;

	const translations = await loadTranslations(locale, "read");
	for (const entry of entries) {
		entry.data.title = translateField(translations, entry.slug, "title", entry.data.title);
		entry.data.description = translateField(translations, entry.slug, "description", entry.data.description);
	}

	return entries;
}
export async function getSortedTechnologyList(locale?: string): Promise<TechnologyForList[]> {
	const sortedFullTechnology = await getRawSortedTechnology();

	const entries = sortedFullTechnology.map((technology) => ({
		slug: technology.id.replace(/\.mdx?$/, ""),
		data: technology.data,
	}));

	if (!locale || locale === "zh_CN" || locale === "zh_cn") return entries;

	const translations = await loadTranslations(locale, "technology");
	for (const entry of entries) {
		entry.data.title = translateField(translations, entry.slug, "title", entry.data.title);
		entry.data.description = translateField(translations, entry.slug, "description", entry.data.description);
	}

	return entries;
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
