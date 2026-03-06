#!/usr/bin/env node
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { format } from "date-fns";

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("사용법: node scripts/new-post.mjs <slug>");
  console.error("예: node scripts/new-post.mjs my-new-post");
  process.exit(1);
}

const slug = args[0].toLowerCase().replace(/\s+/g, "-");
const today = format(new Date(), "yyyy-MM-dd");
const postsDir = join(process.cwd(), "content", "posts");

mkdirSync(postsDir, { recursive: true });

const filePath = join(postsDir, `${slug}.mdx`);
const content = `---
title: "${slug.replace(/-/g, " ")}"
description: "설명을 입력하세요"
date: ${today}
category: "미분류"
tags: []
featured: false
---

## 소제목

여기에 내용을 작성하세요.
`;

writeFileSync(filePath, content, "utf-8");
console.log(`✅ 새 포스트 생성: ${filePath}`);
