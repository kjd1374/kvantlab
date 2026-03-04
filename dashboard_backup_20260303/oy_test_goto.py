import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        )
        page = await context.new_page()
        
        target_url = "https://www.oliveyoung.co.kr/store/main/getBestList.do?dispCatNo=10000010009&fltDispCatNo=&prdSort=01"
        print(f"Navigating to {target_url}...")
        
        await page.goto(target_url, wait_until="domcontentloaded")
        
        try:
            await page.wait_for_selector('.cate_prd_list li, .best-list li', timeout=15000)
            items = await page.evaluate("document.querySelectorAll('.cate_prd_list li, .best-list li').length")
            print(f"Success! Found {items} items.")
        except Exception as e:
            print("Failed to find items:", e)
            print("Current URL:", page.url)
            html = await page.content()
            print("HTML Snippet:", html[:500])
        
        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
