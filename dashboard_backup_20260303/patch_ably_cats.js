import { query } from './supabase.js';

async function injectCategories() {
    console.log("Injecting Ably missing categories...");

    const newCats = [
        { platform: 'ably', category_code: 'WOMEN', name_ko: '여성패션', name_en: 'Women', depth: 1, sort_order: 1, is_active: true },
        { platform: 'ably', category_code: 'BEAUTY', name_ko: '뷰티', name_en: 'Beauty', depth: 1, sort_order: 2, is_active: true },
        { platform: 'ably', category_code: 'SHOES', name_ko: '신발', name_en: 'Shoes', depth: 1, sort_order: 3, is_active: true },
        { platform: 'ably', category_code: 'BAG', name_ko: '가방', name_en: 'Bags', depth: 1, sort_order: 4, is_active: true },
    ];

    // Using native fetch
    const SUPABASE_URL = 'https://hgxblbbjlnsfkffwvfao.supabase.co';
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhneGJsYmJqbG5zZmtmZnd2ZmFvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDA2NTY4NiwiZXhwIjoyMDc5NjQxNjg2fQ.SRxircIxDPE9Z8xElZzUFK_l9yOsjtKEoAnd7ILpKh8';
    const headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
    };

    const url = `${SUPABASE_URL}/rest/v1/categories?on_conflict=platform,category_code`;

    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(newCats)
        });

        if (res.ok) {
            console.log("Successfully upserted Ably categories.");
        } else {
            console.error("Failed to upsert:", await res.text());
        }
    } catch (e) {
        console.error("Error:", e);
    }
}
injectCategories();
