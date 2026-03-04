import json
import re

with open("musinsa_raw.html", "r", encoding="utf-8") as f:
    html = f.read()

# Find window.__NEXT_DATA__ or window.__INITIAL_STATE__
match = re.search(r'window\.__NEXT_DATA__\s*=\s*({.*?});', html, re.DOTALL)
if match:
    data = json.loads(match.group(1))
    with open("musinsa_next_data.json", "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print("Saved __NEXT_DATA__ to musinsa_next_data.json")
else:
    print("Could not find __NEXT_DATA__")
    match2 = re.search(r'id="__NEXT_DATA__"\s*type="application/json">([^<]+)</script>', html)
    if match2:
        data = json.loads(match2.group(1))
        with open("musinsa_next_data.json", "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print("Saved __NEXT_DATA__ script payload")
    else:
        # maybe window.apolloState
        match3 = re.search(r'window\.__APOLLO_STATE__\s*=\s*({.*?});', html, re.DOTALL)
        if match3:
            print("Found Apollo state")
        else:
            print("Could not find NEXT_DATA script tag either.")
