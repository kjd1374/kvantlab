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
        return `
      <div class="musinsa-filters" style="display:flex; gap:10px; margin-left: 20px;">
        <button class="chip ${state.genderFilter === 'all' ? 'active' : ''}" onclick="setGender('all')">All</button>
        <button class="chip ${state.genderFilter === 'male' ? 'active' : ''}" onclick="setGender('male')">Men</button>
        <button class="chip ${state.genderFilter === 'female' ? 'active' : ''}" onclick="setGender('female')">Women</button>
      </div>
    `;
    }
};
