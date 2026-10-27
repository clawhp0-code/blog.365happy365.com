// Repairs double-quoted frontmatter scalars whose inner quotes were left unescaped
// (e.g. `title: ""인용" — 제목"`, `description: "... "케이준 해군" ..."`), which break
// Contentlayer's YAML parse. Runs before `next build` (see package.json "prebuild").
// Only posts dated on/after FM_CUTOFF are touched; older broken posts stay excluded.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const POSTS_DIR = 'content/posts';
const CUTOFF = process.env.FM_CUTOFF ?? '2026-10-28';
const DRY = process.argv.includes('--dry');
const KEYS = ['title', 'description'];

function isValidJsonString(value) {
  try {
    return typeof JSON.parse(value) === 'string';
  } catch {
    return false;
  }
}

function repair(value) {
  if (!value.startsWith('"') || isValidJsonString(value)) return null;
  let inner = value.slice(1);
  if (inner.endsWith('"')) inner = inner.slice(0, -1);
  return JSON.stringify(inner);
}

let fixed = 0;
for (const name of readdirSync(POSTS_DIR)) {
  if (!/\.mdx?$/.test(name)) continue;
  const date = name.match(/(\d{4}-\d{2}-\d{2})(?:\.en)?\.mdx?$/)?.[1];
  if (!date || date < CUTOFF) continue;

  const path = join(POSTS_DIR, name);
  const text = readFileSync(path, 'utf8');
  const m = text.match(/^---\n([\s\S]*?)\n---/);
  if (!m) continue;

  let next = m[1];
  for (const key of KEYS) {
    next = next.replace(new RegExp(`^${key}: (.*)$`, 'm'), (line, value) => {
      const repaired = repair(value.trim());
      return repaired ? `${key}: ${repaired}` : line;
    });
  }
  if (next === m[1]) continue;

  fixed++;
  console.log(`${DRY ? '[dry] ' : ''}fixed frontmatter: ${name}`);
  if (!DRY) writeFileSync(path, text.replace(m[1], next));
}
console.log(`fix-frontmatter: ${fixed} file(s) ${DRY ? 'would be ' : ''}repaired (cutoff ${CUTOFF})`);
