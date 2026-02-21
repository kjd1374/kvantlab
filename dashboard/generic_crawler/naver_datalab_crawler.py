import os
import json
import asyncio
import requests
from datetime import datetime
from dotenv import load_dotenv
from playwright.async_api import async_playwright

# ENV Setup
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env"))

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
SOURCE = "naver_datalab"

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: SUPABASE_URL or SUPABASE_KEY not found.")
    exit(1)

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation,resolution=merge-duplicates"
}

# Naver Data Lab Shopping Insight Categories
TARGET_CATEGORIES = [
    {"name": "화장품/미용", "code": "50000002"},
    {"name": "패션의류", "code": "50000000"},
    {"name": "패션잡화", "code": "50000001"},
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

def save_keyword_trend(keyword, rank, category_code):
    try:
        # 1. Upsert to products_master
        product_id = f"kw_{category_code}_{keyword}"
        product_record = {
            "product_id": product_id,
            "source": SOURCE,
            "name": keyword,
            "brand": "Naver Data Lab",
            "price": 0,
            "image_url": "https://datalab.naver.com/img/footer_logo.png",
            "url": f"https://search.naver.com/search.naver?query={keyword}",
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
                    "category_code": category_code,
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

async def crawl_category_keywords(page, category):
    print(f"\n--- [{category['name']}] 트렌드 수집 시작 (URL: {category['code']}) ---")
    
    try:
        # URL로 직접 이동
        url = f"https://datalab.naver.com/shoppingInsight/sCategory.naver?cid={category['code']}"
        await page.goto(url, wait_until="networkidle")
        await asyncio.sleep(2)
        
        # 키워드 순위 추출
        keywords = await page.evaluate("""
            () => {
                const list = document.querySelectorAll('.keyword_rank_list .item');
                const results = [];
                list.forEach((item) => {
                    const rankNum = item.querySelector('.num');
                    const txtSpan = item.querySelector('.txt');
                    if (rankNum && txtSpan) {
                        results.push({
                            rank: parseInt(rankNum.innerText.trim()),
                            keyword: txtSpan.innerText.trim()
                        });
                    }
                });
                return results;
            }
        """)
        
        if not keywords:
            print("  ⚠️ 키워드를 찾지 못했습니다. 다른 셀렉터 시도...")
            keywords = await page.evaluate("""
                () => {
                    return [...document.querySelectorAll('a.link_text')].map((a, i) => ({
                        rank: i + 1,
                        keyword: a.innerText.trim()
                    })).filter(k => k.keyword.length > 0).slice(0, 20);
                }
            """)

        print(f"  ✅ {len(keywords)}개 키워드 발견")
        
        saved = 0
        for item in keywords:
            if save_keyword_trend(item['keyword'], item['rank'], category['code']):
                saved += 1
        
        print(f"  💾 저장 완료: {saved}개")
        return saved
            
    except Exception as e:
        print(f"  ❌ 오류 발생: {e}")
        return 0

async def naver_datalab_crawl():
    start_time = datetime.now()
    print(f"[{start_time}] 네이버 데이터랩 크롤링 시작...")
    log_crawl("running", {"message": "Started Naver Data Lab crawl (direct URL mode)"})
    
    total_saved = 0
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=['--disable-blink-features=AutomationControlled']
        )
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            viewport={"width": 1280, "height": 800}
        )
        page = await context.new_page()
        
        for category in TARGET_CATEGORIES:
            saved = await crawl_category_keywords(page, category)
            total_saved += saved
            
        await browser.close()
        
    duration = str(datetime.now() - start_time)
    print(f"\n[{datetime.now()}] 크롤링 종료. 총 {total_saved}개 저장. 소요시간: {duration}")
    log_crawl("completed", {"total_saved": total_saved, "duration": duration})

if __name__ == "__main__":
    asyncio.run(naver_datalab_crawl())
