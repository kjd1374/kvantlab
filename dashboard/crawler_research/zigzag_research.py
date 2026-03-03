import requests
import json

# Common Zigzag API structure for best products
# Often it takes a category_id and other filters
url = "https://api.zigzag.kr/api/2/best/products"
params = {
    "limit": "50",
}
headers = {
    "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
    "Origin": "https://zigzag.kr",
    "Referer": "https://zigzag.kr/best",
}

print(f"Testing API: {url}")
try:
    r = requests.get(url, headers=headers, params=params, timeout=10)
    print("Status:", r.status_code)
    if r.status_code == 200:
        data = r.json()
        print("Successfully fetched JSON from API!")
        with open('crawler_research/zigzag_api_sample.json', 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        
        if 'items' in data:
            print(f"Found {len(data['items'])} items.")
        elif 'data' in data and 'items' in data['data']:
            print(f"Found {len(data['data']['items'])} items.")
            
    else:
        print("API failed or returned nothing.")
        print(r.text[:200])
except Exception as e:
    print(f"Error: {e}")
