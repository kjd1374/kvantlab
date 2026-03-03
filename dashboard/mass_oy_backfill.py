import asyncio
import sys
import os
import requests
import random
from playwright.async_api import async_playwright

sys.path.append(os.path.join(os.getcwd(), 'generic_crawler'))
from oliveyoung_crawler import SUPABASE_URL, HEADERS, scrape_product_reviews

async def run_mass_backfill():
    print("Fetching up to 1000 missing reviews...")
    res = requests.get(
        f"{SUPABASE_URL}/rest/v1/products_master?source=eq.oliveyoung&review_count=eq.0&select=id,product_id&limit=1000&order=updated_at.desc",
        headers=HEADERS
    )
    if res.status_code != 200:
        print("Failed to fetch products:", res.status_code)
        return

    products = res.json()
    print(f"Found {len(products)} products to backfill.")

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=['--disable-blink-features=AutomationControlled']
        )
        page = await browser.new_page(user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36")
        
        updated = 0
        for i, prod in enumerate(products):
            goods_no = prod.get("product_id")
            db_id = prod.get("id")
            if not goods_no:
                continue

            print(f"[{i+1}/{len(products)}] Scraping {goods_no}...")
            data = await scrape_product_reviews(page, goods_no)
            if not data:
                continue

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
                        print(f"  ✅ Updated: 리뷰 {rc}, 별점 {rt}")
                except Exception as e:
                    print(f"  ❌ DB Error {goods_no}: {e}")
            else:
                print("  ⚠️ Still 0 reviews, might be real or blocked.")

            # Small delay to prevent rate limit
            await asyncio.sleep(random.uniform(1.0, 2.5))

        await browser.close()
        print(f"Finished. Successfully backfilled {updated} out of {len(products)} items.")

asyncio.run(run_mass_backfill())
