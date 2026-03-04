import asyncio
from playwright.async_api import async_playwright
import json

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        )
        page = await context.new_page()
        
        await page.goto("https://www.oliveyoung.co.kr/store/main/getBestList.do", wait_until="domcontentloaded")
        await asyncio.sleep(5)
        
        # Scrape all category buttons/links inside the Best tab list
        tabs = await page.evaluate("""
            () => {
                const results = [];
                // Find lists that look like category tabs. Usually .cate_tab or ul elements in the Best header
                const links = Array.from(document.querySelectorAll('.cate_tab a, .cate_tab button, ul.common-menu li a'));
                
                links.forEach(el => {
                    results.push({
                        text: el.innerText.trim(),
                        href: el.getAttribute('href'),
                        onclick: el.getAttribute('onclick'),
                        dataRef: el.getAttribute('data-ref-dispcatno'),
                        className: el.className
                    });
                });
                return results;
            }
        """)
        
        with open("oy_best_tabs.json", "w", encoding="utf-8") as f:
            json.dump(tabs, f, ensure_ascii=False, indent=2)
            
        print(f"Dumped {len(tabs)} tabs. Check oy_best_tabs.json")
        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
