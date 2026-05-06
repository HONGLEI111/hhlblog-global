import { defineCollection, z } from "astro:content";
import { glob } from 'astro/loaders';

const basePostSchema = z.object({
	title: z.string(),
	published: z.date(),
	updated: z.date().optional(),
	draft: z.boolean().optional().default(false),
	description: z.string().optional().default(""),
	image: z.string().optional().default(""),
	tags: z.array(z.string()).optional().default([]),
	category: z.string().optional().nullable().default(""),
	lang: z.string().optional().default("zh_CN"),

	/* For internal use */
	prevTitle: z.string().default(""),
	prevSlug: z.string().default(""),
	nextTitle: z.string().default(""),
	nextSlug: z.string().default(""),
});

const postsCollection = defineCollection({
	schema: z.object({
		title: z.string(),
		published: z.date(),
		updated: z.date().optional(),
		draft: z.boolean().optional().default(false),
		description: z.string().optional().default(""),
		image: z.string().optional().default(""),
		tags: z.array(z.string()).optional().default([]),
		category: z.string().optional().nullable().default(""),
		lang: z.string().optional().default("zh_CN"),

		/* For internal use */
		prevTitle: z.string().default(""),
		prevSlug: z.string().default(""),
		nextTitle: z.string().default(""),
		nextSlug: z.string().default(""),
	}),
});
const specCollection = defineCollection({
	schema: z.object({}),
});
const technologyCollection = defineCollection({
        loader: glob({ pattern: ['*.md', '!voyager-*'], base: './src/content/technology' }),
	schema: basePostSchema,
});
const readCollection = defineCollection({
        loader: glob({ pattern: ['*.md', '!voyager-*'], base: './src/content/read' }), 
	schema: basePostSchema,
});
export const collections = {
	posts: postsCollection,
	spec: specCollection,
	technology: technologyCollection,
	read: readCollection,
};
