import requests
from bs4 import BeautifulSoup

# The site uses infinite scroll or "More" button via AJAX
url = "https://www.mhmall.co.kr/shop/brand_ajax.html"
data = {
    "action_type": "best",
    "xcode": "006", 
    "mcode": "",
    "sort": "",
    "page": "2",
    "cate_type": "modern"
}
headers = {
    "User-Agent": "Mozilla/5.0",
    "X-Requested-With": "XMLHttpRequest",
    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
}
try:
    r = requests.post(url, headers=headers, data=data)
    r.encoding = 'euc-kr'
    print(r.status_code)
    print("Response length:", len(r.text))
    if len(r.text) > 100:
        print(r.text[:500])
except Exception as e:
    print(e)
