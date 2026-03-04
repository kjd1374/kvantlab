import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()
supabase = create_client(os.environ.get("SUPABASE_URL"), os.environ.get("SUPABASE_SERVICE_ROLE_KEY"))

target_brands = ['COSRX', 'Round Lab', 'Anua', 'ANUA', 'Beauty of Joseon', 'Torriden', 'Mediheal', 'Romand', "romnd", 'Laneige', 'Amuse']
for brand in target_brands:
    res = supabase.table('products_master').select('product_id, name, brand').ilike('brand', f"%{brand}%").limit(2).execute()
    if res.data:
        print(f"YES '{brand}' -> brand='{res.data[0]['brand']}', name='{res.data[0]['name'][:50]}'")
    else:
        print(f"NO  '{brand}' -> No match in products_master")
