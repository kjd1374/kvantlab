import os
import sys
import json
import asyncio
import random
import requests
import re
from datetime import datetime
from playwright.async_api import async_playwright
from bs4 import BeautifulSoup

sys.path.append(os.path.join(os.getcwd(), 'generic_crawler'))
from update_ably_reviews import scrape_single_product, SUPABASE_URL, HEADERS

async def run_mass_backfill():
    print(f"[{datetime.now()}] 에이블리 리뷰 대규모 백필 재시작... (최대 1000개)")
    
    res = requests.get(
        f"{SUPABASE_URL}/rest/v1/products_master",
        headers=HEADERS,
        params={
            "source": "eq.ably",
            "review_count": "eq.0",
            "select": "id,product_id",
            "limit": "1000",
            "order": "updated_at.desc"
        }
    )
    products = res.json() if res.status_code == 200 else []
    
    if not products:
        print("업데이트할 제품 없음")
        return
        
    print(f"{len(products)}개 제품 처리 예정")
    
    async with async_playwright() as p:
        # User-agent randomization and slower execution to avoid Cloudflare drops
        user_agents = [
            "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4_1 like Mac OS X) AppleWebKit/605.1.15",
            "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15",
            "Mozilla/5.0 (iPad; CPU OS 17_4_1 like Mac OS X) AppleWebKit/605.1.15",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        ]
        
        browser = await p.chromium.launch(
            headless=True,
            args=[
                '--disable-blink-features=AutomationControlled', 
                '--disable-web-security', 
                '--no-sandbox',
                '--disable-dev-shm-usage',
                '--disable-notifications'
            ]
        )
        context = await browser.new_context(
            user_agent=random.choice(user_agents),
            viewport={"width": 390, "height": 844},
            is_mobile=True, has_touch=True
        )
        
        # Avoid webdriver detection
        await context.add_init_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
        
        page = await context.new_page()
        
        updated = 0
        for i, prod in enumerate(products):
            goods_no = prod.get("product_id")
            db_id = prod.get("id")
            if not goods_no: continue
            
            print(f"[{i+1}/{len(products)}] Scraping {goods_no}...")
            
            # Periodically switch context/user-agent to avoid IP/fingerprint ban
            if i > 0 and i % 50 == 0:
                print("Rotating browser context to avoid Cloudflare blocks...")
                await context.close()
                context = await browser.new_context(
                    user_agent=random.choice(user_agents),
                    viewport={"width": 390, "height": 844},
                    is_mobile=True, has_touch=True
                )
                await context.add_init_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
                page = await context.new_page()
                await asyncio.sleep(5)
                
            try:    
                data = await scrape_single_product(page, goods_no)
            except Exception as e:
                print(f"  ❌ Browser Crash/Timeout: {e}")
                continue
                
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
                        print(f"  ✅ Updated: 리뷰 {rc}, 별점 {rt}")
                except Exception as e:
                    print(f"  ❌ Error: {e}")
            else:
                print(f"  ⚠️ Still 0 reviews, either no reviews or captcha blocked.")
            
            await asyncio.sleep(random.uniform(2.0, 4.0)) # Increased delay
            
        await browser.close()
    
    print(f"[{datetime.now()}] 완료. 총 {updated}/{len(products)} 업데이트.")

if __name__ == "__main__":
    asyncio.run(run_mass_backfill())
