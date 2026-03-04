import requests
from bs4 import BeautifulSoup
import json

headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
}

try:
    url = "https://www.musinsa.com/main/ranking?gender=F&categoryCode=003"
    res = requests.get(url, headers=headers)
    
    # Try to find Next.js __NEXT_DATA__ or similar script tag
    soup = BeautifulSoup(res.text, 'html.parser')
    scripts = soup.find_all('script')
    found = False
    for script in scripts:
        if script.string and ('__NEXT_DATA__' in script.string or 'window.__INITIAL_STATE__' in script.string or 'apolloState' in script.string):
            print("Found state script! Length:", len(script.string))
            found = True
            with open("musinsa_html_state.txt", "w", encoding="utf-8") as f:
                f.write(script.string)
            break
            
    if not found:
        print("Could not find state script. Saving raw HTML.")
        with open("musinsa_raw.html", "w", encoding="utf-8") as f:
            f.write(res.text)
            
except Exception as e:
    print("Error:", e)
