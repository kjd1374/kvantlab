import urllib.request
import json
import traceback

KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhneGJsYmJqbG5zZmtmZnd2ZmFvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDA2NTY4NiwiZXhwIjoyMDc5NjQxNjg2fQ.SRxircIxDPE9Z8xElZzUFK_l9yOsjtKEoAnd7ILpKh8'

def check_category(cat_code, cat_name):
    # Query daily_rankings_v2 to get product_ids
    url = f'https://hgxblbbjlnsfkffwvfao.supabase.co/rest/v1/daily_rankings_v2?source=eq.oliveyoung&category_code=eq.{cat_code}&select=product_id,rank&order=rank.asc&limit=5'
    req = urllib.request.Request(url)
    req.add_header('apikey', KEY)
    req.add_header('Authorization', 'Bearer ' + KEY)
    
    print(f"\n--- {cat_name} 카테고리 (Top 5) ---")
    try:
        with urllib.request.urlopen(req) as response:
            rankings = json.loads(response.read().decode('utf-8'))
            if not rankings:
                print("데이터가 없습니다.")
                return
            
            pids = ",".join([f'"{r["product_id"]}"' for r in rankings])
            print("Rankings IDs:", [r["product_id"] for r in rankings])
            
            # Fetch product details from ranking_products_v2
            p_url = f'https://hgxblbbjlnsfkffwvfao.supabase.co/rest/v1/ranking_products_v2?product_id=in.({pids})&select=product_id,name,brand'
            p_req = urllib.request.Request(p_url)
            p_req.add_header('apikey', KEY)
            p_req.add_header('Authorization', 'Bearer ' + KEY)
            
            with urllib.request.urlopen(p_req) as p_response:
                products = json.loads(p_response.read().decode('utf-8'))
                print("Products matching IDs:", products)
                p_dict = {p['product_id']: p for p in products}
                
                for r in rankings:
                    p = p_dict.get(str(r['product_id']), {}) # Try string conversion if needed
                    brand = p.get('brand', 'Unknown')
                    name = p.get('name', 'Unknown')
                    print(f"{r['rank']}위: [{brand}] {name}")
                    
    except Exception as e:
        print(f"Error fetching {cat_name}: {e}")
        traceback.print_exc()

if __name__ == '__main__':
    check_category('10000010009', '마스크팩 (Mask Pack)')
