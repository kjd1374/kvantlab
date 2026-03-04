import requests

headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
}

def fetch_try(url, desc):
    print(f"\n--- {desc} ---")
    try:
        res = requests.get(url, headers=headers)
        if res.status_code == 200:
            data = res.json()
            modules = data.get("data", {}).get("modules", [])
            for module in modules:
                for item in module.get("items", [])[:3]:
                    if item.get("type") == "PRODUCT_COLUMN":
                        print(item.get("info", {}).get("brandName"), "-", item.get("info", {}).get("productName"))
        else:
            print(f"Failed: {res.status_code}")
    except Exception as e:
        print("Error:", e)

# Test 1: gf=F
fetch_try("https://api.musinsa.com/api2/hm/v5/pans/ranking/sections/200?storeCode=musinsa&categoryCode=003&gf=F", "sections/200 gf=F")
fetch_try("https://api.musinsa.com/api2/hm/v5/pans/ranking/sections/200?storeCode=musinsa&categoryCode=003&gf=M", "sections/200 gf=M")
fetch_try("https://api.musinsa.com/api2/hm/v5/pans/ranking?storeCode=musinsa&categoryCode=003&gf=F", "base ranking gf=F")
fetch_try("https://api.musinsa.com/api2/hm/v5/pans/ranking?storeCode=musinsa&categoryCode=003&gf=M", "base ranking gf=M")
