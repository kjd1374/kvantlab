import { fetchRankedProducts } from './supabase.js';

async function checkData() {
    console.log("Checking Musinsa Pants Female Data...");

    // Check Female
    try {
        const resF = await fetchRankedProducts({
            page: 1,
            perPage: 20,
            search: '',
            categoryCode: '003',
            platform: 'musinsa',
            gender: 'female'
        });

        console.log(`Female Pants Count: ${resF.count}`);
        if (resF.data && resF.data.length > 0) {
            console.log("SUCCESS! Female pants exist.");
            console.log(resF.data[0].name);
        } else {
            console.log("WAITING for crawler to finish or something failed.");
        }
    } catch (e) {
        console.error("Error:", e);
    }
}

checkData();
