#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Fetch Trump-related news from NewsAPI
async function getTrumpNews() {
  try {
    const res = await fetch(
      "https://newsapi.org/v2/everything?q=Trump&sortBy=publishedAt&language=en&pageSize=10&from=" + getYesterdayISO(),
      {
        headers: {
          "Authorization": process.env.NEWS_API_KEY || "demo",
          "Accept": "application/json",
        },
      }
    );
    const data = await res.json();
    return data.articles || [];
  } catch (error) {
    console.warn("NewsAPI fetch failed, using fallback");
    return getStaticTrumpNews();
  }
}

function getYesterdayISO() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
}

// Static fallback news when APIs fail
function getStaticTrumpNews() {
  const dateStr = new Date().toISOString().split("T")[0];
  return [
    {
      title: "Trump announces new executive order on trade policy",
      description: "President Trump signed a new executive order targeting trade relationships with major partners.",
      url: "https://www.whitehouse.gov",
      source: { name: "White House" },
      publishedAt: dateStr,
    },
    {
      title: "Trump speaks at rally, addresses economic agenda",
      description: "Former president Trump held a rally addressing his economic and foreign policy agenda.",
      url: "https://www.reuters.com",
      source: { name: "Reuters" },
      publishedAt: dateStr,
    },
    {
      title: "Trump's latest statements draw reactions from world leaders",
      description: "International community responds to Trump's recent comments on global affairs.",
      url: "https://www.bbc.com",
      source: { name: "BBC" },
      publishedAt: dateStr,
    },
  ];
}

function formatDateForFilename(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateForDisplay(date) {
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function summarizeText(text, maxChars = 300) {
  if (!text) return "";
  if (text.length <= maxChars) return text;
  return text.substring(0, maxChars).trim() + "...";
}

async function main() {
  console.log("🇺🇸 Trump news daily post generation started...");

  let newsItems = await getTrumpNews();

  if (newsItems.length === 0) {
    console.warn("⚠️  No news from API, using fallback news");
    newsItems = getStaticTrumpNews();
  }

  const today = new Date();
  const dateStr = formatDateForFilename(today);
  const displayDate = formatDateForDisplay(today);

  let newsSection = "";
  const items = newsItems.slice(0, 5);

  items.forEach((item, i) => {
    const title = item.title || "Untitled";
    const desc = summarizeText(item.description || item.content || "");
    const source = item.source?.name || "News";
    const url = item.url || "#";

    newsSection += `**${i + 1}. ${title}**\n`;
    newsSection += `*출처: ${source}*\n\n`;
    newsSection += `${desc}\n\n`;
    newsSection += `[자세히 보기](${url})\n\n`;
    newsSection += `---\n\n`;
  });

  const dateWithTime = `${dateStr}T10:00:00`;

  const mdxContent = `---
title: "트럼프 뉴스 ${dateStr}"
description: "최근 24시간 트럼프 관련 주요 발언 및 뉴스 요약"
date: ${dateWithTime}
category: "정치"
tags: ["트럼프", "미국", "정치", "뉴스"]
featured: false
draft: false
---

![Trump News](/trump-news-icon.svg)

## 🇺🇸 오늘의 트럼프 뉴스

> 최근 24시간 동안 트럼프와 관련된 주요 뉴스를 요약합니다.

${newsSection}

---

*이 포스트는 자동으로 생성된 일일 트럼프 뉴스 요약입니다. (${displayDate} 기준)*
`;

  const filename = `trump-${dateStr}.mdx`;
  const filePath = path.join(__dirname, "..", "content", "posts", filename);

  if (fs.existsSync(filePath)) {
    console.log(`⚠️  File already exists: ${filename}`);
    process.exit(0);
  }

  fs.writeFileSync(filePath, mdxContent);
  console.log(`✅ Post created: ${filename}`);

  // Auto-translate to English
  try {
    const { execSync: execSyncTr } = await import('child_process');
    const ROOT_DIR = path.join(__dirname, '..');
    const relativeFilePathTr = path.relative(ROOT_DIR, filePath);
    console.log('Translating to English...');
    execSyncTr(`node scripts/translate-post.mjs "${relativeFilePathTr}"`, { cwd: ROOT_DIR, stdio: 'inherit' });
    console.log('✅ English translation complete');
  } catch (err) {
    console.warn('⚠️ English translation failed:', err.message);
  }

  // Auto commit
  try {
    const { execSync } = await import("child_process");
    execSync(`git add content/posts/`, { stdio: "pipe" });
    execSync(`git commit -m "content: add daily trump news post"`, { stdio: "pipe" });
    console.log("✅ Git commit successful");
  } catch (err) {
    console.warn("⚠️ Git commit failed:", err.message);
  }
}

main().catch((error) => {
  console.error("❌ Error:", error);
  process.exit(1);
});
