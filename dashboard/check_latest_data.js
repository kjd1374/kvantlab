import { query } from './supabase.js';

async function checkData() {
    try {
        console.log('--- Checking Latest Rankings ---');
        const rankingRes = await query('daily_rankings_v2', 'select=*,products_master(name)&order=created_at.desc&limit=5');
        rankingRes.data.forEach(r => {
            console.log(`- [${r.created_at}] Platform: ${r.source}, Rank: ${r.rank}, Product: ${r.products_master?.name || r.product_id}`);
        });

        console.log('\n--- Checking Latest Products ---');
        const productRes = await query('products_master', 'select=name,source,created_at&order=created_at.desc&limit=5');
        productRes.data.forEach(p => {
            console.log(`- [${p.created_at}] Platform: ${p.source}, Name: ${p.name}`);
        });

        console.log('\n--- Checking Latest Logs ---');
        const logRes = await query('crawl_logs', 'select=*&order=started_at.desc&limit=5');
        logRes.data.forEach(l => {
            console.log(`- [${l.started_at}] Job: ${l.job_name}, Status: ${l.status}, Items: ${l.items_count}, Error: ${l.error_message || 'None'}`);
        });

    } catch (error) {
        console.error('Error:', error);
    }
}

checkData();
