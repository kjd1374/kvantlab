import requests

headers = {
    "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
    "Origin": "https://m.a-bly.com",
    "Referer": "https://m.a-bly.com/"
}

try:
    response = requests.get("https://api.a-bly.com/api/v2/home/categories", headers=headers)
    print("Status:", response.status_code)
    data = response.json()
    
    cats = data.get('categories', [])
    for c in cats:
        print(f"[{c.get('sno')}] {c.get('name')}")
except Exception as e:
    print("Error:", e)
