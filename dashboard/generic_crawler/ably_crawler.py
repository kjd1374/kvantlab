"""
Ably (에이블리) Ranking Crawler
URL: https://m.a-bly.com/

방식: Playwright를 사용해 모바일 뷰로 접속하여 Cloudflare를 우회하고
홈화면에서 각 카테고리 탭("의류", "뷰티", 등)을 클릭한 뒤 페이지를 스크롤.
스크롤 시 발생하는 백그라운드 API (Server-Driven UI JSON) 응답을 가로채어 파싱.
"""
import asyncio
import json
import time
import re
import os
import requests
from bs4 import BeautifulSoup
from playwright.async_api import async_playwright
from playwright_stealth import Stealth
from datetime import datetime
from urllib.parse import urlparse, parse_qs
from translate_helper import get_english_brand
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env"))

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
SOURCE = "ably"

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: SUPABASE_URL or SUPABASE_KEY not found.")
    exit(1)

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation,resolution=merge-duplicates"
}

# 에이블리 메인 카테고리 (홈 화면의 텍스트와 매핑)
TARGET_CATEGORIES = [
    {"name": "여성패션", "tab_name": "의류", "code": "WOMEN"},
    {"name": "뷰티", "tab_name": "뷰티", "code": "BEAUTY"},
    {"name": "신발", "tab_name": "신발", "code": "SHOES"},
    {"name": "가방", "tab_name": "가방", "code": "BAG"},
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

def save_product_and_rank(item, rank, category_code, category_name):
    """
    Supabase에 상품 및 랭킹 정보 저장 (Upsert)
    """
    try:
        product_id = item['id']
        name = item['name']
        brand = item.get('brand_name', '')
        price = int(item['price']) if item['price'] else None
        image_url = item['image']
        url = item['url']

        # Translate brand
        brand_en = get_english_brand(brand) if brand else ""

        # 1. products_master 테이블에 상품 정보 저장 (Upsert)
        product_record = {
            "product_id": str(product_id),
            "source": SOURCE,
            "name": name,
            "brand": brand,
            "brand_ko": brand,
            "brand_en": brand_en,
            "price": price,
            "category": category_name,
            "image_url": image_url,
            "url": url,
            "updated_at": datetime.now().isoformat()
        }

        # Include review data if available from API
        if item.get('review_count') and int(item['review_count']) > 0:
            product_record['review_count'] = int(item['review_count'])
        if item.get('review_rating') and float(item['review_rating']) > 0:
            product_record['review_rating'] = float(item['review_rating'])

        res = requests.post(
            f"{SUPABASE_URL}/rest/v1/products_master",
            headers=HEADERS,
            params={"on_conflict": "source,product_id"},
            json=product_record,
            timeout=10
        )

        if res.status_code not in [200, 201]:
            print(f"  ⚠️ Product upsert error for {product_id}: {res.text[:100]}")
            return False

        # 2. 내부 ID 가져오기
        db_items = res.json()
        if not db_items:
            return False
        internal_id = db_items[0].get("id")

        # 3. daily_rankings_v2 테이블에 랭킹 저장
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
             print(f"  ⚠️ Rank upsert error for {product_id}: {rank_res.text[:100]}")
        
        return True

    except Exception as e:
        print(f"  ❌ Save error: {e}")
        return False


async def ably_crawl():
    start_time = datetime.now()
    print(f"[{start_time}] 에이블리(Ably) 크롤링 시작...")
    log_crawl("running", {"message": "Started Ably crawl with Playwright Interceptor"})
    
    total_saved = 0
    
    async with async_playwright() as p:
        # Headless=False 와 Persistent Context 를 사용하여 실제 유저의 브라우저 상태를 유지 (Cloudflare 우회 핵심)
        browser = await p.chromium.launch_persistent_context(
            user_data_dir="/tmp/ably_chrome_profile",
            headless=False,
            user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
            viewport={"width": 393, "height": 852},
            device_scale_factor=3,
            is_mobile=True,
            has_touch=True,
            locale="ko-KR",
            timezone_id="Asia/Seoul",
            args=[
                '--disable-blink-features=AutomationControlled',
                '--disable-web-security',
                '--no-sandbox',
                '--disable-setuid-sandbox'
            ]
        )
        
        # navigator.webdriver 속성을 지워서 봇 탐지 회피
        await browser.add_init_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
        
        page = browser.pages[0] if browser.pages else await browser.new_page()
        stealth = Stealth()
        await stealth.apply_stealth_async(page)
        
        # Cloudflare 초기 통과 대기 (첫 로딩 시)
        print("  ⏳ Cloudflare 봇 탐지 우회를 위한 초기 접속 대기 중...")
        try:
            await page.goto("https://m.a-bly.com/", wait_until="domcontentloaded", timeout=20000)
            await asyncio.sleep(5)
        except Exception as e:
            print(f"  ⚠️ 초기 접속 에러: {e}")

        for category in TARGET_CATEGORIES:
            print(f"\\n--- [{category['name']}] 탭 클릭 및 데이터 수집 시작 ---")
            
            # API 응답을 동적으로 모으는 큐
            api_responses = []

            async def handle_response(response):
                if "api/" in response.url or "v2/screens" in response.url:
                    try:
                        if response.status == 200:
                            content_type = response.headers.get("content-type", "")
                            if "json" in content_type:
                                data = await response.json()
                                api_responses.append(data)
                    except:
                        pass

            page.on("response", handle_response)
            
            # 홈(메인)으로 다시 강제 회귀
            await page.goto("https://m.a-bly.com/", wait_until="domcontentloaded", timeout=15000)
            await asyncio.sleep(3)

            # 카테고리 탭 (의류, 뷰티, 신발, 등)을 클릭
            tab_name = category['tab_name']
            
            try:
                # 탭을 찾아 클릭
                await page.locator(f"xpath=//p[normalize-space(text())='{tab_name}']").first.click(timeout=5000)
                print(f"  🚩 '{tab_name}' 탭 클릭 성공. 화면 렌더링 대기...")
            except Exception as e:
                print(f"  ❌ '{tab_name}' 탭을 클릭할 수 없습니다: {e}")
                page.remove_listener("response", handle_response)
                continue

            await asyncio.sleep(5)
            
            # 상품 로드 유도를 위해 페이지 스크롤 (랭킹 데이터 수집)
            print(f"  👇 스크롤하여 {tab_name} 데이터 API 수집...")
            for scroll_idx in range(5):
                await page.mouse.wheel(0, 1500)
                await asyncio.sleep(2)

            page.remove_listener("response", handle_response)
            
            with open(f"/tmp/ably_api_dump_{category['code']}.json", "w") as f:
                json.dump(api_responses, f, ensure_ascii=False, indent=2)

            print(f"  🔍 캡처된 Server-Driven JSON Payload: {len(api_responses)}개")
            
            captured_products = []
            
            for res_data in api_responses:
                try:
                    # 응답 데이터 내 컴포넌트 검사
                    components = res_data.get('components', [])
                    for comp in components:
                        item_list_type = comp.get('type', {}).get('item_list', '')
                        if not isinstance(item_list_type, str):
                            continue
                            
                        # 상품들을 담고 있는 리스트 추출
                        goods_list = comp.get('entity', {}).get('item_list', [])
                        if not isinstance(goods_list, list):
                            continue
                        
                        for p_node in goods_list:
                            # 1. 일반적인 구조 (바로 item 이 있음)
                            item_node = p_node.get('item', {})
                            log_node = p_node.get('logging', {})
                            
                            # 2. TWO_COL_CARD_LIST 구조 (item_entity 래퍼 존재)
                            if not item_node and 'item_entity' in p_node:
                                item_node = p_node['item_entity'].get('item', {})
                                log_node = p_node['item_entity'].get('logging', {})
                                
                            if not item_node:
                                continue
                                
                            p_id = item_node.get('sno')
                            p_name = item_node.get('name')
                            
                            # 가격: price 우선, sale_price 보조
                            p_price = item_node.get('price', 0)
                            if not p_price and 'sale_price' in item_node:
                                p_price = item_node['sale_price']
                                
                            p_image = item_node.get('image', '')
                            p_market_name = item_node.get('market_name', 'Ably')
                            
                            # 리뷰, 만족도 추출
                            analytics = log_node.get('analytics', {})
                            review_count = analytics.get('REVIEW_COUNT', 0)
                            review_rating_raw = analytics.get('REVIEW_RATING', 0)
                            p_review_rating = 0.0
                            if review_rating_raw and int(review_rating_raw) > 0:
                                p_review_rating = round(int(review_rating_raw) / 20.0, 1) # 100점 만점을 5.0 만점으로

                            if p_id and p_name:
                                item_data = {
                                    'id': str(p_id),
                                    'name': p_name,
                                    'brand_name': p_market_name,
                                    'price': p_price,
                                    'image': p_image,
                                    'url': f"https://m.a-bly.com/goods/{p_id}"
                                }
                                if review_count and int(review_count) > 0:
                                    item_data['review_count'] = int(review_count)
                                if p_review_rating > 0:
                                    item_data['review_rating'] = p_review_rating
                                    
                                captured_products.append(item_data)
                except Exception as e:
                    pass

            # 중복 제거 (상품 id 기준)
            unique_products = {p['id']: p for p in captured_products}.values()
            unique_products = list(unique_products)
            print(f"  ✅ API 파싱 결과: 총 {len(unique_products)}개 정상 상품 발견")

            saved_count = 0
            for rank, item in enumerate(unique_products, start=1):
                if rank > 200: break # 최대 200개까지
                if save_product_and_rank(item, rank, category["code"], category["name"]):
                    saved_count += 1
                    
            print(f"  💾 '{category['name']}' 저장 완료: {saved_count}개")
            total_saved += saved_count
                
        await browser.close()
        
    duration = str(datetime.now() - start_time)
    print(f"[{datetime.now()}] 크롤링 종료. 총 {total_saved}개 저장. 소요시간: {duration}")
    log_crawl("completed", {
        "total_saved": total_saved, 
        "duration": duration
    })

if __name__ == "__main__":
    asyncio.run(ably_crawl())
