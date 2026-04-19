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
OPENAI_API_KEY      = os.getenv("OPENAI_API_KEY", "").strip()
ANTHROPIC_API_KEY   = os.getenv("ANTHROPIC_API_KEY", "").strip()
FAL_KEY             = os.getenv("FAL_KEY", "").strip()
ELEVENLABS_API_KEY  = os.getenv("ELEVENLABS_API_KEY", "").strip()

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


# ── 비용 추적 ────────────────────────────────────────────────
# 단가 (2026-04 기준)
_PRICE_TTS_PER_CHAR   = 0.30 / 1_000       # ElevenLabs: $0.30/1K chars
_PRICE_FAL_SCHNELL    = 0.003               # fal.ai FLUX Schnell: $0.003/image
_PRICE_CLAUDE_SCRIPT  = 0.04                # Claude opus 대본 생성 1회 추정 (input+output)

_cost = {"tts_chars": 0, "fal_images": 0, "claude_scripts": 0}


def _cost_reset():
    _cost["tts_chars"] = 0
    _cost["fal_images"] = 0
    _cost["claude_scripts"] = 0


def _cost_summary() -> str:
    tts_cost   = _cost["tts_chars"] * _PRICE_TTS_PER_CHAR
    fal_cost   = _cost["fal_images"] * _PRICE_FAL_SCHNELL
    claude_cost = _cost["claude_scripts"] * _PRICE_CLAUDE_SCRIPT
    total = tts_cost + fal_cost + claude_cost
    krw = total * 1380  # 대략 환율
    lines = [
        f"  {'─'*50}",
        f"  💰 비용 요약",
        f"  {'─'*50}",
        f"  ElevenLabs TTS         : {_cost['tts_chars']:,}자 = ${tts_cost:.4f}",
        f"  fal.ai FLUX (schnell)  : {_cost['fal_images']}장   = ${fal_cost:.4f}",
    ]
    if _cost["claude_scripts"] > 0:
        lines.append(
        f"  Claude 대본 생성        : {_cost['claude_scripts']}회   = ${claude_cost:.4f}"
        )
    lines += [
        f"  {'─'*50}",
        f"  합계: ${total:.4f} (약 {int(krw)}원)",
        f"  {'─'*50}",
    ]
    return "\n".join(lines)


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
아래 포스트를 읽고, 유튜브 Shorts용 **45~55초 한국어 나레이션 대본**을 작성하세요.

스타일 예시 (이 스타일을 반드시 따를 것):
---
25세 서점 주인 헨리 녹스. 군사 경험 제로, 전쟁 책 수백 권.
대포 60문을 소 80마리 썰매로 480킬로미터 운반. 하룻밤에 설치.
영국군 하우 장군이 말했다. "반란군이 하룻밤에 해낸 일을 우리가 한 달 걸려도 못 했을 것이다."
보스턴 해방.
---

규칙:
- 총 60~80 단어 (짧고 강렬하게)
- 한 문장 = 한 사실. 군더더기 없이.
- 핵심 숫자·팩트를 그대로 나열
- 결정적 명언 또는 반전 한 줄 포함
- 마지막은 짧고 강렬한 결론 한 줄로 마무리
- 구독·좋아요 유도 문장 절대 금지
- 영어 단어 절대 사용 금지, 순수 한국어
- 대본만 출력 (번호, 제목, 설명 없이)

제목: {title}
내용: {body[:2500]}"""
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

    _cost["claude_scripts"] += 1
    resp = claude_client.messages.create(
        model="claude-opus-4-6",
        max_tokens=2048,
        messages=[{"role": "user", "content": prompt}],
    )
    return resp.content[0].text.strip()


# ════════════════════════════════════════════════════════════
#  3. TTS 음성 생성
# ════════════════════════════════════════════════════════════
def normalize_for_tts(text: str) -> str:
    """Claude로 한국어 TTS 텍스트 정규화 — 숫자 한글화, 자연스러운 발음."""
    if not re.search(r"[가-힣]", text):
        return text
    try:
        resp = claude_client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=300,
            messages=[{
                "role": "user",
                "content": (
                    "아래 한국어 문장을 TTS(음성합성)로 읽을 때 자연스럽게 들리도록 변환해줘.\n"
                    "규칙:\n"
                    "1. 아라비아 숫자·연도는 반드시 한국어 독음으로 변환\n"
                    "   예) 1775년 → 천칠백칠십오 년 / 1,100명 → 천백 명 / 350명 → 삼백오십 명\n"
                    "   예) 320킬로미터 → 삼백이십 킬로미터 / 9발 → 아홉 발 / 30분 → 삼십 분\n"
                    "2. 쉼표(,)로 자연스러운 호흡 위치를 추가해도 됨\n"
                    "3. 문장 의미·순서 절대 변경 금지\n"
                    "4. 한국어로만 출력 (설명·번호 없이 변환된 텍스트만)\n\n"
                    f"{text}"
                ),
            }],
        )
        return resp.content[0].text.strip()
    except Exception:
        return text


ELEVENLABS_VOICE_ID = "21m00Tcm4TlvDq8ikWAM"  # Rachel — 차분하고 명료한 다큐 여성 보이스

def tts(script: str, out_path: str, voice: str = "elevenlabs"):
    from elevenlabs.client import ElevenLabs
    normalized = normalize_for_tts(script)
    _cost["tts_chars"] += len(normalized)
    el_client = ElevenLabs(api_key=ELEVENLABS_API_KEY)
    audio = el_client.text_to_speech.convert(
        voice_id=ELEVENLABS_VOICE_ID,
        text=normalized,
        model_id="eleven_multilingual_v2",
        voice_settings={
            "stability": 0.6,
            "similarity_boost": 0.8,
            "style": 0.3,
            "use_speaker_boost": True,
        },
    )
    with open(out_path, "wb") as f:
        for chunk in audio:
            f.write(chunk)
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
    "cinematic graphic novel illustration, vivid colors, dramatic lighting, "
    "bold outlines, comic book art style, high detail, "
    "dynamic perspective, expressive characters, detailed historical illustration, "
    "purely visual storytelling, completely text-free image, "
    "zero text zero letters zero writing zero signs zero symbols zero glyphs"
)


def _image_cache_path(prompt_hash: str, size: str) -> str:
    os.makedirs(IMAGE_CACHE_DIR, exist_ok=True)
    return os.path.join(IMAGE_CACHE_DIR, f"{prompt_hash}_{size.replace('x','_')}.png")


def _strip_non_ascii(s: str) -> str:
    """비영문 문자를 제거하고 ASCII + 숫자만 남김 (fal.ai 프롬프트용)."""
    return re.sub(r"[^\x20-\x7E]+", " ", s).strip()


def _translate_scene_to_english(ko_text: str, en_title: str) -> str:
    """Claude로 한국어 슬라이드 텍스트를 영어 시각 장면 묘사로 번역."""
    try:
        resp = claude_client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=200,
            messages=[{
                "role": "user",
                "content": (
                    f"Write a vivid image generation prompt (3 sentences) for this American Revolutionary War scene.\n"
                    f"Story context: '{en_title}'\n"
                    f"This slide's text: '{ko_text}'\n\n"
                    f"STRICT rules:\n"
                    f"- Even if the slide text is very short or abstract, invent specific VISUAL details that fit the story context\n"
                    f"- All people: white European-American men in 18th-century colonial military uniforms or period civilian clothes\n"
                    f"- Setting: colonial America — wilderness, forests, stone forts, wooden colonial buildings. NO Asia.\n"
                    f"- Describe actions, facial expressions, environment, lighting — make it cinematic\n"
                    f"- Output ONLY the scene description in English, nothing else."
                ),
            }],
        )
        return resp.content[0].text.strip()
    except Exception:
        return ""


def build_image_prompt(slide_text: str, title: str, slide_idx: int, total: int) -> str:
    """슬라이드 내용 → fal.ai FLUX 이미지 프롬프트 (영문 전용, 한자/한글 제거)."""
    clean_title = _strip_non_ascii(title)
    has_korean = bool(re.search(r"[가-힣]", slide_text))
    if has_korean:
        scene_desc = _translate_scene_to_english(slide_text[:300], clean_title)
    else:
        scene_desc = _strip_non_ascii(slide_text[:240])

    # 명시적 positive 묘사로 FLUX가 서양인 장면을 생성하도록 유도
    base = (
        f"Scene {slide_idx + 1} of {total}. "
        f"American Revolutionary War, 1775, colonial New England. "
        f"White European-American soldiers and civilians in 18th-century colonial attire. "
        f"Stone and wooden colonial architecture or wilderness landscape. "
    )
    scene = f"{base}{scene_desc}. " if scene_desc else base
    return (
        f"{scene}{GRAPHIC_NOVEL_STYLE}. "
        f"zero text, zero letters, zero writing, zero signs, "
        f"zero Chinese characters, zero Asian script, zero Asian people, zero Asian faces"
    )


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
            _cost["fal_images"] += 1
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
    is_last = (slide_idx == total - 1)

    # ── 배경 ──
    if bg_image is not None:
        frame = bg_image.resize((w, h), Image.LANCZOS)
        # 가볍게 블러로 텍스트 가독성 보조
        frame = frame.filter(ImageFilter.GaussianBlur(radius=1.2))
    else:
        # 폴백: 다크 배경
        frame = Image.new("RGB", (w, h), (12, 12, 28))

    # RGBA로 변환
    frame = frame.convert("RGBA")

    draw = ImageDraw.Draw(frame)
    margin = int(w * 0.06)

    # 폰트 크기
    if is_vertical:
        t_sz, cap_sz, s_sz, cta_sz = 48, 64, 28, 56
    else:
        t_sz, cap_sz, s_sz, cta_sz = 56, 56, 30, 60

    title_font   = _load_font(t_sz)
    caption_font = _load_font(cap_sz)
    small_font   = _load_font(s_sz)
    cta_font     = _load_font(cta_sz)

    # ── 제목: 중간에서 위로 2/3 지점 (h/2 - (h/2)*2/3 = h/6) ──
    title_y = int(h / 6)
    line_y  = title_y - int(h * 0.012)
    draw.rectangle([margin, line_y, w - margin, line_y + 4], fill=ACCENT)

    short_title = (title[:26] + "…") if len(title) > 26 else title
    _draw_text_shadow(draw, (margin, title_y), short_title, title_font, TEXT_COLOR)

    # ── 가운데: 하드 캡션 (나레이션 텍스트, 배경 없이 그림자만) ──
    max_c = 16 if is_vertical else 30
    wrapped_lines = textwrap.fill(slide_text, width=max_c).split("\n")
    lh = int(cap_sz * 1.55)
    block_h = lh * len(wrapped_lines)
    block_y = (h - block_h) // 2

    cap_y = block_y
    for line in wrapped_lines:
        try:
            tw = draw.textlength(line, font=caption_font)
        except AttributeError:
            tw = caption_font.getsize(line)[0]
        cx = (w - tw) // 2
        _draw_text_shadow(draw, (cx, cap_y), line, caption_font, TEXT_COLOR, shadow_offset=4)
        cap_y += lh

    # ── 구독 · 좋아요: 맨 마지막 슬라이드에서만 표시 ──
    if is_last:
        cta_text = "구독 · 좋아요 부탁드려요"
        cta_font_use = _load_font(int(cta_sz * 1.15))
        try:
            ctw = draw.textlength(cta_text, font=cta_font_use)
        except AttributeError:
            ctw = cta_font_use.getsize(cta_text)[0]
        cta_x = (w - ctw) // 2
        cta_text_y = h - int(h * 0.12)
        _draw_text_shadow(draw, (cta_x, cta_text_y), cta_text, cta_font_use, ACCENT, shadow_offset=4)

    # ── 하단: 슬라이드 번호 + 진행바 ──
    num_y = h - int(h * 0.025) - 14
    draw.text((margin, num_y - 28), f"{slide_idx + 1} / {total}", font=small_font, fill=(220, 220, 220))

    bar_y = h - int(h * 0.018)
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


def download_photo(url: str, w: int, h: int) -> Image.Image | None:
    """URL에서 실제 사진 다운로드 및 리사이즈"""
    key = hashlib.md5(url.encode()).hexdigest()[:12]
    cached = _image_cache_path("photo_" + key, f"{w}x{h}")
    if os.path.exists(cached):
        return Image.open(cached).convert("RGB")
    try:
        resp = req_lib.get(url, timeout=30, headers={"User-Agent": "Mozilla/5.0"})
        img = Image.open(io.BytesIO(resp.content)).convert("RGB")
        # 가로세로 비율 유지하며 크롭
        iw, ih = img.size
        scale = max(w / iw, h / ih)
        nw, nh = int(iw * scale), int(ih * scale)
        img = img.resize((nw, nh), Image.LANCZOS)
        left = (nw - w) // 2
        top = (nh - h) // 2
        img = img.crop((left, top, left + w, top + h))
        img.save(cached)
        return img
    except Exception as e:
        print(f"      ❌ 사진 다운로드 실패: {e}")
        return None


def split_by_sentence(script: str, max_slides: int = 14) -> list[str]:
    """문장 단위로 슬라이드 분할 (슬라이드별 TTS 동기화용)."""
    sents = re.split(r"(?<=[.!?])\s+", script.strip())
    sents = [s.strip() for s in sents if s.strip()]
    if not sents:
        return [script.strip()]
    if len(sents) <= max_slides:
        return sents
    per = (len(sents) + max_slides - 1) // max_slides
    return [" ".join(sents[i:i + per]) for i in range(0, len(sents), per)]


def render_video(
    script: str,
    title: str,
    out_path: str,
    w: int,
    h: int,
    voice: str = "onyx",
    photo_urls: list | None = None,  # 실제 사진 URL 목록 (지정 시 AI 생성 건너뜀)
):
    is_vertical = h > w
    max_slides = len(photo_urls) if photo_urls else (12 if is_vertical else 14)
    slides = split_by_sentence(script, max_slides=max_slides)

    if photo_urls:
        print(f"    📷 실제 사진 사용: {len(photo_urls)}장")
    else:
        print(f"    🎨 fal.ai FLUX 그래픽노블 이미지 생성: {len(slides)}장")

    print(f"    🎙️  슬라이드별 TTS 생성: {len(slides)}개")

    with tempfile.TemporaryDirectory() as tmp:
        video_concat = os.path.join(tmp, "video.txt")
        audio_concat = os.path.join(tmp, "audio.txt")
        slide_durs = []
        last_img_path = None

        with open(video_concat, "w") as vf, open(audio_concat, "w") as af:
            for i, text in enumerate(slides):
                # ── 슬라이드별 TTS ──
                slide_audio = os.path.join(tmp, f"a{i:04d}.mp3")
                tts(text, slide_audio, voice=voice)
                dur = audio_duration(slide_audio)
                slide_durs.append(dur)

                # ── 이미지 ──
                print(f"      [{i+1}/{len(slides)}] 이미지 준비 중...", end=" ", flush=True)
                if photo_urls:
                    url = photo_urls[i % len(photo_urls)]
                    bg = download_photo(url, w, h)
                    if bg is None:
                        print("🎨 실사만화 생성...", end=" ", flush=True)
                        realistic_prompt = (
                            f"Photorealistic illustration, cinematic style, warm colors, "
                            f"detailed scene depicting: {text[:200]}. "
                            f"Style: realistic digital painting, movie still quality, "
                            f"emotional and dramatic lighting, no text."
                        )
                        bg = generate_image(realistic_prompt, w, h)
                else:
                    image_prompt = build_image_prompt(text, title, i, len(slides))
                    bg = generate_image(image_prompt, w, h)
                    if bg is None:
                        print("🔄 DALL-E 2 폴백...", end=" ", flush=True)
                        bg = generate_image_dalle2(image_prompt, w, h)
                print("✅")

                # ── 프레임 합성 (가운데 하드 캡션 + 구독·좋아요 배너) ──
                frame = compose_frame(bg, text, title, i, len(slides), w, h)
                img_path = os.path.join(tmp, f"s{i:04d}.png")
                frame.save(img_path, "PNG")
                last_img_path = img_path

                vf.write(f"file '{img_path}'\nduration {dur:.4f}\n")
                af.write(f"file '{slide_audio}'\n")

                if i < len(slides) - 1:
                    time.sleep(1)

            # concat demuxer는 마지막 이미지 한 번 더 명시 필요
            vf.write(f"file '{last_img_path}'\n")

        total_dur = sum(slide_durs)
        print(f"    🎬 FFmpeg 렌더링: {len(slides)}슬라이드 = {total_dur:.1f}초")

        # ── 무음 비디오 ──
        silent = os.path.join(tmp, "silent.mp4")
        subprocess.run([
            "ffmpeg", "-y", "-f", "concat", "-safe", "0",
            "-i", video_concat,
            "-vsync", "vfr",
            "-vf", f"fps={FPS},scale={w}:{h}:flags=lanczos",
            "-c:v", "libx264", "-pix_fmt", "yuv420p",
            "-preset", "fast", "-crf", "20", silent,
        ], capture_output=True, check=True)

        # ── 슬라이드 오디오 합치기 (WAV 디코딩 후 재인코딩 → MP3 프레임 경계 불일치 방지) ──
        merged_audio = os.path.join(tmp, "narration.wav")
        subprocess.run([
            "ffmpeg", "-y", "-f", "concat", "-safe", "0",
            "-i", audio_concat,
            "-ar", "24000", "-ac", "1",
            merged_audio,
        ], capture_output=True, check=True)

        # ── 비디오 + 오디오 머지 (전체 나레이션 보존, 트레일링 프레임만 트림) ──
        subprocess.run([
            "ffmpeg", "-y",
            "-i", silent, "-i", merged_audio,
            "-map", "0:v:0", "-map", "1:a:0",
            "-c:v", "copy", "-c:a", "aac", "-b:a", "192k",
            "-shortest", out_path,
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
    modes: list | None = None,       # None = 전체, ["shorts"] = 쇼츠만, ["longform"] = 롱폼만
    photo_urls: list | None = None,  # 실제 사진 URL 목록 (지정 시 AI 이미지 생성 건너뜀)
    skip_script: bool = False,       # True = 기존 스크립트·TTS 파일 재사용 (재생성 건너뜀)
):
    _cost_reset()
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
        script_path = os.path.join(out_dir, f"{stem}_{mode}_script.txt")

        if skip_script and os.path.exists(script_path):
            print(f"  📝 기존 대본 재사용 (--skip-script)")
            script = open(script_path, encoding="utf-8").read()
        else:
            print("  📝 대본 생성 중...")
            script = generate_script(parsed, mode)
            with open(script_path, "w", encoding="utf-8") as f:
                f.write(script)
            print(f"    ✅ 대본 → {script_path}")

        # 영상 렌더링 (슬라이드별 TTS 내부 처리)
        video_path = os.path.join(out_dir, f"{stem}_{mode}.mp4")
        render_video(script, parsed["title"], video_path, w, h,
                     voice=voice, photo_urls=photo_urls)

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
    print()
    print(_cost_summary())
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
    ap.add_argument("--voice",          default="nova",
                    choices=["alloy", "echo", "fable", "onyx", "nova", "shimmer"])
    ap.add_argument("--mode",           default="all",
                    choices=["all", "shorts", "longform"], help="생성할 영상 모드")
    ap.add_argument("--photo-urls",     default=None,
                    help="실제 사진 URL 목록 (쉼표 구분). 지정 시 AI 이미지 생성 건너뜀")
    ap.add_argument("--skip-script",    action="store_true",
                    help="기존 스크립트·TTS 파일 재사용 (재생성 건너뜀)")
    args = ap.parse_args()

    modes = None if args.mode == "all" else [args.mode]
    photo_urls = [u.strip() for u in args.photo_urls.split(",")] if args.photo_urls else None

    process(
        mdx_path=args.mdx,
        out_dir=args.output,
        upload=args.upload,
        client_secrets=args.client_secrets,
        voice=args.voice,
        modes=modes,
        photo_urls=photo_urls,
        skip_script=args.skip_script,
    )


if __name__ == "__main__":
    main()
