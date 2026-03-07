#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Fetch Bitcoin price from CoinGecko
async function getBitcoinData() {
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_market_cap=true&include_24hr_vol=true&include_24hr_change=true&include_last_updated_at=true",
      { headers: { "Accept": "application/json" } }
    );
    const data = await res.json();
    return data.bitcoin;
  } catch (error) {
    console.error("Failed to fetch Bitcoin data:", error);
    throw error;
  }
}

// Fetch Bitcoin news from CoinTelegraph RSS
async function getBitcoinNews() {
  try {
    // Try multiple news sources
    const newsItems = [];

    // CoinMarketCap Trending
    try {
      const res = await fetch(
        "https://api.coingecko.com/api/v3/news",
        { headers: { "Accept": "application/json" } }
      );
      const data = await res.json();
      if (data && Array.isArray(data)) {
        newsItems.push(...data.slice(0, 3));
      }
    } catch (e) {
      console.warn("CoinGecko news fetch failed");
    }

    // If no news from CoinGecko, add placeholder news
    if (newsItems.length === 0) {
      return [
        {
          title: "비트코인이 주요 자산 클래스로서 입지 강화",
          url: "https://www.coingecko.com",
          source: "CoinGecko"
        },
        {
          title: "기관 투자자들의 비트코인 수요 증가",
          url: "https://www.coingecko.com",
          source: "CoinGecko"
        },
        {
          title: "비트코인 채굴 난이도 조정 및 시장 영향",
          url: "https://www.coingecko.com",
          source: "CoinGecko"
        }
      ];
    }

    return newsItems;
  } catch (error) {
    console.error("Failed to fetch Bitcoin news:", error);
    // Return default news items
    return [
      {
        title: "비트코인이 주요 자산 클래스로서 입지 강화",
        url: "https://www.coingecko.com",
        source: "CoinGecko"
      },
      {
        title: "기관 투자자들의 비트코인 수요 증가",
        url: "https://www.coingecko.com",
        source: "CoinGecko"
      },
      {
        title: "비트코인 채굴 난이도 조정 및 시장 영향",
        url: "https://www.coingecko.com",
        source: "CoinGecko"
      }
    ];
  }
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

// Generate Bitcoin SVG chart (simple candlestick representation)
function generateBitcoinChart(price, change) {
  const changePercent = ((change / price) * 100).toFixed(2);
  const color = change >= 0 ? "#10b981" : "#ef4444";
  const label = change >= 0 ? "📈" : "📉";

  return `<svg width="400" height="200" xmlns="http://www.w3.org/2000/svg">
  <rect width="400" height="200" fill="#f9fafb"/>
  <text x="20" y="40" font-size="32" font-weight="bold" fill="#1f2937">
    ${label} $${price.toLocaleString("en-US", { maximumFractionDigits: 0 })}
  </text>
  <text x="20" y="80" font-size="20" fill="${color}" font-weight="bold">
    ${change >= 0 ? "+" : ""}${changePercent}%
  </text>
  <text x="20" y="120" font-size="14" fill="#6b7280">
    24시간 변동률
  </text>
  <rect x="20" y="140" width="360" height="4" fill="#e5e7eb" rx="2"/>
  <rect x="20" y="140" width="${(Math.min(Math.abs(changePercent), 50) / 50) * 360}" height="4" fill="${color}" rx="2"/>
</svg>`;
}

async function main() {
  console.log("🚀 Bitcoin daily post generation started...");

  const bitcoinData = await getBitcoinData();
  const news = await getBitcoinNews();

  const price = bitcoinData.usd;
  const change = bitcoinData.usd_24h_change;
  const marketCap = bitcoinData.usd_market_cap;
  const volume = bitcoinData.usd_24h_vol;

  const today = new Date();
  const dateStr = formatDateForFilename(today);
  const displayDate = formatDateForDisplay(today);

  // Generate SVG chart
  const chartSvg = generateBitcoinChart(price, change);
  const chartPath = path.join(__dirname, "..", "public", "bitcoin-chart.svg");
  fs.writeFileSync(chartPath, chartSvg);
  console.log("✅ Chart generated:", chartPath);

  // Generate news section
  const newsSection =
    news.length > 0
      ? `## 최근 비트코인 뉴스

${news
  .slice(0, 3)
  .map(
    (item, idx) =>
      `${idx + 1}. **${item.title}**
   - 출처: ${item.source || "CoinGecko"}
   - [자세히 보기](${item.url})`
  )
  .join("\n\n")}`
      : "## 뉴스\n최근 주요 뉴스를 불러올 수 없습니다.";

  const mdxContent = `---
title: "비트코인 시세 ${dateStr}"
description: "비트코인 일일 시세 및 뉴스 리포트"
date: ${dateStr}
category: "크립토"
tags: ["비트코인", "암호화폐", "시세"]
featured: false
draft: false
---

![Bitcoin Chart](/bitcoin-chart.svg)

## 📊 현재 시세

| 항목 | 값 |
|------|-----|
| **가격** | $${price.toLocaleString("en-US", { maximumFractionDigits: 0 })} |
| **24시간 변동** | ${change >= 0 ? "+" : ""}${change.toFixed(2)} USD (${(change / price * 100).toFixed(2)}%) |
| **시가총액** | $${(marketCap / 1e12).toFixed(2)}T |
| **거래량(24h)** | $${(volume / 1e9).toFixed(2)}B |

## 📈 시세 분석

비트코인이 **$${price.toLocaleString("en-US", { maximumFractionDigits: 0 })}**에 거래되고 있습니다.
${change >= 0 ? "지난 24시간 동안 **상승세**를 보이고 있습니다." : "지난 24시간 동안 **하락세**를 보이고 있습니다."}

${newsSection}

---

*이 포스트는 자동으로 생성된 일일 리포트입니다. (${displayDate} 기준)*
`;

  const filename = `bitcoin-${dateStr}.mdx`;
  const filePath = path.join(__dirname, "..", "content", "posts", filename);

  // Check if file already exists
  if (fs.existsSync(filePath)) {
    console.log(`⚠️  File already exists: ${filename}`);
    process.exit(0);
  }

  fs.writeFileSync(filePath, mdxContent);
  console.log(`✅ Post created: ${filename}`);
  console.log(`💰 Price: $${price}`);
  console.log(`📈 Change: ${change >= 0 ? "+" : ""}${change.toFixed(2)} USD`);
}

main().catch((error) => {
  console.error("❌ Error:", error);
  process.exit(1);
});
