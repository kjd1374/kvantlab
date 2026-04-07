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

    async getSourcingSignals(currentPlatform, currentCategory) {
        const result = await fetchRankedProducts({
            page: 1,
            perPage: 100,
            search: '',
            categoryCode: currentCategory === 'ALL' || !currentCategory ? 'ALL' : currentCategory,
            platform: 'ably'
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
