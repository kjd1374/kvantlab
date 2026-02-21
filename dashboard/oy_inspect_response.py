import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        )
        page = await context.new_page()
        
        await page.goto("https://www.oliveyoung.co.kr/store/main/getBestList.do")
        await asyncio.sleep(2)
        
        # Intercept response
        async with page.expect_response(lambda response: "getBestList.do" in response.url and "10000010009" in response.url, timeout=15000) as response_info:
            await page.evaluate("common.link.moveCategoryShop('10000010009', 'Drawer')")
            
        response = await response_info.value
        body_bytes = await response.body()
        print("URL:", response.url)
        print("Status:", response.status)
        print("Headers:", response.headers)
        print("Body:", body_bytes.decode('utf-8', errors='replace'))
        
        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
