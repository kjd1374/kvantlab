import asyncio
from playwright.async_api import async_playwright

async def test_oy():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        url = "https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo=A000000248912"
        await page.goto(url, wait_until="domcontentloaded")
        await asyncio.sleep(3)
        html = await page.content()
        with open("oy_detail_debug.html", "w") as f:
            f.write(html)
        print("Saved oy_detail_debug.html")
        await browser.close()

asyncio.run(test_oy())
