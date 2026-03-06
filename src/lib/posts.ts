import { allPosts, type Post } from "contentlayer2/generated";

export function getAllPosts(): Post[] {
  return allPosts
    .filter((post) => !post.draft)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function getPostBySlug(slug: string): Post | undefined {
  return allPosts.find((post) => post.slug === slug && !post.draft);
}

export function getFeaturedPosts(limit = 3): Post[] {
  return getAllPosts()
    .filter((post) => post.featured)
    .slice(0, limit);
}

export function getRecentPosts(limit = 6): Post[] {
  return getAllPosts().slice(0, limit);
}

export function getPostsByCategory(category: string): Post[] {
  return getAllPosts().filter(
    (post) => post.category.toLowerCase() === category.toLowerCase()
  );
}

export function getPostsByTag(tag: string): Post[] {
  return getAllPosts().filter((post) =>
    post.tags.map((t) => t.toLowerCase()).includes(tag.toLowerCase())
  );
}

export function getAllCategories(): { name: string; count: number; slug: string }[] {
  const categoryMap = new Map<string, number>();
  getAllPosts().forEach((post) => {
    const count = categoryMap.get(post.category) || 0;
    categoryMap.set(post.category, count + 1);
  });
  return Array.from(categoryMap.entries())
    .map(([name, count]) => ({ name, count, slug: name }))
    .sort((a, b) => b.count - a.count);
}

export function getAllTags(): { name: string; count: number; slug: string }[] {
  const tagMap = new Map<string, number>();
  getAllPosts().forEach((post) => {
    post.tags.forEach((tag) => {
      const count = tagMap.get(tag) || 0;
      tagMap.set(tag, count + 1);
    });
  });
  return Array.from(tagMap.entries())
    .map(([name, count]) => ({ name, count, slug: name }))
    .sort((a, b) => b.count - a.count);
}

export function getPaginatedPosts(page: number, perPage = 10) {
  const posts = getAllPosts();
  const total = posts.length;
  const totalPages = Math.ceil(total / perPage);
  const start = (page - 1) * perPage;
  const items = posts.slice(start, start + perPage);
  return { posts: items, total, totalPages, currentPage: page };
}
