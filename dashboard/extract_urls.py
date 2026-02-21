import re

with open("musinsa_raw.html", "r", encoding="utf-8") as f:
    html = f.read()

# find URLs in the HTML
urls = re.findall(r'https://api.musinsa.com/[^"\']+', html)
for url in set(urls):
    if 'ranking' in url or 'hm/v5' in url or 'dp/v1' in url:
        print(url)
