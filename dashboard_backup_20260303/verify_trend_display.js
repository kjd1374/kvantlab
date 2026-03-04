
import { fetchTrending, fetchProducts } from './supabase_node.js';

async function verify() {
    console.log("🔍 Starting Verification for Trend Display Logic...");

    try {
        // 1. Verify Trend Fetching with AI Summary
        console.log("\n1. Testing fetchTrending('google_trends')...");
        const googleTrends = await fetchTrending(5, 'google_trends');
        console.log(`   - Retrieved ${googleTrends.data.length} items`);

        if (googleTrends.data.length > 0) {
            const first = googleTrends.data[0];
            console.log(`   - First item: ${first.name}`);
            console.log(`   - AI Summary present? ${!!first.ai_summary}`);
            if (first.ai_summary) {
                console.log(`   - AI Reason: ${first.ai_summary.reason}`);
            } else {
                console.error("   ❌ AI Summary MISSING!");
            }
        }

        // 2. Verify Naver Trends
        console.log("\n2. Testing fetchTrending('naver_datalab')...");
        const naverTrends = await fetchTrending(5, 'naver_datalab');
        console.log(`   - Retrieved ${naverTrends.data.length} items`);
        if (naverTrends.data.length > 0 && naverTrends.data[0].ai_summary) {
            console.log(`   - AI Insight: ${naverTrends.data[0].ai_summary.insight}`);
        }

        // 3. Verify Standard Products
        console.log("\n3. Testing fetchProducts for standard items...");
        const products = await fetchProducts({ limit: 5 });
        console.log(`   - Retrieved ${products.data.length} items`);
        if (products.data.length > 0) {
            const p = products.data[0];
            console.log(`   - Product: ${p.name}`);
            console.log(`   - AI Summary present? ${!!p.ai_summary}`);
        }

        console.log("\n✅ Verification Complete!");

    } catch (e) {
        console.error("\n❌ Verification Failed:", e);
        process.exit(1);
    }
}

verify();
