/**
 * Olive Young Source Bridge
 * Encapsulates Olive Young specific logic and UI rendering
 */
import {
    fetchTrending,
    fetchDailySpecials,
    fetchReviewGrowth,
    fetchRankedProducts,
    fetchDealsCount,
    fetchProductCount,
    fetchCategories
} from '../supabase.js';

export const OliveYoungBridge = {
    id: 'oliveyoung',
    name: 'Olive Young',
    tabs: [
        { id: 'all', icon: '📋', label: 'tabs.all' },
        { id: 'trending', icon: '🔥', label: 'tabs.trending' },
        { id: 'deals', icon: '💰', label: 'tabs.deals' },
        { id: 'reviews', icon: '⭐', label: 'tabs.reviews' },
        { id: 'wishlist', icon: '❤️', label: 'tabs.favorites' }
    ],

    async getKPIs(currentPlatform) {
        const [trending, dealsCount, reviews, total] = await Promise.all([
            fetchTrending(100, currentPlatform),
            fetchDealsCount(currentPlatform),
            fetchReviewGrowth(1, currentPlatform),
            fetchProductCount(currentPlatform)
        ]);

        return [
            { id: 'trending', icon: '🔥', value: trending.count || '0', label: 'kpi.trending' },
            { id: 'deals', icon: '💰', value: dealsCount || '0', label: 'kpi.deals' },
            { id: 'reviews', icon: '⭐', value: reviews.count || '0', label: 'kpi.reviews' },
            { id: 'total', icon: '📦', value: total || '0', label: 'kpi.total', format: true }
        ];
    },

    async getSourcingSignals(currentPlatform, currentCategory) {
        // Fetch top 100 products for current category to determine signals
        const result = await fetchRankedProducts({
            page: 1,
            perPage: 100,
            search: '',
            categoryCode: currentCategory,
            platform: currentPlatform,
            gender: 'all'
        });
        
        const products = result.data || [];
        const rankedProducts = products.map((p, idx) => ({ ...p, _current_rank: idx + 1 }));
        
        let blueOcean = [...rankedProducts]
            .filter(p => p.rank_change > 0 && p.review_count < 3000)
            .sort((a, b) => b.rank_change - a.rank_change)
            .slice(0, 10);
            
        if (blueOcean.length < 10) {
            const fallback = [...rankedProducts]
                .filter(p => p._current_rank >= 10 && p._current_rank <= 25 && !blueOcean.find(b => b.product_id === p.product_id))
                .sort((a, b) => (b.review_count || 0) - (a.review_count || 0));
            blueOcean = [...blueOcean, ...fallback].slice(0, 10);
        }
            
        // 2. Red Ocean (Highly Competitive/Warning): Top 15 rank but dropping
        let redOcean = [...rankedProducts]
            .filter(p => p._current_rank <= 15 && p.rank_change < 0)
            .sort((a, b) => a.rank_change - b.rank_change) // Most negative first
            .slice(0, 10);
            
        if (redOcean.length < 10) {
            // Fallback: Just the absolute top items with massive reviews
            const fallback = [...rankedProducts]
                .filter(p => p._current_rank <= 5 && !redOcean.find(r => r.product_id === p.product_id))
                .sort((a, b) => b.review_count - a.review_count);
            redOcean = [...redOcean, ...fallback].slice(0, 10);
        }
        
        // 3. Steady Sellers: Massive reviews, top ranking
        const steadySellers = [...rankedProducts]
            .filter(p => p.review_count > 1000)
            .sort((a, b) => b.review_count - a.review_count)
            .slice(0, 10);

        return { blueOcean, redOcean, steadySellers };
    },

    async getCategories() {
        return await fetchCategories('oliveyoung');
    },

    async fetchData(tabId, state) {
        switch (tabId) {
            case 'all':
                return await fetchRankedProducts({
                    page: state.currentPage,
                    perPage: state.perPage,
                    search: state.searchQuery,
                    categoryCode: state.activeCategory,
                    platform: state.currentPlatform,
                    gender: state.genderFilter
                });
            case 'trending':
                return await fetchTrending(100, state.currentPlatform);
            case 'deals':
                return await fetchDailySpecials(state.currentPlatform);
            case 'reviews':
                return await fetchReviewGrowth(100, state.currentPlatform);
            default:
                return { data: [], count: 0 };
        }
    },

    renderCustomHeader(state) {
        if (state.activeTab === 'deals') {
            return `
            <div style="background: linear-gradient(135deg, #111111, #333333); color: white; padding: 15px 20px; border-radius: 12px; margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
                <div>
                    <h3 style="margin: 0; font-size: 18px; display: flex; align-items: center; gap: 8px;">
                        🔥 ${window.t('deals.today_title') || '오늘의 특가 주문 마감까지'}
                    </h3>
                    <p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.8;">
                        ${window.t('deals.today_desc') || 'KST(한국시간) 매일 저녁 9시에 주문이 마감됩니다.'}
                    </p>
                </div>
                <div id="oyDealTimer" style="font-size: 24px; font-weight: 800; font-family: monospace; background: rgba(255,255,255,0.1); padding: 8px 16px; border-radius: 8px; letter-spacing: 2px; white-space: nowrap;">
                    --:--:--
                </div>
            </div>
            `;
        }
        return '';
    },

    bindCustomHeaderEvents(onTabSwitch) {
        const timerEl = document.getElementById('oyDealTimer');
        if (timerEl) {
            if (window.dealsTimerInterval) clearInterval(window.dealsTimerInterval);

            const updateTimer = () => {
                const now = new Date();
                // Get current time in KST
                const kstTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
                const kstTarget = new Date(kstTime);

                const kstHour = kstTime.getHours();

                // Between 9 PM and Midnight KST -> Hide Timer
                if (kstHour >= 21) {
                    timerEl.innerHTML = `<span style="font-size: 14px; font-weight: 500; font-family: Pretendard, -apple-system, sans-serif; opacity: 0.9; white-space: nowrap;">${window.t('deals.closed_message') || '✅ 금일 주문 마감 (내일 특가 준비중)'}</span>`;
                    timerEl.style.letterSpacing = 'normal';
                    return;
                }

                // Restore styles if transitioned from closed state
                timerEl.style.letterSpacing = '2px';

                // Target is 21:00 (9 PM) KST today
                kstTarget.setHours(21, 0, 0, 0);

                const diffMs = kstTarget - kstTime;

                const h = Math.floor(diffMs / 3600000);
                const m = Math.floor((diffMs % 3600000) / 60000);
                const s = Math.floor((diffMs % 60000) / 1000);

                timerEl.textContent = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
            };

            updateTimer();
            window.dealsTimerInterval = setInterval(updateTimer, 1000);
        } else if (window.dealsTimerInterval) {
            clearInterval(window.dealsTimerInterval);
            window.dealsTimerInterval = null;
        }
    }
};
