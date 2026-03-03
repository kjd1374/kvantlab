import requests
from bs4 import BeautifulSoup

url = "https://www.mhmall.co.kr/shop/page.html?id=9&cate_type=modern&page=2"
headers = {"User-Agent": "Mozilla/5.0"}
r = requests.get(url, headers=headers)
r.encoding = 'euc-kr'
soup = BeautifulSoup(r.text, 'html.parser')
items = soup.find_all('dl', class_=lambda c: c and 'item-list' in c)
print(f"Page 2 items: {len(items)}")
