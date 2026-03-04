import { query } from './supabase.js';

async function debugMusinsaQuery() {
    try {
        console.log("--- Testing Musinsa Fallback Query ---");
        const category = "바지";
        const params = `select=id,category,name&source=eq.musinsa&category=ilike.*${encodeURIComponent(category)}*`;
        console.log("Query params:", params);

        const res = await query('products_master', params);
        console.log(`Results count for '${category}':`, res.data.length);
        if (res.data.length > 0) {
            console.log("Sample:", res.data[0]);
        }

    } catch (e) {
        console.error("Error:", e);
    }
}

debugMusinsaQuery();
