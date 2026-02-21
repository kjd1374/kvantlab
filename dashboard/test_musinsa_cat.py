import requests

headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
}

def fetch_try(url, desc):
    print(f"\n--- {desc} ({url}) ---")
    try:
        res = requests.get(url, headers=headers)
        if res.status_code == 200:
            data = res.json()
            modules = data.get("data", {}).get("modules", [])
            items_found = False
            for module in modules:
                for item in module.get("items", [])[:3]:
                    if item.get("type") == "PRODUCT_COLUMN":
                        items_found = True
                        print(item.get("info", {}).get("brandName"), "-", item.get("info", {}).get("productName"))
            if not items_found:
                 print("No product modules found")
        else:
            print(f"Failed: {res.status_code}")
    except Exception as e:
        print("Error:", e)

# Test category paths
fetch_try("https://api.musinsa.com/api2/hm/v5/pans/ranking/category?storeCode=musinsa&categoryCode=003&gf=F", "category gf=F")
fetch_try("https://api.musinsa.com/api2/hm/v5/pans/ranking/categories/003?storeCode=musinsa&gf=F", "categories/003 gf=F")
fetch_try("https://api.musinsa.com/api2/dp/v1/ranking/goods?categoryCode=003&gf=F", "dp ranking goods gf=F")
