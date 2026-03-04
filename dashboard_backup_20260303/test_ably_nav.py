import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
            viewport={"width": 390, "height": 844},
            is_mobile=True,
            has_touch=True
        )
        page = await context.new_page()
        
        print("Navigating to Ably...")
        await page.goto("https://m.a-bly.com/", wait_until="networkidle")
        await asyncio.sleep(3)
        
        print("Clicking Hamburger menu (전체보기)...")
        cat_btn = page.locator("text=전체보기").first
        if await cat_btn.count() > 0:
            await cat_btn.click()
        else:
            cat_svg_btn = page.locator("path[d^='M2 6a.9.9']").first
            if await cat_svg_btn.count() > 0:
                await cat_svg_btn.click()
            else:
                print("Could not find menu button.")
                
        await asyncio.sleep(3)
        
        print("Extracting category names...")
        # Get all text from the menu
        categories = await page.evaluate('''() => {
            return Array.from(document.querySelectorAll('p, span, div'))
                .map(el => el.innerText ? el.innerText.trim() : '')
                .filter(text => text.length > 0 && text.length < 15);
        }''')
        
        # Deduplicate and print
        unique_cats = []
        for c in categories:
            if c not in unique_cats:
                unique_cats.append(c)
                
        print("Categories found in menu:")
        print(unique_cats)
        
        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
