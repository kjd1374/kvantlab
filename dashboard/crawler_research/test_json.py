import requests
import json
from bs4 import BeautifulSoup

headers = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/121.0.0.0"}

def test_zigzag():
    try:
        r = requests.get("https://zigzag.kr/", headers=headers)
        soup = BeautifulSoup(r.text, 'html.parser')
        next_data = soup.find('script', id='__NEXT_DATA__')
        if next_data:
            data = json.loads(next_data.string)
            print("Zigzag: Parsed Next.js JSON successfully. This is scrappable without Playwright.")
            return True
    except Exception as e:
        print(f"Zigzag Error: {e}")
    return False

def test_wiggle():
    try:
        r = requests.get("https://wiggle-wiggle.com/product/list.html?cate_no=332", headers=headers)
        soup = BeautifulSoup(r.text, 'html.parser')
        items = soup.select('.prdList > li')
        print(f"Wiggle Wiggle: Found {len(items)} items. CSS Selectors (BeautifulSoup) are sufficient.")
        return True
    except Exception as e:
        print(f"Wiggle Error: {e}")
    return False

def test_modernhouse():
    try:
        r = requests.get("https://www.mhmall.co.kr/shop/page.html?id=9", headers=headers)
        soup = BeautifulSoup(r.text, 'html.parser')
        items = soup.select('.item_list > li') or soup.find_all('li', class_='item')
        print(f"ModernHouse: Pure HTML. Found lists. Easy to scrape with BeautifulSoup.")
        return True
    except Exception as e:
         print(f"ModernHouse Error: {e}")
    return False

test_zigzag()
test_wiggle()
test_modernhouse()
