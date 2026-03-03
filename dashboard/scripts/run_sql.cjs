const fs = require('fs');
const path = require('path');
const https = require('https');

// Parse .env manually
const envPath = path.join(__dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const match = line.match(/^([^#=\s]+)\s*=\s*(.*)$/);
    if (match) env[match[1]] = match[2].replace(/^["']|["']$/g, '');
});

const SUPABASE_URL = env['SUPABASE_URL'] || env['VITE_SUPABASE_URL'];
const SERVICE_KEY = env['SUPABASE_SERVICE_ROLE_KEY'] || env['VITE_SUPABASE_SERVICE_ROLE_KEY'];

if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
    process.exit(1);
}

// Extract project ref from URL (https://XXXX.supabase.co)
const projectRef = SUPABASE_URL.replace('https://', '').split('.')[0];

const sqlFile = process.argv[2] || path.join(__dirname, 'setup_naver_best.sql');
const sql = fs.readFileSync(sqlFile, 'utf8');

// Use Supabase Management API to run SQL
const body = JSON.stringify({ query: sql });
const options = {
    hostname: 'api.supabase.com',
    path: `/v1/projects/${projectRef}/database/query`,
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Length': Buffer.byteLength(body)
    }
};

const req = https.request(options, res => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
            console.log('✅ SQL executed successfully via Supabase API.');
        } else {
            console.error(`❌ API Error ${res.statusCode}:`, data);
        }
    });
});
req.on('error', err => { console.error('❌ Request error:', err.message); });
req.write(body);
req.end();
