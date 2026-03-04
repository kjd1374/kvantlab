import os
import sys
import json
import urllib.parse
from dotenv import load_dotenv

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from generic_crawler.config import SUPABASE_URL, SUPABASE_KEY, HEADERS
import requests

url = f"{SUPABASE_URL}/rest/v1/products_master?select=source&limit=100"
res = requests.get(url, headers=HEADERS)
sources = set([item['source'] for item in res.json() if 'source' in item])
print(f"Available sources in DB: {sources}")

# Now query for top 1 from ably and oliveyoung
print("\nAbly Top Item:")
url = f"{SUPABASE_URL}/rest/v1/products_master?source=eq.ably&order=created_at.desc&limit=1"
res = requests.get(url, headers=HEADERS)
print(json.dumps(res.json(), indent=2, ensure_ascii=False))

print("\nOlive Young Top Item:")
url = f"{SUPABASE_URL}/rest/v1/products_master?source=eq.oliveyoung&order=created_at.desc&limit=1"
res = requests.get(url, headers=HEADERS)
print(json.dumps(res.json(), indent=2, ensure_ascii=False))
