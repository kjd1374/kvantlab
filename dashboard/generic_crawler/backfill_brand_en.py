import os
import requests
import json
from dotenv import load_dotenv
from translate_helper import get_english_brand

# Load config
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env"))

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: SUPABASE_URL or SUPABASE_KEY not found.")
    exit(1)

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

def backfill_brands():
    print("Starting brand_en backfill for products_master...")
    
    # 1. Fetch all products where brand_en is null or empty, but brand is not empty
    # Supabase allows pagination or direct fetch
    # We'll fetch in batches of 1000
    limit = 1000
    offset = 0
    total_updated = 0
    
    while True:
        url = f"{SUPABASE_URL}/rest/v1/products_master?select=id,brand,brand_en&brand=not.is.null&brand=neq.&brand_en=is.null&limit={limit}&offset={offset}"
        
        try:
            res = requests.get(url, headers=HEADERS, timeout=30)
            res.raise_for_status()
            products = res.json()
            
            if not products:
                print("No more products to backfill.")
                break
                
            print(f"Fetched {len(products)} products to translate (offset: {offset}).")
            
            # 2. Extract unique Korean brands to translate in bulk safely
            unique_brands = list(set([p['brand'] for p in products if p['brand']]))
            
            # This relies on the _brand_cache population logic in translate_helper
            # For efficiency, we just call get_english_brand on each which internally caches
            
            updates = []
            for p in products:
                original_brand = p['brand']
                translated_brand = get_english_brand(original_brand) if original_brand else ""
                
                if translated_brand and translated_brand != original_brand:
                    # Collect updates
                    updates.append({
                        "id": p['id'],
                        "brand_en": translated_brand
                    })
                elif translated_brand == original_brand and original_brand.isascii():
                     # Already English but null in DB
                     updates.append({
                        "id": p['id'],
                        "brand_en": original_brand
                    })
                    
            # 3. Apply updates
            if updates:
                print(f"Applying {len(updates)} translations to DB...")
                # Unfortunately Supabase REST API doesn't have a simple bulk update for arbitrary rows without knowing IDs in a single query unless using a stored procedure or looping.
                # To be quick and safe, we can loop via PATCH requests if small, or use upsert if we select all fields.
                # Since we only have id and brand_en, we must PATCH row by row.
                
                for update in updates:
                    patch_url = f"{SUPABASE_URL}/rest/v1/products_master?id=eq.{update['id']}"
                    patch_res = requests.patch(
                        patch_url, 
                        headers=HEADERS, 
                        json={"brand_en": update['brand_en']},
                        timeout=5
                    )
                    
                    if patch_res.status_code in [200, 204]:
                        total_updated += 1
                    else:
                        print(f"Failed to update {update['id']}: {patch_res.text}")
            
            offset += limit
            
        except Exception as e:
            print(f"Error during backfill: {e}")
            break
            
    print(f"Backfill complete. Total rows updated: {total_updated}")

if __name__ == "__main__":
    backfill_brands()
