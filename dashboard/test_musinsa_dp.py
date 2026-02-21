import requests

headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
}

url = "https://api.musinsa.com/api2/dp/v1/ranking/goods?storeCode=musinsa&categoryCode=003&gf=F"
res = requests.get(url, headers=headers)
print("Status:", res.status_code)
print("Response:", res.text[:500])
