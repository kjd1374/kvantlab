import { query } from './supabase.js';

async function checkCategories() {
    try {
        const catRes = await query('categories', `select=platform,name_ko,category_code&category_code=eq.003`);
        console.log(catRes.data);
    } catch (e) { console.error(e); }
}
checkCategories();
