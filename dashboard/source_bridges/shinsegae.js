/**
 * Shinsegae (SSG) Source Bridge
 */
import { fetchRankedProducts, fetchProductCount, fetchCategories } from '../supabase.js';

export const ShinsegaeBridge = {
    id: 'ssg',
    name: 'Shinsegae',
    tabs: [
        { id: 'all', icon: '📋', label: 'tabs.all' },
        { id: 'trending', icon: '🔥', label: 'tabs.trending' },
        { id: 'wishlist', icon: '❤️', label: 'tabs.favorites' }
    ],

    async getKPIs(currentPlatform) {
        const total = await fetchProductCount(currentPlatform);
        return [
            { id: 'total', icon: '📦', value: total || '0', label: 'kpi.total', format: true }
        ];
    },

    async getSourcingSignals(currentPlatform, currentCategory) {
        const result = await fetchRankedProducts({
            page: 1,
            perPage: 100,
            search: '',
            categoryCode: currentCategory === 'ALL' || !currentCategory ? 'ALL' : currentCategory,
            platform: 'ssg'
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
            
        let redOcean = [...rankedProducts]
            .filter(p => p._current_rank <= 15 && p.rank_change < 0)
            .sort((a, b) => a.rank_change - b.rank_change)
            .slice(0, 10);
            
        if (redOcean.length < 10) {
            const fallback = [...rankedProducts]
                .filter(p => p._current_rank <= 5 && !redOcean.find(r => r.product_id === p.product_id))
                .sort((a, b) => b.review_count - a.review_count);
            redOcean = [...redOcean, ...fallback].slice(0, 10);
        }
        
        const steadySellers = [...rankedProducts]
            .filter(p => p.review_count > 1000)
            .sort((a, b) => b.review_count - a.review_count)
            .slice(0, 10);

        return { blueOcean, redOcean, steadySellers };
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
