const https = require('https');

const SUPABASE_URL = 'https://hgxblbbjlnsfkffwvfao.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhneGJsYmJqbG5zZmtmZnd2ZmFvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDA2NTY4NiwiZXhwIjoyMDc5NjQxNjg2fQ.SRxircIxDPE9Z8xElZzUFK_l9yOsjtKEoAnd7ILpKh8';

async function applyMigration() {
    const sql = `ALTER TABLE products_master ADD COLUMN IF NOT EXISTS ai_summary JSONB DEFAULT NULL;`;

    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/_run_migration`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'apikey': SERVICE_KEY,
            'Authorization': `Bearer ${SERVICE_KEY}`,
        },
        body: JSON.stringify({ sql_text: sql })
    });

    if (response.ok) {
        console.log('✅ Migration applied successfully: ai_summary column added.');
    } else {
        const err = await response.text();
        console.error('❌ Migration failed:', err);
    }
}

applyMigration();
