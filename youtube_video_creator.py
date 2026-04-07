#!/usr/bin/env python3
"""
US History YouTube Content Creator
us-history MDX → 대본 생성 → TTS 음성 → 영상 렌더링 → YouTube 업로드
"""

import argparse
import json
import os
import re
import subprocess
import sys
import tempfile
import textwrap
from pathlib import Path

# ─── 환경 변수 ───────────────────────────────────────────────
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")

# ─── 영상 설정 ────────────────────────────────────────────────
SHORTS_W, SHORTS_H = 1080, 1920   # 세로형 9:16
LONG_W,   LONG_H   = 1920, 1080   # 가로형 16:9
FPS        = 30
BG_COLOR   = (12, 12, 28)         # 다크 네이비
TEXT_COLOR = (240, 240, 255)
ACCENT     = (255, 200, 50)       # 골드
SUB_COLOR  = (160, 160, 200)      # 서브 텍스트

# ─── 의존성 확인 ─────────────────────────────────────────────
try:
    from openai import OpenAI
except ImportError:
    print("❌ pip install openai 필요"); sys.exit(1)

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    print("❌ pip install Pillow 필요"); sys.exit(1)

openai_client = OpenAI(api_key=OPENAI_API_KEY)


# ════════════════════════════════════════════════════════════
#  1. MDX 파싱
# ════════════════════════════════════════════════════════════
def parse_mdx(file_path: str) -> dict:
    with open(file_path, "r", encoding="utf-8") as f:
        raw = f.read()

    m = re.match(r"^---\n(.*?)\n---\n(.*)", raw, re.DOTALL)
    if not m:
        return {}

    fm, body = m.group(1), m.group(2)

    def fm_val(key):
        r = re.search(rf'^{key}:\s*["\']?(.*?)["\']?\s*$', fm, re.MULTILINE)
        return r.group(1).strip("\"'") if r else ""

    # 마크다운 정리
    body = re.sub(r"#{1,6}\s+", "", body)
    body = re.sub(r"\*\*(.*?)\*\*", r"\1", body)
    body = re.sub(r"\*(.*?)\*", r"\1", body)
    body = re.sub(r"```.*?```", "", body, flags=re.DOTALL)
    body = re.sub(r"!\[.*?\]\(.*?\)", "", body)
    body = re.sub(r"\[([^\]]+)\]\([^\)]+\)", r"\1", body)
    body = re.sub(r"\|.*?\|", "", body)
    body = re.sub(r"[-─]{3,}", "", body)
    body = re.sub(r"\n{3,}", "\n\n", body).strip()

    return {
        "title":       fm_val("title"),
        "description": fm_val("description"),
        "body":        body,
    }


# ════════════════════════════════════════════════════════════
#  2. 대본 생성 (GPT-4o)
# ════════════════════════════════════════════════════════════
def generate_script(parsed: dict, mode: str) -> str:
    title = parsed["title"]
    body  = parsed["body"]

    if mode == "shorts":
        prompt = f"""당신은 유튜브 Shorts 전문 작가입니다.
아래 미국 역사 포스트를 읽고, 유튜브 Shorts용 **60초 한국어 나레이션 대본**을 작성하세요.

규칙:
- 180~200 단어 이내
- 첫 문장: 강렬한 후킹 (놀라운 사실 or 질문)
- 핵심 1~2가지만 전달
- 마지막: "구독과 좋아요 부탁드립니다!"
- 구어체, 대본만 출력 (제목·설명 없이)

제목: {title}
내용: {body[:2000]}"""

    else:  # longform
        prompt = f"""당신은 유튜브 역사 채널 전문 작가입니다.
아래 미국 역사 포스트를 읽고, 유튜브 일반 영상용 **5~7분 한국어 나레이션 대본**을 작성하세요.

구성:
- 인트로 (30초): 오늘의 주제, 강렬한 후킹
- 본론 (4~5분): 시간순 전개, 역사적 맥락, 인물 이야기
- 아웃트로 (30초): 요약 + "구독과 좋아요 눌러주세요!"

규칙:
- 800~1000 단어
- 자연스러운 구어체
- 대본만 출력

제목: {title}
내용: {body[:4000]}"""

    resp = openai_client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.75,
    )
    return resp.choices[0].message.content.strip()


# ════════════════════════════════════════════════════════════
#  3. TTS 음성 생성
# ════════════════════════════════════════════════════════════
def tts(script: str, out_path: str, voice: str = "onyx"):
    resp = openai_client.audio.speech.create(
        model="tts-1-hd",
        voice=voice,
        input=script,
        speed=1.0,
    )
    resp.stream_to_file(out_path)
    print(f"    🎙️  음성 → {out_path}")


def audio_duration(path: str) -> float:
    r = subprocess.run(
        ["ffprobe", "-v", "quiet", "-print_format", "json", "-show_format", path],
        capture_output=True, text=True,
    )
    return float(json.loads(r.stdout)["format"]["duration"])


# ════════════════════════════════════════════════════════════
#  4. 프레임 이미지 생성 (Pillow)
# ════════════════════════════════════════════════════════════
def _load_font(size: int):
    candidates = [
        "/System/Library/Fonts/AppleSDGothicNeo.ttc",
        "/System/Library/Fonts/Supplemental/AppleGothic.ttf",
        "/Library/Fonts/NanumGothic.ttf",
        "/Library/Fonts/Arial Unicode.ttf",
    ]
    for p in candidates:
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except Exception:
                continue
    return ImageFont.load_default()


def create_frame(slide_text: str, title: str, slide_idx: int, total: int,
                 w: int, h: int) -> Image.Image:
    img = Image.new("RGB", (w, h), BG_COLOR)
    draw = ImageDraw.Draw(img)

    # 배경 그라디언트 (세로)
    for y in range(h):
        t = y / h
        r = int(BG_COLOR[0] * (1 - t * 0.4))
        g = int(BG_COLOR[1] * (1 - t * 0.2))
        b = int(BG_COLOR[2] + (60 - BG_COLOR[2]) * t * 0.5)
        draw.line([(0, y), (w, y)], fill=(r, g, b))

    is_vertical = h > w
    margin = int(w * 0.07)

    # 폰트 크기
    if is_vertical:
        t_sz, b_sz, s_sz = 56, 48, 30
    else:
        t_sz, b_sz, s_sz = 64, 50, 32

    title_font = _load_font(t_sz)
    body_font  = _load_font(b_sz)
    small_font = _load_font(s_sz)

    # 상단 액센트 라인
    top_line_y = int(h * 0.07)
    draw.rectangle([margin, top_line_y, w - margin, top_line_y + 5], fill=ACCENT)

    # 채널 태그
    draw.text((margin, int(h * 0.04)), "🇺🇸 미국 역사", font=small_font, fill=ACCENT)

    # 제목
    short_title = (title[:28] + "…") if len(title) > 28 else title
    draw.text((margin, int(h * 0.09)), short_title, font=title_font, fill=TEXT_COLOR)

    # 본문 텍스트
    max_c = 22 if is_vertical else 40
    wrapped = textwrap.fill(slide_text, width=max_c)
    body_y = int(h * 0.38) if is_vertical else int(h * 0.30)
    lh = int(b_sz * 1.65)
    for line in wrapped.split("\n"):
        draw.text((margin, body_y), line, font=body_font, fill=TEXT_COLOR)
        body_y += lh

    # 슬라이드 번호
    draw.text(
        (margin, int(h * 0.92)),
        f"{slide_idx + 1} / {total}",
        font=small_font, fill=SUB_COLOR,
    )

    # 하단 진행바
    bar_y = int(h * 0.96)
    draw.rectangle([margin, bar_y, w - margin, bar_y + 7], fill=(40, 40, 65))
    prog_w = int((w - 2 * margin) * ((slide_idx + 1) / total))
    draw.rectangle([margin, bar_y, margin + prog_w, bar_y + 7], fill=ACCENT)

    return img


# ════════════════════════════════════════════════════════════
#  5. 영상 렌더링 (FFmpeg)
# ════════════════════════════════════════════════════════════
def split_into_slides(script: str, n: int) -> list[str]:
    sents = re.split(r"(?<=[.!?])\s+", script.strip())
    sents = [s.strip() for s in sents if s.strip()]
    if not sents:
        return [script]
    per = max(1, len(sents) // n)
    slides = []
    for i in range(0, len(sents), per):
        chunk = " ".join(sents[i : i + per])
        if chunk:
            slides.append(chunk)
    return slides[:n] if len(slides) > n else slides


def render_video(script: str, title: str, audio_path: str,
                 out_path: str, w: int, h: int):
    dur = audio_duration(audio_path)
    n_slides = max(4, int(dur / 7))
    slides = split_into_slides(script, n_slides)
    sec_per = dur / len(slides)

    print(f"    🎬 슬라이드 {len(slides)}개 × {sec_per:.1f}초 = {dur:.1f}초")

    with tempfile.TemporaryDirectory() as tmp:
        concat_file = os.path.join(tmp, "concat.txt")
        with open(concat_file, "w") as f:
            for i, text in enumerate(slides):
                img = create_frame(text, title, i, len(slides), w, h)
                img_path = os.path.join(tmp, f"s{i:04d}.png")
                img.save(img_path)
                f.write(f"file '{img_path}'\n")
                f.write(f"duration {sec_per:.4f}\n")
            # FFmpeg concat 마지막 항목 중복 필요
            last = os.path.join(tmp, f"s{len(slides)-1:04d}.png")
            f.write(f"file '{last}'\n")

        silent = os.path.join(tmp, "silent.mp4")
        subprocess.run([
            "ffmpeg", "-y", "-f", "concat", "-safe", "0",
            "-i", concat_file,
            "-vf", f"fps={FPS},scale={w}:{h}:flags=lanczos",
            "-c:v", "libx264", "-pix_fmt", "yuv420p",
            "-preset", "fast", "-crf", "23", silent,
        ], capture_output=True, check=True)

        subprocess.run([
            "ffmpeg", "-y",
            "-i", silent, "-i", audio_path,
            "-c:v", "copy", "-c:a", "aac", "-b:a", "192k",
            "-shortest", out_path,
        ], capture_output=True, check=True)

    print(f"    ✅ 영상 → {out_path}")


# ════════════════════════════════════════════════════════════
#  6. YouTube 업로드 (OAuth 2.0)
# ════════════════════════════════════════════════════════════
def upload_youtube(video_path: str, title: str, description: str,
                   tags: list, is_short: bool,
                   client_secrets: str = "client_secrets.json") -> str | None:
    try:
        from googleapiclient.discovery import build
        from googleapiclient.http import MediaFileUpload
        from google_auth_oauthlib.flow import InstalledAppFlow
        from google.oauth2.credentials import Credentials
        import google.auth.transport.requests as grequests
    except ImportError:
        print("    ❌ pip install google-auth-oauthlib 필요")
        return None

    SCOPES = ["https://www.googleapis.com/auth/youtube.upload"]
    TOKEN  = "youtube_token.json"

    creds = None
    if os.path.exists(TOKEN):
        creds = Credentials.from_authorized_user_file(TOKEN, SCOPES)

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(grequests.Request())
        else:
            if not os.path.exists(client_secrets):
                print(f"    ❌ {client_secrets} 없음 — YouTube 업로드 건너뜀")
                return None
            flow = InstalledAppFlow.from_client_secrets_file(client_secrets, SCOPES)
            creds = flow.run_local_server(port=0)
        with open(TOKEN, "w") as f:
            f.write(creds.to_json())

    yt = build("youtube", "v3", credentials=creds)

    if is_short:
        upload_title = f"{title} #Shorts"
        tags = tags + ["Shorts", "미국역사Shorts"]
    else:
        upload_title = title

    body = {
        "snippet": {
            "title":           upload_title[:100],
            "description":     description,
            "tags":            tags,
            "categoryId":      "27",   # Education
            "defaultLanguage": "ko",
        },
        "status": {
            "privacyStatus":          "public",
            "selfDeclaredMadeForKids": False,
        },
    }

    media = MediaFileUpload(video_path, chunksize=-1, resumable=True, mimetype="video/mp4")
    req = yt.videos().insert(part="snippet,status", body=body, media_body=media)

    resp = None
    while resp is None:
        st, resp = req.next_chunk()
        if st:
            pct = int(st.progress() * 100)
            print(f"    📤 업로드 {pct}%", end="\r")

    url = f"https://youtu.be/{resp['id']}"
    print(f"    ✅ 업로드 완료: {url}      ")
    return url


# ════════════════════════════════════════════════════════════
#  메인 파이프라인
# ════════════════════════════════════════════════════════════
def process(mdx_path: str, out_dir: str = "./video_output",
            upload: bool = False,
            client_secrets: str = "client_secrets.json",
            voice: str = "onyx"):

    os.makedirs(out_dir, exist_ok=True)
    stem = Path(mdx_path).stem

    print(f"\n{'═'*60}")
    print(f"  파일: {mdx_path}")
    print(f"{'═'*60}")

    parsed = parse_mdx(mdx_path)
    if not parsed.get("title"):
        print("  ❌ MDX 파싱 실패"); return

    print(f"  제목: {parsed['title']}\n")

    results = {}
    configs = [
        ("shorts",   SHORTS_W, SHORTS_H),
        ("longform", LONG_W,   LONG_H),
    ]

    for mode, w, h in configs:
        print(f"  ── {mode.upper()} ──────────────────────────────")

        # 대본
        print("  📝 대본 생성 중...")
        script = generate_script(parsed, mode)
        script_path = os.path.join(out_dir, f"{stem}_{mode}_script.txt")
        with open(script_path, "w", encoding="utf-8") as f:
            f.write(script)
        print(f"    ✅ 대본 → {script_path}")

        # TTS
        audio_path = os.path.join(out_dir, f"{stem}_{mode}.mp3")
        tts(script, audio_path, voice=voice)

        # 영상
        video_path = os.path.join(out_dir, f"{stem}_{mode}.mp4")
        render_video(script, parsed["title"], audio_path, video_path, w, h)

        # 업로드
        url = None
        if upload:
            url = upload_youtube(
                video_path,
                title       = parsed["title"],
                description = f"{parsed['description']}\n\nblog.365happy365.com",
                tags        = ["미국역사", "역사", "USHistory", "세계사"],
                is_short    = (mode == "shorts"),
                client_secrets = client_secrets,
            )

        results[mode] = {"video": video_path, "url": url}
        print()

    print(f"{'═'*60}")
    print("  🎉 완료!")
    for k, v in results.items():
        print(f"  [{k}] {v['video']}")
        if v["url"]:
            print(f"        → {v['url']}")
    print(f"{'═'*60}\n")
    return results


# ════════════════════════════════════════════════════════════
#  CLI
# ════════════════════════════════════════════════════════════
def main():
    ap = argparse.ArgumentParser(description="미국 역사 MDX → YouTube 영상 자동 생성")
    ap.add_argument("--mdx",            required=True,  help="MDX 파일 경로")
    ap.add_argument("--output",         default="./video_output", help="출력 디렉토리")
    ap.add_argument("--upload",         action="store_true", help="YouTube 업로드")
    ap.add_argument("--client-secrets", default="client_secrets.json")
    ap.add_argument("--voice",          default="onyx",
                    choices=["alloy", "echo", "fable", "onyx", "nova", "shimmer"],
                    help="TTS 음성 (기본: onyx)")
    args = ap.parse_args()

    process(
        mdx_path       = args.mdx,
        out_dir        = args.output,
        upload         = args.upload,
        client_secrets = args.client_secrets,
        voice          = args.voice,
    )


if __name__ == "__main__":
    main()
