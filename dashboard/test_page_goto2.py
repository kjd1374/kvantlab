import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        page = await context.new_page()
        
        url = "https://www.oliveyoung.co.kr/store/main/getBestList.do?dispCatNo=900000100100001&fltDispCatNo=10000010009"
        print(f"Navigating to {url}")
        await page.goto(url, wait_until="networkidle")
        await asyncio.sleep(4)
        
        items = await page.evaluate("""
            () => {
                return Array.from(document.querySelectorAll('.cate_prd_list li, .best-list li')).map(li => {
                    const info = li.querySelector('.prd_info') || li.querySelector('.prd_name')?.parentElement || li;
                    if (!info || !li.querySelector('.tx_name') || !li.querySelector('img')) return null;
                    const brand = info.querySelector('.tx_brand')?.innerText.trim() || '';
                    const name = info.querySelector('.tx_name')?.innerText.trim() || '';
                    return {brand, name};
                }).filter(Boolean).slice(0, 5);
            }
        """)
        
        print("Top 5 Items for Mask Pack:")
        for i, item in enumerate(items):
            print(f"{i+1}. [{item['brand']}] {item['name']}")
        
        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
