/**
 * Ably Source Bridge
 */
import { fetchRankedProducts, fetchProductCount, fetchCategories, fetchTrending } from '../supabase.js';

export const AblyBridge = {
    id: 'ably',
    name: 'Ably',
    tabs: [
        { id: 'all', icon: '📋', label: 'tabs.all' },
        { id: 'trending', icon: '🔥', label: 'tabs.trending' },
        { id: 'wishlist', icon: '❤️', label: 'tabs.favorites' }
    ],

    async getKPIs(currentPlatform) {
        const [total, trending] = await Promise.all([
            fetchProductCount(currentPlatform),
            fetchTrending(100, currentPlatform)
        ]);
        return [
            { id: 'total', icon: '📦', value: total || '0', label: 'kpi.total', format: true },
            { id: 'trending', icon: '🔥', value: trending.count || '0', label: 'kpi.trending' }
        ];
    },

    async getCategories() {
        return {
            data: [
                { category_code: 'ALL', name_ko: '전체', name_en: 'All', depth: 1 },
                { category_code: 'WOMEN', name_ko: '여성패션', name_en: 'Women', depth: 1 },
                { category_code: 'BEAUTY', name_ko: '뷰티', name_en: 'Beauty', depth: 1 },
                { category_code: 'SHOES', name_ko: '신발', name_en: 'Shoes', depth: 1 },
                { category_code: 'BAG', name_ko: '가방', name_en: 'Bags', depth: 1 }
            ],
            count: 5
        };
    },

    async fetchData(tabId, state) {
        return await fetchRankedProducts({
            page: state.currentPage,
            perPage: state.perPage,
            search: state.searchQuery,
            categoryCode: state.activeCategory,
            platform: 'ably'
        });
    },

    renderCustomHeader(state) { return ''; }
};
