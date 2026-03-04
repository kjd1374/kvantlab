import asyncio
from playwright.async_api import async_playwright
import json

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        print("Navigating to SSG Ranking...")
        
        captured_api = []
        page.on("response", lambda response: captured_api.append(response.url) if "api" in response.url.lower() and "rank" in response.url.lower() else None)
        
        await page.goto("https://department.ssg.com/page/pc/ranking.ssg", wait_until="networkidle", timeout=30000)
        await asyncio.sleep(3)
        
        # HTML 덤프
        html = await page.content()
        with open("ssg_debug.html", "w", encoding="utf-8") as f:
            f.write(html)
        print("Saved ssg_debug.html (Length:", len(html), ")")

        # 카테고리 탭 탐색
        tabs = await page.evaluate('''() => {
            return Array.from(document.querySelectorAll('a, button'))
                   .filter(el => el.innerText && el.innerText.trim().length > 0)
                   .map(el => ({
                       text: el.innerText.trim(), 
                       href: el.href || '', 
                       cls: el.className
                   }))
                   .filter(t => t.href.includes('dispCtgId=') || t.cls.includes('tab'));
        }''')
        
        # print specific unique texts
        unique_texts = {}
        for t in tabs:
            if t['text'] not in unique_texts:
                unique_texts[t['text']] = t
        with open('ssg_parsed.json', 'w', encoding='utf-8') as f:
            json.dump({
                "categories": list(unique_texts.values()),
                "apis": captured_api
            }, f, ensure_ascii=False, indent=2)
        print("Saved ssg_parsed.json")

if __name__ == "__main__":
    asyncio.run(run())
