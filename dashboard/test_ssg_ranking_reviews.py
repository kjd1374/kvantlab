import asyncio
from playwright.async_api import async_playwright
import bs4

async def test():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True, args=['--disable-blink-features=AutomationControlled'])
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            viewport={"width": 1920, "height": 1080}
        )
        page = await context.new_page()
        
        # Load SSG ranking
        await page.goto("https://department.ssg.com/page/pc/ranking.ssg", wait_until="networkidle", timeout=30000)
        await asyncio.sleep(4)
        
        html = await page.content()
        soup = bs4.BeautifulSoup(html, 'html.parser')
        
        cards = soup.select('.template-grid-item')
        print(f"Found {len(cards)} cards on ranking.")
        
        for i, card in enumerate(cards[:5]): # Check first 5 items
            print(f"-- Card {i+1} --")
            text = card.get_text(separator=' | ', strip=True)
            print("Text:", text)
            
            # Check review specific classes if found
            if '리뷰' in text or '평점' in text or '★' in text or '건' in text:
                print(" -> Contains review clues!")
        
        await browser.close()

asyncio.run(test())
