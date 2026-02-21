/**
 * Shinsegae (SSG) Source Bridge
 */
import { fetchRankedProducts, fetchProductCount, fetchCategories } from '../supabase.js';

export const ShinsegaeBridge = {
    id: 'ssg',
    name: 'Shinsegae',
    tabs: [
        { id: 'all', icon: '📋', label: 'tabs.all' },
        { id: 'trending', icon: '🔥', label: 'tabs.trending' }
    ],

    async getKPIs(currentPlatform) {
        const total = await fetchProductCount(currentPlatform);
        return [
            { id: 'total', icon: '📦', value: total || '0', label: 'kpi.total', format: true }
        ];
    },

    async getCategories() {
        return {
            data: [
                { category_code: 'ALL', name_ko: '전체', name_en: 'All', depth: 1 },
                { category_code: 'BEAUTY', name_ko: '뷰티', name_en: 'Beauty', depth: 1 },
                { category_code: 'FASHION', name_ko: '패션', name_en: 'Fashion', depth: 1 },
                { category_code: 'LUXURY', name_ko: '명품', name_en: 'Luxury', depth: 1 },
                { category_code: 'KIDS', name_ko: '유아동', name_en: 'Kids', depth: 1 },
                { category_code: 'SPORTS', name_ko: '스포츠', name_en: 'Sports', depth: 1 },
                { category_code: 'FOOD_LIFE', name_ko: '푸드&리빙', name_en: 'Food & Life', depth: 1 }
            ],
            count: 7
        };
    },

    async fetchData(tabId, state) {
        return await fetchRankedProducts({
            page: state.currentPage,
            perPage: state.perPage,
            search: state.searchQuery,
            categoryCode: state.activeCategory,
            platform: 'ssg'
        });
    },

    renderCustomHeader(state) { return ''; }
};
