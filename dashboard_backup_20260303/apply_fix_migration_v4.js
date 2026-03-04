import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SUPABASE_URL = 'https://hgxblbbjlnsfkffwvfao.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhneGJsYmJqbG5zZmtmZnd2ZmFvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDA2NTY4NiwiZXhwIjoyMDc5NjQxNjg2fQ.SRxircIxDPE9Z8xElZzUFK_l9yOsjtKEoAnd7ILpKh8';

async function applyMigration() {
    // Correct path relative to dashboard folder
    const sqlPath = path.resolve(__dirname, '../migrations/018_add_review_columns.sql');
    console.log(`Reading migration file: ${sqlPath}`);

    try {
        const sql = fs.readFileSync(sqlPath, 'utf8');

        // Remove comments and split by semicolon
        const statements = sql
            .replace(/--.*$/gm, '') // Remove single line comments
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0);

        console.log(`Applying ${statements.length} statements...`);

        for (let i = 0; i < statements.length; i++) {
            const stmt = statements[i];
            console.log(`Executing [${i + 1}/${statements.length}]...`);

            const res = await fetch(`${SUPABASE_URL}/rest/v1/ranking_products_v2?select=*&limit=1`, {
                method: 'HEAD',
                headers: {
                    'apikey': SERVICE_KEY,
                    'Authorization': `Bearer ${SERVICE_KEY}`
                }
            });

            // Note: Since we cannot run DDL via REST easily without a specific RPC,
            // we will try to use the 'pg' library if available, OR reuse the 'rpc/_run_migration' 
            // from previous scripts if it exists. 
            // IF 'rpc/_run_migration' is not available, we have to fall back to 'pg'.
            // Given previous scripts used it, it probably exists.

            const rpcRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/_run_migration`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': SERVICE_KEY,
                    'Authorization': `Bearer ${SERVICE_KEY}`,
                    'Prefer': 'return=minimal'
                },
                body: JSON.stringify({ sql_text: stmt })
            });

            if (rpcRes.ok || rpcRes.status === 204) {
                console.log(`✅ Success`);
            } else {
                const err = await rpcRes.text();
                console.error(`❌ Fail: ${err}`);
            }
        }
    } catch (err) {
        console.error("Error reading or executing:", err);
    }
}

applyMigration();
