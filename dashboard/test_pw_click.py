import asyncio
from playwright.async_api import async_playwright
import json

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        
        async def handle_response(response):
            # Print ALL urls that might be relevant
            url = response.url.lower()
            if 'musinsa' in url and ('ranking' in url or 'goods' in url or 'v5' in url or 'v1' in url or 'v7' in url or 'category' in url):
                print(f"[{response.status}] {response.url}")
                # print the query params too just in case
                
        page.on("response", handle_response)
        
        print("Navigating to Real Ranking URL...")
        await page.goto("https://www.musinsa.com/main/musinsa/ranking", wait_until="networkidle")
        
        # Click on '여성' (Women)
        print("Clicking Women...")
        try:
            # Look for button containing '여성'
            await page.click("text='여성'")
            await asyncio.sleep(2)
        except Exception as e:
            print("Could not click women:", e)
            
        print("Clicking Pants...")
        try:
            # Look for button containing '바지'
            await page.click("text='바지'")
            await asyncio.sleep(2)
        except Exception as e:
            print("Could not click pants:", e)
            
        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
