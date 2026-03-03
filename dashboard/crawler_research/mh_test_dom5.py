import requests
from bs4 import BeautifulSoup

url = "https://www.mhmall.co.kr/shop/page.html?id=9&cate_type=modern"
headers = {"User-Agent": "Mozilla/5.0"}
r = requests.get(url, headers=headers)
r.encoding = 'euc-kr'
soup = BeautifulSoup(r.text, 'html.parser')

wrapper = soup.find('div', class_=lambda c: c and 'item-cont' in c and 'product-list' in c)
if wrapper:
    # Try different child elements that might denote an item
    for tag in ['dl', 'div', 'ul', 'li']:
         items = wrapper.find_all(tag, recursive=False)
         print(f"Direct {tag} children: {len(items)}")
    
    # Try finding elements that have a branduid link
    items_with_link = []
    for item in wrapper.find_all(lambda tag: tag.name in ['dl', 'div', 'li'] and tag.find('a', href=lambda h: h and 'branduid=' in h)):
         items_with_link.append(item)
    print(f"Elements with branduid links inside wrapper: {len(items_with_link)}")
    
    # Let's inspect the first element with a branduid
    if items_with_link:
         first = items_with_link[0]
         print(f"\nType: {first.name}, Class: {first.get('class')}")
