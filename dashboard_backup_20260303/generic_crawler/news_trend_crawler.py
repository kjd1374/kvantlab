import os
import asyncio
import requests
from bs4 import BeautifulSoup
from datetime import datetime
from dotenv import load_dotenv
import urllib.parse
from playwright.async_api import async_playwright
import local_ai_helper as ai
from config import SUPABASE_URL, HEADERS

# ENV Setup
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env"))

CATEGORY = "News"

# RSS가 모두 막혀있어 전부 웹 크롤링 방식으로 재작성
WEB_SOURCES = [
    {
        "id": "apparelnews", 
        "name": "어패럴뉴스", 
        "url": "http://www.apparelnews.co.kr/news/news_list.php?mcode=m022vw10",
        "base_url": "http://www.apparelnews.co.kr",
        "link_keyword": "/news/news_view.php"
    },
    {
        "id": "cosinkorea", 
        "name": "코스인코리아", 
        "url": "http://www.cosinkorea.com/news/articleList.html?sc_section_code=S1N1",
        "base_url": "http://www.cosinkorea.com",
        "link_keyword": "/news/article.html?no="
    },
    {
        "id": "beautynury", 
        "name": "뷰티누리", 
        "url": "http://www.beautynury.com/news/list/001002008",
        "base_url": "http://www.beautynury.com",
        "link_keyword": "/news/view/"
    },
    {
        "id": "fashionbiz", 
        "name": "패션비즈", 
        "url": "http://www.fashionbiz.co.kr/main/",
        "base_url": "http://www.fashionbiz.co.kr",
        "link_keyword": "article.asp?idx="
    },
    {
        "id": "wkorea", 
        "name": "더블유코리아", 
        "url": "https://www.wkorea.com/category/fashion/",
        "base_url": "https://www.wkorea.com",
        "link_keyword": "wkorea.com/20"
    },
    {
        "id": "hwahae", 
        "name": "화해 비즈니스", 
        "url": "https://business.hwahae.co.kr/insight/?utm_source=chatgpt.com",
        "base_url": "https://business.hwahae.co.kr",
        "link_keyword": "business.hwahae.co.kr/insight/blog/"
    }
]

def save_article_db(source_id, source_name, title, link, content):
    """DB에 기사를 저장 (로컬 AI 분석 포함)"""
    try:
        # 1. DB 중복 체크 (URL의 마지막 슬래시 뒷부분이나 파라미터 활용)
        unique_key = link.split('/')[-1].split('&')[0][:30]
        product_id = f"news_{source_id}_{unique_key}"
        
        check_res = requests.get(
            f"{SUPABASE_URL}/rest/v1/products_master",
            headers=HEADERS,
            params={"product_id": f"eq.{product_id}", "select": "id"},
            timeout=10
        )
        if check_res.status_code == 200 and len(check_res.json()) > 0:
            return False

        print(f"  🤖 실시간 로컬 AI 뉴스 분석 중: {title[:30]}...")
        
        # 2. 로컬 AI 분석 실행 (Mistral + Qwen)
        tags = ai.extract_article_tags(title, content)
        summary = ai.summarize_article(title, content)
        
        extracted_brand = tags.get("brand", source_name)
        if isinstance(extracted_brand, str) and extracted_brand.lower() == "null":
            extracted_brand = source_name
            
        print("  ✨ 분석 완료. DB 저장 준비...")

        # 3. DB 저장
        product_record = {
            "product_id": product_id,
            "source": source_id,
            "name": title,
            "brand": extracted_brand,
            "price": 0,
            "image_url": "https://cdn-icons-png.flaticon.com/512/2965/2965879.png", 
            "url": link,
            "category": CATEGORY,
            "tags": tags,
            "ai_summary": {"insight": summary, "reason": f"수집: {source_name}"},
            "updated_at": datetime.now().isoformat()
        }
        
        res = requests.post(
            f"{SUPABASE_URL}/rest/v1/products_master",
            headers=HEADERS,
            params={"on_conflict": "source,product_id"},
            json=product_record,
            timeout=10
        )
        return res.status_code in [200, 201]
    except Exception as e:
        print(f"  ❌ 뉴스 저장 에러 ({title[:20]}): {e}")
        return False

async def fetch_article_content(page, link):
    """기사 상세 페이지에 들어가 본문을 긁어옴"""
    try:
        await page.goto(link, wait_until="domcontentloaded", timeout=30000)
        await asyncio.sleep(1) # JS 연산 대기
        
        html = await page.content()
        soup = BeautifulSoup(html, "html.parser")
        
        # 쓸데없는 태그 제거 (스크립트, 스타일)
        for script in soup(["script", "style", "nav", "header", "footer"]):
            script.decompose()
            
        # 본문 길이를 기준으로最も 내용이 많은 블록을 본문으로 간주 (간이 휴리스틱)
        paragraphs = soup.find_all(['p', 'div'])
        longest_text = ""
        
        for p in paragraphs:
            text = p.get_text(separator=" ", strip=True)
            if len(text) > len(longest_text):
                longest_text = text
                
        # 쓸데없이 긴 경우(배너 집합)를 대비하여 어느 정도 길이(예: 300자) 이상이면 본문 취급
        return longest_text[:3000] # AI 컨텍스트 고려 최대 3000자 제한
        
    except Exception as e:
        print(f"  ⚠️ 본문 추출 실패 ({link}): {e}")
        return ""

async def crawl_web_source(context, source):
    print(f"\n--- [{source['name']}] 웹 크롤링 시도 ---")
    page = await context.new_page()
    total_saved = 0
    try:
        await page.goto(source['url'], wait_until="domcontentloaded", timeout=60000)
        await asyncio.sleep(2)
        
        html = await page.content()
        soup = BeautifulSoup(html, "html.parser")
        
        all_links = soup.find_all('a')
        
        # URL 규칙 기반으로 핵심 기사 링크만 필터링
        valid_articles = []
        seen_urls = set()
        
        for link in all_links:
            href = link.get('href', '')
            text = link.get_text(strip=True)
            
            # 1. 고유 키워드가 포함된 href 인가?
            # 2. 이미 등록된 URL이 아닌가? 
            # 3. 텍스트 길이가 기사 제목답게 긴가? (> 10자)
            if source['link_keyword'] in href and href not in seen_urls and len(text) > 10:
                full_url = urllib.parse.urljoin(source['base_url'], href)
                valid_articles.append({"title": text, "link": full_url})
                seen_urls.add(href)
                
            if len(valid_articles) >= 3: # 각 매체당 최신 3개만 (AI 리소스 조절)
                break
                
        print(f"  👉 발견된 유효 기사 수: {len(valid_articles)}개")
        
        # 기사 본문 수집 및 AI 분석 후 저장
        for article in valid_articles:
            # 본문 추출 시도
            content = await fetch_article_content(page, article['link'])
            if len(content) < 50:
                content = article['title'] # 본문 파싱 실패 시 제목이라도 넘김
                
            if save_article_db(source['id'], source['name'], article['title'], article['link'], content):
                 total_saved += 1
                 
        if total_saved > 0:
            print(f"  ✅ {total_saved}개 기사 신규 분석 및 저장 완료")
        else:
            print("  ℹ️ 신규 기사 없음 (또는 모두 저장 실패)")
                 
    except Exception as e:
        print(f"  ❌ 에러: {e}")
    finally:
        await page.close()
        
    return total_saved

async def main():
    start_time = datetime.now()
    print(f"========== 뉴스 크롤링 파이프라인 (Web & AI) 시작 ({start_time}) ==========")
    total_saved = 0
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=['--disable-blink-features=AutomationControlled']
        )
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        
        # 비동기 병렬 처리 (속도 2~3배 향상)
        tasks = [crawl_web_source(context, source) for source in WEB_SOURCES]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        for res in results:
            if isinstance(res, int):
                total_saved += res
            else:
                print(f"  ❌ 병렬 처리 에러: {res}")
                
        await browser.close()
        
    duration = str(datetime.now() - start_time)
    print(f"\n========== 뉴스 크롤링 종료. 총 {total_saved}개 저장. 소요시간: {duration} ==========")

if __name__ == "__main__":
    asyncio.run(main())
