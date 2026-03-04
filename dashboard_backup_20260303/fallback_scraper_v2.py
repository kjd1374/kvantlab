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
    },
    {
        "id": "hwahae", 
        "name": "화해 비즈니스", 
        "url": "https://business.hwahae.co.kr/insight/?utm_source=chatgpt.com",
        "selector": "article h2, article h3",
        "base_url": "https://business.hwahae.co.kr"
    }
]

async def scrape_web_articles(context, source):
    print(f"\n--- [{source['name']}] 웹 크롤링 시도 ---")
    page = await context.new_page()
    articles = []
    
    try:
        # User-Agent 및 자동화 방지 우회 세팅
        await page.goto(source['url'], wait_until="domcontentloaded", timeout=60000)
        
        # 스크롤 내리기 (Lazy Loading 대응)
        await page.evaluate("window.scrollTo(0, document.body.scrollHeight/2)")
        await page.wait_for_timeout(2000)
        await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
        await page.wait_for_timeout(3000)
        
        html = await page.content()
        soup = BeautifulSoup(html, "html.parser")
        
        # 전체 a 태그 출력 (디버깅용)
        all_links = soup.find_all('a')
        print(f"  전체 <a> 태그 수: {len(all_links)}")
        
        # 실제 타겟 셀렉터 검색
        if source['id'] == 'hwahae':
            # 화해는 article 기반 탐색
            items = soup.find_all('article')
            print(f"  <article> 태그 수: {len(items)}")
            for item in items[:5]:
                header = item.find(['h2', 'h3'])
                link = item.find('a')
                if header and link:
                    title = header.get_text(strip=True)
                    href = link.get('href')
                    full_url = urllib.parse.urljoin(source['base_url'], href)
                    articles.append({"title": title, "link": full_url})
                    
        else:
            links = soup.select(source['selector'])
            print(f"  발견된 타겟 링크 수: {len(links)}")
            
            for link in links[:5]:
                title = link.get_text(strip=True)
                href = link.get('href')
                
                if not title or not href:
                    continue
                    
                full_url = urllib.parse.urljoin(source['base_url'], href)
                articles.append({
                    "title": title,
                    "link": full_url,
                    "content": ""
                })
            
    except Exception as e:
        print(f"  ❌ 에러: {e}")
    finally:
        await page.close()
        
    return articles

async def test_all_web():
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=['--disable-blink-features=AutomationControlled']
        )
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
            viewport={"width": 1440, "height": 900}
        )
        
        for source in WEB_SOURCES:
            res = await scrape_web_articles(context, source)
            for r in res:
                print(f"  - {r['title']} ({r['link']})")
                
        await browser.close()

if __name__ == "__main__":
    asyncio.run(test_all_web())
