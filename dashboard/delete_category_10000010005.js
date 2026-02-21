const https = require('https');
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhneGJsYmJqbG5zZmtmZnd2ZmFvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDA2NTY4NiwiZXhwIjoyMDc5NjQxNjg2fQ.SRxircIxDPE9Z8xElZzUFK_l9yOsjtKEoAnd7ILpKh8';

const opts = {
    hostname: 'hgxblbbjlnsfkffwvfao.supabase.co',
    path: '/rest/v1/categories?platform=eq.oliveyoung&category_code=eq.10000010005',
    method: 'DELETE',
    headers: {
        'apikey': KEY,
        'Authorization': 'Bearer ' + KEY
    }
};

const req = https.request(opts, (res) => {
    let body = '';
    res.on('data', c => body += c);
    res.on('end', () => {
        console.log('Status:', res.statusCode);
        console.log('Response:', body);
    });
});
req.on('error', e => console.error(e.message));
req.end();
