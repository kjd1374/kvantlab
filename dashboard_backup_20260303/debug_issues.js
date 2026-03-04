import { query } from './supabase.js';

async function debugDB() {
    try {
        console.log("--- 1. Musinsa Categories Mapping ---");
        const catsRes = await query('categories', 'select=category_code,name_ko&platform=eq.musinsa');
        console.log("Categories Master Table:", catsRes.data);

        console.log("\n--- 2. Musinsa Rankings Category Codes ---");
        const rankRes = await query('daily_rankings_v2', `select=category_code&source=eq.musinsa&order=date.desc&limit=1000`);
        const rCats = rankRes.data.reduce((acc, r) => {
            acc[r.category_code] = (acc[r.category_code] || 0) + 1;
            return acc;
        }, {});
        console.log("Rankings Category Codes:", rCats);

        console.log("\n--- 3. Olive Young Ranking Dates & Change ---");
        const datesRes = await query('daily_rankings_v2', `select=date&source=eq.oliveyoung&order=date.desc`);
        const dates = [...new Set((datesRes.data || []).map(d => d.date))];
        console.log("Dates:", dates);

        if (dates.length > 1) {
            const latestDate = dates[0];
            const prevDate = dates[1];

            const latestRes = await query('daily_rankings_v2', `select=product_id,rank&source=eq.oliveyoung&date=eq.${latestDate}`);
            const prevRes = await query('daily_rankings_v2', `select=product_id,rank&source=eq.oliveyoung&date=eq.${prevDate}`);

            const prevMap = {};
            (prevRes.data || []).forEach(r => prevMap[r.product_id] = r.rank);

            let changes = 0;
            (latestRes.data || []).forEach(r => {
                const prevRank = prevMap[r.product_id];
                const change = prevRank ? prevRank - r.rank : 0;
                if (change > 0) changes++;
            });
            console.log(`Rank changes > 0 between ${prevDate} and ${latestDate}:`, changes);
        }

    } catch (e) {
        console.error("Error:", e);
    }
}

debugDB();
