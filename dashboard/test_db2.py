import os
import sys
import json
import urllib.parse
from dotenv import load_dotenv

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from generic_crawler.config import SUPABASE_URL, SUPABASE_KEY, HEADERS
import requests

# Test Ably
url = f"{SUPABASE_URL}/rest/v1/products_master?source=eq.ably_best&order=created_at.desc&limit=5"
res = requests.get(url, headers=HEADERS)
print("Ably Data:")
print(json.dumps(res.json(), indent=2, ensure_ascii=False))

# Test Olive Young
url2 = f"{SUPABASE_URL}/rest/v1/products_master?source=eq.oliveyoung_best&order=created_at.desc&limit=5"
res2 = requests.get(url2, headers=HEADERS)
print("\nOlive Young Data:")
print(json.dumps(res2.json(), indent=2, ensure_ascii=False))
