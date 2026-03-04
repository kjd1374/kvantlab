import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const envContent = fs.readFileSync('.env', 'utf8');
const env = envContent.split('\n').reduce((acc, line) => {
  const [key, val] = line.split('=');
  if (key && val) acc[key.trim()] = val.trim();
  return acc;
}, {});

const supabaseUrl = env['VITE_SUPABASE_URL'];
const supabaseKey = env['VITE_SUPABASE_SERVICE_ROLE_KEY'];

const supabase = createClient(supabaseUrl, supabaseKey);

async function runSQL() {
  const sql = fs.readFileSync('scripts/update_announcements_i18n.sql', 'utf8');
  console.log('Running SQL...');
  const { data, error } = await supabase.rpc('run_sql', { sql_query: sql });
  if (error) {
     console.log('RPC run_sql failed. Falling back to individual queries if possible, but lets see the error:', error);
  } else {
     console.log('Success:', data);
  }
}
runSQL();
