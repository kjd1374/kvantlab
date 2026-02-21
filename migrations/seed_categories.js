const https = require('https');
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhneGJsYmJqbG5zZmtmZnd2ZmFvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDA2NTY4NiwiZXhwIjoyMDc5NjQxNjg2fQ.SRxircIxDPE9Z8xElZzUFK_l9yOsjtKEoAnd7ILpKh8';

// Olive Young Category Codes (DispCatNo based)
const rows = [
    { platform: "oliveyoung", category_code: "all", name_ko: "전체", name_en: "All", name_vi: "All", depth: 0, sort_order: 0 },
    { platform: "oliveyoung", category_code: "10000010001", name_ko: "스킨케어", name_en: "Skincare", name_vi: "Skincare", depth: 1, sort_order: 1 },
    { platform: "oliveyoung", category_code: "10000010009", name_ko: "마스크팩", name_en: "Mask Pack", name_vi: "Mask Pack", depth: 1, sort_order: 2 },
    { platform: "oliveyoung", category_code: "10000010010", name_ko: "클렌징", name_en: "Cleansing", name_vi: "Cleansing", depth: 1, sort_order: 3 },
    { platform: "oliveyoung", category_code: "10000010011", name_ko: "선케어", name_en: "Sun Care", name_vi: "Sun Care", depth: 1, sort_order: 4 },
    { platform: "oliveyoung", category_code: "10000010002", name_ko: "메이크업", name_en: "Makeup", name_vi: "Makeup", depth: 1, sort_order: 5 },
    { platform: "oliveyoung", category_code: "10000010012", name_ko: "네일", name_en: "Nail", name_vi: "Nail", depth: 1, sort_order: 6 },
    { platform: "oliveyoung", category_code: "10000010006", name_ko: "메이크업툴", name_en: "Beauty Tools", name_vi: "Beauty Tools", depth: 1, sort_order: 7 },
    { platform: "oliveyoung", category_code: "10000010007", name_ko: "맨즈케어", name_en: "Men Cosmetics", name_vi: "Men Cosmetics", depth: 1, sort_order: 8 },
    { platform: "oliveyoung", category_code: "10000010008", name_ko: "더모코스메틱", name_en: "Dermocosmetics", name_vi: "Dermocosmetics", depth: 1, sort_order: 9 },
    { platform: "oliveyoung", category_code: "10000010004", name_ko: "헤어케어", name_en: "Hair Care", name_vi: "Hair Care", depth: 1, sort_order: 10 },
    { platform: "oliveyoung", category_code: "10000010003", name_ko: "바디케어", name_en: "Body Care", name_vi: "Body Care", depth: 1, sort_order: 11 },
    { platform: "oliveyoung", category_code: "10000020003", name_ko: "구강/건강용품", name_en: "Oral/Health", name_vi: "Oral/Health", depth: 1, sort_order: 12 },
    { platform: "oliveyoung", category_code: "10000020004", name_ko: "여성/위생용품", name_en: "Feminine/Hygiene", name_vi: "Feminine/Hygiene", depth: 1, sort_order: 13 }
];

const data = JSON.stringify(rows);
const opts = {
    hostname: 'hgxblbbjlnsfkffwvfao.supabase.co',
    path: '/rest/v1/categories?on_conflict=platform,category_code',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'apikey': KEY,
        'Authorization': 'Bearer ' + KEY,
        'Prefer': 'return=representation,resolution=merge-duplicates'
    }
};

const req = https.request(opts, (res) => {
    let body = '';
    res.on('data', c => body += c);
    res.on('end', () => {
        console.log('Status:', res.statusCode);
        if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
                const r = JSON.parse(body);
                console.log('Inserted/Updated:', r.length, 'rows');
                r.forEach(row => console.log(' -', row.category_code, row.name_ko));
            } catch (e) { console.log(body.substring(0, 200)); }
        } else {
            console.log('Error:', body.substring(0, 500));
            // Log full error for debugging
            console.log(body);
        }
    });
});
req.on('error', e => console.error(e.message));
req.write(data);
req.end();
