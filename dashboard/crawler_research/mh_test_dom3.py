import requests
from bs4 import BeautifulSoup

url = "https://www.mhmall.co.kr/shop/page.html?id=9&cate_type=modern"
headers = {"User-Agent": "Mozilla/5.0"}
r = requests.get(url, headers=headers)
soup = BeautifulSoup(r.text, 'html.parser')

wrappers = soup.find_all('div', class_=lambda c: c and 'item-cont' in c and 'product-list' in c)
print(f"Found {len(wrappers)} product wrappers.")

if wrappers:
    for i, w in enumerate(wrappers[:3]):
        print(f"\n--- Item {i+1} ---")
        a_tag = w.find('a', href=True)
        name_tag = w.find('li', class_='prd-name')
        price_tag = w.find('li', class_='prd-price')
        img_tag = w.find('img')
        
        href = a_tag['href'] if a_tag else "N/A"
        name = name_tag.text.strip() if name_tag else "N/A"
        price_text = price_tag.text.strip() if price_tag else "N/A"
        img_url = img_tag['src'] if img_tag else "N/A"
        
        print(f"HREF: {href}")
        print(f"NAME: {name}")
        print(f"PRICE: {price_text}")
        print(f"IMG: {img_url}")
