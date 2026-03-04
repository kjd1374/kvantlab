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

        # Listen for all requests to find the API endpoint
        api_urls = []
        page.on("request", lambda request: api_urls.append(request.url) if "getBestList" in request.url or "api" in request.url else None)

        print("Navigating to Olive Young Best Page...")
        await page.goto("https://www.oliveyoung.co.kr/store/main/getBestList.do", wait_until="domcontentloaded")
        await asyncio.sleep(5)
        
        print("Clicking Mask Pack Category directly...")
        await page.evaluate("const btn = document.querySelector('button[data-ref-dispcatno=\"10000010009\"]'); if(btn) btn.click();")
        await asyncio.sleep(5)

        print("\nCaptured API URLs:")
        for url in set(api_urls):
            print(url)
            
        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
