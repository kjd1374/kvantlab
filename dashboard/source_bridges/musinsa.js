/**
 * Musinsa Source Bridge
 * Encapsulates Musinsa specific logic and UI rendering
 */
import {
    fetchRankedProducts,
    fetchProducts,
    fetchProductCount,
    fetchCategories,
    fetchTrending
} from '../supabase.js';

export const MusinsaBridge = {
    id: 'musinsa',
    name: 'Musinsa',
    tabs: [
        { id: 'all', icon: '📋', label: 'tabs.musinsa_ranking' },
        { id: 'trending', icon: '🔥', label: 'tabs.trending' },
        { id: 'wishlist', icon: '❤️', label: 'tabs.favorites' }
    ],

    async getKPIs(currentPlatform) {
        const total = await fetchProductCount(currentPlatform);

        return [
            { id: 'total', icon: '📦', value: total || '0', label: 'kpi.total_musinsa', format: true },
            { id: 'brands', icon: '🔖', value: '800+', label: 'kpi.musinsa_brands' }
        ];
    },

    async getSourcingSignals(currentPlatform, currentCategory) {
        const result = await fetchRankedProducts({
            page: 1,
            perPage: 100,
            search: '',
            categoryCode: currentCategory === '000' || !currentCategory ? 'ALL' : currentCategory,
            platform: 'musinsa',
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
        const result = await fetchCategories('musinsa');
        if (!result || !result.data) return { data: [], count: 0 };

        // Filter out depth 2 (sub-categories like 블루종/MA-1) so it matches Musinsa's top-level
        let topCats = result.data.filter(c => c.depth === 1);

        // Ensure "전체" (All) category stands first if not already present
        if (!topCats.find(c => c.category_code === '000')) {
            topCats.unshift({
                category_code: '000',
                name_ko: '전체',
                name_en: 'All',
                depth: 1
            });
        }

        return { data: topCats, count: topCats.length };
    },

    async fetchData(tabId, state) {
        switch (tabId) {
            case 'all':
                return await fetchRankedProducts({
                    page: state.currentPage,
                    perPage: state.perPage,
                    search: state.searchQuery,
                    categoryCode: state.activeCategory,
                    platform: 'musinsa',
                    gender: state.genderFilter
                });
            case 'trending':
                return await fetchTrending(100, state.currentPlatform);
            default:
                return { data: [], count: 0 };
        }
    },

    renderCustomHeader(state) {
        // Gender tabs are now rendered inline via renderGenderRow() instead of in the header
        return '';
    },

    renderGenderRow(state) {
        return `
      <div class="musinsa-gender-row" style="display:flex; gap:10px; justify-content:center; margin: 10px 0;">
        <button class="chip ${state.genderFilter === 'all' ? 'active' : ''}" onclick="setGender('all')">All</button>
        <button class="chip ${state.genderFilter === 'male' ? 'active' : ''}" onclick="setGender('male')">Men</button>
        <button class="chip ${state.genderFilter === 'female' ? 'active' : ''}" onclick="setGender('female')">Women</button>
      </div>
    `;
    }
};
