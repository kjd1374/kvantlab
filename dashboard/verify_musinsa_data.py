
import os
from supabase import create_client, Client

SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://hgxblbbjlnsfkffwvfao.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhneGJsYmJqbG5zZmtmZnd2ZmFvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDA2NTY4NiwiZXhwIjoyMDc5NjQxNjg2fQ.SRxircIxDPE9Z8xElZzUFK_l9yOsjtKEoAnd7ILpKh8")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

try:
    response = supabase.table('products_master').select('*', count='exact').eq('source', 'musinsa').execute()
    count = response.count
    print(f"Total Musinsa Products in DB: {count}")
    
    if count > 0:
        print("Verification SUCCESS: Musinsa data exists.")
        
        # Check Ranking
        rank_res = supabase.table('daily_rankings_v2').select('*', count='exact').eq('source', 'musinsa').execute()
        print(f"Total Rank Entries: {rank_res.count}")
    else:
        print("Verification FAILED: No Musinsa data found.")

except Exception as e:
    print(f"Error: {e}")
