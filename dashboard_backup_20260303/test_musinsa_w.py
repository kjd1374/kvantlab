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

url_base = "https://api.musinsa.com/api2/hm/v5/pans/ranking/sections/200?storeCode=musinsa&categoryCode=003"
fetch_try(url_base + "&gender=W", "gender=W")
fetch_try(url_base + "&gf=W", "gf=W")
fetch_try(url_base + "&gf=A", "gf=A")
fetch_try(url_base + "&sex=F", "sex=F")
