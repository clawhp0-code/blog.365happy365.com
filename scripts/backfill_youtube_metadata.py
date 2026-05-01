#!/usr/bin/env python3
"""
YouTube 메타데이터 백필 — 최근 N편의 영상에 영상별 고유 태그 + 풍부한 설명 적용.

사용:
  python3 scripts/backfill_youtube_metadata.py --limit 30 --dry-run     # 미리보기
  python3 scripts/backfill_youtube_metadata.py --limit 30               # 실제 업데이트

매칭 로직:
  YouTube 영상 제목에서 ' #Shorts' 제거 → content/posts/us-history-*.mdx 의 frontmatter title 과 일치
"""
import argparse
import json
import os
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from youtube_video_creator import parse_mdx, build_youtube_metadata  # noqa: E402

POSTS_DIR = ROOT / "content/posts"
TOKEN_PATH = "/Users/jarvismini/ushistorystories/secrets/refresh_token.json"


def get_yt():
    from google.oauth2.credentials import Credentials
    from googleapiclient.discovery import build
    with open(TOKEN_PATH) as f:
        creds = Credentials.from_authorized_user_info(json.load(f))
    return build("youtube", "v3", credentials=creds)


def list_recent_videos(yt, channel_id: str, limit: int) -> list:
    """최신 영상 limit개 메타데이터(snippet) 반환"""
    # search.list 로 비디오 ID만 수집 (한 번에 50개 제한)
    ids = []
    page_token = None
    while len(ids) < limit:
        resp = yt.search().list(
            part="id",
            channelId=channel_id,
            type="video",
            order="date",
            maxResults=min(50, limit - len(ids)),
            pageToken=page_token,
        ).execute()
        ids += [it["id"]["videoId"] for it in resp.get("items", [])]
        page_token = resp.get("nextPageToken")
        if not page_token:
            break
    ids = ids[:limit]

    # videos.list 로 전체 snippet 조회 (50개씩)
    out = []
    for i in range(0, len(ids), 50):
        chunk = ids[i:i + 50]
        resp = yt.videos().list(part="snippet,status", id=",".join(chunk)).execute()
        out.extend(resp.get("items", []))
    return out


def build_title_index() -> dict:
    """frontmatter title → mdx 경로 인덱스 (한국어 .mdx만, .en.mdx 제외)"""
    index = {}
    for p in POSTS_DIR.glob("us-history-*.mdx"):
        if p.name.endswith(".en.mdx"):
            continue
        try:
            parsed = parse_mdx(str(p))
            title = parsed.get("title", "").strip()
            if title:
                index[title] = p
        except Exception as e:
            print(f"⚠️  {p.name} 파싱 실패: {e}")
    return index


def strip_shorts_suffix(title: str) -> str:
    return re.sub(r"\s*#Shorts\s*$", "", title).strip()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=30, help="최신 N편 (기본 30)")
    ap.add_argument("--dry-run", action="store_true", help="실제 업데이트 없이 변경 내용 출력")
    ap.add_argument("--filter", default="us-history",
                    help="제목에 이 문자열 포함된 영상만 (기본: us-history 슬러그 매칭만)")
    args = ap.parse_args()

    print(f"📡 YouTube API 인증 ...")
    yt = get_yt()

    # 채널 ID 조회
    me = yt.channels().list(part="id,snippet", mine=True).execute()["items"][0]
    channel_id = me["id"]
    print(f"   채널: {me['snippet']['title']} ({channel_id})\n")

    # 최신 영상 가져오기
    print(f"📺 최신 {args.limit}편 조회 중 ...")
    videos = list_recent_videos(yt, channel_id, args.limit)
    print(f"   {len(videos)}편 수신\n")

    # mdx 인덱스 빌드
    print(f"📂 content/posts/us-history-*.mdx 인덱싱 ...")
    title_index = build_title_index()
    print(f"   {len(title_index)}편 한국어 mdx 발견\n")

    matched, unmatched, updated, skipped, failed = 0, 0, 0, 0, 0

    for v in videos:
        sn = v["snippet"]
        vid = v["id"]
        yt_title = sn["title"]
        base_title = strip_shorts_suffix(yt_title)

        mdx_path = title_index.get(base_title)
        if not mdx_path:
            unmatched += 1
            print(f"❌ 매칭 실패: {yt_title[:60]} ({vid})")
            continue

        matched += 1
        parsed = parse_mdx(str(mdx_path))
        is_short = " #Shorts" in yt_title
        meta = build_youtube_metadata(parsed, str(mdx_path), is_short=is_short)

        # snippet 업데이트는 categoryId 등 필수 필드 보존 필요
        new_snippet = {
            "title":           sn["title"],          # 제목은 유지
            "description":     meta["description"],
            "tags":            meta["tags"],
            "categoryId":      sn.get("categoryId", "27"),
            "defaultLanguage": sn.get("defaultLanguage", "ko"),
        }

        # 변경 여부 확인
        old_tags = sn.get("tags", [])
        old_desc_len = len(sn.get("description", ""))
        new_desc_len = len(new_snippet["description"])

        if set(old_tags) == set(new_snippet["tags"]) and sn.get("description", "").strip() == new_snippet["description"].strip():
            skipped += 1
            print(f"⏭  스킵 (변경 없음): {yt_title[:55]}")
            continue

        print(f"\n✅ {yt_title[:60]}")
        print(f"   ID: {vid}")
        print(f"   태그: {len(old_tags)}개 → {len(new_snippet['tags'])}개")
        print(f"        새 태그: {', '.join(new_snippet['tags'][:8])}{'...' if len(new_snippet['tags'])>8 else ''}")
        print(f"   설명: {old_desc_len}자 → {new_desc_len}자")

        if args.dry_run:
            continue

        try:
            yt.videos().update(
                part="snippet",
                body={"id": vid, "snippet": new_snippet},
            ).execute()
            updated += 1
        except Exception as e:
            failed += 1
            print(f"   ⚠️  업데이트 실패: {str(e)[:120]}")

    print(f"\n{'═'*60}")
    print(f"  결과 요약")
    print(f"{'═'*60}")
    print(f"  매칭: {matched} / 미매칭: {unmatched}")
    print(f"  업데이트: {updated} / 스킵: {skipped} / 실패: {failed}")
    if args.dry_run:
        print(f"\n  ⚠️  DRY-RUN 모드 — 실제 변경 없음. --dry-run 제거 후 다시 실행하세요.")
    print(f"{'═'*60}")


if __name__ == "__main__":
    main()
