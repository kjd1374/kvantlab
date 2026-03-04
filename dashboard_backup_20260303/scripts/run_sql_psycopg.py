import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()
db_url = os.environ.get("VITE_SUPABASE_DB_URL")
with open('scripts/setup_naver_best.sql', 'r') as f:
    sql = f.read()

conn = psycopg2.connect(db_url)
conn.autocommit = True
cur = conn.cursor()
cur.execute(sql)
print("SQL executed successfully.")
