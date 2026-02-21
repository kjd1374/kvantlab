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
        { id: 'wishlist', icon: '❤️', label: 'tabs.favorites' },
        { id: 'insights', icon: '📊', label: 'tabs.insights' },
        { id: 'logs', icon: '📋', label: 'tabs.crawl_logs' }
    ],

    async getKPIs(currentPlatform) {
        const [trending, dealsCount, reviews, total] = await Promise.all([
            fetchTrending(1, currentPlatform),
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
        // Olive Young specific header adjustments if any
        return '';
    }
};
