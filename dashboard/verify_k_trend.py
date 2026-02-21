import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        
        print("Navigating to local dashboard...")
        await page.goto("http://localhost:4002", wait_until="networkidle")
        
        # Click Korea Trends (k_trend)
        print("Clicking Korea Trends tab...")
        await page.click("button:has-text('Korea Trends')")
        await asyncio.sleep(2)
        
        print("Extracting visible category tabs for K-Trend...")
        tabs = await page.evaluate('''() => {
            const chips = document.querySelectorAll('#categoryChips .chip');
            return Array.from(chips).map(c => c.innerText.trim());
        }''')
        print("Tabs:", tabs)
        
        google_items = await page.evaluate('''() => {
            const tbody = document.querySelector('#allProductsBody');
            if (!tbody) return 'No tbody found';
            return tbody.querySelectorAll('tr').length;
        }''')
        print("Google Trends product rows count:", google_items)
        
        sample_brand = await page.evaluate('''() => {
            const row = document.querySelector('#allProductsBody tr');
            if (!row) return 'No row';
            return row.innerText;
        }''')
        print("Sample Row text:", sample_brand[:150].replace('\\n', ' '))
        
        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
