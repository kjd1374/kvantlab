import { fetchRankedProducts } from './supabase.js';
(async () => {
  const result = await fetchRankedProducts({ limit: 1 });
  console.log(JSON.stringify(result.data[0], null, 2));
})();
