import asyncio
import json
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1"
        )
        page = await context.new_page()
        
        # We need to capture the API response to see what category_id maps to what.
        responses = []
        async def on_response(response):
            if "api.a-bly.com/api/v2/home/categories" in response.url:
                 try:
                     print("Found Categories API:", response.url)
                     data = await response.json()
                     responses.append(data)
                 except: pass
                 
        page.on("response", on_response)
        
        await page.goto("https://m.a-bly.com/", wait_until="networkidle")
        await asyncio.sleep(3)
        
        if responses:
            print("Captured category data:")
            # Just print a condensed version to see IDs
            def print_tree(cats, depth=0):
                for c in cats:
                    print(f"{'  '*depth}- {c.get('name')} (ID: {c.get('sno')})")
                    if 'children' in c and c['children']:
                        print_tree(c['children'], depth+1)
            
            # Navigate structure based on actual API payload
            data = responses[-1]
            if 'categories' in data:
                print_tree(data['categories'])
            elif 'data' in data and 'categories' in data['data']:
                print_tree(data['data']['categories'])
            else:
                print(json.dumps(data, ensure_ascii=False)[:500])
        else:
            print("No category API intercepted.")
            
        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
