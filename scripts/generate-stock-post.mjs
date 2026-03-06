#!/usr/bin/env node
import Anthropic from '@anthropic-ai/sdk';
import { writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const POSTS_DIR = join(__dirname, '../content/posts');

async function fetchIndex(symbol) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=2d`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
  });
  const json = await res.json();
  const result = json?.chart?.result?.[0];
  if (!result) throw new Error(`No data for ${symbol}`);
  const meta = result.meta;
  const price = meta.regularMarketPrice;
  const prev = meta.previousClose ?? meta.chartPreviousClose;
  const change = price - prev;
  const changePct = (change / prev) * 100;
  return { symbol, price, prev, change, changePct };
}

async function getMarketData() {
  const indices = [
    { name: 'S&P 500', symbol: '^GSPC' },
    { name: 'NASDAQ', symbol: '^IXIC' },
    { name: '다우존스', symbol: '^DJI' },
    { name: '러셀 2000', symbol: '^RUT' },
    { name: 'VIX (공포지수)', symbol: '^VIX' },
  ];

  const results = await Promise.all(
    indices.map(async ({ name, symbol }) => {
      try {
        const data = await fetchIndex(symbol);
        return { name, ...data };
      } catch {
        return { name, symbol, error: true };
      }
    })
  );

  return results;
}

function formatData(data) {
  return data
    .filter((d) => !d.error)
    .map((d) => {
      const sign = d.change >= 0 ? '+' : '';
      return `- ${d.name}: ${d.price.toLocaleString('en-US', { maximumFractionDigits: 2 })} (${sign}${d.change.toFixed(2)}, ${sign}${d.changePct.toFixed(2)}%)`;
    })
    .join('\n');
}

async function generatePost(marketData) {
  const client = new Anthropic();
  const dataStr = formatData(marketData);

  const today = new Date().toLocaleDateString('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const message = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 2000,
    messages: [
      {
        role: 'user',
        content: `오늘(${today}) 미국 주식 시장 시황 데이터입니다:

${dataStr}

위 데이터를 바탕으로 한국어 블로그 포스트 본문을 작성해주세요.

요구사항:
- 마크다운 형식 (## 소제목 사용)
- 지수별 간단한 분석
- 전반적인 시장 분위기 해석
- 투자자들이 주목해야 할 포인트
- 친근하고 읽기 쉬운 문체
- 분량: 500~700자
- MDX frontmatter는 제외하고 본문만 작성
- 면책 조항 한 줄로 마무리 (투자 권유 아님)`,
      },
    ],
  });

  return message.content[0].text;
}

async function main() {
  // 한국 시간 기준 날짜
  const now = new Date();
  const kstDate = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
  const yyyy = kstDate.getFullYear();
  const mm = String(kstDate.getMonth() + 1).padStart(2, '0');
  const dd = String(kstDate.getDate()).padStart(2, '0');
  const dateStr = `${yyyy}-${mm}-${dd}`;
  const slug = `us-stock-market-${dateStr}`;
  const filePath = join(POSTS_DIR, `${slug}.mdx`);

  if (existsSync(filePath)) {
    console.log(`Post already exists: ${filePath}`);
    process.exit(0);
  }

  console.log('Fetching market data...');
  const marketData = await getMarketData();
  console.log('Market data:', formatData(marketData));

  console.log('Generating post with Claude...');
  const body = await generatePost(marketData);

  // 주요 지수 등락 요약 (description용)
  const sp500 = marketData.find((d) => d.name === 'S&P 500');
  const nasdaq = marketData.find((d) => d.name === 'NASDAQ');
  const spStr = sp500
    ? `S&P 500 ${sp500.changePct >= 0 ? '▲' : '▼'}${Math.abs(sp500.changePct).toFixed(2)}%`
    : '';
  const nqStr = nasdaq
    ? `NASDAQ ${nasdaq.changePct >= 0 ? '▲' : '▼'}${Math.abs(nasdaq.changePct).toFixed(2)}%`
    : '';

  const frontmatter = `---
title: "미국 주식 시황 ${yyyy}년 ${mm}월 ${dd}일"
description: "${dateStr} 미국 증시 마감 시황. ${spStr}, ${nqStr} 등 주요 지수 및 시장 분위기 요약."
date: ${dateStr}
category: "주식"
tags: ["미국주식", "시황", "S&P500", "NASDAQ", "다우존스"]
featured: false
---

`;

  writeFileSync(filePath, frontmatter + body, 'utf-8');
  console.log(`✅ Post created: ${filePath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
