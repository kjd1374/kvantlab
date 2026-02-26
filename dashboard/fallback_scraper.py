import asyncio
from bs4 import BeautifulSoup
from playwright.async_api import async_playwright
import urllib.parse

# 타겟 사이트 (RSS 대신 웹 크롤링)
WEB_SOURCES = [
    {
        "id": "fashionbiz", 
        "name": "패션비즈", 
        "url": "http://www.fashionbiz.co.kr/main/",
        "selector": ".tit a", # 제목 링크를 감싸는 선택자
        "base_url": "http://www.fashionbiz.co.kr"
    },
    {
        "id": "apparelnews", 
        "name": "어패럴뉴스", 
        "url": "http://www.apparelnews.co.kr/",
        "selector": ".lists .subject a",
        "base_url": "http://www.apparelnews.co.kr"
    },
    {
        "id": "cosinkorea", 
        "name": "코스인코리아", 
        "url": "http://www.cosinkorea.com/news/articleList.html?sc_section_code=S1N1",
        "selector": ".list-titles a",
        "base_url": "http://www.cosinkorea.com"
    },
    {
        "id": "beautynury", 
        "name": "뷰티누리", 
        "url": "http://www.beautynury.com/news/list/001002008",
        "selector": ".tit a",
        "base_url": "http://www.beautynury.com"
    },
    {
        "id": "ellekorea", 
        "name": "엘르코리아(뷰티)", 
        "url": "https://www.elle.co.kr/beauty",
        "selector": ".content-view a",
        "base_url": "https://www.elle.co.kr"
    }
]

async def scrape_web_articles(context, source):
    print(f"\n--- [{source['name']}] 웹 크롤링 시도 ---")
    page = await context.new_page()
    articles = []
    
    try:
        await page.goto(source['url'], wait_until="domcontentloaded", timeout=30000)
        await page.wait_for_timeout(3000)
        
        html = await page.content()
        soup = BeautifulSoup(html, "html.parser")
        
        links = soup.select(source['selector'])
        print(f"  발견된 링크 수: {len(links)}")
        
        for link in links[:5]:
            title = link.get_text(strip=True)
            href = link.get('href')
            
            if not title or not href:
                continue
                
            # 상대 경로를 절대 경로로 변환
            full_url = urllib.parse.urljoin(source['base_url'], href)
            
            articles.append({
                "title": title,
                "link": full_url,
                "content": "" # 메인 페이지에서는 본문을 알 수 없음 (추가 크롤링 필요 시 뎁스 증가)
            })
            
    except Exception as e:
        print(f"  ❌ 에러: {e}")
    finally:
        await page.close()
        
    return articles

async def test_all_web():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        
        for source in WEB_SOURCES:
            res = await scrape_web_articles(context, source)
            for r in res:
                print(f"  - {r['title']} ({r['link']})")
                
        await browser.close()

if __name__ == "__main__":
    asyncio.run(test_all_web())
