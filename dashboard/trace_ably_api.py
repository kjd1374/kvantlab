import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
            viewport={"width": 390, "height": 844}
        )
        page = await context.new_page()
        
        # Capture API endpoints during page loaded state
        async def on_response(response):
            try:
                if "api.a-bly.com" in response.url and response.status == 200:
                    content_type = response.headers.get("content-type", "")
                    if "application/json" in content_type:
                        print(f"[API HIT] {response.url}")
            except: pass
            
        page.on("response", on_response)
        
        try:
            print("Navigating to Ably main page...")
            await page.goto("https://m.a-bly.com/", wait_until="networkidle")
            
            print("Clicking '전체보기' menu...")
            # Using the same logic the crawler uses
            nav_items = page.locator(".sc-f21a85fc-1")
            if await nav_items.count() >= 2:
                 await nav_items.nth(1).click()
            else:
                 await page.locator("text=전체보기").first.click()
                 
            await asyncio.sleep(3)
            
            print("Clicking '상의' category...")
            cat_header = page.locator("text=상의").last
            await cat_header.click()
            
            await asyncio.sleep(2)
            
            print("Clicking first sub-category...")
            sub_cat_container_xpath = "//p[text()='상의']/ancestor::div[1]/following-sibling::div[1]"
            sub_cat_first_item = page.locator(f"xpath={sub_cat_container_xpath}//img").first
            if await sub_cat_first_item.count() > 0:
                await sub_cat_first_item.click()
            
            await asyncio.sleep(5)
            print("Done tracing.")
            
        except Exception as e:
            print("Trace failed:", e)
            
        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
