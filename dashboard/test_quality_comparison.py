import os
import json
import requests
import google.generativeai as genai
from dotenv import load_dotenv

# Load env
load_dotenv(".env")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "deepseek-r1:8b")
OLLAMA_URL = "http://localhost:11434/api/generate"

# Sample Context from a real scenario (mocked)
context_data = """
Daily Beauty Insight Data:
비건 뷰티 시장이 MZ세대를 중심으로 급성장하고 있으며, 특히 '지속 가능한 패키징'에 대한 소비자 요구가 강력해짐.

Recent News:
1. [올리브영] 2024년 상반기 스킨케어 키워드는 '저자극'과 '장벽 케어'. 관련 매출 전년 대비 35% 상승.
2. [아모레퍼시픽] 인공지능 기반 맞춤형 파운데이션 서비스 '커스텀 매치' 글로벌 런칭.
3. [무신사] 고프코어 룩 열풍이 지속되면서 기능성 아웃도어 브랜드들의 일상복 라인업 확장 추세.
4. [로레알] 신규 고기능성 성분 'PDRN'을 활용한 안티에이징 라인업 강화 발표.
"""

prompt = f"""
다음은 지난 24시간 동안 웹 스크래퍼가 수집한 뷰티/패션 업계 관련 데이터 및 뉴스 기사 요약본입니다.
당신은 뷰티/패션 트렌드 분석을 총괄하는 **"수석 데이터 에디터(Vogue 등 매거진 수석 에디터 수준의 전문성)"**입니다. 
이 데이터를 바탕으로, 바쁜 마케터나 쇼핑몰 실무자들이 오늘 하루 꼭 알아야 할 핵심 비즈니스 인사이트를 **3~4문장의 세련된 리포팅 형식(보고서 형식)**으로 작성해주세요. 

[명령 및 지침]
1. 수집된 뉴스 중 비즈니스 트렌드와 무관한 정보는 무시하세요.
2. 오직 "신제품 출시", "새로운 뷰티 성분", "패션 트렌드 변화", "시장 동향" 등 실무에 도움되는 **진짜 정보**만 선별하여 요약하세요.
3. 원본 텍스트를 그대로 복사하지 말고, 수렴적 사고를 통해 데이터가 의미하는 바(So What?)를 우아하고 전문적인 문장으로 도출하세요.

[수집된 데이터 전문]
{context_data}
"""

def call_gemini(prompt):
    if not GEMINI_API_KEY: return "Gemini Key missing"
    genai.configure(api_key=GEMINI_API_KEY)
    model = genai.GenerativeModel('gemini-3.0-flash-preview')
    try:
        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        return f"Gemini Error: {e}"

def call_ollama(prompt, model_name):
    try:
        payload = {
            "model": model_name,
            "prompt": prompt,
            "stream": False
        }
        res = requests.post(OLLAMA_URL, json=payload, timeout=120)
        res.raise_for_status()
        return res.json().get("response", "").strip()
    except Exception as e:
        return f"Ollama Error: {e}"

print("\n--- [1] Baseline: Gemini 3.0 Flash ---")
gemini_res = call_gemini(prompt)
print(gemini_res)

print(f"\n--- [2] Test: Local {OLLAMA_MODEL} ---")
ollama_res = call_ollama(prompt, OLLAMA_MODEL)
print(ollama_res)

# Compare JSON extraction (Tagging)
tag_prompt = f"""
Analyze the keyword "마녀공장 클렌징 오일" and return JSON:
{{ "brand": "string", "product_type": "string" }}
"""

print("\n--- [3] JSON Extraction Test (Local) ---")
json_res = call_ollama(tag_prompt, OLLAMA_MODEL)
print(json_res)
