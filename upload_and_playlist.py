#!/usr/bin/env python3
"""
업로드 + 독립전쟁 재생목록 추가 + 시간순 정렬
"""
import json, os, re, sys, time
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload
from google_auth_oauthlib.flow import InstalledAppFlow
from google.oauth2.credentials import Credentials
import google.auth.transport.requests as grequests

SCOPES         = ["https://www.googleapis.com/auth/youtube"]
TOKEN_FILE     = "youtube_token_full.json"
SECRETS_FILE   = "client_secrets.json"

# 독립전쟁 재생목록 ID
REVOLUTION_PLAYLIST_ID = None   # 아래 get_revolution_playlist()로 자동 조회

# ── 업로드할 영상 목록 (제목, 경로, 날짜 태그) ──────────────────
VIDEOS = [
    # ── Day 2 (2026-04-26) ──────────────────────────────────
    {
        "path":  "video_output/us-history-nellie-bly-1889-2026-04-25_shorts.mp4",
        "title": "72일 만에 세계를 돌았다 — 넬리 블라이 (1889년) #Shorts",
        "description": (
            "1889년 11월 14일. 25세 여기자 넬리 블라이가 뉴욕을 혼자 출발했다.\n"
            "목표: 쥘 베른 소설 속 80일 기록을 깨는 것.\n"
            "72일 6시간 11분 후, 그녀는 돌아왔다.\n\n"
            "#미국역사 #길디드에이지 #넬리블라이 #NellieBly #세계일주 #GildedAge #USHistory"
        ),
        "tags": ["미국역사", "길디드에이지", "넬리블라이", "NellieBly", "세계일주", "1889", "GildedAge", "USHistory", "Shorts"],
        "playlist": "길디드",
        "publish_at": "2026-04-26T08:00:00+09:00",
    },
    {
        "path":  "video_output/us-history-homestead-strike-1892-2026-04-25_shorts.mp4",
        "title": "총이 나왔다 — 홈스테드 파업 (1892년) #Shorts",
        "description": (
            "1892년 7월, 카네기 철강 공장에서 파업이 일어났다.\n"
            "회사는 300명의 핑커턴 무장 요원을 불렀다. 강변에서 총격전이 벌어졌다.\n"
            "12명이 사망했다. 철강 노조는 40년간 다시 서지 못했다.\n\n"
            "#미국역사 #길디드에이지 #홈스테드파업 #HomesteadStrike #노동운동 #GildedAge #USHistory"
        ),
        "tags": ["미국역사", "길디드에이지", "홈스테드파업", "HomesteadStrike", "카네기", "1892", "GildedAge", "USHistory", "Shorts"],
        "playlist": "길디드",
        "publish_at": "2026-04-26T08:30:00+09:00",
    },
    {
        "path":  "video_output/us-history-ellis-island-1892-2026-04-25_shorts.mp4",
        "title": "1,200만 명이 이 문을 통과했다 — 엘리스 섬 (1892년) #Shorts",
        "description": (
            "1892년부터 1954년까지. 1,200만 명의 이민자가 엘리스 섬을 통과했다.\n"
            "6초 만에 판단됐다. 통과 아니면 추방.\n"
            "미국인의 약 40%가 이 섬을 거쳐 온 조상을 가지고 있다.\n\n"
            "#미국역사 #길디드에이지 #엘리스섬 #EllisIsland #이민 #GildedAge #USHistory"
        ),
        "tags": ["미국역사", "길디드에이지", "엘리스섬", "EllisIsland", "이민", "1892", "GildedAge", "USHistory", "Shorts"],
        "playlist": "길디드",
        "publish_at": "2026-04-26T09:00:00+09:00",
    },
    {
        "path":  "video_output/us-history-pullman-strike-1894-2026-04-25_shorts.mp4",
        "title": "연방 정부가 노동자를 쐈다 — 풀먼 파업 (1894년) #Shorts",
        "description": (
            "1894년, 시카고 철도 노동자 25만 명이 파업했다.\n"
            "미국 대통령은 주지사의 반대를 무시하고 연방군을 파견했다. 13명이 사망했다.\n"
            "그리고 미국만의 9월 노동절이 만들어졌다.\n\n"
            "#미국역사 #길디드에이지 #풀먼파업 #PullmanStrike #노동절 #GildedAge #USHistory"
        ),
        "tags": ["미국역사", "길디드에이지", "풀먼파업", "PullmanStrike", "노동절", "1894", "GildedAge", "USHistory", "Shorts"],
        "playlist": "길디드",
        "publish_at": "2026-04-26T09:30:00+09:00",
    },
]

# 재생목록 시간순 정렬 기준 — 키워드 매핑 (앞에 있을수록 먼저)
REVOLUTION_ORDER = [
    # 1775-04 렉싱턴·콩코드
    "은세공인",
    "폴 리비어",
    "리비어는 잡혔다",
    "리비어",
    "paul revere",
    "농부 70명",          # 렉싱턴·콩코드 전투
    "렉싱턴·콩코드",
    "렉싱턴 이후",        # 렉싱턴 이후 일주일
    "렉싱턴 2주",         # 렉싱턴 2주 후
    # 1775-05 타이컨더로가
    "타이컨더로가",
    "ticonderoga",
    "총 한 발 없이",
    # 1775-05 대륙회의 → 평화 편지 → 조지 3세 반응 순
    "대륙회의",
    "충성 편지",
    "1775년 봄",
    "평화 편지",
    "런던의 충격",        # 조지 3세가 렉싱턴 소식을 들었을 때
    "조지 3세",
    # 1775-06 벙커힐
    "벙커힐",
    "bunker hill",
    "조셉 워렌",
    "joseph warren",
    # 1775-07 워싱턴 부임
    "여기 군대가 있기나",
    "워싱턴이 본 것",
    # 1775-08 총알 9발
    "총알 9발",
    "9 rounds",
    "9발",
    # 1775-08 흑인 병사 금지령
    "흑인 병사",
    "입대 금지",
    "던모어",
    "자유를 원하는 사람을 거부",
    # 1775-09~12 아놀드 캐나다
    "아놀드",
    "arnold",
    "캐나다",
    # 1776-01 상식
    "상식",
    "common sense",
    "페인",
    # 1776-03 보스턴 해방
    "보스턴 해방",
    "보스턴해방",
    "서점 주인",
    # 1776-07 독립선언
    "독립선언",
    "independence",
    # 1776-08 뉴욕 함락
    "뉴욕을 잃었다",
    "뉴욕 함락",
    "롱아일랜드",
    "워싱턴이 도망",
    "도망쳤다",
    # 1776-12 델라웨어
    "델라웨어",
    "delaware",
    "크리스마스 밤",
    # 1777 새러토가
    "새러토가",
    "saratoga",
    # 1777 밸리 포지
    "밸리 포지",
    "valley forge",
    "군대는 살아남았다",
    # 1778 폰 슈토이벤
    "폰 슈토이벤",
    "von steuben",
    "프러시아 장교",
    # 1778 프랑스 동맹
    "프랑스가 참전",
    "프랑스 동맹",
    # 1781 요크타운
    "요크타운",
    "yorktown",
]

# 남북전쟁 재생목록 시간순 정렬 키워드
CIVIL_WAR_ORDER = [
    # 1852 엉클 톰스 캐빈
    "엉클 톰스",
    "소설이 나라를",
    "uncle tom",
    # 1854 피의 캔자스
    "피의 캔자스",
    "bleeding kansas",
    "노예제가 국경을",
    # 1854 공화당 창당
    "공화당 창당",
    # 1857 드레드 스콧
    "드레드 스콧",
    "dred scott",
    "흑인은 시민이",
    # 1857 드레드 스콧
    "드레드 스콧",
    "dred scott",
    "흑인은 시민이",
    # 1858 링컨-더글러스 논쟁
    "링컨-더글러스",
    "7번의 토론",
    "lincoln-douglas",
    # 1859 존 브라운
    "존 브라운",
    "john brown",
    "하퍼스 페리",
    "전쟁을 앞당겼다",
    # 1860 링컨 당선
    "당선된 날 밤",
    "남부가 움직였다",
    "링컨이 당선",
    # 1861-02 남부연합 결성
    "남부연합 결성",
    "두 개의 나라가 있었다",
    "제퍼슨 데이비스",
    # 1861-04 첫 포성 (포트섬터)
    "첫 포성",
    "남북전쟁의 첫",
    # 1861-07 불런 전투
    "불런",
    "bull run",
    "소풍",
    # 1862 철갑함 해전
    "체사피크",
    "철갑함",
    # 1862 로버트 스몰스
    "로버트 스몰스",
    "선장 모자",
    "robert smalls",
    "군함을 훔",
    # 1862 앤티텀 전투
    "앤티텀",
    "2만 3천",
    "antietam",
    # 1863-01 노예해방선언
    "노예해방선언",
    "손이 떨렸다",
    "emancipation",
    # 1863-07 게티즈버그
    "게티즈버그",
    "피켓의 돌격",
    "gettysburg",
    "1마일을 걸어서",
    # 1863-11 게티즈버그 연설
    "272단어",
    "게티즈버그 연설",
    "국민의, 국민에",
    # 1863 해리엇 터브먼 군사 작전
    "해리엇 터브먼",
    "컴바히",
    "700명을 하룻밤",
    "756명",
    # 1864 H.L. 헌리 잠수함
    "헌리",
    "131년",
    "잠수함",
    # 1865-04-08
    "하늘이 어두워진",
    "눈앞에 두고",
    # 1865-04-09 항복
    "리 장군이 항복",
    "마지막 포성",
    # 1865-04-10 축포
    "승리 축포",
    "끝난 줄 알았는데",
    # 1865-04-14 링컨 피격
    "링컨이 총에",
    "밤 10시",
    # 1865 마지막 불씨
    "마지막 불씨",
    # 재건기 수정헌법
    "수정헌법",
    "재건기",
    "왜 수정헌법",
]


def auth():
    creds = None
    if os.path.exists(TOKEN_FILE):
        creds = Credentials.from_authorized_user_file(TOKEN_FILE, SCOPES)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(grequests.Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(SECRETS_FILE, SCOPES)
            creds = flow.run_local_server(port=0)
        with open(TOKEN_FILE, "w") as f:
            f.write(creds.to_json())
    return build("youtube", "v3", credentials=creds)


def get_playlist(yt, keyword):
    resp = yt.playlists().list(part="snippet", mine=True, maxResults=50).execute()
    for item in resp.get("items", []):
        title = item["snippet"]["title"]
        if keyword.lower() in title.lower():
            print(f"  ✅ 재생목록 발견: {title} ({item['id']})")
            return item["id"]
    print(f"  ❌ '{keyword}' 재생목록을 찾을 수 없습니다.")
    return None

def get_revolution_playlist(yt):
    return get_playlist(yt, "독립전쟁")


def upload_video(yt, video):
    path = video["path"]
    print(f"\n📤 업로드: {video['title'][:60]}...")
    body = {
        "snippet": {
            "title":           video["title"][:100],
            "description":     video["description"],
            "tags":            video["tags"],
            "categoryId":      "27",
            "defaultLanguage": "ko",
        },
        "status": {
            "privacyStatus":           "private" if video.get("publish_at") else "public",
            "selfDeclaredMadeForKids": False,
            **( {"publishAt": video["publish_at"]} if video.get("publish_at") else {} ),
        },
    }
    media = MediaFileUpload(path, chunksize=-1, resumable=True, mimetype="video/mp4")
    req = yt.videos().insert(part="snippet,status", body=body, media_body=media)
    resp = None
    while resp is None:
        st, resp = req.next_chunk()
        if st:
            print(f"  📤 {int(st.progress()*100)}%", end="\r")
    video_id = resp["id"]
    url = f"https://youtu.be/{video_id}"
    print(f"  ✅ 완료: {url}      ")
    return video_id


def add_to_playlist(yt, playlist_id, video_id, title):
    yt.playlistItems().insert(
        part="snippet",
        body={
            "snippet": {
                "playlistId": playlist_id,
                "resourceId": {"kind": "youtube#video", "videoId": video_id},
            }
        },
    ).execute()
    print(f"  ▶ 재생목록 추가: {title[:50]}")


def get_playlist_items(yt, playlist_id):
    items, token = [], None
    while True:
        resp = yt.playlistItems().list(
            part="snippet", playlistId=playlist_id,
            maxResults=50, pageToken=token
        ).execute()
        items += resp.get("items", [])
        token = resp.get("nextPageToken")
        if not token:
            break
    return items


def order_key(title_lower, order_list):
    for i, keyword in enumerate(order_list):
        if keyword in title_lower:
            return i
    return 999


def reorder_playlist(yt, playlist_id, order_list=None):
    if order_list is None:
        order_list = REVOLUTION_ORDER
    print("\n🔄 시간순 정렬 중...")
    items = get_playlist_items(yt, playlist_id)

    # 정렬
    sorted_items = sorted(items, key=lambda x: order_key(
        x["snippet"]["title"].lower(), order_list
    ))

    print("  정렬 결과:")
    for i, item in enumerate(sorted_items):
        print(f"    {i+1:2d}. {item['snippet']['title'][:60]}")

    # 재생목록 아이템 순서 업데이트
    for pos, item in enumerate(sorted_items):
        yt.playlistItems().update(
            part="snippet",
            body={
                "id": item["id"],
                "snippet": {
                    "playlistId": playlist_id,
                    "position":   pos,
                    "resourceId": item["snippet"]["resourceId"],
                },
            },
        ).execute()
        time.sleep(0.3)

    print("  ✅ 정렬 완료")


GILDED_AGE_ORDER = [
    # 1870 록펠러
    "록펠러",
    "스탠더드 오일",
    "석유를 가졌다",
    "rockefeller",
    # 1870s 카네기
    "카네기",
    "철강왕",
    "carnegie",
    # 1877 대철도 파업
    "대철도 파업",
    "철도 파업",
    # 1882 JP모건
    "모건",
    "morgan",
    # 1886 자유의 여신상
    "자유의 여신상",
    # 1886 헤이마켓
    "헤이마켓",
    "haymarket",
    # 1889 넬리 블라이
    "넬리 블라이",
    "nellie bly",
    "72일",
    "세계일주",
    # 1892 엘리스 섬
    "엘리스 섬",
    "ellis island",
    "1,200만",
    "이민자",
    # 1892 홈스테드 파업
    "홈스테드",
    "homestead",
    "핑커턴",
    # 1893 대공황
    "1893년 공황",
    # 1898 스페인-미국 전쟁
    "스페인",
    "쿠바",
    "maine",
    "메인",
    # 1901 맥킨리 암살
    "맥킨리",
    "mckinley",
    # 1894 풀먼 파업
    "풀먼",
    "pullman",
    "노동절",
    # 1901 루스벨트 트러스트
    "루스벨트",
    "트러스트",
    "roosevelt",
    # 1906 샌프란시스코 지진
    "샌프란시스코",
    "san francisco",
    # 1911 트라이앵글
    "트라이앵글",
    "triangle",
    "문이 잠겨",
    # 1913 소득세
    "소득세",
    "수정헌법 16",
]


def create_playlist(yt, title: str, description: str = "") -> str:
    resp = yt.playlists().insert(
        part="snippet,status",
        body={
            "snippet": {"title": title, "description": description},
            "status": {"privacyStatus": "public"},
        },
    ).execute()
    pid = resp["id"]
    print(f"  ✅ 재생목록 생성: {title} ({pid})")
    return pid


def get_or_create_playlist(yt, keyword: str, full_title: str) -> str:
    pid = get_playlist(yt, keyword)
    if pid:
        return pid
    return create_playlist(yt, full_title)


def main():
    print("🔐 YouTube 인증 중...")
    yt = auth()

    uploaded = []
    for video in VIDEOS:
        playlist_key = video.get("playlist", "남북전쟁")

        if "길디드" in playlist_key:
            playlist_id = get_or_create_playlist(yt, "길디드", "🏭 길디드 에이지 — 강도 남작의 시대")
            order = GILDED_AGE_ORDER
        else:
            playlist_id = get_playlist(yt, "남북전쟁")
            order = CIVIL_WAR_ORDER

        if not playlist_id:
            sys.exit(1)

        vid_id = upload_video(yt, video)
        uploaded.append((vid_id, video["title"]))
        time.sleep(2)
        add_to_playlist(yt, playlist_id, vid_id, video["title"])
        # reorder_playlist(yt, playlist_id, order)  # 쿼타 증가 승인 후 활성화

    print("\n🎉 완료!")
    for vid_id, title in uploaded:
        print(f"  https://youtu.be/{vid_id}  —  {title[:60]}")


if __name__ == "__main__":
    main()
