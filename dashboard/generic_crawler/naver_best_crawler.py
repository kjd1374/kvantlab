#!/usr/bin/env python3
"""
Naver Shopping Best Crawler v2 (Category-aware, Brand-aware)

Products: Crawled by category × DAILY (PRODUCT_BUY)
Brands:   Crawled by category × WEEKLY + MONTHLY (BRAND_POPULAR)

Run: python3 generic_crawler/naver_best_crawler.py
"""

import os
import sys
import json
import datetime
import requests

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from generic_crawler.config import SUPABASE_URL, SUPABASE_KEY, HEADERS

NAVER_BASE = "https://snxbest.naver.com/api/v1/snxbest"

NAVER_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8",
    "Referer": "https://snxbest.naver.com/home",
    "Origin": "https://snxbest.naver.com",
}

CATEGORIES = [
    {"id": "A",        "ko": "전체",       "en": "All"},
    {"id": "50000000", "ko": "패션의류",    "en": "Fashion"},
    {"id": "50000001", "ko": "패션잡화",    "en": "Accessories"},
    {"id": "50000002", "ko": "화장품/미용", "en": "Beauty"},
    {"id": "50000003", "ko": "디지털/가전", "en": "Digital"},
    {"id": "50000004", "ko": "가구/인테리어","en": "Furniture"},
    {"id": "50000005", "ko": "출산/육아",   "en": "Baby"},
    {"id": "50000006", "ko": "식품",        "en": "Food"},
    {"id": "50000007", "ko": "스포츠/레저", "en": "Sports"},
    {"id": "50000008", "ko": "생활/건강",   "en": "Living"},
]

BRAND_PERIODS = ["WEEKLY", "MONTHLY"]


def naver_get(path: str, params: dict = None) -> any:
    url = f"{NAVER_BASE}/{path}"
    try:
        r = requests.get(url, headers=NAVER_HEADERS, params=params, timeout=30)
        r.raise_for_status()
        return r.json()
    except Exception as e:
        print(f"  ⚠️  API Error ({url} {params}): {e}")
        return []


def upsert(table: str, records: list) -> None:
    if not records:
        return
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    headers = {**HEADERS, "Prefer": "return=minimal,resolution=merge-duplicates"}
    try:
        r = requests.post(url, headers=headers, json=records, timeout=30)
        r.raise_for_status()
        print(f"  ✅ {table}: {len(records)}개 저장")
    except Exception as e:
        print(f"  ❌ {table} 저장 실패: {e}")


def delete_today_brands(category_id: str, period_type: str) -> None:
    """오늘 날짜의 해당 category+period 브랜드 먼저 삭제 (freshness 유지)"""
    today = datetime.date.today().isoformat()
    url = f"{SUPABASE_URL}/rest/v1/trend_brands"
    svc_headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
    }
    params = f"category_id=eq.{category_id}&period_type=eq.{period_type}&created_at=gte.{today}"
    try:
        requests.delete(f"{url}?{params}", headers=svc_headers, timeout=10)
    except Exception:
        pass


def fetch_products_by_category() -> int:
    today = datetime.datetime.now(datetime.timezone.utc).isoformat()
    total = 0
    seen_ids = set()

    for cat in CATEGORIES:
        data = naver_get("product/rank", {
            "sortType": "PRODUCT_BUY",
            "periodType": "DAILY",
            "ageType": "ALL",
            "categoryId": cat["id"],
        })
        items = data if isinstance(data, list) else (data.get("products") or [])
        records = []
        for rank, item in enumerate(items[:50], 1):
            pid = str(item.get("productId") or item.get("nvMid") or "")
            key = f"{cat['id']}_{pid}"
            if not pid or key in seen_ids or item.get("isAd"):
                continue
            seen_ids.add(key)

            price_raw = item.get("salePrice") or item.get("price") or 0
            try:
                price = int(str(price_raw).replace(",", ""))
            except ValueError:
                price = 0

            records.append({
                "product_id": f"naver_{pid}",
                "source": "naver_best",
                "name": item.get("title") or item.get("productName") or "",
                "brand": item.get("mallName") or item.get("brandName") or "",
                "price": price,
                "image_url": item.get("imageUrl") or "",
                "url": item.get("linkUrl") or item.get("productUrl") or f"https://smartstore.naver.com/products/{pid}",
                "category": cat["ko"],
                "naver_category_id": cat["id"],
                "current_rank": rank,
                "rank_change": int(item.get("rankChange") or 0),
                "created_at": today,
                "tags": {"sort_type": "PRODUCT_BUY", "period": "DAILY"},
            })

        upsert("products_master", records)
        print(f"  📦 [{cat['ko']}] {len(records)}개 상품")
        total += len(records)

    return total


def fetch_brands_by_category() -> int:
    today = datetime.datetime.now(datetime.timezone.utc).isoformat()
    total = 0

    for period in BRAND_PERIODS:
        for cat in CATEGORIES:
            delete_today_brands(cat["id"], period)

            data = naver_get("brand/rank", {
                "sortType": "BRAND_POPULAR",
                "periodType": period,
                "ageType": "ALL",
                "categoryId": cat["id"],
            })
            items = data if isinstance(data, list) else (data.get("brands") or [])

            records = []
            for rank, item in enumerate(items[:30], 1):
                brand_name = (
                    item.get("brandNm") or item.get("title") or
                    item.get("brandName") or item.get("name") or ""
                )
                if not brand_name:
                    continue

                tags_raw = item.get("tags") or []
                hashtags = [f"#{t}" for t in tags_raw[:3]] if tags_raw else []

                records.append({
                    "brand_name": brand_name,
                    "category": cat["ko"],
                    "category_id": cat["id"],
                    "period_type": period,
                    "rank": rank,
                    "rank_change": 0,
                    "logo_url": item.get("brandLogo") or item.get("logoUrl") or "",
                    "store_url": item.get("brandUrl") or item.get("storeUrl") or "",
                    "hashtags": hashtags,
                    "created_at": today,
                })

            upsert("trend_brands", records)
            print(f"  🏢 [{period}][{cat['ko']}] {len(records)}개 브랜드")
            total += len(records)

    return total


def crawl():
    print(f"[{datetime.datetime.now()}] 네이버 쇼핑 베스트 크롤링 시작 (v2)...")
    p = fetch_products_by_category()
    b = fetch_brands_by_category()
    print(f"\n✅ 완료! 상품 {p}개 / 브랜드 {b}개 저장")


if __name__ == "__main__":
    crawl()
