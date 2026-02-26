import feedparser
import requests
from bs4 import BeautifulSoup
import asyncio
from playwright.async_api import async_playwright

RSS_SOURCES = [
    {"id": "fashionbiz", "name": "패션비즈", "url": "http://www.fashionbiz.co.kr/rss/all.xml"},
    {"id": "apparelnews", "name": "어패럴뉴스", "url": "http://www.apparelnews.co.kr/rss/all.xml"},
    {"id": "cosinkorea", "name": "코스인코리아", "url": "http://www.cosinkorea.com/rss/allArticle.xml"},
    {"id": "beautynury", "name": "뷰티누리", "url": "http://www.beautynury.com/rss/all.xml"},
    {"id": "ellekorea", "name": "엘르코리아", "url": "https://www.elle.co.kr/rss.xml"}
]

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
}

def test_rss():
    print("--- RSS 연결 테스트 ---")
    for source in RSS_SOURCES:
        try:
            # 기본 파싱 시도
            feed = feedparser.parse(source['url'])
            if feed.entries:
                print(f"[{source['name']}] 기본 파싱 성공: {len(feed.entries)}개")
                continue
                
            # 헤더를 넣어서 가져와보기
            req = requests.get(source['url'], headers=HEADERS, timeout=10)
            if req.status_code == 200:
                feed = feedparser.parse(req.text)
                print(f"[{source['name']}] 강제 헤더 요청: 코드 {req.status_code}, 파싱 결과: {len(feed.entries)}개")
            else:
                print(f"[{source['name']}] 헤더 요청 실패: {req.status_code}")
                
        except Exception as e:
            print(f"[{source['name']}] 에러: {e}")

async def test_hwahae():
    print("\n--- 화해 비즈니스 크롤링 테스트 ---")
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(user_agent=HEADERS['User-Agent'])
        page = await context.new_page()
        
        try:
            url = "https://business.hwahae.co.kr/insight/?utm_source=chatgpt.com"
            await page.goto(url, wait_until="networkidle", timeout=30000)
            await page.wait_for_timeout(5000) # 완전한 로딩 대기
            
            # HTML 구조 파악
            html = await page.content()
            soup = BeautifulSoup(html, "html.parser")
            
            # 기사 제목 같은 요소들 전부 찍어보기
            headers = soup.find_all(['h1', 'h2', 'h3', 'h4'])
            print(f"화해 페이지에서 h 태그 {len(headers)}개 발견:")
            for h in headers[:5]:
                print(f"  - {h.text.strip()}")
                
        except Exception as e:
            print(f"화해 테스트 에러: {e}")
        finally:
            await browser.close()

if __name__ == "__main__":
    test_rss()
    asyncio.run(test_hwahae())
