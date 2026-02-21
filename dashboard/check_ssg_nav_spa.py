import asyncio
from playwright.async_api import async_playwright
import json
import time

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        print("Navigating to SSG Ranking...")
        
        await page.goto("https://department.ssg.com/page/pc/ranking.ssg", wait_until="networkidle", timeout=30000)
        await asyncio.sleep(3)
        
        # Get category buttons
        buttons = await page.locator('[role="tablist"] button[role="tab"]').all()
        
        results = {}
        
        for idx in range(len(buttons)):
            # Re-locate buttons in case DOM changed
            current_buttons = await page.locator('[role="tablist"] button[role="tab"]').all()
            btn = current_buttons[idx]
            
            cat_name = await btn.inner_text()
            print(f"Clicking category: {cat_name}")
            
            await btn.click()
            await asyncio.sleep(4) # Wait for SPA load
            
            # parse products
            products = await page.evaluate('''() => {
                const results = [];
                const items = document.querySelectorAll('a[href*="itemId="]');
                const cards = document.querySelectorAll('.template-grid-item');
                
                cards.forEach(card => {
                    const rankEl = card.querySelector('.css-1k2hnaw');
                    if(!rankEl) return;
                    
                    const brandEl = card.querySelector('.css-408eai');
                    const nameEl = card.querySelector('.css-1mrk1dy');
                    const priceEl = card.querySelector('.css-h9py3d');
                    const imgEl = card.querySelector('img.loaded');
                    const linkEl = card.querySelector('a[href*="itemId="]');
                    
                    if(nameEl && priceEl) {
                        const href = linkEl ? linkEl.href : '';
                        const itemIdMatch = href.match(/itemId=([^&]+)/);
                        
                        results.push({
                            rank: rankEl.innerText.replace(/[^0-9]/g, ''),
                            prdNm: nameEl.innerText.trim(),
                            brandNm: brandEl ? brandEl.innerText.trim() : '',
                            price: priceEl.innerText.replace(/[^0-9]/g, ''),
                            itemId: itemIdMatch ? itemIdMatch[1] : '',
                            imgUrl: imgEl ? imgEl.src : ''
                        });
                    }
                });
                return results;
            }''')
            
            print(f"  -> Extracted {len(products)} products for {cat_name}")
            results[cat_name] = products
            
        with open("ssg_spa_results.json", "w", encoding="utf-8") as f:
            json.dump(results, f, ensure_ascii=False, indent=2)

        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
