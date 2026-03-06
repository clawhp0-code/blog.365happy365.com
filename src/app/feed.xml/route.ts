import { Feed } from "feed";
import { getAllPosts } from "@/lib/posts";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://blog.365happy365.com";

export async function GET() {
  const posts = getAllPosts();

  const feed = new Feed({
    title: "365happy365 - 세상의 모든 궁금한 것들",
    description: "세상의 모든 궁금한 것들을 탐구하는 블로그",
    id: siteUrl,
    link: siteUrl,
    language: "ko",
    favicon: `${siteUrl}/favicon.ico`,
    copyright: `© ${new Date().getFullYear()} 365happy365`,
    feedLinks: {
      rss2: `${siteUrl}/feed.xml`,
    },
    author: {
      name: "365happy365",
      link: siteUrl,
    },
  });

  posts.forEach((post) => {
    feed.addItem({
      title: post.title,
      id: `${siteUrl}${post.url}`,
      link: `${siteUrl}${post.url}`,
      description: post.description,
      date: new Date(post.date),
      category: [{ name: post.category }],
    });
  });

  return new Response(feed.rss2(), {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "s-maxage=86400, stale-while-revalidate",
    },
  });
}
