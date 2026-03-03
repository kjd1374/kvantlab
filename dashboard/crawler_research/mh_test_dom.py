import requests
from bs4 import BeautifulSoup

url = "https://www.mhmall.co.kr/shop/page.html?id=9&cate_type=modern"
headers = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
}

r = requests.get(url, headers=headers)
soup = BeautifulSoup(r.text, 'html.parser')

print("Looking for items...")
# Try multiple common selectors
selectors = [
    '.item_list > li',
    'li.item',
    '.best-list li',
    '.product-list li',
    '.list-type-card li',
    '#content ul li'
]

for sel in selectors:
    items = soup.select(sel)
    print(f"Selector '{sel}': {len(items)} items found")
    if items:
        # Print a sample HTML dump of the first item
        print("\n--- Snippet of first item ---")
        print(str(items[0])[:500])
        print("-----------------------------\n")

