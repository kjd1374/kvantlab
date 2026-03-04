"""
Standalone Olive Young Review Updater
Can be called from server.js for on-demand review fetching, 
or run as a separate cron job.

Usage:
  python3 update_oy_reviews.py                  # Update up to 50 products with missing reviews
  python3 update_oy_reviews.py A000000241231     # Fetch reviews for a specific product (JSON output)
"""
import os
import sys
import json
import asyncio
import random
import requests
from datetime import datetime
from dotenv import load_dotenv
from playwright.async_api import async_playwright

parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(parent_dir)
load_dotenv(os.path.join(parent_dir, ".env"))

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://hgxblbbjlnsfkffwvfao.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhneGJsYmJqbG5zZmtmZnd2ZmFvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDA2NTY4NiwiZXhwIjoyMDc5NjQxNjg2fQ.SRxircIxDPE9Z8xElZzUFK_l9yOsjtKEoAnd7ILpKh8")

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation,resolution=merge-duplicates"
}


async def scrape_single_product(page, goods_no):
    """Scrape review data for a single product"""
    detail_url = f"https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo={goods_no}"
    
    result = {
        "goodsNo": goods_no,
        "reviewCount": 0,
        "rating": 0.0,
        "reviews": []
    }
    
    try:
        await page.goto(detail_url, wait_until="domcontentloaded", timeout=60000)
        await asyncio.sleep(4)
        
        # Check for Cloudflare challenge
        title = await page.title()
        if "잠시만 기다려" in title or "잠시만" in title:
            await asyncio.sleep(8)
            title = await page.title()
            if "잠시만" in title:
                await asyncio.sleep(10)
        
        parse_script = """
        () => {
            let reviewCount = 0;
            let rating = 0.0;
            const bodyText = document.body.innerText;
            
            // 1. Review count: regex from page text (most resilient)
            const rcMatch = bodyText.match(/리뷰\\s*([0-9,]+)\\s*건/);
            if (rcMatch) {
                reviewCount = parseInt(rcMatch[1].replace(/,/g, '')) || 0;
            }
            // Fallback: try DOM selectors (class names may change with React rebuilds)
            if (!reviewCount) {
                const reviewEl = document.querySelector('[class*="review-count"]')
                              || document.querySelector('[class*="btn-review"]')
                              || document.querySelector('#reviewInfo');
                if (reviewEl) {
                    const m = reviewEl.innerText.match(/([0-9,]+)/);
                    if (m) reviewCount = parseInt(m[1].replace(/,/g, '')) || 0;
                }
            }
            
            // 2. Rating: regex from page text
            const rtMatch = bodyText.match(/평점\\s*([0-9.]+)/);
            if (rtMatch) {
                rating = parseFloat(rtMatch[1]) || 0.0;
            }
            // Fallback: try DOM selectors
            if (!rating) {
                const ratingEl = document.querySelector('[class*="rating-star"]')
                              || document.querySelector('[class*="rating"]')
                              || document.querySelector('.prd_total_score .num strong');
                if (ratingEl) {
                    const ratingText = ratingEl.innerText.replace('평점', '').trim();
                    rating = parseFloat(ratingText) || 0.0;
                }
            }
            
            return { reviewCount, rating, reviews: [] };
        }
        """
        data = await page.evaluate(parse_script)
        
        if data:
            result["reviewCount"] = data.get("reviewCount", 0)
            result["rating"] = data.get("rating", 0.0)
    
    except Exception as e:
        result["error"] = str(e)
    
    return result


async def run_single(goods_no):
    """Fetch reviews for a single product and output JSON"""
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=['--disable-blink-features=AutomationControlled']
        )
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            viewport={"width": 1280, "height": 1024}
        )
        page = await context.new_page()
        
        result = await scrape_single_product(page, goods_no)
        
        # Update DB if we got valid data
        if result["reviewCount"] > 0 or (result["rating"] > 0 and result["rating"] <= 5):
            update_data = {}
            if result["reviewCount"] > 0:
                update_data["review_count"] = result["reviewCount"]
            if result["rating"] > 0 and result["rating"] <= 5:
                update_data["review_rating"] = result["rating"]
            
            if update_data:
                try:
                    res = requests.patch(
                        f"{SUPABASE_URL}/rest/v1/products_master?product_id=eq.{goods_no}&source=eq.oliveyoung",
                        headers=HEADERS,
                        json=update_data,
                        timeout=10
                    )
                    result["dbUpdated"] = res.status_code in [200, 204]
                except Exception as e:
                    result["dbError"] = str(e)
        
        await browser.close()
    
    print(json.dumps(result, ensure_ascii=False))


async def run_batch(limit=50):
    """Update reviews for products with missing data"""
    print(f"[{datetime.now()}] 올리브영 리뷰 일괄 업데이트 시작 (최대 {limit}개)")
    
    res = requests.get(
        f"{SUPABASE_URL}/rest/v1/products_master",
        headers=HEADERS,
        params={
            "source": "eq.oliveyoung",
            "review_count": "eq.0",
            "select": "id,product_id",
            "limit": str(limit),
            "order": "updated_at.desc"
        },
        timeout=10
    )
    products = res.json() if res.status_code == 200 else []
    
    if not products:
        print("업데이트할 제품 없음")
        return
    
    print(f"{len(products)}개 제품 처리 예정")
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=False,
            args=['--disable-blink-features=AutomationControlled']
        )
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
            viewport={"width": 1280, "height": 900},
            locale="ko-KR"
        )
        page = await context.new_page()
        
        # Warmup: visit list page first to establish valid Cloudflare session
        print("  🔄 세션 워밍업 중 (리스트 페이지 방문)...")
        try:
            await page.goto("https://www.oliveyoung.co.kr/store/main/getBestList.do",
                          wait_until="domcontentloaded", timeout=60000)
            await asyncio.sleep(5)
            print(f"  ✅ 세션 확립: {await page.title()}")
        except Exception as e:
            print(f"  ⚠️ 워밍업 실패: {e}")
        
        updated = 0
        for prod in products:
            goods_no = prod.get("product_id")
            db_id = prod.get("id")
            if not goods_no:
                continue
            
            data = await scrape_single_product(page, goods_no)
            rc = data.get("reviewCount", 0)
            rt = data.get("rating", 0.0)
            
            if rc > 0 or (rt > 0 and rt <= 5):
                update_record = {}
                if rc > 0: update_record["review_count"] = rc
                if rt > 0 and rt <= 5: update_record["review_rating"] = rt
                
                try:
                    r = requests.patch(
                        f"{SUPABASE_URL}/rest/v1/products_master?id=eq.{db_id}",
                        headers=HEADERS,
                        json=update_record,
                        timeout=10
                    )
                    if r.status_code in [200, 204]:
                        updated += 1
                        print(f"  ✅ {goods_no}: 리뷰 {rc}, 별점 {rt}")
                except Exception as e:
                    print(f"  ❌ {goods_no}: {e}")
            
            await asyncio.sleep(random.uniform(2, 4))
        
        await browser.close()
    
    print(f"[{datetime.now()}] 완료. {updated}/{len(products)} 업데이트됨")


if __name__ == "__main__":
    if len(sys.argv) > 1:
        # Single product mode (for server.js API)
        asyncio.run(run_single(sys.argv[1]))
    else:
        # Batch mode
        asyncio.run(run_batch())
