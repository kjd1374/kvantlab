import os
import json
import time
import requests
import re
from datetime import datetime
import google.generativeai as genai
from dotenv import load_dotenv

# 환경변수 로드
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env"))
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "deepseek-r1:8b")
OLLAMA_URL = "http://localhost:11434/api/generate"

# 기존 모델 파라미터 호환성을 위해 이름 유지하되 환경 변수 연동
MISTRAL_MODEL = OLLAMA_MODEL
QWEN_MODEL = OLLAMA_MODEL

PROMPT_TAGS = """
아래는 한국 이커머스 쇼핑 트렌드 검색어 하나입니다.
검색어를 분석해서 다음 JSON 형태로 정확하게 반환해주세요.

출력 형식:
{{
  "keyword": "원본 검색어",
  "brand": "브랜드명 (없으면 null)",
  "ingredient": "화장품 성분명 (없으면 null, 예: 히알루론산, 콜라겐, 레티놀, 나이아신아마이드, 세라마이드, 비타민C, PDRN)",
  "fashion_style": "패션 스타일/트렌드 (없으면 null, 예: 오버핏, 미니멀, 스트릿, 아이비룩, 카고룩, 테크웨어)",
  "product_type": "상품 분류 (예: 립스틱, 크림, 청바지, 스니커즈 등, 없으면 null)",
  "trend_type": "beauty | fashion | brand | other 중 하나"
}}

검색어: {keyword}

JSON만 반환하고 다른 설명은 하지 마세요.
"""

PROMPT_INSIGHT = """
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

PROMPT_ARTICLE_TAGS = """
아래는 화장품/패션 관련 뉴스 기사 본문입니다.
이 기사에서 언급된 핵심 브랜드, 성분, 특성을 분석해서 다음 JSON 형태로 정확하게 반환해주세요.

출력 형식:
{{
  "brand": "기사에 언급된 핵심 브랜드명 (없으면 null, 콤마로 다수 표기 가능)",
  "ingredient": "핵심 화장품 성분명 (없으면 null, 예: 콜라겐, 레티놀 등)",
  "fashion_style": "핵심 패션 아이템/스타일 (없으면 null, 예: 트위드 자켓, 올드머니룩 등)",
  "trend_type": "beauty | fashion | brand | other 중 하나"
}}

기사 제목: {title}
기사 내용: {content}

JSON만 반환하고 다른 설명은 하지 마세요.
"""

PROMPT_ARTICLE_SUMMARY = """
아래는 뉴스 기사 본문입니다. 이 기사의 핵심 내용을 한국어로 정확히 3줄로 요약해주세요.
결과는 JSON 구조를 사용하지 말고, 평문(텍스트)으로, 각 줄 앞에 '-' 기호를 붙여 3줄로만 출력하세요.

기사 제목: {title}
기사 내용: {content}
"""

def _call_ollama_json(prompt: str, model: str, timeout: int, is_json: bool = True, max_retries: int = 2):
    """Ollama API 통신, JSON 파싱 방어, 및 재시도(Retry) 함수"""
    for attempt in range(max_retries):
        try:
            payload = {
                "model": model,
                "prompt": prompt,
                "stream": False,
                "options": {
                    "temperature": 0.1
                }
            }
            if is_json:
                payload["format"] = "json"

            res = requests.post(OLLAMA_URL, json=payload, timeout=timeout)
            res.raise_for_status()
            text = res.json().get("response", "").strip()
            
            # Clean up <think> tags if present
            text = re.sub(r'<think>.*?</think>', '', text, flags=re.DOTALL).strip()
            
            # 일반 텍스트 요약인 경우 그대로 반환
            if not is_json:
                return text
                
            # JSON 포맷 방어 (백틱 떼어내기)
            if text.startswith("```json"):
                text = text.split("```json")[1].split("```")[0].strip()
            elif text.startswith("```"):
                text = text.split("```")[1].split("```")[0].strip()
                
            # 쓰레기 문자 필터링
            text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]', '', text)
                
            return json.loads(text, strict=False)
            
        except Exception as e:
            print(f"  ⚠️ Ollama API 통신/파싱 에러 (재시도 {attempt + 1}/{max_retries}): {e}")
            time.sleep(2)
            
    # 전체 실패 시 기본값 빈 객체/문자열 반환
    return {} if is_json else "분석에 실패했습니다."

def extract_tags(keyword: str) -> dict:
    """Mistral 7B를 사용하여 키워드 단건 태깅"""
    prompt = PROMPT_TAGS.format(keyword=keyword)
    parsed = _call_ollama_json(prompt, MISTRAL_MODEL, timeout=60, is_json=True)
    
    # 널(null) 필터링 추가
    if parsed:
        tags = {k: v for k, v in parsed.items() if v is not None and k != "keyword"}
        tags["enriched_at"] = datetime.now().isoformat()
        return tags
    return {}

def generate_insight(keyword: str, source: str) -> dict:
    """Qwen2.5 7B를 사용하여 키워드 트렌드 통찰력 요약"""
    prompt = PROMPT_INSIGHT.format(keyword=keyword, source=source)
    return _call_ollama_json(prompt, QWEN_MODEL, timeout=120, is_json=True)

def extract_article_tags(title: str, content: str) -> dict:
    """Mistral 7B를 사용하여 뉴스 기사 본문에서 태그(브랜드/성분) 추출"""
    short_content = content[:1500] if content else ""
    prompt = PROMPT_ARTICLE_TAGS.format(title=title, content=short_content)
    parsed = _call_ollama_json(prompt, MISTRAL_MODEL, timeout=90, is_json=True)
    
    if parsed:
        return {k: v for k, v in parsed.items() if v is not None}
    return {}

def summarize_article(title: str, content: str) -> str:
    """Qwen2.5 7B를 사용하여 뉴스 기사를 3줄 요약"""
    short_content = content[:2000] if content else ""
    prompt = PROMPT_ARTICLE_SUMMARY.format(title=title, content=short_content)
    return _call_ollama_json(prompt, QWEN_MODEL, timeout=120, is_json=False)
