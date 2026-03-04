import fs from 'fs';
import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();
const { Client } = pkg;

const client = new Client({
  connectionString: process.env.VITE_SUPABASE_DB_URL,
});

async function runSQL() {
  try {
    await client.connect();
    const sql = fs.readFileSync('scripts/setup_naver_best.sql', 'utf8');
    await client.query(sql);
    console.log("SQL executed successfully.");
  } catch (err) {
    console.error("Error executing SQL:", err);
  } finally {
    await client.end();
  }
}

runSQL();
