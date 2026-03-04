import os
import requests
from generic_crawler.config import SUPABASE_URL, HEADERS

def check_existing_reviews(source, product_id):
    url = f"{SUPABASE_URL}/rest/v1/products_master?source=eq.{source}&product_id=eq.{product_id}&select=review_count,review_rating"
    res = requests.get(url, headers=HEADERS)
    data = res.json()
    if data:
        return data[0].get('review_count', 0), data[0].get('review_rating', 0.0)
    return 0, 0.0

print(check_existing_reviews('ably', '63179596'))
