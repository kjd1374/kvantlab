const { Client } = require('pg');
const client = new Client({
    connectionString: 'postgresql://postgres.hgxblbbjlnsfkffwvfao:eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhneGJsYmJqbG5zZmtmZnd2ZmFvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDA2NTY4NiwiZXhwIjoyMDc5NjQxNjg2fQ.SRxircIxDPE9Z8xElZzUFK_l9yOsjtKEoAnd7ILpKh8@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres'
});

async function checkSchema() {
    await client.connect();
    const res = await client.query("SELECT * FROM ranking_products_v2 LIMIT 1");
    if (res.rows.length > 0) {
        console.log("Columns:", Object.keys(res.rows[0]));
    } else {
        console.log("No data in ranking_products_v2");
        // Fallback: check information_schema
        const cols = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'ranking_products_v2'");
        console.log("Columns from schema:", cols.rows.map(r => r.column_name));
    }
    await client.end();
}

checkSchema().catch(console.error);
