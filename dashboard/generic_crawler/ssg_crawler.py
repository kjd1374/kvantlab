"""
SSG Department Store (신세계백화점) Best Ranking Crawler - SPA Version
URL: https://department.ssg.com/page/pc/ranking.ssg
"""
import os
import json
import time
import asyncio
import requests
from datetime import datetime
from translate_helper import get_english_brand
from dotenv import load_dotenv
from playwright.async_api import async_playwright

load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env"))

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
SOURCE = "ssg"

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: SUPABASE_URL or SUPABASE_KEY not found.")
    exit(1)

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation,resolution=merge-duplicates"
}

# 새 탭 이름 매핑 (SPA 텍스트 -> DB Category Code)
CATEGORY_MAP = {
    "Beauty": {"code": "BEAUTY", "name": "뷰티"},
    "Fashion": {"code": "FASHION", "name": "패션"},
    "Luxury": {"code": "LUXURY", "name": "명품"},
    "Kids": {"code": "KIDS", "name": "유아동"},
    "Sports": {"code": "SPORTS", "name": "스포츠"},
    "Food & Life": {"code": "FOOD_LIFE", "name": "푸드&리빙"},
}

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

def save_product_and_rank(product_id, name, brand, price, image_url, url, rank, category_code, category_name):
    """products_master에 upsert 후, daily_rankings_v2에 랭킹 저장"""
    brand_en = get_english_brand(brand) if brand else ""

    product_record = {
        "product_id": str(product_id),
        "source": SOURCE,
        "name": name,
        "brand": brand or "",
        "brand_ko": brand or "",
        "brand_en": brand_en,
        "price": int(price) if price else None,
        "image_url": image_url,
        "url": url,
        "category": category_code, # 검색용 추가
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

            ranking_record = {
                "product_id": internal_id,
                "rank": rank,
                "date": datetime.now().date().isoformat(),
                "category_code": category_code,
                "source": SOURCE
            }

            rank_res = requests.post(
                f"{SUPABASE_URL}/rest/v1/daily_rankings_v2",
                headers=HEADERS,
                params={"on_conflict": "product_id,date,category_code"},
                json=ranking_record,
                timeout=10
            )
            if rank_res.status_code not in [200, 201]:
                print(f"  ⚠️ Rank upsert error for {product_id}: {rank_res.text[:200]}")
            return True
    else:
        print(f"  ⚠️ Product upsert error for {product_id}: {res.text[:200]}")
    return False

async def parse_products_from_dom(page):
    """SPA 렌더링된 DOM 요소에서 상품 정보 직접 스크래핑"""
    products = await page.evaluate('''() => {
        const results = [];
        const cards = document.querySelectorAll('.template-grid-item');
        
        cards.forEach(card => {
            const rankEl = card.querySelector('.css-1k2hnaw');
            if(!rankEl) return;
            
            const brandEl = card.querySelector('.css-408eai');
            const nameEl = card.querySelector('.css-1mrk1dy');
            const priceEl = card.querySelector('.css-h9py3d');
            const imgEl = card.querySelector('img.loaded');
            const linkEl = card.querySelector('a[href*="itemId="]');
            
            if(nameEl && priceEl) {
                const href = linkEl ? linkEl.href : '';
                const itemIdMatch = href.match(/itemId=([^&]+)/);
                
                results.push({
                    rank: rankEl.innerText.replace(/[^0-9]/g, ''),
                    prdNm: nameEl.innerText.trim(),
                    brandNm: brandEl ? brandEl.innerText.trim() : '',
                    price: priceEl.innerText.replace(/[^0-9]/g, ''),
                    itemId: itemIdMatch ? itemIdMatch[1] : '',
                    imgUrl: imgEl ? imgEl.src : '',
                    prdUrl: href || `https://www.ssg.com/item/itemView.ssg?itemId=${itemIdMatch ? itemIdMatch[1] : ''}`
                });
            }
        });
        return results;
    }''')
    return products

async def ssg_crawl():
    start_time = datetime.now()
    print(f"[{start_time}] 신세계백화점(SPA) Best 랭킹 크롤링 시작...")
    log_crawl("running", {"message": "Started SSG ranking crawl"})

    total_saved = 0
    total_errors = 0

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=['--disable-blink-features=AutomationControlled']
        )
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            viewport={"width": 1920, "height": 1080}
        )
        page = await context.new_page()

        print("🔍 랭킹 페이지 진입 중...")
        await page.goto("https://department.ssg.com/page/pc/ranking.ssg", wait_until="networkidle", timeout=30000)
        await asyncio.sleep(4)

        buttons = await page.locator('[role="tablist"] button[role="tab"]').all()
        print(f"총 {len(buttons)}개의 카테고리 탭 발견.")

        for idx in range(len(buttons)):
            try:
                # DOM 변경에 대비해 매번 새로 태그 위치 잡기
                current_buttons = await page.locator('[role="tablist"] button[role="tab"]').all()
                if idx >= len(current_buttons):
                    break
                    
                btn = current_buttons[idx]
                tab_text = await btn.inner_text()
                
                if tab_text not in CATEGORY_MAP:
                    print(f"❓ 등록되지 않은 탭: {tab_text}, 건너뜁니다.")
                    continue
                
                cat_info = CATEGORY_MAP[tab_text]
                cat_code = cat_info["code"]
                cat_name_kr = cat_info["name"]
                
                print(f"\n--- [{cat_name_kr} ({cat_code})] 크롤링 시작 ---")
                
                await btn.click()
                await asyncio.sleep(4) # SPA 데이터 렌더링 대기
                
                products = await parse_products_from_dom(page)
                print(f"  -> Extracted {len(products)} products")
                
                saved_count = 0
                for item in products:
                    if not item['prdNm'] or not item['itemId']:
                        continue
                        
                    ok = save_product_and_rank(
                        product_id=item['itemId'],
                        name=item['prdNm'],
                        brand=item['brandNm'],
                        price=item['price'],
                        image_url=item['imgUrl'],
                        url=item['prdUrl'],
                        rank=int(item['rank']),
                        category_code=cat_code,
                        category_name=cat_name_kr
                    )
                    if ok:
                        saved_count += 1
                
                print(f"  💾 [{cat_name_kr}] 저장 완료: {saved_count}개")
                total_saved += saved_count
                
            except Exception as e:
                print(f"  ❌ [{tab_text}] 크롤링 중 오류: {e}")
                total_errors += 1

        await browser.close()

    duration = str(datetime.now() - start_time)
    print(f"\n[{datetime.now()}] 크롤링 종료. 총 {total_saved}개 저장, {total_errors}개 실패. 소요: {duration}")
    log_crawl("completed", {
        "total_saved": total_saved,
        "total_errors": total_errors,
        "duration": duration
    })

if __name__ == "__main__":
    asyncio.run(ssg_crawl())
