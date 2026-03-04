import { fetchRankedProducts } from './supabase.js';

async function testFetch() {
    try {
        console.log("Testing WOMEN tab...");
        const resWomen = await fetchRankedProducts({ categoryCode: 'WOMEN', platform: 'ably', page: 1, perPage: 5 });
        console.log(`WOMEN count: ${resWomen.count}`);
        if (resWomen.data) console.log("Sample:", resWomen.data.map(d => `${d.name} (${d.category})`).slice(0, 3));

        console.log("\nTesting BAG tab...");
        const resBag = await fetchRankedProducts({ categoryCode: 'BAG', platform: 'ably', page: 1, perPage: 5 });
        console.log(`BAG count: ${resBag.count}`);
        if (resBag.data) console.log("Sample:", resBag.data.map(d => `${d.name} (${d.category})`).slice(0, 3));
    } catch (e) {
        console.error(e);
    }
}
testFetch();
