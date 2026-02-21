import asyncio
from playwright.async_api import async_playwright

async def test():
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=[
                '--disable-blink-features=AutomationControlled',
                '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            ]
        )
        context = await browser.new_context(viewport={"width": 1920, "height": 1080})
        page = await context.new_page()
        print("Goto Skincare URL...")
        await page.goto("https://www.oliveyoung.co.kr/store/main/getBestList.do?dispCatNo=10000010001", wait_until="domcontentloaded")
        await asyncio.sleep(5)
        print("Taking screenshot...")
        await page.screenshot(path="oy_skincare_test.png", full_page=True)
        print("Done.")
        await browser.close()

asyncio.run(test())
