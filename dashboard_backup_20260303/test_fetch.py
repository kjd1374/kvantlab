import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        page = await context.new_page()
        
        await page.goto("https://www.oliveyoung.co.kr/store/main/getBestList.do", wait_until="domcontentloaded")
        await asyncio.sleep(2)
        
        async def fetch_category(code, name):
            print(f"\nClicking {name} ({code})...")
            tab_locator = page.locator(f"button[data-ref-dispcatno='{code}']")
            if await tab_locator.count() > 0:
                await tab_locator.click(force=True)
                await asyncio.sleep(3)
                items = await page.evaluate("""
                    () => {
                        return Array.from(document.querySelectorAll('.cate_prd_list li, .best-list li')).map(li => {
                            const info = li.querySelector('.prd_info') || li.querySelector('.prd_name')?.parentElement || li;
                            if (!info || !li.querySelector('.tx_name') || !li.querySelector('img')) return null;
                            const brand = info.querySelector('.tx_brand')?.innerText.trim() || '';
                            const name = info.querySelector('.tx_name')?.innerText.trim() || '';
                            return {brand, name};
                        }).filter(Boolean).slice(0, 3);
                    }
                """)
                for i, item in enumerate(items):
                    print(f"{i+1}. [{item['brand']}] {item['name']}")
                if not items:
                    print("No items found.")
            else:
                print("Tab not found.")

        await fetch_category("10000010009", "Mask Pack")
        await fetch_category("10000010012", "Nail")
        
        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
