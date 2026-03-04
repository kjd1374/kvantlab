import requests
import json

headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
}

def fetch_musinsa(gender, cat):
    url = f"https://api.musinsa.com/api2/hm/v5/pans/ranking/sections/200?storeCode=musinsa&categoryCode={cat}&gender={gender}"
    print(f"\n--- Fetching Gender: {gender}, Category: {cat} ---")
    response = requests.get(url, headers=headers)
    data = response.json()
    modules = data.get("data", {}).get("modules", [])
    for module in modules:
        for item in module.get("items", [])[:3]:
            if item.get("type") == "PRODUCT_COLUMN":
                print(item.get("info", {}).get("brandName"), "-", item.get("info", {}).get("productName"))

fetch_musinsa('M', '003')
fetch_musinsa('F', '003')
