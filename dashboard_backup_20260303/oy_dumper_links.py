import asyncio
from playwright.async_api import async_playwright

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
        
        categories = await page.evaluate("""
            () => {
                const links = Array.from(document.querySelectorAll('a, button, li'));
                const targetTexts = ['스킨케어', '마스크팩', '네일', '메이크업', '더모 코스메틱', '전체'];
                const result = [];
                
                links.forEach(el => {
                    const text = el.innerText ? el.innerText.trim() : '';
                    if (targetTexts.includes(text)) {
                        result.push({
                            tag: el.tagName,
                            text: text,
                            href: el.getAttribute('href'),
                            data: el.getAttribute('data-ref-dispcatno'),
                            onclick: el.getAttribute('onclick'),
                            className: el.className
                        });
                    }
                });
                return result;
            }
        """)
        import json
        with open("oy_categories.json", "w", encoding="utf-8") as f:
            json.dump(categories, f, ensure_ascii=False, indent=2)
            
        print("Saved to oy_categories.json")
        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
