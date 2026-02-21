import requests

headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
}

for i in range(200, 205):
    url = f"https://api.musinsa.com/api2/hm/v5/pans/ranking/sections/{i}?storeCode=musinsa&categoryCode=003"
    try:
        res = requests.get(url, headers=headers)
        data = res.json()
        modules = data.get("data", {}).get("modules", [])
        if not modules:
            print(f"Section {i}: No modules")
            continue
            
        print(f"\n--- Section {i} ---")
        for module in modules:
            for item in module.get("items", [])[:3]:
                if item.get("type") == "PRODUCT_COLUMN":
                    print(item.get("info", {}).get("brandName"), "-", item.get("info", {}).get("productName"))
    except Exception as e:
        print(f"Section {i} Error:", e)

