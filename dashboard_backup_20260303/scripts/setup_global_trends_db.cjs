const { Client } = require('pg');

const client = new Client({
    connectionString: 'postgresql://postgres.hgxblbbjlnsfkffwvfao:eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhneGJsYmJqbG5zZmtmZnd2ZmFvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDA2NTY4NiwiZXhwIjoyMDc5NjQxNjg2fQ.SRxircIxDPE9Z8xElZzUFK_l9yOsjtKEoAnd7ILpKh8@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres',
    ssl: { rejectUnauthorized: false }
});

async function setupDatabase() {
    try {
        await client.connect();
        console.log('Connected to database.');

        const createTableQuery = `
            CREATE TABLE IF NOT EXISTS global_shopping_trends (
                id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
                country_code varchar(10) NOT NULL,
                main_category varchar(100) NOT NULL,
                product_name varchar(255) NOT NULL,
                brand_name varchar(255),
                mention_count int DEFAULT 1,
                key_benefits jsonb DEFAULT '[]'::jsonb,
                data_sources jsonb DEFAULT '[]'::jsonb,
                created_at timestamp DEFAULT now(),
                updated_at timestamp DEFAULT now(),
                UNIQUE(country_code, product_name)
            );
        `;
        await client.query(createTableQuery);
        console.log('Created global_shopping_trends table successfully.');

        // Add source_type column
        await client.query("ALTER TABLE public.global_shopping_trends ADD COLUMN IF NOT EXISTS source_type varchar(50) DEFAULT 'google';");
        console.log('Column source_type added (or already exists)');

        // Reload schema cache
        await client.query("NOTIFY pgrst, 'reload schema';");
        console.log("Schema reload signal sent");

    } catch (error) {
        console.error('Error setting up database:', error);
    } finally {
        await client.end();
        console.log('Database connection closed.');
    }
}

setupDatabase();
