const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://hgxblbbjlnsfkffwvfao.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhneGJsYmJqbG5zZmtmZnd2ZmFvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDA2NTY4NiwiZXhwIjoyMDc5NjQxNjg2fQ.SRxircIxDPE9Z8xElZzUFK_l9yOsjtKEoAnd7ILpKh8';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCategory(catCode, catName) {
    console.log(`\n--- ${catName} 카테고리 (Top 5) ---`);
    const { data, error } = await supabase
        .from('products_master')
        .select('name, brand, rank')
        .eq('platform', 'oliveyoung')
        .eq('category', catCode)
        .order('rank', { ascending: true })
        .limit(5);

    if (error) {
        console.error('Error fetching data:', error.message);
        return;
    }

    if (!data || data.length === 0) {
        console.log('데이터가 없습니다.');
    } else {
        data.forEach(item => {
            console.log(`${item.rank}위: [${item.brand}] ${item.name}`);
        });
    }
}

async function run() {
    await checkCategory('10000010009', '마스크팩 (Mask Pack)');
    await checkCategory('10000010012', '네일 (Nail)');
}

run();
