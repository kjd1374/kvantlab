import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(**p.devices['iPhone 13'])
        page = await context.new_page()
        
        print("Navigating to https://zigzag.kr/best...")
        await page.goto("https://zigzag.kr/best", wait_until="load")
        await asyncio.sleep(5)
        
        # Take a screenshot to see what's on screen
        await page.screenshot(path="crawler_research/zigzag_debug.png")
        
        # Dump content
        content = await page.content()
        with open("crawler_research/zigzag_debug.html", "w") as f:
            f.write(content)
            
        print("Done. Screenshot saved to crawler_research/zigzag_debug.png")
        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
