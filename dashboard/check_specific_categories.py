import urllib.request
import json

KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhneGJsYmJqbG5zZmtmZnd2ZmFvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDA2NTY4NiwiZXhwIjoyMDc5NjQxNjg2fQ.SRxircIxDPE9Z8xElZzUFK_l9yOsjtKEoAnd7ILpKh8'

def check_category(cat_code, cat_name):
    url = f'https://hgxblbbjlnsfkffwvfao.supabase.co/rest/v1/products_master?platform=eq.oliveyoung&category=eq.{cat_code}&select=name,brand,rank&order=rank.asc&limit=5'
    req = urllib.request.Request(url)
    req.add_header('apikey', KEY)
    req.add_header('Authorization', 'Bearer ' + KEY)
    
    print(f"\n--- {cat_name} 카테고리 (Top 5) ---")
    try:
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode('utf-8'))
            if not data:
                print("데이터가 없습니다.")
            for item in data:
                print(f"{item['rank']}위: [{item['brand']}] {item['name']}")
    except Exception as e:
        print(f"Error: {e}")

check_category('10000010009', '마스크팩 (Mask Pack)')
check_category('10000010012', '네일 (Nail)')
