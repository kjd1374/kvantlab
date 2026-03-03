#!/usr/bin/env python3
"""
Zigzag Best Crawler

Uses Playwright to navigate to zigzag.kr/best and extract products.
Bypasses bot detection by navigating from Home -> Category -> Best if needed.

Run: python3 generic_crawler/zigzag_crawler.py
"""

import os
import sys
import asyncio
import datetime
import requests
import re
from playwright.async_api import async_playwright

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from generic_crawler.config import SUPABASE_URL, SUPABASE_KEY, HEADERS

ZIGZAG_BASE = "https://zigzag.kr"

def upsert(table: str, records: list, on_conflict: str = None) -> list:
    if not records:
        return []
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    headers = {**HEADERS, "Prefer": "return=representation,resolution=merge-duplicates"}
    params = {}
    if on_conflict:
        params["on_conflict"] = on_conflict
    try:
        r = requests.post(url, headers=headers, params=params, json=records, timeout=30)
        r.raise_for_status()
        print(f"  ✅ {table}: {len(records)}개 저장")
        return r.json()
    except Exception as e:
        print(f"  ❌ {table} 저장 실패: {e}")
        if hasattr(e, 'response') and e.response is not None:
             print(f"  ❌ 상세 에러: {e.response.text}")
        return []


async def crawl_zigzag():
    print(f"[{datetime.datetime.now()}] 지그재그 베스트 크롤링 시작...")
    
    today_utc = datetime.datetime.now(datetime.timezone.utc)
    today_str = today_utc.isoformat()
    date_only_str = today_str[0:10]

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        # Use Mobile Profile
        iphone = p.devices['iPhone 13']
        context = await browser.new_context(**iphone)
        page = await context.new_page()

        try:
            print("  🔗 지그재그 홈 접속...")
            await page.goto(ZIGZAG_BASE, wait_until="load", timeout=60000)
            await asyncio.sleep(2)
            
            # Navigate to Category tab (Usually bottom nav or menu)
            print("  👉 카테고리 메뉴 클릭...")
            # Using specific location based on previous research
            await page.click("text=카테고리") # Mobile bottom nav text
            await asyncio.sleep(2)
            
            print("  👉 베스트 항목 클릭...")
            await page.click("text=베스트")
            await asyncio.sleep(5)
            
            # Check if we are on best page
            if "best" not in page.url:
                 print(f"  ⚠️  현재 URL: {page.url} (베스트 유도 실패, 직접 이동 시도)")
                 await page.goto(f"{ZIGZAG_BASE}/best", wait_until="load", timeout=60000)
            
            # Wait for product cards
            print("  🔍 상품 목록 대기...")
            try:
                await page.wait_for_selector("a.product-card-link", timeout=45000)
            except:
                print("  ⚠️  a.product-card-link 찾기 실패. 대안 셀렉터 시도...")
                await page.wait_for_selector("article", timeout=15000)
            
            # Scroll to load ~50 items
            await page.mouse.wheel(0, 4000)
            await asyncio.sleep(3)
            
            items = await page.query_selector_all("a.product-card-link")
            if not items:
                 items = await page.query_selector_all("article")
            
            print(f"  📦 발견된 상품 카드: {len(items)}개")
            
            records = []
            seen_ids = set()
            
            for rank, item in enumerate(items[:50], 1):
                href = await item.get_attribute("href")
                if not href: continue
                
                # Extract PID from /products/12345
                pid_match = re.search(r'/products/(\d+)', href)
                pid = pid_match.group(1) if pid_match else f"zz_{rank}"
                
                if pid in seen_ids: continue
                seen_ids.add(pid)
                
                # Extract details
                # Brand, Name, Price, Image, Rating, ReviewCount
                brand_el = await item.query_selector("span:nth-of-type(1)")
                brand = await brand_el.inner_text() if brand_el else "Zigzag"
                
                # Full text check
                full_text = await item.inner_text()
                # Price is usually the one with , and numbers
                price_match = re.search(r'([\d,]+)\s*(?:원|%)?', full_text)
                price_str = price_match.group(1).replace(',', '') if price_match else "0"
                try:
                    price = int(price_str)
                except:
                    price = 0
                
                # Rating/Review in format ★ 4.8(18,082)
                review_match = re.search(r'★\s*([\d.]+)\(([\d,]+)\)', full_text)
                rating = float(review_match.group(1)) if review_match else 0.0
                review_count_str = review_match.group(2).replace(',', '') if review_match else "0"
                review_count = int(review_count_str)
                
                img_el = await item.query_selector("img")
                img_url = await img_el.get_attribute("src") if img_el else ""

                # Product Name is text not being brand/price/rating
                # Let's try to find it specifically or clean full_text
                # Usually name is the second span or specific class if available
                # But a.product-card-link text is often concatenated
                
                # For safety, let's use the alt text of the image or clean full_text
                name = await img_el.get_attribute("alt") if img_el else ""
                if not name:
                     name = full_text.split('\n')[1] if '\n' in full_text else full_text

                records.append({
                    "product_id": f"zigzag_{pid}",
                    "source": "zigzag_best",
                    "name": name,
                    "brand": brand,
                    "price": price,
                    "image_url": img_url,
                    "url": f"{ZIGZAG_BASE}{href}" if href.startswith('/') else href,
                    "category": "전체",
                    "review_count": review_count,
                    "review_rating": rating,
                    "current_rank": rank,
                    "created_at": today_str,
                    "tags": {"sort_type": "POPULAR", "period": "DAILY"},
                })

            # Save to Database
            saved_records = upsert("products_master", records, on_conflict="source,product_id")
            
            if saved_records:
                pid_to_id = {r["product_id"]: r["id"] for r in saved_records if "id" in r}
                
                ranking_records = []
                for r in records:
                    internal_id = pid_to_id.get(r["product_id"])
                    if internal_id:
                        ranking_records.append({
                            "product_id": internal_id,
                            "rank": r["current_rank"],
                            "date": date_only_str,
                            "category_code": "all",
                            "source": "zigzag_best"
                        })
                
                if ranking_records:
                    upsert("daily_rankings_v2", ranking_records, on_conflict="product_id,date,category_code")
            
            print(f"  ✅ 완료! {len(records)}개 상품 저장됨.")

        except Exception as e:
            print(f"  ❌ 크롤링 에러: {e}")
        finally:
            await browser.close()


if __name__ == "__main__":
    asyncio.run(crawl_zigzag())
