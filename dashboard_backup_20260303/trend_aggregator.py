import os
import json
import requests
from collections import Counter
from datetime import datetime, timedelta
from dotenv import load_dotenv
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from generic_crawler.config import SUPABASE_URL, HEADERS

# ENV Setup
load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))

def fetch_recent_news_tags():
    """최근 48시간 내에 수집된 뉴스 기사의 태그(brand, ingredient, fashion_style)를 모두 가져옵니다."""
    two_days_ago = (datetime.now() - timedelta(days=2)).isoformat()
    
    try:
        res = requests.get(
            f"{SUPABASE_URL}/rest/v1/products_master",
            headers=HEADERS,
            params={
                "category": "eq.News",
                "created_at": f"gte.{two_days_ago}",
                "select": "tags"
            },
            timeout=30
        )
        res.raise_for_status()
        return res.json()
    except Exception as e:
        print(f"❌ DB 조회 실패: {e}")
        return []

STOPWORDS = {
    "화장품", "뷰티", "패션", "브랜드", "신제품", "출시", "프로모션", "이벤트", 
    "스킨케어", "메이크업", "아이템", "컬렉션", "캠페인", "트렌드", "스타일", "성분"
}

def is_valid_term(term):
    """불용어 필터링"""
    if not term or len(term) < 2:
        return False
    if term in STOPWORDS:
        return False
    return True

def aggregate_trends(records):
    """태그 배열을 순회하며 브랜드와 성분의 빈도수를 집계합니다."""
    brands = Counter()
    ingredients = Counter()
    styles = Counter()
    
    for record in records:
        tags = record.get("tags")
        if not tags or not isinstance(tags, dict):
            continue
            
        # 브랜드 집계 (콤마로 분리된 경우 처리)
        if "brand" in tags and isinstance(tags["brand"], str):
            b_list = [b.strip() for b in tags["brand"].split(",") if is_valid_term(b.strip().lower()) and b.strip().lower() != "null"]
            brands.update(b_list)
            
        # 성분 집계
        if "ingredient" in tags and isinstance(tags["ingredient"], str):
            i_list = [i.strip() for i in tags["ingredient"].split(",") if is_valid_term(i.strip().lower()) and i.strip().lower() != "null"]
            ingredients.update(i_list)
            
        # 패션 스타일 집계
        if "fashion_style" in tags and isinstance(tags["fashion_style"], str):
            s_list = [s.strip() for s in tags["fashion_style"].split(",") if is_valid_term(s.strip().lower()) and s.strip().lower() != "null"]
            styles.update(s_list)
            
    return brands, ingredients, styles

def save_daily_insight(brands, ingredients, styles, analyzed_count):
    """집계된 결과를 종합 인사이트 레코드로 DB에 저장합니다."""
    today_str = datetime.now().strftime("%Y-%m-%d")
    
    # 상위 5개씩만 추출
    top_brands = [f"{k}({v})" for k, v in brands.most_common(5)]
    top_ing = [f"{k}({v})" for k, v in ingredients.most_common(5)]
    top_styles = [f"{k}({v})" for k, v in styles.most_common(5)]
    
    insight_text = f"📰 최근 48시간 동안 {analyzed_count}개의 뷰티/패션 뉴스가 분석되었습니다.\n\n"
    if top_brands: insight_text += f"- **가장 핫한 브랜드**: {', '.join(top_brands)}\n"
    if top_ing: insight_text += f"- **주목받는 성분**: {', '.join(top_ing)}\n"
    if top_styles: insight_text += f"- **떠오르는 스타일**: {', '.join(top_styles)}"
    
    print(f"\n--- 오늘의 종합 분석 ---\n{insight_text}\n")
    
    record = {
        "product_id": f"daily_insight_{today_str}",
        "source": "AI_Aggregator",
        "name": f"{today_str} 뷰티/패션 종합 통계",
        "brand": "System",
        "price": 0,
        "image_url": "https://cdn-icons-png.flaticon.com/512/3076/3076332.png", # 통계 아이콘
        "url": "https://dashboard.local",
        "category": "Daily Insight",
        "ai_summary": {"insight": insight_text, "reason": "일일 뉴스 종합 데이터"},
        "tags": {"top_brands": dict(brands.most_common(5)), "top_ingredients": dict(ingredients.most_common(5))}
    }
    
    try:
        requests.post(
            f"{SUPABASE_URL}/rest/v1/products_master",
            headers={**HEADERS, "Prefer": "return=representation,resolution=merge-duplicates"},
            params={"on_conflict": "source,product_id"},
            json=record,
            timeout=10
        )
        print("✅ 일일 트렌드 요약 저장 완료.")
    except Exception as e:
        print(f"❌ 요약 저장 실패: {e}")

if __name__ == "__main__":
    print(f"[{datetime.now()}] 트렌드 종합 카운터 시작...")
    records = fetch_recent_news_tags()
    
    if not records:
        print("  ⚠️ 분석할 뉴스 태그가 없습니다.")
    else:
        print(f"  🔍 {len(records)}개의 뉴스 분석 데이터 발견.")
        b, i, s = aggregate_trends(records)
        save_daily_insight(b, i, s, len(records))
