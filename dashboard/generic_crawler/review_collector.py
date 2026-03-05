"""
AI Vision Review Collector
상품 상세 페이지 스크린샷 → 로컬 LLM(Vision) → 리뷰/평점/즐겨찾기 추출 → DB 업데이트

사용법:
  python review_collector.py           # 전체 실행 (각 플랫폼 30개)
  python review_collector.py --test    # 테스트 (각 플랫폼 2개)
"""
import os
import sys
import json
import time
import base64
import random
import asyncio
import argparse
import requests
import re
from datetime import datetime
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env"))

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://hgxblbbjlnsfkffwvfao.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY", os.getenv("SUPABASE_KEY", ""))
OLLAMA_URL = "http://localhost:11434/api/chat"
VISION_MODEL = os.getenv("OLLAMA_VISION_MODEL", "minicpm-v")

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

# Platform-specific detail page URL patterns
DETAIL_URL_PATTERNS = {
    "oliveyoung": "https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo={product_id}",
    "musinsa": "https://www.musinsa.com/products/{product_id}",
    "ably": "https://m.a-bly.com/goods/{product_id}",
    "ssg": "https://www.ssg.com/item/itemView.ssg?itemId={product_id}",
}

# Vision prompt for each platform
VISION_PROMPT_BASE = """이 이미지는 한국 이커머스 상품 상세 페이지의 스크린샷입니다.
이 페이지에서 아래 정보를 찾아서 JSON으로 정확하게 반환해주세요:

{{
  "review_count": 리뷰 수 (숫자, 없으면 0),
  "review_rating": 평점 (소수점 포함 숫자, 예: 4.8, 없으면 0),
  "favorite_count": 즐겨찾기/좋아요/찜 수 (숫자, 없으면 0)
}}

주의:
- 리뷰 수는 "리뷰", "후기", "구매후기", "review" 근처의 숫자입니다
- 평점은 별점이나 "평점" 근처의 숫자입니다 (보통 5점 만점)
- 즐겨찾기 수는 하트 아이콘이나 "찜", "좋아요", "즐겨찾기" 근처의 숫자입니다
- 숫자에 쉼표가 있으면 제거하세요 (예: 1,234 → 1234)
- JSON만 반환하고 다른 설명은 하지 마세요"""


def log(msg):
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}")


def get_products_without_reviews(source, limit=30):
    """DB에서 리뷰가 없는 상품 목록 조회"""
    url = f"{SUPABASE_URL}/rest/v1/products_master"
    params = {
        "select": "id,product_id,source,name",
        "source": f"eq.{source}",
        "or": "(review_count.eq.0,review_count.is.null)",
        "order": "updated_at.desc",
        "limit": str(limit)
    }
    try:
        res = requests.get(url, headers=HEADERS, params=params, timeout=10)
        if res.status_code == 200:
            return res.json()
        else:
            log(f"  ⚠️ DB query error: {res.text[:100]}")
            return []
    except Exception as e:
        log(f"  ❌ DB error: {e}")
        return []


def update_product_reviews(product_internal_id, review_count, review_rating, favorite_count=0):
    """DB에 리뷰/평점/즐겨찾기 업데이트
    
    Storage strategy:
    - review_count: 리뷰 수 (그대로 저장)
    - review_rating: 평점이 있으면 평점 (0~5), 없으면 즐겨찾기 수 (값 > 5 = 즐겨찾기)
      프론트엔드에서 review_rating > 5이면 즐겨찾기로 표시
    """
    url = f"{SUPABASE_URL}/rest/v1/products_master"
    update_data = {
        "updated_at": datetime.now().isoformat()
    }
    
    # review_count 저장 (favorites만 있어도 최소 1로 설정하여 재수집 방지)
    if review_count > 0:
        update_data["review_count"] = review_count
    elif favorite_count > 0:
        # 리뷰 없이 즐겨찾기만 있는 경우, 재수집 방지를 위해 -1 마커
        update_data["review_count"] = -1
    
    # review_rating: 평점 > 즐겨찾기 우선순위
    if review_rating > 0 and review_rating <= 5:
        update_data["review_rating"] = review_rating
    elif favorite_count > 0:
        # 즐겨찾기 수를 review_rating에 저장 (값 > 5 → 프론트에서 즐겨찾기로 인식)
        update_data["review_rating"] = favorite_count
    
    try:
        res = requests.patch(
            url,
            headers={**HEADERS, "Prefer": "return=representation"},
            params={"id": f"eq.{product_internal_id}"},
            json=update_data,
            timeout=10
        )
        return res.status_code in [200, 204]
    except Exception as e:
        log(f"  ❌ Update error: {e}")
        return False


def call_vision_llm(screenshot_base64):
    """Ollama Vision API 호출"""
    try:
        payload = {
            "model": VISION_MODEL,
            "messages": [
                {
                    "role": "user",
                    "content": VISION_PROMPT_BASE,
                    "images": [screenshot_base64]
                }
            ],
            "stream": False,
            "options": {
                "temperature": 0.1
            }
        }
        
        res = requests.post(OLLAMA_URL, json=payload, timeout=120)
        res.raise_for_status()
        
        text = res.json().get("message", {}).get("content", "").strip()
        
        # Clean up <think> tags if present
        text = re.sub(r'<think>.*?</think>', '', text, flags=re.DOTALL).strip()
        
        # Extract JSON
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0].strip()
        elif "```" in text:
            text = text.split("```")[1].split("```")[0].strip()
        
        # Find JSON object in text
        json_match = re.search(r'\{[^{}]*\}', text)
        if json_match:
            text = json_match.group()
        
        result = json.loads(text)
        return {
            "review_count": int(result.get("review_count", 0) or 0),
            "review_rating": float(result.get("review_rating", 0) or 0),
            "favorite_count": int(result.get("favorite_count", 0) or 0)
        }
        
    except json.JSONDecodeError as e:
        log(f"  ⚠️ JSON parse error: {e} | raw: {text[:100]}")
        return None
    except Exception as e:
        log(f"  ⚠️ Vision LLM error: {e}")
        return None


async def take_screenshot(page, url, source):
    """상품 페이지 스크린샷 촬영"""
    try:
        # Ably needs mobile viewport
        if source == "ably":
            await page.set_viewport_size({"width": 375, "height": 812})
        else:
            await page.set_viewport_size({"width": 1280, "height": 900})
        
        await page.goto(url, wait_until="domcontentloaded", timeout=30000)
        
        # Wait for content to load
        await asyncio.sleep(3)
        
        # Scroll down a bit to load review section
        await page.evaluate("window.scrollBy(0, 400)")
        await asyncio.sleep(1)
        
        # Handle Cloudflare/bot detection pages
        title = await page.title()
        if any(kw in title for kw in ["잠시만", "확인", "보안", "Cloudflare"]):
            log(f"    ⚠️ Bot detection page detected, waiting...")
            await asyncio.sleep(5)
        
        # Take screenshot
        screenshot_bytes = await page.screenshot(full_page=False)
        return base64.b64encode(screenshot_bytes).decode("utf-8")
        
    except Exception as e:
        log(f"    ❌ Screenshot error: {e}")
        return None


async def process_platform(browser, source, limit):
    """한 플랫폼의 리뷰 수집"""
    log(f"\n{'='*50}")
    log(f"📦 [{source.upper()}] 리뷰 수집 시작 (최대 {limit}개)")
    log(f"{'='*50}")
    
    products = get_products_without_reviews(source, limit)
    if not products:
        log(f"  ℹ️ 리뷰 없는 상품이 없습니다.")
        return 0
    
    log(f"  📋 {len(products)}개 상품 수집 예정")
    
    url_pattern = DETAIL_URL_PATTERNS.get(source)
    if not url_pattern:
        log(f"  ❌ Unknown source: {source}")
        return 0
    
    context = await browser.new_context(
        user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        locale="ko-KR"
    )
    page = await context.new_page()
    
    success_count = 0
    
    for i, product in enumerate(products):
        product_id = product["product_id"]
        name = product.get("name", "")[:40]
        detail_url = url_pattern.format(product_id=product_id)
        
        log(f"  [{i+1}/{len(products)}] {name}...")
        
        # Screenshot
        screenshot_b64 = await take_screenshot(page, detail_url, source)
        if not screenshot_b64:
            continue
        
        # Vision LLM
        result = call_vision_llm(screenshot_b64)
        if not result:
            continue
        
        rc = result["review_count"]
        rt = result["review_rating"]
        fc = result["favorite_count"]
        
        log(f"    ✅ reviews={rc}, rating={rt}, favorites={fc}")
        
        # Update DB (only if we found something)
        if rc > 0 or rt > 0 or fc > 0:
            if update_product_reviews(product["id"], rc, rt, fc):
                success_count += 1
                log(f"    💾 DB 업데이트 완료")
            else:
                log(f"    ⚠️ DB 업데이트 실패")
        else:
            log(f"    ℹ️ 리뷰 데이터 없음 (신규 상품?)")
        
        # Random delay between requests
        delay = random.uniform(3, 8)
        await asyncio.sleep(delay)
    
    await context.close()
    log(f"\n  📊 [{source.upper()}] 완료: {success_count}/{len(products)} 업데이트됨")
    return success_count


async def main():
    parser = argparse.ArgumentParser(description="AI Vision Review Collector")
    parser.add_argument("--test", action="store_true", help="Test mode (2 products per platform)")
    parser.add_argument("--platform", type=str, help="Single platform only (oliveyoung/musinsa/ably/ssg)")
    args = parser.parse_args()
    
    limit = 2 if args.test else 100
    platforms = [args.platform] if args.platform else ["oliveyoung", "musinsa", "ably", "ssg"]
    
    log("🚀 AI Vision Review Collector 시작")
    log(f"  모델: {VISION_MODEL}")
    log(f"  모드: {'테스트' if args.test else '전체'}")
    log(f"  대상: {', '.join(platforms)}")
    
    # Check Ollama is running
    try:
        res = requests.get("http://localhost:11434/api/tags", timeout=5)
        models = [m["name"] for m in res.json().get("models", [])]
        if not any(VISION_MODEL in m for m in models):
            log(f"  ❌ Vision model '{VISION_MODEL}' not found. Available: {models}")
            log(f"  💡 Run: ollama pull {VISION_MODEL}")
            return
        log(f"  ✅ Ollama 연결 확인 (모델: {VISION_MODEL})")
    except Exception as e:
        log(f"  ❌ Ollama 연결 실패: {e}")
        return
    
    from playwright.async_api import async_playwright
    
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        
        total_success = 0
        for platform in platforms:
            try:
                count = await process_platform(browser, platform, limit)
                total_success += count
            except Exception as e:
                log(f"  ❌ [{platform}] 에러: {e}")
        
        await browser.close()
    
    log(f"\n🎉 전체 완료: {total_success}개 상품 리뷰 업데이트됨")


if __name__ == "__main__":
    asyncio.run(main())
