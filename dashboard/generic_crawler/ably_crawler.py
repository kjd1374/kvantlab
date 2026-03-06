"""
Ably (에이블리) Ranking Crawler
URL: https://m.a-bly.com/

방식: Playwright를 사용해 모바일 뷰로 접속하여 딥링크/카테고리 탐색
특징: 대분류 -> 중분류(API parameter 확인) -> 랭킹 수집
"""
import os
import json
import time
import re
import asyncio
import requests
from datetime import datetime
from translate_helper import get_english_brand
from dotenv import load_dotenv
from playwright.async_api import async_playwright

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

# 에이블리 메인 카테고리 (직접 URL 접근 방식)
TARGET_CATEGORIES = [
    {"name": "여성패션", "code": "WOMEN", "url": "https://m.a-bly.com/displays/37"},
    {"name": "뷰티", "code": "BEAUTY", "url": "https://m.a-bly.com/displays/38"},
    {"name": "신발", "code": "SHOES", "url": "https://m.a-bly.com/displays/169"},
    {"name": "가방", "code": "BAG", "url": "https://m.a-bly.com/displays/170"},
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

async def debug_page_structure(page, category_name):
    # 이 함수는 디버깅 목적으로 현재 페이지의 HTML 구조를 파일로 저장합니다.
    # 실제 크롤링 로직에는 영향을 주지 않습니다.
    try:
        html_content = await page.content()
        filename = f"debug_ably_{category_name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.html"
        with open(filename, "w", encoding="utf-8") as f:
            f.write(html_content)
        print(f"  🔍 디버그 HTML 저장: {filename}")
    except Exception as e:
        print(f"  ❌ 디버그 HTML 저장 실패: {e}")

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


async def crawl_ably_category(page, category):
    print(f"\n--- [{category['name']}] 크롤링 시작 (직접 URL 접근) ---")
    
    # API 응답 캡처를 위한 변수
    api_responses = []

    async def handle_response(response):
        if "api.a-bly.com" in response.url and response.status == 200:
            try:
                # JSON 응답만 처리
                content_type = response.headers.get("content-type", "")
                if "application/json" in content_type:
                    data = await response.json()
                    api_responses.append({
                        "url": response.url,
                        "data": data
                    })
            except:
                pass

    page.on("response", handle_response)

    # 카테고리 URL로 직접 이동
    target_url = category.get('url', 'https://m.a-bly.com/')
    try:
        await page.goto(target_url, wait_until="commit", timeout=30000)
        await page.wait_for_load_state("domcontentloaded")
        print(f"  🚩 페이지 접근: {await page.title()}")
    except Exception as e:
        print(f"  ❌ 페이지 로드 실패: {e}")
        return 0

    await asyncio.sleep(5)
    
    # 보안 체크 페이지 감지
    title = await page.title()
    if any(kw in title.lower() for kw in ["잠시만", "확인", "보안", "cloudflare", "checking"]):
        print(f"  ⚠️ 보안 확인 페이지 감지, 10초 대기...")
        await asyncio.sleep(10)

    # 상품 리스트 로딩 대기
    try:
         await page.wait_for_selector("a[href*='/goods/']", timeout=10000)
    except:
         print("  ⚠️ 상품 리스트 로딩 시간 초과 혹은 상품 없음")

    # 스크롤 다운으로 더 많은 상품 로드
    for _ in range(8):
        await page.mouse.wheel(0, 3000)
        await asyncio.sleep(1.5)

    # 4. API 응답 분석 및 상품 추출
    print(f"  🔍 캡처된 API 응답 수: {len(api_responses)}")
    
    captured_products = []
    
    for res in api_responses:
        try:
            data = res['data']
            components = []
            
            # 컴포넌트 리스트 찾기
            if 'components' in data:
                components = data['components']
            
            if not isinstance(components, list):
                continue
                
            for i, comp in enumerate(components):
                # 디버깅: 컴포넌트 키 확인
                print(f"    [Comp {i}] Keys: {list(comp.keys())}")
                if 'wrapper' in comp: # wrapper 패턴 체크
                     print(f"      Wrapper Keys: {list(comp['wrapper'].keys())}")

                goods_list = []
                
                # 컴포넌트 내부에서 상품 리스트 찾기 (구조 다양성 대응)
                # 1. comp['data']['goods']
                if 'data' in comp and isinstance(comp['data'], dict) and 'goods' in comp['data']:
                    goods_list = comp['data']['goods']
                    print(f"      ✅ Found in data.goods (Count: {len(goods_list)})")
                
                # 2. comp['entity']['goods']
                elif 'entity' in comp and isinstance(comp['entity'], dict) and 'goods' in comp['entity']:
                    goods_list = comp['entity']['goods']
                    print(f"      ✅ Found in entity.goods (Count: {len(goods_list)})")

                # 3. comp['goods']
                elif 'goods' in comp:
                    goods_list = comp['goods']
                    print(f"      ✅ Found in goods (Count: {len(goods_list)})")
                
                # 5. comp['entity']['item_list'] (New pattern found)
                elif 'entity' in comp and 'item_list' in comp['entity']:
                    item_list = comp['entity']['item_list']
                    if isinstance(item_list, list):
                        goods_list = item_list
                        print(f"      ✅ Found in entity.item_list (Count: {len(goods_list)})")
                    elif isinstance(item_list, dict) and 'goods' in item_list:
                        goods_list = item_list['goods']
                        print(f"      ✅ Found in entity.item_list.goods (Count: {len(goods_list)})")

                # 상품 리스트가 없고 entity/data가 있다면 그 내부 키 출력해보기 (디버깅용)
                if not goods_list:
                    sub_keys = []
                    if 'entity' in comp: sub_keys = list(comp['entity'].keys())
                    elif 'data' in comp: sub_keys = list(comp['data'].keys())
                    print(f"      No goods found. Sub-keys: {sub_keys}")

                if goods_list and isinstance(goods_list, list):
                    for g in goods_list:
                        # 데이터 소스 결정 (item_entity 래퍼 대응)
                        product_data = g
                        if 'item_entity' in g:
                            product_data = g['item_entity']
                        
                        # 필수 필드 추출 (sno가 상품 ID)
                        # sno가 없으면 item -> sno 구조일 수도 있음
                        if 'item' in product_data and isinstance(product_data['item'], dict):
                             product_data = product_data['item']
                             
                        p_id = product_data.get('sno')
                        p_name = product_data.get('name')
                        
                        if p_id and p_name:
                            # 가격 정보: sale_price가 있으면 우선, 없으면 price
                            price = product_data.get('sale_price') or product_data.get('price') or 0
                            
                            # 이미지 URL
                            p_image = product_data.get('image')
                            
                            # 리뷰 데이터 추출 (API 응답에 있을 경우)
                            # Note: Ably API uses UPPERCASE field names (REVIEW_COUNT, REVIEW_RATING, LIKES_COUNT)
                            p_review_count = (
                                product_data.get('REVIEW_COUNT', 0) or 
                                product_data.get('review_count', 0) or 
                                product_data.get('comment_count', 0) or 0
                            )
                            p_satisfaction = (
                                product_data.get('REVIEW_RATING', 0) or
                                product_data.get('satisfaction', 0) or 
                                product_data.get('review_score', 0) or 0
                            )
                            p_review_rating = 0.0
                            try:
                                if p_satisfaction and int(p_satisfaction) > 0:
                                    p_review_rating = round(int(p_satisfaction) / 20.0, 1)
                            except (ValueError, TypeError):
                                pass
                            
                            item_data = {
                                'id': str(p_id),
                                'name': p_name,
                                'brand_name': product_data.get('market_name', 'Ably'),
                                'price': price,
                                'image': p_image,
                                'url': f"https://m.a-bly.com/goods/{p_id}"
                            }
                            if p_review_count and int(p_review_count) > 0:
                                item_data['review_count'] = int(p_review_count)
                            if p_review_rating > 0:
                                item_data['review_rating'] = p_review_rating
                            
                            captured_products.append(item_data)
                            
        except Exception as e:
            # print(f"     (Parsing error: {e})")
            pass

    # 중복 제거
    unique_products = {p['id']: p for p in captured_products}.values()
    print(f"  ✅ API 파싱 결과: 총 {len(unique_products)}개 상품 발견")

    saved_count = 0
    for rank, item in enumerate(unique_products, start=1):
        if rank > 100: break
        if save_product_and_rank(item, rank, category["code"], category["name"]):
            saved_count += 1
            
    print(f"  💾 저장 완료: {saved_count}개")
    return saved_count


async def ably_crawl():
    start_time = datetime.now()
    print(f"[{start_time}] 에이블리(Ably) 크롤링 시작...")
    log_crawl("running", {"message": "Started Ably crawl"})
    
    total_saved = 0
    
    async with async_playwright() as p:
        # 모바일 뷰포트 설정 (에이블리는 모바일 웹 최적화) 및 봇 차단 우회
        browser = await p.chromium.launch(
            headless=True,
            args=[
                '--disable-blink-features=AutomationControlled',
                '--disable-web-security',
                '--no-sandbox',
                '--disable-setuid-sandbox'
            ]
        )
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
            viewport={"width": 390, "height": 844},
            device_scale_factor=3,
            is_mobile=True,
            has_touch=True,
            locale="ko-KR",
            timezone_id="Asia/Seoul",
        )
        
        # navigator.webdriver 속성을 지워서 봇 탐지 회피
        await context.add_init_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
        
        page = await context.new_page()
        
        for category in TARGET_CATEGORIES:
            try:
                msg = await crawl_ably_category(page, category)
                total_saved += msg
            except Exception as e:
                print(f"  ❌ Error processing {category['name']}: {e}")
                
        await browser.close()
        
    duration = str(datetime.now() - start_time)
    print(f"[{datetime.now()}] 크롤링 종료. 총 {total_saved}개 저장. 소요시간: {duration}")
    log_crawl("completed", {
        "total_saved": total_saved, 
        "duration": duration
    })

if __name__ == "__main__":
    asyncio.run(ably_crawl())
