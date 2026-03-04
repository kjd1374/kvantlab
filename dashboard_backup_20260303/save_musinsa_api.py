
import requests
import json

url = "https://api.musinsa.com/api2/hm/v5/pans/ranking?storeCode=musinsa"
headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
}

try:
    response = requests.get(url, headers=headers)
    response.raise_for_status()
    data = response.json()
    
    with open("musinsa_api_response.json", "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print("Saved response to musinsa_api_response.json")
    
except Exception as e:
    print(f"API Request Failed: {e}")
