import asyncio
from playwright.async_api import async_playwright
import json

async def test():
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=['--disable-blink-features=AutomationControlled', '--disable-web-security', '--no-sandbox']
        )
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            viewport={"width": 1920, "height": 1080}
        )
        page = await context.new_page()
        
        api_data = []
        async def handle_response(res):
            if "ssg.com" in res.url and res.status == 200:
                try:
                    if "application/json" in res.headers.get("content-type", ""):
                        api_data.append(await res.json())
                except: pass
        page.on("response", handle_response)
        
        await page.goto("https://department.ssg.com/page/pc/ranking.ssg", wait_until="networkidle", timeout=30000)
        await asyncio.sleep(4)
        
        with open('ssg_apis.json', 'w') as f:
            json.dump(api_data, f, ensure_ascii=False, indent=2)
        
        await browser.close()

asyncio.run(test())
