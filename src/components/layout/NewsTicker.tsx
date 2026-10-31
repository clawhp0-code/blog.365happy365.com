"use client";

import { useEffect, useState } from "react";

type News = { title: string; link: string; source: string };

export function NewsTicker() {
  const [items, setItems] = useState<News[]>([]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const response = await fetch("/api/market-news", { cache: "no-store" });
        if (response.ok && active) setItems(await response.json());
      } catch { /* Keep the last successful headlines. */ }
    };
    load();
    const timer = window.setInterval(load, 300_000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);

  if (!items.length) return null;
  return (
    <div className="news-ticker" aria-label="주요 경제 뉴스">
      <span className="news-ticker-label">NEWS</span>
      <div className="news-ticker-track">
        {[...items, ...items].map((item, index) => (
          <a key={`${item.link}-${index}`} href={item.link} target="_blank" rel="noreferrer">
            {item.title} <small>({item.source})</small>
          </a>
        ))}
      </div>
    </div>
  );
}
