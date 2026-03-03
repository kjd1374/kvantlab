import requests
from bs4 import BeautifulSoup
import json
import re

headers = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8",
}

def check_html(name, url):
    print(f"\n--- {name} Deep Dive ---")
    try:
        r = requests.get(url, headers=headers)
        if r.status_code == 200:
            soup = BeautifulSoup(r.text, 'html.parser')
            # Look for common item list containers or Next.js DATA props
            next_data = soup.find('script', id='__NEXT_DATA__')
            if next_data:
                print(f"[+] Found __NEXT_DATA__ JSON blob. Length: {len(next_data.string)}")
            
            # Look for general JSON blobs embedded in scripts
            json_blobs = re.findall(r'window\.__PRELOADED_STATE__\s*=\s*({.*?});', r.text)
            if json_blobs:
                print(f"[+] Found __PRELOADED_STATE__, length: {len(json_blobs[0])}")
                
            json_blobs2 = re.findall(r'window\.INITIAL_DATA\s*=\s*({.*?});', r.text)
            if json_blobs2:
                print(f"[+] Found INITIAL_DATA, length: {len(json_blobs2[0])}")
            
            # Check for pure HTML list items
            li_tags = soup.find_all('li')
            print(f"[*] Found {len(li_tags)} <li> tags")
            
            # Identify standard product wrappers
            product_divs = soup.find_all('div', class_=re.compile(r'item|product|goods|list', re.I))
            print(f"[*] Found {len(product_divs)} potential product <div> tags")
            
        else:
             print(f"[-] HTTP {r.status_code}")
             
    except Exception as e:
        print(f"Error: {e}")

check_html("Artbox", "https://www.poom.co.kr/shop/initBestShop.action")
check_html("Zigzag", "https://zigzag.kr/")
check_html("Wiggle Wiggle", "https://wiggle-wiggle.com/product/list.html?cate_no=332")
check_html("ModernHouse", "https://www.mhmall.co.kr/shop/page.html?id=9")
check_html("29CM", "https://www.29cm.co.kr/best-products?period=HOURLY&ranking=POPULARITY&gender=F&age=30")
