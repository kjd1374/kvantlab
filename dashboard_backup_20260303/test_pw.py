import asyncio
from playwright.async_api import async_playwright
import json

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        print("Navigating to Homepage...")
        await page.goto("https://www.musinsa.com/main/musinsa", wait_until="networkidle")
        
        # Extract links
        links = await page.evaluate('''() => {
            return Array.from(document.querySelectorAll('a')).map(a => a.href).filter(href => href.includes('rank') || href.includes('best'));
        }''')
        print(f"Found {len(links)} ranking links:")
        for link in set(links):
            print(link)
        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
