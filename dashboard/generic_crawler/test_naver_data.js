import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || 'YOUR_APP_URL';
const supabaseKey = process.env.SUPABASE_KEY || 'YOUR_APP_ANON_KEY';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: pData, error: pErr } = await supabase
    .from('products_master')
    .select('product_id, name, naver_category_id')
    .eq('source', 'naver_best')
    .limit(5);
  console.log('Products:', pData, pErr);

  const { data: cData, error: cErr } = await supabase
    .from('products_master')
    .select('naver_category_id', { count: 'exact' })
    .eq('source', 'naver_best');
  console.log('Total Naver Best Products:', cData?.length, 'Exact count:', cErr);

  const { data: bData, error: bErr } = await supabase
    .from('trend_brands')
    .select('brand_name, category_id')
    .limit(5);
  console.log('Brands:', bData, bErr);
}
run();
