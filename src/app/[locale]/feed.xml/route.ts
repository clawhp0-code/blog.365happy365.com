import { Feed } from "feed";
import { getAllPosts } from "@/lib/posts";
import type { Locale } from "@/lib/i18n";
import { getDictionary } from "@/lib/dictionaries";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://blog.365happy365.com";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ locale: string }> }
) {
  const { locale } = await params;
  const l = locale as Locale;
  const posts = getAllPosts(l);
  const dict = getDictionary(l);

  const feed = new Feed({
    title: dict.site.title,
    description: dict.site.tagline,
    id: siteUrl,
    link: siteUrl,
    language: locale,
    favicon: `${siteUrl}/favicon.ico`,
    copyright: `\u00A9 ${new Date().getFullYear()} 365happy365`,
    feedLinks: {
      rss2: `${siteUrl}/${locale}/feed.xml`,
    },
    author: {
      name: "365happy365",
      link: siteUrl,
    },
  });

  posts.forEach((post) => {
    feed.addItem({
      title: post.title,
      id: `${siteUrl}/${locale}/blog/${post.slug}`,
      link: `${siteUrl}/${locale}/blog/${post.slug}`,
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
