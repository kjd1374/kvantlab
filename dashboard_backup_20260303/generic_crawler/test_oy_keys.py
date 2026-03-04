import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()
try:
    supabase = create_client(os.environ.get("SUPABASE_URL"), os.environ.get("SUPABASE_SERVICE_ROLE_KEY"))
    res = supabase.table('products_master').select('*').limit(1).execute()
    if res.data:
        print(list(res.data[0].keys()))
    else:
        print("Empty products_master")
except Exception as e:
    print("Error:", e)
