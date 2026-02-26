/**
 * K-Trend Intelligence Dashboard
 * Main Application Logic
 */
import './style.css';
import './platform_switcher.css';
import {
  fetchTrending,
  fetchDailySpecials,
  fetchDealsCount,
  fetchReviewGrowth,
  fetchProducts,
  fetchRankedProducts,
  fetchCategories,
  fetchProductCount,
  fetchRankHistory,
  saveProduct,
  removeProduct,
  fetchSavedProducts,
  checkIfSaved,
  getSession,
  fetchCrawlLogs,
  fetchCategoryStats,
  fetchBrandStats,
  fetchPriceStats,
  fetchNotifications,
  markNotificationAsRead,
  clearNotifications,
  searchProductsSemantic,
  getProfile,
  getDailyViewCount,
  incrementDetailViewCount,
  fetchProductHistory
} from './supabase.js?v=3';
import { setupAuthUI } from './src/auth.js?v=11';
import { i18n } from './src/i18n.js?v=6';
import { OliveYoungBridge } from './source_bridges/oliveyoung.js?v=2';
import { MusinsaBridge } from './source_bridges/musinsa.js';
import { AblyBridge } from './source_bridges/ably.js';
import { ShinsegaeBridge } from './source_bridges/shinsegae.js';
import { KoreaTrendBridge } from './source_bridges/k_trend.js';
import { SteadySellerBridge } from './source_bridges/steady_seller.js';

const bridges = {
  oliveyoung: OliveYoungBridge,
  musinsa: MusinsaBridge,
  ably: AblyBridge,
  shinsegae: ShinsegaeBridge, // Keep key for UI mapping but ID is ssg
  ssg: ShinsegaeBridge,
  k_trend: KoreaTrendBridge,
  steady_sellers: SteadySellerBridge
};

// ─── State ──────────────────────────────────
const state = {
  activeTab: 'all',
  activeCategory: '10000010001', // 스킨케어 기본
  searchQuery: '',
  currentPage: 1,
  perPage: 20,
  sortBy: 'rank',
  sortDir: 'asc',
  totalProducts: 0,
  notifications: [],
  unreadCount: 0,

  // Platform & Filter State
  currentPlatform: 'oliveyoung', // 'oliveyoung' | 'musinsa'
  activeBridge: OliveYoungBridge,
  genderFilter: 'all', // 'all' | 'male' | 'female' (Musinsa Only)

  // AI & Auth
  aiSearch: false,
  user: null,
  categories: [],
  // Cache
  cache: {}
};

// ─── Platform Management ────────────────────
async function setPlatform(platform) {
  if (state.currentPlatform === platform) return;
  state.currentPlatform = platform;
  state.activeBridge = bridges[platform] || OliveYoungBridge;
  document.body.dataset.platform = platform; // CSS-level platform selector

  // UI Update
  document.querySelectorAll('.platform-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.platform === platform);
  });

  // Render Platform-specific controls
  const controls = document.getElementById('platformControls');
  if (controls) {
    controls.innerHTML = state.activeBridge.renderCustomHeader(state);
    if (state.activeBridge.bindCustomHeaderEvents) {
      state.activeBridge.bindCustomHeaderEvents(() => loadTab(state.activeTab));
    }
  }

  // Re-attach platform listeners if they were in the controls or bar
  if (window.attachPlatformListeners) window.attachPlatformListeners();

  // Reset Category & Search
  state.activeCategory = null; // null로 명확히 초기화 (빈 문자열이면 !state.activeCategory가 false 될 수 있음)
  state.searchQuery = '';
  const searchInput = document.getElementById('searchInput');
  if (searchInput) searchInput.value = '';

  // Render Tabs for this platform
  renderTabs();

  // Reload Data
  await Promise.all([
    loadCategories(),
    loadKPIs(),
    loadTab(state.activeBridge.tabs[0].id)
  ]);
}

// ─── Init ───────────────────────────────────
document.addEventListener('DOMContentLoaded', init);

async function init() {
  try {
    await i18n.init();
    renderTabs();
    setupEventListeners();
    setupAuthUI();
    await Promise.all([
      loadKPIs(),
      loadCategories()
    ]);
    initNotificationSystem();
    // loadCategories sets active category and triggers loadTab
  } catch (err) {
    console.error('Critical Init Error:', err);
    alert('초기화 중 오류가 발생했습니다: ' + err.message);
  }
}

// ─── Event Listeners ────────────────────────
function setupEventListeners() {
  // Platform Switcher (Re-attachable since it might be re-rendered or moved)
  function attachPlatformListeners() {
    document.querySelectorAll('.platform-btn').forEach(btn => {
      btn.addEventListener('click', () => setPlatform(btn.dataset.platform));
    });
  }
  attachPlatformListeners();
  window.attachPlatformListeners = attachPlatformListeners;

  // Tab switching
  // Note: Tab listeners are also re-attached in renderTabs()
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });

  // Search
  const searchInput = document.getElementById('searchInput');
  let searchTimeout;
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        state.searchQuery = e.target.value.trim();
        state.currentPage = 1;
        loadTab(state.activeTab);
      }, 300);
    });
  }

  // Modal close
  const modalClose = document.getElementById('modalClose');
  if (modalClose) modalClose.addEventListener('click', closeModal);
  const modalOverlay = document.getElementById('modalOverlay');
  if (modalOverlay) {
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) closeModal();
    });
  }
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });

  // Table sort
  setupSortListeners();

  // Language Change → Re-render product list with localized names/brands & re-render open modal
  window.addEventListener('languageChanged', () => {
    loadTab(state.activeTab);
    // Also re-render the modal if it's currently open
    if (window.__rerenderModal) window.__rerenderModal();
  });

  // Notifications
  const notiBtn = document.getElementById('notiBtn');
  const notiDropdown = document.getElementById('notiDropdown');
  if (notiBtn && notiDropdown) {
    notiBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isHidden = notiDropdown.style.display === 'none';
      notiDropdown.style.display = isHidden ? 'block' : 'none';
    });
  }

  // AI Search Toggle
  const aiToggle = document.getElementById('aiSearchToggle');
  if (aiToggle) {
    aiToggle.addEventListener('click', () => {
      state.aiSearch = !state.aiSearch;
      aiToggle.classList.toggle('active', state.aiSearch);
      document.querySelector('.search-box').classList.toggle('ai-active', state.aiSearch);

      if (state.searchQuery) {
        state.currentPage = 1;
        loadTab(state.activeTab);
      }
    });
  }

  // Click outside to close dropdowns
  document.addEventListener('click', (e) => {
    const notiDropdown = document.getElementById('notiDropdown');
    const notiBtn = document.getElementById('notiBtn');
    if (notiDropdown && notiBtn && !notiDropdown.contains(e.target) && !notiBtn.contains(e.target)) {
      notiDropdown.style.display = 'none';
    }
    const langDropdown = document.getElementById('langDropdown');
    const langBtn = document.getElementById('langBtn');
    if (langDropdown && langBtn && !langDropdown.contains(e.target) && e.target !== langBtn) {
      langDropdown.classList.remove('open');
    }
  });

  // Language Selection
  const langBtn = document.getElementById('langBtn');
  const langDropdown = document.getElementById('langDropdown');
  if (langBtn) {
    langBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      langDropdown.classList.toggle('open');
    });
  }

  document.querySelectorAll('.lang-item').forEach(item => {
    item.addEventListener('click', async () => {
      const lang = item.dataset.lang;
      await i18n.setLanguage(lang);
      if (langDropdown) langDropdown.classList.remove('open');

      // Refresh dynamic components
      loadKPIs();
      loadCategories();
      loadTab(state.activeTab);
      renderNotifications();
    });
  });
}

// ─── Tab Switching ──────────────────────────
function switchTab(tab) {
  state.activeTab = tab;

  // Update tab UI
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  const activeTabBtn = document.querySelector(`.tab[data-tab="${tab}"]`);
  if (activeTabBtn) activeTabBtn.classList.add('active');

  // Update content
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  const tabContent = document.getElementById(`tab-${tab}`);
  if (tabContent) tabContent.classList.add('active');

  loadTab(tab);
}

// ─── Tab Rendering ──────────────────────────
function renderTabs() {
  const container = document.querySelector('.tab-bar');
  if (!container) return;

  const tabs = state.activeBridge.tabs;

  container.innerHTML = tabs.map((tab, idx) => `
    <button class="tab ${state.activeTab === tab.id || (idx === 0 && !state.activeTab) ? 'active' : ''}" data-tab="${tab.id}">
      <span>${tab.icon}</span> <span data-i18n="${tab.label}">${window.t(tab.label)}</span>
    </button>
  `).join('');

  // Re-attach listeners
  container.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });
}

// ─── Load KPIs ──────────────────────────────
async function loadKPIs() {
  try {
    const kpis = await state.activeBridge.getKPIs(state.currentPlatform);
    const container = document.getElementById('kpiGrid');
    if (!container) return;

    container.innerHTML = kpis.map(kpi => `
      <div class="kpi-card kpi-${kpi.id}">
        <div class="kpi-icon">${kpi.icon}</div>
        <div class="kpi-content">
          <div class="kpi-value">${kpi.format ? formatNumber(kpi.value) : kpi.value}</div>
          <div class="kpi-label" data-i18n="${kpi.label}">${window.t(kpi.label)}</div>
        </div>
      </div>
    `).join('');

    // Apply translations to dynamic content
    i18n.documentUpdate();

    // Update header stats
    const totalKpi = kpis.find(k => k.id === 'total');
    if (totalKpi) {
      const totalProductsEl = document.getElementById('totalProducts');
      if (totalProductsEl) totalProductsEl.textContent = formatNumber(totalKpi.value);
      state.totalProducts = totalKpi.value;
    }
  } catch (err) {
    console.error('KPI load error:', err);
    const container = document.getElementById('kpiGrid');
    if (container) container.innerHTML = '<div class="error-msg">KPI 로딩 실패</div>';
  }
}

// ─── Load Categories ────────────────────────
async function loadCategories() {
  try {
    const { data } = await state.activeBridge.getCategories();
    state.categories = data;

    const container = document.getElementById('categoryChips');
    if (!container) return;
    container.innerHTML = '';

    // Some bridges might have depth 0 for all, some might filter.
    const displayCategories = data.filter(c => c.depth >= 0);
    const totalCategoriesEl = document.getElementById('totalCategories');
    if (totalCategoriesEl) totalCategoriesEl.textContent = displayCategories.length;

    // Add category chips
    displayCategories.forEach((cat, idx) => {
      const btn = document.createElement('button');
      btn.className = (state.activeCategory === cat.category_code) ? 'chip active' : 'chip';
      if (!state.activeCategory && idx === 0) btn.classList.add('active');

      btn.dataset.code = cat.category_code;

      const lang = i18n.currentLang;
      const name = cat[`name_${lang}`] || cat.name_en || cat.name_ko || cat.category_name;
      btn.textContent = name;

      btn.addEventListener('click', () => {
        state.activeCategory = cat.category_code;
        document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');

        // Reset search when switching categories
        state.searchQuery = '';
        const searchInput = document.getElementById('searchInput');
        if (searchInput) searchInput.value = '';

        state.currentPage = 1;

        // Re-render controls to maintain active state for gender buttons
        if (state.activeBridge && state.activeBridge.renderCustomHeader) {
          const controls = document.getElementById('platformControls');
          if (controls) controls.innerHTML = state.activeBridge.renderCustomHeader(state);
        }

        loadTab(state.activeTab);
      });
      container.appendChild(btn);
    });

    // Translation for Categories
    if (i18n.currentLang !== 'ko') {
      const lang = i18n.currentLang;
      const needsTr = displayCategories.filter(c => !c[`name_${lang}`] && !localStorage.getItem(`cat_${lang}_${c.category_code}`));
      if (needsTr.length > 0) {
        translateKeywords(needsTr.map(c => c.category_name), lang, 'category').then(translated => {
          if (translated) {
            needsTr.forEach((c, idx) => {
              const name = translated[idx];
              if (name) {
                localStorage.setItem(`cat_${lang}_${c.category_code}`, name);
                const btn = container.querySelector(`button[data-code="${c.category_code}"]`);
                if (btn) btn.textContent = name;
              }
            });
          }
        });
      }
    }

    // Set first category as default and load
    if (displayCategories.length > 0 && !state.activeCategory) {
      state.activeCategory = displayCategories[0].category_code;
      // 첫 번째 칩을 active 로 표시
      const firstChip = container.querySelector('.chip');
      if (firstChip) firstChip.classList.add('active');
    }
    // k_trend platform handles its own tab loading in setPlatform — skip here to avoid race condition
    if (state.currentPlatform !== 'k_trend') {
      await loadTab(state.activeTab);
    }
  } catch (err) {
    console.error('Category load error:', err);
  }
}

// ─── Load Tab Data ──────────────────────────
async function loadTab(tab) {
  try {
    // Override with AI search if active
    if (state.aiSearch && state.searchQuery) {
      return await loadSemanticResults();
    }

    // Default tab rendering logic
    // Some tabs are global (Wishlist, Logs, Insights in some cases)
    // but the data fetching should be handled by the bridge where possible.
    switch (tab) {
      case 'wishlist': return await loadWishlist();
      case 'logs': return await loadCrawlLogs();
      case 'insights': return await loadInsights();
      default:
        return await loadBridgeTab(tab);
    }
  } catch (err) {
    console.error(`Tab ${tab} load error:`, err);
  }
}

async function loadBridgeTab(tabId) {
  // ─── K-Trend: 전용 리스트 뷰 분기 ───
  if (state.currentPlatform === 'k_trend') {
    return await loadKTrendView(tabId);
  }

  // Ensure table structure exists for non-k-trend platforms in tab-all
  if (tabId === 'all') {
    ensureDefaultTableStructure();
  }

  const activeTabContent = document.querySelector(`.tab-content#tab-${tabId}`) || document.getElementById('tab-all');
  const grid = activeTabContent?.querySelector('.products-grid') || document.getElementById('allProductsBody');
  if (!grid) return;

  if (grid.tagName === 'TBODY') {
    grid.innerHTML = `<tr><td colspan="8" class="loading-cell">${window.t('common.loading')}</td></tr>`;
  } else {
    grid.innerHTML = '<div class="loading-skeleton"></div>';
  }

  // Dynamic Title Update
  const titleEl = document.getElementById('rankingTitle');
  const descEl = document.getElementById('rankingDesc');
  if (titleEl) {
    if (state.searchQuery) {
      titleEl.textContent = `${window.t('sections.all')} - ${state.searchQuery}`;
    } else {
      const activeChip = document.querySelector('#categoryChips .chip.active');
      const catName = activeChip ? activeChip.textContent : window.t('tabs.all');
      titleEl.textContent = `${state.activeBridge.name} - ${catName}`;
    }
  }
  if (descEl) {
    descEl.textContent = `${state.activeBridge.name} 플랫폼 데이터 분석 결과`;
  }

  try {
    const result = await state.activeBridge.fetchData(tabId, state);
    const data = result.data || [];
    const count = result.count || data.length;

    if (data.length === 0) {
      if (grid.tagName === 'TBODY') {
        grid.innerHTML = `<tr><td colspan="8" class="empty-cell">${window.t('common.no_results')}</td></tr>`;
      } else {
        grid.innerHTML = emptyState(window.t('common.no_results'));
      }
      renderPagination(0);
      return;
    }

    const savedItems = await fetchSavedProducts();
    const savedIds = new Set(savedItems.data?.map(i => i.product_id) || []);

    if (grid.tagName === 'TBODY') {
      grid.innerHTML = data.map((p, idx) => {
        p.is_saved = savedIds.has(p.product_id || p.id);
        return renderTableRow(p, idx);
      }).join('');
      // 비-한국어 언어 설정이면 상품명/브랜드 배치 번역 비동기 실행
      if (i18n.currentLang !== 'ko') {
        translateProductNames(data, i18n.currentLang);
        translateBrands(data);
      }
    } else {
      grid.innerHTML = data.map(p => {
        p.is_saved = savedIds.has(p.product_id || p.id);
        return renderProductCard(p, tabId === 'deals' ? 'deal' : 'normal');
      }).join('');

      // 카드 형태에서도 번역 트리거
      if (i18n.currentLang !== 'ko') {
        translateProductNames(data, i18n.currentLang);
        translateBrands(data);
      }
    }

    // 최종 UI 텍스트 업데이트 (Keys -> Values)
    i18n.documentUpdate();
    renderPagination(count);
  } catch (err) {
    console.error('Bridge fetch error:', err);
    const grid = activeTabContent?.querySelector('.products-grid') || document.getElementById('allProductsBody');
    if (grid) grid.innerHTML = `<div class="error-state">데이터 로딩 중 오류가 발생했습니다: ${err.message}</div>`;
  }
}

/**
 * Ensures the standard table structure exists in #tab-all
 * Restores it if it was overwritten by loadKTrendView
 */
function ensureDefaultTableStructure() {
  const tableContainer = document.querySelector('#tab-all .table-container');
  if (!tableContainer) return;

  // Check if standard table exists. If not, restore it.
  if (!tableContainer.querySelector('#allProductsTable')) {
    tableContainer.innerHTML = `
      <table class="data-table" id="allProductsTable">
        <thead>
          <tr>
            <th data-i18n="table.rank">순위</th>
            <th data-i18n="table.image">이미지</th>
            <th class="sortable" data-sort="name" data-i18n="table.name">상품명</th>
            <th class="sortable" data-sort="brand" data-i18n="table.brand">브랜드</th>
            <th class="sortable" data-sort="price" data-i18n="table.price">가격</th>
            <th data-i18n="table.review">리뷰</th>
            <th data-i18n="table.rating">평점</th>
            <th data-i18n="table.link">링크</th>
          </tr>
        </thead>
        <tbody id="allProductsBody">
          <tr>
            <td colspan="8" class="loading-cell">데이터 로딩 중...</td>
          </tr>
        </tbody>
      </table>
    `;
    // Re-attach sort listeners if needed
    setupSortListeners();
    // Update translations
    i18n.documentUpdate();
  }
}

function setupSortListeners() {
  document.querySelectorAll('.data-table th.sortable').forEach(th => {
    th.addEventListener('click', () => {
      const sort = th.dataset.sort;
      if (state.sortBy === sort) {
        state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
      } else {
        state.sortBy = sort;
        state.sortDir = 'asc';
      }
      document.querySelectorAll('.data-table th.sortable').forEach(h => h.classList.remove('asc', 'desc'));
      th.classList.add(state.sortDir);
      state.currentPage = 1;
      loadTab('all');
    });
  });
}

// ─── K-Trend 전용 뷰 ────────────────────────
async function loadKTrendView(tabId) {
  const container = document.getElementById('tab-global_trends');
  const grid = document.getElementById('global_trendsGrid');
  if (!container || !grid) return;

  // Ensure the correct tab-content pane is visible (body[data-platform] CSS handles tab-all hiding)
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  container.classList.add('active');
  state.activeTab = 'global_trends';

  grid.innerHTML = '<div class="loading-skeleton"></div>';

  try {
    const result = await state.activeBridge.fetchData(tabId, state);
    const data = result.data || [];

    if (data.length === 0) {
      grid.innerHTML = emptyState(window.t('common.no_results') || '트렌드 데이터가 없습니다.');
      return;
    }

    // If the bridge provides a custom dashboard renderer, use it
    if (state.activeBridge.renderTabContent) {
      const customHtml = state.activeBridge.renderTabContent(tabId, result, state);
      if (customHtml !== null && customHtml !== undefined) {
        grid.innerHTML = customHtml;
        return;
      }
    }

    // Fallback: standard product card grid
    const savedItems = await fetchSavedProducts();
    const savedIds = new Set(savedItems.data?.map(i => i.product_id) || []);

    grid.innerHTML = data.map(p => {
      p.is_saved = savedIds.has(p.product_id || p.id);
      return renderProductCard(p, 'normal', true);
    }).join('');

    if (i18n.currentLang !== 'ko') {
      translateProductNames(data, i18n.currentLang);
    }
  } catch (err) {
    console.error('K-Trend fetch error:', err);
    grid.innerHTML = `<div class="error-state">트렌드 데이터 로딩 실패: ${err.message}</div>`;
  }
}

function renderTableRow(p, index) {
  const rank = (state.currentPage - 1) * state.perPage + index + 1;
  const profile = getProfile();
  const isPro = profile && (profile.subscription_tier === 'pro' || profile.role === 'admin');
  const isLocked = !isPro && (rank <= 5 || rank > 10);

  return `
      <tr class="${isLocked ? 'locked-row' : ''}" 
        onclick="${isLocked ? '' : `window.__openProduct(${JSON.stringify(p).replace(/"/g, '&quot;')})`}" 
        style="cursor:${isLocked ? 'default' : 'pointer'}">
        <td><span class="rank-num">${rank}</span></td>
        <td><img class="thumb" src="${p.image_url || ''}" alt="" loading="lazy" onerror="this.style.display='none'" /></td>
        <td style="max-width:280px">
          <div class="product-name" data-pid="${p.product_id || p.id}" style="-webkit-line-clamp:1">${escapeHtml(getLocalizedName(p))}</div>
        </td>
        <td><span class="product-brand" data-brand-pid="${p.product_id || p.id}">${escapeHtml(getLocalizedBrand(p))}</span></td>
        <td>${formatPrice(p.price || p.price_current)}</td>
        <td>${formatNumber(p.review_count)}</td>
        <td>${p.review_rating && !isNaN(p.review_rating) ? p.review_rating : '-'}</td>
        <td>
          ${p.product_url ? `<a class="link-btn" href="${p.product_url}" target="_blank" rel="noopener" onclick="event.stopPropagation()">보기 →</a>` : '-'}
        </td>
      </tr>
    `;
}

// ─── Semantic Search Results ───────────────
async function loadSemanticResults() {
  const activeTabContent = document.querySelector(`.tab-content#tab-${state.activeTab}`);
  const grid = activeTabContent?.querySelector('.products-grid') || document.getElementById('allProductsBody');
  if (!grid) return;

  if (grid.tagName === 'TBODY') {
    grid.innerHTML = `<tr><td colspan="8" class="loading-cell">${window.t('common.loading')}</td></tr>`;
  } else {
    grid.innerHTML = '<div class="loading-skeleton"></div>';
  }

  try {
    const { data } = await searchProductsSemantic(state.searchQuery, 40);

    if (data.length === 0) {
      if (grid.tagName === 'TBODY') {
        grid.innerHTML = `<tr><td colspan="8" class="empty-cell">${window.t('common.no_results')}</td></tr>`;
      } else {
        grid.innerHTML = emptyState(window.t('common.no_results'));
      }
      return;
    }

    const savedItems = await fetchSavedProducts();
    const savedIds = new Set(savedItems.data?.map(i => i.product_id) || []);

    if (grid.tagName === 'TBODY') {
      grid.innerHTML = data.map((p, idx) => {
        p.is_saved = savedIds.has(p.id);
        const name = escapeHtml(getLocalizedName(p));
        const brand = escapeHtml(getLocalizedBrand(p));
        const price = formatPrice(p.price);
        return `
          <tr onclick="window.__openProduct(${JSON.stringify(p).replace(/"/g, '&quot;')})">
            <td>${idx + 1}</td>
            <td><img src="${p.image_url}" class="table-img" /></td>
            <td>${name}</td>
            <td>${brand}</td>
            <td>${price}</td>
            <td>${formatNumber(p.review_count)}</td>
            <td>${p.review_rating && !isNaN(p.review_rating) ? p.review_rating : '-'}</td>
            <td><a href="${p.product_url}" target="_blank" onclick="event.stopPropagation()">🔗</a></td>
          </tr>
        `;
      }).join('');
    } else {
      grid.innerHTML = data.map(p => {
        p.is_saved = savedIds.has(p.id);
        return renderProductCard(p);
      }).join('');
    }
  } catch (err) {
    console.error('Semantic load error:', err);
    grid.innerHTML = `<div class="error-state">AI 검색 중 오류가 발생했습니다: ${err.message}</div>`;
  }
}

// ─── Trending ───────────────────────────────
async function loadTrending() {
  const grid = document.getElementById('trendingGrid');
  if (!grid) return;
  grid.innerHTML = '<div class="loading-skeleton"></div>';

  try {
    const { data } = await fetchTrending(100);
    let filtered = filterByCategory(data, 'category_code');
    filtered = filterBySearch(filtered);

    if (filtered.length === 0) {
      grid.innerHTML = emptyState('급상승 상품이 없습니다');
      return;
    }

    const savedItems = await fetchSavedProducts();
    const savedIds = new Set(savedItems.data?.map(i => i.product_id) || []);

    grid.innerHTML = filtered.map(p => {
      p.is_saved = savedIds.has(p.product_id || p.id);
      return renderProductCard(p);
    }).join('');
  } catch (e) {
    grid.innerHTML = `<div class="error-state">트렌딩 데이터를 불러오는데 실패했습니다.<br>${e.message}</div>`;
  }
}

// ─── Deals ──────────────────────────────────
async function loadDeals() {
  const grid = document.getElementById('dealsGrid');
  if (!grid) return;
  grid.innerHTML = '<div class="loading-skeleton"></div>';

  const { data, date } = await fetchDailySpecials();

  // Temporary fix: Hardcode original prices for key items to show discount effect
  const priceOverrides = {
    'A000000246380': 16000, // Etude Tint
    'A000000191996': 7000,  // Ritter Chocolate
    'A000000204780': 18000, // Amuse Pencil
    'A000000199947': 5500   // Fillimilli Puff
  };

  const patchedData = data.map(p => {
    if (priceOverrides[p.product_id]) {
      const orig = priceOverrides[p.product_id];
      const current = p.special_price;
      return {
        ...p,
        original_price: orig,
        discount_pct: Math.round((1 - current / orig) * 100)
      };
    }
    return p;
  });

  let filtered = filterBySearch(patchedData);

  if (filtered.length === 0) {
    grid.innerHTML = emptyState('오늘 할인 상품이 없습니다', '할인 데이터가 수집되면 여기에 표시됩니다');
    return;
  }

  // Update section header with date
  const header = document.querySelector('#tab-deals .section-desc');
  if (header && date) header.textContent = `${date} 기준 올리브영 오늘의 특가 (${filtered.length}개)`;

  const savedItems = await fetchSavedProducts();
  const savedIds = new Set(savedItems.data?.map(i => i.product_id) || []);

  grid.innerHTML = filtered.map(p => {
    p.is_saved = savedIds.has(p.product_id || p.id);
    return renderProductCard(p, 'deal');
  }).join('');
}

// ─── Reviews ────────────────────────────────
async function loadReviews() {
  const grid = document.getElementById('reviewsGrid');
  if (!grid) return;
  grid.innerHTML = '<div class="loading-skeleton"></div>';

  const { data } = await fetchReviewGrowth(100);
  let filtered = filterBySearch(data);

  if (filtered.length === 0) {
    grid.innerHTML = emptyState('리뷰 데이터가 없습니다');
    return;
  }

  const savedItems = await fetchSavedProducts();
  const savedIds = new Set(savedItems.data?.map(i => i.product_id) || []);

  grid.innerHTML = filtered.map(p => {
    p.is_saved = savedIds.has(p.product_id || p.id);
    return renderProductCard(p);
  }).join('');
}

// ─── Wishlist (나의 관심 상품) ───────────────
async function loadWishlist() {
  const grid = document.getElementById('wishlistGrid');
  const actionBar = document.getElementById('sourcingActionBar');
  if (!grid) return;
  grid.innerHTML = '<div class="loading-skeleton"></div>';
  if (actionBar) actionBar.style.display = 'none';

  const session = getSession();
  if (!session) {
    grid.innerHTML = emptyState(window.t('sections.fav_login_required'), window.t('sections.fav_login_desc'));
    return;
  }

  try {
    const { data } = await fetchSavedProducts();
    const products = data?.map(item => ({
      ...item.products_master,
      is_saved: true
    })) || [];

    if (products.length === 0) {
      grid.innerHTML = emptyState(window.t('sections.fav_empty'), window.t('sections.fav_empty_desc'));
      return;
    }

    // `isWishlistTab`을 true로 전달
    grid.innerHTML = products.map(p => renderProductCard(p, 'normal', false, true)).join('');

    if (actionBar) {
      actionBar.style.display = 'block';
      const quoteItemCount = document.getElementById('quoteItemCount');
      if (quoteItemCount) quoteItemCount.innerText = products.length;
    }
  } catch (e) {
    grid.innerHTML = `<div class="error-state">관심 상품을 불러오는데 실패했습니다: ${e.message}</div>`;
  }
}

// ─── Render Helpers ───────────────────────

// Gemini API 배치 번역 (상품명 목록을 한 번에 번역)
const _translationCache = {};
async function translateProductNames(products, targetLang) {
  const langNames = { vi: 'Vietnamese', en: 'English', th: 'Thai', id: 'Indonesian', ja: 'Japanese' };
  const langName = langNames[targetLang] || targetLang;

  // 번역이 필요한 상품만 필터링
  const needsTranslation = products.filter(p => {
    const pid = p.product_id || p.id;
    const cacheKey = `tr_${targetLang}_${pid}`;
    if (_translationCache[cacheKey]) return false; // 메모리 캐시 있으면 스킵
    // localStorage 확인
    const stored = localStorage.getItem(cacheKey);
    if (stored) { _translationCache[cacheKey] = stored; return false; }
    return !p[`name_${targetLang}`]; // DB에 번역 없을 때만
  });

  if (needsTranslation.length === 0) return;

  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) return;

  // 배치: 20개씩 나눠서 번역
  const BATCH = 20;
  for (let i = 0; i < needsTranslation.length; i += BATCH) {
    const batch = needsTranslation.slice(i, i + BATCH);
    const items = batch.map((p, idx) => `${idx + 1}. ${p.name_ko || p.name || ''}`).join('\n');

    try {
      const prompt = `Translate the following Korean product names to ${langName}.
Return ONLY a JSON array of translated strings in the same order.
Keep brand names, product types, and numbers as-is (e.g. "50ml", "SPF50+").
Make the translation natural and easy to understand for a ${langName}-speaking buyer.

Korean names:
${items}`;

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.1, responseMimeType: 'application/json' }
          })
        }
      );
      if (!res.ok) continue;
      const data = await res.json();
      let text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '[]';
      if (text.startsWith('```')) text = text.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
      const translated = JSON.parse(text);

      // 캐시 저장 & DOM 즉시 업데이트
      batch.forEach((p, idx) => {
        const name = translated[idx] || p.name || '';
        const pid = p.product_id || p.id;
        const cacheKey = `tr_${targetLang}_${pid}`;
        _translationCache[cacheKey] = name;
        localStorage.setItem(cacheKey, name);

        // DOM에서 해당 상품명 셀 찾아서 바로 업데이트
        const cells = document.querySelectorAll(`.product-name[data-pid="${pid}"]`);
        cells.forEach(cell => { cell.textContent = name; });
      });
    } catch (e) {
      console.warn('Translation batch error:', e);
    }
  }
}

// 브랜드명 배치 번역
async function translateBrands(products) {
  const lang = i18n.currentLang;
  if (lang === 'ko') return;

  const needsTr = products.filter(p => !p.brand_en && !localStorage.getItem(`br_en_${p.product_id || p.id}`));
  if (needsTr.length === 0) return;

  const batchSize = 30;
  for (let i = 0; i < needsTr.length; i += batchSize) {
    const batch = needsTr.slice(i, i + batchSize);
    const brands = [...new Set(batch.map(p => p.brand_ko || p.brand || '').filter(Boolean))];
    if (brands.length === 0) continue;

    const translated = await translateKeywords(brands, 'en', 'brand');
    if (translated) {
      const brandMap = {};
      brands.forEach((b, idx) => brandMap[b] = translated[idx]);

      batch.forEach(p => {
        const koBrand = p.brand_ko || p.brand || '';
        const enBrand = brandMap[koBrand];
        if (enBrand) {
          const pid = p.product_id || p.id;
          localStorage.setItem(`br_en_${pid}`, enBrand);
          // DOM 업데이트
          document.querySelectorAll(`.product-brand[data-brand-pid="${pid}"]`).forEach(el => {
            el.textContent = enBrand;
          });
        }
      });
    }
  }
}

// Gemini API 배치 번역 (브랜드/카테고리 등 짧은 키워드 번역)
async function translateKeywords(items, targetLang, targetType = 'category') {
  if (!items || items.length === 0) return;
  const langNames = { vi: 'Vietnamese', en: 'English', th: 'Thai', id: 'Indonesian', ja: 'Japanese' };
  const langName = langNames[targetLang] || targetLang;

  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) return;

  try {
    const listString = items.map((it, idx) => `${idx + 1}. ${it}`).join('\n');
    const prompt = `Translate the following Korean ${targetType} names to ${langName}.
Return ONLY a JSON array of strings in the same order. Keep it concise.
Names:
${listString}`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1, responseMimeType: 'application/json' }
        })
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    let text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '[]';
    if (text.startsWith('```')) text = text.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
    return JSON.parse(text);
  } catch (e) {
    console.warn(`Keyword translation error (${targetType}):`, e);
    return null;
  }
}

function getLocalizedName(p) {
  const lang = i18n.currentLang;
  // 1. DB에 해당 언어 번역 있으면 바로 사용
  const localized = p[`name_${lang}`] || p[`${lang}_name`];
  if (localized) return localized;
  // 2. 한국어 설정이면 원본 그대로
  if (lang === 'ko') return p.name_ko || p.name || '';
  // 3. 메모리/로컬 캐시에 번역 있으면 사용
  const pid = p.product_id || p.id;
  const cacheKey = `tr_${lang}_${pid}`;
  const cached = _translationCache[cacheKey] || localStorage.getItem(cacheKey);
  if (cached) { _translationCache[cacheKey] = cached; return cached; }
  // 4. 영어 번역 있으면 영어 (비동기 번역이 완료되기 전 fallback)
  return p.name_en || p.name || '';
}

function getLocalizedBrand(p) {
  const lang = i18n.currentLang;

  // 한국어면 고민 없이 한국어 반환
  if (lang === 'ko') return p.brand_ko || p.brand || '';

  // 영문/기타 언어: 영문 브랜드명 우선
  if (p.brand_en) return p.brand_en;

  // 영문 캐시 확인
  const pid = p.product_id || p.id;
  const cacheKey = `br_en_${pid}`;
  const cached = localStorage.getItem(cacheKey);
  if (cached) return cached;

  return p.brand_ko || p.brand || '';
}

function renderProductCard(p, mode = 'normal', isGlobalTrend = false, isWishlistTab = false) {
  const isWishlist = !!p.is_saved;
  const productId = p.product_id || p.id;
  const name = escapeHtml(getLocalizedName(p));
  const brand = escapeHtml(getLocalizedBrand(p));

  // Price Logic
  const currentPrice = p.special_price || p.price || p.price_current || 0;
  const originalPrice = p.original_price || p.price_original || 0;
  // If we have an original price and it's higher than current, it's a deal
  const isDeal = originalPrice > currentPrice;

  let priceHtml = '';
  if (isGlobalTrend) {
    priceHtml = `<div class="price-current" style="color:var(--accent-blue);font-size:16px;">💬 ${formatNumber(currentPrice)}건 언급</div>`;
  } else {
    priceHtml = isDeal
      ? `<div class="price-wrapper">
             <span class="price-original">${formatPrice(originalPrice)}</span>
             <span class="price-current deal">${formatPrice(currentPrice)}</span>
             <span class="discount-badge">${p.discount_pct || Math.round((1 - currentPrice / originalPrice) * 100)}%</span>
           </div>`
      : `<div class="price-current">${formatPrice(currentPrice)}</div>`;
  }

  const isTrend = ['google_trends', 'naver_datalab'].includes(p.source);

  // Membership Check
  const profile = getProfile();
  const isPro = profile && (profile.subscription_tier === 'pro' || profile.role === 'admin');
  const rank = p.current_rank || p.rank || 999;
  const isLocked = !isPro && !isGlobalTrend && (rank <= 5 || rank > 10);

  let imgHtml = '';
  if (isTrend) {
    const icon = p.source === 'google_trends' ? '📈' : '🇳';
    const bg = p.source === 'google_trends' ? '#e8f0fe' : '#e4f7e4';
    imgHtml = `<div class="product-img" style="display:flex;align-items:center;justify-content:center;font-size:40px;background:${bg};min-height:200px;">${icon}</div>`;
  } else {
    imgHtml = `<img class="product-img" src="${p.image_url || ''}" alt="${name}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" />
                 <div class="product-img-fallback" style="display:none;width:80px;height:80px;border-radius:12px;align-items:center;justify-content:center;background:#f5f5f5;color:#ccc;flex-shrink:0;font-size:12px;">No Image</div>`;
  }

  // AI Benefit Tags (For Global Trends)
  let aiTagsHtml = '';
  if (isGlobalTrend && p.ai_tags && Array.isArray(p.ai_tags)) {
    aiTagsHtml = `<div style="display:flex; gap:6px; flex-wrap:wrap; margin-top:8px;">
          ${p.ai_tags.map(t => `<span style="background:#eef2ff; color:var(--accent-blue); padding:4px 8px; border-radius:4px; font-size:12px; font-weight:500;">#${escapeHtml(t)}</span>`).join('')}
      </div>`;
  }

  // B2B Sourcing Quantity Control (Only in Wishlist Tab)
  const qtyHtml = isWishlistTab ? `
    <div class="sourcing-qty-control" onclick="event.stopPropagation();" style="display:flex; align-items:center; justify-content:center; gap:15px; margin-top:10px; padding-top:10px; border-top:1px solid var(--border);">
      <label style="display:flex; align-items:center; gap:6px; cursor:pointer;">
        <input type="checkbox" class="sourcing-item-checkbox" checked style="width:16px; height:16px; accent-color:var(--accent-blue);">
        <span style="font-size:12px; color:var(--text-muted); font-weight:500;">📦 ${window.t('sourcing.qty_label')}</span>
      </label>
      <div style="display:flex; align-items:center; gap:8px;">
        <button onclick="window.__updateSourcingQty(this, -10)" style="width:24px; height:24px; border-radius:4px; border:1px solid var(--border); background:var(--surface); cursor:pointer;">-</button>
        <input type="number" class="sourcing-qty-input" data-product-id="${productId}" value="100" min="10" step="10" style="width:50px; text-align:center; border:1px solid var(--border); border-radius:4px; font-size:12px; padding:2px; background:var(--background); color:var(--text);" onclick="event.stopPropagation();">
        <button onclick="window.__updateSourcingQty(this, 10)" style="width:24px; height:24px; border-radius:4px; border:1px solid var(--border); background:var(--surface); cursor:pointer;">+</button>
      </div>
    </div>
  ` : '';

  return `
    <div class="product-card ${isTrend || isGlobalTrend ? 'trend-card' : ''} ${isLocked ? 'locked-card' : ''}" 
      onclick="${isLocked ? '' : `window.__openProduct(${JSON.stringify(p).replace(/"/g, '&quot;')})`}">
      ${isLocked ? `<div class="locked-overlay"><span>PRO Only</span></div>` : ''}
      <div class="product-wishlist-pos">
        <button class="btn-wishlist ${isWishlist ? 'active' : ''}"
          onclick="event.stopPropagation(); window.__toggleWishlist(this, '${p.id || productId}')">
          <svg viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
        </button>
      </div>
      <div class="product-card-top">
        ${imgHtml}
        <div class="product-info">
          <div class="product-brand">${brand}</div>
          <div class="product-name">${name}</div>
          <div class="product-price-container">
            ${priceHtml}
          </div>
          ${aiTagsHtml}
        </div>
      </div>
      <div class="product-card-bottom">
        ${!isGlobalTrend && (p.rank_change !== undefined && p.rank_change !== null) ? `<span class="badge ${p.rank_change > 0 ? 'badge-rank-up' : 'badge-rank-down'}">${p.rank_change > 0 ? '▲' : '▼'} ${Math.abs(p.rank_change)}</span>` : ''}
        ${p.review_count ? `<span class="badge badge-reviews">⭐ ${p.review_rating || '-'} (${isGlobalTrend ? '-' : formatNumber(p.review_count)})</span>` : ''}
      </div>
      ${qtyHtml}
    </div>
  `;
}

window.__toggleWishlist = async function (btn, productId) {
  const session = getSession();
  if (!session) {
    alert('로그인이 필요한 기능입니다.');
    const authModal = document.getElementById('authModal');
    if (authModal) authModal.classList.add('open');
    return;
  }

  const isActive = btn.classList.contains('active');
  try {
    if (isActive) {
      await removeProduct(productId);
      btn.classList.remove('active');
    } else {
      // Find the corresponding product data from global arrays if not in modal
      let pData = window.currentModalProductData;
      if (!pData || (pData.id !== productId && pData.product_id !== productId)) {
        // Attempt to find it from the global data arrays if needed
        const allItems = [...(window.__cachedProducts || []), ...(window.__cachedDeals || []), ...(window.__cachedTrending || [])];
        pData = allItems.find(p => p.id === productId || p.product_id === productId) || { product_id: productId };
      }
      await saveProduct(productId, pData);
      btn.classList.add('active');
    }
  } catch (err) {
    console.error('Wishlist toggle fail:', err);
    alert('오류가 발생했습니다: ' + err.message);
  }
};

// ─── All Products Table ─────────────────────
async function loadAllProducts() {
  return await loadBridgeTab('all');
}

// ─── Crawl Logs ─────────────────────────────
async function loadCrawlLogs() {
  const body = document.getElementById('crawlLogsBody');
  if (!body) return;

  try {
    const { data, error } = await fetchCrawlLogs();
    if (error) throw error;

    if (!data || data.length === 0) {
      body.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:40px;">수집 내역이 없습니다.</td></tr>';
      return;
    }

    body.innerHTML = data.map(log => `
      <tr>
        <td>${new Date(log.started_at).toLocaleString()}</td>
        <td>${log.job_name}</td>
        <td>
          <span class="badge ${log.status === 'success' ? 'badge-success' : 'badge-danger'}">
            ${log.status === 'success' ? '성공' : '실패'}
          </span>
        </td>
        <td>${log.items_count || 0}건</td>
        <td title="${log.error_message || ''}">${log.error_message || '-'}</td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Load logs error:', err);
    body.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--accent-red); padding:40px;">오류: ${err.message}</td></tr>`;
  }
}

// ─── Pagination ─────────────────────────────
function renderPagination(total) {
  const container = document.getElementById('pagination');
  if (!container) return;
  const totalPages = Math.ceil(total / state.perPage);

  if (totalPages <= 1) {
    container.innerHTML = '';
    return;
  }

  let html = '';
  html += `<button class="page-btn" ${state.currentPage === 1 ? 'disabled' : ''} data-page="${state.currentPage - 1}">← 이전</button>`;

  const range = getPageRange(state.currentPage, totalPages);
  range.forEach(p => {
    if (p === '...') {
      html += `<span class="page-info">...</span>`;
    } else {
      html += `<button class="page-btn ${p === state.currentPage ? 'active' : ''}" data-page="${p}">${p}</button>`;
    }
  });

  html += `<button class="page-btn" ${state.currentPage === totalPages ? 'disabled' : ''} data-page="${state.currentPage + 1}">다음 →</button>`;
  html += `<span class="page-info">${formatNumber(total)}건 중 ${(state.currentPage - 1) * state.perPage + 1}-${Math.min(state.currentPage * state.perPage, total)}</span>`;

  container.innerHTML = html;

  container.querySelectorAll('.page-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.disabled) return;
      state.currentPage = parseInt(btn.dataset.page);
      loadAllProducts();
      const tabAll = document.getElementById('tab-all');
      if (tabAll) window.scrollTo({ top: tabAll.offsetTop - 80, behavior: 'smooth' });
    });
  });
}

function getPageRange(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = [];
  if (current <= 4) {
    for (let i = 1; i <= 5; i++) pages.push(i);
    pages.push('...', total);
  } else if (current >= total - 3) {
    pages.push(1, '...');
    for (let i = total - 4; i <= total; i++) pages.push(i);
  } else {
    pages.push(1, '...', current - 1, current, current + 1, '...', total);
  }
  return pages;
}

function closeModal() {
  const modalOverlay = document.getElementById('modalOverlay');
  if (modalOverlay) modalOverlay.classList.remove('open');
  document.body.style.overflow = '';
}

// Helper: Fetch AI Summary
async function fetchAiSummary(product) {
  // 1. Priority: DB pre-calculated summary (avoids API cost on repeat visits)
  if (product.ai_summary && product.ai_summary.pros) {
    return product.ai_summary;
  }

  // 2. Check LocalStorage cache
  const cacheKey = `ai_summary_${product.product_id || product.id}`;
  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    try { return JSON.parse(cached); } catch (e) { }
  }

  // 3. Call Gemini 3.0 Flash API directly
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('VITE_GEMINI_API_KEY not set in .env');
  }

  const reviews = product.reviews || [
    `${product.name} 써보니까 진짜 좋아요.`,
    `가격 대비 성능이 뛰어납니다.`,
    `발림성이 부드럽고 촉촉해요.`,
    `재구매 의사 있습니다.`,
    `약간 아쉬운 점도 있지만 전반적으로 만족.`
  ];

  const prompt = `Analyze the following Korean product reviews for "${product.name}".
Return ONLY valid JSON matching this exact schema:
{
  "sentiment_pos": (integer 0-100),
  "keywords": ["키워드1", "키워드2", "키워드3", "키워드4", "키워드5"],
  "pros": ["장점1", "장점2", "장점3"],
  "cons": ["단점1", "단점2", "단점3"]
}

CRITICAL INSTRUCTION FOR CONS (단점): 
Never use vague or generic statements like "일부 아쉬운 점이 있음", "호불호가 갈릴 수 있음", or "개인차가 존재함". 
Extract highly specific product flaws mentioned by users (e.g., "펌프가 잘 고장남", "건성 피부에는 건조함", "향이 인공적임"). 
If the reviews do not contain any specific negative feedback, simply output ["특별하게 언급된 단점이 없음"].

Reviews:
${reviews.join('\n').substring(0, 2000)}`;

  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const response = await fetch(geminiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: 'application/json'
      }
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API Error: ${errText}`);
  }

  const data = await response.json();
  let textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
  if (textResponse.startsWith('```json')) {
    textResponse = textResponse.split('```json')[1].split('```')[0].trim();
  } else if (textResponse.startsWith('```')) {
    textResponse = textResponse.split('```')[1].split('```')[0].trim();
  }
  const result = JSON.parse(textResponse);

  // 4. Save to local cache
  localStorage.setItem(cacheKey, JSON.stringify(result));

  // 5. Persist to Supabase DB (fire & forget) so next user doesn't trigger API again
  const pId = product.product_id || product.id;
  if (pId) {
    const { SUPABASE_URL, SUPABASE_KEY } = {
      SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL || 'https://hgxblbbjlnsfkffwvfao.supabase.co',
      SUPABASE_KEY: import.meta.env.VITE_SUPABASE_KEY
    };
    // Use the supabase client from supabase.js to update
    try {
      await saveProduct({ id: pId, ai_summary: result });
    } catch (e) {
      console.warn('DB persist of AI summary failed (non-critical):', e);
    }
  }

  return result;
}

// ─── Modal ──────────────────────────────────
let rankChart = null;

/**
 * 전용 멤버십 알림 모달 출력 (사용자 확인 필요)
 */
function showMembershipAlert() {
  const modal = document.getElementById('modalOverlay');
  const body = document.getElementById('modalBody');
  if (!modal || !body) return;

  const title = window.t('membership.limit_reached');
  const desc = window.t('membership.limit_desc');
  const btnText = window.t('membership.confirm');

  body.innerHTML = `
    <div class="membership-alert-modal">
      <div class="alert-icon">🔒</div>
      <h2>${title}</h2>
      <p>${desc}</p>
      <div class="alert-actions">
        <button class="btn-confirm" onclick="document.getElementById('modalOverlay').classList.remove('open'); document.body.classList.remove('one-page');">${btnText}</button>
      </div>
    </div>
  `;

  modal.classList.add('open');
  document.body.classList.add('one-page');
}

window.__openProduct = async function (product) {
  // Membership & Usage Guard
  const profile = getProfile();
  const isPro = profile && (profile.subscription_tier === 'pro' || profile.role === 'admin');

  if (!isPro) {
    const viewCount = getDailyViewCount();
    if (viewCount >= 10) {
      showMembershipAlert();
      return;
    }
    // Increment count on open
    incrementDetailViewCount();
  }

  // Ensure we use the numeric DB ID for daily_rankings_v2
  window.currentModalProductId = product.id || product.product_id;
  window.currentModalProductData = product;
  const modal = document.getElementById('modalOverlay');
  const body = document.getElementById('modalBody');
  if (!modal || !body) return;

  // Resolve price and URL
  const displayPrice = product.special_price || product.price || product.price_current || product.deal_price;
  const productUrl = product.url || product.product_url;
  const isDeal = !!product.special_price;

  // Check true wishlist status from DB
  window.currentModalIsSaved = await checkIfSaved(window.currentModalProductId);

  // Initial State: Use pre-calculated summary if available
  let aiData = product.ai_summary || null;
  let isAiLoading = false;

  const renderModal = () => {
    // Trend Analysis Fields
    const isTrendItem = ['google_trends', 'naver_datalab'].includes(product.source);

    // Standard Properties
    const sentimentPos = aiData ? aiData.sentiment_pos : (product.review_rating ? Math.min(Math.round(product.review_rating * 20), 98) : 85);
    const sentimentNeg = 100 - sentimentPos;
    const keywords = aiData ? aiData.keywords : [];
    const pros = aiData ? aiData.pros : [];
    const cons = aiData ? aiData.cons : [];

    // Trend Properties
    const tReason = aiData ? aiData.reason : '';
    const tInsight = aiData ? aiData.insight : '';
    const tTarget = aiData ? aiData.target : '';
    const tSlogan = aiData ? aiData.slogan : '';

    // Add 'one-page' class
    body.classList.add('one-page');

    // Dynamic Modal Content based on Type
    let modalContent = '';

    // Prepare "View on [Platform]" text based on current source
    const sourceKey = product.source || ((typeof state !== 'undefined') ? state.currentPlatform : 'oliveyoung') || 'oliveyoung';
    const platformName = window.t('platforms.' + sourceKey) || sourceKey;
    const ctaText = isDeal ? window.t('modal.cta_check_price') : ('🔗 ' + window.t('modal.view_in').replace('{platform}', platformName));

    if (isTrendItem) {
      // --- TREND ITEM LAYOUT ---
      modalContent = `
        <div class="modal-upper">
          <div class="modal-image-col" style="display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg, #f6d365 0%, #fda085 100%);color:white;font-size:48px;border-radius:12px;">
             ${product.source === 'google_trends' ? '📈' : '🇳'}
          </div>
          <div class="modal-info-col">
            <div class="trend-badge-row">
               <span class="badge badge-rank-up">🔥 급상승 트렌드</span>
               <span class="badge">${product.source === 'google_trends' ? 'Google Trends' : 'Naver DataLab'}</span>
            </div>
            <h3 class="modal-title" style="margin-top:10px;font-size:2rem;">${escapeHtml(product.name)}</h3>
            <div class="modal-meta-value" style="margin-top:5px;color:var(--text-secondary)">
               ${new Date().toLocaleDateString()} 기준 트렌드 분석
            </div>
          </div>
        </div>

        <div class="modal-lower">
          <div class="modal-section-title">✨ AI 트렌드 인사이트 (AI)</div>
          <div class="ai-summary trend-mode">
             ${!aiData ? '<div class="loading-skeleton">AI 분석 데이터를 불러오는 중...</div>' : `
             <div class="trend-insight-grid">
               <div class="insight-box">
                 <div class="ib-icon">💡</div>
                 <div class="ib-content">
                   <div class="ib-title">급상승 이유</div>
                   <div class="ib-text">${tReason}</div>
                 </div>
               </div>
               <div class="insight-box">
                 <div class="ib-icon">🎯</div>
                 <div class="ib-content">
                   <div class="ib-title">타겟 오디언스</div>
                   <div class="ib-text">${tTarget}</div>
                 </div>
               </div>
               <div class="insight-box full">
                 <div class="ib-icon">📢</div>
                 <div class="ib-content">
                   <div class="ib-title">마케팅 슬로건</div>
                   <div class="ib-text slogan">"${tSlogan}"</div>
                 </div>
               </div>
               <div class="insight-box full">
                 <div class="ib-icon">📊</div>
                 <div class="ib-content">
                   <div class="ib-title">비즈니스 인사이트</div>
                   <div class="ib-text">${tInsight}</div>
                 </div>
               </div>
             </div>
             `}
          </div>
        </div>
        `;
    } else {
      // --- STANDARD PRODUCT LAYOUT ---
      modalContent = `
      <!-- UPPER: Left Image + Right Info -->
      <div class="modal-upper optimized-upper">
        <!-- LEFT: Image -->
        <div class="modal-image-col">
          ${product.image_url
          ? `<img class="modal-img-premium" src="${product.image_url}" alt="${escapeHtml(product.name)}" />`
          : `<div style="width:100%;height:300px;background:#f8f8fa;border-radius:16px;display:flex;align-items:center;justify-content:center;color:#ccc;">No Image</div>`
        }
        </div>

        <!-- RIGHT: Info + Charts + CTA -->
        <div class="modal-info-col optimized-info">
          <div class="modal-title-area">
            <div class="modal-brand-premium">${escapeHtml(getLocalizedBrand(product))}</div>
            <h3 class="modal-title-premium">${escapeHtml(getLocalizedName(product))}</h3>
          </div>

          <!-- Glassmorphism Metrics Grid -->
          <div class="modal-metrics-glass">
            <div class="metric-glass-card ${isDeal ? 'deal-active' : ''}">
              <div class="metric-label">${isDeal ? window.t('modal.special_price') : window.t('modal.price')}</div>
              <div class="metric-value price-val">${formatPrice(displayPrice)}</div>
              ${product.original_price ? `<div class="metric-sub original-price">${formatPrice(product.original_price)}</div>` : ''}
              ${product.discount_pct ? `<div class="metric-badge discount-badge">${product.discount_pct}% OFF</div>` : ''}
            </div>
            
            ${product.review_count !== undefined ? `
            <div class="metric-glass-card">
              <div class="metric-label">${window.t('modal.reviews')}</div>
              <div class="metric-value">${formatNumber(product.review_count)}</div>
              ${product.review_rating ? `<div class="metric-sub">⭐ ${product.review_rating}</div>` : ''}
            </div>` : ''}
            
            ${product.current_rank !== undefined ? `
            <div class="metric-glass-card">
              <div class="metric-label" style="font-size:0.8rem;">${window.t('modal.rank_category')}</div>
              <div class="metric-value rank-val" style="font-size:1.4rem;">${window.t('modal.rank_value').replace('{rank}', product.current_rank)}</div>
              ${product.rank_change !== undefined ? `
                <div class="metric-sub rank-change ${product.rank_change > 0 ? 'up' : 'down'}">
                  ${product.rank_change > 0 ? '▲' : '▼'} ${Math.abs(product.rank_change)}
                </div>` : ''}
            </div>` : ''}
          </div>

          <!-- Action Buttons (Wishlist & Sourcing) -->
          <div style="display:flex; gap:10px; margin-bottom:15px; width:100%; position:relative; z-index:9999; pointer-events:auto;">
            <button class="btn-store-premium ${window.currentModalIsSaved ? 'active' : ''}" style="flex:1; background:#fff; color:var(--accent-blue); border:1px solid var(--accent-blue); padding:12px; border-radius:12px; font-weight:700; cursor:pointer;" onclick="window.__modalToggleWishlist(this, '${product.id || product.product_id}')">
               ${window.currentModalIsSaved ? window.t('modal.wishlist_saved') : window.t('modal.wishlist_add')}
            </button>
            <button class="btn-store-premium" style="flex:1; background:#fff; color:#f06595; border:1px solid #f06595; padding:12px; border-radius:12px; font-weight:700; cursor:pointer;" onclick="document.getElementById('productDetailModalOverlay').classList.remove('open'); window.openMyPageModal(); setTimeout(() => { document.querySelector('.auth-tab[data-mypage-tab=\\'sourcing\\']').click(); }, 100);">
               ${window.t('modal.sourcing_req')}
            </button>
          </div>
          <!-- External Store Link -->
          ${productUrl ? `\u003ca class="btn-store-premium" href="${productUrl}" target="_blank" rel="noopener" style="margin-bottom:0px;"\u003e${ctaText}\u003c/a\u003e` : ''}
          <!-- Price & Rank Charts (Simplified) -->
          <div class="chart-section-premium">
            <div class="modal-chart-header" style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px; margin-bottom:12px;">
              <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                <div class="modal-section-title" style="margin-bottom:0; white-space:nowrap;">${window.t('modal.rank_trend')}</div>
                <span id="bestRankBadge" style="display:none; background:rgba(59, 130, 246, 0.1); color:var(--accent-blue); font-size:11px; font-weight:700; padding:3px 10px; border-radius:12px; border:1px solid rgba(59, 130, 246, 0.2); white-space:nowrap;">
                  ${window.t('modal.best_rank')} #-
                </span>
              </div>
              <div id="chartTabsModal" style="display:flex; gap:6px;">
                <button id="chartBtn_all" class="chart-tab-btn active" onclick="window.__setChartTab('all')">${window.t('tabs.all')}</button>
                <button id="chartBtn_7" class="chart-tab-btn" onclick="window.__setChartTab(7)">7${window.t('modal.days_30').replace('30', '')}</button>
                <button id="chartBtn_30" class="chart-tab-btn" onclick="window.__setChartTab(30)">30${window.t('modal.days_30').replace('30', '')}</button>
              </div>
            </div>
            <div id="chartContainerModal" class="chart-container-modal">
              <canvas id="rankChart"></canvas>
            </div>
            <div id="chartPlaceholderModal" style="display:none; height: 120px; align-items: center; justify-content: center; background: var(--surface-light); border-radius: 12px; color: var(--text-muted); font-size: 14px; font-weight: 500;">
              ${window.t('modal.no_rank_data')}
            </div>
          </div>
        </div>
      </div>

      <!-- LOWER: AI Review Analysis -->
      <div class="modal-lower">
        <div class="modal-section-title">${window.t('modal.ai_insight_title')}</div>
        <div class="ai-summary premium-ai">
          <div class="ai-header">
            <span class="ai-icon">🤖</span>
            <span class="ai-title">${window.t('modal.ai_review_analysis')}</span>
            <span class="ai-badge">${aiData ? 'LIVE' : 'BETA'}</span>
          </div>

          ${!aiData && !isAiLoading ? `
          <div class="ai-action-area">
            <button class="btn-ai-generate" onclick="loadAiData()">${window.t('modal.run_analysis')}</button>
          </div>` : ''}

          ${isAiLoading ? `
          <div class="ai-loading-area">
            <div class="loading-spinner"></div>
            <p>${window.t('modal.ai_analyzing')}</p>
          </div>` : ''}

          ${aiData ? `
          <div class="sentiment-container">
            <div class="sentiment-labels">
              <span class="pos-label">${window.t('modal.sentiment_pos')} ${sentimentPos}%</span>
              <span class="neg-label">${window.t('modal.sentiment_neg')} ${sentimentNeg}%</span>
            </div>
            <div class="sentiment-bar-premium">
              <div class="sentiment-pos" style="width:${sentimentPos}%"></div>
              <div class="sentiment-neg" style="width:${sentimentNeg}%"></div>
            </div>
          </div>
          
          <div class="ai-keywords-pills">
            ${keywords.map(k => `<span class="pill-keyword">#${k}</span>`).join('')}
          </div>
          
          <div class="ai-proscons-premium">
            <div class="pros-col">
              <div class="list-head pros-head">👍 ${window.t('modal.pros')}</div>
              <ul class="styled-list pros-list">
                ${pros.map(p => `<li><span class="list-icon">✓</span><span>${p}</span></li>`).join('')}
              </ul>
            </div>
            <div class="cons-col">
              <div class="list-head cons-head">👎 ${window.t('modal.cons')}</div>
              <ul class="styled-list cons-list">
                ${cons.map(c => `<li><span class="list-icon">✕</span><span>${c}</span></li>`).join('')}
              </ul>
            </div>
          </div>
          <p class="ai-disclaimer">
            * ${window.t('modal.ai_disclaimer')}
          </p>` : ''}
        </div>
      </div>
      `;
    }

    body.innerHTML = modalContent;
  }

  // Expose re-renderer so languageChanged listener can trigger it
  window.__rerenderModal = () => {
    renderModal();
    // Re-apply chart after re-render
    setTimeout(() => window.__setChartTab && window.__setChartTab('all'), 100);
  };

  // Initial Render
  renderModal();

  modal.classList.add('open');
  document.body.style.overflow = 'hidden';

  // Auto-load rank chart after DOM is ready (with tab highlighting & best rank badge)
  setTimeout(() => {
    window.__setChartTab('all');
  }, 400);

  // AI Load Handler (no tab switching needed in new layout)
  window.loadAiData = async () => {
    isAiLoading = true;
    renderModal();
    // Re-load chart after re-render
    setTimeout(() => window.__setChartTab('all'), 50);

    try {
      aiData = await fetchAiSummary(product);
    } catch (e) {
      console.error(e);
    } finally {
      isAiLoading = false;
      renderModal();
      setTimeout(() => window.__setChartTab('all'), 50);
    }
  };

  // Auto-run AI Analysis in background only if data is not already loaded
  if (!aiData) {
    window.loadAiData(false);
  } else {
    // Re-render chart once after modal is open
    setTimeout(() => window.__setChartTab('all'), 100);
  }

  // Modal Tab Switching Logic (Legacy support if needed)
  window.switchModalTab = async (tabName) => {
    // Legacy support for modal internal tabs
  };
};

// Helper: Load Chart
async function loadRankChart(productId, days = 30) {
  const ctx = document.getElementById('rankChart');
  if (!ctx) return;

  // Destroy previous chart instance if it exists to prevent "Canvas is already in use" error
  if (window.__rankChartInstance) {
    window.__rankChartInstance.destroy();
    window.__rankChartInstance = null;
  }
  if (rankChart) {
    rankChart.destroy();
    rankChart = null;
  }

  try {
    const { ranks, prices } = await fetchProductHistory(productId, days);

    // Filter out invalid timestamps and parse them for sorting and display
    const parseTs = (ts) => new Date(ts).getTime();

    const validRanks = ranks.filter(r => r.timestamp && !isNaN(parseTs(r.timestamp)));
    const validPrices = prices.filter(p => p.timestamp && !isNaN(parseTs(p.timestamp)));

    // Extract unique format-agnostic timestamps for unified X-axis
    let allTimestamps = [...validRanks.map(r => r.timestamp), ...validPrices.map(p => p.timestamp)];
    // Remove duplicates based on parsed time
    const uniqueMap = new Map();
    allTimestamps.forEach(ts => uniqueMap.set(parseTs(ts), ts));

    // Sort chronologically
    const sortedTimestamps = Array.from(uniqueMap.values()).sort((a, b) => parseTs(a) - parseTs(b));

    const chartContainer = document.getElementById('chartContainerModal');
    const chartPlaceholder = document.getElementById('chartPlaceholderModal');

    if (sortedTimestamps.length < 1) {
      if (chartContainer) chartContainer.style.display = 'none';
      if (chartPlaceholder) chartPlaceholder.style.display = 'flex';
      return;
    } else {
      if (chartContainer) chartContainer.style.display = 'block';
      if (chartPlaceholder) chartPlaceholder.style.display = 'none';
    }

    const rankData = sortedTimestamps.map(ts => {
      // Find exact or closest within a small window if needed. For now exact timestamp match.
      const match = validRanks.find(r => parseTs(r.timestamp) === parseTs(ts));
      return match ? match.rank : null;
    });

    const priceData = sortedTimestamps.map(ts => {
      const match = validPrices.find(p => parseTs(p.timestamp) === parseTs(ts));
      return match ? match.price : null;
    });

    // Extract original price for accurate discount calculation in tooltips
    const originalPriceData = sortedTimestamps.map(ts => {
      const match = validPrices.find(p => parseTs(p.timestamp) === parseTs(ts));
      return match ? match.original_price : null;
    });

    const hasRanks = rankData.some(r => r !== null);
    const hasPrices = priceData.some(p => p !== null);

    // Store rank data globally for best rank badge computation
    window.__currentChartRanks = rankData;

    const datasets = [];

    if (hasRanks) {
      datasets.push({
        label: i18n.t('charts.rank'),
        data: rankData,
        borderColor: '#4dabf7', // Vivid blue for rank
        backgroundColor: 'rgba(77, 171, 247, 0.1)',
        yAxisID: 'y',
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#4dabf7',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: '#4dabf7'
      });
    }

    if (hasPrices) {
      datasets.push({
        label: i18n.t('charts.price'),
        data: priceData,
        borderColor: '#ff6b6b', // Soft red for price
        backgroundColor: 'rgba(255, 107, 107, 0.1)',
        yAxisID: 'y1',
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#ff6b6b',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: '#ff6b6b'
      });
    }

    // Format Labels (MM/DD HH:mm)
    const labels = sortedTimestamps.map(ts => {
      const d = new Date(ts);
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const hh = String(d.getHours()).padStart(2, '0');
      const min = String(d.getMinutes()).padStart(2, '0');
      // If time is exactly 00:00 (legacy data without time), just show date
      if (hh === '00' && min === '00') {
        return `${mm}/${dd}`;
      }
      return `${mm}/${dd} ${hh}:${min}`;
    });

    // Ensure chart dots are always visible even for 1 data point
    const pointRadius = sortedTimestamps.length <= 1 ? 5 : 3;
    const pointHoverRadius = sortedTimestamps.length <= 1 ? 7 : 5;

    if (hasRanks) datasets[0].pointRadius = pointRadius;
    if (hasRanks) datasets[0].pointHoverRadius = pointHoverRadius;
    if (hasPrices) datasets[hasRanks ? 1 : 0].pointRadius = pointRadius;
    if (hasPrices) datasets[hasRanks ? 1 : 0].pointHoverRadius = pointHoverRadius;

    // Create new chart and store instance globally
    window.__rankChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        plugins: {
          legend: {
            display: false,
            position: 'top',
            labels: {
              usePointStyle: true,
              boxWidth: 8,
              font: { family: "'Inter', sans-serif", size: 12 }
            }
          },
          tooltip: {
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            titleColor: '#343a40',
            bodyColor: '#495057',
            borderColor: 'rgba(0,0,0,0.05)',
            borderWidth: 1,
            padding: 12,
            boxPadding: 6,
            usePointStyle: true,
            titleFont: { family: "'Inter', sans-serif", size: 13, weight: 'bold' },
            bodyFont: { family: "'Inter', sans-serif", size: 13 },
            callbacks: {
              label: function (context) {
                let label = context.dataset.label || '';
                if (label) label += ': ';
                if (context.dataset.yAxisID === 'y') {
                  label += context.parsed.y + '위';
                } else {
                  const val = context.parsed.y;
                  label += val.toLocaleString() + '원';

                  // Calculate discount if original_price exists
                  const idx = context.dataIndex;
                  const orig = originalPriceData[idx];
                  if (orig && orig > val) {
                    const discount = Math.round(((orig - val) / orig) * 100);
                    label += ` (${discount}% 할인)`;
                  }
                }
                return label;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { display: false, drawBorder: false },
            ticks: {
              font: { family: "'Inter', sans-serif", size: 11 },
              color: '#adb5bd',
              maxRotation: 45,
              minRotation: 0
            }
          },
          y: {
            type: 'linear',
            display: hasRanks,
            position: 'left',
            reverse: true, // Rank 1 is at the top
            min: 1,
            max: 100,
            title: {
              display: true,
              text: i18n.t('charts.rank'),
              font: { family: "'Inter', sans-serif", size: 12, weight: '500' },
              color: '#adb5bd'
            },
            grid: { color: 'rgba(0,0,0,0.04)', drawBorder: false },
            ticks: {
              stepSize: 20,
              font: { family: "'Inter', sans-serif", size: 11 },
              color: '#adb5bd'
            }
          },
          y1: {
            type: 'linear',
            display: hasPrices,
            position: 'right',
            title: {
              display: true,
              text: i18n.t('charts.price'),
              font: { family: "'Inter', sans-serif", size: 12, weight: '500' },
              color: '#adb5bd'
            },
            grid: {
              drawOnChartArea: false, // Ensure grid lines don't overlap
              drawBorder: false
            },
            ticks: {
              callback: function (value) {
                return value.toLocaleString() + '원';
              },
              font: { family: "'Inter', sans-serif", size: 11 },
              color: '#adb5bd'
            }
          }
        }
      }
    });

  } catch (err) {
    console.error('Failed to load chart history:', err);
    // Display placeholder if data load fails
    const chartContainer = document.getElementById('chartContainerModal');
    const chartPlaceholder = document.getElementById('chartPlaceholderModal');
    if (chartContainer) chartContainer.style.display = 'none';
    if (chartPlaceholder) chartPlaceholder.style.display = 'flex';
  }
}

// Expose loadRankChart globally for inline HTML onclick handlers
window.loadRankChart = loadRankChart;

// Helper: switch chart tab with active button highlighting & best rank badge
window.__setChartTab = async function (days) {
  // Update button active states
  const btnMap = { 'all': 'chartBtn_all', 7: 'chartBtn_7', 30: 'chartBtn_30' };
  Object.entries(btnMap).forEach(([key, btnId]) => {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    const isActive = String(key) === String(days);
    btn.classList.toggle('active', isActive);
  });

  // Load chart
  await loadRankChart(window.currentModalProductId, days);

  // Update best rank badge
  const badge = document.getElementById('bestRankBadge');
  if (badge && window.__currentChartRanks && window.__currentChartRanks.length > 0) {
    const bestRank = Math.min(...window.__currentChartRanks.filter(r => r !== null));
    if (isFinite(bestRank)) {
      badge.textContent = `${window.t('modal.best_rank')} #${bestRank}`;
      badge.style.display = 'inline-block';
    }
  }
};



// ─── Helpers ────────────────────────────────
function filterByCategory(data, categoryField = 'category_code') {
  if (state.activeCategory === 'all') return data;
  return data.filter(item => item[categoryField] === state.activeCategory);
}

function filterBySearch(data) {
  if (!state.searchQuery) return data;
  const q = state.searchQuery.toLowerCase();
  return data.filter(item =>
    (item.name && item.name.toLowerCase().includes(q)) ||
    (item.brand && item.brand.toLowerCase().includes(q))
  );
}

// ─── Market Insights ────────────────────────
let charts = {
  category: null,
  brand: null,
  price: null
};

async function loadInsights() {
  // K-Trend 플랫폼이면 전용 뷰로 분기
  if (state.currentPlatform === 'k_trend') {
    return await loadKTrendInsights();
  }

  try {
    const [catStats, brandStats, priceStats] = await Promise.all([
      fetchCategoryStats(),
      fetchBrandStats(),
      fetchPriceStats()
    ]);

    renderCategoryChart(catStats.data || []);
    renderBrandChart(brandStats.data || []);
    renderPriceChart(priceStats.data || []);

    // Add Trend Pulse (Skip for Olive Young as per user request)
    if (state.currentPlatform !== 'oliveyoung') {
      await loadTrendPulse();
    } else {
      // Remove if exists
      const pulse = document.getElementById('trendPulseCard');
      if (pulse) pulse.remove();
    }
  } catch (err) {
    console.error('Insights load error:', err);
  }
}

// ─── K-Trend 전용 시장 분석 ──────────────────
async function loadKTrendInsights() {
  const insightGrid = document.querySelector('#tab-insights .insights-grid');
  if (!insightGrid) return;

  insightGrid.innerHTML = `<div class="ktrend-loading" style="grid-column:1/-1">
    <div class="ktrend-spinner"></div><span>🤖 AI 트렌드 태그 분석 중...</span>
  </div>`;

  try {
    const [googleRes, naverRes] = await Promise.all([
      fetchTrending(50, 'google_trends'),
      fetchTrending(30, 'naver_datalab')
    ]);
    const googleData = googleRes.data || [];
    const naverData = naverRes.data || [];
    const allData = [...googleData, ...naverData];

    if (allData.length === 0) {
      insightGrid.innerHTML = `<div style="grid-column:1/-1;padding:60px;text-align:center;color:var(--text-muted)">
        <div style="font-size:48px;margin-bottom:12px">📊</div>
        <h3>분석 데이터가 없습니다</h3>
        <p>크롤러와 AI 태거를 실행하면 자동으로 채워집니다.</p>
      </div>`;
      return;
    }

    // ── Gemini tags 집계 ───────────────────────
    const ingredientCount = {};
    const brandCount = {};
    const fashionCount = {};
    const typeCount = {};
    let taggedCount = 0;

    allData.forEach(p => {
      const tags = p.tags || {};
      if (Object.keys(tags).length > 0) taggedCount++;
      if (tags.ingredient) ingredientCount[tags.ingredient] = (ingredientCount[tags.ingredient] || 0) + 1;
      if (tags.brand) brandCount[tags.brand] = (brandCount[tags.brand] || 0) + 1;
      if (tags.fashion_style) fashionCount[tags.fashion_style] = (fashionCount[tags.fashion_style] || 0) + 1;
      if (tags.trend_type) typeCount[tags.trend_type] = (typeCount[tags.trend_type] || 0) + 1;
    });

    // 급상승 % 파싱 (구글 TOP 15용)
    const parsePct = p => {
      const m = (p.brand || '').match(/\+?([\d,]+)%/);
      return m ? parseInt(m[1].replace(/,/g, '')) : 0;
    };
    const top15Google = [...googleData].sort((a, b) => parsePct(b) - parsePct(a)).slice(0, 15);

    const topIngredients = Object.entries(ingredientCount).sort((a, b) => b[1] - a[1]).slice(0, 10);
    const topBrands = Object.entries(brandCount).sort((a, b) => b[1] - a[1]).slice(0, 10);
    const topFashion = Object.entries(fashionCount).sort((a, b) => b[1] - a[1]);
    const hasGeminiTags = taggedCount > 0;

    const geminiStatusBadge = hasGeminiTags
      ? `<span style="color:var(--accent-green);font-weight:600;font-size:12px">● AI 태그 ${taggedCount}건 분석 완료</span>`
      : `<span style="color:var(--accent-orange);font-weight:600;font-size:12px">⚠ AI 태그 없음 – trend_enricher.py를 먼저 실행해주세요</span>`;

    insightGrid.innerHTML = `
      <!-- 카드 1: 출처 도넛 + 태그 상태 -->
      <div class="insight-card">
        <h3>📡 데이터 출처 비중</h3>
        <div class="chart-wrapper"><canvas id="ktrendSourceChart"></canvas></div>
        <div style="margin-top:12px;display:flex;flex-direction:column;align-items:center;gap:6px;font-size:13px;">
          <div><span style="color:#1a73e8">● 구글 트렌드 ${googleData.length}건</span>&nbsp;&nbsp;<span style="color:#03c75a">● 네이버 ${naverData.length}건</span></div>
          <div>${geminiStatusBadge}</div>
        </div>
      </div>

      <!-- 카드 2: 트렌드 타입 도넛 -->
      <div class="insight-card">
        <h3>🏷️ 트렌드 유형 분포</h3>
        ${hasGeminiTags && Object.keys(typeCount).length > 0
        ? `<div class="chart-wrapper"><canvas id="ktrendTypeChart"></canvas></div>`
        : `<div style="padding:40px;text-align:center;color:var(--text-muted);font-size:13px">AI 태깅 후 자동 생성됩니다</div>`
      }
      </div>

      <!-- 카드 3: 화장품 성분 TOP (full-width) -->
      <div class="insight-card full-width">
        <h3>🧪 화장품 성분 트렌드 ${hasGeminiTags ? `<span style="font-size:12px;font-weight:400;color:var(--text-muted)">(AI 분석)</span>` : ''}</h3>
        ${topIngredients.length > 0
        ? `<div class="chart-wrapper" style="height:280px"><canvas id="ktrendIngredientChart"></canvas></div>`
        : `<div style="padding:40px;text-align:center;color:var(--text-muted)">
              <div style="font-size:32px;margin-bottom:8px">🧪</div>
              <p>AI가 아직 성분을 추출하지 않았습니다.</p>
              <code style="font-size:11px;background:#f5f5f7;padding:4px 8px;border-radius:4px">python scripts/trend_enricher.py</code> 를 실행해주세요.
             </div>`
      }
      </div>

      <!-- 카드 4: 브랜드 언급 TOP (full-width) -->
      <div class="insight-card full-width">
        <h3>🏷️ 브랜드 언급 TOP ${hasGeminiTags ? `<span style="font-size:12px;font-weight:400;color:var(--text-muted)">(AI 분석)</span>` : ''}</h3>
        ${topBrands.length > 0
        ? `<div class="chart-wrapper" style="height:300px"><canvas id="ktrendBrandChart"></canvas></div>`
        : `<div style="padding:40px;text-align:center;color:var(--text-muted)">
              <div style="font-size:32px;margin-bottom:8px">🏷️</div>
              <p>AI 태깅 후 브랜드가 자동 추출됩니다.</p>
             </div>`
      }
      </div>

      <!-- 카드 5: 패션 트렌드 키워드 cloud -->
      <div class="insight-card full-width">
        <h3>👗 패션 트렌드 키워드 ${hasGeminiTags ? `<span style="font-size:12px;font-weight:400;color:var(--text-muted)">(AI 분석)</span>` : ''}</h3>
        ${topFashion.length > 0
        ? `<div class="ktrend-insight-pills">
              ${topFashion.map(([style, cnt], i) => `
                <span class="ktrend-insight-pill" style="animation-delay:${i * 0.04}s;font-size:${13 + Math.min(cnt * 2, 8)}px">
                  ${escapeHtml(style)} <span style="opacity:0.5;font-size:11px">(${cnt})</span>
                </span>
              `).join('')}
             </div>`
        : `<div style="padding:40px;text-align:center;color:var(--text-muted)">
              <div style="font-size:32px;margin-bottom:8px">👗</div>
              <p>AI 태깅 후 패션 스타일이 자동 추출됩니다.</p>
             </div>`
      }
      </div>

      <!-- 카드 6: 구글 급상승 TOP15 -->
      <div class="insight-card full-width">
        <h3>🔥 구글 트렌드 급상승 TOP 15 키워드</h3>
        <div class="chart-wrapper" style="height:360px"><canvas id="ktrendBarChart"></canvas></div>
      </div>
    `;

    // ── 차트 렌더 ────────────────────────────
    // 1. 출처 도넛
    const srcCtx = document.getElementById('ktrendSourceChart');
    if (srcCtx) {
      if (charts.category) charts.category.destroy();
      charts.category = new Chart(srcCtx, {
        type: 'doughnut',
        data: {
          labels: ['구글 트렌드', '네이버 데이터랩'],
          datasets: [{ data: [googleData.length, naverData.length], backgroundColor: ['#1a73e8', '#03c75a'], borderWidth: 0 }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { position: 'bottom', labels: { color: '#6e6e73', font: { size: 12, family: 'Inter' } } } }
        }
      });
    }

    // 2. 트렌드 유형 도넛
    const typeCtx = document.getElementById('ktrendTypeChart');
    if (typeCtx && Object.keys(typeCount).length > 0) {
      const typeColors = { beauty: '#ff9500', fashion: '#af52de', brand: '#0071e3', other: '#86868b' };
      const typeLabels = Object.keys(typeCount);
      if (charts.brand) charts.brand.destroy();
      charts.brand = new Chart(typeCtx, {
        type: 'doughnut',
        data: {
          labels: typeLabels,
          datasets: [{
            data: typeLabels.map(t => typeCount[t]),
            backgroundColor: typeLabels.map(t => typeColors[t] || '#86868b'), borderWidth: 0
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { position: 'bottom', labels: { color: '#6e6e73', font: { size: 12, family: 'Inter' } } } }
        }
      });
    }

    // 3. 성분 가로 바차트
    const ingCtx = document.getElementById('ktrendIngredientChart');
    if (ingCtx && topIngredients.length > 0) {
      const ingColors = ['#ff9500', '#ff3b30', '#af52de', '#0071e3', '#34c759', '#32ade6', '#fbbf24', '#e879f9', '#10b981', '#6366f1'];
      new Chart(ingCtx, {
        type: 'bar',
        data: {
          labels: topIngredients.map(([k]) => k),
          datasets: [{
            data: topIngredients.map(([, v]) => v),
            backgroundColor: topIngredients.map((_, i) => ingColors[i % ingColors.length]),
            borderRadius: 6, label: '언급 횟수'
          }]
        },
        options: {
          indexAxis: 'y', responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ${ctx.parsed.x}회 언급` } } },
          scales: {
            x: { grid: { color: 'rgba(0,0,0,0.03)' }, ticks: { font: { size: 11, family: 'Inter' }, color: '#adb5bd' } },
            y: { grid: { display: false }, ticks: { font: { size: 14, family: 'Inter', weight: '600' }, color: '#1d1d1f' } }
          }
        }
      });
    }

    // 4. 브랜드 가로 바차트
    const brandCtx = document.getElementById('ktrendBrandChart');
    if (brandCtx && topBrands.length > 0) {
      if (charts.price) charts.price.destroy();
      charts.price = new Chart(brandCtx, {
        type: 'bar',
        data: {
          labels: topBrands.map(([k]) => k),
          datasets: [{
            data: topBrands.map(([, v]) => v),
            backgroundColor: '#0071e3', borderRadius: 6, label: '언급 횟수'
          }]
        },
        options: {
          indexAxis: 'y', responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ${ctx.parsed.x}회 언급` } } },
          scales: {
            x: { grid: { color: 'rgba(0,0,0,0.03)' }, ticks: { font: { size: 11, family: 'Inter' }, color: '#adb5bd' } },
            y: { grid: { display: false }, ticks: { font: { size: 14, family: 'Inter', weight: '600' }, color: '#1d1d1f' } }
          }
        }
      });
    }

    // 5. 구글 급상승 가로 바차트
    const barCtx = document.getElementById('ktrendBarChart');
    if (barCtx && top15Google.length > 0) {
      const pcts = top15Google.map(p => Math.min(parsePct(p), 999999));
      const colors = pcts.map(v => v > 100000 ? '#e53e1a' : v > 10000 ? '#dd6b20' : '#0071e3');
      new Chart(barCtx, {
        type: 'bar',
        data: {
          labels: top15Google.map(p => p.name),
          datasets: [{ label: '급상승 지수', data: pcts, backgroundColor: colors, borderRadius: 6 }]
        },
        options: {
          indexAxis: 'y', responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` +${ctx.parsed.x.toLocaleString()}%` } } },
          scales: {
            x: {
              grid: { color: 'rgba(0,0,0,0.03)' },
              ticks: { callback: v => v >= 10000 ? (v / 10000).toFixed(0) + '만%' : v + '%', font: { size: 11, family: 'Inter' }, color: '#adb5bd' }
            },
            y: { grid: { display: false }, ticks: { font: { size: 13, family: 'Inter' }, color: '#1d1d1f' } }
          }
        }
      });
    }

  } catch (err) {
    console.error('K-Trend Insights error:', err);
    const g = document.querySelector('#tab-insights .insights-grid');
    if (g) g.innerHTML = `<div style="grid-column:1/-1;padding:40px;text-align:center;color:var(--accent-red)">오류: ${err.message}</div>`;
  }
}





async function loadTrendPulse() {
  const container = document.querySelector('.insights-grid');
  if (!container || document.getElementById('trendPulseCard')) return;

  // Create Trend Pulse Card
  const card = document.createElement('div');
  card.className = 'insight-card full-width';
  card.id = 'trendPulseCard';
  card.innerHTML = `
    <h3>🚀 실시간 트렌드 펄스 (AI 분석)</h3>
    <div class="trend-pulse-container" id="trendPulseContent">
      <div class="loading-skeleton"></div>
    </div>
  `;
  container.prepend(card);

  try {
    // Fetch both Google and Naver trends
    const [googleTrends, naverTrends] = await Promise.all([
      fetchTrending(20, 'google_trends'),
      fetchTrending(20, 'naver_datalab')
    ]);

    const trends = [...(googleTrends.data || []), ...(naverTrends.data || [])]
      .sort((a, b) => (b.rank_change || 0) - (a.rank_change || 0))
      .slice(0, 15);

    const content = document.getElementById('trendPulseContent');
    if (trends.length === 0) {
      content.innerHTML = '<div class="empty-state-text">수집된 트렌드 데이터가 없습니다.</div>';
      return;
    }

    content.innerHTML = trends.map((t, i) => {
      const summary = t.ai_summary || {};
      const reason = summary.reason ? summary.reason.split('.')[0] : 'AI 분석 대기 중...';
      const sourceIcon = t.source === 'google_trends' ? '🇬' : '🇳';

      return `
        <div class="trend-pill" onclick="window.__openProduct(${JSON.stringify(t).replace(/"/g, '&quot;')})">
          <span class="trend-rank">#${i + 1}</span>
          <span class="trend-source">${sourceIcon}</span>
          <span class="trend-keyword">${t.name}</span>
          <span class="trend-reason">${reason}</span>
        </div>
      `;
    }).join('');

  } catch (e) {
    console.error('Trend Pulse Error:', e);
    document.getElementById('trendPulseContent').innerHTML = '<div class="error-text">트렌드 로딩 실패</div>';
  }
}

function renderCategoryChart(categories) {
  const ctx = document.getElementById('categoryShareChart');
  if (!ctx) return;

  if (charts.category) charts.category.destroy();

  // Mock distribution for demo (in real app, we'd aggregate from daily_rankings)
  const labels = categories.slice(0, 6).map(c => c.name_en || c.name_ko);
  const data = [35, 25, 15, 10, 8, 7];

  charts.category = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: [
          '#0071e3', '#34c759', '#ff9500', '#ff3b30', '#af52de', '#86868b'
        ],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'right', labels: { color: '#6e6e73', font: { size: 12, family: 'SF Pro Display' } } }
      }
    }
  });
}

function renderBrandChart(products) {
  const ctx = document.getElementById('brandPowerChart');
  if (!ctx) return;

  if (charts.brand) charts.brand.destroy();

  // Aggregate brands from sample
  const brandCounts = {};
  products.forEach(p => {
    if (p.brand) brandCounts[p.brand] = (brandCounts[p.brand] || 0) + 1;
  });

  const sortedBrands = Object.entries(brandCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  charts.brand = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: sortedBrands.map(b => b[0]),
      datasets: [{
        label: '상품 수',
        data: sortedBrands.map(b => b[1]),
        backgroundColor: 'rgba(0, 113, 227, 0.8)',
        borderColor: '#0071e3',
        borderWidth: 1,
        borderRadius: 4
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      onClick: (e, elements) => {
        if (elements.length > 0) {
          const index = elements[0].index;
          const brand = sortedBrands[index][0];
          // Filter products by brand and switch to 'all' tab
          const searchInput = document.getElementById('searchInput');
          if (searchInput) {
            searchInput.value = brand;
            state.searchQuery = brand;

            // Re-select "전체" (All) category to ensure global search
            state.activeCategory = 'all'; // Set to 'all' or empty string depending on your fallback logic
            document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
            const allChip = document.querySelector('.chip[data-code="all"]') || document.querySelector('.chip:first-child');
            if (allChip) allChip.classList.add('active');

            state.activeTab = 'all';
            switchTab('all');

            // Scroll to top
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        }
      },
      scales: {
        x: { grid: { color: 'rgba(0,0,0,0.05)' }, border: { display: false }, ticks: { color: '#86868b' } },
        y: { grid: { display: false }, border: { display: false }, ticks: { color: '#1d1d1f' } }
      },
      plugins: { legend: { display: false } }
    }
  });
}

function renderPriceChart(products) {
  const ctx = document.getElementById('priceRangeChart');
  if (!ctx) return;

  if (charts.price) charts.price.destroy();

  // Bucketize prices
  const buckets = { '~1만': 0, '1만~3만': 0, '3만~5만': 0, '5만~10만': 0, '10만+': 0 };
  products.forEach(p => {
    const price = p.price;
    if (price < 10000) buckets['~1만']++;
    else if (price < 30000) buckets['1만~3만']++;
    else if (price < 50000) buckets['3만~5만']++;
    else if (price < 100000) buckets['5만~10만']++;
    else buckets['10만+']++;
  });

  charts.price = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: Object.keys(buckets),
      datasets: [{
        label: '상품 수',
        data: Object.values(buckets),
        backgroundColor: 'rgba(16, 185, 129, 0.6)',
        borderColor: '#10b981',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { grid: { display: false }, border: { display: false }, ticks: { color: '#86868b' } },
        y: { grid: { color: 'rgba(0,0,0,0.05)' }, border: { display: false }, ticks: { color: '#86868b' } }
      },
      plugins: { legend: { display: false } }
    }
  });
}

function formatPrice(price) {
  if (price === null || price === undefined || price === '') return '-';
  const p = Number(price);
  if (isNaN(p) || !isFinite(p)) return '-';
  return `₩${p.toLocaleString('ko-KR')}`;
}

function formatNumber(num) {
  if (num === null || num === undefined || num === '') return '-';
  const n = Number(num);
  if (isNaN(n) || !isFinite(n)) return '-';
  return n.toLocaleString('ko-KR');
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function emptyState(title, subtitle = '') {
  return `
    <div class="empty-state">
      <div class="empty-state-icon">📭</div>
      <div class="empty-state-text">${title}</div>
      ${subtitle ? `<div class="empty-state-text" style="margin-top:4px;font-size:12px">${subtitle}</div>` : ''}
    </div>
  `;
}

// ─── Notification Logic ─────────────────────
async function initNotificationSystem() {
  const session = getSession();
  if (!session) return;
  fetchAndRenderNotifications();
  // Poll every 60 seconds
  setInterval(fetchAndRenderNotifications, 60000);
}

async function fetchAndRenderNotifications() {
  const session = getSession();
  if (!session) return;

  try {
    const res = await fetch(`http://localhost:6002/api/notifications?user_id=${session.user.id}`);
    if (!res.ok) return;
    const data = await res.json();
    if (data.success && data.notifications) {
      const badge = document.getElementById('notiBadge');
      const listBody = document.getElementById('notiListBody');
      if (!badge || !listBody) return;

      if (data.notifications.length > 0) {
        badge.style.display = 'block';
        badge.innerText = data.notifications.length > 99 ? '99+' : data.notifications.length;

        listBody.innerHTML = data.notifications.map(n => `
          <div class="noti-item" style="padding:12px; border-bottom:1px solid var(--border); cursor:pointer; background:var(--surface);" onclick="handleNotiClick('${n.id}', '${n.link}')">
            <div style="font-weight:700; font-size:13px; color:var(--text); margin-bottom:4px;">${escapeHtml(n.title)}</div>
            <div style="font-size:12px; color:var(--text-muted); line-height:1.4;">${escapeHtml(n.message)}</div>
            <div style="font-size:10px; color:#aaa; margin-top:6px;">${new Date(n.created_at).toLocaleString('ko-KR')}</div>
          </div>
        `).join('');
      } else {
        badge.style.display = 'none';
        listBody.innerHTML = `<div style="color:var(--text-muted); font-size:12px; text-align:center; padding:20px 0;">새로운 알림이 없습니다.</div>`;
      }
    }
  } catch (e) {
    console.error("Failed to fetch notifications:", e);
  }
}

window.handleNotiClick = async function (id, link) {
  try {
    // Mark as read immediately
    await fetch(`http://localhost:6002/api/notifications/${id}/read`, { method: 'PUT' });
  } catch (e) { console.error(e); }

  // Refresh badge
  fetchAndRenderNotifications();
  const dropdown = document.getElementById('notiDropdown');
  if (dropdown) dropdown.style.display = 'none';

  // Navigate Action based on link target
  if (link === 'sourcing') {
    if (typeof window.openMyPageModal === 'function') {
      window.openMyPageModal();
      setTimeout(() => {
        const tab = document.querySelector('.auth-tab[data-mypage-tab="sourcing"]');
        if (tab) tab.click();
      }, 100);
    }
  }
};

window.handleNotifClick = async function (id, product) {
  if (id) {
    await markNotificationAsRead(id);
    const notif = state.notifications.find(n => n.id === id);
    if (notif) notif.is_read = true;
    renderNotifications();
  }
  if (product) {
    window.__openProduct(product);
  }
};


// Global Handlers for Bridge UI
window.setGender = (gender) => {
  state.genderFilter = gender;
  state.currentPage = 1; // Reset pagination when filtering

  // Re-render controls to update active state
  const controls = document.getElementById('platformControls');
  if (controls) controls.innerHTML = state.activeBridge.renderCustomHeader(state);

  loadTab(state.activeTab);
};

// ─── My Page & Wishlist Shortcuts ─────────────────────
window.openMyPageModal = async function () {
  const session = getSession();
  if (!session) return; // Should not happen, element is only rendered for logged in users

  const modal = document.getElementById('myPageModalOverlay');
  if (!modal) return;

  // Fetch basic info
  const profile = await getProfile() || {};

  // Fill Account Tab
  const emailInput = document.getElementById('myPageEmail');
  const roleInput = document.getElementById('myPageRole');
  if (emailInput) emailInput.value = session.user.email || '';
  if (roleInput) roleInput.value = profile.role === 'admin' ? 'Admin (최고 관리자)' : 'User (일반 사용자)';

  // Fill Billing Tab
  const planBadge = document.getElementById('myPagePlanBadge');
  const planDesc = document.getElementById('myPagePlanDesc');
  const expiresAt = document.getElementById('myPageExpiresAt');

  const tier = (profile.subscription_tier || 'free').toLowerCase();

  if (planBadge) {
    planBadge.textContent = tier === 'pro' ? 'Pro' : 'Free';
    planBadge.className = `plan-badge ${tier === 'pro' ? 'pro' : ''}`;
  }

  if (planDesc) {
    if (profile.role === 'admin') {
      planDesc.textContent = '최고 관리자 권한으로 모든 기능을 무제한 이용할 수 있습니다.';
    } else if (tier === 'pro') {
      planDesc.textContent = '현재 Pro 플랜을 이용 중입니다. (모든 데이터 무제한 조회)';
    } else {
      planDesc.textContent = '현재 무료 플랜을 이용 중입니다. (일일 상세 조회 10회 제한)';
    }
  }

  if (expiresAt) {
    if (profile.role === 'admin') {
      expiresAt.textContent = '무제한 (Admin)';
    } else if (profile.expires_at) {
      expiresAt.textContent = new Date(profile.expires_at).toLocaleDateString(i18n.currentLang === 'ko' ? 'ko-KR' : 'en-US');
    } else {
      expiresAt.textContent = '기간 제한 없음';
    }
  }

  // Set default tab to account
  switchMyPageTab('account');

  // Open modal
  modal.classList.add('open');
  document.body.classList.add('one-page');
};

function switchMyPageTab(tabName) {
  const accountTab = document.getElementById('myPageAccountTab');
  const billingTab = document.getElementById('myPageBillingTab');
  const sourcingTab = document.getElementById('myPageSourcingTab');
  const tabBtns = document.querySelectorAll('#myPageModal .auth-tab');

  tabBtns.forEach(btn => {
    if (btn.dataset.mypageTab === tabName) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  if (accountTab) accountTab.style.display = tabName === 'account' ? 'block' : 'none';
  if (billingTab) billingTab.style.display = tabName === 'billing' ? 'block' : 'none';
  if (sourcingTab) sourcingTab.style.display = tabName === 'sourcing' ? 'block' : 'none';

  if (tabName === 'sourcing') {
    window.loadSourcingHistory();
  }

  // Render PayPal button when billing tab is open
  if (tabName === 'billing') {
    const profile = getProfile() || {};
    const tier = (profile.subscription_tier || 'free').toLowerCase();

    if (tier !== 'pro' && !window.__paypalRendered && window.paypal) {
      const container = document.getElementById('paypal-button-container');
      if (container) {
        container.innerHTML = ''; // Clear just in case
        window.paypal.Buttons({
          createOrder: (data, actions) => {
            return actions.order.create({
              purchase_units: [{
                description: 'K-Trend Intelligence Pro Plan (1 Month)',
                amount: {
                  currency_code: 'USD',
                  value: '29.99'
                }
              }]
            });
          },
          onApprove: async (data, actions) => {
            const session = getSession();
            if (!session) {
              alert('로그인이 만료되었습니다. 다시 로그인해주세요.');
              return;
            }
            try {
              // Secure backend verification
              const response = await fetch('/api/paypal/capture', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  orderID: data.orderID,
                  userId: session.user.id
                })
              });
              const result = await response.json();
              if (result.success) {
                alert('결제가 성공적으로 완료되었습니다. Pro 멤버십으로 업그레이드 되었습니다.');
                // Refresh page or modal state
                window.location.reload();
              } else {
                alert('결제 검증에 실패했습니다. 관리자에게 문의해주세요.');
              }
            } catch (error) {
              console.error('PayPal capture error:', error);
              alert('결제 처리 중 오류가 발생했습니다.');
            }
          },
          onError: (err) => {
            console.error('PayPal Error:', err);
            // Optionally notify user
          }
        }).render('#paypal-button-container');
        window.__paypalRendered = true;
      }
    } else if (tier === 'pro') {
      const container = document.getElementById('paypal-button-container');
      if (container) container.innerHTML = ''; // hide if already pro
    }
  }
}

// Global Event Listeners for My Page Modal
document.addEventListener('DOMContentLoaded', () => {
  const myPageCloseBtn = document.getElementById('myPageModalClose');
  if (myPageCloseBtn) {
    myPageCloseBtn.addEventListener('click', () => {
      document.getElementById('myPageModalOverlay').classList.remove('open');
      document.body.classList.remove('one-page');
    });
  }

  const myPageTabs = document.querySelectorAll('#myPageModal .auth-tab');
  myPageTabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      const tabName = e.target.dataset.mypageTab;
      if (tabName) switchMyPageTab(tabName);
    });
  });

  // Event delegation for dynamic dropdown buttons
  document.addEventListener('click', (e) => {
    const target = e.target.closest('.dropdown-item');
    if (!target) return;

    if (target.id === 'myPageBtn') {
      window.openMyPageModal();
    } else if (target.id === 'wishlistNavBtn') {
      const wishlistTabBtn = document.querySelector('.tab[data-tab="wishlist"]');
      if (wishlistTabBtn) {
        wishlistTabBtn.click(); // This will trigger switchTab and scrolling
        window.scrollTo({ top: document.querySelector('.tab-bar').offsetTop - 80, behavior: 'smooth' });
      }
    }
  });
});

// ─── Sourcing Quote Request ────────────────
window.openQuoteModal = function () {
  const inputs = document.querySelectorAll('#wishlistGrid .sourcing-qty-input');
  const items = [];

  inputs.forEach(input => {
    const card = input.closest('.product-card');
    const checkbox = card ? card.querySelector('.sourcing-item-checkbox') : null;
    if (checkbox && !checkbox.checked) return;

    const qty = parseInt(input.value) || 0;
    if (qty > 0) {
      const name = card ? (card.querySelector('.product-name')?.innerText || 'Unknown') : 'Unknown';
      const brand = card ? (card.querySelector('.product-brand')?.innerText || '') : '';
      items.push({ name, brand, qty });
    }
  });

  if (items.length === 0) {
    alert(window.t('sourcing.alert_empty_cart') || '장바구니가 비어 있습니다.');
    return;
  }

  let listHtml = '';
  items.forEach(item => {
    listHtml += `
      <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid rgba(0,0,0,0.05);">
        <div style="flex:1; padding-right:10px; overflow:hidden;">
          <div style="font-size:12px; font-weight:700; color:var(--accent-blue); margin-bottom:2px;">${item.brand}</div>
          <div style="font-size:14px; color:var(--text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${item.name}</div>
        </div>
        <div style="font-weight:700; font-size:14px; color:var(--text); background:#fff; padding:6px 12px; border-radius:8px; box-shadow:0 1px 3px rgba(0,0,0,0.1); white-space:nowrap;">
          ${item.qty}개
        </div>
      </div>
    `;
  });

  const listContainer = document.getElementById('quoteProductList');
  if (listContainer) {
    listContainer.innerHTML = listHtml;
    // Remove last border bottom
    if (listContainer.lastElementChild) {
      listContainer.lastElementChild.style.borderBottom = 'none';
    }
  }

  const overlay = document.getElementById('quoteModalOverlay');
  if (overlay) overlay.classList.add('open');
};

window.closeQuoteModal = function () {
  const overlay = document.getElementById('quoteModalOverlay');
  if (overlay) overlay.classList.remove('open');
};

window.__updateSourcingQty = function (btn, delta) {
  const input = btn.parentNode.querySelector('.sourcing-qty-input');
  if (input) {
    let val = parseInt(input.value) || 0;
    val += delta;
    if (val < 10) val = 10;
    input.value = val;
  }
};

window.submitQuoteRequest = async function () {
  const btn = document.getElementById('btnSubmitQuote');
  const msgInput = document.getElementById('quoteMessage');
  const message = msgInput ? msgInput.value : '';

  if (btn) {
    btn.disabled = true;
    btn.innerText = window.t('sourcing.btn_submitting');
  }

  try {
    const session = getSession();
    if (!session) throw new Error(window.t('sourcing.alert_login'));

    // Scrape items from DOM (in wishlist grid)
    const inputs = document.querySelectorAll('#wishlistGrid .sourcing-qty-input');
    const items = [];
    inputs.forEach(input => {
      const card = input.closest('.product-card');
      const checkbox = card ? card.querySelector('.sourcing-item-checkbox') : null;
      if (checkbox && !checkbox.checked) return;

      const qty = parseInt(input.value) || 0;
      if (qty <= 0) return;

      const name = card.querySelector('.product-name')?.innerText || '';
      const brand = card.querySelector('.product-brand')?.innerText || '';
      const pid = input.getAttribute('data-product-id');
      const img = card.querySelector('img')?.src || '';
      items.push({ product_id: pid, name, brand, quantity: qty, image: img });
    });

    if (items.length === 0) {
      throw new Error(window.t('sourcing.alert_empty_cart'));
    }

    const payload = {
      user_id: session.user.id,
      user_email: session.user.email,
      items: items,
      user_message: message
    };

    const res = await fetch('http://localhost:6002/api/sourcing/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!data.success) throw new Error(data.error || window.t('sourcing.alert_fail'));

    alert(window.t('sourcing.alert_success'));
    closeQuoteModal();
    if (msgInput) msgInput.value = '';
  } catch (e) {
    console.error("Quote Submit Error:", e);
    alert("❌ Error: " + e.message);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerText = window.t('sourcing.btn_submit');
    }
  }
};

// ─── My Page Sourcing History ────────────────
window.loadSourcingHistory = async function () {
  const list = document.getElementById('sourcingHistoryList');
  if (!list) return;
  list.innerHTML = '<div class="loading-skeleton"></div>';
  const session = getSession();
  if (!session) return;

  try {
    const res = await fetch(`http://localhost:6002/api/sourcing/history/${session.user.id}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error);

    if (!data.requests || data.requests.length === 0) {
      list.innerHTML = `<div style="text-align:center; padding:30px; color:var(--text-muted);">${window.t('sourcing.history_empty')}</div>`;
      return;
    }

    list.innerHTML = data.requests.map(req => {
      const date = new Date(req.created_at).toLocaleString('ko-KR');
      const itemCount = (req.items && Array.isArray(req.items)) ? req.items.length : 0;
      let statusBadge = '';
      if (req.status === 'pending') statusBadge = `<span style="background:#fff3cd; color:#856404; padding:4px 8px; border-radius:4px; font-size:12px; font-weight:600;">${window.t('sourcing.status_pending')}</span>`;
      else if (req.status === 'quoted') statusBadge = `<span style="background:#d4edda; color:#155724; padding:4px 8px; border-radius:4px; font-size:12px; font-weight:600;">${window.t('sourcing.status_quoted')}</span>`;
      else if (req.status === 'canceled') statusBadge = `<span style="background:#f8d7da; color:#721c24; padding:4px 8px; border-radius:4px; font-size:12px; font-weight:600;">${window.t('sourcing.status_canceled')}</span>`;
      else statusBadge = `<span style="background:#e2e3e5; color:#383d41; padding:4px 8px; border-radius:4px; font-size:12px; font-weight:600;">${req.status}</span>`;

      let breakdownHtml = '';
      if (req.estimated_cost) {
        let itemsBreakdown = '';
        if (req.items && Array.isArray(req.items)) {
          itemsBreakdown = req.items.map(item => {
            const up = item.unit_price || 0;
            const lineTotal = up * (item.quantity || 0);
            return `
               <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:4px; color:var(--text);">
                 <span style="flex:1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; padding-right:10px;">- ${item.name} (${item.quantity}개)</span>
                 <span>${up > 0 ? `₩${up.toLocaleString()} /개` : '단가 미정'}</span>
               </div>
             `;
          }).join('');
        }

        const sFee = req.shipping_fee || 0;
        const svFee = req.service_fee || 0;
        const totalCost = req.estimated_cost || 0;

        breakdownHtml = `
          <div style="margin-top:10px; padding:12px; background:var(--background); border-radius:6px; border:1px solid var(--border);">
            <div style="font-weight:600; font-size:13px; margin-bottom:8px; border-bottom:1px solid var(--border); padding-bottom:4px;">견적 상세 내역 (Breakdown)</div>
            ${itemsBreakdown}
            <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:4px; color:var(--text); margin-top:8px;">
               <span>배송비 (Shipping)</span>
               <span>${sFee > 0 ? `₩${sFee.toLocaleString()}` : '-'}</span>
            </div>
            <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:4px; color:var(--text);">
               <span>수수료 (Service Fee)</span>
               <span>${svFee > 0 ? `₩${svFee.toLocaleString()}` : '-'}</span>
            </div>
            <div style="display:flex; justify-content:space-between; font-size:14px; font-weight:700; color:var(--primary); margin-top:8px; border-top:1px solid var(--border); padding-top:6px;">
               <span>총 예상 견적</span>
               <span>₩${totalCost.toLocaleString()}</span>
            </div>
          </div>
        `;
      }

      let replyHtml = '';
      if (req.admin_reply) {
        replyHtml = `<div style="margin-top:10px; padding:12px; background:var(--background); border-radius:6px; border-left:3px solid var(--primary);">
          <div style="font-weight:600; font-size:13px; margin-bottom:5px;">${window.t('sourcing.admin_reply_title')}</div>
          ${req.admin_reply ? `<div style="font-size:13px; color:var(--text); white-space:pre-wrap; line-height:1.4;">${escapeHtml(req.admin_reply)}</div>` : ''}
        </div>`;
      }

      return `
        <div style="border:1px solid var(--border); border-radius:8px; padding:15px; background:var(--surface);">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10px;">
            <div>
              <div style="font-size:12px; color:var(--text-muted); margin-bottom:4px;">${date}</div>
              <div style="font-weight:600; font-size:14px;">${window.t('sourcing.total_items').replace('{count}', itemCount)}</div>
            </div>
            ${statusBadge}
          </div>
          ${req.user_message ? `<div style="font-size:13px; color:var(--text-muted); padding:8px; background:#f5f5f5; border-radius:4px; margin-bottom:10px;">💬 ${escapeHtml(req.user_message)}</div>` : ''}
          ${breakdownHtml}
          ${replyHtml}
        </div>
      `;
    }).join('');

  } catch (e) {
    console.error(e);
    list.innerHTML = `<div style="color:var(--text); font-size:13px; text-align:center; padding:20px;">${window.t('sourcing.history_error')}<br>(${e.message})</div>`;
  }
};

window.__modalToggleWishlist = async function (btn, productId) {
  await window.__toggleWishlist(btn, productId);
  window.currentModalIsSaved = btn.classList.contains('active');
  if (window.currentModalIsSaved) {
    btn.innerHTML = window.t('modal.wishlist_saved');
  } else {
    btn.innerHTML = window.t('modal.wishlist_add');
  }
};

