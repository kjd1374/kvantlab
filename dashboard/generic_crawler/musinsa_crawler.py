import os
import time
import json
import requests
from datetime import datetime
from dotenv import load_dotenv

# ENV Setup
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env"))

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: SUPABASE_URL or SUPABASE_KEY not found in environment variables.")
    exit(1)

# Supabase REST API Headers
headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation,resolution=merge-duplicates"
}

def log_crawl(status, metadata=None):
    try:
        log_url = f"{SUPABASE_URL}/rest/v1/crawl_logs"
        log_data = {
            "job_name": "musinsa_ranking_crawl",
            "status": status,
            "started_at": datetime.now().isoformat() if status == "running" else None,
            "finished_at": datetime.now().isoformat() if status == "completed" or status == "failed" else None,
            "metadata_json": metadata or {}
        }
        requests.post(log_url, headers=headers, json=log_data, timeout=10)
    except Exception as e:
        print(f"Warning: Could not log crawl status: {e}")

def musinsa_crawl():
    start_time = datetime.now()
    print(f"[{start_time}] Starting Musinsa Ranking Crawl (API)...")
    log_crawl("running", {"message": "Started ranking crawl via API"})
    
    # Store combinations we want to crawl
    # We will crawl: All(000), Tops(001), Outerwear(002), Bottoms(003),
    # Dresses(020), Skirts(022), Sneakers(018), Shoes(005), Bags(004), Women's Bags(054)
    # And we will do this for both Men (M) and Women (F) to support the gender filter
    categories = ['000', '001', '002', '003', '020', '022', '018', '005', '004', '054']
    genders = ['M', 'F']
    
    request_headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Referer": "https://www.musinsa.com/main/ranking"
    }
    
    processed_count = 0
    error_count = 0

    category_map = {
        '000': '전체', '001': '상의', '002': '아우터', '003': '바지',
        '020': '원피스', '022': '스커트', '018': '스니커즈', '005': '신발',
        '004': '가방', '054': '여성 가방'
    }

    try:
        for gender in genders:
            for cat in categories:
                list_url = f"https://api.musinsa.com/api2/hm/web/v5/pans/ranking/sections/200?storeCode=musinsa&categoryCode={cat}&gf={gender}"
                
                print(f"Fetching: {list_url}")
                try:
                    response = requests.get(list_url, headers=request_headers, timeout=10)
                    if response.status_code != 200:
                        print(f"Skip {cat} / {gender}: status {response.status_code}")
                        continue
                        
                    data = response.json()
                    
                    modules = data.get("data", {}).get("modules", [])
                    items_to_process = []
                    for module in modules:
                        items = module.get("items", [])
                        for item in items:
                            if item.get("type") == "PRODUCT_COLUMN":
                                items_to_process.append(item)
                    
                    items_to_process = items_to_process[:50]
                    print(f"Found {len(items_to_process)} items for {cat} ({gender})")
                    
                    for idx, item in enumerate(items_to_process):
                        processed_count += 1
                        product_id = str(item.get("id"))
                        info = item.get("info", {})
                        title = info.get("productName")
                        brand = info.get("brandName")
                        price = info.get("finalPrice")
                        
                        image_url = item.get("image", {}).get("url")
                        link_url = f"https://www.musinsa.com/products/{product_id}"
                        rank = idx + 1
                        
                        if title and product_id:
                            product_record = {
                                "product_id": product_id,
                                "source": "musinsa",
                                "name": title,
                                "brand": brand,
                                "price": price,
                                "image_url": image_url,
                                "url": link_url,
                                "tags": {"gender": "male" if gender == 'M' else "female"},
                                "updated_at": datetime.now().isoformat()
                            }
                            if cat != '000' and cat in category_map:
                                product_record["category"] = category_map[cat]
                            
                            upsert_url = f"{SUPABASE_URL}/rest/v1/products_master"
                            upsert_params = {"on_conflict": "source,product_id"}
                            
                            res = requests.post(upsert_url, headers=headers, params=upsert_params, json=product_record, timeout=10)
                            
                            if res.status_code in [200, 201]:
                                db_items = res.json()
                                if db_items:
                                    internal_id = db_items[0].get("id")
                                    
                                    # 2. Upsert Ranking to daily_rankings_v2
                                    ranking_date = datetime.now().date().isoformat()
                                    ranking_record = {
                                        "product_id": internal_id,
                                        "rank": rank,
                                        "date": ranking_date,
                                        "category_code": cat,
                                        "source": f"musinsa"
                                    }
                                    
                                    rank_upsert_url = f"{SUPABASE_URL}/rest/v1/daily_rankings_v2"
                                    rank_params = {"on_conflict": "product_id,date,category_code"}
                                    
                                    rank_res = requests.post(rank_upsert_url, headers=headers, params=rank_params, json=ranking_record, timeout=10)
                                    if rank_res.status_code not in [200, 201]:
                                        error_count += 1
                                else:
                                    error_count += 1
                            else:
                                error_count += 1
                except Exception as e:
                    print(f"Error fetching {cat} / {gender}: {e}")
                    error_count += 1

                time.sleep(1) # Prevent rate limiting

        print(f"[{datetime.now()}] Crawl complete. Processed {processed_count} items with {error_count} errors.")
        log_crawl("completed", {
            "processed_count": processed_count,
            "error_count": error_count,
            "duration": str(datetime.now() - start_time)
        })
        
    except Exception as e:
        print(f"Fatal error during crawl: {e}")
        log_crawl("failed", {"error": str(e)})

if __name__ == "__main__":
    musinsa_crawl()
