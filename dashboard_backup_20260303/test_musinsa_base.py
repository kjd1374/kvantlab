import requests
import json

headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
}

def fetch_musinsa_base(gender, cat):
    # Try different combinations
    url = f"https://api.musinsa.com/api2/hm/v5/pans/ranking?storeCode=musinsa&categoryCode={cat}&gender={gender}"
    print(f"\n--- Fetching Base Gender: {gender}, Category: {cat} ---")
    response = requests.get(url, headers=headers)
    
    if response.status_code == 200:
        data = response.json()
        modules = data.get("data", {}).get("modules", [])
        for module in modules:
            print("Module type:", module.get("type"), module.get("title"))
            for item in module.get("items", [])[:1]:
                if item.get("type") == "PRODUCT_COLUMN":
                    print(item.get("info", {}).get("brandName"), "-", item.get("info", {}).get("productName"))
    elif response.status_code == 404:
        # maybe another endpoint
        url2 = f"https://api.musinsa.com/api2/dp/v1/ranking/goods?storeCode=musinsa&categoryCode={cat}&gender={gender}"
        print(f"Trying url2: {url2}")
        res2 = requests.get(url2, headers=headers)
        if res2.status_code == 200:
            print(res2.json().get('data', {}).get('goodsList', [])[:1])
            
fetch_musinsa_base('F', '003')
fetch_musinsa_base('M', '003')
