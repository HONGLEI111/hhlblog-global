import { getSortedPosts } from '@/utils/content-utils';

export interface FindLatestPostsOptions {
  count?: number;
  locale?: string;
}

export async function findLatestPosts({ count = 4, locale }: FindLatestPostsOptions = {}) {
  const posts = await getSortedPosts(locale);
  return posts.slice(0, count).map((post) => ({
    id: post.id,
    slug: post.slug,
    permalink: `/posts/${post.slug}/`,
    publishDate: post.data.published,
    title: post.data.title,
    excerpt: post.data.description,
    image: post.data.image,
    category: post.data.category ? { slug: post.data.category, title: post.data.category } : undefined,
    tags: post.data.tags?.map((t: string) => ({ slug: t, title: t })),
  }));
}
