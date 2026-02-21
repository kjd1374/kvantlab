import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        
        print("Navigating to local dashboard...")
        await page.goto("http://localhost:4002", wait_until="networkidle")
        
        # Click Shinsegae tab
        print("Clicking Shinsegae tab...")
        await page.click("button:has-text('Shinsegae')")
        await asyncio.sleep(2)
        
        # Check visible tabs
        print("Extracting visible category tabs for SSG...")
        tabs = await page.evaluate('''() => {
            const chips = document.querySelectorAll('#categoryChips .chip');
            return Array.from(chips).map(c => c.innerText.trim());
        }''')
        print("Tabs:", tabs)
        
        # Click FASHION tab
        await page.click("#categoryChips .chip:has-text('패션')")
        await asyncio.sleep(2)
        
        # Check if rows are rendered
        fashion_items = await page.evaluate('''() => {
            const tbody = document.querySelector('#allProductsBody');
            if (!tbody) return 'No tbody found';
            return tbody.querySelectorAll('tr').length;
        }''')
        print("FASHION product rows count:", fashion_items)
        
        # Click FOOD & LIFE tab
        await page.click("#categoryChips .chip:has-text('푸드&리빙')")
        await asyncio.sleep(2)
        
        # Check rows
        food_items = await page.evaluate('''() => {
            const tbody = document.querySelector('#allProductsBody');
            if (!tbody) return 'No tbody found';
            return tbody.querySelectorAll('tr').length;
        }''')
        print("FOOD & LIFE product rows count:", food_items)

        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
