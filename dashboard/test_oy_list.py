import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=['--disable-blink-features=AutomationControlled']
        )
        context = await browser.new_context()
        page = await context.new_page()
        await page.goto("https://www.oliveyoung.co.kr/store/main/getBestList.do")
        await asyncio.sleep(4)
        
        html = await page.content()
        with open("oy_list_debug.html", "w") as f:
            f.write(html)
            
        print("Done. Saved oy_list_debug.html.")
        await browser.close()

asyncio.run(run())
