import os
import time
import pandas as pd
import requests
from datetime import datetime
from dotenv import load_dotenv
from pytrends.request import TrendReq

# ENV Setup
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env"))

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
SOURCE = "google_trends"

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: SUPABASE_URL or SUPABASE_KEY not found.")
    exit(1)

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation,resolution=merge-duplicates"
}

# Shopping/E-commerce seed keywords to find rising trends
SHOPPING_KEYWORDS = [
    # 기존 쇼핑 카테고리
    "화장품", "원피스", "가방", "스니커즈", "뷰티",
    "향수", "크로스백", "스킨케어", "립스틱", "쿠션파데",
    "운동화", "맨투맨", "패딩", "청바지", "슬랙스",
    "가디건", "니트", "블라우스", "귀걸이", "목걸이",
    "선크림", "틴트", "다이어트", "레깅스", "쇼핑",
    # 화장품 성분 (트렌드 성분 파악용)
    "히알루론산", "콜라겐", "레티놀", "나이아신아마이드", "세라마이드",
    "비타민C 세럼", "PDRN", "판테놀", "글루타치온", "줄기세포",
]

def log_crawl(status, metadata=None):
    try:
        log_data = {
            "job_name": f"{SOURCE}_ranking_crawl",
            "status": status,
            "started_at": datetime.now().isoformat() if status == "running" else None,
            "finished_at": datetime.now().isoformat() if status in ("completed", "failed") else None,
            "metadata_json": metadata or {}
        }
        requests.post(f"{SUPABASE_URL}/rest/v1/crawl_logs", headers=HEADERS, json=log_data, timeout=10)
    except Exception as e:
        print(f"Warning: Could not log crawl status: {e}")

def save_keyword_trend(keyword, rank, spike_value):
    try:
        # 1. Upsert to products_master
        product_id = f"kw_gt_{keyword}"
        product_record = {
            "product_id": product_id,
            "source": SOURCE,
            "name": keyword,
            "brand": f"Google 급상승 (+{spike_value}%)",
            "price": 0,
            "image_url": "https://www.gstatic.com/images/branding/googlelogo/2x/googlelogo_color_92x30dp.png",
            "url": f"https://www.google.com/search?tbm=shop&q={keyword}",
            "category": "Shopping",
            "updated_at": datetime.now().isoformat()
        }
        res = requests.post(
            f"{SUPABASE_URL}/rest/v1/products_master",
            headers=HEADERS,
            params={"on_conflict": "source,product_id"},
            json=product_record,
            timeout=10
        )
        
        if res.status_code in [200, 201]:
            db_items = res.json()
            if db_items:
                internal_id = db_items[0].get("id")
                # 2. Upsert to daily_rankings_v2
                ranking_record = {
                    "product_id": internal_id,
                    "rank": rank,
                    "date": datetime.now().date().isoformat(),
                    "category_code": "google",
                    "source": SOURCE
                }
                requests.post(
                    f"{SUPABASE_URL}/rest/v1/daily_rankings_v2",
                    headers=HEADERS,
                    params={"on_conflict": "product_id,date,category_code"},
                    json=ranking_record,
                    timeout=10
                )
                return True
        return False
    except Exception as e:
        print(f"  ❌ Save error for {keyword}: {e}")
        return False

def get_rising_trends():
    print("초기화: Google Trends API (Pytrends)...")
    pytrend = TrendReq(hl='ko-KR', tz=-540)
    
    all_rising = {}
    
    chunk_size = 5
    for i in range(0, len(SHOPPING_KEYWORDS), chunk_size):
        chunk = SHOPPING_KEYWORDS[i:i+chunk_size]
        print(f"🔍 탐색 중: {chunk}")
        
        try:
            # 카테고리 18 = 쇼핑 (Shopping)
            pytrend.build_payload(chunk, cat=18, geo='KR', timeframe='now 7-d')
            rq = pytrend.related_queries()
            
            if rq:
                for kw in chunk:
                    if kw in rq and rq[kw] and rq[kw]['rising'] is not None:
                        df = rq[kw]['rising']
                        for _, row in df.iterrows():
                            query_str = row['query']
                            value = row['value']
                            if query_str not in all_rising or value > all_rising[query_str]:
                                all_rising[query_str] = value
        except Exception as e:
            print(f"  ⚠️ Pytrends 오류 ({chunk}): {e}")
            
        time.sleep(3) # 레이트 리밋 우회 대기
        
    sorted_trends = sorted(all_rising.items(), key=lambda x: x[1], reverse=True)
    return sorted_trends[:50]

def google_trends_crawl():
    start_time = datetime.now()
    print(f"[{start_time}] 구글 트렌드 (쇼핑 특화) 크롤링 시작...")
    log_crawl("running", {"message": "Started Google Trends shopping focused crawl"})

    try:
        trends = get_rising_trends()
        print(f"  ✅ {len(trends)}개 주요 쇼핑 급상승 키워드 발견")
        
        saved_count = 0
        for rank, (query_str, val) in enumerate(trends, start=1):
            if save_keyword_trend(query_str, rank, val):
                saved_count += 1
                
        print(f"  💾 저장 완료: {saved_count}개")
        log_crawl("completed", {"total_saved": saved_count, "duration": str(datetime.now() - start_time)})

    except Exception as e:
        print(f"  ❌ 구글 트렌드 크롤링 실패: {e}")
        log_crawl("failed", {"error": str(e)})

if __name__ == "__main__":
    google_trends_crawl()
