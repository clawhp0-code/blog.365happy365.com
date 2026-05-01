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

// Validate that the generated post is actually about US history
async function validateUsHistory(client, title, description) {
  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 100,
    messages: [
      {
        role: 'user',
        content: `다음 블로그 포스트 제목과 설명이 미국(United States of America)의 역사와 직접적으로 관련된 주제인지 판단해주세요.
미국 역사로 인정되는 범위: 미국 독립 이후 또는 이전 미국 식민지 시대의 사건, 미국 내에서 일어난 사건, 미국인 인물, 미국 정치/사회/문화사.
미국 역사로 인정되지 않는 범위: 외국 인물이나 사건 (비록 같은 시기라도), 세계대전 관련이지만 미국이 주인공이 아닌 사건.

제목: "${title}"
설명: "${description}"

"YES" 또는 "NO"로만 답하세요.`,
      },
    ],
  });

  const answer = message.content[0].text.trim().toUpperCase();
  return answer.startsWith('YES');
}

// Topic dedup log — used to avoid Claude picking the same topic across the day's runs
const TOPIC_LOG_PATH = join(ROOT_DIR, 'video_output/us_history_log.json');

function loadTopicLog() {
  try {
    if (existsSync(TOPIC_LOG_PATH)) {
      return JSON.parse(readFileSync(TOPIC_LOG_PATH, 'utf-8'));
    }
  } catch (err) {
    console.warn('Failed to read topic log:', err.message);
  }
  return [];
}

function saveTopicLog(log) {
  try {
    writeFileSync(TOPIC_LOG_PATH, JSON.stringify(log, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Failed to write topic log:', err.message);
  }
}

// Generate post content using Claude
async function generatePost(retryWithStrictPrompt = false, usedTitles = []) {
  const client = new Anthropic();

  const today = new Date().toLocaleDateString('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const strictWarning = retryWithStrictPrompt
    ? `\n\n⚠️ 중요 경고: 반드시 미국(United States of America)과 직접적으로 관련된 사건/인물만 선택하세요. 외국 인물(예: 무솔리니, 히틀러, 처칠 등)이나 미국이 주인공이 아닌 사건은 절대 선택하지 마세요. 미국인이 주도한 사건, 미국 내 사건, 미국 역사의 전환점이 된 사건에만 집중하세요.`
    : '';

  const usedBlock = usedTitles.length > 0
    ? `\n\n이미 사용한 주제(중복 금지, 최근 30개):\n${usedTitles.slice(-30).map((t) => `- ${t}`).join('\n')}\n\n위 목록과 다른 새로운 주제를 선택하세요.`
    : '';

  const prompt = `당신은 미국 역사 전문 블로그 작가입니다. 오늘(${today}) 미국(United States of America) 역사에서 일어난 중요한 사건이나 미국인 인물에 대한 이야기를 선택하여 한국어 블로그 포스트를 작성해주세요.

반드시 미국과 직접적으로 관련된 주제만 선택하세요. 외국 인물이나 비미국 사건은 제외합니다.${strictWarning}${usedBlock}

# 🎯 주제 선정 절대 규칙 — "인물 · 서사 · 반전"

YouTube 쇼츠 통계 분석 결과, **인물 중심 + 반전 + 인과 관계**가 있는 스토리는 평균보다 **5~10배** 더 잘 됩니다. 다음 셋을 모두 만족하는 주제만 선택하세요:

## ① 인물 (Character) — 한 사람의 이름
- ✅ 좋은 예: "로즈 그린하우" (남군 스파이 미인), "제이콥 리스" (사진가), "해리엇 비처 스토우" (소설가)
- ❌ 나쁜 예: "1865년 4월 25일", "워싱턴이 마주한 진짜 위기" (광범위한 시기·인물 모호)
- 가능하면 잘 알려지지 않은 이름 OR 잘 알려진 인물의 잘 모르던 면

## ② 반전 (Twist) — 예상과 다른 충격 사실
- ✅ "사교계 미인이 사실은 적군 스파이였다"
- ✅ "한 권의 소설이 전쟁을 일으켰다"
- ✅ "총탄이 아니라 의사가 대통령을 죽였다"
- ✅ "노예가 직접 자기 몸을 사서 자유인이 됐다"
- ❌ "X년에 X가 일어났다" (반전 0)

## ③ 인과 (Consequence) — 한 행동 → 큰 결과
- ✅ "그 한 명의 결정이 → 미국을 둘로 갈랐다"
- ✅ "그 한 장의 사진이 → 13년 뒤 셋방법을 만들었다"
- 단순 사건 발생만 나열 금지

## 🚫 절대 금지 패턴

- "X년 X월 X일에 무엇이 일어났습니다" (날짜 나열 시작)
- "X의 죽음 이후" / "그 이후" (모호한 후일담)
- "X가 마주한 위기" (광범위·추상)
- 여러 인물·사건을 동시에 다루는 백과사전식 정리

## ✏️ 제목 패턴 (반드시 다음 중 하나)

1. **반전 한 문장**: "한 권의 소설이 나라를 갈랐다 — 엉클 톰스 캐빈"
2. **이중 정체성**: "사교계 미인이 적군의 스파이였다 — 로즈 그린하우의 이중생활"
3. **수치 충격**: "도서관 2,500개를 지은 남자 — 앤드루 카네기"
4. **결정적 순간**: "제퍼슨이 쓴 문장 — 독립선언서와 1776년 7월 4일"

다음 JSON 형식으로 반드시 작성해주세요 (문자열 값 내의 따옴표는 모두 역슬래시로 이스케이프하세요):

\`\`\`json
{
  "title": "클릭하고 싶은 한국어 제목",
  "slug": "url-friendly-english-slug",
  "description": "한국어 요약 1~2문장",
  "tags": ["태그1", "태그2", "태그3"],
  "imageQueries": ["English Wikipedia search query 1", "English Wikipedia search query 2"],
  "relatedWorks": [
    { "title": "링컨 (Lincoln)", "year": 2012, "type": "영화" },
    { "title": "Roots", "year": 1977, "type": "드라마" }
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
- relatedWorks: 이 사건/인물과 관련된 영화, 드라마, 다큐멘터리 2~3편의 배열. 각 항목은 { "title": "한국제목 (원제)", "year": 개봉연도, "type": "영화|드라마|다큐" } 형식
- content: 마크다운 형식으로 작성
  - ## 소제목으로 구조화
  - 흐름: 훅(흥미로운 오프닝) → 역사 배경 [IMAGE_1] → 사건 전개 → 의미·영향 [IMAGE_2] → 🎬 영화·드라마 속 이 역사 → 여운 있는 마무리
  - "🎬 영화·드라마 속 이 역사" 섹션에서 relatedWorks의 작품들을 언급하고, 어떤 장면이나 스토리가 이 역사와 연결되는지 설명. 작품이 실제 역사와 다른 점(픽션 요소)이 있다면 간략히 언급
  - 친근하고 매력적인 문체
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

  // KST date + hour for frontmatter timestamp
  const now = new Date();
  const kstDate = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
  const yyyy = kstDate.getFullYear();
  const mm = String(kstDate.getMonth() + 1).padStart(2, '0');
  const dd = String(kstDate.getDate()).padStart(2, '0');
  const HH = String(kstDate.getHours()).padStart(2, '0');
  const MM = String(kstDate.getMinutes()).padStart(2, '0');
  const dateStr = `${yyyy}-${mm}-${dd}`;

  // Topic dedup log
  const topicLog = loadTopicLog();
  const usedTitles = topicLog.map((e) => e.title).filter(Boolean);

  console.log('Generating US history post with Claude...');
  let postData = await generatePost(false, usedTitles);
  console.log(`Title: ${postData.title}`);
  console.log(`Slug: ${postData.slug}`);

  // Validate topic is actually US history
  const validationClient = new Anthropic();
  const isUsHistory = await validateUsHistory(validationClient, postData.title, postData.description);
  if (!isUsHistory) {
    console.warn(`⚠️ 생성된 포스트가 미국 역사 주제가 아닙니다: "${postData.title}"`);
    console.log('🔄 미국 역사 주제로 재생성합니다...');
    postData = await generatePost(true, usedTitles);
    console.log(`재생성 Title: ${postData.title}`);
    const isUsHistoryRetry = await validateUsHistory(validationClient, postData.title, postData.description);
    if (!isUsHistoryRetry) {
      throw new Error(`재생성 후에도 미국 역사 주제가 아닙니다: "${postData.title}". 수동으로 확인이 필요합니다.`);
    }
    console.log('✅ 미국 역사 주제 검증 통과 (재생성)');
  } else {
    console.log('✅ 미국 역사 주제 검증 통과');
  }

  // Build slug-based filename and check idempotency
  const safeSlug = String(postData.slug || '').toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/^-+|-+$/g, '');
  if (!safeSlug) {
    throw new Error('Claude가 빈 slug를 반환했습니다.');
  }
  const filePath = join(POSTS_DIR, `us-history-${safeSlug}-${dateStr}.mdx`);
  if (existsSync(filePath)) {
    console.log(`Post already exists (slug collision): ${filePath} — skipping`);
    process.exit(0);
  }

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

  // Generate frontmatter with time
  const tagsStr = postData.tags
    .map((t) => `"${t}"`)
    .join(', ');

  // Use actual KST run time (HH:MM) so multiple posts/day order correctly
  const dateWithTime = `${dateStr}T${HH}:${MM}:00`;

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
date: ${dateWithTime}
category: "미국역사"
tags: [${tagsStr}]
featured: false
${img1 ? `coverImage: "${img1}"` : 'coverImage: ""'}
${relatedWorksStr}---

`;

  // Write file
  writeFileSync(filePath, frontmatter + body, 'utf-8');
  console.log(`✅ Post created: ${filePath}`);

  // Update topic dedup log (keep last 200 entries)
  topicLog.push({
    date: dateStr,
    time: `${HH}:${MM}`,
    slug: safeSlug,
    title: postData.title,
  });
  saveTopicLog(topicLog.slice(-200));

  // Auto-translate to English
  try {
    const { execSync } = await import('child_process');
    const relativeFilePath = filePath.replace(ROOT_DIR + '/', '');
    console.log('Translating to English...');
    execSync(`node scripts/translate-post.mjs "${relativeFilePath}"`, { cwd: ROOT_DIR, stdio: 'inherit' });
    console.log('✅ English translation complete');
  } catch (err) {
    console.warn('⚠️ English translation failed:', err.message);
  }

  // Auto commit
  try {
    const { execSync } = await import('child_process');
    execSync(`git add content/posts/`, { cwd: ROOT_DIR });
    execSync(`git commit -m "content: add daily US history post"`, { cwd: ROOT_DIR });
    console.log('✅ Git commit successful');
  } catch (err) {
    console.warn('⚠️ Git commit failed:', err.message);
  }
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
