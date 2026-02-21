/**
 * Steady Seller Source Bridge
 */
export const SteadySellerBridge = {
    id: 'steady_sellers',
    name: 'Steady Sellers',
    tabs: [
        { id: 'all', icon: '🏆', label: 'Best Sellers' }
    ],

    async getKPIs(currentPlatform) {
        return [
            { id: 'total', icon: '📦', value: 'Coming soon', label: 'Preparing data' }
        ];
    },

    async getCategories() {
        return {
            data: [
                { category_code: 'steady', name_ko: '스테디셀러 준비중', name_en: 'Steady Sellers (Soon)', depth: 1 }
            ],
            count: 1
        };
    },

    async fetchData(tabId, state) {
        return { data: [], count: 0 };
    },

    renderCustomHeader(state) { return ''; }
};
