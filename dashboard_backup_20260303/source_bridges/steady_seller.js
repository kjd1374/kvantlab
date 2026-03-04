/**
 * Steady Seller Source Bridge
 */
import { fetchSteadySellers } from '../supabase.js';

export const SteadySellerBridge = {
    id: 'steady_sellers',
    name: 'Steady Sellers',
    tabs: [
        { id: 'all', icon: '🏆', label: 'platforms.steady_sellers' }
    ],

    async getKPIs(currentPlatform) {
        const res = await fetchSteadySellers();
        return [
            { id: 'total', icon: '📦', value: res.count || 0, label: 'kpi.total_steady' }
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
            // Provide category_name for main.js to use in translateKeywords
            categories.push({
                category_code: brand,
                category_name: brand,
                name_ko: brand,
                name_en: '', // Leave empty to trigger auto-translation in main.js
                depth: 1
            });
        });

        return {
            data: categories,
            count: categories.length
        };
    },

    async fetchData(tabId, state) {
        let res = await fetchSteadySellers();
        let sourceData = res.data || [];

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
            original_price: item.price,
            source: 'steady_sellers'
        }));

        return { data: formattedData, count: formattedData.length };
    },

    renderCustomHeader(state) {
        return `
            <div class="steady-sellers-compact-header">
                <h2>🏆 ${window.t('platforms.steady_sellers') || 'Steady Sellers'}</h2>
            </div>
        `;
    },

    renderTabContent(tabId, result, state) {
        const data = result.data || [];
        if (data.length === 0) return `<div style="padding:40px; text-align:center; color:var(--text-muted);">${window.t('common.no_results')}</div>`;

        const grouped = data.reduce((acc, item) => {
            const brand = item.brand || 'Other Brands';
            if (!acc[brand]) acc[brand] = [];
            acc[brand].push(item);
            return acc;
        }, {});

        const profile = typeof window.getProfile === 'function' ? window.getProfile() : (JSON.parse(localStorage.getItem('sb-profile') || 'null'));
        const isPro = typeof window.__isProMember === 'function' ? window.__isProMember(profile) : true;

        return `
            <div class="steady-sellers-container">
                ${Object.entries(grouped).map(([brand, products]) => `
                    <div class="brand-group">
                        <div class="brand-group-header">
                            <h3 class="brand-title product-brand" data-pid="${products[0].id}">${brand}</h3>
                            <span class="brand-count">${products.length} Items</span>
                        </div>
                        <div class="brand-products-grid">
                            ${products.map(p => {
            const isLocked = !isPro;
            const displayName = isLocked && typeof window.__maskText === 'function' ? window.__maskText(p.name) : p.name;

            return `
                                <div class="ss-product-card overlay-card ${isLocked ? 'locked-card' : ''}" onclick="${isLocked ? '' : `window.__openProduct(${JSON.stringify(p).replace(/"/g, '&quot;')})`}">
                                    ${isLocked ? `<div class="locked-overlay"><span>PRO Only</span></div>` : ''}
                                    <div class="ss-product-img-wrapper">
                                        <img src="${p.image_url}" alt="${displayName}" class="ss-product-img" loading="lazy">
                                    </div>
                                    <div class="ss-product-overlay">
                                        <h4 class="ss-product-name product-name" data-pid="${p.id}">${displayName}</h4>
                                        <div class="ss-product-price">
                                            <span class="currency">₩</span>
                                            <span class="amount">${new Intl.NumberFormat().format(p.special_price)}</span>
                                        </div>
                                    </div>
                                </div>
                            `}).join('')}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }
};
