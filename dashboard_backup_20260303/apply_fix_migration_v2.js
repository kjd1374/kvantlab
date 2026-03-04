const fs = require('fs');

const SUPABASE_URL = 'https://hgxblbbjlnsfkffwvfao.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhneGJsYmJqbG5zZmtmZnd2ZmFvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDA2NTY4NiwiZXhwIjoyMDc5NjQxNjg2fQ.SRxircIxDPE9Z8xElZzUFK_l9yOsjtKEoAnd7ILpKh8';

async function applyMigration() {
    const sql = fs.readFileSync('f:/cursor/datapool/migrations/011_fix_view_isolation.sql', 'utf8');
    const statements = sql.split(';').map(s => s.trim()).filter(s => s.length > 0);

    console.log(`Applying ${statements.length} statements...`);

    for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i];
        console.log(`Executing [${i + 1}/${statements.length}]...`);

        try {
            const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/_run_migration`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': SERVICE_KEY,
                    'Authorization': `Bearer ${SERVICE_KEY}`
                },
                body: JSON.stringify({ sql_text: stmt })
            });

            if (res.ok || res.status === 204) {
                console.log(`✅ Success`);
            } else {
                const err = await res.text();
                console.error(`❌ Fail: ${err}`);
            }
        } catch (e) {
            console.error(`❌ Error: ${e.message}`);
        }
    }
}

applyMigration();
