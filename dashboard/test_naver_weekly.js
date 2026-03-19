import { fetchNaverBestProducts } from './src/supabase.js';

async function runTest() {
  console.log("Testing DAILY...");
  const daily = await fetchNaverBestProducts({ periodType: 'DAILY', limit: 2 });
  console.log("DAILY length:", daily.data?.length, "First Item Rank:", daily.data?.[0]?.current_rank, daily.data?.[0]?.name);

  console.log("\nTesting WEEKLY...");
  const weekly = await fetchNaverBestProducts({ periodType: 'WEEKLY', limit: 2 });
  console.log("WEEKLY length:", weekly.data?.length, "First Item Rank:", weekly.data?.[0]?.current_rank, weekly.data?.[0]?.name);
  
  if (daily.data?.[0]?.id !== weekly.data?.[0]?.id) {
     console.log("\n✅ SUCCESS: Daily and Weekly return different products!");
  } else {
     console.log("\n❌ FAIL: Daily and Weekly return the exact same products.");
  }
}

runTest().catch(console.error);
