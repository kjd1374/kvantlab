
import { query } from './supabase_node.js';

async function verify() {
    console.log("🔍 Deep Verification...");

    try {
        // 1. check trend keywords in products_master
        const pmRes = await query('products_master', "select=id,name,source,ai_summary&source=in.(google_trends,naver_datalab)&limit=5");
        console.log("\n1. Trend items in products_master:");
        console.table(pmRes.data);

        // 2. check rankings for these items
        if (pmRes.data && pmRes.data.length > 0) {
            const ids = pmRes.data.map(p => `"${p.id}"`).join(',');
            const drRes = await query('daily_rankings_v2', `select=product_id,rank,date,category_code&product_id=in.(${ids})&limit=5`);
            console.log("\n2. Trend items in daily_rankings_v2:");
            console.table(drRes.data);
        }

        // 3. check for ANY item with ai_summary
        const aiRes = await query('products_master', 'select=id,name,source,ai_summary&ai_summary=not.is.null&limit=3');
        console.log("\n3. Items with AI Summary:");
        if (aiRes.data && aiRes.data.length > 0) {
            aiRes.data.forEach(item => {
                console.log(`- [${item.source}] ${item.name}: ${JSON.stringify(item.ai_summary).substring(0, 100)}...`);
            });
        } else {
            console.log("- None found.");
        }

    } catch (err) {
        console.error(err);
    }
}

verify();
