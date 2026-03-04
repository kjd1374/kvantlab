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
        
        print("Navigating to Olive Young Best Page...")
        await page.goto("https://www.oliveyoung.co.kr/store/main/getBestList.do", wait_until="domcontentloaded")
        await asyncio.sleep(5)
        
        # Scrape links specifically inside the new grid
        categories = await page.evaluate("""
            () => {
                // Find the table-like grid that contains the categories
                // From the screenshot, it's right under the title.
                const results = [];
                const links = Array.from(document.querySelectorAll('a, button'));
                
                links.forEach(el => {
                    const text = el.innerText ? el.innerText.trim() : '';
                    if (['스킨케어', '마스크팩', '클렌징', '메이크업'].includes(text)) {
                        results.push({
                            text: text,
                            href: el.getAttribute('href'),
                            dataRef: el.getAttribute('data-ref-dispcatno'),
                            onclick: el.getAttribute('onclick'),
                            className: el.className,
                            parentClass: el.parentElement ? el.parentElement.className : 'NONE',
                            html: el.outerHTML
                        });
                    }
                });
                return results;
            }
        """)
        
        with open("oy_categories_grid.json", "w", encoding="utf-8") as f:
            json.dump(categories, f, ensure_ascii=False, indent=2)
            
        print("Saved to oy_categories_grid.json")
        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
