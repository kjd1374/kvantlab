const SUPABASE_URL = 'https://hgxblbbjlnsfkffwvfao.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhneGJsYmJqbG5zZmtmZnd2ZmFvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDA2NTY4NiwiZXhwIjoyMDc5NjQxNjg2fQ.SRxircIxDPE9Z8xElZzUFK_l9yOsjtKEoAnd7ILpKh8';

async function query(table, params = '') {
    const url = `${SUPABASE_URL}/rest/v1/${table}?${params}`;
    const headers = { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Prefer': 'count=exact' };
    const res = await fetch(url, { headers });
    const jsonData = await res.json();
    const count = res.headers.get('content-range');
    return { data: jsonData, count: count ? parseInt(count.split('/')[1]) : jsonData.length, range: count };
}

async function test() {
    console.log("--- Test: No Filters ---");
    let res = await query('products_master', 'source=eq.musinsa&limit=20');
    console.log("Count:", res.count, "Data Length:", res.data.length, "Range:", res.range);

    console.log("\n--- Test: With Category Filter (상의) ---");
    // Let's assume '상의' is the resolved name
    let resCat = await query('products_master', `source=eq.musinsa&category=ilike.*상의*&limit=20`);
    console.log("Count:", resCat.count, "Data Length:", resCat.data.length, "Range:", resCat.range);

    console.log("\n--- Test: With Gender Filter (female) ---");
    let resGender = await query('products_master', `source=eq.musinsa&tags->>gender=eq.female&limit=20`);
    console.log("Count:", resGender.count, "Data Length:", resGender.data.length, "Range:", resGender.range);

    if (resGender.data.length > 0) {
        console.log("First Gender Match Tags:", resGender.data[0].tags);
    }
}

test();
