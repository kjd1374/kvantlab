import requests
import re
r = requests.get("https://www.mhmall.co.kr/shop/page.html?id=9")
matches = re.finditer(r'<a[^>]+href="([^"]+cate_type=[^"]+)"[^>]*>([^<]+)</a>', r.text)
for m in matches:
    print(f"[{m.group(2).strip()}] {m.group(1)}")
