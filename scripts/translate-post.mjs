#!/usr/bin/env node
/**
 * 한국어 MDX 포스트를 영어로 자동 번역하는 스크립트
 *
 * 사용법:
 *   node scripts/translate-post.mjs <파일경로>
 *   node scripts/translate-post.mjs content/posts/my-post.mdx
 *   node scripts/translate-post.mjs content/posts/my-post.mdx --commit
 *
 * 결과: 같은 디렉토리에 <원본파일명>.en.mdx 파일 생성
 */

import Anthropic from "@anthropic-ai/sdk";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname, basename, extname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, "..");

// Load .env.local
function loadEnvLocal() {
  const envPath = join(ROOT_DIR, ".env.local");
  if (existsSync(envPath)) {
    const lines = readFileSync(envPath, "utf-8").split("\n");
    for (const line of lines) {
      const match = line.match(/^([^=#\s][^=]*)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim().replace(/^["']|["']$/g, "");
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    }
  }
}

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) throw new Error("Invalid frontmatter");

  const frontmatterRaw = match[1];
  const body = match[2];

  // Simple YAML parsing
  const frontmatter = {};
  let currentKey = null;
  for (const line of frontmatterRaw.split("\n")) {
    const kvMatch = line.match(/^(\w+):\s*(.*)$/);
    if (kvMatch) {
      currentKey = kvMatch[1];
      let value = kvMatch[2].trim();
      // Handle arrays
      if (value.startsWith("[")) {
        try {
          frontmatter[currentKey] = JSON.parse(value);
        } catch {
          frontmatter[currentKey] = value;
        }
      } else if (value === "true") {
        frontmatter[currentKey] = true;
      } else if (value === "false") {
        frontmatter[currentKey] = false;
      } else if (value.startsWith('"') && value.endsWith('"')) {
        frontmatter[currentKey] = value.slice(1, -1);
      } else {
        frontmatter[currentKey] = value;
      }
    }
  }

  return { frontmatter, body, frontmatterRaw };
}

async function translatePost(filePath) {
  loadEnvLocal();

  const fullPath = filePath.startsWith("/")
    ? filePath
    : join(ROOT_DIR, filePath);

  if (!existsSync(fullPath)) {
    throw new Error(`File not found: ${fullPath}`);
  }

  const content = readFileSync(fullPath, "utf-8");
  const { frontmatter, body } = parseFrontmatter(content);

  // Build output path: same name with .en.mdx
  const ext = extname(fullPath);
  const base = basename(fullPath, ext);
  const outPath = join(dirname(fullPath), `${base}.en${ext}`);

  if (existsSync(outPath)) {
    console.log(`English version already exists: ${outPath}`);
    return outPath;
  }

  console.log(`Translating: ${basename(fullPath)} → ${basename(outPath)}`);

  const client = new Anthropic();

  const prompt = `You are a professional translator. Translate the following Korean blog post to natural, fluent English.

## Rules:
1. Translate the title, description, and body content to English
2. Keep all markdown formatting intact (headings, links, images, code blocks, etc.)
3. Keep proper nouns, brand names, and technical terms as-is
4. Translate tags to English equivalents
5. Translate the category name to English
6. Keep URLs, image paths, and code unchanged
7. Make the translation sound natural, not literal
8. Return ONLY the JSON below, no other text

## Input:
- Title: ${frontmatter.title}
- Description: ${frontmatter.description}
- Category: ${frontmatter.category}
- Tags: ${JSON.stringify(frontmatter.tags || [])}
- Body:
${body}

## Output format (JSON):
\`\`\`json
{
  "title": "English title",
  "description": "English description",
  "category": "English category",
  "tags": ["tag1", "tag2"],
  "body": "Full translated markdown body"
}
\`\`\``;

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 8000,
    messages: [{ role: "user", content: prompt }],
  });

  const responseText = message.content[0].text;

  // Parse JSON
  let jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/);
  if (!jsonMatch) jsonMatch = responseText.match(/```\n([\s\S]*?)\n```/);
  if (!jsonMatch) jsonMatch = responseText.match(/\{[\s\S]*\}/);

  if (!jsonMatch) {
    throw new Error("Failed to extract JSON from translation response");
  }

  const translated = JSON.parse(jsonMatch[1] || jsonMatch[0]);

  // Build English frontmatter
  const tagsStr = (translated.tags || []).map((t) => `"${t}"`).join(", ");
  const coverImageLine = frontmatter.coverImage
    ? `coverImage: "${frontmatter.coverImage}"\n`
    : "";

  const englishContent = `---
title: "${translated.title.replace(/"/g, '\\"')}"
description: "${translated.description.replace(/"/g, '\\"')}"
date: ${frontmatter.date}
category: "${translated.category}"
tags: [${tagsStr}]
featured: ${frontmatter.featured || false}
${coverImageLine}locale: "en"
---

${translated.body}
`;

  writeFileSync(outPath, englishContent, "utf-8");
  console.log(`✅ English post created: ${outPath}`);
  return outPath;
}

async function main() {
  const args = process.argv.slice(2);
  const filePaths = args.filter((a) => !a.startsWith("--"));
  const shouldCommit = args.includes("--commit");

  if (filePaths.length === 0) {
    console.error("Usage: node scripts/translate-post.mjs <file-path> [--commit]");
    console.error("  e.g. node scripts/translate-post.mjs content/posts/my-post.mdx");
    process.exit(1);
  }

  const createdFiles = [];

  for (const filePath of filePaths) {
    try {
      const outPath = await translatePost(filePath);
      createdFiles.push(outPath);
    } catch (err) {
      console.error(`Error translating ${filePath}:`, err.message);
    }
  }

  if (shouldCommit && createdFiles.length > 0) {
    try {
      const { execSync } = await import("child_process");
      for (const file of createdFiles) {
        const relPath = file.replace(ROOT_DIR + "/", "");
        execSync(`git add "${relPath}"`, { cwd: ROOT_DIR });
      }
      execSync(`git commit -m "content: add English translations"`, {
        cwd: ROOT_DIR,
      });
      console.log("✅ Git commit successful");
    } catch (err) {
      console.warn("⚠️ Git commit failed:", err.message);
    }
  }
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
