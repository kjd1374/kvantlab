import fetch from 'node-fetch'; // Vite project, we can use node-fetch or native fetch in Node 18+

const SUPABASE_URL = 'https://hgxblbbjlnsfkffwvfao.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhneGJsYmJqbG5zZmtmZnd2ZmFvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDA2NTY4NiwiZXhwIjoyMDc5NjQxNjg2fQ.SRxircIxDPE9Z8xElZzUFK_l9yOsjtKEoAnd7ILpKh8';

const headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json'
};

async function insertMockData() {
    try {
        console.log("Fetching latest OY rankings...");
        const GET_URL = `${SUPABASE_URL}/rest/v1/daily_rankings_v2?select=*&source=eq.oliveyoung&date=eq.2026-02-20`;
        const res = await fetch(GET_URL, { headers });
        const rows = await res.json();

        console.log(`Fetched ${rows.length} rows.`);
        if (rows.length === 0) return;

        const prevDate = '2026-02-19';

        // Prepare insert data
        const insertData = rows.map(r => {
            let newRank = r.rank + Math.floor(Math.random() * 5); // mostly rank down, so when compared, rank change is positive (trending)
            // wait, if prevRank is larger than currentRank, change = prevRank - currentRank > 0.
            // so we want prevRank to be larger.
            return {
                product_id: r.product_id,
                rank: newRank,
                category_code: r.category_code,
                source: 'oliveyoung',
                date: prevDate
            };
        });

        console.log(`Inserting ${insertData.length} records for ${prevDate}...`);
        const POST_URL = `${SUPABASE_URL}/rest/v1/daily_rankings_v2`;
        const postRes = await fetch(POST_URL, {
            method: 'POST',
            headers: { ...headers, 'Prefer': 'return=minimal' },
            body: JSON.stringify(insertData)
        });

        if (postRes.ok) {
            console.log("Insertion successful.");
        } else {
            const err = await postRes.text();
            console.error("Insertion failed:", err);
        }
    } catch (e) {
        console.error("Error:", e);
    }
}

insertMockData();
