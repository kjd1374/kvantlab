import os
import sys
import json
import time
import requests
import urllib.parse
from datetime import datetime
from dotenv import load_dotenv
from supabase import create_client, Client
from bs4 import BeautifulSoup
import sys

# Add parent directory to path to import notifier
parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(parent_dir)
from notifier import send_error_notification
# Load environment variables
load_dotenv()

# Configuration
YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY")
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://hgxblbbjlnsfkffwvfao.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")
OLLAMA_API_URL = "http://localhost:11434/api/generate"
MODEL_NAME = os.getenv("OLLAMA_MODEL", "deepseek-r1:8b")

if not SUPABASE_KEY:
    print("Error: SUPABASE_KEY is missing from environment.")
    sys.exit(1)

# Initialize Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Search configurations by country
SEARCH_CONFIGS = [
    {
        "country": "VN",
        "lang": "vi",
        "queries": [
            "Mỹ phẩm Hàn Quốc Olive Young", # Korean cosmetics Olive Young
            "Danh sách mua sắm Olive Young Hàn Quốc", # Olive Young Korea shopping list
            "Review mỹ phẩm Hàn Quốc 2026" # Korean cosmetics review 2026
        ]
    },
    {
        "country": "TH",
        "lang": "th",
        "queries": [
            "เครื่องสำอางเกาหลี Olive Young", # Korean cosmetics Olive Young
            "ช้อปปิ้ง Olive Young เกาหลี", # Olive Young Korea shopping
            "รีวิวเครื่องสำอางเกาหลี 2026" # Korean cosmetics review 2026
        ]
    },
    {
        "country": "PH",
        "lang": "en",
        "queries": [
            "Korean cosmetics Olive Young Philippines",
            "Olive Young Korea shopping list",
            "Korean skincare review 2026 Philippines"
        ]
    },
    {
        "country": "MY",
        "lang": "en",
        "queries": [
            "Korean cosmetics Olive Young Malaysia",
            "Olive Young Korea shopping list Malaysia",
            "Korean skincare review 2026 Malaysia"
        ]
    }
]

def search_youtube(query: str, lang: str, max_results=10):
    """Search YouTube for videos matching the query."""
    if not YOUTUBE_API_KEY:
        print("Warning: YOUTUBE_API_KEY is not set. Using mock data for demonstration.")
        return get_mock_youtube_data(query, lang)

    print(f"[{datetime.now().strftime('%H:%M:%S')}] Searching YouTube for: '{query}'")
    url = f"https://www.googleapis.com/youtube/v3/search?part=snippet&q={urllib.parse.quote(query)}&type=video&relevanceLanguage={lang}&maxResults={max_results}&key={YOUTUBE_API_KEY}"
    
    try:
        response = requests.get(url)
        response.raise_for_status()
        data = response.json()
        
        videos = []
        for item in data.get('items', []):
            video_id = item['id']['videoId']
            videos.append({
                'video_id': video_id,
                'title': item['snippet']['title'],
                'description': item['snippet']['description'],
                'url': f"https://www.youtube.com/watch?v={video_id}"
            })
        return videos
    except Exception as e:
        print(f"Error fetching YouTube data: {e}")
        return []

def get_mock_youtube_data(query: str, lang: str):
    """Provides mock data if YouTube API key is missing, to allow pipeline testing."""
    if lang == 'vi':
        return [
            {
                'video_id': 'mock_vn_1',
                'title': 'TOP 10 Mỹ phẩm Hàn Quốc MUA LÀ PHẢI MUA ở Olive Young',
                'description': '1. COSRX Snail Mucin 96 Essence - [Skincare] dưỡng ẩm cực tốt, 2. Round Lab Birch Juice Sunscreen - [Skincare] kem chống nắng, 3. Amuse Dew Tint - [Makeup] son tint đẹp.',
                'url': 'https://www.youtube.com/watch?v=mock_vn_1'
            }
        ]
    elif lang == 'th':
        return [
     {
                'video_id': 'mock_th_1',
                'title': 'พาส่อง 5 สกินแคร์เกาหลีตัวเด็ดใน Olive Young 2026',
                'description': '1. Beauty of Joseon Sun Rice Probiotics - [Skincare] กันแดด, 2. Rom&nd Juicy Lasting Tint - [Makeup] ลิปสติกยอดฮิต',
                'url': 'https://www.youtube.com/watch?v=mock_th_1'
            }
        ]
    elif lang == 'en':
        if "Philippines" in query or "shopping list" in query:
            return [
                 {
                    'video_id': 'mock_ph_1',
                    'title': 'Top 5 Korean Skincare Must Haves from Olive Young 2026 (Philippines)',
                    'description': '1. COSRX Snail Mucin 96 Essence - [Skincare] hydrating, 2. Skin1004 Madagascar Centella Ampoule - [Skincare] soothing',
                    'url': 'https://www.youtube.com/watch?v=mock_ph_1'
                }
            ]
        elif "Malaysia" in query:
            return [
                 {
                    'video_id': 'mock_my_1',
                    'title': 'Best K-Beauty Finds from Olive Young for Malaysia Weather 2026',
                    'description': '1. Torriden Dive In Serum - [Skincare] hydrating, 2. Laneige Neo Cushion - [Makeup] matte finish',
                    'url': 'https://www.youtube.com/watch?v=mock_my_1'
                }
            ]
    return []

def get_mock_google_data(query: str, lang: str):
    """Provides mock web search results."""
    return [
        {
            'title': 'The best Korean skincare for 2026 - Global Trends',
            'description': 'Many bloggers mention ANUA Heartleaf 77 Toner as the #1 Skincare product in Southeast Asia.',
            'url': 'https://blog.example.com/k-beauty-trends'
        }
    ]

def get_google_image(query):
    """Scrapes the first image thumbnail from Google Images."""
    url = f"https://www.google.com/search?tbm=isch&q={urllib.parse.quote(query)}"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }
    try:
        r = requests.get(url, headers=headers, timeout=5)
        soup = BeautifulSoup(r.text, 'html.parser')
        for img in soup.find_all('img'):
            src = img.get('src')
            if src and src.startswith('http') and ('gstatic' in src or 'encrypted' in src):
                return src
    except Exception as e:
        print(f"Image search error for {query}: {e}")
    return ""

def get_video_captions(video_id: str):
    """
    Placeholder for extracting YouTube captions (transcript).
    In a fully functional production bot, you would use youtube-transcript-api library here.
    """
    return ""

import ollama
from pydantic import BaseModel
from typing import List

class ProductMention(BaseModel):
    product_name: str
    brand_name: str
    main_category: str
    key_benefits: List[str]

class ProductExtraction(BaseModel):
    products: List[ProductMention]

def prompt_local_llm(text: str, country: str) -> list:
    """Send text to local DeepSeek R1 to extract product lists using Structured Outputs."""
    
    prompt = f"""
Analyze the following media text about Korean cosmetics/shopping lists from {country}.
Extract all specific individual product names mentioned.
For each product, identify its brand, the primary category (e.g., Skincare, Makeup, Haircare), and list key benefits (e.g., Moisturizing, Acne care, Whitening) mentioned or implied.

Text context:
{text}
"""
    print(f"[{datetime.now().strftime('%H:%M:%S')}] Asking Local LLM ({MODEL_NAME}) to extract products using Structured JSON...")
    
    try:
        start_time = time.time()
        
        response = ollama.chat(
            model=MODEL_NAME,
            messages=[
                {"role": "user", "content": prompt}
            ],
            format=ProductExtraction.model_json_schema(),
            options={"temperature": 0.0}
        )
        
        print(f"[{datetime.now().strftime('%H:%M:%S')}] LLM replied in {time.time() - start_time:.1f}s")
        
        response_text = response['message']['content']
        
        # Parse Pydantic response
        try:
             parsed_data = ProductExtraction.model_validate_json(response_text)
             # Convert back to standard dict list for the DB upsert logic
             result_list = []
             for prod in parsed_data.products:
                 result_list.append({
                     "product_name": prod.product_name,
                     "brand_name": prod.brand_name,
                     "main_category": prod.main_category,
                     "key_benefits": prod.key_benefits
                 })
             return result_list
        except Exception as parse_e:
             print(f"Failed to validate rigid JSON structure: {parse_e}")
             print(f"Raw Output: {response_text[:200]}")
             return []
             
    except Exception as e:
        print(f"Error communicating with local ollama library: {e}")
        return []


def upsert_trends_to_db(extracted_products: list, country_code: str, source_url: str, source_type: str = 'youtube'):
    """Aggregate mention counts and upsert to Supabase global_shopping_trends table."""
    if not extracted_products:
        return

    # Count frequencies locally before sending to DB
    product_map = {}
    for p in extracted_products:
        if not isinstance(p, dict):
            print(f"Skipping invalid product parsing format: {p}")
            continue
            
        name = p.get('product_name', '').strip()
        brand = p.get('brand_name', '').strip()
        if not name or name.lower() in ['unknown', 'n/a']:
            continue
            
        key = name.lower()
        if key not in product_map:
            product_map[key] = {
                'country_code': country_code,
                'main_category': p.get('main_category', 'Others'),
                'product_name': name,
                'brand_name': brand,
                'mention_count': 1,
                'key_benefits': p.get('key_benefits', []),
                'data_sources': [source_url],
                'source_type': source_type
            }
        else:
            product_map[key]['mention_count'] += 1
            # Merge benefits & sources
            product_map[key]['key_benefits'] = list(set(product_map[key]['key_benefits'] + p.get('key_benefits', [])))
            if source_url not in product_map[key]['data_sources']:
                product_map[key]['data_sources'].append(source_url)
                
    # Upsert to Supabase
    for key, data in product_map.items():
        # Fetch product image
        query = f"{data['brand_name']} {data['product_name']}".strip()
        img_url = get_google_image(query)
        if img_url:
            data['data_sources'].append(f"IMG::{img_url}")

        try:
            # Check if exists
            current = supabase.table('global_shopping_trends').select('*').eq('country_code', country_code).ilike('product_name', data['product_name']).execute()
            
            # Prepare data without the missing source_type column
            db_data = data.copy()
            source_info = db_data.pop('source_type', 'youtube') # Get it but don't send to DB column
            
            if current.data and len(current.data) > 0:
                # Update existing row
                existing = current.data[0]
                new_count = existing['mention_count'] + db_data['mention_count']
                
                # Merge benefits and sources from DB with new data
                merged_benefits = list(set(existing.get('key_benefits', []) + db_data['key_benefits']))
                # In data_sources, we store the URL. We can append metadata if needed, 
                # but for now we'll just store the URL and dedup.
                merged_sources = list(set(existing.get('data_sources', []) + db_data['data_sources']))
                
                supabase.table('global_shopping_trends').update({
                    'mention_count': new_count,
                    'key_benefits': merged_benefits,
                    'data_sources': merged_sources,
                    'updated_at': datetime.now().isoformat()
                }).eq('id', existing['id']).execute()
                print(f"  -> Merged & Updated: [{country_code}] {db_data['product_name']} (Mentions: {new_count})")
            else:
                # Insert new row
                supabase.table('global_shopping_trends').insert(db_data).execute()
                print(f"  -> Inserted New: [{country_code}] {db_data['product_name']}")
                
        except Exception as e:
            print(f"  -> Error upserting {data['product_name']}: {e}")

def run_pipeline():
    print(f"=== Starting Global Shopping Trend Miner Pipeline ===")
    
    for config in SEARCH_CONFIGS:
        country_code = config['country']
        lang = config['lang']
        print(f"\n--- Processing Country: {country_code} ({lang}) ---")
        
        for query in config['queries']:
            # A. Search YouTube
            videos = search_youtube(query, lang, max_results=3)
            for video in videos:
                full_text = f"Title: {video['title']}\nDescription: {video['description']}"
                print(f"Analyzing YouTube Video: {video['title'][:50]}...")
                extracted_products = prompt_local_llm(full_text, country_code)
                if extracted_products:
                    upsert_trends_to_db(extracted_products, country_code, video['url'], source_type='youtube')

            # B. Search Google (Simulated)
            print(f"[{datetime.now().strftime('%H:%M:%S')}] Searching Google for: '{query}'")
            articles = get_mock_google_data(query, lang)
            for art in articles:
                full_text = f"Title: {art['title']}\nDescription: {art['description']}"
                print(f"Analyzing Google Article: {art['title'][:50]}...")
                extracted_products = prompt_local_llm(full_text, country_code)
                if extracted_products:
                    upsert_trends_to_db(extracted_products, country_code, art['url'], source_type='google')
                    
            # Small delay between queries to avoid rate limits
            time.sleep(1)
            
    print("\n=== Pipeline Execution Completed ===")

def run_pipeline_with_retries(max_retries=3):
    attempt = 0
    success = False
    last_error = ""

    while attempt < max_retries and not success:
        attempt += 1
        print(f"\n\u21bb Global Trend Miner Attempt {attempt}/{max_retries}")
        try:
            run_pipeline()
            success = True
        except Exception as e:
            last_error = str(e)
            print(f"\u274c Error on attempt {attempt}: {e}")
            time.sleep(10 * attempt)

    if not success:
        print(f"\u274c Global Trend Miner FAILED after {max_retries} attempts.")
        send_error_notification(
            subject="Global Trend Miner Failed (Ollama/API)",
            message=f"The miner failed after {max_retries} attempts.\nLast error:\n{last_error}\nCheck if Ollama ({MODEL_NAME}) is running normally."
        )

if __name__ == "__main__":
    run_pipeline_with_retries()
