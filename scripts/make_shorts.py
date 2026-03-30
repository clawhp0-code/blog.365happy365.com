#!/usr/bin/env python3
"""
블로그 포스트 → 1분 쇼츠 영상 자동 생성
사용법: python3 scripts/make_shorts.py [포스트파일.mdx] [이미지1.png 이미지2.png ...]

예시:
  python3 scripts/make_shorts.py content/posts/company-story-anthropic-2026-03-24.mdx \
    ~/Desktop/img1.png ~/Desktop/img2.png ...
"""

import sys, os, asyncio, shutil, wave
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance, ImageOps
import numpy as np
import edge_tts
from moviepy import (
    ImageClip, AudioFileClip, AudioArrayClip,
    CompositeAudioClip, concatenate_videoclips
)

# ── 설정 ─────────────────────────────────────────────
VIDEO_W, VIDEO_H = 1920, 1080   # 16:9 (YouTube 롱폼)
FPS = 30
FONT_PATH = "/System/Library/Fonts/AppleSDGothicNeo.ttc"
OUTPUT_DIR = Path("videos")
VOICE = "ko-KR-SunHiNeural"
VOICE_RATE = "+10%"     # 조금 여유있게
VOICE_PITCH = "+12Hz"   # 하이톤
BG_MUSIC_VOL = 0.10     # 배경음악 볼륨 (10%)
# ─────────────────────────────────────────────────────

SCRIPTS = {
    "national-growth-fund-korea": {
        "title": "국민성장펀드",
        "subtitle": "150조 원, 한국의 미래에 투자하다",
        "scenes": [
            {
                "text": "국민성장펀드\n무엇인가?",
                "narration": "한국에 새로운 펀드, 국민성장펀드가 등장했어요.",
            },
            {
                "text": "총 150조 원\n역대 최대 규모",
                "narration": "150조 원 규모, 역대 최대 정책 펀드예요.",
            },
            {
                "text": "정부 75조 원\n+ 민간 75조 원",
                "narration": "정부 75조에 민간 75조, 합쳐서 150조예요.",
            },
            {
                "text": "AI · 반도체\n바이오 · 이차전지",
                "narration": "AI, 반도체, 바이오 등 10대 첨단산업에 투자해요.",
            },
            {
                "text": "2026년에만\n30조 원 투입",
                "narration": "올해만 30조 원을 집중 투입해요.",
            },
            {
                "text": "1호 프로젝트\n신안우이 해상풍력",
                "narration": "1호 프로젝트는 신안우이 해상풍력이에요.",
            },
            {
                "text": "일반 국민도\n직접 투자 가능",
                "narration": "일반 국민도 직접 투자할 수 있어요.",
            },
            {
                "text": "2026년 6~7월\n공모 펀드 출시",
                "narration": "올해 6~7월, 7,200억 원 공모 펀드가 출시돼요.",
            },
            {
                "text": "소득공제 40%\n배당세 9% 분리과세",
                "narration": "소득공제 최대 40%, 배당세 9% 분리과세예요.",
            },
            {
                "text": "한국의 미래에\n함께 투자하세요",
                "narration": "한국의 미래에 함께 투자하고 과실도 나눠요.",
            },
        ]
    },
    "social-media-addiction-trial": {
        "title": "메타·유튜브 유죄 판결",
        "subtitle": "빅테크 역사를 바꿀 랜드마크 판결",
        "scenes": [
            {
                "text": "미국 법원\n역사적 판결",
                "narration": "미국 법원이 빅테크 역사에 남을 판결을 내렸어요.",
            },
            {
                "text": "Meta · YouTube\n소셜미디어 중독\n유죄",
                "narration": "메타와 유튜브가 소셜미디어 중독 소송에서 처음으로 유책 인정을 받았어요.",
            },
            {
                "text": "수천 건\n집단 소송\n연방법원 통합",
                "narration": "전국 수천 건의 집단 소송이 연방법원으로 통합된 초대형 사건이에요.",
            },
            {
                "text": "무한 스크롤\n알림 폭격\n추천 알고리즘",
                "narration": "무한 스크롤, 알림 폭격, 추천 알고리즘으로 청소년 중독을 유발했다는 거예요.",
            },
            {
                "text": "Section 230\n방패가 무너졌다",
                "narration": "그동안 빅테크의 법적 방패였던 통신품위법 230조가 이번엔 통하지 않았어요.",
            },
            {
                "text": "알고리즘 설계\n= 제조물 책임",
                "narration": "법원은 알고리즘 설계 자체가 제조물 책임 대상이라고 판단했어요.",
            },
            {
                "text": "내부 문서\n알면서도 숨겼다",
                "narration": "메타 내부 문서에서 청소년 피해를 알면서도 숨긴 사실이 드러났어요.",
            },
            {
                "text": "Meta 주가 -8%\nAlphabet -5%",
                "narration": "판결 직후 메타 주가는 8%, 알파벳은 5% 급락했어요.",
            },
            {
                "text": "수백억 달러\n배상 가능성",
                "narration": "법률 전문가들은 수백억 달러 규모의 배상 가능성을 언급해요.",
            },
            {
                "text": "담배 소송 이후\n최대의 판결",
                "narration": "1998년 담배 산업 집단소송에 비견되는, 세기의 판결이에요.",
            },
        ]
    },
    "company-story-anthropic": {
        "title": "Anthropic & Claude",
        "subtitle": "OpenAI를 떠난 사람들의 이야기",
        "scenes": [
            # ── 1부: 도입 ──────────────────────────────────
            {
                "text": "2021년 가을\nSan Francisco",
                "narration": "2021년 가을, 샌프란시스코 AI 업계에 조용한 충격이 찾아왔어요.",
            },
            {
                "text": "OpenAI 핵심 멤버\n11명이 한꺼번에\n사직서를 냈다",
                "narration": "오픈에이아이의 핵심 멤버 11명이 한꺼번에 사직서를 낸 거예요. 전체 직원의 상당 부분이었어요.",
            },
            {
                "text": "연구 부문 부사장\n다리오 아모데이",
                "narration": "그 중심에는 연구 부문 부사장 다리오 아모데이가 있었어요.",
            },
            {
                "text": "그의 여동생\n다니엘라 아모데이\n운영 부문 부사장",
                "narration": "그리고 운영 부문 부사장인 여동생 다니엘라까지. 남매가 함께 나온 거예요.",
            },
            {
                "text": "이유는\n단 하나",
                "narration": "이유는 딱 하나였어요.",
            },
            {
                "text": "AI가 충분히\n안전하게\n개발되고 있지 않다",
                "narration": "AI가 충분히 안전하게 개발되고 있지 않다는 거였죠.",
            },
            # ── 2부: 배경 ──────────────────────────────────
            {
                "text": "OpenAI는 그 무렵\nMicrosoft로부터\n막대한 투자를 받았다",
                "narration": "오픈에이아이는 그 무렵 마이크로소프트로부터 막대한 투자를 받고 상업화에 속도를 올리고 있었어요.",
            },
            {
                "text": "다리오 팀은\n내부에서\n방향을 바꾸려 했다",
                "narration": "다리오와 동료들은 내부에서 방향을 바꾸려 했어요. 더 신중하게, 더 안전하게 가야 한다고 주장했죠.",
            },
            {
                "text": "하지만\n뜻이 통하지 않았다",
                "narration": "하지만 뜻이 통하지 않았어요. 회사의 방향은 이미 상업화 쪽으로 기울어져 있었으니까요.",
            },
            {
                "text": "결국\n그들은 나왔다",
                "narration": "결국 그들은 나오기로 결심했어요.",
            },
            # ── 3부: 창업 ──────────────────────────────────
            {
                "text": "2021년 11월\nAnthropic 설립",
                "narration": "2021년 11월, 다리오와 다니엘라 남매는 새 회사를 설립했어요. 이름은 앤스로픽.",
            },
            {
                "text": "Anthropic\n인류 원리\nAnthropic Principle",
                "narration": "앤스로픽이라는 이름은 철학 용어 인류 원리에서 따왔어요. 인간이 중심이 되는 AI를 만들겠다는 선언이었죠.",
            },
            {
                "text": "창업 멤버 모두\nAI 안전성 연구에\n깊이 관여했던 사람들",
                "narration": "창업 멤버들은 모두 AI 안전성 연구에 깊이 관여했던 사람들이었어요. 더 똑똑한 AI가 아닌, 더 안전한 AI를 목표로 했죠.",
            },
            # ── 4부: 기술 ──────────────────────────────────
            {
                "text": "2022년\nConstitutional AI\n헌법적 AI 논문 발표",
                "narration": "2022년, 앤스로픽은 헌법적 AI라는 개념을 담은 논문을 발표했어요.",
            },
            {
                "text": "기존 AI 훈련 방식\n사람이 직접\n수백만 개의 답변을 평가",
                "narration": "기존 AI 훈련 방식은 사람이 직접 수백만 개의 답변에 좋다 나쁘다를 판단하는 방식이었어요. 비효율적이고, 사람의 편견이 그대로 스며드는 문제도 있었죠.",
            },
            {
                "text": "앤스로픽의 방식\nAI에게 먼저\n원칙을 가르쳤다",
                "narration": "앤스로픽은 달랐어요. AI에게 먼저 원칙, 즉 헌법을 가르쳤어요.",
            },
            {
                "text": "해롭지 않을 것\n정직할 것\n도움이 될 것",
                "narration": "해롭지 않을 것. 정직할 것. 도움이 될 것.",
            },
            {
                "text": "AI 스스로\n자신의 답변을\n평가하고 수정했다",
                "narration": "그리고 AI 스스로 자신의 답변이 이 원칙에 맞는지 평가하고 수정하게 했어요. AI가 AI를 가르치는 방식이었죠.",
            },
            # ── 5부: Claude 탄생 ────────────────────────────
            {
                "text": "2023년 3월\nClaude 공개",
                "narration": "2023년 3월, 앤스로픽은 드디어 AI 어시스턴트 클로드를 세상에 공개했어요.",
            },
            {
                "text": "Claude\n이름의 주인공은\n클로드 섀넌",
                "narration": "클로드라는 이름은 정보이론의 아버지로 불리는 수학자 클로드 섀넌에서 따왔어요.",
            },
            {
                "text": "1948년\n디지털 통신의\n수학적 기반을 만든 인물",
                "narration": "섀넌은 1948년 통신의 수학적 이론을 발표하며 디지털 통신의 기반을 만들었어요. 현대 인터넷과 AI의 뿌리에 그가 있어요.",
            },
            {
                "text": "처음엔 조용했다\nChatGPT의 인기에\n가려졌지만",
                "narration": "처음 공개된 클로드는 조용했어요. 챗지피티의 폭발적 인기에 가려 크게 주목받지 못했죠.",
            },
            {
                "text": "하지만\n써본 사람들은\n달랐다고 말했다",
                "narration": "하지만 직접 써본 사람들은 달랐다고 말했어요.",
            },
            {
                "text": "모른다고\n솔직하게 말하는 AI\n과장하지 않는 AI",
                "narration": "모른다고 솔직하게 말하는 AI. 불필요한 과장이 없는 AI. 거절할 때도 부드러운 AI였어요.",
            },
            # ── 6부: 투자 ──────────────────────────────────
            {
                "text": "구글이 베팅했다\n3억 달러 투자",
                "narration": "구글이 먼저 베팅했어요. 3억 달러를 투자했죠.",
            },
            {
                "text": "그리고\n추가 최대\n20억 달러 발표",
                "narration": "그리고 같은 해 말, 추가로 최대 20억 달러를 투자하겠다고 발표했어요.",
            },
            {
                "text": "아마존도 뒤따랐다\n최대 40억 달러\n역대 최대 규모",
                "narration": "아마존도 뒤따랐어요. 최대 40억 달러. 단일 AI 스타트업에 대한 역대 최대 투자 중 하나였어요.",
            },
            {
                "text": "창업 2년 만에\n기업 가치\n수십조 원",
                "narration": "창업 2년 만에 앤스로픽의 기업 가치는 수십조 원 규모로 커졌어요.",
            },
            # ── 7부: 의미 ──────────────────────────────────
            {
                "text": "안전이\n경쟁력이 됐다",
                "narration": "흥미로운 반전이 있었어요. 안전을 위해 느리게 가겠다던 회사가, 안전 때문에 선택받는 회사가 된 거예요.",
            },
            {
                "text": "의료, 법률, 금융\n기업들이\n클로드를 선택했다",
                "narration": "의료, 법률, 금융 분야 기업들이 클로드를 선택했어요. AI가 잘못된 정보를 확신 있게 말하거나, 민감한 정보를 유출하는 걸 가장 두려워하는 업계들이었죠.",
            },
            {
                "text": "사직서 한 장이\n수십조 원짜리\n회사를 만들었다",
                "narration": "사직서 한 장이 수십조 원짜리 회사를 만들었어요.",
            },
            {
                "text": "옳은 이유로\n시작하면\n세상이 따라온다",
                "narration": "옳은 이유로 시작하면 세상이 따라와요. 앤스로픽이 직접 증명했어요.",
            },
        ]
    }
}


def generate_ambient_music(duration: float, tmp_dir: Path) -> Path:
    """부드러운 시네마틱 앰비언트 배경음악 생성"""
    print("🎵 배경음악 생성 중...")
    sr = 44100
    t = np.linspace(0, duration, int(sr * duration), dtype=np.float32)

    # Am 코드 기반 앰비언트 레이어
    freqs = [
        (220.0, 0.25),   # A3
        (261.6, 0.15),   # C4
        (329.6, 0.18),   # E4
        (440.0, 0.10),   # A4
        (110.0, 0.12),   # A2 (베이스)
        (523.2, 0.06),   # C5 (하이)
    ]

    music = np.zeros_like(t)
    for freq, amp in freqs:
        # 느린 진폭 변조 (펄스 효과)
        mod = 0.7 + 0.3 * np.sin(2 * np.pi * 0.3 * t)
        music += amp * mod * np.sin(2 * np.pi * freq * t)

    # 저역통과 필터 효과 (부드럽게)
    from numpy import convolve
    kernel_size = 441  # 10ms
    kernel = np.ones(kernel_size) / kernel_size
    music = convolve(music, kernel, mode='same')

    # 페이드인 (2초) / 페이드아웃 (3초)
    fade_in  = int(sr * 2)
    fade_out = int(sr * 3)
    music[:fade_in]  *= np.linspace(0, 1, fade_in)
    music[-fade_out:] *= np.linspace(1, 0, fade_out)

    # 정규화 후 볼륨 조절
    music = music / (np.max(np.abs(music)) + 1e-6)
    music = (music * 0.9 * 32767).astype(np.int16)

    wav_path = tmp_dir / "bg_music.wav"
    with wave.open(str(wav_path), 'w') as f:
        f.setnchannels(1)
        f.setsampwidth(2)
        f.setframerate(sr)
        f.writeframes(music.tobytes())

    print("   ✅ 배경음악 완료")
    return wav_path


def make_bw_frame_vertical(text: str, title: str, subtitle: str,
                           user_img_path: Path) -> Image.Image:
    """흑백 스타일 장면 이미지 생성 (9:16 세로형)"""
    W, H = 1080, 1920
    canvas = Image.new("RGB", (W, H), (10, 10, 10))

    if user_img_path and user_img_path.exists():
        try:
            bg = Image.open(str(user_img_path)).convert("RGB")
            iw, ih = bg.size
            target_ratio = W / H
            img_ratio = iw / ih
            if img_ratio > target_ratio:
                new_w = int(ih * target_ratio)
                left = (iw - new_w) // 2
                bg = bg.crop((left, 0, left + new_w, ih))
            else:
                new_h = int(iw / target_ratio)
                top = (ih - new_h) // 2
                bg = bg.crop((0, top, iw, top + new_h))
            bg = bg.resize((W, H), Image.LANCZOS)
            bg = ImageOps.grayscale(bg).convert("RGB")
            bg = bg.filter(ImageFilter.GaussianBlur(radius=4))
            bg = ImageEnhance.Brightness(bg).enhance(0.4)
            bg = ImageEnhance.Contrast(bg).enhance(1.3)
            canvas.paste(bg, (0, 0))
        except Exception as e:
            print(f"   ⚠️  이미지 처리 오류: {e}")

    draw = ImageDraw.Draw(canvas)
    try:
        font_title = ImageFont.truetype(FONT_PATH, 44, index=6)
        font_sub   = ImageFont.truetype(FONT_PATH, 30, index=4)
        font_main  = ImageFont.truetype(FONT_PATH, 80, index=8)
        font_label = ImageFont.truetype(FONT_PATH, 28, index=4)
    except Exception:
        font_title = font_sub = font_main = font_label = ImageFont.load_default()

    pad = 65

    # 상단 바
    draw.rectangle([(0, 0), (W, 270)], fill=(0, 0, 0))
    draw.text((pad, 75),  title,    font=font_title, fill=(220, 220, 220))
    draw.text((pad, 140), subtitle, font=font_sub,   fill=(150, 150, 150))
    draw.line([(pad, 230), (W - pad, 230)], fill=(70, 70, 70), width=2)

    # 본문 텍스트 (세로 중앙)
    lines = text.split("\n")
    line_h = 110
    total_h = len(lines) * line_h
    start_y = (H - total_h) // 2

    box_pad = 50
    draw.rectangle([
        (pad - box_pad, start_y - box_pad),
        (W - pad + box_pad, start_y + total_h + box_pad)
    ], fill=(0, 0, 0, 170) if hasattr(draw, 'rectangle') else (0, 0, 0))

    for i, line in enumerate(lines):
        bbox = draw.textbbox((0, 0), line, font=font_main)
        w = bbox[2] - bbox[0]
        x = (W - w) // 2
        y = start_y + i * line_h
        draw.text((x + 3, y + 3), line, font=font_main, fill=(0, 0, 0))
        draw.text((x, y), line, font=font_main, fill=(255, 255, 255))

    # 하단 바
    draw.rectangle([(0, H - 80), (W, H)], fill=(0, 0, 0))
    draw.text((pad, H - 58), "blog.365happy365.com",
              font=font_label, fill=(110, 110, 110))

    return canvas


def make_bw_frame(text: str, title: str, subtitle: str,
                  user_img_path: Path) -> Image.Image:
    """흑백 스타일 장면 이미지 생성 (16:9)"""
    canvas = Image.new("RGB", (VIDEO_W, VIDEO_H), (10, 10, 10))

    # 배경: 왼쪽 절반에 이미지, 오른쪽 절반에 텍스트
    IMG_W = VIDEO_W // 2   # 960px
    TXT_X = IMG_W          # 텍스트 영역 시작

    # 배경 이미지 (왼쪽) → 흑백
    if user_img_path and user_img_path.exists():
        try:
            bg = Image.open(str(user_img_path)).convert("RGB")
            iw, ih = bg.size
            target_ratio = IMG_W / VIDEO_H
            img_ratio = iw / ih
            if img_ratio > target_ratio:
                new_w = int(ih * target_ratio)
                left = (iw - new_w) // 2
                bg = bg.crop((left, 0, left + new_w, ih))
            else:
                new_h = int(iw / target_ratio)
                top = (ih - new_h) // 2
                bg = bg.crop((0, top, iw, top + new_h))
            bg = bg.resize((IMG_W, VIDEO_H), Image.LANCZOS)
            bg = ImageOps.grayscale(bg).convert("RGB")
            bg = bg.filter(ImageFilter.GaussianBlur(radius=3))
            bg = ImageEnhance.Brightness(bg).enhance(0.5)
            bg = ImageEnhance.Contrast(bg).enhance(1.2)
            canvas.paste(bg, (0, 0))
        except Exception as e:
            print(f"   ⚠️  이미지 처리 오류: {e}")

    # 이미지-텍스트 경계 그라데이션 (중앙 페이드)
    for x in range(80):
        alpha = int(255 * (x / 80))
        draw_tmp = ImageDraw.Draw(canvas)
        draw_tmp.line([(IMG_W - 80 + x, 0), (IMG_W - 80 + x, VIDEO_H)],
                      fill=(10, 10, 10, alpha))

    draw = ImageDraw.Draw(canvas)

    try:
        font_title  = ImageFont.truetype(FONT_PATH, 36, index=6)
        font_sub    = ImageFont.truetype(FONT_PATH, 24, index=4)
        font_main   = ImageFont.truetype(FONT_PATH, 72, index=8)
        font_label  = ImageFont.truetype(FONT_PATH, 22, index=4)
    except Exception:
        font_title = font_sub = font_main = font_label = ImageFont.load_default()

    pad = 50
    txt_area_w = VIDEO_W - TXT_X  # 960px

    # 상단 타이틀 (전체 폭)
    draw.rectangle([(0, 0), (VIDEO_W, 100)], fill=(0, 0, 0))
    draw.text((pad, 28), title,    font=font_title, fill=(220, 220, 220))
    draw.text((pad + 400, 35), subtitle, font=font_sub, fill=(140, 140, 140))
    draw.line([(0, 100), (VIDEO_W, 100)], fill=(60, 60, 60), width=1)

    # 오른쪽 텍스트 영역 배경
    draw.rectangle([(TXT_X, 100), (VIDEO_W, VIDEO_H)], fill=(12, 12, 12))

    # 세로 중앙에 본문 텍스트
    lines = text.split("\n")
    line_h = 95
    total_h = len(lines) * line_h
    start_y = (VIDEO_H - total_h) // 2

    # 텍스트 박스
    box_pad = 40
    draw.rectangle([
        (TXT_X + pad - box_pad, start_y - box_pad),
        (VIDEO_W - pad + box_pad, start_y + total_h + box_pad)
    ], fill=(25, 25, 25))

    for i, line in enumerate(lines):
        bbox = draw.textbbox((0, 0), line, font=font_main)
        w = bbox[2] - bbox[0]
        x = TXT_X + (txt_area_w - w) // 2
        y = start_y + i * line_h
        draw.text((x + 2, y + 2), line, font=font_main, fill=(0, 0, 0))
        draw.text((x, y), line, font=font_main, fill=(255, 255, 255))

    # 하단 바
    draw.rectangle([(0, VIDEO_H - 50), (VIDEO_W, VIDEO_H)], fill=(0, 0, 0))
    draw.text((pad, VIDEO_H - 35), "blog.365happy365.com",
              font=font_label, fill=(100, 100, 100))

    return canvas


async def generate_tts_async(scenes: list, tmp_dir: Path) -> list:
    """하이톤 20대 여성 목소리 TTS 생성"""
    print(f"\n🎤 TTS 생성 중... (하이톤 여성 목소리)")
    audio_files = []
    for i, scene in enumerate(scenes):
        audio_path = tmp_dir / f"audio_{i:02d}.mp3"
        communicate = edge_tts.Communicate(
            text=scene["narration"],
            voice=VOICE,
            rate=VOICE_RATE,
            pitch=VOICE_PITCH,
        )
        await communicate.save(str(audio_path))
        audio_files.append(str(audio_path))
        print(f"   [{i+1}/{len(scenes)}] 완료")
    return audio_files


def make_video(mdx_path: str, user_images: list,
               fmt: str = "16:9", output_name: str = None):
    global VIDEO_W, VIDEO_H, VOICE_RATE

    # 포맷 설정
    if fmt == "9:16":
        VIDEO_W, VIDEO_H = 1080, 1920
        VOICE_RATE = "+20%"
    else:
        VIDEO_W, VIDEO_H = 1920, 1080
        VOICE_RATE = "+10%"

    stem = Path(mdx_path).stem
    key = next((k for k in SCRIPTS if k in stem), None)
    if not key:
        print(f"❌ 스크립트 없음: {stem}")
        sys.exit(1)

    script = SCRIPTS[key]
    # 9:16 1분 → 처음 10장면만 사용
    scenes = script["scenes"][:10] if fmt == "9:16" else script["scenes"]
    title, subtitle = script["title"], script["subtitle"]

    OUTPUT_DIR.mkdir(exist_ok=True)
    tmp_dir = OUTPUT_DIR / f"tmp_{stem}_{fmt.replace(':','x')}"
    tmp_dir.mkdir(exist_ok=True)

    fmt_label = "9:16 쇼츠 (1분)" if fmt == "9:16" else "16:9 롱폼 (4분)"
    print(f"\n🎬 {fmt_label} 영상 생성 시작")
    print(f"   장면: {len(scenes)}개 / 사용 이미지: {len(user_images)}장\n")

    # 이미지 경로 확인
    img_paths = []
    for p in user_images:
        path = Path(p).expanduser()
        if path.exists():
            img_paths.append(path)
    print(f"   ✅ 이미지 {len(img_paths)}장 확인\n")

    # TTS 생성
    audio_files = asyncio.run(generate_tts_async(scenes, tmp_dir))

    # 배경음악 생성 (총 길이 계산 후)
    # 먼저 오디오 길이 측정
    durations = []
    for af in audio_files:
        a = AudioFileClip(af)
        durations.append(max(a.duration + 0.3, 3.5))
        a.close()
    total_duration = sum(durations) + 2  # 여유 2초

    bg_music_path = generate_ambient_music(total_duration, tmp_dir)

    # 장면 클립 생성
    print("\n🖼️  흑백 장면 합성 중...")
    clips = []
    for i, (scene, audio_path, dur) in enumerate(zip(scenes, audio_files, durations)):
        # 이미지 순환 배정
        img_path = img_paths[i % len(img_paths)] if img_paths else None

        frame = make_bw_frame_vertical(scene["text"], title, subtitle, img_path) \
            if fmt == "9:16" else \
            make_bw_frame(scene["text"], title, subtitle, img_path)
        frame_path = tmp_dir / f"frame_{i:02d}.jpg"
        frame.save(str(frame_path), quality=95)

        # 나레이션 + 배경음악 믹스
        narration = AudioFileClip(audio_path)
        bg_music  = (
            AudioFileClip(str(bg_music_path))
            .subclipped(sum(durations[:i]), sum(durations[:i]) + dur)
            .with_volume_scaled(BG_MUSIC_VOL)
        )
        mixed_audio = CompositeAudioClip([narration, bg_music])

        clip = (
            ImageClip(str(frame_path))
            .with_duration(dur)
            .with_audio(mixed_audio)
        )
        clips.append(clip)
        print(f"   [{i+1}/{len(scenes)}] {dur:.1f}초")

    # 최종 영상
    print("\n🎞️  영상 렌더링 중...")
    final = concatenate_videoclips(clips, method="compose")
    suffix = output_name if output_name else (
        "shorts-9x16" if fmt == "9:16" else "longform-16x9"
    )
    output_path = OUTPUT_DIR / f"{stem}-{suffix}.mp4"
    final.write_videofile(
        str(output_path),
        fps=FPS,
        codec="libx264",
        audio_codec="aac",
        temp_audiofile=str(tmp_dir / "temp.m4a"),
        remove_temp=True,
        logger=None
    )

    shutil.rmtree(tmp_dir)

    print(f"\n✅ 완성! → {output_path}")
    print(f"   해상도: {VIDEO_W}×{VIDEO_H} / 길이: {final.duration:.0f}초")
    print(f"   흑백 모드 ✓ / 배경음악 ✓ / 하이톤 여성 목소리 ✓")
    print(f"\n💡 YouTube Shorts / 인스타그램 릴스 / TikTok 업로드 가능")


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("mdx", help="포스트 MDX 파일 경로")
    parser.add_argument("images", nargs="*", help="배경 이미지 경로들")
    parser.add_argument("--format", choices=["9:16", "16:9"], default="16:9",
                        help="영상 포맷 (기본: 16:9)")
    parser.add_argument("--output", default=None, help="출력 파일명 접미사")
    args = parser.parse_args()

    mdx = args.mdx
    images = args.images
    os.chdir(Path(__file__).parent.parent)
    make_video(mdx, images, fmt=args.format, output_name=args.output)
