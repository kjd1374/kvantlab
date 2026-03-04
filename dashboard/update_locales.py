import os
import json

locales_dir = "public/locales"
dist_locales_dir = "dist/locales"

translations = {
    "en": "Modern House",
    "ko": "모던하우스",
    "vi": "Modern House",
    "th": "Modern House",
    "id": "Modern House",
    "ja": "モダンハウス"
}

for d in [locales_dir, dist_locales_dir]:
    if not os.path.exists(d):
        continue
    for root, _, files in os.walk(d):
        for f in files:
            if f.endswith('.json'):
                path = os.path.join(root, f)
                lang = f.split('.')[0]
                with open(path, 'r', encoding='utf-8') as file:
                    try:
                        data = json.load(file)
                    except Exception as e:
                        continue
                
                if 'platforms' not in data:
                    data['platforms'] = {}
                data['platforms']['modernhouse'] = translations.get(lang, "Modern House")

                with open(path, 'w', encoding='utf-8') as file:
                    json.dump(data, file, ensure_ascii=False, indent=2)
                print(f"Updated {path}")
