const { Client } = require('pg');
const client = new Client({
    connectionString: 'postgresql://postgres.hgxblbbjlnsfkffwvfao:eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhneGJsYmJqbG5zZmtmZnd2ZmFvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDA2NTY4NiwiZXhwIjoyMDc5NjQxNjg2fQ.SRxircIxDPE9Z8xElZzUFK_l9yOsjtKEoAnd7ILpKh8@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres'
});

async function checkColumns() {
    await client.connect();
    const tables = ['products_master', 'ranking_products_v2', 'daily_rankings_v2'];
    for (const table of tables) {
        const res = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name = '${table}'`);
        console.log(`\nTable: ${table}`);
        console.log(res.rows.map(r => r.column_name).join(', '));
    }
    await client.end();
}

checkColumns().catch(console.error);
