import sys
import os
import json
import requests

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from config import SUPABASE_URL, HEADERS

def check():
    r1 = requests.get(f"{SUPABASE_URL}/rest/v1/products_master?source=eq.naver_best&select=product_id,naver_category_id&limit=5", headers=HEADERS)
    print("Products:", json.dumps(r1.json(), indent=2, ensure_ascii=False))

    r2 = requests.get(f"{SUPABASE_URL}/rest/v1/products_master?source=eq.naver_best&select=naver_category_id", headers=HEADERS)
    data = r2.json()
    print("Total Products:", len(data))

    r3 = requests.get(f"{SUPABASE_URL}/rest/v1/trend_brands?limit=5", headers=HEADERS)
    print("Brands:", json.dumps(r3.json()[:2], indent=2, ensure_ascii=False))

check()
