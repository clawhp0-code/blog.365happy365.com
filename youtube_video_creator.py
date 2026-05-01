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
_PRICE_FAL_PRO        = 0.05                # fal.ai FLUX Pro: $0.05/image
_PRICE_GPT_IMAGE      = 0.167              # gpt-image-1 1080x1920 (1024x1536 high): $0.167/image
_PRICE_IMAGEN4_FAST   = 0.02               # Imagen 4 Fast via fal.ai: $0.02/image
FAL_MODEL             = "fal-ai/flux/dev"    # "fal-ai/flux/schnell" or "fal-ai/flux-pro" or "fal-ai/flux/dev"
FAL_SEED              = 42                   # 일관성 유지용 시드 (None이면 랜덤)
IMAGE_ENGINE          = "fal"               # "fal" or "gpt-image-1" or "imagen4-fast"
_PRICE_CLAUDE_SCRIPT  = 0.04                # Claude opus 대본 생성 1회 추정 (input+output)

_cost = {"tts_chars": 0, "fal_images": 0, "claude_scripts": 0}


def _cost_reset():
    _cost["tts_chars"] = 0
    _cost["fal_images"] = 0
    _cost["claude_scripts"] = 0


def _cost_summary() -> str:
    if TTS_ENGINE == "edge":
        price_per_char = 0.0
        tts_label = f"edge_tts ({EDGE_TTS_VOICE}, 무료)"
    elif TTS_ENGINE == "google":
        price_per_char = _PRICE_GOOGLE_CHIRP3HD if "Chirp3" in GOOGLE_TTS_VOICE else _PRICE_GOOGLE_NEURAL2
        tts_label = f"Google TTS ({GOOGLE_TTS_VOICE})"
    elif TTS_ENGINE == "openai":
        price_per_char = _PRICE_OPENAI_TTS
        tts_label = f"OpenAI TTS ({OPENAI_TTS_VOICE})"
    else:
        price_per_char = _PRICE_TTS_PER_CHAR
        tts_label = "ElevenLabs TTS"
    tts_cost   = _cost["tts_chars"] * price_per_char
    if IMAGE_ENGINE == "gpt-image-1":
        fal_price = _PRICE_GPT_IMAGE
    elif IMAGE_ENGINE == "imagen4-fast":
        fal_price = _PRICE_IMAGEN4_FAST
    elif FAL_MODEL == "fal-ai/flux-pro":
        fal_price = _PRICE_FAL_PRO
    elif FAL_MODEL == "fal-ai/flux/dev":
        fal_price = 0.025
    else:
        fal_price = _PRICE_FAL_SCHNELL
    fal_cost   = _cost["fal_images"] * fal_price
    claude_cost = _cost["claude_scripts"] * _PRICE_CLAUDE_SCRIPT
    total = tts_cost + fal_cost + claude_cost
    krw = total * 1380
    lines = [
        f"  {'─'*50}",
        f"  💰 비용 요약",
        f"  {'─'*50}",
        f"  {tts_label:30s}: {_cost['tts_chars']:,}자 = ${tts_cost:.4f}",
        f"  {IMAGE_ENGINE if IMAGE_ENGINE in ('gpt-image-1','imagen4-fast') else 'fal.ai ' + FAL_MODEL.split('/')[-1]:20s}: {_cost['fal_images']}장   = ${fal_cost:.4f}",
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

    def fm_tags(fm_text):
        # Inline: tags: ["a", "b"]
        inline = re.search(r'^tags:\s*\[(.*?)\]\s*$', fm_text, re.MULTILINE)
        if inline:
            return [t.strip() for t in re.findall(r'["\']([^"\']+)["\']', inline.group(1)) if t.strip()]
        # Block: tags:\n  - a\n  - b
        block = re.search(r'^tags:\s*\n((?:[ \t]+-[^\n]*\n?)+)', fm_text, re.MULTILINE)
        if block:
            return [
                t.strip().strip("\"'")
                for t in re.findall(r'-\s*([^\n]+)', block.group(1))
                if t.strip()
            ]
        return []

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
        "tags":        fm_tags(fm),
        "body":        body,
    }


# ════════════════════════════════════════════════════════════
#  YouTube 메타데이터 빌더 — 영상별 고유 태그·풍부한 설명
# ════════════════════════════════════════════════════════════
_PLAYLISTS = [
    ("🏭 길디드 에이지",     "PL984q0BAx8IGrt3AO-z6cYtombqW6_82R"),
    ("🇺🇸 미국 역사 쇼츠",   "PL984q0BAx8IEcn5gl6UzSzKArnjcATPxb"),
    ("⚔️ 남북전쟁",          "PL984q0BAx8IG3tPnKknt6VG8pnVgIomTA"),
    ("🇺🇸 독립전쟁",         "PL984q0BAx8IHQqou7X_OJrr-bXt18vJva"),
    ("💛 감동 실화",          "PL984q0BAx8IGz3qqLAbeIy-GZJEzWZpEb"),
]
_CHANNEL_TAGS = ["미국역사", "USHistory", "역사", "AmericanHistory", "역사쇼츠", "HistoryShorts", "세계사"]


def _hashtagify(tag: str) -> str:
    # 공백·특수문자 제거 → 해시태그용
    return "#" + re.sub(r"[\s\-_().,!?]", "", tag)


def build_youtube_metadata(parsed: dict, mdx_path: str, is_short: bool) -> dict:
    slug = Path(mdx_path).stem.replace(".en", "")
    blog_url = f"https://blog.365happy365.com/ko/blog/{slug}"

    # 태그: 프론트매터 + 채널 고정. 중복 제거하면서 순서 유지. 15개 제한.
    fm_tags = [t for t in parsed.get("tags", []) if t]
    seen, all_tags = set(), []
    for t in fm_tags + _CHANNEL_TAGS:
        if t not in seen:
            seen.add(t); all_tags.append(t)
        if len(all_tags) >= 15:
            break

    # 해시태그: 프론트매터 태그 우선 5개 + 채널 고정 3개 (중복 회피)
    htag_seen, htags = set(), []
    for t in (fm_tags[:5] + _CHANNEL_TAGS[:3]):
        h = _hashtagify(t)
        if h not in htag_seen:
            htag_seen.add(h); htags.append(h)
    hashtags_line = " ".join(htags)

    playlist_block = "\n".join(f"{name}: https://www.youtube.com/playlist?list={pid}" for name, pid in _PLAYLISTS)

    description = (
        f"{parsed.get('description', '')}\n\n"
        f"📖 본문 보기: {blog_url}\n\n"
        f"📁 재생목록\n{playlist_block}\n\n"
        f"{hashtags_line}\n\n"
        f"🎙️ US History Stories — 매일 1분, 미국 역사의 결정적 순간"
    )

    return {
        "title":       parsed.get("title", ""),
        "description": description,
        "tags":        all_tags,
    }


# ════════════════════════════════════════════════════════════
#  2. 대본 생성 (Claude)
# ════════════════════════════════════════════════════════════
def generate_script(parsed: dict, mode: str) -> str:
    title, body = parsed["title"], parsed["body"]

    if mode == "shorts":
        prompt = f"""당신은 유튜브 역사 다큐멘터리 나레이터입니다.
아래 포스트를 읽고, 유튜브 Shorts용 **45~55초 한국어 나레이션 대본**을 작성하세요.

스타일 예시 (이 스타일을 반드시 따를 것):
---
1864년 2월, 남군에게는 마지막 카드가 있었습니다.
물속에서 움직이는 배. 사람이 손으로 돌리는 프로펠러. 철로 만든 관 하나.
그 안에 여덟 명이 탔습니다.
그리고 역사상 처음으로, 잠수함이 적함을 격침했습니다.
하지만 헌리호는 돌아오지 않았습니다.
131년이 지나 발견됐을 때, 승조원들은 자기 자리에 앉아 있었습니다. 탈출하려 한 흔적이 없었습니다.
그들은 무슨 일이 일어났는지도 모른 채, 그 자리에서 잠들었습니다.
---

규칙:
- 총 110~140 단어 (자연스러운 나레이션 호흡)
- **첫 문장은 1초 안에 시청자의 손가락을 멈추게 하는 후크**:
    - 충격적인 숫자 (예: "5분 만에 4,000명이 죽었습니다")
    - 호기심 자극 질문 (예: "왜 미국은 이 사진을 30년간 숨겼을까요?")
    - 반전 사실 (예: "히틀러가 죽은 그날, 미국은 다른 걸 결정하고 있었습니다")
    - 평범한 날짜 나열로 시작 금지 ("1789년 4월 30일에…" ❌)
- 문어체가 아닌 구어체 나레이션 — 다큐멘터리 성우가 읽는 것처럼
- 문장과 문장 사이에 드라마틱한 흐름과 여백이 있어야 함
- 핵심 숫자·팩트를 자연스럽게 녹여낼 것
- 마지막은 여운이 남는 한 줄로 마무리
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
_KO_ONES = ["", "일", "이", "삼", "사", "오", "육", "칠", "팔", "구"]
_KO_UNITS = [(1_0000_0000, "억"), (1_000_0000, "천만"), (100_0000, "백만"),
             (10_0000, "십만"), (1_0000, "만"), (1000, "천"), (100, "백"), (10, "십")]

# 고유어 숫자 (1~99) — 개·권·명·마리 등 단위 앞에 사용
_KO_NATIVE = {
    1:"한", 2:"두", 3:"세", 4:"네", 5:"다섯",
    6:"여섯", 7:"일곱", 8:"여덟", 9:"아홉", 10:"열",
    11:"열한", 12:"열두", 13:"열세", 14:"열네", 15:"열다섯",
    16:"열여섯", 17:"열일곱", 18:"열여덟", 19:"열아홉", 20:"스물",
    21:"스물한", 22:"스물두", 23:"스물세", 24:"스물네", 25:"스물다섯",
    30:"서른", 40:"마흔", 50:"쉰", 60:"예순", 70:"일흔", 80:"여든", 90:"아흔",
}
# 고유어 단위 (이 단위 앞 숫자는 고유어로 읽음)
# 고유어 단위: 개(물건), 권, 명, 마리 등 — 개월·개국 등 한자어 합성은 제외
# 대(臺/對)는 한자어 단위(칠대이)이므로 제외
_NATIVE_COUNTERS = r"(개(?!월|국|인|교)|권|명|마리|번|살|잔|채|켤레|벌|송이|가지|줄|군데|곳|곡|편|장)"

def _num_to_ko(n: int) -> str:
    if n == 0:
        return "영"
    result = ""
    for unit_val, unit_name in _KO_UNITS:
        if n >= unit_val:
            q = n // unit_val
            result += (_num_to_ko(q) if q > 1 else "") + unit_name
            n %= unit_val
    if n > 0:
        result += _KO_ONES[n]
    return result

def _num_to_ko_native(n: int) -> str:
    if n in _KO_NATIVE:
        return _KO_NATIVE[n]
    tens, ones = n // 10, n % 10
    base = _KO_NATIVE.get(tens * 10, _num_to_ko(tens * 10))
    return base + (_KO_NATIVE.get(ones, _KO_ONES[ones]) if ones else "")

def _replace_numbers(text: str) -> str:
    # 고유어 단위 앞 숫자: 열한 개, 두 명 등
    def repl_native(m):
        raw = m.group(1).replace(",", "")
        try:
            n = int(raw)
            if 1 <= n <= 99:
                return _num_to_ko_native(n) + " " + m.group(2)
        except ValueError:
            pass
        return m.group(0)
    text = re.sub(r"([\d,]+)\s*" + _NATIVE_COUNTERS, repl_native, text)
    # 나머지 숫자: 한자어
    def repl(m):
        raw = m.group(1).replace(",", "")
        try:
            return _num_to_ko(int(raw))
        except ValueError:
            return m.group(0)
    return re.sub(r"([\d,]+)", repl, text)

# ElevenLabs가 오발음하는 단어 → 교정 표기
_PRONUNCIATION_FIXES = {
}

def normalize_for_tts(text: str) -> str:
    if not re.search(r"[가-힣]", text):
        return text
    text = _replace_numbers(text)
    for wrong, right in _PRONUNCIATION_FIXES.items():
        text = text.replace(wrong, right)
    return text


ELEVENLABS_VOICE_ID = "mYk0rAapHek2oTw18z8x"  # 사용자 지정 보이스

# TTS 엔진 선택: "elevenlabs", "google", "edge", "openai"
TTS_ENGINE = "elevenlabs"
EDGE_TTS_VOICE = "ko-KR-SunHiNeural"
EDGE_TTS_RATE  = "+25%"
GOOGLE_TTS_VOICE = "ko-KR-Chirp3-HD-Aoede"
GOOGLE_TTS_API_KEY = os.getenv("GOOGLE_TTS_API_KEY", "").strip()
OPENAI_TTS_VOICE = "nova"           # alloy, echo, fable, onyx, nova, shimmer
OPENAI_TTS_SPEED = 1.2              # 1.0 = 기본속도

_PRICE_GOOGLE_NEURAL2  = 0.000016   # Google Neural2: $0.000016/자
_PRICE_GOOGLE_CHIRP3HD = 0.000160   # Google Chirp3-HD: $0.000160/자
_PRICE_OPENAI_TTS      = 0.000015   # OpenAI TTS: $15/1M chars

def tts(script: str, out_path: str, voice: str = TTS_ENGINE):
    import warnings; warnings.filterwarnings("ignore")
    normalized = normalize_for_tts(script)
    _cost["tts_chars"] += len(normalized)

    if TTS_ENGINE == "openai":
        resp = openai_client.audio.speech.create(
            model="tts-1",
            voice=OPENAI_TTS_VOICE,
            input=normalized,
            speed=OPENAI_TTS_SPEED,
        )
        resp.stream_to_file(out_path)
    elif TTS_ENGINE == "edge":
        import asyncio, edge_tts
        async def _synthesize():
            comm = edge_tts.Communicate(normalized, EDGE_TTS_VOICE, rate=EDGE_TTS_RATE)
            await comm.save(out_path)
        asyncio.run(_synthesize())
    elif TTS_ENGINE == "google":
        import requests, base64
        resp = requests.post(
            f"https://texttospeech.googleapis.com/v1/text:synthesize?key={GOOGLE_TTS_API_KEY}",
            json={
                "input": {"text": normalized},
                "voice": {"languageCode": "ko-KR", "name": GOOGLE_TTS_VOICE},
                "audioConfig": {"audioEncoding": "MP3", "speakingRate": 1.0},
            },
        )
        resp.raise_for_status()
        audio = base64.b64decode(resp.json()["audioContent"])
        with open(out_path, "wb") as f:
            f.write(audio)
    else:
        try:
            from elevenlabs.client import ElevenLabs
            el_client = ElevenLabs(api_key=ELEVENLABS_API_KEY)
            audio = el_client.text_to_speech.convert(
                voice_id=ELEVENLABS_VOICE_ID,
                text=normalized,
                model_id="eleven_multilingual_v2",
                voice_settings={"stability": 0.4, "similarity_boost": 0.8, "style": 0.5, "use_speaker_boost": True},
            )
            with open(out_path, "wb") as f:
                for chunk in audio:
                    f.write(chunk)
        except Exception as e:
            # ElevenLabs 실패 (401, rate limit, 네트워크 등) → 무료 Edge TTS로 자동 폴백
            print(f"    ⚠️  ElevenLabs 실패 ({type(e).__name__}: {str(e)[:80]}) — Edge TTS로 폴백")
            import asyncio, edge_tts
            async def _fallback():
                comm = edge_tts.Communicate(normalized, EDGE_TTS_VOICE, rate=EDGE_TTS_RATE)
                await comm.save(out_path)
            asyncio.run(_fallback())
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
    "Gilded Age oil painting, rich golden warm tones, opulent and dramatic lighting, "
    "19th century American realist painting style, Thomas Eakins and John Singer Sargent inspired, "
    "chiaroscuro shadows, museum-quality historical scene, painterly brushstrokes, "
    "deeply detailed, emotionally powerful composition, "
    "purely visual storytelling, completely text-free image, "
    "zero text zero letters zero writing zero signs zero symbols zero glyphs"
)


def _image_cache_path(prompt_hash: str, size: str) -> str:
    os.makedirs(IMAGE_CACHE_DIR, exist_ok=True)
    return os.path.join(IMAGE_CACHE_DIR, f"{prompt_hash}_{size.replace('x','_')}.png")


def _strip_non_ascii(s: str) -> str:
    """비영문 문자를 제거하고 ASCII + 숫자만 남김 (fal.ai 프롬프트용)."""
    return re.sub(r"[^\x20-\x7E]+", " ", s).strip()


def _infer_historical_context(title: str) -> str:
    """MDX 제목에서 시대/배경 컨텍스트를 추론해 이미지 프롬프트 base를 반환."""
    t = title.lower()
    if any(k in t for k in ["civil war", "남북전쟁", "dred scott", "드레드", "uncle tom", "엉클 톰",
                              "bull run", "불런", "lincoln", "링컨", "slavery", "노예", "emancipation",
                              "gettysburg", "게티즈버그", "reconstruction", "재건"]):
        return (
            "American Civil War era, 1850s-1860s, United States. "
            "Period-accurate 19th-century American settings: courtrooms, plantations, "
            "battlefields, government buildings, city streets. "
            "Realistic depiction of people of the era — including African American figures where historically appropriate. "
        )
    if any(k in t for k in ["revolutionary", "독립전쟁", "revolution", "colonial", "1775", "1776",
                              "lexington", "렉싱턴", "bunker", "벙커", "washington", "워싱턴"]):
        return (
            "American Revolutionary War, 1775-1783, colonial New England. "
            "White European-American soldiers and civilians in 18th-century colonial attire. "
            "Stone and wooden colonial architecture or wilderness landscape. "
        )
    # 기본: 미국 역사 일반
    return (
        "American historical scene, 19th century United States. "
        "Period-accurate clothing, architecture, and setting. "
    )


def _translate_scene_to_english(ko_text: str, en_title: str, context: str) -> str:
    """Claude로 한국어 슬라이드 텍스트를 영어 시각 장면 묘사로 번역."""
    try:
        resp = claude_client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=200,
            messages=[{
                "role": "user",
                "content": (
                    f"Write a vivid image generation prompt (3 sentences) for this historical scene.\n"
                    f"Historical context: {context}\n"
                    f"Story title: '{en_title}'\n"
                    f"This slide's text: '{ko_text}'\n\n"
                    f"STRICT rules:\n"
                    f"- Invent specific VISUAL details that directly match the slide text and historical context\n"
                    f"- Describe the exact people, actions, facial expressions, environment, and lighting shown in THIS slide\n"
                    f"- Stay true to the era and subject — do NOT invent scenes from the wrong time period\n"
                    f"- No text, no Asian elements, no anachronisms\n"
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
    context = _infer_historical_context(title)
    has_korean = bool(re.search(r"[가-힣]", slide_text))
    if has_korean:
        scene_desc = _translate_scene_to_english(slide_text[:300], clean_title, context)
    else:
        scene_desc = _strip_non_ascii(slide_text[:240])

    base = f"Scene {slide_idx + 1} of {total}. {context}"
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
            args = {
                "prompt": prompt,
                "image_size": {"width": w, "height": h},
                "num_images": 1,
            }
            if FAL_SEED is not None:
                args["seed"] = FAL_SEED
            if FAL_MODEL == "fal-ai/flux-pro":
                args["safety_tolerance"] = "5"
            else:
                args["enable_safety_checker"] = False
            result = fal_client.run(FAL_MODEL, arguments=args)
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


def generate_image_imagen4(prompt: str, w: int, h: int) -> Image.Image | None:
    """Imagen 4 Fast via fal.ai"""
    size_key = f"{w}x{h}"
    key = hashlib.md5(("imagen4_" + prompt).encode()).hexdigest()[:12]
    cached = _image_cache_path(key, size_key)
    if os.path.exists(cached):
        print(f"      💾 Imagen4 캐시 사용: {key}")
        return Image.open(cached).convert("RGB")
    try:
        _cost["fal_images"] += 1
        result = fal_client.run(
            "fal-ai/imagen4/preview/fast",
            arguments={
                "prompt": prompt[:2000],
                "image_size": {"width": w, "height": h},
                "num_images": 1,
            },
        )
        url = result["images"][0]["url"]
        img_data = req_lib.get(url, timeout=30).content
        img = Image.open(io.BytesIO(img_data)).convert("RGB")
        img.save(cached)
        return img
    except Exception as e:
        print(f"      ❌ Imagen4 생성 실패: {e}")
        return None


def generate_image_gpt(prompt: str, w: int, h: int) -> Image.Image | None:
    """gpt-image-1 이미지 생성"""
    import base64
    size_key = f"{w}x{h}"
    key = hashlib.md5(("gpt1_" + prompt).encode()).hexdigest()[:12]
    cached = _image_cache_path(key, size_key)
    if os.path.exists(cached):
        print(f"      💾 GPT 캐시 사용: {key}")
        return Image.open(cached).convert("RGB")

    # gpt-image-1: 세로 1024x1536, 가로 1536x1024
    if h > w:
        gpt_size = "1024x1536"
    else:
        gpt_size = "1536x1024"

    try:
        _cost["fal_images"] += 1
        resp = openai_client.images.generate(
            model="gpt-image-1",
            prompt=prompt[:4000],
            n=1,
            size=gpt_size,
            quality="high",
        )
        b64 = resp.data[0].b64_json
        img_data = base64.b64decode(b64)
        img = Image.open(io.BytesIO(img_data)).convert("RGB")
        img = img.resize((w, h), Image.LANCZOS)
        img.save(cached)
        return img
    except Exception as e:
        print(f"      ❌ GPT Image 생성 실패: {e}")
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


def extract_hook(title: str) -> str:
    """제목에서 가장 강렬한 짧은 후크 추출 (썸네일·첫 프레임용).

    예) "1789년 4월 30일, 그 이후: 워싱턴이…" → "그 이후"
        "월스트리트의 황제 — J.P. 모건…"   → "월스트리트의 황제"
        "1992년 4월 29일, LA가 불탔다: 로드니…" → "LA가 불탔다"
    """
    t = title.strip().strip('"\'')
    # 선두 날짜 제거
    t = re.sub(r"^\s*\d{4}년\s*\d+월\s*\d+일\s*[,，:：\s]*", "", t)
    t = re.sub(r"^\s*\d{4}년\s*[,，:：\s]*", "", t)
    # 구분자(— : , ·)로 분할 → 가장 짧고 의미있는 청크
    chunks = [c.strip() for c in re.split(r"[—:,·〜~]", t) if c.strip()]
    if not chunks:
        return (t[:14] + "…") if len(t) > 14 else t
    # 너무 짧은 청크(2자 이하)는 제외 후 가장 짧은 것 선택
    valid = [c for c in chunks if len(c) >= 3] or chunks
    valid.sort(key=len)
    hook = valid[0]
    # 후행 괄호 제거 (예: "(1871년)")
    hook = re.sub(r"\s*\([^)]*\)\s*$", "", hook).strip()
    # 따옴표·꺽쇠 제거
    hook = hook.strip('"\'""''「」『』')
    if len(hook) > 16:
        hook = hook[:16] + "…"
    return hook


def compose_frame(
    bg_image: Image.Image | None,
    slide_text: str,
    title: str,
    slide_idx: int,
    total: int,
    w: int,
    h: int,
    is_thumbnail: bool = False,
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

    # ── 썸네일 모드: 첫 슬라이드의 첫 프레임 ──
    # 큰 후크 텍스트를 정중앙에 배치 → YouTube 자동 썸네일이 이 프레임을 픽업
    if is_thumbnail:
        hook = extract_hook(title)
        # 큰 폰트 — 세로 영상은 더 크게
        hook_sz = int(h * 0.10) if is_vertical else int(h * 0.12)
        hook_font = _load_font(hook_sz)

        # 텍스트 너비 측정 (글자가 너무 길면 폰트 축소)
        try:
            tw = draw.textlength(hook, font=hook_font)
        except AttributeError:
            tw = hook_font.getsize(hook)[0]
        max_tw = w - margin * 2
        while tw > max_tw and hook_sz > 40:
            hook_sz -= 6
            hook_font = _load_font(hook_sz)
            try:
                tw = draw.textlength(hook, font=hook_font)
            except AttributeError:
                tw = hook_font.getsize(hook)[0]

        # 중앙 위쪽 1/3 지점에 검은 반투명 박스 + 황금 텍스트
        hook_y = int(h * 0.30)
        pad_x, pad_y = 40, 24
        box_x1 = (w - tw) // 2 - pad_x
        box_x2 = (w + tw) // 2 + pad_x
        box_y1 = hook_y - pad_y
        box_y2 = hook_y + hook_sz + pad_y

        overlay = Image.new("RGBA", frame.size, (0, 0, 0, 0))
        od = ImageDraw.Draw(overlay)
        try:
            od.rounded_rectangle([box_x1, box_y1, box_x2, box_y2], radius=20, fill=(0, 0, 0, 200))
        except AttributeError:
            od.rectangle([box_x1, box_y1, box_x2, box_y2], fill=(0, 0, 0, 200))
        frame = Image.alpha_composite(frame, overlay)
        draw = ImageDraw.Draw(frame)

        hook_x = (w - tw) // 2
        # 그림자 강화 (가독성)
        for off in [(5, 5), (3, 3)]:
            draw.text((hook_x + off[0], hook_y + off[1]), hook, font=hook_font, fill=(0, 0, 0, 255))
        draw.text((hook_x, hook_y), hook, font=hook_font, fill=ACCENT)

        # 채널 브랜딩 (하단 작게)
        brand = "🇺🇸 US History Stories"
        brand_font = _load_font(s_sz)
        try:
            btw = draw.textlength(brand, font=brand_font)
        except AttributeError:
            btw = brand_font.getsize(brand)[0]
        bx = (w - btw) // 2
        by = h - int(h * 0.08)
        _draw_text_shadow(draw, (bx, by), brand, brand_font, TEXT_COLOR, shadow_offset=3)

        return frame.convert("RGB")

    # ── 제목: 중간에서 위로 2/3 지점 (h/2 - (h/2)*2/3 = h/6) ──
    title_y = int(h / 6)
    line_y  = title_y - int(h * 0.012)
    draw.rectangle([margin, line_y, w - margin, line_y + 4], fill=ACCENT)

    short_title = (title[:26] + "…") if len(title) > 26 else title
    _draw_text_shadow(draw, (margin, title_y), short_title, title_font, TEXT_COLOR)

    # ── 하단 자막: 한 줄(또는 두 줄까지) + 반투명 박스 ──
    if slide_text and slide_text.strip():
        cap_text = slide_text.strip()
        max_c = 16 if is_vertical else 28
        wrapped_lines = textwrap.fill(cap_text, width=max_c).split("\n")[:2]
        lh = int(cap_sz * 1.35)
        block_h = lh * len(wrapped_lines)

        # 하단에서 약 18% 위에 자막 박스 배치 (진행바 위)
        cap_y_start = h - int(h * 0.20) - block_h

        max_tw = 0
        line_widths = []
        for line in wrapped_lines:
            try:
                tw = draw.textlength(line, font=caption_font)
            except AttributeError:
                tw = caption_font.getsize(line)[0]
            line_widths.append(tw)
            max_tw = max(max_tw, tw)

        box_pad_x = 32
        box_pad_y = 14
        box_x1 = max(margin // 2, (w - max_tw) // 2 - box_pad_x)
        box_y1 = cap_y_start - box_pad_y
        box_x2 = min(w - margin // 2, (w + max_tw) // 2 + box_pad_x)
        box_y2 = cap_y_start + block_h + box_pad_y

        overlay = Image.new("RGBA", frame.size, (0, 0, 0, 0))
        overlay_draw = ImageDraw.Draw(overlay)
        try:
            overlay_draw.rounded_rectangle(
                [box_x1, box_y1, box_x2, box_y2], radius=14, fill=(0, 0, 0, 180)
            )
        except AttributeError:
            overlay_draw.rectangle([box_x1, box_y1, box_x2, box_y2], fill=(0, 0, 0, 180))
        frame = Image.alpha_composite(frame, overlay)
        draw = ImageDraw.Draw(frame)

        cy = cap_y_start
        for line, tw in zip(wrapped_lines, line_widths):
            cx = (w - tw) // 2
            _draw_text_shadow(draw, (cx, cy), line, caption_font, TEXT_COLOR, shadow_offset=3)
            cy += lh

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


def split_into_caption_lines(text: str, max_chars: int) -> list[str]:
    """슬라이드 한 덩어리 텍스트를 자막 한 줄씩 표시할 단위로 분할.

    1순위: 마침표/물음표/느낌표 단위
    2순위: 쉼표 단위 (max_chars 이하로)
    3순위: textwrap (그래도 길면)
    """
    text = text.strip()
    if not text:
        return []

    sents = re.split(r"(?<=[.!?。])\s+", text)
    sents = [s.strip() for s in sents if s.strip()]

    lines: list[str] = []
    for s in sents:
        if len(s) <= max_chars:
            lines.append(s)
            continue
        chunks = re.split(r"(?<=[,，、])\s*", s)
        chunks = [c.strip() for c in chunks if c.strip()]
        cur = ""
        for c in chunks:
            if not cur:
                cur = c
            elif len(cur) + 1 + len(c) <= max_chars:
                cur = cur + " " + c
            else:
                lines.append(cur)
                cur = c
        if cur:
            lines.append(cur)

    final: list[str] = []
    for line in lines:
        if len(line) <= max_chars:
            final.append(line)
        else:
            final.extend(textwrap.wrap(line, width=max_chars))
    return [l for l in final if l.strip()]


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
                # ── 슬라이드별 TTS (숫자 변환 후 발음) / 자막은 원본 유지 ──
                slide_audio = os.path.join(tmp, f"a{i:04d}.mp3")
                tts(text, slide_audio, voice=voice)
                dur = audio_duration(slide_audio)
                slide_durs.append(dur)
                caption_text = text  # 자막: 숫자 그대로 표시

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
                    if IMAGE_ENGINE == "gpt-image-1":
                        bg = generate_image_gpt(image_prompt, w, h)
                    elif IMAGE_ENGINE == "imagen4-fast":
                        bg = generate_image_imagen4(image_prompt, w, h)
                    else:
                        bg = generate_image(image_prompt, w, h)
                        if bg is None:
                            print("🔄 DALL-E 2 폴백...", end=" ", flush=True)
                            bg = generate_image_dalle2(image_prompt, w, h)
                print("✅")

                # ── 자막 줄 분할: 한 줄씩 표시 (사진을 가리지 않게 하단 박스) ──
                cap_max_chars = 16 if h > w else 28
                caption_lines = split_into_caption_lines(caption_text, cap_max_chars)
                if not caption_lines:
                    caption_lines = [caption_text.strip()[:cap_max_chars] or " "]

                # 줄별 표시 시간: 글자 수에 비례 (총합 = 슬라이드 오디오 길이)
                char_counts = [max(len(l), 1) for l in caption_lines]
                total_chars = sum(char_counts)
                line_durs = [dur * c / total_chars for c in char_counts]

                for j, (line_text, line_dur) in enumerate(zip(caption_lines, line_durs)):
                    # 첫 슬라이드의 첫 프레임 = YouTube 자동 썸네일이 픽업 → 큰 후크 텍스트 오버레이
                    use_thumbnail = (i == 0 and j == 0)
                    frame = compose_frame(
                        bg, line_text, title, i, len(slides), w, h,
                        is_thumbnail=use_thumbnail,
                    )
                    img_path = os.path.join(tmp, f"s{i:04d}_{j:02d}.png")
                    frame.save(img_path, "PNG")
                    last_img_path = img_path
                    vf.write(f"file '{img_path}'\nduration {line_dur:.4f}\n")

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
            meta = build_youtube_metadata(parsed, mdx_path, is_short=(mode == "shorts"))
            url = upload_youtube(
                video_path,
                title=meta["title"],
                description=meta["description"],
                tags=meta["tags"],
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
