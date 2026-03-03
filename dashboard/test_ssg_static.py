import requests
from bs4 import BeautifulSoup
import re

url = "https://www.ssg.com/item/itemView.ssg?itemId=1000038302946"
headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8"
}

res = requests.get(url, headers=headers)
print("Status:", res.status_code)

if res.status_code == 200:
    soup = BeautifulSoup(res.text, 'html.parser')
    text = soup.get_text(separator=' | ', strip=True)
    
    # Dump 100 chars around references to 리뷰, 평가, 평점
    for keyword in ['리뷰', '평가', '평점', '만족도', '별점']:
        matches = re.finditer(f'.{{0,40}}{keyword}.{{0,40}}', text)
        for i, m in enumerate(matches):
            if i < 5:
                print(f"[{keyword}] {m.group(0)}")
                
    # Check specific SSG review structures
    areas = soup.select('.cdtl_tab_item_count, .cdtl_eval_score, .cdtl_review_count, .cdtl_side_point')
    if areas:
        for a in areas:
            print("Class match:", a.get('class'), "->", a.text)
            
    print("\nCheck window.__PRELOADED_STATE__ in SSG:")
    scripts = soup.select('script')
    for s in scripts:
        if s.string and '__PRELOADED_STATE__' in s.string:
            print("Found preloaded state string len:", len(s.string))
            m = re.search(r'\"reviewCnt\"\s*:\s*([0-9]+)', s.string)
            if m: print("Found reviewCnt:", m.group(1))
            m2 = re.search(r'\"evalSum\"\s*:\s*([0-9.]+)', s.string)
            if m2: print("Found evalSum:", m2.group(1))
            m3 = re.search(r'\"rating\"\s*:\s*([0-9.]+)', s.string)
            if m3: print("Found rating:", m3.group(1))
