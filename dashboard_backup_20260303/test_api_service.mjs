import fs from 'fs';
const envFile = fs.readFileSync('.env', 'utf-8');
let SUPABASE_URL = '', SUPABASE_SERVICE_KEY = '';
envFile.split('\n').forEach(line => {
    if (line.startsWith('SUPABASE_URL=')) SUPABASE_URL = line.split('=')[1].trim();
    if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) SUPABASE_SERVICE_KEY = line.split('=')[1].trim();
});

async function run() {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/saved_products?select=*,products_master(*)`, {
        headers: {
            'apikey': SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
        }
    });
    console.log("Status:", res.status);
    console.log("Data:", await res.text());
}
run();
