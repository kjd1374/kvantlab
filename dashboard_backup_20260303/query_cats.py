import os
import requests
import json
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json"
}

response = requests.get(f"{SUPABASE_URL}/rest/v1/categories?platform=eq.oliveyoung&order=sort_order.asc", headers=headers)
print(json.dumps(response.json(), ensure_ascii=False, indent=2))
