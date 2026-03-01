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
 * Fetch Global Shopping Trends by country and category
 */
export async function fetchGlobalShoppingTrends(country_code = 'VN', category = 'Skincare', source_type = 'ALL') {
    let params = `select=*&order=mention_count.desc`;
    if (country_code && country_code !== 'ALL') {
        params += `&country_code=eq.${country_code}`;
    }
    if (category && category !== 'ALL') {
        params += `&main_category=eq.${category}`;
    }

    return await query('global_shopping_trends', params);
}

/**
 * Look up Olive Young products matching a global trend brand (Korean name search)
 */
export async function fetchOyProductByBrand(brandKo, nameKeyword = '') {
    let params = `select=product_id,name,brand,image_url,url,review_rating,review_count&source=eq.oliveyoung`;
    if (brandKo) {
        params += `&brand=ilike.%${brandKo}%`;
    }
    if (nameKeyword) {
        // PostgREST does not support multiple ilike on same field, use or param instead
        params += `&name=ilike.%${nameKeyword.split(' ')[0]}%`;
    }
    params += `&limit=3`;
    try {
        return await query('products_master', params);
    } catch (e) {
        return { data: [], count: 0 };
    }
}

/**
 * Fetch Steady Sellers list
 */
export async function fetchSteadySellers() {
    return await query('steady_sellers', 'select=*&is_active=eq.true&order=rank.asc,created_at.desc');
}

/**
 * Fetch Naver Best products (source='naver_best')
 */
export async function fetchNaverBestProducts({ limit = 50, categoryId = 'A' } = {}) {
    const dateRes = await query('daily_rankings_v2', `select=date&source=eq.naver_best&order=date.desc&limit=1`);
    const latestDate = dateRes.data?.[0]?.date;
    if (!latestDate) return { data: [], count: 0 };

    const catParam = encodeURIComponent(categoryId || 'A');
    const qs = `select=*,products_master(*)&source=eq.naver_best&date=eq.${latestDate}&category_code=eq.${catParam}&order=rank.asc&limit=${limit}`;

    const res = await query('daily_rankings_v2', qs);
    if (res.data) {
        res.data = res.data.map(r => ({
            ...r,
            ...(r.products_master || {}),
            current_rank: r.rank
        }));
    }
    return res;
}

/**
 * Fetch Naver Best brands from trend_brands table
 */
export async function fetchNaverBestBrands({ categoryId = 'A', periodType = 'WEEKLY', limit = 30 } = {}) {
    const dateRes = await query('trend_brands', `select=created_at&order=created_at.desc&limit=1`);
    const latestDateStr = dateRes.data?.[0]?.created_at;
    if (!latestDateStr) return { data: [], count: 0 };
    const latestDatePrefix = latestDateStr.substring(0, 10);

    // Fetch more records to account for duplicates, then deduplicate in memory
    let qs = `select=*&period_type=eq.${periodType}&created_at=gte.${latestDatePrefix}T00:00:00&order=rank.asc&limit=${limit * 5}`;
    if (categoryId && categoryId !== 'A') {
        qs += `&category_id=eq.${encodeURIComponent(categoryId)}`;
    }

    const res = await query('trend_brands', qs);

    if (res.data) {
        const seen = new Set();
        const deduplicated = [];
        for (const item of res.data) {
            if (!seen.has(item.brand_name)) {
                seen.add(item.brand_name);
                deduplicated.push(item);
                if (deduplicated.length >= limit) break;
            }
        }
        res.data = deduplicated;
        res.count = deduplicated.length;
    }

    return res;
}

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
            // Update count after fallback calculation
            trendRes.count = trendRes.data.length;
        }
    }

    if (!trendRes.data || trendRes.data.length === 0) return { data: [], count: 0 };

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
    const prodResult = await query('products_master', `select=id,product_id,name,brand,image_url,url,price,review_count,review_rating&product_id=in.(${idFilter})`);
    const productsMap = {};
    (prodResult.data || []).forEach(p => { productsMap[p.product_id] = p; });

    // Step 4: merge
    const merged = specials
        .filter(s => productsMap[s.product_id])
        .map(s => {
            const p = productsMap[s.product_id];
            const specialPrice = s.special_price;
            // Try to find a meaningful original price (higher than special price)
            const origPrice = p.price && p.price > specialPrice ? p.price : null;
            const discountPct = origPrice
                ? Math.round((1 - specialPrice / origPrice) * 100)
                : (s.discount_rate || null);
            return {
                ...p,
                url: p.url,
                special_price: specialPrice,
                original_price: origPrice,
                discount_pct: discountPct,
                discount_rate: s.discount_rate || 0  // Always pass DB discount_rate for fallback
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
        // Fetch all rankings for the date, ordered by created_at DESC to get latest intraday data first
        let rankParams = `select=product_id,rank,category_code,created_at&source=eq.${platform}&date=eq.${latestDate}&order=created_at.desc`;
        if (categoryCode && categoryCode !== 'all') {
            rankParams += `&category_code=eq.${categoryCode}`;
        }

        const rankResult = await query('daily_rankings_v2', rankParams);
        const allRows = rankResult.data || [];

        if (allRows.length > 0) {
            // Deduplicate intraday data: keep only the latest record (first one encountered since we sorted by created_at desc)
            const latestRankMap = new Map();
            allRows.forEach(row => {
                if (!latestRankMap.has(row.product_id)) {
                    latestRankMap.set(row.product_id, row);
                }
            });

            // Convert back to array and sort by rank ASC
            const rankRows = Array.from(latestRankMap.values()).sort((a, b) => a.rank - b.rank);
            const productIds = rankRows.map(r => r.product_id);

            if (productIds.length > 0) {
                const idFilter = productIds.map(id => `"${id}"`).join(',');
                let prodParams = `select=*&id=in.(${idFilter})`;

                if (search) {
                    prodParams += `&or=(name.ilike.*${encodeURIComponent(search)}*,brand.ilike.*${encodeURIComponent(search)}*)`;
                }

                if (gender && gender !== 'all' && platform === 'musinsa') {
                    prodParams += `&tags->>gender=eq.${gender}`;
                }

                const prodResult = await query('products_master', prodParams);
                const productsMap = {};
                (prodResult.data || []).forEach(p => { productsMap[p.id] = p; });

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
    let dateFilterRank = '';
    let dateFilterPrice = '';

    if (days !== 'all') {
        const today = new Date();
        const startDate = new Date(today);
        startDate.setDate(today.getDate() - parseInt(days));
        const dateStr = startDate.toISOString().split('T')[0];
        dateFilterRank = `&date=gte.${dateStr}`;
        dateFilterPrice = `&snapshot_date=gte.${dateStr}`;
    }

    // 1. Fetch Rank History (order by created_at to capture intraday data)
    // Coalesce created_at to date if created_at is missing.
    const rankPromise = query('daily_rankings_v2', `select=rank,date,created_at&product_id=eq.${productId}${dateFilterRank}&order=created_at.asc`);

    // 2. Fetch Price History (from deals_snapshots)
    const pricePromise = query('deals_snapshots', `select=deal_price,original_price,snapshot_date&product_id=eq.${productId}${dateFilterPrice}&order=snapshot_date.asc`);


    const [ranks, prices] = await Promise.all([rankPromise, pricePromise]);

    // Map to consistently use a 'timestamp' property
    return {
        ranks: (ranks.data || []).map(r => ({
            timestamp: r.created_at || `${r.date}T00:00:00.000Z`,
            rank: r.rank
        })),
        prices: (prices.data || []).map(p => ({
            timestamp: p.created_at || `${p.snapshot_date}T00:00:00.000Z`,
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

export async function signUp(email, password, metadata = {}) {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
            email,
            password,
            options: {
                data: metadata
            }
        })
    });
    return await res.json();
}

export async function sendOtp(email) {
    try {
        const res = await fetch(`/api/auth/send-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
            return { error: data.error || '인증번호 전송에 실패했습니다.' };
        }
        return {};
    } catch (e) {
        return { error: e.message || '네트워크 오류가 발생했습니다.' };
    }
}

export async function verifyOtp(email, token) {
    try {
        const res = await fetch(`/api/auth/verify-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, code: token })
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
            return { error: data.error || '인증번호가 올바르지 않습니다.' };
        }

        // Store user info for later use during signup
        if (data.user) {
            localStorage.setItem('sb-user', JSON.stringify(data.user));
            // Fetch and store profile if exists
            try {
                const profile = await fetchUserProfile(data.user.id);
                if (profile) localStorage.setItem('sb-profile', JSON.stringify(profile));
            } catch (e) { }
        }
        return data;
    } catch (e) {
        return { error: e.message || '네트워크 오류가 발생했습니다.' };
    }
}

export async function updateUserPassword(password) {
    const token = localStorage.getItem('sb-token');
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
        method: 'PUT',
        headers: { ...headers, Authorization: `Bearer ${token}` },
        body: JSON.stringify({ password })
    });
    return await res.json();
}

export async function updateUserProfile(userId, profileData) {
    const token = localStorage.getItem('sb-token');
    const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`, {
        method: 'PATCH',
        headers: { ...headers, Authorization: `Bearer ${token}`, 'Prefer': 'return=representation' },
        body: JSON.stringify(profileData)
    });
    const data = await res.json();
    if (res.ok && data && data.length > 0) {
        localStorage.setItem('sb-profile', JSON.stringify(data[0]));
    }
    return { data, error: !res.ok ? data : null };
}

export async function signIn(email, password) {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) {
        return { error: data.msg || data.message || data.error_description || '이메일 또는 비밀번호가 올바르지 않습니다.' };
    }
    if (data.access_token) {
        localStorage.setItem('sb-token', data.access_token);
        localStorage.setItem('sb-user', JSON.stringify(data.user));

        // Fetch and store profile (membership tier)
        try {
            const profile = await fetchUserProfile(data.user.id);
            if (profile) localStorage.setItem('sb-profile', JSON.stringify(profile));
        } catch (e) {
            console.error('Failed to fetch profile on signin:', e);
        }
    }
    return data;
}

export async function fetchUserProfile(userId) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}&select=*`, {
        headers: headers
    });
    const data = await res.json();
    return data?.[0] || null;
}

export function getProfile() {
    return JSON.parse(localStorage.getItem('sb-profile') || 'null');
}

/**
 * DAILY USAGE TRACKING
 */
export function getDailyViewCount() {
    const today = new Date().toISOString().split('T')[0];
    const usage = JSON.parse(localStorage.getItem('usage-tracker') || '{}');
    if (usage.date !== today) {
        return 0;
    }
    return usage.count || 0;
}

export function incrementDetailViewCount() {
    const today = new Date().toISOString().split('T')[0];
    let usage = JSON.parse(localStorage.getItem('usage-tracker') || '{}');
    if (usage.date !== today) {
        usage = { date: today, count: 0 };
    }
    usage.count = (usage.count || 0) + 1;
    localStorage.setItem('usage-tracker', JSON.stringify(usage));
    return usage.count;
}

export function signOut() {
    localStorage.removeItem('sb-token');
    localStorage.removeItem('sb-user');
    window.location.reload();
}

export function getSession() {
    const token = localStorage.getItem('sb-token');
    const user = JSON.parse(localStorage.getItem('sb-user') || 'null');
    return token ? { access_token: token, user } : null;
}

/**
 * ANNOUNCEMENT FUNCTIONS
 */

export async function fetchPublishedAnnouncements(limit = 3) {
    return await query('board_announcements', `is_published=eq.true&order=created_at.desc&limit=${limit}`);
}

export async function fetchAnnouncements() {
    return await query('board_announcements', 'order=created_at.desc');
}

export async function insertAnnouncement(title, content, type, is_published, extra_langs = {}) {
    const session = getSession();
    if (!session) return { error: 'Not authenticated' };

    const bodyData = {
        title, content, type, is_published,
        title_en: extra_langs.title_en || '',
        content_en: extra_langs.content_en || '',
        title_ja: extra_langs.title_ja || '',
        content_ja: extra_langs.content_ja || '',
        title_th: extra_langs.title_th || '',
        content_th: extra_langs.content_th || '',
        title_vi: extra_langs.title_vi || '',
        content_vi: extra_langs.content_vi || '',
        title_id: extra_langs.title_id || '',
        content_id: extra_langs.content_id || ''
    };

    const response = await fetch(`${SUPABASE_URL}/rest/v1/board_announcements`, {
        method: 'POST',
        headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        },
        body: JSON.stringify(bodyData)
    });
    if (!response.ok) {
        const err = await response.json();
        return { error: err.message || 'Server error' };
    }
    return await response.json();
}

export async function updateAnnouncement(id, title, content, type, is_published, extra_langs = {}) {
    const session = getSession();
    if (!session) return { error: 'Not authenticated' };

    const bodyData = {
        title, content, type, is_published,
        title_en: extra_langs.title_en || '',
        content_en: extra_langs.content_en || '',
        title_ja: extra_langs.title_ja || '',
        content_ja: extra_langs.content_ja || '',
        title_th: extra_langs.title_th || '',
        content_th: extra_langs.content_th || '',
        title_vi: extra_langs.title_vi || '',
        content_vi: extra_langs.content_vi || '',
        title_id: extra_langs.title_id || '',
        content_id: extra_langs.content_id || ''
    };

    const response = await fetch(`${SUPABASE_URL}/rest/v1/board_announcements?id=eq.${id}`, {
        method: 'PATCH',
        headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        },
        body: JSON.stringify(bodyData)
    });
    if (!response.ok) {
        const err = await response.json();
        return { error: err.message || 'Server error' };
    }
    return await response.json();
}

export async function deleteAnnouncement(id) {
    const session = getSession();
    if (!session) return { error: 'Not authenticated' };

    const response = await fetch(`${SUPABASE_URL}/rest/v1/board_announcements?id=eq.${id}`, {
        method: 'DELETE',
        headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${session.access_token}`
        }
    });
    return response.ok;
}

/**
 * SAVED PRODUCTS FUNCTIONS
 */

export async function fetchSavedProducts() {
    const session = getSession();
    if (!session) return { data: [], count: 0 };

    const res = await fetch(`${SUPABASE_URL}/rest/v1/saved_products?select=*,products_master(*)&user_id=eq.${session.user.id}`, {
        headers: authHeaders(session.access_token)
    });
    const data = await res.json();
    const finalData = Array.isArray(data) ? data.map(d => {
        const p = d.products_master || {};
        return {
            ...p,
            ...d,
            platform: p.source || '기타',
            is_saved: true
        };
    }) : [];
    return { data: finalData, count: finalData.length };
}

async function resolveMasterId(productId, productData = null, autoInsert = false) {
    // If productId is already a numeric BigInt string or number
    if (!isNaN(Number(productId))) return Number(productId);

    const searchId = (productData && productData.product_id) ? productData.product_id : productId;

    // Check if it exists in products_master
    const res = await fetch(`${SUPABASE_URL}/rest/v1/products_master?product_id=eq.${encodeURIComponent(searchId)}&select=id`, {
        headers: headers
    });
    const data = await res.json();
    if (data && data.length > 0) return data[0].id;

    if (!autoInsert) return null;

    if (!productData || !productData.name) {
        throw new Error('해당 상품 정보를 가져올 수 없어 장바구니에 담을 수 없습니다.');
    }

    // Upsert into products_master dynamically for crawler-only products
    const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/products_master`, {
        method: 'POST',
        headers: { ...headers, 'Prefer': 'return=representation' },
        body: JSON.stringify({
            product_id: searchId,
            name: productData.name,
            brand: productData.brand || '',
            price: productData.special_price || productData.price || 0,
            image_url: productData.image_url || '',
            url: productData.url || '',
            source: productData.source || 'oliveyoung',
            category_code: productData.category_code || 'all'
        })
    });
    const insertData = await insertRes.json();
    if (insertData && insertData.length > 0) return insertData[0].id;

    throw new Error('상품 마스터 등록에 실패했습니다.');
}

export async function saveProduct(productId, pData = null) {
    const session = getSession();
    if (!session) throw new Error('Authentication required');

    const masterId = await resolveMasterId(productId, pData, true);

    const res = await fetch(`${SUPABASE_URL}/rest/v1/saved_products`, {
        method: 'POST',
        headers: { ...authHeaders(session.access_token), 'Prefer': 'return=representation' },
        body: JSON.stringify({
            user_id: session.user.id,
            product_id: masterId,
            memo: pData?.memo || ''
        })
    });
    return await res.json();
}

export async function removeProduct(productId) {
    const session = getSession();
    if (!session) throw new Error('Authentication required');

    const masterId = await resolveMasterId(productId, null, false);
    if (!masterId) return true; // Already removed or doesn't exist

    const res = await fetch(`${SUPABASE_URL}/rest/v1/saved_products?product_id=eq.${masterId}&user_id=eq.${session.user.id}`, {
        method: 'DELETE',
        headers: authHeaders(session.access_token)
    });
    return res.ok;
}

export async function checkIfSaved(productId) {
    const session = getSession();
    if (!session) return false;

    const masterId = await resolveMasterId(productId, null, false);
    if (!masterId) return false;

    const res = await fetch(`${SUPABASE_URL}/rest/v1/saved_products?product_id=eq.${masterId}&user_id=eq.${session.user.id}&select=id`, {
        headers: authHeaders(session.access_token)
    });
    const data = await res.json();
    return data && data.length > 0;
}

/**
 * Toggle wishlist status for a product.
 * @param {string} productId - The product ID
 * @param {boolean} shouldSave - true to save, false to remove
 */
export async function toggleWishlistStatus(productId, shouldSave) {
    if (shouldSave) {
        return await saveProduct(productId);
    } else {
        return await removeProduct(productId);
    }
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
    // Exclude 'Naver Data Lab' and 'Google Trend' as requested by user
    return query('products_master', 'select=brand&brand=not.in.(%22Naver%20Data%20Lab%22,%22Google%20Trend%22)&limit=1000');
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


// ==========================================
// Phase 7: Customer Center (Support APIs)
// ==========================================

export async function fetchFaqs() {
    return await query('support_faqs', 'select=*&is_published=eq.true&order=sort_order.asc');
}

export async function submitInquiry(type, title, message) {
    const session = await getSession();
    if (!session?.user) return { data: null, error: new Error('로그인이 필요합니다.') };

    try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/support_inquiries`, {
            method: 'POST',
            headers: {
                ...headers,
                'Authorization': `Bearer ${session.access_token}`,
                'Prefer': 'return=representation'
            },
            body: JSON.stringify({
                user_id: session.user.id,
                user_email: session.user.email,
                type: type,
                title: title,
                message: message
            })
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.message || '문의 등록 실패');
        }
        const data = await res.json();
        return { data: data[0], error: null };
    } catch (err) {
        return { data: null, error: err };
    }
}

export async function fetchUserInquiries() {
    const session = await getSession();
    if (!session?.user) return { data: [], count: 0 };
    return await query('support_inquiries', `select=*&user_id=eq.${session.user.id}&order=created_at.desc`);
}

export async function fetchAllInquiries() {
    return await query('support_inquiries', 'select=*&order=created_at.desc');
}

export async function updateInquiryReply(id, replyText, status) {
    const session = await getSession();
    if (!session?.user) return { error: new Error('로그인이 필요합니다.') };

    try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/support_inquiries?id=eq.${id}`, {
            method: 'PATCH',
            headers: {
                ...headers,
                'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({
                admin_reply: replyText,
                status: status
            })
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.message || '답변 등록 실패');
        }
        return { error: null };
    } catch (err) {
        return { error: err };
    }
}

export async function fetchAllFaqs() {
    return await query('support_faqs', 'select=*&order=sort_order.asc');
}

export async function manageFaq(action, payload) {
    const session = await getSession();
    if (!session?.user) return { error: new Error('로그인이 필요합니다.') };

    const fetchHeaders = {
        ...headers,
        'Authorization': `Bearer ${session.access_token}`,
        'Prefer': 'return=representation'
    };

    try {
        let res;
        if (action === 'POST') {
            res = await fetch(`${SUPABASE_URL}/rest/v1/support_faqs`, {
                method: 'POST',
                headers: fetchHeaders,
                body: JSON.stringify(payload)
            });
        } else if (action === 'PATCH') {
            res = await fetch(`${SUPABASE_URL}/rest/v1/support_faqs?id=eq.${payload.id}`, {
                method: 'PATCH',
                headers: fetchHeaders,
                body: JSON.stringify(payload)
            });
        } else if (action === 'DELETE') {
            res = await fetch(`${SUPABASE_URL}/rest/v1/support_faqs?id=eq.${payload.id}`, {
                method: 'DELETE',
                headers: fetchHeaders
            });
            if (res.ok) return { data: null, error: null };
        }

        if (!res.ok) throw new Error('FAQ 관리 실패');
        const data = await res.json();
        return { data: data[0], error: null };
    } catch (err) {
        return { data: null, error: err };
    }
}
