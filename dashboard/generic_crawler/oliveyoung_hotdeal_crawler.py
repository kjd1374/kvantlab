"""
Olive Young (올리브영) "Today's Special" (오특) Crawler
URL: https://www.oliveyoung.co.kr/store/main/getHotdealList.do
"""
import os
import json
import time
import asyncio
import requests
import random
from datetime import datetime
import sys
from dotenv import load_dotenv
from playwright.async_api import async_playwright
from translate_helper import get_english_brand

# Add parent directory to path to import notifier
parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(parent_dir)
from notifier import send_error_notification

load_dotenv(os.path.join(parent_dir, ".env"))

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
SOURCE = "oliveyoung"

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: SUPABASE_URL or SUPABASE_KEY not found.")
    exit(1)

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation,resolution=merge-duplicates"
}

def log_crawl(status, metadata=None):
    try:
        log_data = {
            "job_name": f"{SOURCE}_hotdeal_crawl",
            "status": status,
            "started_at": datetime.now().isoformat() if status == "running" else None,
            "finished_at": datetime.now().isoformat() if status in ("completed", "failed") else None,
            "metadata_json": metadata or {}
        }
        requests.post(f"{SUPABASE_URL}/rest/v1/crawl_logs", headers=HEADERS, json=log_data, timeout=10)
    except Exception as e:
        print(f"Warning: Could not log crawl status: {e}")

def save_hotdeal(item):
    """Save to products_master and daily_specials_v2"""
    try:
        product_id = item['id']
        name = item['name']
        brand = item.get('brand_name', '')
        price_org = item.get('price_org', 0)
        price_cur = item.get('price_cur', 0)
        discount_rate = item.get('discount_rate', 0)
        image_url = item['image']
        url = item['url']

        # Translate brand
        brand_en = get_english_brand(brand) if brand else ""

        # 1. Update Products Master
        product_record = {
            "product_id": str(product_id),
            "source": SOURCE,
            "name": name,
            "brand": brand,
            "brand_ko": brand,
            "brand_en": brand_en,
            "price": price_org, # We keep original price in master
            "image_url": image_url,
            "url": url,
            "updated_at": datetime.now().isoformat()
        }

        res = requests.post(
            f"{SUPABASE_URL}/rest/v1/products_master",
            headers=HEADERS,
            params={"on_conflict": "source,product_id"},
            json=product_record,
            timeout=10
        )

        if res.status_code not in [200, 201]:
            print(f"  ⚠️ Product upsert error for {product_id} ({res.status_code}): {res.text}")
            return False

        # 1.5. Update Ranking Products V2 (Required by FK in daily_specials_v2)
        ranking_record = {
            "product_id": str(product_id),
            "name": name,
            "brand": brand,
            "image_url": image_url
        }
        
        # Check if exists in ranking_products_v2
        rank_check_url = f"{SUPABASE_URL}/rest/v1/ranking_products_v2?product_id=eq.{product_id}"
        rank_check_res = requests.get(rank_check_url, headers=HEADERS, timeout=10)
        
        if rank_check_res.status_code == 200 and rank_check_res.json():
            # Update existing
            res_ranking = requests.patch(
                f"{SUPABASE_URL}/rest/v1/ranking_products_v2?product_id=eq.{product_id}",
                headers=HEADERS,
                json=ranking_record,
                timeout=10
            )
        else:
            # Insert new
            res_ranking = requests.post(
                f"{SUPABASE_URL}/rest/v1/ranking_products_v2",
                headers=HEADERS,
                json=ranking_record,
                timeout=10
            )
        
        if res_ranking.status_code not in [200, 201, 204]:
            print(f"  ⚠️ Ranking product save warning for {product_id} ({res_ranking.status_code}): {res_ranking.text}")
            # Even if this fails, we try specials, but it will likely fail FK

        # 2. Update Daily Specials V2
        iso_date = datetime.now().date().isoformat()
        special_record = {
            "product_id": str(product_id),
            "date": iso_date,
            "special_price": price_cur,
            "discount_rate": discount_rate
        }

        # Check if record exists for this product and date
        check_url = f"{SUPABASE_URL}/rest/v1/daily_specials_v2?product_id=eq.{product_id}&date=eq.{iso_date}"
        check_res = requests.get(check_url, headers=HEADERS, timeout=10)
        
        if check_res.status_code == 200:
            existing_records = check_res.json()
            if existing_records:
                # Update existing (PATCH)
                record_id = existing_records[0].get('id')
                if record_id:
                    res_spec = requests.patch(
                        f"{SUPABASE_URL}/rest/v1/daily_specials_v2?id=eq.{record_id}",
                        headers=HEADERS,
                        json=special_record,
                        timeout=10
                    )
                else:
                    res_spec = requests.patch(
                        f"{SUPABASE_URL}/rest/v1/daily_specials_v2?product_id=eq.{product_id}&date=eq.{iso_date}",
                        headers=HEADERS,
                        json=special_record,
                        timeout=10
                    )
            else:
                # Insert new (POST)
                res_spec = requests.post(
                    f"{SUPABASE_URL}/rest/v1/daily_specials_v2",
                    headers=HEADERS,
                    json=special_record,
                    timeout=10
                )
        else:
            print(f"  ⚠️ Error checking existence for {product_id}: {check_res.status_code}")
            return False

        if res_spec.status_code not in [200, 201, 204]:
            print(f"  ⚠️ Special save error for {product_id} ({res_spec.status_code}): {res_spec.text}")
            return False

        return True
    except Exception as e:
        print(f"  ❌ Save error: {e}")
        return False

async def crawl_hotdeals(page):
    target_url = "https://www.oliveyoung.co.kr/store/main/getHotdealList.do?t_page=%EB%9E%AD%ED%82%B9&t_click=GNB&t_gnb_type=%EC%98%A4%ED%8A%B9&t_swiping_type=N"
    
    print(f"  🚀 Navigating to Hotdeal Page...")
    try:
        await page.goto(target_url, wait_until="domcontentloaded", timeout=60000)
        await asyncio.sleep(5) # Wait for dynamic content
    except Exception as e:
        print(f"  ❌ Failed to load hotdeal page: {e}")
        return 0

    # Parse O-Teuk items
    parse_script = r"""
        () => {
            const results = [];
            // Select items from all possible hotdeal list containers
            const items = document.querySelectorAll('ul.prod-list li, .special_list li, ul.list_show li, .spTodayWrap li');
            console.log('JS: Found', items.length, 'total li candidates');
            
            items.forEach((li, index) => {
                const nameEl = li.querySelector('.prod-name, .tx_name');
                const linkEl = li.querySelector('a.goodsList, a.thumb');
                const brandEl = li.querySelector('.tx_brand, .prod-brand strong');
                const zzimBtn = li.querySelector('button.btn_zzim');
                
                if (!nameEl || !linkEl) {
                    console.log(`JS: Item ${index} skipped - Missing name or link`);
                    return;
                }
                
                let goodsNo = linkEl.getAttribute('data-ref-goodsno') || '';
                if (!goodsNo && zzimBtn) goodsNo = zzimBtn.getAttribute('data-ref-goodsno') || '';
                if (!goodsNo) {
                    const href = linkEl.getAttribute('href') || '';
                    if (href.includes('goodsNo=')) {
                        goodsNo = href.split('goodsNo=')[1].split('&')[0];
                    }
                }

                const name = nameEl.innerText.trim();
                let brand = brandEl ? brandEl.innerText.trim() : '';
                if (!brand && zzimBtn) brand = zzimBtn.getAttribute('data-ref-goodsbrand') || '';
                
                const priceCurEl = li.querySelector('.tx_cur .tx_num, .price .total');
                const priceOrgEl = li.querySelector('.tx_org .tx_num, .discount .origin, .price .origin');
                const discountEl = li.querySelector('.percent, .flag-badge .Pnum, .thumb_flag');
                const imgEl = li.querySelector('.thumb img, .pic-thumb');
                
                const priceCur = priceCurEl ? parseInt(priceCurEl.innerText.replace(/[^0-9]/g, '')) : 0;
                const priceOrg = priceOrgEl ? parseInt(priceOrgEl.innerText.replace(/[^0-9]/g, '')) : priceCur;
                const discount = discountEl ? parseInt(discountEl.innerText.replace(/[^0-9]/g, '')) : 0;
                let imgUrl = imgEl ? (imgEl.src || imgEl.dataset.original) : '';
                
                if (imgUrl.startsWith('//')) imgUrl = 'https:' + imgUrl;
                
                let link = linkEl.href;
                if (!link || !link.startsWith('http')) {
                    link = 'https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo=' + goodsNo;
                }

                if (goodsNo && name) {
                    results.push({
                        id: goodsNo,
                        name: name,
                        brand_name: brand,
                        price_org: priceOrg,
                        price_cur: priceCur,
                        discount_rate: discount,
                        image: imgUrl,
                        url: link
                    });
                }
            });
            return results;
        }
    """
    
    # Scroll to load all items if needed
    for _ in range(3):
        await page.evaluate("window.scrollBy(0, 800)")
        await asyncio.sleep(1)
        
    captured_items = await page.evaluate(parse_script)
    print(f"  ✅ {len(captured_items)} Hotdeal items found.")
    
    saved_count = 0
    for item in captured_items:
        if save_hotdeal(item):
            saved_count += 1
            
    return saved_count

async def run_crawler_with_retries(max_retries=3):
    start_time = datetime.now()
    print(f"[{start_time}] Olive Young Hotdeal Crawl Started...")
    log_crawl("running", {"message": "Started Olive Young hotdeal crawl"})
    
    total_saved = 0
    attempt = 0
    success = False
    last_error = ""

    while attempt < max_retries and not success:
        attempt += 1
        print(f"  \u21bb Attempt {attempt}/{max_retries}")
        try:
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
                
                total_saved = await crawl_hotdeals(page)
                
                if total_saved > 0:
                    success = True
                else:
                    raise Exception("Crawl completed but no items were saved.")

                # Debugging: Save page content and screenshot
                content = await page.content()
                with open("oy_hotdeal_debug.html", "w") as f:
                    f.write(content)
                await page.screenshot(path="oy_hotdeal_debug.png")
                print(f"  \U0001f4f8 Debug files saved: oy_hotdeal_debug.html, oy_hotdeal_debug.png")
                
                await browser.close()
        except Exception as e:
            last_error = str(e)
            print(f"  \u274c Error on attempt {attempt}: {e}")
            await asyncio.sleep(10 * attempt) # Incremental backoff

    duration = str(datetime.now() - start_time)
    
    if success:
        print(f"[{datetime.now()}] Crawl Finished Successfully. Total {total_saved} items saved. Duration: {duration}")
        log_crawl("completed", {"total_saved": total_saved, "duration": duration, "attempts": attempt})
    else:
        print(f"[{datetime.now()}] \u274c Crawl FAILED after {max_retries} attempts.")
        log_crawl("failed", {"error": last_error, "duration": duration})
        send_error_notification(
            subject="Olive Young Hotdeal Crawler Failed",
            message=f"The crawler failed after {max_retries} attempts.\nLast error:\n{last_error}\nDuration: {duration}"
        )

if __name__ == "__main__":
    asyncio.run(run_crawler_with_retries())
