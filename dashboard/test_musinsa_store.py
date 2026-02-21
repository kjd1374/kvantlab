import requests

headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
}

def fetch_musinsa(store_code, cat):
    url = f"https://api.musinsa.com/api2/hm/v5/pans/ranking/sections/200?storeCode={store_code}&categoryCode={cat}"
    print(f"\n--- Store Code: {store_code}, Category: {cat} ---")
    try:
        res = requests.get(url, headers=headers)
        data = res.json()
        modules = data.get("data", {}).get("modules", [])
        if not modules:
            print("No modules returned.", res.status_code)
            return

        for module in modules:
            for item in module.get("items", [])[:3]:
                if item.get("type") == "PRODUCT_COLUMN":
                    print(item.get("info", {}).get("brandName"), "-", item.get("info", {}).get("productName"))
    except Exception as e:
        print("Error:", e)

fetch_musinsa('musinsa', '003')
fetch_musinsa('wusinsa', '003')
fetch_musinsa('musinsa', '020') # Dresses
fetch_musinsa('wusinsa', '020') # Dresses

