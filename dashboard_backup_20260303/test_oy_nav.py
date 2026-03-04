import asyncio
from playwright.async_api import async_playwright

async def test():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1920, "height": 1080})
        page = await context.new_page()
        print("Goto Mask Pack URL...")
        await page.goto("https://www.oliveyoung.co.kr/store/main/getBestList.do?dispCatNo=10000010009", wait_until="domcontentloaded")
        print("Waiting for items...")
        try:
            await page.wait_for_selector('.cate_prd_list li, .best-list li', timeout=15000)
            await asyncio.sleep(2)
            names = await page.evaluate("Array.from(document.querySelectorAll('.tx_name')).slice(0, 5).map(e => e.innerText)")
            print("First 5 items:", names)
        except Exception as e:
            print(f"Error: {e}")
            with open("error_maskpack.html", "w", encoding="utf-8") as f:
                f.write(await page.content())
            print("Saved error_maskpack.html")
        
        # Test Makeup as well
        print("\nGoto Makeup URL...")
        await page.goto("https://www.oliveyoung.co.kr/store/main/getBestList.do?dispCatNo=10000010002", wait_until="domcontentloaded")
        await page.wait_for_selector('.cate_prd_list li, .best-list li', timeout=15000)
        await asyncio.sleep(2)
        names_makeup = await page.evaluate("Array.from(document.querySelectorAll('.tx_name')).slice(0, 5).map(e => e.innerText)")
        print("First 5 makeup items:", names_makeup)
        
        await browser.close()

asyncio.run(test())
