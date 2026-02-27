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
        if (state.currentTab === 'deals') {
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
                <div id="oyDealTimer" style="font-size: 24px; font-weight: 800; font-family: monospace; background: rgba(255,255,255,0.1); padding: 8px 16px; border-radius: 8px; letter-spacing: 2px;">
                    --:--:--
                </div>
            </div>
            `;
        }
        return '';
    }
};
