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

// Search for images via Wikimedia API
async function searchWikimediaImage(query) {
  try {
    const url = new URL('https://commons.wikimedia.org/w/api.php');
    url.searchParams.append('action', 'query');
    url.searchParams.append('list', 'allimages');
    url.searchParams.append('aisort', 'timestamp');
    url.searchParams.append('aidir', 'descending');
    url.searchParams.append('aiprop', 'url');
    url.searchParams.append('ailimit', '1');
    url.searchParams.append('aifrom', query);
    url.searchParams.append('format', 'json');
    url.searchParams.append('origin', '*');

    const res = await fetch(url.toString(), {
      headers: { 'User-Agent': 'blog-365happy365/1.0' },
    });

    if (!res.ok) return null;

    const json = await res.json();
    const images = json.query?.allimages ?? [];
    return images.length > 0 ? images[0].url : null;
  } catch (err) {
    console.error(`Error searching image for "${query}":`, err.message);
    return null;
  }
}

// Generate post content using Claude
async function generatePost() {
  const client = new Anthropic();

  const today = new Date().toLocaleDateString('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const prompt = `당신은 재미있고 실용적인 상품 소개 전문 블로거입니다. 오늘(${today})을 기준으로 흥미로운 상품 하나를 선택하여 한국어 블로그 포스트를 작성해주세요.

반드시 다음 세 카테고리 중 하나를 선택하세요:
- 재밌는아이템: 일상이 즐거워지는 유니크한 제품들
- 테크가젯: 최신 기술 제품이나 혁신적인 가제트
- 키덜트: 성인을 위한 수집욕/취미용품 (장난감, 모형, 문구 등)

다음 JSON 형식으로 반드시 작성해주세요 (문자열 값 내의 따옴표는 모두 역슬래시로 이스케이프하세요):

\`\`\`json
{
  "title": "클릭하고 싶은 한국어 제목",
  "slug": "url-friendly-english-slug",
  "description": "한국어 요약 1~2문장",
  "category": "재밌는아이템|테크가젯|키덜트",
  "tags": ["태그1", "태그2", "태그3"],
  "imageQueries": ["상품 검색어 1", "상품 검색어 2"],
  "content": "마크다운 형식 본문"
}
\`\`\`

중요: JSON 코드 블록 안의 내용만 유효한 JSON이어야 합니다. 다른 텍스트는 제외하세요.

요구사항:
- title: 한국어, 클릭하고 싶은 제목
- slug: 영문 kebab-case, URL-friendly
- description: 한국어 1~2문장 요약
- category: 반드시 "재밌는아이템", "테크가젯", "키덜트" 중 하나
- tags: 관련 주제 3개 태그 (한국어 가능)
- imageQueries: 상품 검색어 2개 (Wikimedia Commons에서 찾을 수 있는 검색어)
- content: 마크다운 형식으로 작성
  - ## 이게 뭔데? (상품 소개 및 훅)
  - ## 왜 이게 특별해? (핵심 특징, [IMAGE_1] 포함)
  - ## 이런 사람에게 추천 (구매 포인트)
  - ## 가격 & 구매처 ([IMAGE_2] 포함)
  - ## 한 줄 요약 (인상적인 한 줄 정리)
  - 친근하고 매력적인 문체
  - 마크다운만 작성, 1000~1500자`;

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 3000,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  const responseText = message.content[0].text;
  console.log('Claude response (first 500 chars):', responseText.substring(0, 500));

  // Parse JSON from code block (more lenient)
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

  // Get suffix from CLI args (am or pm)
  const suffix = process.argv[2] || 'am';
  if (!['am', 'pm'].includes(suffix)) {
    throw new Error('Invalid suffix. Use "am" or "pm".');
  }

  // KST date
  const now = new Date();
  const kstDate = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
  const yyyy = kstDate.getFullYear();
  const mm = String(kstDate.getMonth() + 1).padStart(2, '0');
  const dd = String(kstDate.getDate()).padStart(2, '0');
  const dateStr = `${yyyy}-${mm}-${dd}`;
  const filePath = join(POSTS_DIR, `product-${dateStr}-${suffix}.mdx`);

  // Idempotent check
  if (existsSync(filePath)) {
    console.log(`Post already exists: ${filePath}`);
    process.exit(0);
  }

  console.log(`Generating product post (${suffix}) with Claude...`);
  const postData = await generatePost();

  console.log(`Title: ${postData.title}`);
  console.log(`Slug: ${postData.slug}`);
  console.log(`Category: ${postData.category}`);

  // Fetch images
  console.log('Fetching images from Wikimedia...');
  const img1 = postData.imageQueries[0]
    ? await searchWikimediaImage(postData.imageQueries[0])
    : null;
  const img2 = postData.imageQueries[1]
    ? await searchWikimediaImage(postData.imageQueries[1])
    : null;

  if (img1) console.log(`✓ Image 1: ${img1}`);
  if (img2) console.log(`✓ Image 2: ${img2}`);

  // Replace image placeholders
  let body = postData.content;
  body = body.replace(
    '[IMAGE_1]',
    img1 ? `\n![${postData.title}](${img1})\n` : ''
  );
  body = body.replace('[IMAGE_2]', img2 ? `\n![상품 이미지](${img2})\n` : '');

  // Generate frontmatter with time
  const tagsStr = postData.tags
    .map((t) => `"${t}"`)
    .join(', ');

  // Set time based on suffix (am=08:00, pm=20:00)
  const time = suffix === 'am' ? '08:00:00' : '20:00:00';
  const dateWithTime = `${dateStr}T${time}`;

  const frontmatter = `---
title: "${postData.title}"
description: "${postData.description}"
date: ${dateWithTime}
category: "${postData.category}"
tags: [${tagsStr}]
featured: false
${img1 ? `coverImage: "${img1}"` : 'coverImage: ""'}
---

`;

  // Write file
  writeFileSync(filePath, frontmatter + body, 'utf-8');
  console.log(`✅ Post created: ${filePath}`);

  // Auto commit
  try {
    const { execSync } = await import('child_process');
    const relativeFilePath = filePath.replace(ROOT_DIR + '/', '');
    execSync(`git add "${relativeFilePath}"`, { cwd: ROOT_DIR });
    execSync(`git commit -m "content: add daily product post (${suffix})"`, { cwd: ROOT_DIR });
    console.log('✅ Git commit successful');
  } catch (err) {
    console.warn('⚠️ Git commit failed:', err.message);
  }
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
