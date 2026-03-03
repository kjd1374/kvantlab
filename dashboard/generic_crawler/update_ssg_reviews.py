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

async def scrape_single_product(page, product_id):
    """Scrape review data for a single SSG product"""
    detail_url = f"https://www.ssg.com/item/itemView.ssg?itemId={product_id}"
    
    result = {
        "product_id": product_id,
        "reviewCount": 0,
        "rating": 0.0,
        "error": None
    }
    
    try:
        await page.goto(detail_url, wait_until="networkidle", timeout=60000)
        await asyncio.sleep(3)
        
        html_content = await page.content()
        soup = BeautifulSoup(html_content, 'html.parser')
        text = soup.get_text(separator=' ', strip=True)
        text = re.sub(r'\s+', ' ', text) # normalize spaces
        
        # 1. Review Count
        m_rc = re.search(r'고객리뷰\s*\(\s*([0-9,]+)\s*건\s*\)', text)
        if m_rc:
            result["reviewCount"] = int(m_rc.group(1).replace(',', ''))
        else:
            m_rc2 = re.search(r'총\s*([0-9,]+)\s*건\s*리뷰', text)
            if m_rc2: result["reviewCount"] = int(m_rc2.group(1).replace(',', ''))
        
        # 2. Rating
        m_rt = re.search(r'별 5개 중\s*([0-9.]+)\s*개', text)
        if m_rt:
            result["rating"] = float(m_rt.group(1))
            
    except Exception as e:
        result["error"] = str(e)
    
    return result

async def run_single(product_id):
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True, 
            args=['--disable-blink-features=AutomationControlled', '--no-sandbox', '--disable-setuid-sandbox']
        )
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            viewport={"width": 1920, "height": 1080}
        )
        page = await context.new_page()
        
        result = await scrape_single_product(page, product_id)
        print(json.dumps(result, ensure_ascii=False, indent=2))
        await browser.close()

async def run_batch(limit=50):
    print(f"[{datetime.now()}] SSG 리뷰 일괄 업데이트 시작 (최대 {limit}개)")
    
    res = requests.get(
        f"{SUPABASE_URL}/rest/v1/products_master",
        headers=HEADERS,
        params={
            "source": "eq.ssg",
            "review_count": "eq.0",
            "select": "id,product_id",
            "limit": str(limit),
            "order": "updated_at.desc"
        }
    )
    products = res.json() if res.status_code == 200 else []
    
    if not products:
        print("업데이트할 SSG 제품 없음")
        return
        
    print(f"{len(products)}개 제품 처리 예정")
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True, 
            args=['--disable-blink-features=AutomationControlled', '--no-sandbox']
        )
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            viewport={"width": 1920, "height": 1080}
        )
        page = await context.new_page()
        
        updated = 0
        for prod in products:
            p_id = prod.get("product_id")
            db_id = prod.get("id")
            if not p_id: continue
            
            data = await scrape_single_product(page, p_id)
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
                        print(f"  ✅ {p_id}: 리뷰 {rc}, 별점 {rt}")
                except Exception as e:
                    print(f"  ❌ {p_id}: {e}")
            else:
                print(f"  ℹ️ {p_id}: 리뷰가 아직 없거나 가져올 수 없음")
            
            await asyncio.sleep(random.uniform(2, 4))
            
        await browser.close()
    
    print(f"[{datetime.now()}] 완료. {updated}/{len(products)} 업데이트됨")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        asyncio.run(run_single(sys.argv[1]))
    else:
        asyncio.run(run_batch())
