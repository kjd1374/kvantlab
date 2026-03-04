import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        )
        page = await context.new_page()
        
        await page.goto("https://www.oliveyoung.co.kr/store/main/getBestList.do", wait_until="networkidle")
        await asyncio.sleep(2)
        
        # Listen for any request that might be loading the new category data
        def handle_request(req):
            if "10000010009" in req.url and req.resource_type in ["xhr", "fetch", "document"]:
                print(f"Captured network req: {req.method} {req.url}")
        
        page.on("request", handle_request)
        
        # Click the button
        print("Clicking Mask Pack button...")
        await page.locator("button[data-ref-dispcatno='10000010009']").click(force=True)
        await asyncio.sleep(4)
        
        html = await page.content()
        with open('oy_click_result.html', 'w', encoding='utf-8') as f:
            f.write(html)
            
        items = await page.evaluate("document.querySelectorAll('.cate_prd_list li, .best-list li').length")
        print(f"Items in grid after click: {items}")
        
        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
