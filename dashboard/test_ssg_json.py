import re
import json
from bs4 import BeautifulSoup

html_code = open('ssg_detail_debug.html', 'r', encoding='utf-8').read()
soup = BeautifulSoup(html_code, 'html.parser')

print("--- Searching for specific SSG objects ---")
for s in soup.find_all('script'):
    if not s.string: continue
    
    # 1. Look for _itemTgtData
    m1 = re.search(r'var\s+_itemTgtData\s*=\s*(\{.*?\});', s.string, re.DOTALL)
    if m1:
        try:
            data = json.loads(m1.group(1).replace("'", '"'))
            print("_itemTgtData keys:", data.keys())
            for k,v in data.items():
                if 'review' in k.lower() or 'eval' in k.lower() or 'cnt' in k.lower():
                    print(f"  {k} = {v}")
        except:
            print("_itemTgtData (raw):", m1.group(1)[:200])

    # 2. Look for eDatalayer
    m2 = re.search(r'var\s+eDatalayer\s*=\s*(\{.*?\});', s.string, re.DOTALL)
    if m2:
        print("eDatalayer found:", m2.group(1)[:200])
        
    # 3. Look for any object containing evalSum
    m3 = re.search(r'evalSum.*?:.*?[0-9]', s.string)
    if m3:
        print("Found evalSum anywhere:", m3.group(0))

    # 4. Search for window.__PRELOADED_STATE__
    if '__PRELOADED_STATE__' in s.string:
        m4 = re.search(r'window\.__PRELOADED_STATE__\s*=\s*({.*});', s.string)
        if m4:
             state = json.loads(m4.group(1))
             print("Found PRELOADED STATE. Keys:", state.keys())
             if 'item' in state:
                 print("Item data:", {k:v for k,v in state['item'].items() if 'review' in k.lower()})
