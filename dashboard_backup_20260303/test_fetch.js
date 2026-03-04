import fs from 'fs';
const envFile = fs.readFileSync('.env', 'utf-8');
let SUPABASE_URL = '', SUPABASE_KEY = '';
envFile.split('\n').forEach(line => {
    if (line.startsWith('VITE_SUPABASE_URL=')) SUPABASE_URL = line.split('=')[1].trim();
    if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) SUPABASE_KEY = line.split('=')[1].trim();
});

// Create a dummy JWT or just use anon key without JWT to see what happens, wait, we need a real user JWT to test RLS.
// Or we can just query using the anon key without user_id to see if RLS blocks it.
async function run() {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/saved_products?select=*,products_master(*)`, {
        headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}` // using anon key as bearer will test public access
        }
    });
    console.log("Status:", res.status);
    console.log("Data:", await res.text());
}
run();
