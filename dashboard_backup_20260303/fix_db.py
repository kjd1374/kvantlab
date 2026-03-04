import os
import requests
from dotenv import load_dotenv

# Load env variables
load_dotenv('.env')
URL = os.getenv('SUPABASE_URL')
KEY = os.getenv('SUPABASE_KEY')

headers = {'apikey': KEY, 'Authorization': f'Bearer {KEY}', 'Content-Type': 'application/json'}

print("1. Checking Categories...")
res = requests.get(f"{URL}/rest/v1/categories?platform=eq.oliveyoung&select=id,category_code,name_ko,depth", headers=headers)
cats = res.json()
print("Olive Young Categories in DB:")
for c in cats:
    print(c)

# If there is a category named "전체" but code is not "all", it might be a duplicate
dup_ids = [c['id'] for c in cats if c['name_ko'] == '전체' and c['category_code'] != 'all']
if dup_ids:
    print(f"Deleting duplicate '전체' categories: {dup_ids}")
    for did in dup_ids:
        requests.delete(f"{URL}/rest/v1/categories?id=eq.{did}", headers=headers)

print("\n2. Deleting today's corrupted oliveyoung rankings...")
from datetime import datetime
today = datetime.now().strftime('%Y-%m-%d')
del_res = requests.delete(f"{URL}/rest/v1/daily_rankings_v2?source=eq.oliveyoung&date=eq.{today}", headers=headers)
print(f"Deleted today's data: Status {del_res.status_code}")
