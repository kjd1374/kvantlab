import requests
import json
from generic_crawler.config import SUPABASE_URL, HEADERS

url = f"{SUPABASE_URL}/rest/v1/products_master?source=eq.oliveyoung&order=created_at.desc&limit=5&select=name,review_count,review_rating"
res = requests.get(url, headers=HEADERS)
print("Olive Young Top 5:")
print(json.dumps(res.json(), ensure_ascii=False, indent=2))
