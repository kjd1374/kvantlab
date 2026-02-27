/**
 * Steady Seller Source Bridge
 */
import { fetchSteadySellers } from '../supabase.js';

export const SteadySellerBridge = {
    id: 'steady_sellers',
    name: 'Steady Sellers',
    tabs: [],

    async getKPIs(currentPlatform) {
        const res = await fetchSteadySellers();
        return [
            { id: 'total', icon: '📦', value: res.count || 0, label: '총 스테디 셀러' }
        ];
    },

    async getCategories() {
        const res = await fetchSteadySellers();
        const data = res.data || [];
        const brands = new Set();
        data.forEach(item => {
            if (item.brand) brands.add(item.brand);
        });

        const brandList = Array.from(brands).sort();
        const categories = [{ category_code: 'ALL', name_ko: '전체 (All)', name_en: 'All Brands', depth: 1 }];

        brandList.forEach(brand => {
            categories.push({ category_code: brand, name_ko: brand, name_en: brand, depth: 1 });
        });

        return {
            data: categories,
            count: categories.length
        };
    },

    async fetchData(tabId, state) {
        let res = await fetchSteadySellers();
        let sourceData = res.data || [];

        // Apply category filter if one is selected (and not 'ALL')
        if (state.activeCategory && state.activeCategory !== 'ALL' && state.activeCategory !== 'all') {
            sourceData = sourceData.filter(item => item.brand === state.activeCategory);
        }

        const formattedData = sourceData.map(item => ({
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
            </div>
        `;
    },

    renderTabContent(tabId, result, state) {
        const data = result.data || [];
        if (data.length === 0) return `<div style="padding:40px; text-align:center; color:var(--text-muted);">${window.t('common.no_results') || '조건에 맞는 스테디셀러가 없습니다.'}</div>`;

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
