const SUPABASE_URL = 'https://hgxblbbjlnsfkffwvfao.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhneGJsYmJqbG5zZmtmZnd2ZmFvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDA2NTY4NiwiZXhwIjoyMDc5NjQxNjg2fQ.SRxircIxDPE9Z8xElZzUFK_l9yOsjtKEoAnd7ILpKh8';

async function query(table, params = '') {
    const url = `${SUPABASE_URL}/rest/v1/${table}?${params}`;
    const headers = { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` };
    const res = await fetch(url, { headers });
    return await res.json();
}

async function testFetch() {
    // 1. Find the product
    console.log("Finding product...");
    const products = await query('products_master', 'name=ilike.*기미*세럼*&select=id,name');
    if (!products || products.length === 0) {
        console.log("Product not found via API, grabbing latest products to find a valid one...");
        const fallback = await query('products_master', 'limit=5&order=created_at.desc&select=id,name');
        console.log("Fallback:", fallback);
        return;
    }

    const product = products[0];
    const productId = product.id;
    console.log(`Found Product: ${product.name} (ID: ${productId})`);

    // 2. Simulate fetchProductHistory
    let days = 30; // default view
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - parseInt(days));
    const dateStr = startDate.toISOString().split('T')[0];
    const dateFilterRank = `&date=gte.${dateStr}`;
    const dateFilterPrice = `&snapshot_date=gte.${dateStr}`;

    const ranksQuery = `select=rank,date,created_at&product_id=eq.${productId}${dateFilterRank}&order=created_at.asc`;
    console.log("Ranks Query:", ranksQuery);
    const ranks = await query('daily_rankings_v2', ranksQuery);

    const prices = await query('deals_snapshots', `select=deal_price,original_price,snapshot_date&product_id=eq.${productId}${dateFilterPrice}&order=snapshot_date.asc`);

    const mappedRanks = (ranks || []).map(r => ({
        timestamp: r.created_at || `${r.date}T00:00:00.000Z`,
        rank: r.rank
    }));

    const mappedPrices = (prices || []).map(p => ({
        timestamp: p.created_at || `${p.snapshot_date}T00:00:00.000Z`,
        price: p.deal_price,
        original_price: p.original_price
    }));

    // 3. Simulate process for unified timestamps
    const parseTs = (ts) => new Date(ts).getTime();

    const validRanks = mappedRanks.filter(r => r.timestamp && !isNaN(parseTs(r.timestamp)));
    const validPrices = mappedPrices.filter(p => p.timestamp && !isNaN(parseTs(p.timestamp)));

    let allTimestamps = [...validRanks.map(r => r.timestamp), ...validPrices.map(p => p.timestamp)];
    const uniqueMap = new Map();
    allTimestamps.forEach(ts => uniqueMap.set(parseTs(ts), ts));
    const sortedTimestamps = Array.from(uniqueMap.values()).sort((a, b) => parseTs(a) - parseTs(b));

    console.log("validRanks count:", validRanks.length);
    console.log("validPrices count:", validPrices.length);
    console.log("sortedTimestamps:", sortedTimestamps);
}

testFetch();
