const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const CONNECTION_STRING = 'postgresql://postgres.hgxblbbjlnsfkffwvfao:eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhneGJsYmJqbG5zZmtmZnd2ZmFvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDA2NTY4NiwiZXhwIjoyMDc5NjQxNjg2fQ.SRxircIxDPE9Z8xElZzUFK_l9yOsjtKEoAnd7ILpKh8@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres';

async function applyMigration() {
    const client = new Client({ connectionString: CONNECTION_STRING });
    const migrationPath = path.join(__dirname, '017_create_keyword_trends.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    try {
        console.log('Connecting to PG...');
        await client.connect();
        console.log('Connected. Running migration...');
        await client.query(sql);
        console.log('✅ Migration successful!');
    } catch (err) {
        console.error('❌ Migration failed:', err.message);
    } finally {
        await client.end();
    }
}

applyMigration();
