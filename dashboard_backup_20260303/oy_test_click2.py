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
        
        # Listen for any XHR/FETCH request
        def handle_request(req):
            if req.resource_type in ["xhr", "fetch"]:
                if "google" not in req.url and "adlc" not in req.url and "tiktok" not in req.url:
                    print(f"Captured: {req.method} {req.url} | Post Data: {req.post_data}")
        
        page.on("request", handle_request)
        
        print("Clicking Mask Pack button...")
        await page.locator("button[data-ref-dispcatno='10000010009']").click(force=True)
        await asyncio.sleep(4)
        
        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
