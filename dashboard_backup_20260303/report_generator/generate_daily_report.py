from datetime import datetime, timedelta
from jinja2 import Environment, FileSystemLoader
from playwright.sync_api import sync_playwright
import requests
from dotenv import load_dotenv

# Add dashboard root to sys path for imports
dashboard_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(dashboard_dir)
import os
import sys
import json

# Load environment variables
load_dotenv(os.path.join(dashboard_dir, ".env"))

from generic_crawler.config import SUPABASE_URL, HEADERS
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "deepseek-r1:8b")
OLLAMA_URL = "http://localhost:11434/api/generate"

def get_latest_insight():
    """Fetch the latest Daily Insight from Supabase."""
    print("🔍 Fetching latest Daily Insight...")
    try:
        res = requests.get(
            f"{SUPABASE_URL}/rest/v1/products_master",
            headers=HEADERS,
            params={
                "category": "eq.Daily Insight",
                "order": "created_at.desc",
                "limit": 1
            }
        )
        res.raise_for_status()
        data = res.json()
        if data:
            return data[0]
        return None
    except Exception as e:
        print(f"❌ Failed to fetch Insight: {e}")
        return None

def get_recent_news():
    """Fetch recent news articles from Supabase."""
    print("📰 Fetching recent News...")
    two_days_ago = (datetime.now() - timedelta(days=2)).isoformat()
    try:
        res = requests.get(
            f"{SUPABASE_URL}/rest/v1/products_master",
            headers=HEADERS,
            params={
                "category": "eq.News",
                "created_at": f"gte.{two_days_ago}",
                "order": "created_at.desc",
                "limit": 5
            }
        )
        res.raise_for_status()
        return res.json()
    except Exception as e:
        print(f"❌ Failed to fetch News: {e}")
        return []

def generate_ai_editorial(insight_data, news_data):
    """Use Ollama to generate a polished editorial summary."""
    print(f"🤖 Generating AI Editorial Insight using {OLLAMA_MODEL}...")
    
    context = "Daily Beauty Insight Data:\n"
    if insight_data and "ai_summary" in insight_data:
        context += insight_data["ai_summary"].get("insight", "") + "\n\n"
        
    context += "Recent News:\n"
    for idx, news in enumerate(news_data):
        summary = news.get("ai_summary", {}).get("insight", news.get("name", ""))
        context += f"{idx+1}. [{news.get('brand', 'Unknown')}] {news.get('name', 'No title')} - {summary}\n"
        
    prompt = f"""
다음은 지난 24시간 동안 웹 스크래퍼가 수집한 뷰티/패션 업계 관련 데이터 및 뉴스 기사 요약본입니다.
당신은 뷰티/패션 트렌드 분석을 총괄하는 **"수석 데이터 에디터(Vogue 등 매거진 수석 에디터 수준의 전문성)"**입니다. 
이 데이터를 바탕으로, 바쁜 마케터나 쇼핑몰 실무자들이 오늘 하루 꼭 알아야 할 핵심 비즈니스 인사이트를 **3~4문장의 세련된 리포팅 형식(보고서 형식)**으로 작성해주세요. 

[명령 및 지침]
1. 모든 답변은 반드시 **완결된 한국어**로만 작성하세요. "跨境电商(직구)", "复古(레트로)", "怀旧(향수)" 등 중국어 한자 용어를 절대 사용하지 말고 한국어 표준 용어로 대체하세요.
2. 수집된 뉴스 중 "철학적 명언", "유명인 가십", "개인사", "단순 일기" 등 비즈니스 트렌드와 무관한 쓰레기 데이터가 섞여 있다면 **완벽하게 무시하고 배제**하세요.
3. 오직 "신제품 출시", "새로운 뷰티 성분", "패션 트렌드 변화", "시장 동향" 등 실무에 도움되는 **진짜 정보**만 선별하여 요약하세요.
4. 원본 텍스트를 그대로 복사하지 말고, 수렴적 사고를 통해 데이터가 의미하는 바(So What?)를 우아하고 전문적인 문장으로 도출하세요.
5. 분석할 만한 유효한 트렌드 데이터가 전혀 없다면, 내용을 지어내지 말고 "오늘은 특별히 주목할 만한 뷰티/패션 비즈니스 트렌드 이슈가 집계되지 않았습니다."라고만 작성하세요.

[수집된 데이터 전문]
{context}
"""
    try:
        payload = {
            "model": OLLAMA_MODEL,
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": 0.4
            }
        }
        res = requests.post(OLLAMA_URL, json=payload, timeout=300)
        res.raise_for_status()
        editorial = res.json().get("response", "").strip()
        
        # Clean up <think> tags if present in deepseek output
        import re
        editorial = re.sub(r'<think>.*?</think>', '', editorial, flags=re.DOTALL).strip()
        
        return editorial
    except Exception as e:
        print(f"⚠️ Ollama AI Generation Failed: {e}")
        return "AI 분석을 로드하는 중 일시적인 오류가 발생했습니다. 나중에 다시 시도해 주세요."

def render_html(ai_insight, keywords_data, news_data):
    """Render the Jinja2 HTML template."""
    print("🎨 Rendering HTML template...")
    env = Environment(loader=FileSystemLoader(os.path.dirname(__file__)))
    template = env.get_template('daily_template.html')
    
    # Format Keywords
    formatted_keywords = []
    if keywords_data and "tags" in keywords_data:
        top_brands = keywords_data["tags"].get("top_brands", {})
        top_ingredients = keywords_data["tags"].get("top_ingredients", {})
        
        for k, v in top_brands.items():
            formatted_keywords.append({
                "name": f"{k.upper()}",
                "rank_change": 0 # TODO: Calculate rank change in future phases
            })
            if len(formatted_keywords) >= 4: break
            
    # Format News: Filter out non-business news
    formatted_news = []
    for news in news_data:
        # Skip irrelevant news like daily philosophical quotes
        tags = news.get("tags", {})
        if tags and tags.get("trend_type") == "other":
            continue
            
        ai_summary = news.get("ai_summary", {}).get("insight")
        if not ai_summary or "실패" in ai_summary:
            continue
            
        formatted_news.append({
            "source": news.get("brand", "Beauty News"),
            "title": news.get("name", "No Title"),
            "ai_summary": ai_summary
        })
        
    html_content = template.render(
        report_date=datetime.now().strftime("%Y년 %m월 %d일"),
        ai_insight=ai_insight,
        keywords=formatted_keywords,
        news_list=formatted_news,
        abs=abs
    )
    
    html_path = os.path.join(os.path.dirname(__file__), "output_daily_report.html")
    with open(html_path, "w", encoding="utf-8") as f:
        f.write(html_content)
    
    print(f"✅ HTML Saved to {html_path}")
    return html_path

def generate_pdf(html_path):
    """Use Playwright to convert HTML to PDF."""
    print("📄 Converting HTML to PDF...")
    pdf_path = html_path.replace(".html", ".pdf")
    
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()
            # Construct absolute file explicitly for local HTML
            file_url = f"file://{os.path.abspath(html_path)}"
            page.goto(file_url, wait_until="networkidle")
            
            # Print to PDF
            page.pdf(
                path=pdf_path,
                format="A4",
                print_background=True,
                margin={"top": "10mm", "bottom": "10mm", "left": "10mm", "right": "10mm"}
            )
            browser.close()
        print(f"✅ PDF Saved to {pdf_path}")
        return pdf_path
    except Exception as e:
        print(f"❌ PDF Generation Failed: {e}")
        return None

def main():
    print(f"\n🚀 Starting Daily Report Generator: {datetime.now()}")
    insight_data = get_latest_insight()
    news_data = get_recent_news()
    
    ai_editorial = generate_ai_editorial(insight_data, news_data)
    
    html_path = render_html(ai_editorial, insight_data, news_data)
    pdf_path = generate_pdf(html_path)
    
    print("\n🎉 Report Generation Complete!")

if __name__ == "__main__":
    main()
