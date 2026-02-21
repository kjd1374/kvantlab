import fetch from 'node-fetch';

const SUPABASE_URL = 'https://hgxblbbjlnsfkffwvfao.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhneGJsYmJqbG5zZmtmZnd2ZmFvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDA2NTY4NiwiZXhwIjoyMDc5NjQxNjg2fQ.SRxircIxDPE9Z8xElZzUFK_l9yOsjtKEoAnd7ILpKh8';
const headers = { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` };

async function run() {
    // 1. Get daily_rankings_v2 for mask pack
    const res1 = await fetch(`${SUPABASE_URL}/rest/v1/daily_rankings_v2?source=eq.oliveyoung&category_code=eq.10000010009&select=product_id,rank&limit=3`, { headers });
    const rankings = await res1.json();
    console.log("Rankings for Mask Pack:", rankings);

    // 2. Fetch products using ID vs PRODUCT_ID
    const ids = rankings.map(r => r.product_id).join(',');

    // Testing product_id (WRONG)
    const res2 = await fetch(`${SUPABASE_URL}/rest/v1/products_master?product_id=in.(${ids})&select=id,product_id,name`, { headers });
    console.log("Joined via product_id:", await res2.json());

    // Testing id (CORRECT)
    const res3 = await fetch(`${SUPABASE_URL}/rest/v1/products_master?id=in.(${ids})&select=id,product_id,name`, { headers });
    console.log("Joined via id:", await res3.json());
}

run();
