import requests
from bs4 import BeautifulSoup
import json

headers = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/121.0.0.0 Safari/537.36"}

urls = {
    "Artbox": "https://www.poom.co.kr/shop/initBestShop.action",
    "Zigzag": "https://zigzag.kr/",
    "Wiggle": "https://wiggle-wiggle.com/product/list.html?cate_no=332",
    "ModernHouse": "https://www.mhmall.co.kr/shop/page.html?id=9&cate_type=modern&cate_type=modern&xcode=998&mcode=&type=&scode=&sort=&filter_keyword_ids=",
    "29CM": "https://www.29cm.co.kr/best-products?period=HOURLY&ranking=POPULARITY&gender=F&age=30",
    "Gmarket": "https://www.gmarket.co.kr/n/best?spm=gmktpc.home.0.0.5ef4486aAEHpiV"
}

for name, url in urls.items():
    print(f"\n[{name}] Testing: {url}")
    try:
        r = requests.get(url, headers=headers, timeout=10)
        print(f"Status: {r.status_code}")
        soup = BeautifulSoup(r.text, 'html.parser')
        text_preview = r.text[:200].replace('\n', ' ')
        print(f"Preview: {text_preview}")
        
        # Determine if React/Vue CSR based on body emptiness or script tags
        scripts = len(soup.find_all('script'))
        content_len = len(r.text)
        print(f"Scripts: {scripts}, HTML Length: {content_len}")
        
    except Exception as e:
        print(f"Error: {e}")
