import json

try:
    with open('musinsa_next_data.json', encoding='utf-8') as f:
        d = json.load(f)
    
    data = d.get('props', {}).get('pageProps', {}).get('data', {})
    print("Data keys:", list(data.keys()))
    if 'modules' in data:
        print("Found modules in data! Size:", len(data['modules']))
        for module in data['modules']:
            print("Module type:", module.get("type"))
            
            # Let's see if there are API URLs linked to these modules
            if 'apiUrl' in str(module):
                # crude way to find urls
                import re
                print("URLs in module:", re.findall(r'https?://[^\'"]+', str(module)))
                
except Exception as e:
    print("Error:", e)
