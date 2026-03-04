import requests
from bs4 import BeautifulSoup
import urllib.parse

def get_google_image(query):
    url = f"https://www.google.com/search?tbm=isch&q={urllib.parse.quote(query)}"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }
    r = requests.get(url, headers=headers)
    soup = BeautifulSoup(r.text, 'html.parser')
    for img in soup.find_all('img'):
        src = img.get('src')
        if src and src.startswith('http'):
            # Some images on Google's basic HTML page might be different. Let's just grab the first valid external http image.
            if 'gstatic' in src or 'google' not in src:
                return src
    return ""

print("Image URL:", get_google_image("COSRX Snail Mucin 96 Essence"))
