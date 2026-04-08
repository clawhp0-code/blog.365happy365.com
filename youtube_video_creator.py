#!/usr/bin/env python3
"""
US History YouTube Content Creator — Graphic Novel Edition
us-history MDX → Claude 대본 → fal.ai FLUX 그래픽노블 이미지 → TTS 음성 → FFmpeg 영상 → YouTube 업로드
"""

import argparse
import hashlib
import io
import json
import os
import re
import subprocess
import sys
import tempfile
import textwrap
import time
from pathlib import Path

# ─── 환경 변수 ───────────────────────────────────────────────
OPENAI_API_KEY    = os.getenv("OPENAI_API_KEY", "")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
FAL_KEY           = os.getenv("FAL_KEY", "")

# ─── 영상 설정 ────────────────────────────────────────────────
SHORTS_W, SHORTS_H = 1080, 1920   # 세로형 9:16
LONG_W,   LONG_H   = 1920, 1080   # 가로형 16:9
FPS        = 30

# ─── 텍스트 오버레이 색상 ─────────────────────────────────────
TEXT_COLOR    = (255, 255, 255)
ACCENT        = (255, 210, 60)     # 골드
SHADOW_COLOR  = (0, 0, 0)
OVERLAY_ALPHA = 180                # 하단 텍스트 박스 투명도 (0~255)

# ─── 이미지 캐시 디렉토리 ─────────────────────────────────────
IMAGE_CACHE_DIR = "./video_output/image_cache"

# ─── 의존성 확인 ─────────────────────────────────────────────
try:
    from openai import OpenAI
except ImportError:
    print("❌ pip install openai 필요"); sys.exit(1)

try:
    import anthropic as anthropic_lib
except ImportError:
    print("❌ pip install anthropic 필요"); sys.exit(1)

try:
    from PIL import Image, ImageDraw, ImageFont, ImageFilter
except ImportError:
    print("❌ pip install Pillow 필요"); sys.exit(1)

try:
    import requests as req_lib
except ImportError:
    print("❌ pip install requests 필요"); sys.exit(1)

try:
    import fal_client
except ImportError:
    print("❌ pip install fal-client 필요"); sys.exit(1)

openai_client    = OpenAI(api_key=OPENAI_API_KEY)
claude_client    = anthropic_lib.Anthropic(api_key=ANTHROPIC_API_KEY)

# fal.ai 인증 설정
os.environ.setdefault("FAL_KEY", FAL_KEY)


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
#  2. 대본 생성 (Claude)
# ════════════════════════════════════════════════════════════
def generate_script(parsed: dict, mode: str) -> str:
    title, body = parsed["title"], parsed["body"]

    if mode == "shorts":
        prompt = f"""당신은 유튜브 Shorts 전문 작가입니다.
아래 미국 역사 포스트를 읽고, 유튜브 Shorts용 **60초 한국어 나레이션 대본**을 작성하세요.

규칙:
- 180~200 단어 이내
- 첫 문장: 강렬한 후킹 (놀라운 사실 or 질문)
- 핵심 1~2가지만 전달
- 마지막 문장: 구독과 좋아요를 유도하는 자연스러운 한국어 문장 (영어 단어 절대 사용 금지)
- 전체 대본에 영어 단어를 절대 포함하지 마세요. 모든 내용을 순수 한국어로 작성하세요.
- 구어체, 대본만 출력

제목: {title}
내용: {body[:2000]}"""
    else:
        prompt = f"""당신은 유튜브 역사 채널 전문 작가입니다.
아래 미국 역사 포스트를 읽고, 유튜브 일반 영상용 **5~7분 한국어 나레이션 대본**을 작성하세요.

구성:
- 인트로 (30초): 강렬한 후킹
- 본론 (4~5분): 시간순 전개, 역사적 맥락, 인물 이야기
- 아웃트로 (30초): 요약 + 구독과 좋아요를 유도하는 자연스러운 한국어 문장

규칙:
- 800~1000 단어, 구어체, 대본만 출력
- 전체 대본에 영어 단어를 절대 포함하지 마세요. 모든 내용을 순수 한국어로 작성하세요.

제목: {title}
내용: {body[:4000]}"""

    resp = claude_client.messages.create(
        model="claude-opus-4-6",
        max_tokens=2048,
        messages=[{"role": "user", "content": prompt}],
    )
    return resp.content[0].text.strip()


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
    with open(out_path, "wb") as f:
        f.write(resp.content)
    print(f"    🎙️  음성 → {out_path}")


def audio_duration(path: str) -> float:
    r = subprocess.run(
        ["ffprobe", "-v", "quiet", "-print_format", "json", "-show_format", path],
        capture_output=True, text=True,
    )
    return float(json.loads(r.stdout)["format"]["duration"])


# ════════════════════════════════════════════════════════════
#  4. fal.ai FLUX 그래픽 노블 이미지 생성
# ════════════════════════════════════════════════════════════
GRAPHIC_NOVEL_STYLE = (
    "graphic novel art style, bold ink outlines, dramatic cross-hatching, "
    "high contrast black and white with selective color accents, "
    "cinematic panel composition, detailed historical illustration, "
    "Frank Miller and Joe Kubert inspired, moody atmosphere, "
    "dynamic perspective, expressive characters"
)


def _image_cache_path(prompt_hash: str, size: str) -> str:
    os.makedirs(IMAGE_CACHE_DIR, exist_ok=True)
    return os.path.join(IMAGE_CACHE_DIR, f"{prompt_hash}_{size.replace('x','_')}.png")


def build_image_prompt(slide_text: str, title: str, slide_idx: int, total: int) -> str:
    """슬라이드 내용 → 이미지 프롬프트 (Claude 활용)"""
    resp = claude_client.messages.create(
        model="claude-opus-4-6",
        max_tokens=250,
        messages=[{
            "role": "user",
            "content": (
                f"You are an art director creating graphic novel panels for a historical video.\n"
                f"Topic: {title}\n"
                f"Narration (slide {slide_idx+1}/{total}): {slide_text}\n\n"
                f"Write a concise image generation prompt (in English, max 120 words) "
                f"that visually depicts THIS specific moment/scene. "
                f"The prompt MUST include: {GRAPHIC_NOVEL_STYLE}\n"
                f"Focus on the key historical figure, action, or setting described. "
                f"Do NOT include any text or letters in the image. "
                f"Output only the prompt, nothing else."
            )
        }],
    )
    return resp.content[0].text.strip()


def generate_image(prompt: str, w: int, h: int, retries: int = 1) -> Image.Image | None:
    """fal.ai FLUX로 이미지 생성 (캐시 + 재시도)"""
    size_key = f"{w}x{h}"
    key = hashlib.md5(prompt.encode()).hexdigest()[:12]
    cached = _image_cache_path(key, size_key)
    if os.path.exists(cached):
        print(f"      💾 캐시 사용: {key}")
        return Image.open(cached).convert("RGB")

    for attempt in range(retries):
        try:
            result = fal_client.run(
                "fal-ai/flux/schnell",
                arguments={
                    "prompt": prompt,
                    "image_size": {"width": w, "height": h},
                    "num_images": 1,
                    "enable_safety_checker": False,
                },
            )
            url = result["images"][0]["url"]
            img_resp = req_lib.get(url, timeout=30)
            img = Image.open(io.BytesIO(img_resp.content)).convert("RGB")
            img.save(cached)
            return img

        except Exception as e:
            err = str(e)
            if "rate_limit" in err.lower() or "429" in err:
                wait = 10 * (attempt + 1)
                print(f"      ⏳ Rate limit — {wait}초 대기 후 재시도...")
                time.sleep(wait)
            elif "safety" in err.lower() or "nsfw" in err.lower():
                print(f"      ⚠️  안전 정책 → 폴백 이미지 사용")
                return None
            else:
                print(f"      ❌ 이미지 생성 실패 (시도 {attempt+1}): {e}")
                if attempt < retries - 1:
                    time.sleep(5)

    return None


def generate_image_dalle2(prompt: str, w: int, h: int) -> Image.Image | None:
    """DALL-E 2 폴백 이미지 생성 (fal.ai 실패 시)"""
    size_key = f"{w}x{h}"
    key = hashlib.md5(("dalle2_" + prompt).encode()).hexdigest()[:12]
    cached = _image_cache_path(key, size_key)
    if os.path.exists(cached):
        print(f"      💾 DALL-E 2 캐시 사용: {key}")
        return Image.open(cached).convert("RGB")

    # DALL-E 2는 256x256, 512x512, 1024x1024만 지원
    dalle_size = "1024x1024"
    # 프롬프트 1000자 제한
    short_prompt = prompt[:950]

    try:
        resp = openai_client.images.generate(
            model="dall-e-2",
            prompt=short_prompt,
            n=1,
            size=dalle_size,
        )
        url = resp.data[0].url
        img_resp = req_lib.get(url, timeout=30)
        img = Image.open(io.BytesIO(img_resp.content)).convert("RGB")
        # 원하는 크기로 리사이즈
        img = img.resize((w, h), Image.LANCZOS)
        img.save(cached)
        return img
    except Exception as e:
        print(f"      ❌ DALL-E 2 실패: {e}")
        return None


# ════════════════════════════════════════════════════════════
#  5. 프레임 합성 (DALL-E 이미지 + 텍스트 오버레이)
# ════════════════════════════════════════════════════════════
def _load_font(size: int) -> ImageFont.FreeTypeFont:
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


def _draw_text_shadow(draw, pos, text, font, fill, shadow_offset=3):
    x, y = pos
    draw.text((x + shadow_offset, y + shadow_offset), text, font=font, fill=(0, 0, 0, 200))
    draw.text((x, y), text, font=font, fill=fill)


def compose_frame(
    bg_image: Image.Image | None,
    slide_text: str,
    title: str,
    slide_idx: int,
    total: int,
    w: int,
    h: int,
) -> Image.Image:
    is_vertical = h > w

    # ── 배경 ──
    if bg_image is not None:
        frame = bg_image.resize((w, h), Image.LANCZOS)
        # 가볍게 블러로 텍스트 가독성 보조
        frame = frame.filter(ImageFilter.GaussianBlur(radius=0.8))
    else:
        # 폴백: 다크 배경
        frame = Image.new("RGB", (w, h), (12, 12, 28))

    # RGBA로 변환 (반투명 오버레이용)
    frame = frame.convert("RGBA")

    # ── 상단 그라디언트 오버레이 (채널 태그 영역) ──
    top_overlay = Image.new("RGBA", (w, int(h * 0.18)), (0, 0, 0, 0))
    for y in range(top_overlay.height):
        alpha = int(180 * (1 - y / top_overlay.height))
        for x in range(w):
            top_overlay.putpixel((x, y), (0, 0, 0, alpha))
    frame.paste(top_overlay, (0, 0), top_overlay)

    # ── 하단 텍스트 박스 오버레이 ──
    text_box_h = int(h * 0.50) if is_vertical else int(h * 0.45)
    text_box_y = h - text_box_h
    bottom_overlay = Image.new("RGBA", (w, text_box_h), (0, 0, 0, 0))
    for y in range(text_box_h):
        alpha = int(OVERLAY_ALPHA * (y / text_box_h) ** 0.5)
        for x in range(w):
            bottom_overlay.putpixel((x, y), (5, 5, 20, alpha))
    frame.paste(bottom_overlay, (0, text_box_y), bottom_overlay)

    draw = ImageDraw.Draw(frame)
    margin = int(w * 0.06)

    # 폰트 크기 (설명 폰트 1.5배)
    if is_vertical:
        t_sz, b_sz, s_sz = 48, 66, 28
    else:
        t_sz, b_sz, s_sz = 56, 69, 30

    title_font = _load_font(t_sz)
    body_font  = _load_font(b_sz)
    small_font = _load_font(s_sz)

    # ── 상단: 채널 태그 + 액센트 라인 ──
    tag_y = int(h * 0.025)
    _draw_text_shadow(draw, (margin, tag_y), "🇺🇸 미국 역사", small_font, ACCENT)

    line_y = int(h * 0.075)
    draw.rectangle([margin, line_y, w - margin, line_y + 4], fill=ACCENT)

    # ── 상단: 제목 ──
    short_title = (title[:26] + "…") if len(title) > 26 else title
    _draw_text_shadow(draw, (margin, int(h * 0.085)), short_title, title_font, TEXT_COLOR)

    # ── 하단: 본문 나레이션 ──
    max_c = 14 if is_vertical else 26
    wrapped = textwrap.fill(slide_text, width=max_c)
    body_y = text_box_y + int(text_box_h * 0.08)
    lh = int(b_sz * 1.6)
    for line in wrapped.split("\n"):
        _draw_text_shadow(draw, (margin, body_y), line, body_font, TEXT_COLOR)
        body_y += lh

    # ── 하단: 슬라이드 번호 + 진행바 ──
    num_y = h - int(h * 0.055)
    draw.text((margin, num_y), f"{slide_idx + 1} / {total}", font=small_font, fill=(200, 200, 220))

    bar_y = h - int(h * 0.025)
    bar_x2 = w - margin
    draw.rectangle([margin, bar_y, bar_x2, bar_y + 6], fill=(40, 40, 70, 200))
    prog = int((bar_x2 - margin) * ((slide_idx + 1) / total))
    draw.rectangle([margin, bar_y, margin + prog, bar_y + 6], fill=ACCENT)

    return frame.convert("RGB")


# ════════════════════════════════════════════════════════════
#  6. 영상 렌더링 (DALL-E 이미지 → FFmpeg)
# ════════════════════════════════════════════════════════════
def split_into_slides(script: str, n: int) -> list[str]:
    sents = re.split(r"(?<=[.!?])\s+", script.strip())
    sents = [s.strip() for s in sents if s.strip()]
    if not sents:
        return [script]
    per = max(1, len(sents) // n)
    slides = []
    for i in range(0, len(sents), per):
        chunk = " ".join(sents[i: i + per])
        if chunk:
            slides.append(chunk)
    return slides[:n] if len(slides) > n else slides


def render_video(
    script: str,
    title: str,
    audio_path: str,
    out_path: str,
    w: int,
    h: int,
):
    dur = audio_duration(audio_path)
    # Shorts: 슬라이드 수 줄여서 이미지당 비용 절감 (avg 10~12초/슬라이드)
    # Longform: 슬라이드당 약 10초
    sec_per_slide = 10
    n_slides = max(4, int(dur / sec_per_slide))
    slides = split_into_slides(script, n_slides)
    sec_per = dur / len(slides)

    print(f"    🎨 fal.ai FLUX 그래픽노블 이미지 생성: {len(slides)}장")

    with tempfile.TemporaryDirectory() as tmp:
        concat_file = os.path.join(tmp, "concat.txt")

        with open(concat_file, "w") as cf:
            for i, text in enumerate(slides):
                print(f"      [{i+1}/{len(slides)}] 이미지 생성 중...", end=" ", flush=True)

                # 이미지 프롬프트 생성
                image_prompt = build_image_prompt(text, title, i, len(slides))

                # fal.ai FLUX 이미지 생성
                bg = generate_image(image_prompt, w, h)
                if bg is None:
                    # 폴백: DALL-E 2로 이미지 생성
                    print("🔄 DALL-E 2 폴백...", end=" ", flush=True)
                    bg = generate_image_dalle2(image_prompt, w, h)
                print("✅")

                # 프레임 합성
                frame = compose_frame(bg, text, title, i, len(slides), w, h)
                img_path = os.path.join(tmp, f"s{i:04d}.png")
                frame.save(img_path, "PNG")

                cf.write(f"file '{img_path}'\n")
                cf.write(f"duration {sec_per:.4f}\n")

                # Rate limit 방지: 슬라이드 사이 짧은 딜레이
                if i < len(slides) - 1:
                    time.sleep(1)

            # FFmpeg concat 마지막 중복
            last = os.path.join(tmp, f"s{len(slides)-1:04d}.png")
            cf.write(f"file '{last}'\n")

        print(f"    🎬 FFmpeg 렌더링: {len(slides)}슬라이드 × {sec_per:.1f}초 = {dur:.1f}초")

        silent = os.path.join(tmp, "silent.mp4")
        subprocess.run([
            "ffmpeg", "-y", "-f", "concat", "-safe", "0",
            "-i", concat_file,
            "-vf", f"fps={FPS},scale={w}:{h}:flags=lanczos",
            "-c:v", "libx264", "-pix_fmt", "yuv420p",
            "-preset", "fast", "-crf", "20", silent,
        ], capture_output=True, check=True)

        # Shorts(세로형)는 59초 제한
        time_limit = ["-t", "59"] if h > w else []
        subprocess.run([
            "ffmpeg", "-y",
            "-i", silent, "-i", audio_path,
            "-c:v", "copy", "-c:a", "aac", "-b:a", "192k",
            "-shortest", *time_limit, out_path,
        ], capture_output=True, check=True)

    print(f"    ✅ 영상 → {out_path}")


# ════════════════════════════════════════════════════════════
#  7. YouTube 업로드 (OAuth 2.0)
# ════════════════════════════════════════════════════════════
def upload_youtube(
    video_path: str, title: str, description: str,
    tags: list, is_short: bool,
    client_secrets: str = "client_secrets.json",
) -> str | None:
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
                print(f"    ❌ {client_secrets} 없음 — 업로드 건너뜀")
                return None
            flow = InstalledAppFlow.from_client_secrets_file(client_secrets, SCOPES)
            creds = flow.run_local_server(port=0)
        with open(TOKEN, "w") as f:
            f.write(creds.to_json())

    yt = build("youtube", "v3", credentials=creds)

    upload_title = f"{title} #Shorts" if is_short else title
    all_tags = tags + (["Shorts", "미국역사Shorts"] if is_short else [])

    body = {
        "snippet": {
            "title":           upload_title[:100],
            "description":     description,
            "tags":            all_tags,
            "categoryId":      "27",
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
            print(f"    📤 업로드 {int(st.progress() * 100)}%", end="\r")

    url = f"https://youtu.be/{resp['id']}"
    print(f"    ✅ 업로드 완료: {url}      ")
    return url


# ════════════════════════════════════════════════════════════
#  메인 파이프라인
# ════════════════════════════════════════════════════════════
def process(
    mdx_path: str,
    out_dir: str = "./video_output",
    upload: bool = False,
    client_secrets: str = "client_secrets.json",
    voice: str = "onyx",
    modes: list | None = None,   # None = 전체, ["shorts"] = 쇼츠만, ["longform"] = 롱폼만
):
    os.makedirs(out_dir, exist_ok=True)
    os.makedirs(IMAGE_CACHE_DIR, exist_ok=True)
    stem = Path(mdx_path).stem

    print(f"\n{'═'*60}")
    print(f"  파일: {mdx_path}")
    print(f"{'═'*60}")

    parsed = parse_mdx(mdx_path)
    if not parsed.get("title"):
        print("  ❌ MDX 파싱 실패"); return

    print(f"  제목: {parsed['title']}\n")

    results = {}
    all_configs = [
        ("shorts",   SHORTS_W, SHORTS_H),
        ("longform", LONG_W,   LONG_H),
    ]
    configs = [(m, w, h) for m, w, h in all_configs if modes is None or m in modes]

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

        # 영상 (DALL-E 3 이미지 포함)
        video_path = os.path.join(out_dir, f"{stem}_{mode}.mp4")
        render_video(script, parsed["title"], audio_path, video_path, w, h)

        # 업로드
        url = None
        if upload:
            url = upload_youtube(
                video_path,
                title=parsed["title"],
                description=f"{parsed['description']}\n\nblog.365happy365.com",
                tags=["미국역사", "역사", "USHistory", "세계사", "그래픽노블"],
                is_short=(mode == "shorts"),
                client_secrets=client_secrets,
            )

        results[mode] = {"video": video_path, "url": url}
        print()

    print(f"{'═'*60}")
    print("  🎉 완료!")
    for k, v in results.items():
        print(f"  [{k}] {v['video']}")
        if v.get("url"):
            print(f"        → {v['url']}")
    print(f"{'═'*60}\n")
    return results


# ════════════════════════════════════════════════════════════
#  CLI
# ════════════════════════════════════════════════════════════
def main():
    ap = argparse.ArgumentParser(description="미국 역사 MDX → fal.ai FLUX 그래픽노블 YouTube 영상 자동 생성")
    ap.add_argument("--mdx",            required=True,  help="MDX 파일 경로")
    ap.add_argument("--output",         default="./video_output")
    ap.add_argument("--upload",         action="store_true", help="YouTube 업로드")
    ap.add_argument("--client-secrets", default="client_secrets.json")
    ap.add_argument("--voice",          default="onyx",
                    choices=["alloy", "echo", "fable", "onyx", "nova", "shimmer"])
    ap.add_argument("--mode",           default="all",
                    choices=["all", "shorts", "longform"], help="생성할 영상 모드")
    args = ap.parse_args()

    modes = None if args.mode == "all" else [args.mode]

    process(
        mdx_path=args.mdx,
        out_dir=args.output,
        upload=args.upload,
        client_secrets=args.client_secrets,
        voice=args.voice,
        modes=modes,
    )


if __name__ == "__main__":
    main()
