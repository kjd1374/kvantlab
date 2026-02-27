/**
 * Steady Seller Source Bridge
 */
import { fetchSteadySellers } from '../supabase.js';

export const SteadySellerBridge = {
    id: 'steady_sellers',
    name: 'Steady Sellers',
    tabs: [
        { id: 'all', icon: '🏆', label: 'Best Sellers' }
    ],

    async getKPIs(currentPlatform) {
        const res = await fetchSteadySellers();
        return [
            { id: 'total', icon: '📦', value: res.count || 0, label: '총 스테디 셀러' }
        ];
    },

    async getCategories() {
        return {
            data: [
                { category_code: 'all', name_ko: '전체 스테디 셀러', name_en: 'All Steady Sellers', depth: 1 }
            ],
            count: 1
        };
    },

    async fetchData(tabId, state) {
        const res = await fetchSteadySellers();

        // Map data to match existing Olive Young product card format
        const formattedData = (res.data || []).map(item => ({
            id: item.id,
            product_id: item.id,
            url: item.link,
            image_url: item.image_url,
            brand: item.brand,
            name: item.product_name,
            current_rank: item.rank,
            special_price: item.price,
            original_price: item.price, // Fallback
            source: 'steady_sellers'
        }));

        return { data: formattedData, count: formattedData.length };
    },

    renderCustomHeader(state) {
        return `
            <div style="margin-bottom: 20px; text-align: center;">
                <h2 style="font-size: 24px; font-weight: 700; color: #333; margin-bottom: 5px;">🔥 Steady Sellers</h2>
                <p style="color: #666; font-size: 14px;">데이터 풀이 엄선한 최고의 스테디 셀러 상품들입니다.</p>
            </div>
        `;
    }
};
