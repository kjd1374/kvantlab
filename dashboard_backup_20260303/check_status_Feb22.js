import { query } from './supabase.js';

async function checkStatus() {
    const today = '2026-02-22';
    const yesterday = '2026-02-21';

    console.log(`=== Database Status Check for ${today} ===`);

    try {
        // 1. Check daily_rankings_v2
        console.log('\n[1] daily_rankings_v2 Status:');
        const rankingRes = await query('daily_rankings_v2', `select=source,created_at,date&date=gte.${yesterday}&order=created_at.desc`);

        const statsByDate = {};
        rankingRes.data.forEach(r => {
            if (!statsByDate[r.date]) statsByDate[r.date] = {};
            if (!statsByDate[r.date][r.source]) {
                statsByDate[r.date][r.source] = { count: 0, latest: r.created_at };
            }
            statsByDate[r.date][r.source].count++;
        });

        [today, yesterday].forEach(date => {
            console.log(`  - Date: ${date}`);
            if (statsByDate[date]) {
                Object.entries(statsByDate[date]).forEach(([source, stat]) => {
                    console.log(`    * ${source}: ${stat.count} items (Latest: ${stat.latest})`);
                });
            } else {
                console.log('    * No data found for this date.');
            }
        });

        // 2. Check News in products_master
        console.log('\n[2] News Status (products_master):');
        const newsRes = await query('products_master', `select=name,created_at&category=eq.News&created_at=gte.${today}&order=created_at.desc`);
        console.log(`  - Found ${newsRes.data?.length || 0} news items today.`);
        if (newsRes.data?.length > 0) {
            console.log(`  - Latest news item: "${newsRes.data[0].name}" at ${newsRes.data[0].created_at}`);
        }

        // 3. Check Daily Insight in products_master
        console.log('\n[3] Daily Insight Status (products_master):');
        const insightRes = await query('products_master', `select=name,created_at&category=eq.Daily%20Insight&created_at=gte.${yesterday}&order=created_at.desc`);
        insightRes.data.forEach(s => {
            console.log(`  - Date: ${s.name}, Created At: ${s.created_at}`);
        });

    } catch (error) {
        console.error('Error during status check:', error);
    }
}

checkStatus();
