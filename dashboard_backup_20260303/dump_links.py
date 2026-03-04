import asyncio
from bs4 import BeautifulSoup
from playwright.async_api import async_playwright
import urllib.parse

WEB_SOURCES = [
    {
        "id": "apparelnews", 
        "name": "어패럴뉴스", 
        "url": "http://www.apparelnews.co.kr/news/news_list.php?mcode=m022vw10", # 모바일 최신글
        "base_url": "http://www.apparelnews.co.kr"
    },
    {
        "id": "cosinkorea", 
        "name": "코스인코리아", 
        "url": "http://www.cosinkorea.com/news/articleList.html?sc_section_code=S1N1",
        "base_url": "http://www.cosinkorea.com"
    },
    {
        "id": "beautynury", 
        "name": "뷰티누리", 
        "url": "http://www.beautynury.com/news/list/001002008",
        "base_url": "http://www.beautynury.com"
    }
]

async def dump_links(context, source):
    print(f"\n========== [{source['name']}] 링크 덤프 ==========")
    page = await context.new_page()
    try:
        await page.goto(source['url'], wait_until="domcontentloaded", timeout=60000)
        html = await page.content()
        soup = BeautifulSoup(html, "html.parser")
        
        all_links = soup.find_all('a')
        count = 0
        for link in all_links:
            text = link.get_text(strip=True)
            href = link.get('href', '')
            # 너무 짧은 텍스트(메뉴)나 javascript 링크 제외, 기사 제목일만한 길이(15자 이상) 필터링
            if len(text) > 15 and "javascript" not in href:
                print(f"[{count+1}] {text}")
                print(f"    -> {href}")
                # 상위 태그 클래스 확인
                parent = link.parent
                print(f"    -> 부모 태그: <{parent.name}> class='{parent.get('class')}'")
                count += 1
                if count >= 10: # 10개만 확인
                    break
    except Exception as e:
        print(f"에러: {e}")
    finally:
        await page.close()

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        )
        for source in WEB_SOURCES:
            await dump_links(context, source)
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
