import asyncio
from playwright.async_api import async_playwright
import json

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=['--disable-blink-features=AutomationControlled']
        )
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            viewport={"width": 1920, "height": 1080}
        )
        page = await context.new_page()
        
        target_url = "https://www.oliveyoung.co.kr/store/main/getBestList.do"
        print(f"Navigating to {target_url} ...")
        
        await page.goto(target_url, wait_until="domcontentloaded")
        await asyncio.sleep(3)
        
        # Click Mask Pack (10000010009)
        disp_cat_no = "10000010009"
        tab_selector = f"button[data-ref-dispcatno='{disp_cat_no}']"
        
        print("Clearing product list...")
        await page.evaluate("const prdList = document.querySelector('.cate_prd_list, .best-list'); if(prdList) prdList.innerHTML = '';")
        
        print("Clicking Mask Pack button...")
        await page.evaluate(f"document.querySelector(`{tab_selector}`).click();")
        
        print("Waiting for products to load...")
        await page.wait_for_selector('.cate_prd_list li, .best-list li', timeout=15000)
        await asyncio.sleep(2)
        
        # Scrape top 5 items
        items = await page.evaluate(r"""
            () => {
                const results = [];
                const products = document.querySelectorAll('.cate_prd_list li, .best-list li');
                products.forEach((li, index) => {
                    if(index >= 5) return;
                    const nameEl = li.querySelector('.tx_name');
                    const brandEl = li.querySelector('.tx_brand');
                    if(nameEl && brandEl) {
                        results.push({
                            rank: index + 1,
                            brand: brandEl.innerText.trim(),
                            name: nameEl.innerText.trim()
                        });
                    }
                });
                return results;
            }
        """)
        
        print("Top 5 Items found:")
        print(json.dumps(items, ensure_ascii=False, indent=2))
        
        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
