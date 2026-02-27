import os
import requests
from typing import Dict, List, Optional
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env"))
API_KEY = os.getenv("GOOGLE_TRANSLATE_API_KEY") or os.getenv("VITE_GOOGLE_TRANSLATE_API_KEY")

_brand_cache: Dict[str, str] = {}

def translate_brands(brands: List[str]) -> Dict[str, str]:
    """Translate a list of Korean brands to English using Google Translate API."""
    if not API_KEY:
        print("Warning: GOOGLE_TRANSLATE_API_KEY not found. Brand translation skipped.")
        return {b: b for b in brands}

    to_translate = [b for b in set(brands) if b and b not in _brand_cache and not b.isascii()]
    if not to_translate:
        return {b: _brand_cache.get(b, b) for b in brands}

    try:
        url = f"https://translation.googleapis.com/language/translate/v2?key={API_KEY}"
        payload = {
            "q": to_translate,
            "target": "en",
            "source": "ko",
            "format": "text"
        }
        res = requests.post(url, json=payload, timeout=10)
        res.raise_for_status()
        data = res.json()
        
        translations = data.get("data", {}).get("translations", [])
        for i, original in enumerate(to_translate):
            if i < len(translations):
                translated = translations[i].get("translatedText", original)
                _brand_cache[original] = translated
                
    except Exception as e:
        print(f"Error translating brands: {e}")
        
    return {b: _brand_cache.get(b, b) for b in brands}

def get_english_brand(brand_ko: str) -> str:
    """Translate a single Korean brand to English."""
    if not brand_ko:
        return ""
        
    # If the brand consists mostly of English characters, assume it's already English.
    # Otherwise, translate it and return.
    if brand_ko.isascii() and any(c.isalpha() for c in brand_ko):
        return brand_ko
        
    res = translate_brands([brand_ko])
    return res.get(brand_ko, brand_ko)
