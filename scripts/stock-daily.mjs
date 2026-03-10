#!/usr/bin/env node
import Anthropic from '@anthropic-ai/sdk';
import { writeFileSync, existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, '..');
const POSTS_DIR = join(ROOT_DIR, 'content/posts');

// Load .env.local manually (LaunchAgent doesn't inherit shell env)
function loadEnvLocal() {
  const envPath = join(ROOT_DIR, '.env.local');
  if (existsSync(envPath)) {
    const lines = readFileSync(envPath, 'utf-8').split('\n');
    for (const line of lines) {
      const match = line.match(/^([^=#\s][^=]*)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim().replace(/^["']|["']$/g, '');
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    }
  }
}

// Check if today is weekend (KST)
function isWeekend() {
  const now = new Date();
  const kstDate = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
  const dayOfWeek = kstDate.getDay(); // 0=Sunday, 6=Saturday
  return dayOfWeek === 0 || dayOfWeek === 6;
}

// Fetch stock data from Yahoo Finance API
async function fetchStockData(ticker) {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'blog-365happy365/1.0' },
    });

    if (!res.ok) {
      console.warn(`⚠️ Failed to fetch ${ticker}: ${res.status}`);
      return null;
    }

    const json = await res.json();
    const result = json.chart?.result?.[0];
    if (!result) return null;

    const meta = result.meta;
    const price = meta.regularMarketPrice || 0;
    const previousClose = meta.previousClose || 0;
    const change = price - previousClose;
    const changePercent = ((change / previousClose) * 100).toFixed(2);

    return {
      ticker,
      price,
      previousClose,
      change,
      changePercent,
    };
  } catch (err) {
    console.warn(`⚠️ Error fetching ${ticker}:`, err.message);
    return null;
  }
}

// Generate post content using Claude
async function generatePost(kospiData, kosdaqData) {
  const client = new Anthropic();

  const today = new Date().toLocaleDateString('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const kospiInfo = kospiData
    ? `코스피: ${kospiData.price.toFixed(2)} (${kospiData.change >= 0 ? '+' : ''}${kospiData.change.toFixed(2)}, ${kospiData.changePercent >= 0 ? '+' : ''}${kospiData.changePercent}%)`
    : '코스피: 데이터 불가';

  const kosdaqInfo = kosdaqData
    ? `코스닥: ${kosdaqData.price.toFixed(2)} (${kosdaqData.change >= 0 ? '+' : ''}${kosdaqData.change.toFixed(2)}, ${kosdaqData.changePercent >= 0 ? '+' : ''}${kosdaqData.changePercent}%)`
    : '코스닥: 데이터 불가';

  const prompt = `당신은 경제 전문 블로거입니다. 오늘(${today})의 한국 주식시장 시황 분석 포스트를 작성해주세요.

실제 마감 시황:
- ${kospiInfo}
- ${kosdaqInfo}

다음 JSON 형식으로 반드시 작성해주세요 (문자열 값 내의 따옴표는 모두 역슬래시로 이스케이프하세요):

\`\`\`json
{
  "title": "한국어 제목 예시: YYYY-MM-DD 증시 마감 시황",
  "slug": "stock-market-YYYY-MM-DD",
  "description": "한국어 요약 1~2문장",
  "tags": ["코스피", "코스닥", "주식", "시황"],
  "content": "마크다운 형식 본문"
}
\`\`\`

중요: JSON 코드 블록 안의 내용만 유효한 JSON이어야 합니다. 다른 텍스트는 제외하세요.

요구사항:
- title: 한국어, 예: "${today.split(' ').slice(1).join(' ')} 증시 마감 시황"
- slug: "stock-market-YYYY-MM-DD" 형식 (오늘 날짜 영문 ISO 형식)
- description: 한국어 1~2문장 요약
- tags: ["코스피", "코스닥", "주식", "시황"] 필수 포함
- content: 마크다운 형식으로 작성
  - ## 오늘의 시황 한 줄 요약 (전체 분위기)
  - ## 지수 동향 (코스피/코스닥 상세 분석)
  - ## 주요 이슈 (오늘 시장에 영향 준 뉴스)
  - ## 업종별 흐름 (강세/약세 섹터)
  - ## 내일 전망 (단기 주의사항)
  - ## 투자 유의사항 (면책 문구)
  - 친근하고 정보적인 문체
  - 마크다운만 작성, 800~1200자`;

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2500,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  const responseText = message.content[0].text;
  console.log('Claude response (first 400 chars):', responseText.substring(0, 400));

  // Parse JSON from code block
  let jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/);
  if (!jsonMatch) {
    jsonMatch = responseText.match(/```\n([\s\S]*?)\n```/);
  }
  if (!jsonMatch) {
    jsonMatch = responseText.match(/\{[\s\S]*\}/);
  }

  if (!jsonMatch) {
    throw new Error('Failed to extract JSON from Claude response. Response: ' + responseText.substring(0, 200));
  }

  try {
    const data = JSON.parse(jsonMatch[1] || jsonMatch[0]);
    return data;
  } catch (err) {
    console.error('JSON content:', (jsonMatch[1] || jsonMatch[0]).substring(0, 300));
    throw new Error('Failed to parse JSON: ' + err.message);
  }
}

async function main() {
  loadEnvLocal();

  // Check if weekend (skip)
  if (isWeekend()) {
    console.log('⏭️  Skipping: weekends are not trading days');
    process.exit(0);
  }

  // KST date
  const now = new Date();
  const kstDate = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
  const yyyy = kstDate.getFullYear();
  const mm = String(kstDate.getMonth() + 1).padStart(2, '0');
  const dd = String(kstDate.getDate()).padStart(2, '0');
  const dateStr = `${yyyy}-${mm}-${dd}`;
  const filePath = join(POSTS_DIR, `stock-market-${dateStr}.mdx`);

  // Idempotent check
  if (existsSync(filePath)) {
    console.log(`📝 Post already exists: ${filePath}`);
    process.exit(0);
  }

  console.log(`📊 Fetching stock data (KOSPI, KOSDAQ)...`);
  const kospiData = await fetchStockData('^KS11');
  const kosdaqData = await fetchStockData('^KQ11');

  if (!kospiData && !kosdaqData) {
    throw new Error('Failed to fetch both KOSPI and KOSDAQ data');
  }

  console.log(`✓ KOSPI: ${kospiData?.price.toFixed(2)} (${kospiData?.changePercent}%)`);
  console.log(`✓ KOSDAQ: ${kosdaqData?.price.toFixed(2)} (${kosdaqData?.changePercent}%)`);

  console.log(`🤖 Generating market analysis with Claude...`);
  const postData = await generatePost(kospiData, kosdaqData);

  console.log(`Title: ${postData.title}`);
  console.log(`Slug: ${postData.slug}`);

  // Use content as-is (no image replacement needed for financial posts)
  const body = postData.content;

  // Generate frontmatter
  const tagsStr = postData.tags
    .map((t) => `"${t}"`)
    .join(', ');

  const frontmatter = `---
title: "${postData.title}"
description: "${postData.description}"
date: ${dateStr}
category: "경제분석"
tags: [${tagsStr}]
featured: false
coverImage: ""
---

`;

  // Write file
  writeFileSync(filePath, frontmatter + body, 'utf-8');
  console.log(`✅ Stock market post created: ${filePath}`);

  // Auto commit
  try {
    const { execSync } = await import('child_process');
    const relativeFilePath = filePath.replace(ROOT_DIR + '/', '');
    execSync(`git add "${relativeFilePath}"`, { cwd: ROOT_DIR });
    execSync(`git commit -m "content: add daily stock market post"`, { cwd: ROOT_DIR });
    console.log('✅ Git commit successful');
  } catch (err) {
    console.warn('⚠️ Git commit failed:', err.message);
  }
}

main().catch((err) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
