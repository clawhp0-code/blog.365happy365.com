#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Fetch AI news from NewsAPI
async function getAINews() {
  try {
    // Using a free news API alternative
    const res = await fetch(
      "https://newsapi.org/v2/everything?q=AI+artificial+intelligence&sortBy=publishedAt&language=en&pageSize=5",
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
    console.warn("NewsAPI fetch failed, using RapidAPI alternative");
    return getAINewsFromAlternative();
  }
}

// Fallback: Fetch from alternative source
async function getAINewsFromAlternative() {
  try {
    // Using a free alternative that doesn't require API key
    const res = await fetch(
      "https://api.currentsapi.services/v1/search?keywords=AI%20artificial%20intelligence&language=en&sortBy=latest&pageSize=5",
      {
        headers: { "Accept": "application/json" },
      }
    );
    const data = await res.json();
    return (data.news || []).map((item) => ({
      title: item.headline,
      description: item.summary,
      url: item.url,
      source: { name: item.source || "News" },
      publishedAt: item.published_datetime,
    }));
  } catch (error) {
    console.warn("Alternative API also failed, using static news");
    return getStaticAINews();
  }
}

// Static fallback news when APIs fail
function getStaticAINews() {
  const today = new Date();
  const dateStr = today.toISOString().split("T")[0];

  return [
    {
      title: "OpenAI releases new AI model with improved reasoning capabilities",
      description:
        "Latest AI model shows significant improvements in complex reasoning and problem-solving tasks.",
      url: "https://openai.com",
      source: { name: "OpenAI" },
      publishedAt: dateStr,
    },
    {
      title: "Google advances multimodal AI research with new breakthrough",
      description:
        "Google announces new advances in multimodal AI that can better understand and process multiple types of data.",
      url: "https://google.com",
      source: { name: "Google Research" },
      publishedAt: dateStr,
    },
    {
      title: "Industry leaders discuss responsible AI development",
      description:
        "Major AI companies collaborate on ethical guidelines and safety standards for AI systems.",
      url: "https://www.example.com",
      source: { name: "Tech News" },
      publishedAt: dateStr,
    },
  ];
}

// Generate AI news SVG icon
function generateAIIcon() {
  return `<svg width="300" height="150" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="aiGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#8b5cf6;stop-opacity:1" />
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="300" height="150" fill="#f0f9ff"/>

  <!-- Brain icon (stylized) -->
  <circle cx="80" cy="75" r="35" fill="url(#aiGradient)"/>
  <circle cx="60" cy="55" r="8" fill="#ffffff"/>
  <circle cx="100" cy="55" r="8" fill="#ffffff"/>
  <circle cx="70" cy="85" r="6" fill="#ffffff"/>
  <circle cx="90" cy="85" r="6" fill="#ffffff"/>
  <circle cx="80" cy="100" r="5" fill="#ffffff"/>

  <!-- Text -->
  <text x="150" y="60" font-size="24" font-weight="bold" fill="#1e293b">
    AI NEWS
  </text>
  <text x="150" y="90" font-size="14" fill="#64748b">
    Daily Update
  </text>

  <!-- Accent line -->
  <line x1="150" y1="100" x2="290" y2="100" stroke="#3b82f6" stroke-width="2"/>
</svg>`;
}

// Format date for filename
function formatDateForFilename(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Format date for display
function formatDateForDisplay(date) {
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// Summarize text to max word count
function summarizeText(text, maxChars = 800) {
  if (!text) return "";
  if (text.length <= maxChars) return text;
  return text.substring(0, maxChars).trim() + "...";
}

// Calculate content length
function calculateContentLength(content) {
  return content.replace(/<[^>]*>/g, "").length;
}

async function main() {
  console.log("🤖 AI news daily post generation started...");

  let newsItems = await getAINews();

  if (newsItems.length === 0) {
    console.warn("⚠️  No news from API, using fallback news");
    newsItems = getStaticAINews();
  }

  const today = new Date();
  const dateStr = formatDateForFilename(today);
  const displayDate = formatDateForDisplay(today);

  // Generate AI icon SVG
  const iconSvg = generateAIIcon();
  const iconPath = path.join(__dirname, "..", "public", "ai-news-icon.svg");
  fs.writeFileSync(iconPath, iconSvg);
  console.log("✅ AI icon generated:", iconPath);

  // Build news section (target: 1000 chars max for entire post)
  let newsSection = "";
  let contentLength = 0;
  const targetLength = 800; // Leave some buffer

  for (let i = 0; i < Math.min(newsItems.length, 3); i++) {
    const item = newsItems[i];
    const title = item.title || "Untitled";
    const desc = item.description || item.content || "";
    const source = item.source?.name || "News";
    const url = item.url || "#";

    const newsItem = `**${i + 1}. ${title}**
${summarizeText(desc, 300)}

[자세히 보기](${url})`;

    if (contentLength + newsItem.length < targetLength) {
      newsSection += newsItem + "\n\n";
      contentLength += newsItem.length;
    }
  }

  const mdxContent = `---
title: "AI 뉴스 ${dateStr}"
description: "AI 최신 뉴스 및 업데이트"
date: ${dateStr}
category: "AI"
tags: ["인공지능", "AI", "기술", "뉴스"]
featured: false
draft: false
---

![AI News](/ai-news-icon.svg)

## 🤖 오늘의 AI 뉴스

${newsSection}

---

*이 포스트는 자동으로 생성된 일일 AI 뉴스 요약입니다. (${displayDate} 기준)*
`;

  // Verify content length
  const totalLength = calculateContentLength(mdxContent);
  console.log(`📊 Content length: ${totalLength} characters`);

  if (totalLength > 1000) {
    console.warn(
      `⚠️  Content exceeds 1000 chars (${totalLength}). Consider shortening.`
    );
  }

  const filename = `ai-news-${dateStr}.mdx`;
  const filePath = path.join(__dirname, "..", "content", "posts", filename);

  // Check if file already exists
  if (fs.existsSync(filePath)) {
    console.log(`⚠️  File already exists: ${filename}`);
    process.exit(0);
  }

  fs.writeFileSync(filePath, mdxContent);
  console.log(`✅ Post created: ${filename}`);
  console.log(`📰 Top news: ${newsItems[0].title}`);
}

main().catch((error) => {
  console.error("❌ Error:", error);
  process.exit(1);
});
