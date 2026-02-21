import requests
import json
import time

headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
}

best_section = -1
max_women_count = 0

print("Testing sections for Women's pants...")
for i in range(190, 220):
    url = f"https://api.musinsa.com/api2/hm/v5/pans/ranking/sections/{i}?storeCode=musinsa&categoryCode=003"
    try:
        res = requests.get(url, headers=headers)
        if res.status_code == 200:
            data = res.json()
            text_data = json.dumps(data, ensure_ascii=False)
            women_count = text_data.count("우먼") + text_data.count("여성")
            if women_count > 0:
                print(f"Section {i}: Found {women_count} women keywords")
                if women_count > max_women_count:
                    max_women_count = women_count
                    best_section = i
        else:
            print(f"Section {i}: Failed {res.status_code}")
    except Exception as e:
        pass
    time.sleep(0.1)

print(f"\nBest section for Women's pants: {best_section} with {max_women_count} keywords")
