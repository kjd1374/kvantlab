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
            <div class="steady-sellers-compact-header">
                <h2>🏆 Steady Sellers</h2>
                <p>K-Vant 엄선 브랜드</p>
            </div>
        `;
    },

    renderTabContent(tabId, result, state) {
        const data = result.data || [];
        if (data.length === 0) return null;

        // Group by brand
        const grouped = data.reduce((acc, item) => {
            const brand = item.brand || 'Other Brands';
            if (!acc[brand]) acc[brand] = [];
            acc[brand].push(item);
            return acc;
        }, {});

        return `
            <div class="steady-sellers-container">
                ${Object.entries(grouped).map(([brand, products]) => `
                    <div class="brand-group">
                        <div class="brand-group-header">
                            <h3 class="brand-title">${brand}</h3>
                            <span class="brand-count">${products.length} Products</span>
                        </div>
                        <div class="brand-products-grid">
                            ${products.map(p => `
                                <div class="ss-product-card overlay-card" onclick="window.__openProduct(${JSON.stringify(p).replace(/"/g, '&quot;')})">
                                    <div class="ss-product-img-wrapper">
                                        <img src="${p.image_url}" alt="${p.name}" class="ss-product-img" loading="lazy">
                                    </div>
                                    <div class="ss-product-overlay">
                                        <h4 class="ss-product-name">${p.name}</h4>
                                        <div class="ss-product-price">
                                            <span class="currency">₩</span>
                                            <span class="amount">${new Intl.NumberFormat().format(p.special_price)}</span>
                                        </div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }
};
