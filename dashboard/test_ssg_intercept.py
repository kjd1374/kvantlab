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
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            viewport={"width": 1920, "height": 1080}
        )
        page = await context.new_page()
        
        api_responses = {}
        
        async def handle_response(res):
            if "ssg.com" in res.url and res.status == 200:
                try:
                    ct = res.headers.get("content-type", "")
                    if "json" in ct or "text/html" in ct:
                        body = await res.text()
                        if "리뷰" in body or "eval" in body.lower() or "review" in body.lower():
                            api_responses[res.url] = body[:300]
                except:
                    pass
                    
        page.on("response", handle_response)
        
        # Load SSG product
        print("Goto page...")
        await page.goto("https://www.ssg.com/item/itemView.ssg?itemId=1000787182418", wait_until="networkidle", timeout=30000)
        await asyncio.sleep(4)
        
        # In modern SSG, sometimes scrolling triggers review loading
        print("Scrolling down...")
        await page.mouse.wheel(0, 3000)
        await asyncio.sleep(3)
        await page.mouse.wheel(0, 3000)
        await asyncio.sleep(3)
        
        # Try finding and clicking the review tab
        print("Clicking review tabs...")
        tabs = page.locator("text=리뷰")
        count = await tabs.count()
        for i in range(count):
            try:
                await tabs.nth(i).scroll_into_view_if_needed()
                await tabs.nth(i).click()
                await asyncio.sleep(2)
            except:
                pass
                
        texts = page.locator("text=고객평")
        count2 = await texts.count()
        for i in range(count2):
            try:
                await texts.nth(i).scroll_into_view_if_needed()
                await texts.nth(i).click()
                await asyncio.sleep(2)
            except:
                pass
        
        print("\nCaptured APIs with review keywords:")
        for url, body in api_responses.items():
            print(f"- {url}")
            print(f"  Preview: {body[:100].strip()}...")
            
        await browser.close()

asyncio.run(test())
