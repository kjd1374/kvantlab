import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=['--disable-blink-features=AutomationControlled']
        )
        # context = await browser.new_context(
        #     user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        #     viewport={"width": 1920, "height": 1080}
        # )
        # page = await context.new_page()
        page = await browser.new_page(user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        
        print("Visiting Olive Young product page...")
        url = "https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo=A000000248432"
        await page.goto(url, wait_until="domcontentloaded")
        await page.wait_for_timeout(3000)
        
        html = await page.content()
        with open("oy_debug.html", "w", encoding="utf-8") as f:
            f.write(html)
            
        await page.screenshot(path="oy_debug.png", full_page=True)
        print(f"Done. Saved oy_debug.png and oy_debug.html for {url}")
        
        await browser.close()

asyncio.run(run())
