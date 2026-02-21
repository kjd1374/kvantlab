"""
trend_enricher.py
─────────────────────────────────────────────────────────────────────────────
수집된 구글/네이버 트렌드 키워드를 Gemini로 분석해서
브랜드명 / 화장품 성분 / 패션 트렌드 워드를 추출하고
products_master.tags JSONB 필드에 자동 태깅합니다.

실행:
  python scripts/trend_enricher.py           # 1회 실행
  python scripts/trend_enricher.py --watch   # 1시간 주기 반복

사용 모델: gemini-3-flash-preview
"""
import os
import sys
import json
import time
import requests
import argparse
from datetime import datetime
from dotenv import load_dotenv

# ─── 환경 설정 ────────────────────────────────────────────────
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
load_dotenv(os.path.join(ROOT, ".env"))

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "AIzaSyAXoonBcBZr6vj5xpF4SzS8PWhcrGXA-v8")

GEMINI_MODEL = "gemini-3-flash-preview"
GEMINI_URL = (
    f"https://generativelanguage.googleapis.com/v1beta/models/"
    f"{GEMINI_MODEL}:generateContent?key={GEMINI_API_KEY}"
)

SB_HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation,resolution=merge-duplicates"
}

# ─── Supabase 유틸 ────────────────────────────────────────────
def sb_get(table, params=""):
    url = f"{SUPABASE_URL}/rest/v1/{table}?{params}"
    r = requests.get(url, headers=SB_HEADERS, timeout=15)
    r.raise_for_status()
    return r.json()

def sb_patch(table, filter_params, body):
    url = f"{SUPABASE_URL}/rest/v1/{table}?{filter_params}"
    r = requests.patch(url, headers=SB_HEADERS, json=body, timeout=15)
    return r.status_code in (200, 204)

# ─── 최신 트렌드 키워드 조회 ──────────────────────────────────
def fetch_latest_keywords(limit=50):
    """DB에서 구글+네이버 트렌드 최신 키워드를 조회합니다."""
    rows = sb_get(
        "products_master",
        f"source=in.(google_trends,naver_datalab)"
        f"&select=id,product_id,name,brand,source"
        f"&order=updated_at.desc&limit={limit}"
    )
    return rows

# ─── Gemini 태깅 ──────────────────────────────────────────────
PROMPT_TEMPLATE = """
아래는 한국 이커머스 쇼핑 트렌드 검색어 목록입니다.
각 검색어를 분석해서 다음 JSON 배열 형태로 정확하게 반환해주세요.
반드시 입력된 검색어 순서와 개수(총 {count}개)를 그대로 유지하세요.

출력 형식:
[
  {{
    "keyword": "원본 검색어",
    "brand": "브랜드명 (없으면 null)",
    "ingredient": "화장품 성분명 (없으면 null, 예: 히알루론산, 콜라겐, 레티놀, 나이아신아마이드, 세라마이드, 비타민C, PDRN)",
    "fashion_style": "패션 스타일/트렌드 (없으면 null, 예: 오버핏, 미니멀, 스트릿, 아이비룩, 카고룩, 테크웨어)",
    "product_type": "상품 분류 (예: 립스틱, 크림, 청바지, 스니커즈 등, 없으면 null)",
    "trend_type": "beauty | fashion | brand | other 중 하나"
  }}
]

검색어 목록:
{keywords}

JSON만 반환하고 다른 설명은 하지 마세요.
"""

def call_gemini(keywords: list[str]) -> list[dict]:
    """Gemini에게 키워드 목록을 전달하고 태그 분석 결과를 받습니다."""
    kw_text = "\n".join(f"{i+1}. {kw}" for i, kw in enumerate(keywords))
    prompt = PROMPT_TEMPLATE.format(count=len(keywords), keywords=kw_text)

    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "responseMimeType": "application/json",
            "temperature": 0.1
        }
    }

    try:
        r = requests.post(GEMINI_URL, json=payload, timeout=60)
        r.raise_for_status()
        data = r.json()
        text = data["candidates"][0]["content"]["parts"][0]["text"]
        return json.loads(text)
    except Exception as e:
        print(f"  ❌ Gemini API 오류: {e}")
        return []

# ─── 태그 저장 ────────────────────────────────────────────────
def save_tags(product_id: str, source: str, tags: dict):
    """분석 결과 tags를 products_master에 PATCH 저장합니다."""
    # 기존 tags 필드에 병합 (source, product_id 기준)
    ok = sb_patch(
        "products_master",
        f"source=eq.{source}&product_id=eq.{product_id}",
        {
            "tags": tags,
            "updated_at": datetime.now().isoformat()
        }
    )
    return ok

# ─── 메인 실행 ────────────────────────────────────────────────
def enrich_once():
    print(f"\n[{datetime.now().strftime('%H:%M:%S')}] ▶ Gemini 트렌드 분석 시작...")

    rows = fetch_latest_keywords(limit=60)
    if not rows:
        print("  ⚠️ 분석할 키워드가 없습니다.")
        return

    keywords = [r["name"] for r in rows]
    print(f"  📋 키워드 {len(keywords)}개 로드 완료")

    # Gemini 호출 (60개 → 한 번에 처리)
    print(f"  🤖 Gemini ({GEMINI_MODEL}) 에 분석 요청 중...")
    results = call_gemini(keywords)

    if not results:
        print("  ❌ Gemini 응답이 없습니다.")
        return

    print(f"  ✅ 분석 완료: {len(results)}개 결과")

    # 결과를 원본 rows와 매칭해서 저장
    result_map = {r.get("keyword"): r for r in results}

    saved = 0
    for row in rows:
        name = row["name"]
        analysis = result_map.get(name)
        if not analysis:
            continue

        tags = {
            "brand":         analysis.get("brand"),
            "ingredient":    analysis.get("ingredient"),
            "fashion_style": analysis.get("fashion_style"),
            "product_type":  analysis.get("product_type"),
            "trend_type":    analysis.get("trend_type"),
            "enriched_at":   datetime.now().isoformat()
        }
        # null 값 제거
        tags = {k: v for k, v in tags.items() if v is not None}

        if save_tags(row["product_id"], row["source"], tags):
            saved += 1

    print(f"  💾 태그 저장 완료: {saved}/{len(rows)}개")

    # 요약 리포트 출력
    brands         = [r.get("brand")         for r in results if r.get("brand")]
    ingredients    = [r.get("ingredient")    for r in results if r.get("ingredient")]
    fashion_styles = [r.get("fashion_style") for r in results if r.get("fashion_style")]

    if brands:
        print(f"\n  🏷️  감지된 브랜드 ({len(brands)}개):")
        for b in sorted(set(brands))[:10]:
            print(f"      - {b}")
    if ingredients:
        print(f"\n  🧪 감지된 화장품 성분 ({len(ingredients)}개):")
        for ing in sorted(set(ingredients))[:10]:
            print(f"      - {ing}")
    if fashion_styles:
        print(f"\n  👗 감지된 패션 트렌드 ({len(fashion_styles)}개):")
        for fs in sorted(set(fashion_styles))[:10]:
            print(f"      - {fs}")

def main():
    parser = argparse.ArgumentParser(description="Gemini Trend Enricher")
    parser.add_argument("--watch", action="store_true", help="1시간마다 반복 실행")
    args = parser.parse_args()

    if args.watch:
        print("=" * 60)
        print("  Gemini Trend Enricher - 1시간 주기 모드")
        print("  종료: Ctrl+C")
        print("=" * 60)
        count = 0
        while True:
            count += 1
            print(f"\n{'='*50}")
            print(f"  [사이클 #{count}] {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
            print(f"{'='*50}")
            enrich_once()
            next_run = datetime.fromtimestamp(time.time() + 3600)
            print(f"\n  💤 다음 실행: {next_run.strftime('%H:%M:%S')}")
            time.sleep(3600)
    else:
        enrich_once()

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n  ⏹ 종료.\n")
