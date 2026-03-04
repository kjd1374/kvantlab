import os
import json
import asyncio
from typing import List, Dict, Any
from dotenv import load_dotenv
from supabase import create_client, Client
import google.generativeai as genai

# Load environment variables
load_dotenv()

# Configuration
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://hgxblbbjlnsfkffwvfao.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# Initialize clients
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel('gemini-1.5-flash')

async def stage_1_extract_trends(input_text: str) -> Dict[str, Any]:
    """
    Stage 1: Trend Analyzer
    Extracts core trends and keywords from input text.
    """
    prompt = f"""
너는 한국의 뷰티, 패션, 라이프스타일 트렌드를 분석하여 동남아시아 셀러들에게 공급할 최적의 인사이트를 제공하는 전문 분석가야.

아래 제공되는 [텍스트 데이터]를 읽고 다음 항목을 JSON 형식으로 추출해줘:
1. 핵심 트렌드 키워드 (Trend_Keyword)
2. 주목해야 할 핵심 성분 또는 스타일 (Key_Elements): 배열 형식
3. 이 트렌드가 유행하는 이유 (Reason)
4. 주요 타겟 연령층 및 성별 (Target_Audience)
5. 셀러들이 이 트렌드를 홍보할 때 사용할 핵심 슬로건 (Slogan)

[텍스트 데이터]:
{input_text}

응답은 반드시 다른 설명 없이 JSON 코드 블록만 출력해줘. JSON 키는 반드시 위에 명시된 영어 이름을 사용해줘.
    """
    
    response = model.generate_content(prompt)
    try:
        # Extract JSON from response
        text = response.text.strip()
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0].strip()
        elif "```" in text:
            text = text.split("```")[1].split("```")[0].strip()
        
        return json.loads(text)
    except Exception as e:
        print(f"Error in Stage 1: {e}")
        return {}

async def stage_2_match_products(trends: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Stage 2: The Matcher
    Matches extracted trends with products using semantic search.
    """
    keyword = trends.get("Trend_Keyword", "")
    elements = ", ".join(trends.get("Key_Elements", []))
    search_query = f"{keyword} {elements}"
    
    # Use RPC for semantic search (if available/implemented as per migration 007)
    # Falling back to name-based match if needed
    try:
        # Match products using vector similarity via RPC
        # Need to generate embedding first for the search_query
        # For simplicity in this script, we'll try to use the match_products RPC 
        # but since generating embeddings requires another call, we'll use a combined approach.
        
        # 1. Keyword search as fallback/supplement
        res = supabase.table("products_master").select("*").or_(f"name.ilike.%{keyword}%,brand.ilike.%{keyword}%").limit(10).execute()
        potential_products = res.data
        
        # 2. Use LLM to score and select top 5
        product_list_str = "\n".join([f"- ID: {p['id']}, Name: {p['name']}, Brand: {p['brand']}, Price: {p['price']}" for p in potential_products])
        
        prompt = f"""
너는 상품 데이터베이스 관리자야. 주어진 [트렌드 키워드]와 [상품 리스트]를 비교해서, 해당 트렌드에 가장 적합한 상품 5개를 선정해줘.

[트렌드 키워드]: {keyword}, {elements}

[상품 리스트]:
{product_list_str}

분석 기준:
1. 상품명이나 설명에 트렌드 키워드가 직접 포함되어 있는가?
2. 키워드가 없더라도 상품의 효능이나 스타일이 트렌드와 의미적으로 일치하는가?

출력 형식 (반드시 JSON 배열로 출력):
[
  {{
    "product_id": (ID),
    "match_score": (1-100),
    "match_reason": "셀러가 납득할 수 있는 근거"
  }},
  ...
]
응답은 다른 메시지 없이 JSON만 출력해줘.
        """
        
        response = model.generate_content(prompt)
        text = response.text.strip()
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0].strip()
        elif "```" in text:
            text = text.split("```")[1].split("```")[0].strip()
            
        matches = json.loads(text)
        
        # Supplement match data with product details
        for m in matches:
            p_details = next((p for p in potential_products if p['id'] == m['product_id']), {})
            m.update(p_details)
            
        return matches
    except Exception as e:
        print(f"Error in Stage 2: {e}")
        return []

async def stage_3_generate_marketing(match: Dict[str, Any], trends: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Stage 3: The Marketer
    Generates localized marketing copy.
    """
    product_info = f"Product: {match.get('name')}, Brand: {match.get('brand')}"
    trend_info = f"Trend: {trends.get('Trend_Keyword')}, Slogan: {trends.get('Slogan')}"
    
    prompt = f"""
너는 동남아시아(베트남, 태국) 시장을 꿰뚫고 있는 글로벌 마케팅 전문가야. 
현재 한국에서 유행하는 트렌드와 상품 정보를 바탕으로 현지 셀러들이 고객에게 바로 발송할 수 있는 홍보 문구를 작성해줘.

[상품 정보]: {product_info}
[현재 한국 트렌드]: {trend_info}

요구사항:
1. 타겟 국가: 베트남, 태국 (각 국가별 언어로 작성) 및 한국어 번역본
2. 톤앤매너: 친근하면서도 전문적인 느낌 (이모지 적극 활용)
3. 구성:
   - 눈길을 사로잡는 헤드라인
   - 한국 내 인기 증거 (예: 올리브영 랭킹 1위 등)
   - 이 상품을 꼭 사야 하는 이유 3가지
   - 마지막에 "한국 직배송 정품"임을 강조

응답 형식 (JSON 배열):
[
  {{
    "language_code": "vi",
    "headline": "...",
    "popularity_proof": "...",
    "key_reasons": ["...", "...", "..."],
    "content_body": "전체 문구"
  }},
  {{
    "language_code": "th",
    "headline": "...",
    "popularity_proof": "...",
    "key_reasons": ["...", "...", "..."],
    "content_body": "전체 문구"
  }},
  {{
    "language_code": "ko",
    "headline": "...",
    "popularity_proof": "...",
    "key_reasons": ["...", "...", "..."],
    "content_body": "전체 문구"
  }}
]
응답은 JSON만 출력해줘.
    """
    
    response = model.generate_content(prompt)
    try:
        text = response.text.strip()
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0].strip()
        elif "```" in text:
            text = text.split("```")[1].split("```")[0].strip()
        return json.loads(text)
    except Exception as e:
        print(f"Error in Stage 3: {e}")
        return []

async def run_full_workflow(input_text: str, user_id: str = None):
    """
    Orchestrates the full 3-stage workflow and saves results to DB.
    """
    print("🚀 Starting Trend Analysis Workflow...")
    
    # 0. Initialize run in DB
    run_res = supabase.table("trend_analysis_runs").insert({
        "input_text": input_text,
        "user_id": user_id,
        "status": "processing"
    }).execute()
    run_id = run_res.data[0]["id"]
    
    try:
        # 1. Stage 1: Extraction
        print("Stage 1: Extracting Trends...")
        trends = await stage_1_extract_trends(input_text)
        
        extracted_trend_res = supabase.table("extracted_trends").insert({
            "run_id": run_id,
            "trend_keyword": trends.get("Trend_Keyword"),
            "key_elements": trends.get("Key_Elements"),
            "reason": trends.get("Reason"),
            "target_audience": trends.get("Target_Audience"),
            "slogan": trends.get("Slogan"),
            "raw_json": trends
        }).execute()
        trend_db_id = extracted_trend_res.data[0]["id"]
        
        # 2. Stage 2: Matching
        print("Stage 2: Matching Products...")
        matches = await stage_2_match_products(trends)
        
        for idx, match in enumerate(matches):
            match_res = supabase.table("trend_product_matches").insert({
                "run_id": run_id,
                "trend_id": trend_db_id,
                "product_id": match.get("product_id"),
                "match_score": match.get("match_score"),
                "match_reason": match.get("match_reason"),
                "rank_in_run": idx + 1
            }).execute()
            match_db_id = match_res.data[0]["id"]
            
            # 3. Stage 3: Marketing
            print(f"Stage 3: Generating Marketing for Product {idx+1}...")
            marketing_contents = await stage_3_generate_marketing(match, trends)
            
            for content in marketing_contents:
                supabase.table("marketing_contents").insert({
                    "run_id": run_id,
                    "match_id": match_db_id,
                    "language_code": content.get("language_code"),
                    "headline": content.get("headline"),
                    "popularity_proof": content.get("popularity_proof"),
                    "key_reasons": content.get("key_reasons"),
                    "content_body": content.get("content_body")
                }).execute()
        
        # Update status
        supabase.table("trend_analysis_runs").update({"status": "completed"}).eq("id", run_id).execute()
        print(f"✅ Workflow completed successfully! Run ID: {run_id}")
        return run_id
        
    except Exception as e:
        print(f"❌ Workflow failed: {e}")
        supabase.table("trend_analysis_runs").update({"status": "failed"}).eq("id", run_id).execute()
        raise e

# Example execution
if __name__ == "__main__":
    sample_text = """
최근 한국에서는 PDRN(연어 주사 성분)을 활용한 홈케어 화장품이 폭발적인 인기를 끌고 있습니다. 
특히 3040 세대를 중심으로 고기능성 안티에이징에 대한 관심이 높아지면서, 피부과 시술의 효과를 집에서 누릴 수 있는 
'스피큘'과 'PDRN' 결합 상품들이 올리브영 랭킹 상위권을 점유하고 있습니다. 
무신사 뷰티에서도 남성들을 위한 고기능성 올인원 제품들이 트렌드로 떠오르고 있습니다.
    """
    asyncio.run(run_full_workflow(sample_text))
