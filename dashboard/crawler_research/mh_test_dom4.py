import requests
from bs4 import BeautifulSoup

url = "https://www.mhmall.co.kr/shop/page.html?id=9&cate_type=modern"
headers = {"User-Agent": "Mozilla/5.0"}
r = requests.get(url, headers=headers)
r.encoding = 'euc-kr'
soup = BeautifulSoup(r.text, 'html.parser')

items = soup.find_all('div', class_=lambda c: c and 'item-cont' in c and 'product-list' in c)
print(f"Wrapper count: {len(items)}")

# Let's see if each wrapper has multiple products or if there are 50 wrappers
if items:
    # See if there's multiple LIs inside a wrapper
    print(f"LIs in first wrapper: {len(items[0].find_all('li', class_='prd-name'))}")
