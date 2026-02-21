import urllib.request

KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhneGJsYmJqbG5zZmtmZnd2ZmFvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDA2NTY4NiwiZXhwIjoyMDc5NjQxNjg2fQ.SRxircIxDPE9Z8xElZzUFK_l9yOsjtKEoAnd7ILpKh8'

url = 'https://hgxblbbjlnsfkffwvfao.supabase.co/rest/v1/categories?platform=eq.oliveyoung&category_code=eq.10000010005'
req = urllib.request.Request(url, method='DELETE')
req.add_header('apikey', KEY)
req.add_header('Authorization', 'Bearer ' + KEY)

try:
    with urllib.request.urlopen(req) as response:
        print(f"Status: {response.status}")
        print("Duplicate 'Makeup' Category successfully deleted.")
except Exception as e:
    print(f"Error: {e}")
