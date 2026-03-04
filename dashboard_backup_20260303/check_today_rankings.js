import { query } from './supabase.js';

async function checkToday() {
    const today = '2026-02-20';
    console.log(`Checking rankings for date: ${today}`);

    try {
        const rankingRes = await query('daily_rankings_v2', `select=source,created_at,date&date=eq.${today}&order=created_at.desc`);
        console.log(`Summary for ${today}:`);
        console.log(`Total rows: ${rankingRes.data?.length || 0}`);

        const platformStats = {};
        rankingRes.data.forEach(r => {
            if (!platformStats[r.source]) {
                platformStats[r.source] = {
                    count: 0,
                    latest_created_at: r.created_at
                };
            }
            platformStats[r.source].count++;
        });

        console.log('Stats by platform:');
        Object.entries(platformStats).forEach(([name, stats]) => {
            console.log(`- ${name}: ${stats.count} rows, Latest Created At: ${stats.latest_created_at}`);
        });

    } catch (error) {
        console.error('Error:', error);
    }
}

checkToday();
