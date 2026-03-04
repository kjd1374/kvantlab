import requests
from bs4 import BeautifulSoup
import re

headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
}

try:
    res = requests.get("https://www.musinsa.com/main/musinsa", headers=headers)
    soup = BeautifulSoup(res.text, 'html.parser')
    links = set()
    for a in soup.find_all('a', href=True):
        href = a['href']
        if href.startswith('http') or href.startswith('/'):
            links.add(href)
    with open("musinsa_links.txt", "w", encoding="utf-8") as f:
        for link in sorted(list(links)):
            f.write(link + "\n")
    print(f"Saved {len(links)} links to musinsa_links.txt")
except Exception as e:
    print("Error:", e)
