const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Connection string from check_columns.cjs
const CONNECTION_STRING = 'postgresql://postgres.hgxblbbjlnsfkffwvfao:eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhneGJsYmJqbG5zZmtmZnd2ZmFvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDA2NTY4NiwiZXhwIjoyMDc5NjQxNjg2fQ.SRxircIxDPE9Z8xElZzUFK_l9yOsjtKEoAnd7ILpKh8@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres';

async function applyMigration() {
    console.log('Connecting to database...');
    const client = new Client({
        connectionString: CONNECTION_STRING,
        ssl: { rejectUnauthorized: false } // Supabase requires SSL
    });

    try {
        await client.connect();
        console.log('Connected successfully.');

        const sqlPath = path.join(__dirname, '../migrations/018_add_review_columns.sql');
        console.log(`Reading migration file: ${sqlPath}`);
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('Executing migration...');
        await client.query(sql);
        console.log('✅ Migration executed successfully.');

    } catch (err) {
        console.error('❌ Migration failed:', err);
    } finally {
        await client.end();
    }
}

applyMigration();
