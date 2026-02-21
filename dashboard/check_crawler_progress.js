
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Error: SUPABASE_URL and SUPABASE_KEY are required.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkProgress() {
    const today = new Date().toISOString().split('T')[0];
    console.log(`Checking progress for date: ${today}`);

    try {
        const { data, error } = await supabase
            .from('daily_rankings_v2')
            .select('source, category_code, created_at')
            .eq('date', today)
            .eq('source', 'oliveyoung');

        if (error) throw error;

        const stats = {};
        let total = 0;

        data.forEach(row => {
            const cat = row.category_code || 'unknown';
            if (!stats[cat]) stats[cat] = 0;
            stats[cat]++;
            total++;
        });

        console.log(`Total Olive Young rows today: ${total}`);
        console.log('Breakdown by Category Code:');
        for (const [cat, count] of Object.entries(stats)) {
            console.log(`- ${cat}: ${count}`);
        }

    } catch (err) {
        console.error('Error fetching data:', err);
    }
}

checkProgress();
