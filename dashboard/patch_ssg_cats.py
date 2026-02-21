import os
import requests
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

NEW_CATEGORIES = [
    {"category_code": "BEAUTY", "name_ko": "뷰티", "sort_order": 101, "platform": "ssg"},
    {"category_code": "FASHION", "name_ko": "패션", "sort_order": 102, "platform": "ssg"},
    {"category_code": "LUXURY", "name_ko": "명품", "sort_order": 103, "platform": "ssg"},
    {"category_code": "KIDS", "name_ko": "유아동", "sort_order": 104, "platform": "ssg"},
    {"category_code": "SPORTS", "name_ko": "스포츠", "sort_order": 105, "platform": "ssg"},
    {"category_code": "FOOD_LIFE", "name_ko": "푸드&리빙", "sort_order": 106, "platform": "ssg"}
]

print("Patching SSG Categories into Supabase...")

for cat in NEW_CATEGORIES:
    res = requests.post(
        f"{SUPABASE_URL}/rest/v1/categories",
        headers=HEADERS,
        params={"on_conflict": "category_code"},
        json=cat
    )
    if res.status_code in (200, 201):
        print(f"✅ Upserted: {cat['category_code']} -> {cat['name_ko']}")
    else:
        print(f"❌ Error for {cat['category_code']}: {res.text}")

print("Category DB Patch Complete.")
