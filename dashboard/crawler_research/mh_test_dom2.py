import requests
from bs4 import BeautifulSoup

url = "https://www.mhmall.co.kr/shop/page.html?id=9&cate_type=modern"
headers = {"User-Agent": "Mozilla/5.0"}

r = requests.get(url, headers=headers)
soup = BeautifulSoup(r.text, 'html.parser')

# Find all links that go to a product detail page (usually contains 'branduid=')
product_links = soup.find_all('a', href=lambda href: href and 'branduid=' in href)
print(f"Found {len(product_links)} product links.")

if product_links:
    for i, a in enumerate(product_links[:3]): # Examine first 3
        print(f"\n--- Link {i+1} ---")
        print(f"HREF: {a['href']}")
        # Find the parent wrapper of this link
        parent_li = a.find_parent('li')
        parent_div = a.find_parent('div')
        if parent_li:
             print(f"Parent LI class: {parent_li.get('class')}")
        if parent_div:
             print(f"Parent DIV class: {parent_div.get('class')}")
