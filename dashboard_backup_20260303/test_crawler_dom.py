import asyncio
from playwright.async_api import async_playwright
import time

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        page = await context.new_page()
        
        await page.goto("https://www.oliveyoung.co.kr/store/main/getBestList.do", wait_until="networkidle")
        await asyncio.sleep(2)
        
        # Test Skincare
        print("Clicking Skincare...")
        await page.locator("button[data-ref-dispcatno='10000010001']").click(force=True)
        await page.wait_for_load_state("networkidle", timeout=5000)
        await asyncio.sleep(2)
        
        # Now click Mask Pack
        print("Clicking Mask Pack...")
        await page.locator("button[data-ref-dispcatno='10000010009']").click(force=True)
        await page.wait_for_load_state("networkidle", timeout=5000)
        await asyncio.sleep(2)
        
        # Print Mask Pack items
        items = await page.evaluate("Array.from(document.querySelectorAll('.cate_prd_list li, .best-list li')).map(li => li.innerText).slice(0, 3)")
        print("Mask Pack DOM items immediately after click:")
        for item in items:
            print(item[:50].replace('\n', ' '))
            
        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
