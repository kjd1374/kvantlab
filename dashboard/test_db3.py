import requests

from generic_crawler.config import SUPABASE_URL, HEADERS
url = f"{SUPABASE_URL}/rest/v1/products_master?source=eq.ably&order=created_at.desc&limit=1"
res = requests.get(url, headers=HEADERS)
data = res.json()
if data:
    product = data[0]
    print(f"Ably URL mapping check: DB 'url' = {product.get('url')} (Type: {type(product.get('url'))})")

url2 = f"{SUPABASE_URL}/rest/v1/products_master?source=eq.oliveyoung&order=created_at.desc&limit=1"
res2 = requests.get(url2, headers=HEADERS)
data2 = res2.json()
if data2:
    product2 = data2[0]
    print(f"OliveYoung URL mapping check: DB 'url' = {product2.get('url')} (Type: {type(product2.get('url'))})")
