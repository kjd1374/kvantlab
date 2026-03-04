import { fetchRankedProducts } from './supabase.js';

async function test() {
  const res = await fetchRankedProducts({ platform: 'ably', categoryCode: 'all', page: 1, perPage: 5 });
  console.log("Ably Rank Test:");
  res.data.forEach((p, i) => {
    console.log(`Index ${i}: ${p.name} - DB Rank: ${p.current_rank}`);
  });
}
test();
