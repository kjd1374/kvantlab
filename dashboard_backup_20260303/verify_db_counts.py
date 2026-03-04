import urllib.request
import json

KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhneGJsYmJqbG5zZmtmZnd2ZmFvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDA2NTY4NiwiZXhwIjoyMDc5NjQxNjg2fQ.SRxircIxDPE9Z8xElZzUFK_l9yOsjtKEoAnd7ILpKh8'

url = 'https://hgxblbbjlnsfkffwvfao.supabase.co/rest/v1/products_master?platform=eq.oliveyoung&category=eq.10000010009&select=count'
req = urllib.request.Request(url)
req.add_header('apikey', KEY)
req.add_header('Authorization', 'Bearer ' + KEY)
req.add_header('Range-Unit', 'items')
req.add_header('Prefer', 'count=exact')

try:
    with urllib.request.urlopen(req) as response:
        content_range = response.headers.get('Content-Range', '0-0/0')
        print(f"Total Mask Pack Products (10000010009) in DB: {content_range.split('/')[-1]}")
except Exception as e:
    print(f"Error: {e}")
