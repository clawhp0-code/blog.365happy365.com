import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const feeds = [
  "https://news.google.com/rss/search?q=US+stock+market+economy&hl=en-US&gl=US&ceid=US:en",
  "https://news.google.com/rss/search?q=technology+stocks+earnings&hl=en-US&gl=US&ceid=US:en",
];

function unescapeXml(value: string) {
  return value.replace(/<!\[CDATA\[|\]\]>/g, "").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
}

export async function GET() {
  try {
    const items: { title: string; link: string; source: string }[] = [];
    for (const feed of feeds) {
      const response = await fetch(feed, { cache: "no-store", headers: { "User-Agent": "Mozilla/5.0" } });
      if (!response.ok) continue;
      const xml = await response.text();
      for (const match of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
        const item = match[1];
        const title = unescapeXml(item.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? "").trim();
        const link = unescapeXml(item.match(/<link>([\s\S]*?)<\/link>/)?.[1] ?? "").trim();
        const source = unescapeXml(item.match(/<source[^>]*>([\s\S]*?)<\/source>/)?.[1] ?? "Global news").trim();
        if (title && link) items.push({ title, link, source });
      }
    }
    return NextResponse.json(items.slice(0, 12), { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json([], { status: 503 });
  }
}
