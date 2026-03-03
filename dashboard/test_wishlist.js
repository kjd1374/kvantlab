import { fetchSavedProducts, fetchDailySpecials, toggleWishlistStatus } from './supabase.js';

async function runTest() {
  try {
    const dealsRes = await fetchDailySpecials('oliveyoung');
    console.log("Deals:", dealsRes);
    const savedItems = await fetchSavedProducts();
    console.log("Saved Items:", savedItems);
  } catch(e) {
    console.error("Test Error:", e);
  }
}

runTest();
