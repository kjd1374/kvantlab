import fs from 'fs';

const SUPABASE_URL = 'https://hgxblbbjlnsfkffwvfao.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhneGJsYmJqbG5zZmtmZnd2ZmFvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDA2NTY4NiwiZXhwIjoyMDc5NjQxNjg2fQ.SRxircIxDPE9Z8xElZzUFK_l9yOsjtKEoAnd7ILpKh8';

async function testFilter() {
    console.log("Testing Musinsa Gender Filter (Men)...");
    const resMale = await fetch(`${SUPABASE_URL}/rest/v1/products_master?source=eq.musinsa&tags->>gender=eq.male&limit=3`, {
        headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` }
    });
    const dataMale = await resMale.json();
    console.log("Male Count:", dataMale.length);
    if (dataMale.length > 0) console.log("Sample:", dataMale[0].name, dataMale[0].tags);

    console.log("\nTesting Musinsa Gender Filter (Women)...");
    const resFemale = await fetch(`${SUPABASE_URL}/rest/v1/products_master?source=eq.musinsa&tags->>gender=eq.female&limit=3`, {
        headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` }
    });
    const dataFemale = await resFemale.json();
    console.log("Female Count:", dataFemale.length);
    if (dataFemale.length > 0) console.log("Sample:", dataFemale[0].name, dataFemale[0].tags);
}

testFilter();
