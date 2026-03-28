#!/usr/bin/env python3
"""
OpenAI Sora 종료 포스트 → 1분 쇼츠용 MP3 생성
사용법: python3 scripts/sora_shorts_tts.py
"""

import asyncio, os, subprocess, shutil
from pathlib import Path
import edge_tts

VOICE = "ko-KR-SunHiNeural"
VOICE_RATE = "+20%"
VOICE_PITCH = "+12Hz"
OUTPUT_DIR = Path("videos")

# 1분 쇼츠용 나레이션 (10장면, 각 ~6초)
SCENES = [
    "오픈AI가 야심차게 출시한 AI 동영상 앱 소라, 6개월 만에 서비스를 종료했어요.",
    "가장 큰 이유는 비용이에요. 하루 운영비만 1,500만 달러, 약 195억 원이었어요.",
    "반면 총 수익은 겨우 210만 달러. 하루 비용도 못 버는 구조였죠.",
    "사용자도 빠르게 떠났어요. 다운로드가 3개월 만에 66% 급감했어요.",
    "60일 뒤 남아있는 사용자는 0%. 써보고 바로 삭제한 거예요.",
    "디즈니와의 10억 달러 투자 계약도 함께 무산됐어요.",
    "마블, 픽사, 스타워즈 캐릭터 200개를 활용하려던 계획이 사라졌죠.",
    "경쟁에서도 밀렸어요. 시댄스 2.0이 더 싸고 더 좋은 품질을 제공했거든요.",
    "오픈AI는 IPO를 앞두고 수익성 높은 분야에 집중하겠다고 밝혔어요.",
    "소라의 교훈. 아무리 대단한 기술도 비용 구조가 안 맞으면 끝이에요.",
]


async def generate_tts(tmp_dir: Path):
    """TTS 생성"""
    print("🎤 TTS 생성 중... (하이톤 여성 목소리)\n")
    audio_files = []
    for i, text in enumerate(SCENES):
        audio_path = tmp_dir / f"scene_{i:02d}.mp3"
        comm = edge_tts.Communicate(
            text=text, voice=VOICE, rate=VOICE_RATE, pitch=VOICE_PITCH,
        )
        await comm.save(str(audio_path))
        audio_files.append(audio_path)
        print(f"   [{i+1}/{len(SCENES)}] 완료: {text[:30]}...")
    return audio_files


def generate_silence(duration_ms: int, path: Path):
    """ffmpeg로 무음 생성"""
    subprocess.run([
        "ffmpeg", "-y", "-f", "lavfi",
        "-i", f"anullsrc=r=44100:cl=mono",
        "-t", str(duration_ms / 1000),
        "-q:a", "9", str(path)
    ], capture_output=True)


def concat_with_ffmpeg(audio_files: list, output_path: Path, tmp_dir: Path):
    """ffmpeg로 MP3 합본 (장면 사이 0.4초 쉼)"""
    print("\n🎵 MP3 합본 중...")

    # 무음 파일 생성
    silence_path = tmp_dir / "silence.mp3"
    generate_silence(400, silence_path)

    # concat 리스트 파일 생성
    concat_list = tmp_dir / "concat.txt"
    with open(concat_list, "w") as f:
        for i, af in enumerate(audio_files):
            f.write(f"file '{af.resolve()}'\n")
            if i < len(audio_files) - 1:
                f.write(f"file '{silence_path.resolve()}'\n")

    # ffmpeg concat
    subprocess.run([
        "ffmpeg", "-y", "-f", "concat", "-safe", "0",
        "-i", str(concat_list),
        "-c:a", "libmp3lame", "-b:a", "192k",
        str(output_path)
    ], capture_output=True)


def add_bg_music(voice_path: Path, output_path: Path, tmp_dir: Path):
    """배경음악 생성 후 믹스"""
    import numpy as np

    print("🎵 배경음악 생성 + 믹스 중...")

    # 음성 길이 확인
    result = subprocess.run([
        "ffprobe", "-v", "error", "-show_entries", "format=duration",
        "-of", "csv=p=0", str(voice_path)
    ], capture_output=True, text=True)
    duration = float(result.stdout.strip())

    # 앰비언트 음악 생성
    sr = 44100
    samples = int(sr * duration)
    t = np.linspace(0, duration, samples, dtype=np.float32)

    freqs = [(220.0, 0.25), (261.6, 0.15), (329.6, 0.18), (440.0, 0.10), (110.0, 0.12)]
    music = np.zeros_like(t)
    for freq, amp in freqs:
        mod = 0.7 + 0.3 * np.sin(2 * np.pi * 0.3 * t)
        music += amp * mod * np.sin(2 * np.pi * freq * t)

    # 스무딩
    kernel = np.ones(441) / 441
    music = np.convolve(music, kernel, mode='same')

    # 페이드
    fade_in = int(sr * 1.5)
    fade_out = int(sr * 2)
    music[:fade_in] *= np.linspace(0, 1, fade_in)
    music[-fade_out:] *= np.linspace(1, 0, fade_out)

    # 정규화
    music = music / (np.max(np.abs(music)) + 1e-6)
    music_int16 = (music * 0.9 * 32767).astype(np.int16)

    # WAV로 저장
    import wave
    bg_wav = tmp_dir / "bg_music.wav"
    with wave.open(str(bg_wav), 'w') as f:
        f.setnchannels(1)
        f.setsampwidth(2)
        f.setframerate(sr)
        f.writeframes(music_int16.tobytes())

    # ffmpeg로 믹스 (음성 + 배경음악 -20dB)
    subprocess.run([
        "ffmpeg", "-y",
        "-i", str(voice_path),
        "-i", str(bg_wav),
        "-filter_complex", "[1:a]volume=0.08[bg];[0:a][bg]amix=inputs=2:duration=first[out]",
        "-map", "[out]",
        "-c:a", "libmp3lame", "-b:a", "192k",
        str(output_path)
    ], capture_output=True)


async def main():
    OUTPUT_DIR.mkdir(exist_ok=True)
    tmp_dir = OUTPUT_DIR / "tmp_sora_shorts"
    tmp_dir.mkdir(exist_ok=True)

    # TTS 생성
    audio_files = await generate_tts(tmp_dir)

    # 합본
    voice_only = tmp_dir / "voice_only.mp3"
    concat_with_ffmpeg(audio_files, voice_only, tmp_dir)

    # 배경음악 믹스
    final_path = OUTPUT_DIR / "openai-sora-shutdown-shorts.mp3"
    add_bg_music(voice_only, final_path, tmp_dir)

    # 정리
    shutil.rmtree(tmp_dir)

    # 길이 확인
    result = subprocess.run([
        "ffprobe", "-v", "error", "-show_entries", "format=duration",
        "-of", "csv=p=0", str(final_path)
    ], capture_output=True, text=True)
    duration = float(result.stdout.strip())

    print(f"\n✅ 완성! → {final_path}")
    print(f"   길이: {duration:.0f}초 ({duration/60:.1f}분)")
    print(f"   하이톤 여성 목소리 ✓ / 배경음악 ✓")


if __name__ == "__main__":
    os.chdir(Path(__file__).parent.parent)
    asyncio.run(main())
