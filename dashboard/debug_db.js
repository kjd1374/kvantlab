
const SUPABASE_URL = 'https://hgxblbbjlnsfkffwvfao.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhneGJsYmJqbG5zZmtmZnd2ZmFvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDA2NTY4NiwiZXhwIjoyMDc5NjQxNjg2fQ.SRxircIxDPE9Z8xElZzUFK_l9yOsjtKEoAnd7ILpKh8';

const headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'count=exact'
};

async function query(table, params = '') {
    const url = `${SUPABASE_URL}/rest/v1/${table}?${params}`;
    console.log(`Querying: ${url}`);
    const res = await fetch(url, { headers });
    if (!res.ok) {
        console.error(`Error querying ${table}: ${res.status} ${await res.text()}`);
        return { data: null, count: 0 };
    }
    const count = res.headers.get('content-range');
    const data = await res.json();
    return { data, count: count ? parseInt(count.split('/')[1]) : data.length };
}

async function fetchProductCount() {
    const url = `${SUPABASE_URL}/rest/v1/products_master?select=id&limit=1`;
    try {
        const res = await fetch(url, { headers: { ...headers, 'Prefer': 'count=exact', 'Range': '0-0' } });
        if (!res.ok) {
            console.error(`FetchProductCount Error: ${res.status} ${await res.text()}`);
            return -1;
        }
        const range = res.headers.get('content-range');
        return range ? parseInt(range.split('/')[1]) : 0;
    } catch (e) {
        console.error("FetchProductCount Exception:", e);
        return -1;
    }
}

async function fetchRankedProducts(categoryCode) {
    console.log(`Fetching ranked products for category: ${categoryCode}`);
    // Step 1: get latest date
    const dateQuery = `select=date&category_code=eq.${categoryCode}&order=date.desc&limit=1`;
    const dateResult = await query('daily_rankings_v2', dateQuery);
    const latestDate = dateResult.data?.[0]?.date;

    console.log(`Latest date for ${categoryCode}: ${latestDate}`);
    if (!latestDate) return { data: [], count: 0 };

    // Step 2: get rankings
    const rankQuery = `select=rank,product_id&category_code=eq.${categoryCode}&date=eq.${latestDate}&order=rank.asc&limit=5`;
    const rankResult = await query('daily_rankings_v2', rankQuery);
    console.log(`Rankings found: ${rankResult.data ? rankResult.data.length : 0}`);
    return rankResult;
}

async function runDebug() {
    console.log("--- Starting Debug ---");

    // Check products_master fallback query
    console.log("Checking products_master simple fallback...");
    const pResult = await query('products_master', 'select=id,name,created_at&source=eq.oliveyoung&order=created_at.desc&limit=3');

    // Check ranking_products_v2 columns
    console.log("Checking ranking_products_v2 schema...");
    const rResult = await query('ranking_products_v2', 'select=*&limit=1');
    if (rResult.data && rResult.data.length > 0) {
        console.log("ranking_products_v2 columns:", Object.keys(rResult.data[0]));
    }

    if (pResult.data && pResult.data.length > 0) {
        console.log("Fallback query successful, found:", pResult.data.length);
        console.log("Latest product:", pResult.data[0].name);
    } else {
        console.log("Fallback query failed or empty");
        if (pResult.error) console.error(pResult.error);
    }

    // Check for backup tables
    console.log("Checking daily_rankings (v1)...");
    const v1Result = await query('daily_rankings', 'select=count&limit=1', { headers: { ...headers, 'Prefer': 'count=exact' } });
    console.log("daily_rankings v1 count:", v1Result.count || 0);

    if (pResult.data && pResult.data.length > 0) {
        console.log("Found valid categories:", pResult.data.map(p => p.category));
    } else {
        console.log("No valid category data found for oliveyoung!");
        // Check if there is ANY data for oliveyoung
        const anyResult = await query('products_master', 'select=count&source=eq.oliveyoung');
        console.log("Total oliveyoung products:", anyResult.count);
    }

    console.log("--- End Debug ---");
}

runDebug();


async function testExactFallback() { console.log('--- EXACT FALLBACK TEST ---'); const res = await query('products_master', 'select=*&source=eq.oliveyoung&order=created_at.desc&limit=20&offset=0'); console.log('Result status:', res.data ? 'SUCCESS' : 'FAIL'); } testExactFallback();