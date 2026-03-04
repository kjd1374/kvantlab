"""
Olive Young (올리브영) Best Ranking Crawler
URL: https://www.oliveyoung.co.kr/store/main/getBestList.do

방식: Playwright를 사용해 랭킹 페이지 접근 후 상품 정보 수집
"""
import os
import json
import time
import asyncio
import requests
import random
from datetime import datetime
from dotenv import load_dotenv
from playwright.async_api import async_playwright
from translate_helper import get_english_brand

load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env"))

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

# 올리브영 카테고리 (URL 파라미터 dispCatNo)
# DB 카테고리 코드와 일치시킴 (DispCatNo 사용)
TARGET_CATEGORIES = [
    {"name": "전체", "code": "all", "url_param": ""},
    {"name": "스킨케어", "code": "10000010001", "url_param": "dispCatNo=900000100100001&fltDispCatNo=10000010001"},
    {"name": "마스크팩", "code": "10000010009", "url_param": "dispCatNo=900000100100001&fltDispCatNo=10000010009"},
    {"name": "클렌징", "code": "10000010010", "url_param": "dispCatNo=900000100100001&fltDispCatNo=10000010010"},
    {"name": "선케어", "code": "10000010011", "url_param": "dispCatNo=900000100100001&fltDispCatNo=10000010011"},
    {"name": "메이크업", "code": "10000010002", "url_param": "dispCatNo=900000100100001&fltDispCatNo=10000010002"},
    {"name": "네일", "code": "10000010012", "url_param": "dispCatNo=900000100100001&fltDispCatNo=10000010012"},
    {"name": "메이크업툴", "code": "10000010006", "url_param": "dispCatNo=900000100100001&fltDispCatNo=10000010006"}, # 미용소품
    {"name": "맨즈케어", "code": "10000010007", "url_param": "dispCatNo=900000100100001&fltDispCatNo=10000010007"},
    {"name": "더모코스메틱", "code": "10000010008", "url_param": "dispCatNo=900000100100001&fltDispCatNo=10000010008"},
    {"name": "헤어케어", "code": "10000010004", "url_param": "dispCatNo=900000100100001&fltDispCatNo=10000010004"},
    {"name": "바디케어", "code": "10000010003", "url_param": "dispCatNo=900000100100001&fltDispCatNo=10000010003"},
    {"name": "구강/건강용품", "code": "10000020003", "url_param": "dispCatNo=900000100100001&fltDispCatNo=10000020003"},
    {"name": "여성/위생용품", "code": "10000020004", "url_param": "dispCatNo=900000100100001&fltDispCatNo=10000020004"},
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

def save_product_and_rank(item, rank, category_code):
    """Supabase 저장 로직 (Adaptive)"""
    try:
        product_id = item['id']
        name = item['name']
        brand = item.get('brand_name', '')
        price = int(str(item['price']).replace(',', '')) if item['price'] else 0
        image_url = item['image']
        url = item['url']
        
        # New fields
        review_count = item.get('review_count', 0)
        review_rating = item.get('review_rating', 0.0)

        # Translate brand
        brand_en = get_english_brand(brand) if brand else ""

        # Try with review data first (Only if > 0)
        product_record = {
            "product_id": str(product_id),
            "source": SOURCE,
            "name": name,
            "brand": brand,
            "brand_ko": brand,
            "brand_en": brand_en,
            "price": price,
            "image_url": image_url,
            "url": url,
            "updated_at": datetime.now().isoformat()
        }
        
        if review_count > 0:
            product_record["review_count"] = review_count
        if review_rating > 0:
            product_record["review_rating"] = review_rating

        res = requests.post(
            f"{SUPABASE_URL}/rest/v1/products_master",
            headers=HEADERS,
            params={"on_conflict": "source,product_id"},
            json=product_record,
            timeout=10
        )

        # If failed, retry without review columns (in case migration missing)
        if res.status_code not in [200, 201]:
            if "Could not find the" in res.text and "column" in res.text:
                if 'review_count' in product_record: del product_record['review_count']
                if 'review_rating' in product_record: del product_record['review_rating']
                
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

        db_items = res.json()
        if not db_items: return False
        internal_id = db_items[0].get("id")

        # 2. daily_rankings_v2 Upsert
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
        return True
    except Exception as e:
        print(f"  ❌ Save error: {e}")
        return False

async def crawl_oliveyoung_categories(page, categories_list):
    base_url = "https://www.oliveyoung.co.kr/store/main/getBestList.do"
    total_saved_items = 0
        
    for category in categories_list:
        print(f"\n--- [{category['name']}] 크롤링 시작 ---")
        
        target_url = base_url
        if category['code'] != 'all' and category['url_param']:
            target_url = f"{base_url}?{category['url_param']}"
            
        try:
            print(f"  🚀 {category['name']} URL 이동 중...")
            await page.goto(target_url, wait_until="domcontentloaded", timeout=60000)
            await asyncio.sleep(4) # DOM 이 완전히 그려질 수 있도록 대기
        except Exception as e:
            print(f"  ❌ 페이지 로드 실패: {e}")
            continue

        await asyncio.sleep(2)
        
        # DOM 파싱
        parse_script = r"""
            () => {
                const results = [];
                
                // 랭킹 상품 컨테이너 선택
                const items = document.querySelectorAll('.cate_prd_list li, .best-list li');
                
                items.forEach((li, index) => {
                    const info = li.querySelector('.prd_info') || li.querySelector('.prd_name')?.parentElement || li;
                    if (!info || !li.querySelector('.tx_name') || !li.querySelector('img')) return;
                    
                    // 브랜드
                    const brandEl = info.querySelector('.tx_brand');
                    const brand = brandEl ? brandEl.innerText.trim() : '';
                    
                    // 상품명
                    const nameEl = info.querySelector('.tx_name');
                    const name = nameEl ? nameEl.innerText.trim() : '';
                    
                    // 가격
                    const priceEl = info.querySelector('.tx_cur .tx_num');
                    const price = priceEl ? priceEl.innerText.replace(/[^0-9]/g, '') : '0';
                    
                    // 이미지
                    const imgEl = li.querySelector('img');
                    const imgUrl = imgEl ? (imgEl.src || imgEl.dataset.original) : '';
                    
                    // 리뷰 & 평점 (리스트 페이지용)
                    const pointEl = info.querySelector('.point');
                    const reviewEl = info.querySelector('.review');
                    
                    let rating = 0.0;
                    let reviewCount = 0;
                    
                    if (pointEl) {
                        const pointText = pointEl.innerText.trim();
                        // 매칭: "10점만점에 4.9점" 등
                        const ratingMatch = pointText.match(/에\s*([0-9.]+)\s*점/);
                        if (ratingMatch) {
                            const rawScore = parseFloat(ratingMatch[1]);
                            // 5.5 is Olive Young's default template placeholder (10점만점에 5.5점). Ignore it.
                            if (rawScore !== 5.5) {
                                rating = Math.round((rawScore / 2) * 10) / 10;
                            }
                        }
                    }
                    
                    if (reviewEl) {
                        const reviewText = reviewEl.innerText.replace(/[^0-9]/g, '');
                        reviewCount = parseInt(reviewText) || 0;
                    }
                    
                    // 상품 ID & 링크
                    const linkEl = info.querySelector('a');
                    let link = linkEl ? linkEl.href : '';
                    
                    let goodsNo = '';
                    if (link.includes('goodsNo=')) {
                        goodsNo = link.split('goodsNo=')[1].split('&')[0];
                    } else if (li.dataset.goodsNo) {
                        goodsNo = li.dataset.goodsNo;
                    } else {
                        const onClick = linkEl && linkEl.getAttribute('onclick');
                        if (onClick && onClick.includes('goods.detail')) {
                            const match = onClick.match(/detail\('([^']+)'\)/);
                            if (match) goodsNo = match[1];
                        }
                    }
                    
                    if (!link.startsWith('http')) {
                        link = 'https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo=' + goodsNo;
                    }

                    if (goodsNo && name) {
                        results.push({
                            id: goodsNo,
                            name: name,
                            brand_name: brand,
                            price: parseInt(price),
                            image: imgUrl,
                            url: link,
                            review_count: reviewCount,
                            review_rating: rating
                        });
                    }
                });
                return results;
            }
        """
        captured_items = await page.evaluate(parse_script)
        
        print(f"  ✅ {len(captured_items)}개 상품 발견 (DOM)")
        
        saved_count = 0
        for rank, item in enumerate(captured_items, start=1):
            if rank > 100: break
            if save_product_and_rank(item, rank, category["code"]):
                saved_count += 1
                
        print(f"  💾 저장 완료: {saved_count}개")
        total_saved_items += saved_count
        
        # 봇 차단 방지를 위한 대기
        await asyncio.sleep(random.uniform(3, 5))

    return total_saved_items

async def scrape_product_reviews(page, goods_no):
    """Visit a product detail page and extract review count, rating, and review texts"""
    detail_url = f"https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo={goods_no}"
    
    try:
        await page.goto(detail_url, wait_until="domcontentloaded", timeout=30000)
        await asyncio.sleep(3)
        
        # Check if page loaded (not Cloudflare challenge)
        title = await page.title()
        if "잠시만 기다려" in title:
            await asyncio.sleep(5)
        
        parse_script = """
        () => {
            let reviewCount = 0;
            let rating = 0.0;
            let reviews = [];
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
        return data
        
    except Exception as e:
        print(f"    ⚠️ Review scrape failed for {goods_no}: {e}")
        return None

async def update_reviews_for_products(page, limit=50):
    """Fetch products with missing reviews and update them"""
    print(f"\n=== 리뷰 데이터 업데이트 시작 (최대 {limit}개) ===")
    
    # Get products with review_count=0 from the database
    try:
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
    except Exception as e:
        print(f"  ❌ Failed to fetch products: {e}")
        return 0
    
    if not products:
        print("  ℹ️ 업데이트할 제품 없음")
        return 0
    
    print(f"  📋 {len(products)}개 제품 리뷰 업데이트 예정")
    updated = 0
    
    for p in products:
        goods_no = p.get("product_id")
        db_id = p.get("id")
        if not goods_no:
            continue
        
        data = await scrape_product_reviews(page, goods_no)
        if not data:
            continue
        
        review_count = data.get("reviewCount", 0)
        rating = data.get("rating", 0.0)
        reviews = data.get("reviews", [])
        
        if review_count > 0 or (rating > 0 and rating <= 5):
            update_record = {}
            if review_count > 0:
                update_record["review_count"] = review_count
            if rating > 0 and rating <= 5:
                update_record["review_rating"] = rating
            
            try:
                res = requests.patch(
                    f"{SUPABASE_URL}/rest/v1/products_master?id=eq.{db_id}",
                    headers=HEADERS,
                    json=update_record,
                    timeout=10
                )
                if res.status_code in [200, 204]:
                    updated += 1
                    print(f"    ✅ {goods_no}: 리뷰 {review_count}개, 별점 {rating}")
                else:
                    print(f"    ⚠️ DB update failed for {goods_no}: {res.status_code}")
            except Exception as e:
                print(f"    ❌ DB update error: {e}")
        
        # Anti-bot delay
        await asyncio.sleep(random.uniform(2, 4))
    
    print(f"  📊 총 {updated}개 제품 리뷰 업데이트 완료")
    return updated

async def oliveyoung_crawl():
    start_time = datetime.now()
    print(f"[{start_time}] 올리브영 크롤링 시작...")
    log_crawl("running", {"message": "Started Olive Young crawl"})
    
    total_saved = 0
    reviews_updated = 0
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=[
                '--disable-blink-features=AutomationControlled'
            ]
        )
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            viewport={"width": 1920, "height": 1080}
        )
        page = await context.new_page()
        
        try:
            total_saved = await crawl_oliveyoung_categories(page, TARGET_CATEGORIES)
        except Exception as e:
            print(f"  ❌ Error processing categories: {e}")
        
        # Phase 2: Update review data for products with missing reviews
        try:
            reviews_updated = await update_reviews_for_products(page, limit=50)
        except Exception as e:
            print(f"  ❌ Error updating reviews: {e}")
            
        await browser.close()
        
    duration = str(datetime.now() - start_time)
    print(f"[{datetime.now()}] 크롤링 종료. 총 {total_saved}개 저장, {reviews_updated}개 리뷰 업데이트. 소요시간: {duration}")
    log_crawl("completed", {
        "total_saved": total_saved, 
        "reviews_updated": reviews_updated,
        "duration": duration
    })

if __name__ == "__main__":
    asyncio.run(oliveyoung_crawl())

