import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
            viewport={"width": 390, "height": 844}
        )
        page = await context.new_page()
        
        # Test direct URL navigation to Top -> T-shirts (504 -> 179)
        # Often mobile sites use /categories/504 or /departments/504
        url = "https://m.a-bly.com/categories/504/179"
        print(f"Testing direct navigation to: {url}")
        
        try:
            await page.goto(url, wait_until="networkidle")
            await asyncio.sleep(5)
            print("Page URL after redirect:", page.url)
            
            # Check if we can find product lists
            items = await page.locator("a[href*='/goods/']").count()
            print(f"Found {items} product links.")
            
        except Exception as e:
            print("Navigation failed:", e)
            
        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
