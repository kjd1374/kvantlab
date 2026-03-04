import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        
        print("Navigating to local dashboard...")
        await page.goto("http://localhost:4001", wait_until="networkidle")
        await asyncio.sleep(2)
        
        print("Clicking Ably tab...")
        await page.click("button:has-text('Ably')")
        await asyncio.sleep(2)
        
        print("Extracting visible category tabs for Ably...")
        tabs = await page.evaluate('''() => {
            return Array.from(document.querySelectorAll('#categoryChips .chip'))
               .map(b => b.innerText.trim());
        }''')
        print("Tabs:", tabs)
        
        print("Checking for WOMEN products...")
        await page.click("#categoryChips .chip:has-text('여성패션')")
        await asyncio.sleep(2)
        women_items = await page.evaluate('''() => {
            const tbody = document.querySelector('#allProductsBody');
            if (!tbody) return 'No tbody found';
            return tbody.querySelectorAll('tr').length;
        }''')
        print("WOMEN product rows count:", women_items)
        
        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
