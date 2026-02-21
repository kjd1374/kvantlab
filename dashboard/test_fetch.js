import { fetchRankedProducts } from './supabase.js';

async function testFetch() {
    try {
        console.log("--- Testing fetchRankedProducts from supabase.js ---");
        const res = await fetchRankedProducts({
            page: 1,
            perPage: 20,
            search: '',
            categoryCode: '003',
            platform: 'musinsa',
            gender: undefined
        });

        console.log(`Fallback Result Count: ${res.count}`);
        console.log(`Data length: ${res.data?.length}`);

    } catch (e) {
        console.error("Error:", e);
    }
}

testFetch();
