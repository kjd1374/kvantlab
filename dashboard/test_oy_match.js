import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testMatch() {
    const { data: trends } = await supabase.from('global_shopping_trends').select('*');
    if (!trends) return console.log("No trends found");
    
    console.log(`Found ${trends.length} global trends`);
    let matchCount = 0;
    
    for (const t of trends) {
        // Try to match brand and product name loosely
        // First try exact brand + loose name match
        const brand = t.brand_name || '';
        const name = t.product_name || '';
        if (!brand || !name) continue;
        
        // Let's just do a text search on products_master name field
        const searchQuery = `${brand.split(' ')[0]} ${name.split(' ')[0]}`.trim();
        
        const { data: oyProducts } = await supabase.from('products_master')
            .select('product_id, name, brand_name, price, special_price, review_rating')
            .ilike('name', `%${name.split(' ')[0]}%`)
            .ilike('brand_name', `%${brand}%`)
            .limit(1);
            
        if (oyProducts && oyProducts.length > 0) {
            console.log(`✅ MATCH: [${t.country_code}] ${t.brand_name} ${t.product_name} -> OY: ${oyProducts[0].name} (${oyProducts[0].special_price}원)`);
            matchCount++;
        } else {
            console.log(`❌ NO MATCH: [${t.country_code}] ${t.brand_name} ${t.product_name}`);
        }
    }
    console.log(`Matched ${matchCount} out of ${trends.length} products`);
}
testMatch();
