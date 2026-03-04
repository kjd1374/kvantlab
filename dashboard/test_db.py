import os
import sys
import json
import urllib.parse
from dotenv import load_dotenv

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from generic_crawler.config import SUPABASE_URL, SUPABASE_KEY, HEADERS
import requests

query = "select=product_id,source,name,review_count,review_rating,url&limit=10&source=in.(oliveyoung_best,ably_best)"
url = f"{SUPABASE_URL}/rest/v1/products_master?{query}"
res = requests.get(url, headers=HEADERS)
data = res.json()
print(json.dumps(data, indent=2, ensure_ascii=False))
