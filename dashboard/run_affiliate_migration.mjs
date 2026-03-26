/**
 * Run Supabase SQL migration for affiliate tables
 */
import pg from 'pg';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
// Extract host from SUPABASE_URL
const host = new URL(SUPABASE_URL).hostname;
const password = process.env.SUPABASE_DB_PASSWORD || 'Dlawjdehdwjd0!';

const pool = new pg.Pool({
  host: `db.${host.replace('.supabase.co', '')}.supabase.co`,
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: password,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const sql = fs.readFileSync(new URL('./setup_affiliate.sql', import.meta.url), 'utf8');
  try {
    await pool.query(sql);
    console.log('✅ Affiliate tables created successfully!');
  } catch (e) {
    console.error('❌ Migration failed:', e.message);
  } finally {
    await pool.end();
  }
}

run();
