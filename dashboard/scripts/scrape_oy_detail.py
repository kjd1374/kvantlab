"""
Olive Young product detail scraper
Fetches review count, rating, and actual review texts from a product page
Usage: python3 scrape_oy_detail.py <goodsNo>
"""
import asyncio
import json
import sys
import os
from playwright.async_api import async_playwright

async def scrape_detail(goods_no):
    target_url = f"https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo={goods_no}"
    
    result = {
        "goodsNo": goods_no,
        "reviewCount": 0,
        "rating": 0.0,
        "reviews": []
    }

    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(
                headless=True,
                args=['--disable-blink-features=AutomationControlled']
            )
            context = await browser.new_context(
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                viewport={"width": 1280, "height": 1024}
            )
            page = await context.new_page()
            
            # Navigate with sufficient timeout
            await page.goto(target_url, wait_until="domcontentloaded", timeout=60000)
            
            # Wait for Cloudflare and page render
            await asyncio.sleep(5)
            
            # Check if page loaded properly (not Cloudflare challenge)
            title = await page.title()
            if "잠시만 기다려" in title:
                # Cloudflare challenge - wait more
                await asyncio.sleep(8)
                title = await page.title()
            
            # Parse review summary from detail page
            parse_script = """
                () => {
                    let reviewCount = 0;
                    let rating = 0.0;
                    
                    // Review count from tab
                    const reviewTabEl = document.querySelector('#reviewInfo');
                    if (reviewTabEl) {
                        const m = reviewTabEl.innerText.match(/([0-9,]+)/);
                        if (m) reviewCount = parseInt(m[1].replace(/,/g, '')) || 0;
                    }
                    
                    // Also try the total count text
                    if (!reviewCount) {
                        const totalEl = document.querySelector('.repReview b') || document.querySelector('.total em');
                        if (totalEl) reviewCount = parseInt(totalEl.innerText.replace(/[^0-9]/g, '')) || 0;
                    }
                    
                    // Rating from detail page
                    const ratingEl = document.querySelector('.num strong') || document.querySelector('.prd_total_score .num strong');
                    if (ratingEl) {
                        rating = parseFloat(ratingEl.innerText.trim()) || 0.0;
                    }
                    
                    // Fallback: try the point area
                    if (!rating) {
                        const pointEl = document.querySelector('.product_rating_area .num strong');
                        if (pointEl) rating = parseFloat(pointEl.innerText.trim()) || 0.0;
                    }
                    
                    return { reviewCount, rating };
                }
            """
            data = await page.evaluate(parse_script)
            
            if data:
                result["reviewCount"] = data.get("reviewCount", 0)
                result["rating"] = data.get("rating", 0.0)
            
            # Try to click review tab and get review texts
            if result["reviewCount"] > 0:
                try:
                    review_tab = page.locator('#reviewInfo')
                    if await review_tab.count() > 0:
                        await review_tab.click()
                        await asyncio.sleep(3)
                    
                    reviews_script = """
                    () => {
                        let revs = [];
                        // Try multiple selectors for review content
                        const selectors = ['.review_cont', '.txt_inner', '.txt_cont', '.review_text'];
                        for (const sel of selectors) {
                            document.querySelectorAll(sel).forEach(r => {
                                let text = r.innerText.trim().replace(/\\s+/g, ' ');
                                if (text.length > 10 && !revs.includes(text)) revs.push(text);
                            });
                            if (revs.length > 0) break;
                        }
                        return revs.slice(0, 10);
                    }
                    """
                    reviews = await page.evaluate(reviews_script)
                    result["reviews"] = reviews or []
                except Exception:
                    pass

            await browser.close()
            
    except Exception as e:
        result["error"] = str(e)

    print(json.dumps(result, ensure_ascii=False))

if __name__ == "__main__":
    if len(sys.argv) > 1:
        asyncio.run(scrape_detail(sys.argv[1]))
    else:
        print(json.dumps({"error": "No goodsNo provided"}))
