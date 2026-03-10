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

// Search for images via Wikipedia API
async function searchWikimediaImage(query) {
  try {
    const url = new URL('https://en.wikipedia.org/w/api.php');
    url.searchParams.append('action', 'query');
    url.searchParams.append('generator', 'search');
    url.searchParams.append('gsrsearch', query);
    url.searchParams.append('prop', 'pageimages');
    url.searchParams.append('piprop', 'thumbnail');
    url.searchParams.append('pithumbsize', '400');
    url.searchParams.append('format', 'json');
    url.searchParams.append('origin', '*');

    const res = await fetch(url.toString(), {
      headers: { 'User-Agent': 'blog-365happy365/1.0' },
    });

    if (!res.ok) return null;

    const json = await res.json();
    const pages = Object.values(json.query?.pages ?? {});
    const page = pages.find((p) => p.thumbnail);

    return page?.thumbnail?.source ?? null;
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

  const prompt = `당신은 중동 정치, 역사, 문화 전문 블로그 작가입니다. 오늘(${today}) 중동에서 일어난 중요한 사건, 역사적 배경, 지정학적 이슈, 또는 문화·종교적 주제 중 하나를 선택하여 한국어 블로그 포스트를 작성해주세요. 팔레스타인-이스라엘, 이란-미국, 사우디-UAE, 쿠르드 문제, 이라크, 시리아, 레바논, 이슬람 문화 등 다양한 주제 중에서 선택 가능합니다.

다음 JSON 형식으로 반드시 작성해주세요 (문자열 값 내의 따옴표는 모두 역슬래시로 이스케이프하세요):

\`\`\`json
{
  "title": "클릭하고 싶은 한국어 제목",
  "slug": "url-friendly-english-slug",
  "description": "한국어 요약 1~2문장",
  "tags": ["태그1", "태그2", "태그3"],
  "imageQueries": ["English Wikipedia search query 1", "English Wikipedia search query 2"],
  "relatedWorks": [
    { "title": "영화/드라마 제목 (원제)", "year": 2020, "type": "영화" },
    { "title": "다른 작품", "year": 2019, "type": "드라마" }
  ],
  "content": "마크다운 형식 본문"
}
\`\`\`

중요: JSON 코드 블록 안의 내용만 유효한 JSON이어야 합니다. 다른 텍스트는 제외하세요.

요구사항:
- title: 한국어, 흥미로운 제목
- slug: 영문 kebab-case, URL-friendly
- description: 한국어 1~2문장 요약
- tags: 관련 주제 3개 태그 (한국어 가능)
- imageQueries: 영문 Wikipedia 검색어 2개
- relatedWorks: 이 이슈와 관련된 영화, 드라마, 다큐멘터리 2~3편의 배열. 각 항목은 { "title": "한국제목 (원제)", "year": 개봉연도, "type": "영화|드라마|다큐" } 형식
- content: 마크다운 형식으로 작성
  - ## 소제목으로 구조화
  - 흐름: 훅(흥미로운 오프닝) → 배경·상황 [IMAGE_1] → 사건 전개·분석 → 의미·영향 [IMAGE_2] → 🎬 영화·드라마 속 중동 → 여운 있는 마무리
  - "🎬 영화·드라마 속 중동" 섹션에서 relatedWorks의 작품들을 언급하고, 어떤 장면이나 스토리가 이 이슈와 연결되는지 설명. 작품이 실제 상황과 다른 점(픽션 요소)이 있다면 간략히 언급
  - 친근하고 균형잡힌 문체
  - 마크다운만 작성, 1200~1800자`;

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

  // KST date
  const now = new Date();
  const kstDate = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
  const yyyy = kstDate.getFullYear();
  const mm = String(kstDate.getMonth() + 1).padStart(2, '0');
  const dd = String(kstDate.getDate()).padStart(2, '0');
  const dateStr = `${yyyy}-${mm}-${dd}`;
  const filePath = join(POSTS_DIR, `middle-east-${dateStr}.mdx`);

  // Idempotent check
  if (existsSync(filePath)) {
    console.log(`Post already exists: ${filePath}`);
    process.exit(0);
  }

  console.log('Generating Middle East issue post with Claude...');
  const postData = await generatePost();

  console.log(`Title: ${postData.title}`);
  console.log(`Slug: ${postData.slug}`);

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
  body = body.replace('[IMAGE_2]', img2 ? `\n![관련 이미지](${img2})\n` : '');

  // Generate frontmatter
  const tagsStr = postData.tags
    .map((t) => `"${t}"`)
    .join(', ');

  // Generate relatedWorks YAML
  let relatedWorksStr = '';
  if (postData.relatedWorks && Array.isArray(postData.relatedWorks) && postData.relatedWorks.length > 0) {
    relatedWorksStr = 'relatedWorks:\n';
    postData.relatedWorks.forEach((work) => {
      relatedWorksStr += `  - title: "${work.title}"\n`;
      relatedWorksStr += `    year: ${work.year}\n`;
      relatedWorksStr += `    type: "${work.type}"\n`;
    });
  }

  const frontmatter = `---
title: "${postData.title}"
description: "${postData.description}"
date: ${dateStr}
category: "중동"
tags: [${tagsStr}]
featured: false
${img1 ? `coverImage: "${img1}"` : 'coverImage: ""'}
${relatedWorksStr}---

`;

  // Write file
  writeFileSync(filePath, frontmatter + body, 'utf-8');
  console.log(`✅ Post created: ${filePath}`);

  // Auto commit
  try {
    const { execSync } = await import('child_process');
    const relativeFilePath = filePath.replace(ROOT_DIR + '/', '');
    execSync(`git add "${relativeFilePath}"`, { cwd: ROOT_DIR });
    execSync(`git commit -m "content: add daily Middle East post"`, { cwd: ROOT_DIR });
    console.log('✅ Git commit successful');
  } catch (err) {
    console.warn('⚠️ Git commit failed:', err.message);
  }
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
