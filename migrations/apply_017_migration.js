const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://hgxblbbjlnsfkffwvfao.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhneGJsYmJqbG5zZmtmZnd2ZmFvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDA2NTY4NiwiZXhwIjoyMDc5NjQxNjg2fQ.SRxircIxDPE9Z8xElZzUFK_l9yOsjtKEoAnd7ILpKh8';

async function applyMigration() {
    const migrationPath = path.join(__dirname, '017_create_keyword_trends.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    // Split SQL into statements (best-effort)
    const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);

    console.log(`Applying ${statements.length} statements from 017_create_keyword_trends.sql...`);

    for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i];
        try {
            const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/_run_migration`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': SERVICE_KEY,
                    'Authorization': `Bearer ${SERVICE_KEY}`,
                },
                body: JSON.stringify({ sql_text: stmt })
            });

            if (response.ok) {
                console.log(`✅ [${i + 1}/${statements.length}] Success`);
            } else {
                const errBody = await response.text();
                console.log(`⚠️ [${i + 1}/${statements.length}] Failed: ${errBody}`);
            }
        } catch (err) {
            console.log(`❌ [${i + 1}/${statements.length}] Error: ${err.message}`);
        }
    }
}

applyMigration();
