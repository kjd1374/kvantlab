import asyncio
from playwright.async_api import async_playwright

async def test():
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=[
                '--disable-blink-features=AutomationControlled',
                '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            ]
        )
        context = await browser.new_context(viewport={"width": 1920, "height": 1080})
        page = await context.new_page()
        print("Goto Main Best URL...")
        await page.goto("https://www.oliveyoung.co.kr/store/main/getBestList.do", wait_until="domcontentloaded")
        await page.wait_for_selector('.cate_prd_list li, .best-list li', timeout=15000)
        
        tab_selector = "button[data-ref-dispcatno='10000010001']"
        tab_btn = page.locator(tab_selector)
        
        print("\nBefore click:")
        html_before = await page.evaluate(f"document.querySelector(`{tab_selector}`).parentElement.outerHTML")
        print(html_before)
        
        print("\nClicking...")
        await page.evaluate("const prdList = document.querySelector('.cate_prd_list, .best-list'); if(prdList) prdList.innerHTML = '';")
        await tab_btn.click()
        await asyncio.sleep(5)
        
        print("\nAfter click:")
        html_after = await page.evaluate(f"document.querySelector(`{tab_selector}`).parentElement.outerHTML")
        print(html_after)
        
        # Print first 3 products
        names = await page.evaluate("Array.from(document.querySelectorAll('.tx_name')).slice(0, 3).map(e => e.innerText)")
        print("\nFirst 3 items:", names)

        await browser.close()

asyncio.run(test())
