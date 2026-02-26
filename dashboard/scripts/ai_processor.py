import os
import json
import asyncio
import requests
from datetime import datetime
from dotenv import load_dotenv
# Native Python Packages Only

# Load environment variables
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env"))

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "deepseek-r1:8b")
OLLAMA_URL = "http://localhost:11434/api/generate"

if not all([SUPABASE_URL, SUPABASE_KEY]):
    print("Error: Missing required environment variables (SUPABASE_URL, SUPABASE_KEY).")
    exit(1)

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
}

async def analyze_product(product):
    """Analyze a standard product for pros/cons."""
    name = product.get("name", "Unknown Product")
    brand = product.get("brand", "")
    source = product.get("source", "")
    
    prompt = f"""
    Analyze the following product from {source}:
    Product Name: {name}
    Brand: {brand}
    
    Provide a summary in JSON format with exactly these fields:
    {{
      "pros": ["pro1", "pro2", "pro3"],
      "cons": ["con1", "con2", "con3"],
      "keywords": ["key1", "key2", ...],
      "sentiment_pos": (integer 0-100)
    }}
    Be concise and use Korean for the content. Do not include markdown or extra text.
    """
    
    try:
        payload = {
            "model": OLLAMA_MODEL,
            "prompt": prompt,
            "stream": False
        }
        res = requests.post(OLLAMA_URL, json=payload, timeout=300)
        res.raise_for_status()
        text = res.json().get("response", "").strip()
        if text.startswith("```json"):
            text = text.split("```json")[1].split("```")[0].strip()
        elif text.startswith("```"):
            text = text.split("```")[1].split("```")[0].strip()
        return json.loads(text)
    except Exception as e:
        print(f"  ❌ AI Analysis failed for {name}: {e}")
        return None

async def analyze_trend(keyword_item):
    """Analyze a trend keyword for insights."""
    keyword = keyword_item.get("name", "")
    source = keyword_item.get("source", "")
    
    prompt = f"""
    Analyze the following search trend from {source}:
    Keyword: {keyword}
    
    Provide a trend insight in JSON format with exactly these fields:
    {{
      "reason": "Why is this trending now?",
      "insight": "What should sellers focus on regarding this trend?",
      "target": "Who is the primary audience?",
      "slogan": "A catchy marketing slogan for this trend"
    }}
    Be concise and use Korean for the content. Do not include markdown or extra text.
    """
    
    try:
        payload = {
            "model": OLLAMA_MODEL,
            "prompt": prompt,
            "stream": False
        }
        res = requests.post(OLLAMA_URL, json=payload, timeout=300)
        res.raise_for_status()
        text = res.json().get("response", "").strip()
        if text.startswith("```json"):
            text = text.split("```json")[1].split("```")[0].strip()
        elif text.startswith("```"):
            text = text.split("```")[1].split("```")[0].strip()
        return json.loads(text)
    except Exception as e:
        print(f"  ❌ AI Analysis failed for trend {keyword}: {e}")
        return None

async def process_batch():
    print(f"[{datetime.now()}] AI 분석 프로세스 시작...")
    
    # ai_summary가 없는 최신 50개 상품 가져오기
    # source가 google_trends, naver_datalab인 것과 일반 상품 구분 필요
    try:
        res = requests.get(
            f"{SUPABASE_URL}/rest/v1/products_master",
            headers=HEADERS,
            params={
                "ai_summary": "is.null",
                "order": "created_at.desc",
                "limit": "50"
            },
            timeout=30
        )
        products = res.json()
        
        print(f"  🔍 분석할 데이터 {len(products)}건 발견")
        
        processed = 0
        for p in products:
            source = p.get("source", "")
            if source in ["google_trends", "naver_datalab"]:
                summary = await analyze_trend(p)
            else:
                summary = await analyze_product(p)
            
            if summary:
                update_res = requests.patch(
                    f"{SUPABASE_URL}/rest/v1/products_master",
                    headers=HEADERS,
                    params={"id": "eq." + str(p["id"])},
                    json={"ai_summary": summary},
                    timeout=30
                )
                if update_res.status_code in [200, 204]:
                    processed += 1
                    print(f"  ✅ 분석 완료 ({processed}/{len(products)}): {p.get('name')}")
                else:
                    print(f"  ❌ DB 업데이트 실패: {p.get('name')} - {update_res.text}")
            
            # Rate limiting / API courtesy
            await asyncio.sleep(1)
            
        print(f"[{datetime.now()}] AI 분석 완료 (총 {processed}건)")
        
    except Exception as e:
        print(f"  ❌ 프로세스 예외 발생: {e}")

if __name__ == "__main__":
    asyncio.run(process_batch())
