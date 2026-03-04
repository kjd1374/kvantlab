import asyncio
import json
from playwright.async_api import async_playwright
import urllib.parse

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
            viewport={"width": 390, "height": 844}
        )
        page = await context.new_page()
        
        target_cats = [{"name": "상의", "sno": 504}, {"name": "아우터", "sno": 505}, {"name": "원피스", "sno": 506}, {"name": "바지", "sno": 507}, {"name": "스커트", "sno": 508}]
        
        await page.goto("https://m.a-bly.com/", wait_until="networkidle")
        await asyncio.sleep(2)
        
        for cat in target_cats:
            sno = cat['sno']
            name = cat['name']
            
            # Construct the exact next_token Ably uses for category ranks
            # The token is base64 encoded JSON
            payload = {
                "l": "DepartmentCategoryRealtimeRankGenerator",
                "p": {
                    "department_type": "CATEGORY",
                    "category_sno": sno
                },
                "d": "CATEGORY",
                "previous_screen_name": "OVERVIEW",
                "category_sno": sno
            }
            
            import base64
            token = base64.b64encode(json.dumps(payload).encode('utf-8')).decode('utf-8')
            
            url = f"https://api.a-bly.com/api/v2/screens/SUB_CATEGORY_DEPARTMENT/?next_token={token}"
            print(f"\n--- Testing fetch for {name} ({sno}) ---")
            
            # Use page.evaluate to fetch using the browser's context (cookies/tokens)
            try:
                res = await page.evaluate(f'''async () => {{
                    const resp = await fetch("{url}");
                    return await resp.json();
                }}''')
                
                # Verify we got products
                components = res.get('components', [])
                goods_found = False
                for comp in components:
                    if 'entity' in comp and 'item_list' in comp['entity']:
                        items = comp['entity']['item_list']
                        print(f"✅ Found {len(items)} products in item_list!")
                        goods_found = True
                        break
                    elif 'entity' in comp and 'goods' in comp['entity']:
                        items = comp['entity']['goods']
                        print(f"✅ Found {len(items)} products in entity.goods!")
                        goods_found = True
                        break
                        
                if not goods_found:
                    print("❌ No products found in response")
                    
            except Exception as e:
                print("Fetch failed:", e)
            
            await asyncio.sleep(1)
            
        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
