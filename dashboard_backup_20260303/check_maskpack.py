import os
import requests
from dotenv import load_dotenv

load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json"
}

# Fetch top 5 items for Mask Pack today
response = requests.get(
    f"{SUPABASE_URL}/rest/v1/daily_rankings_v2?select=rank,product_id,products_master(name,brand)&category_code=eq.10000010009&source=eq.oliveyoung&order=rank.asc&limit=5",
    headers=HEADERS
)

data = response.json()
print("Top 5 Mask Pack items currently in DB:")
for item in data:
    product = item.get("products_master", {})
    print(f"{item['rank']}. [{product.get('brand')}] {product.get('name')}")
