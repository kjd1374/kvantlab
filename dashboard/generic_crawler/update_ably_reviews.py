import os
import sys
import json
import asyncio
import random
import requests
import re
from datetime import datetime
from dotenv import load_dotenv
from playwright.async_api import async_playwright
from bs4 import BeautifulSoup

parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(parent_dir)
load_dotenv(os.path.join(parent_dir, ".env"))

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation,resolution=merge-duplicates"
}

async def scrape_single_product(page, goods_no):
    """Scrape review data for a single Ably product"""
    detail_url = f"https://m.a-bly.com/goods/{goods_no}"
    
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
        if "보안 확인 중" in title or "Just a moment" in title:
            await asyncio.sleep(8)
            title = await page.title()
            if "보안 확인 중" in title or "Just a moment" in title:
                await asyncio.sleep(10)
                
        html_content = await page.content()
        soup = BeautifulSoup(html_content, 'html.parser')
        
        # 1. Review Count (리뷰 N개)
        count_el = soup.find(string=re.compile(r'리뷰\s*([0-9,]+)개'))
        if count_el:
            m = re.search(r'리뷰\s*([0-9,]+)개', count_el)
            if m:
                result["reviewCount"] = int(m.group(1).replace(',', ''))
        
        # 2. Rating based on satisfaction (N%가 만족한 상품)
        sat_el = soup.find(string=re.compile(r'가 만족한 상품'))
        satisfaction = 0
        if sat_el and sat_el.parent:
            text = sat_el.parent.get_text()
            m = re.search(r'([0-9]+)%가 만족한 상품', text)
            if m:
                satisfaction = int(m.group(1))
                # Convert 0-100% to 0.0-5.0 scale
                result["rating"] = round(satisfaction / 20.0, 1)
                
        # If alternative pattern (e.g. 마켓 만족도 94%)
        if satisfaction == 0:
            market_sat = soup.find(string=re.compile(r'마켓 만족도\s*([0-9]+)%'))
            if market_sat:
                m = re.search(r'마켓 만족도\s*([0-9]+)%', market_sat)
                if m:
                    satisfaction = int(m.group(1))
                    result["rating"] = round(satisfaction / 20.0, 1)
        
    except Exception as e:
        result["error"] = str(e)
    
    return result

async def run_single(goods_no):
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True, args=['--disable-blink-features=AutomationControlled', '--disable-web-security', '--no-sandbox'])
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_4_1 like Mac OS X) AppleWebKit/605.1.15",
            viewport={"width": 390, "height": 844},
            is_mobile=True, has_touch=True
        )
        page = await context.new_page()
        
        result = await scrape_single_product(page, goods_no)
        print(json.dumps(result, ensure_ascii=False, indent=2))
        await browser.close()

async def run_batch(limit=50):
    print(f"[{datetime.now()}] 에이블리 리뷰 일괄 업데이트 시작 (최대 {limit}개)")
    
    res = requests.get(
        f"{SUPABASE_URL}/rest/v1/products_master",
        headers=HEADERS,
        params={
            "source": "eq.ably",
            "review_count": "eq.0",
            "select": "id,product_id",
            "limit": str(limit),
            "order": "updated_at.desc"
        }
    )
    products = res.json() if res.status_code == 200 else []
    
    if not products:
        print("업데이트할 제품 없음")
        return
        
    print(f"{len(products)}개 제품 처리 예정")
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True, args=['--disable-blink-features=AutomationControlled', '--disable-web-security', '--no-sandbox'])
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_4_1 like Mac OS X) AppleWebKit/605.1.15",
            viewport={"width": 390, "height": 844},
            is_mobile=True, has_touch=True
        )
        page = await context.new_page()
        
        updated = 0
        for prod in products:
            goods_no = prod.get("product_id")
            db_id = prod.get("id")
            if not goods_no: continue
            
            data = await scrape_single_product(page, goods_no)
            rc = data.get("reviewCount", 0)
            rt = data.get("rating", 0.0)
            
            if rc > 0 or rt > 0:
                update_record = {}
                if rc > 0: update_record["review_count"] = rc
                if rt > 0 and rt <= 5: update_record["review_rating"] = rt
                
                try:
                    r = requests.patch(
                        f"{SUPABASE_URL}/rest/v1/products_master?id=eq.{db_id}",
                        headers=HEADERS, json=update_record, timeout=10
                    )
                    if r.status_code in [200, 204]:
                        updated += 1
                        print(f"  ✅ {goods_no}: 리뷰 {rc}, 별점 {rt}")
                except Exception as e:
                    print(f"  ❌ {goods_no}: {e}")
            else:
                print(f"  ℹ️ {goods_no}: 리뷰가 아직 없거나 가져올 수 없음")
            
            await asyncio.sleep(random.uniform(2, 4))
            
        await browser.close()
    
    print(f"[{datetime.now()}] 완료. {updated}/{len(products)} 업데이트됨")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        asyncio.run(run_single(sys.argv[1]))
    else:
        asyncio.run(run_batch())
