import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAblyDB() {
    console.log("Checking Ably Data...");

    // Check what categories exist for ably
    const { data: catData, error: catErr } = await supabase
        .from('products_master')
        .select('category')
        .eq('source', 'ably')

    if (catErr) {
        console.error("catErr", catErr);
    } else {
        const uniqueCats = [...new Set(catData.map(item => item.category))];
        console.log("Ably categories in DB:", uniqueCats);
    }

    // Check rankings for ably to see category_codes
    const { data: rankData, error: rankErr } = await supabase
        .from('daily_rankings_v2')
        .select('category_code')
        .eq('source', 'ably')
        .limit(100);

    if (rankErr) {
        console.error("rankErr", rankErr);
    } else {
        const uniqueRankCats = [...new Set(rankData.map(item => item.category_code))];
        console.log("Ably ranking category codes:", uniqueRankCats);
    }
}

checkAblyDB();
