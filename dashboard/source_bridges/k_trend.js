/**
 * Korea Trend Source Bridge - AI 글로벌 트렌드 분석 대시보드 v2 (i18n + no-image)
 */
import { fetchGlobalShoppingTrends, fetchOyProductByBrand } from '../supabase.js';

// English → Korean brand name mapping for Olive Young product lookup
const BRAND_KO_MAP = {
    'COSRX': 'COSRX',
    'Laneige': '라네즈',
    'ANUA': 'ANUA',
    'Anua': 'ANUA',
    'Round Lab': '라운드랩',
    'Torriden': '토리든',
    'Torrid (or Torriden)': '토리든',
    'Beauty of Joseon': '조선미녀',
    'Mediheal': '메디힐',
    "Rom&nd": '롬앤',
    'Amuse': '어뮤즈',
    'Innisfree': '이니스프리',
    'Etude': '에뛰드',
    'Sulwhasoo': '설화수',
    'Amorepacific': '아모레퍼시픽',
    'The Ordinary': 'The Ordinary',
    'Skin1004': 'SKIN1004',
    'Papa Recipe': '파파레시피',
    'I\'m From': '아임프롬',
    'Klairs': '클레어스',
};

export const KoreaTrendBridge = {
    id: 'k_trend',
    name: 'Korea Trends',
    tabs: [
        { id: 'global_trends', icon: '🌏', label: 'tabs.global_trends' }
    ],

    filterState: {
        country: 'ALL',
        category: 'ALL'
    },

    async getKPIs(currentPlatform) {
        return [
            { id: 'google', icon: '📈', value: 'Google', label: 'Search' },
            { id: 'youtube', icon: '▶️', value: 'YouTube', label: 'Video' }
        ];
    },

    async getCategories() {
        return {
            data: [
                { category_code: 'ALL', name_ko: '전체', name_en: 'All', depth: 1 },
                { category_code: 'Google', name_ko: '구글 트렌드', name_en: 'Google Trends', depth: 1 },
                { category_code: 'YouTube', name_ko: '유튜브 트렌드', name_en: 'YouTube Trends', depth: 1 }
            ],
            count: 3
        };
    },

    async fetchData(tabId, state) {
        const res = await fetchGlobalShoppingTrends(this.filterState.country, this.filterState.category);
        let data = (res.data || []);

        // Source filter via category chips
        const activeCategory = state.activeCategory || 'ALL';
        if (activeCategory === 'Google') {
            data = data.filter(item =>
                (item.data_sources || []).some(src =>
                    src.toLowerCase().includes('google') || src.toLowerCase().includes('blog'))
            );
        } else if (activeCategory === 'YouTube') {
            data = data.filter(item =>
                (item.data_sources || []).some(src => src.toLowerCase().includes('youtube'))
            );
        }

        // Lookup OY products for each trend item (in parallel, best-effort)
        const enriched = await Promise.all(data.map(async item => {
            const brandEn = item.brand_name || '';
            const brandKo = BRAND_KO_MAP[brandEn] || '';
            let oyProducts = [];
            if (brandKo) {
                try {
                    const oy = await fetchOyProductByBrand(brandKo, item.product_name);
                    oyProducts = oy.data || [];
                } catch (e) { /* ignore */ }
            }

            const sources = item.data_sources || [];
            const imgUrlItem = sources.find(src => typeof src === 'string' && src.startsWith('IMG::'));
            const imageUrl = imgUrlItem
                ? imgUrlItem.substring(5)
                : `https://via.placeholder.com/300?text=${encodeURIComponent(brandEn || 'Item')}`;

            return { ...item, imageUrl, oyProducts, brandKo };
        }));

        // Return raw enriched data — rendering is done in renderTabContent override
        return { data: enriched, count: enriched.length, _isDashboard: true };
    },

    renderTabContent(tabId, result, state) {
        if (!result || !result._isDashboard) return null; // Fall back to default renderer
        const data = result.data || [];
        if (data.length === 0) {
            return `<div class="gt-empty"><span>🌏</span><p>${window.t('sections.k_trend_empty') || '선택한 조건에 해당하는 글로벌 트렌드 데이터가 없습니다.'}</p></div>`;
        }
        return this._renderDashboard(data);
    },

    _renderDashboard(data) {
        // ── KPI Aggregates ──────────────────────────────────────
        const totalMentions = data.reduce((s, d) => s + (d.mention_count || 0), 0);
        const topBrandEntry = data.reduce((max, d) => (d.mention_count > (max?.mention_count || 0) ? d : max), null);
        const topBrand = topBrandEntry?.brand_name || '—';

        // Category distribution
        const catMap = {};
        data.forEach(d => { const c = d.main_category || 'Unknown'; catMap[c] = (catMap[c] || 0) + (d.mention_count || 0); });
        const topCatEntry = Object.entries(catMap).sort((a, b) => b[1] - a[1])[0];
        const topCategory = topCatEntry ? topCatEntry[0] : '—';

        // ── Brand aggregates ────────────────────────────────────
        const brandMap = {};
        data.forEach(d => {
            const b = d.brand_name || 'Unknown';
            brandMap[b] = (brandMap[b] || 0) + (d.mention_count || 0);
        });
        const brandEntries = Object.entries(brandMap).sort((a, b) => b[1] - a[1]).slice(0, 8);
        const maxBrandCount = brandEntries[0]?.[1] || 1;

        // ── Keyword aggregates ──────────────────────────────────
        const kwMap = {};
        data.forEach(d => {
            (d.key_benefits || []).forEach(kw => {
                if (kw && kw.length > 2) {
                    kwMap[kw] = (kwMap[kw] || 0) + 1;
                }
            });
        });
        const kwEntries = Object.entries(kwMap).sort((a, b) => b[1] - a[1]).slice(0, 12);

        // ── Product List ────────────────────────────────────────
        const productRows = data.map(item => {
            const tags = (item.key_benefits || []).slice(0, 3).map(t => `<span class="gt-tag">#${t}</span>`).join('');
            const oyLinks = (item.oyProducts || []).slice(0, 1).map(oy =>
                `<a href="${oy.url || '#'}" target="_blank" class="gt-oy-link" title="${oy.name}">${window.t('gt.gt_oy_link') || '🛒 OY에서 확인'}</a>`
            ).join('');
            const matchBadge = item.oyProducts?.length > 0
                ? `<span class="gt-match-badge">${window.t('gt.gt_oy_matched') || '✓ OY 연동'}</span>`
                : '';
            // Detect placeholder/missing image
            const isPlaceholder = !item.imageUrl || item.imageUrl.includes('placeholder.com') || item.imageUrl.includes('via.placeholder');
            const imgHtml = isPlaceholder
                ? `<div class="gt-product-img gt-no-image"><span>${window.t('gt.gt_no_image') || '이미지 없음'}</span></div>`
                : `<img class="gt-product-img" src="${item.imageUrl}" alt="${item.product_name}" loading="lazy" onerror="this.outerHTML='<div class=&quot;gt-product-img gt-no-image&quot;><span>${window.t('gt.gt_no_image') || '이미지 없음'}</span></div>'">`;
            return `
                <div class="gt-product-row">
                    ${imgHtml}
                    <div class="gt-product-info">
                        <div class="gt-product-brand">${item.brand_name || ''} ${matchBadge}</div>
                        <div class="gt-product-name">${item.product_name}</div>
                        <div class="gt-product-tags">${tags}</div>
                    </div>
                    <div class="gt-product-meta">
                        <div class="gt-mention-count">💬 ${item.mention_count}${window.t('gt.gt_mentions') || '건 언급'}</div>
                        ${oyLinks}
                    </div>
                </div>`;
        }).join('');

        // ── Brand Bar Chart (CSS-only) ──────────────────────────
        const brandBars = brandEntries.map(([brand, count]) => {
            const pct = Math.round((count / maxBrandCount) * 100);
            return `
                <div class="gt-bar-row">
                    <span class="gt-bar-label">${brand}</span>
                    <div class="gt-bar-track">
                        <div class="gt-bar-fill" style="width:${pct}%"></div>
                    </div>
                    <span class="gt-bar-value">${count}</span>
                </div>`;
        }).join('');

        // ── Keyword Chips ───────────────────────────────────────
        const maxKwCount = kwEntries[0]?.[1] || 1;
        const kwChips = kwEntries.map(([kw, count]) => {
            const size = count >= maxKwCount * 0.7 ? 'lg' : count >= maxKwCount * 0.4 ? 'md' : 'sm';
            return `<span class="gt-kw-chip gt-kw-${size}">#${kw} <em>${count}</em></span>`;
        }).join('');

        // ── Category Donut (text-based) ─────────────────────────
        const catTotal = Object.values(catMap).reduce((s, v) => s + v, 0);
        const catBars = Object.entries(catMap).sort((a, b) => b[1] - a[1]).map(([cat, cnt]) => {
            const pct = Math.round((cnt / catTotal) * 100);
            return `<div class="gt-cat-row"><span class="gt-cat-label">${cat}</span><div class="gt-cat-bar-track"><div class="gt-cat-bar-fill" style="width:${pct}%"></div></div><span class="gt-cat-pct">${pct}%</span></div>`;
        }).join('');

        return `
        <div class="gt-dashboard">
            <!-- KPI Row -->
            <div class="gt-kpi-row">
                <div class="gt-kpi-card">
                    <div class="gt-kpi-icon">📦</div>
                    <div class="gt-kpi-value">${data.length}</div>
                    <div class="gt-kpi-label">${window.t('gt.gt_collected') || '수집 제품'}</div>
                </div>
                <div class="gt-kpi-card">
                    <div class="gt-kpi-icon">💬</div>
                    <div class="gt-kpi-value">${totalMentions}</div>
                    <div class="gt-kpi-label">${window.t('gt.gt_total_mentions') || '총 언급 횟수'}</div>
                </div>
                <div class="gt-kpi-card">
                    <div class="gt-kpi-icon">🥇</div>
                    <div class="gt-kpi-value">${topBrand}</div>
                    <div class="gt-kpi-label">${window.t('gt.gt_top_brand') || 'TOP 브랜드'}</div>
                </div>
                <div class="gt-kpi-card">
                    <div class="gt-kpi-icon">📁</div>
                    <div class="gt-kpi-value">${topCategory}</div>
                    <div class="gt-kpi-label">${window.t('gt.gt_top_category') || 'TOP 카테고리'}</div>
                </div>
            </div>

            <!-- Charts Row -->
            <div class="gt-charts-row">
                <div class="gt-chart-card">
                    <h3 class="gt-chart-title">${window.t('gt.gt_brand_chart') || '📊 브랜드별 언급수'}</h3>
                    <div class="gt-bar-chart">${brandBars}</div>
                </div>
                <div class="gt-chart-card">
                    <h3 class="gt-chart-title">${window.t('gt.gt_category_chart') || '📁 카테고리 분포'}</h3>
                    <div class="gt-cat-chart">${catBars}</div>
                </div>
            </div>

            <!-- Keywords -->
            <div class="gt-kw-card">
                <h3 class="gt-chart-title">${window.t('gt.gt_keywords') || '✨ 인기 효능 · 키워드'}</h3>
                <div class="gt-kw-cloud">${kwChips}</div>
            </div>

            <!-- Product List -->
            <div class="gt-list-card">
                <h3 class="gt-chart-title">${window.t('gt.gt_product_list') || '🧴 제품 리스트 (언급순)'}</h3>
                <div class="gt-product-list">${productRows}</div>
            </div>
        </div>`;
    },

    renderCustomHeader(state) {
        return `
            <div class="k-trend-filters" style="display:flex; gap:10px; padding:10px 20px; border-bottom:1px solid var(--border-color); overflow-x:auto; align-items:center;">
                <select id="kTrendCountry" style="padding:8px; border-radius:8px; border:1px solid #ccc;">
                    <option value="VN" ${this.filterState.country === 'VN' ? 'selected' : ''}>🇻🇳 베트남 (Vietnam)</option>
                    <option value="TH" ${this.filterState.country === 'TH' ? 'selected' : ''}>🇹🇭 태국 (Thailand)</option>
                    <option value="PH" ${this.filterState.country === 'PH' ? 'selected' : ''}>🇵🇭 필리핀 (Philippines)</option>
                    <option value="MY" ${this.filterState.country === 'MY' ? 'selected' : ''}>🇲🇾 말레이시아 (Malaysia)</option>
                    <option value="ALL" ${this.filterState.country === 'ALL' ? 'selected' : ''}>🌏 글로벌 (Global)</option>
                </select>
                <select id="kTrendCategory" style="padding:8px; border-radius:8px; border:1px solid #ccc;">
                    <option value="ALL" ${this.filterState.category === 'ALL' ? 'selected' : ''}>전체 카테고리</option>
                    <option value="Skincare" ${this.filterState.category === 'Skincare' ? 'selected' : ''}>스킨케어 (Skincare)</option>
                    <option value="Makeup" ${this.filterState.category === 'Makeup' ? 'selected' : ''}>메이크업 (Makeup)</option>
                </select>
                <button id="kTrendApply" style="padding:8px 16px; background:var(--accent-blue); color:white; border:none; border-radius:8px; cursor:pointer;" data-i18n="tabs.apply">적용</button>
            </div>
        `;
    },

    bindCustomHeaderEvents(reloadCallback) {
        document.getElementById('kTrendApply')?.addEventListener('click', () => {
            const countryEl = document.getElementById('kTrendCountry');
            const categoryEl = document.getElementById('kTrendCategory');
            if (countryEl && categoryEl) {
                this.filterState.country = countryEl.value;
                this.filterState.category = categoryEl.value;
                if (reloadCallback) reloadCallback();
            }
        });
    }
};
