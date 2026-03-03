import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        # iPhone 13 profile
        context = await browser.new_context(**p.devices['iPhone 13'])
        page = await context.new_page()
        
        # Log ALL requests
        page.on("request", lambda r: print(f"REQ: {r.method} {r.url}") if "api.zigzag.kr" in r.url else None)
        
        # Log GQL specifically
        async def check_gql(req):
            if "graphql" in req.url and req.method == "POST":
                try:
                    p = await req.post_data_json()
                    print(f"GQL OP: {p.get('operationName')}")
                except: pass

        page.on("request", check_gql)

        print("Navigating...")
        await page.goto("https://zigzag.kr/best", wait_until="load")
        await asyncio.sleep(10) # Heavy wait
        
        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
