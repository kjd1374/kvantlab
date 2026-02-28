#!/usr/bin/env python3
"""
Naver Shopping Best Crawler (API-based)
Uses the internal Naver Best JSON APIs discovered from page inspection.

Endpoints:
  Keywords: GET /api/v1/snxbest/keyword/rank?sortType=KEYWORD_NEW|KEYWORD_ISSUE|KEYWORD_POPULAR&periodType=WEEKLY
  Brands:   GET /api/v1/snxbest/brand/rank?sortType=BRAND_POPULAR&periodType=WEEKLY
  Products: GET /api/v1/snxbest/product/rank?sortType=PRODUCT_CLICK|PRODUCT_BUY&periodType=DAILY

Run: python3 generic_crawler/naver_best_crawler.py
"""

import os
import sys
import json
import datetime
import requests

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from generic_crawler.config import SUPABASE_URL, HEADERS

NAVER_BASE = "https://snxbest.naver.com/api/v1/snxbest"

# Headers to mimic a real browser – Naver checks referer/user-agent
NAVER_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
    "Referer": "https://snxbest.naver.com/home",
    "Origin": "https://snxbest.naver.com",
}

KEYWORD_TYPES = [
    ("emerging", "KEYWORD_NEW"),
    ("issue",    "KEYWORD_ISSUE"),
    ("steady",   "KEYWORD_POPULAR"),
]

KEYWORD_PERIOD = "DAILY"   # keywords use DAILY
BRAND_PERIOD   = "WEEKLY"  # brands use WEEKLY
CATEGORY_ID    = "A"       # 'A' = All categories
AGE_TYPE       = "ALL"


def naver_get(path: str, params: dict = None) -> dict:
    """Fetch JSON from Naver Best API."""
    url = f"{NAVER_BASE}/{path}"
    try:
        r = requests.get(url, headers=NAVER_HEADERS, params=params, timeout=30)
        r.raise_for_status()
        return r.json()
    except Exception as e:
        print(f"  ⚠️ API Error ({url}): {e}")
        return {}


def upsert(table: str, records: list, conflict_col: str = None) -> None:
    """Upsert records to Supabase via REST API."""
    if not records:
        return
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    headers = {**HEADERS, "Prefer": "return=minimal,resolution=merge-duplicates"}
    try:
        r = requests.post(url, headers=headers, json=records, timeout=30)
        r.raise_for_status()
        print(f"  ✅ Saved {len(records)} records → {table}")
    except Exception as e:
        print(f"  ❌ Save failed ({table}): {e}")


def fetch_keywords() -> list:
    """Fetch keyword rankings for all 3 types."""
    today = datetime.datetime.now(datetime.timezone.utc).isoformat()
    results = []

    for kw_type, sort_type in KEYWORD_TYPES:
        data = naver_get("keyword/rank", {
            "sortType": sort_type,
            "periodType": KEYWORD_PERIOD,
            "ageType": AGE_TYPE,
            "categoryId": CATEGORY_ID,
        })
        # Handle both list response and dict response
        if isinstance(data, list):
            items = data
        else:
            items = (
                data.get("keywords")
                or data.get("data", {}).get("list")
                or data.get("data", {}).get("keywordList")
                or data.get("list")
                or []
            )
        if not items and isinstance(data, dict):
            print(f"  🔍 keyword/{sort_type} raw keys: {list(data.keys())}")
            print(f"  🔍 keyword raw response: {json.dumps(data, ensure_ascii=False)[:400]}")
            # If its empty data error response, try discovering actual endpoint
            continue

        for rank, item in enumerate(items, 1):
            keyword = (
                item.get("keyword")
                or item.get("keywordName")
                or item.get("name")
                or item.get("title")
                or ""
            )
            if keyword:
                results.append({
                    "keyword": keyword,
                    "type": kw_type,
                    "category": item.get("categoryName") or item.get("category"),
                    "rank": rank,
                    "created_at": today,
                })
        print(f"  🔑 [{kw_type}] {len(items)}개 키워드 수집")

    return results


def fetch_brands() -> list:
    """Fetch brand rankings."""
    today = datetime.datetime.now(datetime.timezone.utc).isoformat()
    results = []

    # Use correct params discovered via Playwright
    data = naver_get("brand/rank", {
        "sortType": "BRAND_POPULAR",
        "periodType": BRAND_PERIOD,
        "ageType": AGE_TYPE,
        "categoryId": CATEGORY_ID,
    })
    if isinstance(data, list):
        items = data
    else:
        items = (
            data.get("brands")
            or data.get("data", {}).get("list")
            or data.get("data", {}).get("brandList")
            or data.get("list")
            or []
        )
    if not items and isinstance(data, dict):
        print(f"  🔍 brand keys: {list(data.keys())}")
        print(f"  🔍 raw: {json.dumps(data, ensure_ascii=False)[:400]}")

    for rank, item in enumerate(items[:30], 1):
        brand_name = (
            item.get("brandName")
            or item.get("name")
            or item.get("brand")
            or item.get("mallName")
            or ""
        )
        if brand_name:
            results.append({
                "brand_name": brand_name,
                "category": item.get("categoryName") or item.get("category"),
                "rank": rank,
                "rank_change": int(item.get("rankChange") or item.get("rankDiff") or 0),
                "created_at": today,
            })

    print(f"  🏢 {len(results)}개 브랜드 수집")
    return results


def fetch_products() -> list:
    """Fetch best-selling products."""
    today = datetime.datetime.now(datetime.timezone.utc).isoformat()
    results = []
    seen_ids = set()

    for sort_type in ["PRODUCT_BUY", "PRODUCT_CLICK"]:
        data = naver_get("product/rank", {
            "sortType": sort_type,
            "periodType": "DAILY",
        })
        # Product API returns under 'products' key based on debug output
        items = (
            data.get("products")
            or data.get("data", {}).get("list")
            or data.get("list")
            or []
        )
        if not items and data:
            print(f"  🔍 product/{sort_type} raw keys: {list(data.keys())}")
            print(f"  🔍 raw sample: {json.dumps(data, ensure_ascii=False)[:200]}")

        is_buy = sort_type == "PRODUCT_BUY"
        for rank, item in enumerate(items[:100], 1):
            product_id = str(
                item.get("productId")
                or item.get("nvMid")
                or item.get("id")
                or ""
            )
            if not product_id or product_id in seen_ids:
                continue
            seen_ids.add(product_id)

            # Real API uses 'title' not 'productName'
            name = item.get("title") or item.get("productName") or item.get("name") or ""
            brand = item.get("mallName") or item.get("brand") or item.get("brandName") or ""
            url = item.get("linkUrl") or item.get("productUrl") or item.get("url") or f"https://smartstore.naver.com/products/{product_id}"
            image = item.get("imageUrl") or item.get("image") or ""

            price_raw = item.get("salePrice") or item.get("price") or item.get("lowestPrice") or 0
            try:
                price = int(str(price_raw).replace(",", "").replace("원", "")) if price_raw else 0
            except ValueError:
                price = 0

            orig_raw = item.get("originalPrice") or item.get("basePrice") or 0
            try:
                original_price = int(str(orig_raw).replace(",", "").replace("원", "")) if orig_raw else price
            except ValueError:
                original_price = price

            # Skip ads if isAd flag present
            if item.get("isAd"):
                continue

            results.append({
                "product_id": f"naver_{product_id}",
                "source": "naver_best",
                "name": name,
                "brand": brand,
                "price": price,
                "image_url": image,
                "url": url,
                "category": item.get("categoryName") or item.get("category") or "기타",
                "current_rank": rank,
                "rank_change": int(item.get("rankChange") or item.get("rankDiff") or 0),
                "created_at": today,
                # Store extra info in tags JSON
                "tags": {
                    "original_price": price if not orig_raw else int(str(orig_raw).replace(",", "").replace("원", "")) if orig_raw else price,
                    "sort_type": sort_type,
                }
            })

    print(f"  🛍️ {len(results)}개 상품 수집 (광고 제외)")
    return results


def crawl():
    print(f"[{datetime.datetime.now()}] 네이버 쇼핑 베스트 크롤링 시작...")

    keywords = fetch_keywords()
    brands   = fetch_brands()
    products = fetch_products()

    print(f"\n📦 수집 결과: 키워드={len(keywords)}, 브랜드={len(brands)}, 상품={len(products)}")

    if keywords:
        upsert("trend_keywords", keywords)
    if brands:
        upsert("trend_brands", brands)
    if products:
        upsert("products_master", products)

    print("✅ 완료!")


if __name__ == "__main__":
    crawl()
