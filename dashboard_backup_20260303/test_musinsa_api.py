import requests
import json

categories = ['001', '003', '020']
headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
}

for cat in categories:
    url = f"https://api.musinsa.com/api2/hm/v5/pans/ranking/sections/200?storeCode=musinsa&categoryCode={cat}&gender=M"
    try:
        response = requests.get(url, headers=headers)
        if response.status_code == 200:
            data = response.json()
            modules = data.get("data", {}).get("modules", [])
            items_to_process = []
            for module in modules:
                items = module.get("items", [])
                for item in items:
                    if item.get("type") == "PRODUCT_COLUMN":
                        items_to_process.append(item)
            print(f"Category {cat} fetched {len(items_to_process)} items")
        else:
            print(f"Category {cat} failed with {response.status_code}")
    except Exception as e:
        print(f"API Request Failed: {e}")
