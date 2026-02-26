/**
 * Supabase API Client
 * K-Trend Intelligence Dashboard
 */

const SUPABASE_URL = 'https://hgxblbbjlnsfkffwvfao.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhneGJsYmJqbG5zZmtmZnd2ZmFvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDA2NTY4NiwiZXhwIjoyMDc5NjQxNjg2fQ.SRxircIxDPE9Z8xElZzUFK_l9yOsjtKEoAnd7ILpKh8';

const headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'count=exact'
};

const authHeaders = (token) => ({
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${token || SUPABASE_KEY}`,
    'Content-Type': 'application/json'
});

/**
 * Generic query helper
 */
export async function query(table, params = '') {
    const url = `${SUPABASE_URL}/rest/v1/${table}?${params}`;
    const res = await fetch(url, { headers });
    const jsonData = await res.json();

    if (!res.ok) {
        console.error('Supabase Query Error:', jsonData);
        throw new Error(jsonData.message || '데이터를 불러오는 중 오류가 발생했습니다.');
    }

    const count = res.headers.get('content-range');
    return { data: jsonData, count: count ? parseInt(count.split('/')[1]) : jsonData.length };
}

/**
 * Fetch trending products (7-day rank change)
 */
/**
 * Fetch trending products (7-day rank change)
 */
export async function fetchTrending(limit = 50, platform = 'oliveyoung') {
    const isTrendPlatform = ['google_trends', 'naver_datalab'].includes(platform);

    let trendRes;
    if (isTrendPlatform) {
        // For trend platforms, get latest rankings directly
        const dateRes = await query('daily_rankings_v2', `select=date&source=eq.${platform}&order=date.desc&limit=1`);
        const latestDate = dateRes.data?.[0]?.date;
        if (!latestDate) return { data: [], count: 0 };

        trendRes = await query('daily_rankings_v2', `select=*,products_master(*)&source=eq.${platform}&date=eq.${latestDate}&order=rank.asc&limit=${limit}`);
        if (trendRes.data) {
            trendRes.data = trendRes.data.map(r => ({
                ...r,
                ...(r.products_master || {}),
                current_rank: r.rank,
                rank_change: 0
            }));
        }
    } else {
        // Standard trending
        trendRes = await query('v_trending_7d', `select=*&source=eq.${platform}&order=rank_change.desc&limit=${limit}`);
    }

    if (!trendRes.data || trendRes.data.length === 0) {
        // Fallback: Calculate 1-day trend if v_trending_7d is empty (e.g. less than 7 days of data)
        // [FIX] Two-step date discovery to bypass the 1000-row limit of PostgREST
        const d1Res = await query('daily_rankings_v2', `select=date&source=eq.${platform}&order=date.desc&limit=1`);
        const latestDate = d1Res.data?.[0]?.date;

        let dates = [];
        if (latestDate) {
            dates.push(latestDate);
            const d2Res = await query('daily_rankings_v2', `select=date&source=eq.${platform}&date=lt.${latestDate}&order=date.desc&limit=1`);
            if (d2Res.data?.[0]?.date) {
                dates.push(d2Res.data[0].date);
            }
        }

        if (dates.length > 0) {
            const latestDate = dates[0];
            const prevDate = dates.length > 1 ? dates[1] : latestDate;

            // Fetch latest rankings
            const latestRes = await query('daily_rankings_v2', `select=*,products_master(*)&source=eq.${platform}&date=eq.${latestDate}&order=rank.asc&limit=${limit * 2}`);

            if (dates.length > 1) {
                // Fetch previous rankings to calculate change
                const prevRes = await query('daily_rankings_v2', `select=product_id,rank&source=eq.${platform}&date=eq.${prevDate}`);
                const prevMap = {};
                (prevRes.data || []).forEach(r => prevMap[r.product_id] = r.rank);

                trendRes.data = (latestRes.data || []).map(r => {
                    const prevRank = prevMap[r.product_id];
                    const change = prevRank ? prevRank - r.rank : 0; // positive means rank went up
                    return {
                        ...r,
                        ...(r.products_master || {}),
                        current_rank: r.rank,
                        rank_change: change
                    };
                }).filter(r => r.rank_change > 0).sort((a, b) => b.rank_change - a.rank_change).slice(0, limit);
            } else {
                // Just use top ranks if only 1 day of data exists
                trendRes.data = (latestRes.data || []).map(r => ({
                    ...r,
                    ...(r.products_master || {}),
                    current_rank: r.rank,
                    rank_change: 0
                })).slice(0, limit);
            }
        }
    }

    // Fetch/Merge AI Summary
    const productIds = trendRes.data.map(p => p.product_id || p.id).filter(id => id);
    if (productIds.length > 0) {
        const idFilter = productIds.map(id => `"${id}"`).join(',');
        const detailsRes = await query('products_master', `select=product_id,ai_summary&product_id=in.(${idFilter})`);

        const detailsMap = {};
        (detailsRes.data || []).forEach(d => {
            detailsMap[d.product_id] = d.ai_summary;
        });

        trendRes.data = trendRes.data.map(item => ({
            ...item,
            ai_summary: item.ai_summary || detailsMap[item.product_id || item.id] || null
        }));
    }

    return trendRes;
}

/**
 * Fetch today's deals from daily_specials_v2
 * Two-step: 1) get specials list  2) get product details from ranking_products_v2
 */
export async function fetchDailySpecials(platform = 'oliveyoung') {
    // Step 1: get latest date for platform
    // Note: daily_specials_v2 might need source column or we filter by joined product source.
    // Currently daily_specials_v2 structure is simple. 
    // We will verify if daily_specials_v2 has source context. 
    // If not, we filter in Step 2 via product mapping, OR we assume daily_specials is OY only for now.
    // For Musinsa, they might have different deal structure.

    if (platform !== 'oliveyoung') return { data: [], count: 0 }; // Temporary: Musinsa deals not implemented yet
    // Step 1: get latest date
    const dateResult = await query('daily_specials_v2', 'select=date&order=date.desc&limit=1');
    const latestDate = dateResult.data?.[0]?.date;
    if (!latestDate) return { data: [], count: 0 };

    // Step 2: get all specials for that date
    const specialsResult = await query('daily_specials_v2', `select=product_id,special_price,discount_rate&date=eq.${latestDate}&order=created_at.desc`);
    const specials = specialsResult.data || [];
    if (specials.length === 0) return { data: [], count: 0 };

    // Step 3: get product details
    const productIds = specials.map(s => s.product_id);
    const idFilter = productIds.map(id => `"${id}"`).join(',');
    const prodResult = await query('ranking_products_v2', `select=product_id,name,brand,image_url,product_url,price_current,price_original,review_count,review_rating,vi_name&product_id=in.(${idFilter})`);
    const productsMap = {};
    (prodResult.data || []).forEach(p => { productsMap[p.product_id] = p; });

    // Step 4: merge
    const merged = specials
        .filter(s => productsMap[s.product_id])
        .map(s => {
            const p = productsMap[s.product_id];
            const specialPrice = s.special_price;
            // Try to find a meaningful original price (higher than special price)
            const origPrice = p.price_original && p.price_original > specialPrice
                ? p.price_original
                : (p.price_current && p.price_current > specialPrice ? p.price_current : null);
            const discountPct = origPrice
                ? Math.round((1 - specialPrice / origPrice) * 100)
                : (s.discount_rate || null);
            return {
                ...p,
                url: p.product_url,
                special_price: specialPrice,
                original_price: origPrice,
                discount_pct: discountPct
            };
        })
        .sort((a, b) => (b.discount_pct || 0) - (a.discount_pct || 0));

    return { data: merged, count: merged.length, date: latestDate };
}

/**
 * Fetch today's deals count only (for KPI)
 */
export async function fetchDealsCount(platform = 'oliveyoung') {
    const dateResult = await query('daily_specials_v2', `select=date&order=date.desc&limit=1`);
    const latestDate = dateResult.data?.[0]?.date;
    if (!latestDate) return 0;
    // We assume deals in daily_specials_v2 are filtered by product source if we join, 
    // but for now we filter by a simple query.
    const countResult = await query('daily_specials_v2', `select=id&date=eq.${latestDate}`);
    return countResult.data?.length || 0;
}

/**
 * Fetch review growth products
 */
export async function fetchReviewGrowth(limit = 50, platform = 'oliveyoung') {
    return query('v_review_growth', `select=*&source=eq.${platform}&order=review_count.desc&limit=${limit}`);
}

/**
 * Fetch all products with pagination
 */
export async function fetchProducts({ page = 1, perPage = 20, search = '', sortBy = 'id', sortDir = 'asc', category = '', platform = 'oliveyoung', gender = 'all' } = {}) {
    const offset = (page - 1) * perPage;
    let params = `select=*,ai_summary&source=eq.${platform}&order=${sortBy}.${sortDir}&offset=${offset}&limit=${perPage}`;

    if (search) {
        params += `&or=(name.ilike.*${encodeURIComponent(search)}*,brand.ilike.*${encodeURIComponent(search)}*)`;
    }

    if (category && category !== 'all') {
        let resolvedCategory = category;
        // If it looks like a code (numeric), try to resolve it to a name
        if (/^\d+$/.test(category)) {
            const catRes = await query('categories', `select=name_ko,name_en&category_code=eq.${category}`);
            if (catRes.data?.[0]) {
                resolvedCategory = catRes.data[0].name_ko || catRes.data[0].name_en;
            }
        }

        // Use ilike with wildcards for flexible matching as master table categories can vary slightly
        params += `&category=ilike.*${encodeURIComponent(resolvedCategory)}*`;
    }

    if (gender && gender !== 'all' && platform === 'musinsa') {
        params += `&tags->>gender=eq.${gender}`;
    }

    return query('products_master', params);
}

/**
 * Fetch ranked products by category from daily_rankings_v2
 * Uses proper category_code-based join to fix the mismatch between
 * categories.category_code (numeric IDs) and products_master.category (scraped strings)
 */
export async function fetchRankedProducts({ page = 1, perPage = 20, search = '', categoryCode = '', brand = '', platform = 'oliveyoung', gender = 'all' }) {
    let resolvedCategoryName = null;

    // Resolve Category Code to Name early for filtering and fallback
    if (categoryCode && categoryCode !== 'all') {
        const catRes = await query('categories', `select=name_ko,name_en&category_code=eq.${categoryCode}`);
        if (catRes.data?.[0]) {
            resolvedCategoryName = catRes.data[0].name_ko || catRes.data[0].name_en;
        }
    }

    // Step 1: Try daily_rankings_v2
    const dateResult = await query('daily_rankings_v2', `select=date&source=eq.${platform}&order=date.desc&limit=1`);
    const latestDate = dateResult.data?.[0]?.date;

    if (latestDate) {
        let rankParams = `select=product_id,rank,category_code&source=eq.${platform}&date=eq.${latestDate}&order=rank.asc`;
        if (categoryCode && categoryCode !== 'all') {
            rankParams += `&category_code=eq.${categoryCode}`;
        }

        const rankResult = await query('daily_rankings_v2', rankParams);
        const rankRows = rankResult.data || [];

        if (rankRows.length > 0) {
            const productIds = rankRows.map(r => r.product_id);

            if (productIds.length > 0) {
                const idFilter = productIds.map(id => `"${id}"`).join(',');
                let prodParams = `select=*,ai_summary&product_id=in.(${idFilter})`;

                if (search) {
                    prodParams += `&or=(name.ilike.*${encodeURIComponent(search)}*,brand.ilike.*${encodeURIComponent(search)}*)`;
                }

                if (gender && gender !== 'all' && platform === 'musinsa') {
                    prodParams += `&tags->>gender=eq.${gender}`;
                }

                const prodResult = await query('ranking_products_v2', prodParams);
                const productsMap = {};
                (prodResult.data || []).forEach(p => { productsMap[p.product_id] = p; });

                const merged = rankRows
                    .filter(r => productsMap[r.product_id])
                    .map(r => ({
                        ...productsMap[r.product_id],
                        current_rank: r.rank,
                        category_code: r.category_code
                    }));

                // Result count should match filtered list
                const totalMatching = merged.length;
                const paged = merged.slice((page - 1) * perPage, page * perPage);

                // If we found results, return them
                if (totalMatching > 0) {
                    return { data: paged, count: totalMatching };
                }
            }
        }
    }

    // STEP 2: FALLBACK to products_master
    // This runs if No latestDate, No rankRows, or No productsMap matches (e.g. search/gender filter narrowed to 0)
    let params = `select=*,ai_summary&source=eq.${platform}`;

    if (resolvedCategoryName) {
        params += `&category=ilike.*${encodeURIComponent(resolvedCategoryName)}*`;
    }

    if (search) {
        params += `&or=(name.ilike.*${encodeURIComponent(search)}*,brand.ilike.*${encodeURIComponent(search)}*)`;
    }

    if (gender && gender !== 'all' && platform === 'musinsa') {
        params += `&tags->>gender=eq.${gender}`;
    }

    // Get total count for pagination when in fallback mode
    const countRes = await query('products_master', params + '&select=id');
    const totalFallback = countRes.count;

    params += `&order=created_at.desc&limit=${perPage}&offset=${(page - 1) * perPage}`;
    const result = await query('products_master', params);

    return { data: result.data, count: totalFallback };
}


/**
 * Fetch categories
 */
export async function fetchCategories(platform = 'oliveyoung') {
    const { data, count } = await query('categories', `select=*&platform=eq.${platform}&is_active=eq.true&order=sort_order.asc`);
    return { data, count };
}

/**
 * Fetch rank and price history for a product
 */
export async function fetchProductHistory(productId, days = 30) {
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - days);
    const dateStr = startDate.toISOString().split('T')[0];

    // 1. Fetch Rank History
    const rankPromise = query('daily_rankings_v2', `select=rank,date&product_id=eq.${productId}&date=gte.${dateStr}&order=date.asc`);

    // 2. Fetch Price History (from deals_snapshots)
    const pricePromise = query('deals_snapshots', `select=deal_price,original_price,snapshot_date&product_id=eq.${productId}&snapshot_date=gte.${dateStr}&order=snapshot_date.asc`);

    const [ranks, prices] = await Promise.all([rankPromise, pricePromise]);

    return {
        ranks: ranks.data || [],
        prices: (prices.data || []).map(p => ({
            date: p.snapshot_date,
            price: p.deal_price,
            original_price: p.original_price
        }))
    };
}

/**
 * Fetch rank history for a product (Legacy, keeping for compatibility if needed)
 */
export async function fetchRankHistory(productId, days = 30) {
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - days);
    const dateStr = startDate.toISOString().split('T')[0];

    return query('daily_rankings_v2', `select=rank,date,category_code&product_id=eq.${productId}&date=gte.${dateStr}&order=date.asc`);
}

/**
 * Fetch product count
 */
export async function fetchProductCount(platform = 'oliveyoung') {
    const url = `${SUPABASE_URL}/rest/v1/products_master?select=id&source=eq.${platform}&limit=1`;
    try {
        const res = await fetch(url, {
            method: 'HEAD',
            headers: { ...headers, 'Prefer': 'count=exact' }
        });
        const range = res.headers.get('content-range');
        return range ? parseInt(range.split('/')[1]) : 0;
    } catch (e) {
        console.error("Fetch Product Count Fail", e);
        return 0;
    }
}

/**
 * AUTH FUNCTIONS
 */

export async function signUp(email, password) {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({ email, password })
    });
    return await res.json();
}

export async function signIn(email, password) {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (data.access_token) {
        localStorage.setItem('sb-token', data.access_token);
        localStorage.setItem('sb-user', JSON.stringify(data.user));
    }
    return data;
}

export function signOut() {
    localStorage.removeItem('sb-token');
    localStorage.removeItem('sb-user');
    window.location.reload();
}

export function getSession() {
    const token = localStorage.getItem('sb-token');
    const user = JSON.parse(localStorage.getItem('sb-user') || 'null');
    return token ? { token, user } : null;
}

/**
 * SAVED PRODUCTS FUNCTIONS
 */

export async function fetchSavedProducts() {
    const session = getSession();
    if (!session) return { data: [], count: 0 };

    const res = await fetch(`${SUPABASE_URL}/rest/v1/saved_products?select=*,products_master(*)`, {
        headers: authHeaders(session.token)
    });
    const data = await res.json();
    return { data, count: data.length };
}

export async function saveProduct(productId, memo = '') {
    const session = getSession();
    if (!session) throw new Error('Authentication required');

    const res = await fetch(`${SUPABASE_URL}/rest/v1/saved_products`, {
        method: 'POST',
        headers: { ...authHeaders(session.token), 'Prefer': 'return=representation' },
        body: JSON.stringify({
            user_id: session.user.id,
            product_id: productId,
            memo: memo
        })
    });
    return await res.json();
}

export async function removeProduct(productId) {
    const session = getSession();
    if (!session) throw new Error('Authentication required');

    const res = await fetch(`${SUPABASE_URL}/rest/v1/saved_products?product_id=eq.${productId}&user_id=eq.${session.user.id}`, {
        method: 'DELETE',
        headers: authHeaders(session.token)
    });
    return res.ok;
}

export async function checkIfSaved(productId) {
    const session = getSession();
    if (!session) return false;

    const res = await fetch(`${SUPABASE_URL}/rest/v1/saved_products?product_id=eq.${productId}&user_id=eq.${session.user.id}&select=id`, {
        headers: authHeaders(session.token)
    });
    const data = await res.json();
    return data.length > 0;
}

/**
 * CRAWL LOGS FUNCTIONS
 */
export async function fetchCrawlLogs() {
    return query('crawl_logs', 'select=*&order=started_at.desc&limit=50');
}

/**
 * INSIGHTS FUNCTIONS
 */

// 1. Category Distribution
export async function fetchCategoryStats() {
    // We can fetch category counts from products_master or daily_rankings_v2
    // Let's use categories table and try to get counts (this might require a view or complex query)
    // For now, let's fetch all categories and we'll use them to map counts from product queries
    return query('categories', 'select=category_code,name_ko,name_en&is_active=eq.true');
}

// 2. Brand Distribution (Top 10)
export async function fetchBrandStats() {
    // Fetch top brands by product count in products_master
    // PostgREST doesn't support GROUP BY directly easily without a view
    // We'll fetch a larger sample and aggregate client-side for this demo
    return query('products_master', 'select=brand&limit=1000');
}

// 3. Price Distribution
export async function fetchPriceStats() {
    // Fetch prices to bucketize client-side
    return query('products_master', 'select=price&limit=1000');
}

/**
 * AI SMART SEARCH FUNCTIONS
 */

/**
 * Generate embedding for a text query using Edge Function
 */
export async function generateEmbedding(text) {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/generate-embeddings`, {
        method: 'POST',
        headers: {
            ...headers,
            'Authorization': `Bearer ${SUPABASE_KEY}`
        },
        body: JSON.stringify({ text })
    });
    if (!res.ok) throw new Error('Failed to generate embedding');
    const { embedding } = await res.json();
    return embedding;
}

/**
 * Perform semantic search using vector similarity
 */
export async function searchProductsSemantic(queryText, limit = 20) {
    try {
        // 1. Get embedding for the query
        const queryEmbedding = await generateEmbedding(queryText);

        // 2. Call the RPC match_products
        const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/match_products`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({
                query_embedding: queryEmbedding,
                match_threshold: 0.5, // Minimum similarity threshold
                match_count: limit
            })
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.message || 'Semantic search failed');
        }

        const data = await res.json();
        return { data, count: data.length };
    } catch (err) {
        console.error('Semantic search error:', err);
        throw err;
    }
}

/**
 * NOTIFICATION FUNCTIONS
 */

export async function fetchNotifications(limit = 20) {
    return query('notifications', `select=*,products_master(name,brand,image_url)&order=created_at.desc&limit=${limit}`);
}

export async function markNotificationAsRead(id) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/notifications?id=eq.${id}`, {
        method: 'PATCH',
        headers: headers,
        body: JSON.stringify({ is_read: true })
    });
    return res.ok;
}

export async function clearNotifications() {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/notifications`, {
        method: 'DELETE',
        headers: headers
    });
    return res.ok;
}
