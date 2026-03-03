import sys
import os
sys.path.append(os.path.join(os.getcwd(), 'generic_crawler'))

import requests
from generic_crawler.oliveyoung_crawler import SUPABASE_URL, HEADERS

def fix_fake_ratings():
    print("Fetching bad ratings...")
    res = requests.get(
        f"{SUPABASE_URL}/rest/v1/products_master?source=eq.oliveyoung&review_count=eq.0&review_rating=eq.2.8&select=id,product_id",
        headers=HEADERS
    )
    if res.status_code == 200:
        items = res.json()
        print(f"Found {len(items)} items with fake 2.8 rating.")
        for item in items:
            p_res = requests.patch(
                f"{SUPABASE_URL}/rest/v1/products_master?id=eq.{item['id']}",
                headers=HEADERS,
                json={"review_rating": 0.0}
            )
            print(f"Fixed {item['product_id']}: {p_res.status_code}")
    else:
        print("Error fetching:", res.status_code)

fix_fake_ratings()
