import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=['--disable-blink-features=AutomationControlled']
        )
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            viewport={"width": 1920, "height": 1080}
        )
        page = await context.new_page()
        
        print("Navigating to Olive Young Best Page...")
        await page.goto("https://www.oliveyoung.co.kr/store/main/getBestList.do", wait_until="networkidle")
        await asyncio.sleep(5)
        
        html = await page.content()
        with open("oy_best_page.html", "w", encoding="utf-8") as f:
            f.write(html)
            
        print("Saved to oy_best_page.html")
        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
