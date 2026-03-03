import asyncio
from playwright.async_api import async_playwright
import json

async def test():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True, args=['--disable-blink-features=AutomationControlled'])
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
            viewport={"width": 390, "height": 844},
            is_mobile=True, has_touch=True
        )
        page = await context.new_page()
        
        api_responses = {}
        async def handle_response(res):
            if "ssg.com" in res.url and res.status == 200:
                try:
                    ct = res.headers.get("content-type", "")
                    if "json" in ct:
                        body = await res.text()
                        if "review" in body.lower() or "eval" in body.lower():
                            api_responses[res.url] = body[:200]
                except: pass
        page.on("response", handle_response)
        
        print("Goto mobile page...")
        # 1000038302946: 안티 스트레스 오일 10ml
        await page.goto("https://m.ssg.com/item/itemView.ssg?itemId=1000038302946", wait_until="networkidle", timeout=30000)
        await asyncio.sleep(4)
        
        # Click reviews tab on mobile
        tabs = page.locator("text=리뷰")
        if await tabs.count() > 0:
            await tabs.first.click()
            await asyncio.sleep(3)
            
        print("\nCaptured APIs:")
        for url, body in api_responses.items():
            print(f"- {url}\n  {body.strip()}...")
            
        await browser.close()

asyncio.run(test())
