const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const newCategories = [
    { code: 'BEAUTY', name: '뷰티', display_order: 101 },
    { code: 'FASHION', name: '패션', display_order: 102 },
    { code: 'LUXURY', name: '명품', display_order: 103 },
    { code: 'KIDS', name: '유아동', display_order: 104 },
    { code: 'SPORTS', name: '스포츠', display_order: 105 },
    { code: 'FOOD_LIFE', name: '푸드&리빙', display_order: 106 }
];

async function patchCategories() {
    console.log("Patching SSG Categories into database...");

    for (const cat of newCategories) {
        const { data, error } = await supabase
            .from('categories')
            .upsert({
                code: cat.code,
                name: cat.name,
                display_order: cat.display_order,
                icon_name: 'category'
            }, { onConflict: 'code', ignoreDuplicates: false });

        if (error) {
            console.error(`Error upserting ${cat.code}:`, error.message);
        } else {
            console.log(`Successfully mapped ${cat.code} -> ${cat.name}`);
        }
    }
    console.log("Category DB Patch Complete.");
}

patchCategories();
