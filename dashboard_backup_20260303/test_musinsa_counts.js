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

async function checkData() {
    console.log("Checking Musinsa Pants (category=바지)...");

    // Check Male
    let resM = await supabase.from('products_master')
        .select('id', { count: 'exact' })
        .eq('source', 'musinsa')
        .eq('category', '바지')
        .contains('tags', { gender: 'male' });

    // Check Female
    let resF = await supabase.from('products_master')
        .select('id', { count: 'exact' })
        .eq('source', 'musinsa')
        .eq('category', '바지')
        .contains('tags', { gender: 'female' });

    console.log(`Male Pants Count: ${resM.count}`);
    console.log(`Female Pants Count: ${resF.count}`);

    if (resF.count > 0 && resM.count > 0) {
        console.log("SUCCESS! Both male and female pants exist.");
    } else {
        console.log("WAITING for crawler to finish or something failed.");
    }
}

checkData();
