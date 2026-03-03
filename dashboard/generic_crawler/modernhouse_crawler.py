#!/usr/bin/env python3
"""
Modern House Best Crawler

Extracts top 50 products from allowed Modern House 'Best' categories.
Excludes '가구' (Furniture) and '수납/정리' (Storage).

Run: python3 generic_crawler/modernhouse_crawler.py
"""

import os
import sys
import datetime
import requests
from bs4 import BeautifulSoup

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from generic_crawler.config import SUPABASE_URL, SUPABASE_KEY, HEADERS

MH_BASE_URL = "https://www.mhmall.co.kr"
MH_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
}

# The Target Categories (Excluding 가구 & 수납/정리)
CATEGORIES = [
    {"id": "modern", "ko": "전체", "url_suffix": "modern"},
    {"id": "038", "ko": "패브릭", "url_suffix": "038"},
    {"id": "039", "ko": "주방", "url_suffix": "039"},
    {"id": "041", "ko": "키즈", "url_suffix": "041"},
    {"id": "042", "ko": "생활용품", "url_suffix": "042"},
    {"id": "060", "ko": "린넨앤키친", "url_suffix": "060"},
    {"id": "043", "ko": "홈데코", "url_suffix": "043"},
    {"id": "046", "ko": "가전/여행", "url_suffix": "046"},
    {"id": "045", "ko": "펫본", "url_suffix": "045"},
    {"id": "080", "ko": "식품", "url_suffix": "080"}
]


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


def fetch_products_for_category(cat: dict, today_str: str, date_only_str: str) -> int:
    records = []
    seen_ids = set()
    global_rank = 1
    
    for page in range(1, 4): # Usually 1-2 pages cover 50 items
        if len(records) >= 50:
             break
             
        cat_url = f"{MH_BASE_URL}/shop/page.html?id=9&cate_type={cat['url_suffix']}&page={page}"
        
        try:
            r = requests.get(cat_url, headers=MH_HEADERS, timeout=15)
            r.raise_for_status()
            r.encoding = 'euc-kr' 
        except Exception as e:
            print(f"  ⚠️  HTTP Error for {cat['ko']} (Page {page}): {e}")
            break

        soup = BeautifulSoup(r.text, 'html.parser')
        
        items = soup.find_all('dl', class_=lambda c: c and 'item-list' in c)

        if not items:
            if page == 1:
                print(f"  ⚠️  No items found for category {cat['ko']}")
            break

        for item in items:
            if len(records) >= 50:
                break
                
            # 1. Product ID
            a_tag = item.find('a', href=True)
            if not a_tag:
                continue
                
            href = a_tag['href']
            if 'branduid=' in href:
                 pid_str = href.split('branduid=')[-1].split('&')[0]
            else:
                 pid_str = f"mh_{global_rank}_{cat['id']}" # Fallback
                 
            if pid_str in seen_ids:
                 continue
            seen_ids.add(pid_str)
            
            # 2. Extract Data
            # Name
            name_tag = item.find('li', class_='prd-name')
            name = name_tag.text.strip() if name_tag else ""
            
            # Image
            img_tag = item.find('img')
            img_url = img_tag.get('src', '') if img_tag else ""
            # Sometimes images are placeholder gifs or lazy loaded.
            lazy_src = img_tag.get('data-original', '') if img_tag else ""
            if lazy_src:
                 img_url = lazy_src
                 
            if img_url and img_url.startswith('/'):
                img_url = f"{MH_BASE_URL}{img_url}"
                
            # Price
            price_tag = item.find('li', class_='prd-price')
            price = 0
            if price_tag:
                # Price string might have % and multiple numbers like "66% 19,900"
                lines = price_tag.text.strip().split('\n')
                best_price_text = lines[-1].replace(',', '').replace('원', '').strip()
                try:
                    price = int(best_price_text)
                except ValueError:
                    price = 0
                    
            # URL
            full_url = f"{MH_BASE_URL}{href}" if href.startswith('/') else href

            records.append({
                "product_id": f"modernhouse_{pid_str}",
                "source": "modernhouse_best",
                "name": name,
                "brand": "모던하우스",
                "price": price,
                "image_url": img_url,
                "url": full_url,
                "category": cat["ko"],
                "naver_category_id": cat["id"], 
                "current_rank": global_rank,
                "created_at": today_str,
                "tags": {"sort_type": "PRODUCT_BUY", "period": "DAILY"},
            })
            global_rank += 1

    # Upsert Master
    saved_items = upsert("products_master", records, on_conflict="source,product_id")
    
    if saved_items:
        pid_to_id = {item["product_id"]: item["id"] for item in saved_items if "id" in item}
        
        # Upsert Daily Ranking
        ranking_records = []
        for item in records:
            internal_id = pid_to_id.get(item["product_id"])
            if internal_id:
                ranking_records.append({
                    "product_id": internal_id,
                    "rank": item["current_rank"],
                    "date": date_only_str,
                    "category_code": cat["id"],
                    "source": "modernhouse_best"
                })
        
        if ranking_records:
            upsert("daily_rankings_v2", ranking_records, on_conflict="product_id,date,category_code")
            
    print(f"  📦 [{cat['ko']}] {len(records)}개 상품 수집 완료")
    return len(records)


def crawl():
    print(f"[{datetime.datetime.now()}] 모던하우스 쇼핑 베스트 크롤링 시작...")
    
    today_utc = datetime.datetime.now(datetime.timezone.utc)
    today_str = today_utc.isoformat()
    date_only_str = today_str[0:10]
    
    total_products = 0
    
    for cat in CATEGORIES:
        total = fetch_products_for_category(cat, today_str, date_only_str)
        total_products += total
        
    print(f"\n✅ 완료! 총 {total_products}개 베스트 상품 저장 (모던하우스)")


if __name__ == "__main__":
    crawl()
