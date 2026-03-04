const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
);

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
