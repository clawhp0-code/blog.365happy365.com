#!/usr/bin/env python3
"""
US Heartwarming Story Auto Pipeline
매일 11:30 실행:
  1. Claude → 실제 미국 감동 이야기 생성 (KO + EN MDX)
  2. Git commit & push
  3. Wikipedia Commons 실사진 검색
  4. YouTube Shorts 생성 (1분 미만)
  5. 텔레그램 파일 전송
  6. YouTube 업로드
"""

import io, json, os, re, subprocess, sys, time
from datetime import datetime
from pathlib import Path

import anthropic
import requests

# ─── 설정 ────────────────────────────────────────────────────
REPO_DIR          = Path(__file__).parent
POSTS_DIR         = REPO_DIR / "content/posts"
VIDEO_OUTPUT      = REPO_DIR / "video_output"
LOG_FILE          = VIDEO_OUTPUT / "heartwarming_log.json"
VIDEO_CREATOR     = REPO_DIR / "youtube_video_creator.py"
CLIENT_SECRETS    = REPO_DIR / "client_secrets.json"

ANTHROPIC_API_KEY  = os.getenv("ANTHROPIC_API_KEY", "")
OPENAI_API_KEY     = os.getenv("OPENAI_API_KEY", "")
FAL_KEY            = os.getenv("FAL_KEY", "")
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "8262409796:AAGYqrPGr0625xIdUzo0KX5Wue0ILQON5LQ")
TELEGRAM_CHAT_ID   = os.getenv("TELEGRAM_CHAT_ID", "7578852838")

claude = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)


# ════════════════════════════════════════════════════════════
#  1. 사용된 이야기 로그
# ════════════════════════════════════════════════════════════
def load_log() -> list:
    if LOG_FILE.exists():
        try:
            return json.loads(LOG_FILE.read_text())
        except Exception:
            pass
    return []


def save_log(log: list):
    VIDEO_OUTPUT.mkdir(parents=True, exist_ok=True)
    LOG_FILE.write_text(json.dumps(log, ensure_ascii=False, indent=2))


# ════════════════════════════════════════════════════════════
#  2. Claude로 이야기 생성
# ════════════════════════════════════════════════════════════
def generate_story(used_titles: list) -> dict:
    used_str = "\n".join(f"- {t}" for t in used_titles[-30:]) if used_titles else "없음"

    prompt = f"""당신은 미국의 실제 감동 이야기를 발굴하는 작가입니다.

아래 이미 사용한 이야기 목록을 참고하여, **새로운** 실제 미국 감동 이야기를 하나 선정하고 블로그 포스트를 작성하세요.

이미 사용한 이야기:
{used_str}

조건:
- 반드시 실제로 일어난 이야기 (실명, 연도 포함)
- 미국에서 일어난 사건
- 사람 간의 따뜻한 이야기 (희생, 용기, 사랑, 회복, 기적 등)
- 위 목록에 없는 새로운 이야기

다음 JSON 형식으로만 출력하세요 (다른 텍스트 없이):

{{
  "slug": "영어소문자-하이픈-주제어 (예: lenny-skutnik-potomac)",
  "photo_keywords": ["사진 검색 키워드1", "키워드2", "키워드3"],
  "ko": {{
    "title": "한국어 제목",
    "description": "한국어 설명 (2문장)",
    "tags": ["태그1", "태그2", "태그3", "태그4"],
    "body": "한국어 본문 (마크다운, 1500자 이상, 실제 사건 배경·경위·감동 포인트·결말 포함)"
  }},
  "en": {{
    "title": "English Title",
    "description": "English description (2 sentences)",
    "tags": ["tag1", "tag2", "tag3", "tag4"],
    "body": "English body (markdown, 800+ words, full story with background, events, impact)"
  }}
}}"""

    resp = claude.messages.create(
        model="claude-opus-4-6",
        max_tokens=4096,
        messages=[{"role": "user", "content": prompt}],
    )
    raw = resp.content[0].text.strip()
    # JSON 추출
    m = re.search(r"\{.*\}", raw, re.DOTALL)
    if not m:
        raise ValueError(f"JSON 파싱 실패:\n{raw[:200]}")
    return json.loads(m.group())


# ════════════════════════════════════════════════════════════
#  3. Wikipedia Commons 사진 검색
# ════════════════════════════════════════════════════════════
def search_wiki_photos(keywords: list, max_photos: int = 6) -> list:
    urls = []
    for kw in keywords:
        if len(urls) >= max_photos:
            break
        try:
            # Wikipedia Commons API 검색
            api_url = "https://commons.wikimedia.org/w/api.php"
            params = {
                "action": "query",
                "list": "search",
                "srsearch": kw,
                "srnamespace": "6",  # File namespace
                "srlimit": "5",
                "format": "json",
            }
            resp = requests.get(api_url, params=params, timeout=10)
            data = resp.json()
            for item in data.get("query", {}).get("search", []):
                title = item["title"]  # e.g. "File:Foo.jpg"
                if not re.search(r"\.(jpg|jpeg|png)$", title, re.I):
                    continue
                # 실제 이미지 URL 가져오기
                img_params = {
                    "action": "query",
                    "titles": title,
                    "prop": "imageinfo",
                    "iiprop": "url",
                    "format": "json",
                }
                img_resp = requests.get(api_url, params=img_params, timeout=10)
                pages = img_resp.json().get("query", {}).get("pages", {})
                for page in pages.values():
                    ii = page.get("imageinfo", [])
                    if ii:
                        img_url = ii[0]["url"]
                        # 다운로드 가능한지 확인
                        head = requests.head(img_url, timeout=5,
                                             headers={"User-Agent": "Mozilla/5.0"})
                        if head.status_code == 200:
                            urls.append(img_url)
                            break
                if len(urls) >= max_photos:
                    break
        except Exception as e:
            print(f"  ⚠️  사진 검색 실패 ({kw}): {e}")
    return urls[:max_photos]


# ════════════════════════════════════════════════════════════
#  4. MDX 파일 생성
# ════════════════════════════════════════════════════════════
def make_mdx_ko(story: dict, date_str: str, cover_url: str) -> str:
    ko = story["ko"]
    tags_str = ", ".join(f'"{t}"' for t in ko["tags"])
    return f"""---
title: "{ko['title']}"
description: "{ko['description']}"
date: {date_str}T11:30:00
category: "감동 이야기"
tags: [{tags_str}]
featured: true
coverImage: "{cover_url}"
---

{ko['body']}
"""


def make_mdx_en(story: dict, date_str: str, cover_url: str) -> str:
    en = story["en"]
    tags_str = ", ".join(f'"{t}"' for t in en["tags"])
    return f"""---
title: "{en['title']}"
description: "{en['description']}"
date: {date_str}T11:30:00
category: "Heartwarming Stories"
tags: [{tags_str}]
featured: true
locale: "en"
coverImage: "{cover_url}"
---

{en['body']}
"""


# ════════════════════════════════════════════════════════════
#  5. Git commit & push
# ════════════════════════════════════════════════════════════
def git_commit_push(ko_path: Path, en_path: Path, title: str):
    subprocess.run(["git", "add", str(ko_path), str(en_path)],
                   cwd=REPO_DIR, check=True)
    msg = f"content: add US heartwarming story — {title}\n\nCo-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
    subprocess.run(["git", "commit", "-m", msg], cwd=REPO_DIR, check=True)

    # pull & push (충돌 대비)
    result = subprocess.run(
        ["git", "pull", "origin", "main", "--no-rebase", "-X", "theirs"],
        cwd=REPO_DIR, capture_output=True, text=True
    )
    subprocess.run(["git", "push", "origin", "main"], cwd=REPO_DIR, check=True)
    print("  ✅ Git commit & push 완료")


# ════════════════════════════════════════════════════════════
#  6. YouTube Shorts 생성 + 업로드
# ════════════════════════════════════════════════════════════
def create_and_upload_shorts(mdx_path: Path, photo_urls: list) -> str | None:
    photo_str = ",".join(photo_urls) if photo_urls else ""

    cmd = [
        sys.executable, str(VIDEO_CREATOR),
        "--mdx", str(mdx_path),
        "--output", str(VIDEO_OUTPUT),
        "--mode", "shorts",
        "--upload",
        "--client-secrets", str(CLIENT_SECRETS),
    ]
    if photo_str:
        cmd += ["--photo-urls", photo_str]

    env = os.environ.copy()
    env.update({
        "OPENAI_API_KEY": OPENAI_API_KEY,
        "ANTHROPIC_API_KEY": ANTHROPIC_API_KEY,
        "FAL_KEY": FAL_KEY,
    })

    result = subprocess.run(cmd, cwd=REPO_DIR, capture_output=False, text=True, env=env)

    # 업로드 URL 파싱
    stem = mdx_path.stem
    log_file = VIDEO_OUTPUT / "upload.log"
    video_path = VIDEO_OUTPUT / f"{stem}_shorts.mp4"

    # upload.log에서 URL 찾기
    yt_url = None
    if log_file.exists():
        for line in reversed(log_file.read_text().splitlines()):
            m = re.search(r"https://youtu\.be/\S+", line)
            if m:
                yt_url = m.group()
                break

    return str(video_path) if video_path.exists() else None, yt_url


# ════════════════════════════════════════════════════════════
#  7. 텔레그램 전송
# ════════════════════════════════════════════════════════════
def send_telegram(video_path: str, caption: str):
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendVideo"
    with open(video_path, "rb") as f:
        resp = requests.post(url, data={"chat_id": TELEGRAM_CHAT_ID, "caption": caption},
                             files={"video": f}, timeout=120)
    if resp.json().get("ok"):
        print("  ✅ 텔레그램 전송 완료")
    else:
        print(f"  ❌ 텔레그램 실패: {resp.text[:200]}")


# ════════════════════════════════════════════════════════════
#  메인
# ════════════════════════════════════════════════════════════
def main():
    today = datetime.now().strftime("%Y-%m-%d")
    print(f"\n{'═'*60}")
    print(f"  🇺🇸 US Heartwarming Auto Pipeline — {today}")
    print(f"{'═'*60}\n")

    VIDEO_OUTPUT.mkdir(parents=True, exist_ok=True)

    # 로그 로드
    log = load_log()
    used_titles = [e["title"] for e in log]

    # 1. 이야기 생성
    print("📝 이야기 생성 중 (Claude)...")
    story = generate_story(used_titles)
    slug = story["slug"]
    print(f"  선정: {story['ko']['title']}")

    # 2. 사진 검색
    print("📷 Wikipedia Commons 사진 검색...")
    photo_urls = search_wiki_photos(story["photo_keywords"], max_photos=6)
    print(f"  사진 {len(photo_urls)}장 확보")
    cover_url = photo_urls[0] if photo_urls else ""

    # 3. MDX 파일 생성
    ko_filename = f"us-heartwarming-{slug}-{today}.mdx"
    en_filename = f"us-heartwarming-{slug}-{today}.en.mdx"
    ko_path = POSTS_DIR / ko_filename
    en_path = POSTS_DIR / en_filename

    ko_path.write_text(make_mdx_ko(story, today, cover_url), encoding="utf-8")
    en_path.write_text(make_mdx_en(story, today, cover_url), encoding="utf-8")
    print(f"  ✅ MDX 생성: {ko_filename}")

    # 4. Git commit & push
    print("📦 Git commit & push...")
    git_commit_push(ko_path, en_path, story["ko"]["title"])

    # 5. Shorts 생성 + 업로드
    print("🎬 YouTube Shorts 생성 + 업로드...")
    video_path, yt_url = create_and_upload_shorts(ko_path, photo_urls)

    # 6. 텔레그램 전송
    if video_path and Path(video_path).exists():
        print("📱 텔레그램 전송...")
        caption = f"🇺🇸 {story['ko']['title']}"
        if yt_url:
            caption += f"\n\n▶ {yt_url}"
        send_telegram(video_path, caption)

    # 7. 로그 저장
    log.append({
        "date": today,
        "slug": slug,
        "title": story["ko"]["title"],
        "youtube": yt_url,
        "photos": len(photo_urls),
    })
    save_log(log)

    print(f"\n{'═'*60}")
    print(f"  🎉 완료!")
    if yt_url:
        print(f"  YouTube: {yt_url}")
    print(f"{'═'*60}\n")


if __name__ == "__main__":
    main()
