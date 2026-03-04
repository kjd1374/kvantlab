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
        
        await page.goto("https://www.oliveyoung.co.kr/store/main/getBestList.do", wait_until="networkidle")
        await asyncio.sleep(2)
        
        # Search for elements containing 마스크팩
        elements = await page.locator("text='마스크팩'").evaluate_all("""
            (els) => els.map(el => ({
                tag: el.tagName,
                text: el.innerText,
                href: el.getAttribute('href'),
                dataRef: el.closest('[data-ref-dispcatno]') ? el.closest('[data-ref-dispcatno]').getAttribute('data-ref-dispcatno') : el.getAttribute('data-ref-dispcatno'),
                className: el.className,
                parentTag: el.parentElement ? el.parentElement.tagName : null,
                parentDataRef: el.parentElement ? el.parentElement.getAttribute('data-ref-dispcatno') : null,
            }))
        """)
        
        print(json.dumps(elements, ensure_ascii=False, indent=2))
        
        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
