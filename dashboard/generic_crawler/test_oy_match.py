import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
supabase: Client = create_client(url, key)

res = supabase.table('global_shopping_trends').select('*').execute()
trends = res.data

print(f"Found {len(trends)} global trends")

match_count = 0
for t in trends:
    brand = t.get('brand_name', '')
    name = t.get('product_name', '')
    if not brand or not name:
        continue
    
    # Try searching Olive Young products master
    # We'll use ilike for simple matching
    try:
        search_res = supabase.table('products_master').select('product_id, name, brand, price, currency, review_rating').ilike('brand', f"%{brand}%").ilike('name', f"%{name.split()[0]}%").limit(1).execute()
        if search_res.data:
            oy = search_res.data[0]
            print(f"✅ MATCH: [{t['country_code']}] {brand} {name} -> OY: {oy['brand']} {oy['name']} ({oy['price']}{oy['currency']})")
            match_count += 1
        else:
            print(f"❌ NO MATCH: [{t['country_code']}] {brand} {name}")
    except Exception as e:
        print(f"Error matching {brand} {name}: {e}")

print(f"Matched {match_count} out of {len(trends)} products")
