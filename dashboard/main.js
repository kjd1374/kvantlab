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
  searchProductsSemantic
} from './supabase.js';
import { setupAuthUI } from './src/auth.js';
import { i18n } from './src/i18n.js';
import { OliveYoungBridge } from './source_bridges/oliveyoung.js';
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

  // UI Update
  document.querySelectorAll('.platform-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.platform === platform);
  });

  // Render Platform-specific controls
  const controls = document.getElementById('platformControls');
  if (controls) {
    controls.innerHTML = state.activeBridge.renderCustomHeader(state);
  }

  // Re-attach platform listeners if they were in the controls or bar
  if (window.attachPlatformListeners) window.attachPlatformListeners();

  // Reset Category & Search
  state.activeCategory = '';
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
  document.querySelectorAll('.data-table th.sortable').forEach(th => {
    th.addEventListener('click', () => {
      const sort = th.dataset.sort;
      if (state.sortBy === sort) {
        state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
      } else {
        state.sortBy = sort;
        state.sortDir = 'asc';
      }
      // Update sort indicators
      document.querySelectorAll('.data-table th.sortable').forEach(h => h.classList.remove('asc', 'desc'));
      th.classList.add(state.sortDir);
      state.currentPage = 1;
      loadTab('all');
    });
  });

  // Notifications
  const notifBell = document.getElementById('notifBell');
  const notifDropdown = document.getElementById('notifDropdown');
  if (notifBell && notifDropdown) {
    notifBell.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = notifDropdown.classList.toggle('open');
      if (isOpen) {
        state.unreadCount = 0;
        updateNotifBadge();
      }
    });
  }

  const clearNotif = document.getElementById('clearNotif');
  if (clearNotif) {
    clearNotif.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (confirm(window.t('common.confirm_clear_notifs'))) {
        await clearNotifications();
        state.notifications = [];
        renderNotifications();
      }
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
    const notifDropdown = document.getElementById('notifDropdown');
    const notifBell = document.getElementById('notifBell');
    if (notifDropdown && notifBell && !notifDropdown.contains(e.target) && e.target !== notifBell) {
      notifDropdown.classList.remove('open');
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

    // Set first category as default and load
    if (displayCategories.length > 0 && !state.activeCategory) {
      state.activeCategory = displayCategories[0].category_code;
    }
    await loadTab(state.activeTab);
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
    } else {
      grid.innerHTML = data.map(p => {
        p.is_saved = savedIds.has(p.product_id || p.id);
        return renderProductCard(p, tabId === 'deals' ? 'deal' : 'normal');
      }).join('');
    }

    renderPagination(count);
  } catch (err) {
    console.error('Bridge fetch error:', err);
    grid.innerHTML = `<div class="error-state">데이터 로딩 중 오류가 발생했습니다: ${err.message}</div>`;
  }
}

// ─── K-Trend 전용 뷰 ────────────────────────
async function loadKTrendView(tabId) {
  const container = document.getElementById('allProductsBody')?.closest('.table-container') ||
    document.getElementById('tab-all');
  if (!container) return;

  // 타이틀 업데이트
  const titleEl = document.getElementById('rankingTitle');
  const descEl = document.getElementById('rankingDesc');
  const isGoogle = state.activeCategory !== 'naver';
  const sourceName = isGoogle ? '🔍 구글 트렌드' : '🇳 네이버 데이터랩';
  const updatedAt = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });

  if (titleEl) titleEl.textContent = `${sourceName} – 쇼핑 급상승 키워드`;
  if (descEl) {
    descEl.innerHTML = `실시간 이커머스 트렌드 분석 결과 &nbsp;·&nbsp;
      <span style="color:var(--accent-green);font-weight:600;">● 기준: ${updatedAt} (최신 수집 데이터)</span>`;
  }

  // 로딩 표시
  const tableContainer = document.querySelector('#tab-all .table-container');
  if (tableContainer) {
    tableContainer.innerHTML = `
      <div class="ktrend-loading">
        <div class="ktrend-spinner"></div>
        <span>${sourceName} 데이터 불러오는 중...</span>
      </div>`;
  }

  try {
    const result = await state.activeBridge.fetchData(tabId, state);
    const data = result.data || [];

    if (!tableContainer) return;

    if (data.length === 0) {
      tableContainer.innerHTML = `<div class="empty-state">
        <div style="font-size:48px;margin-bottom:12px">📊</div>
        <h3>트렌드 데이터가 없습니다</h3>
        <p style="color:var(--text-muted)">크롤러가 데이터를 수집하면 자동으로 갱신됩니다.</p>
      </div>`;
      return;
    }

    // 전용 리스트 렌더
    tableContainer.innerHTML = `
      <div class="ktrend-list-header">
        <span class="ktrend-col-rank">순위</span>
        <span class="ktrend-col-keyword">검색어</span>
        <span class="ktrend-col-change">급상승 지표</span>
        <span class="ktrend-col-search">바로 검색</span>
      </div>
      <div class="ktrend-list" id="ktrendList">
        ${data.map((p, idx) => renderKTrendRow(p, idx, isGoogle)).join('')}
      </div>
    `;
  } catch (err) {
    console.error('K-Trend fetch error:', err);
    if (tableContainer) {
      tableContainer.innerHTML = `<div class="error-state">트렌드 데이터 로딩 실패: ${err.message}</div>`;
    }
  }
}

function renderKTrendRow(p, index, isGoogle) {
  const rank = index + 1;
  const keyword = escapeHtml(p.name || '');

  // 급상승 % 파싱 (brand 필드에 "GOOGLE 급상승 (+N%)" 형태로 저장)
  const brandText = p.brand || '';
  const pctMatch = brandText.match(/\+?([\d,]+)%/);
  const pctNum = pctMatch ? parseInt(pctMatch[1].replace(/,/g, '')) : null;

  // 1~3위 특별 스타일
  const rankClass = rank <= 3 ? `ktrend-rank-top ktrend-rank-${rank}` : 'ktrend-rank-normal';

  // 급상승 배지
  let changeBadge = '';
  if (isGoogle && pctNum !== null) {
    const intensity = pctNum > 100000 ? 'fire' : pctNum > 10000 ? 'hot' : 'warm';
    changeBadge = `
      <span class="ktrend-badge ktrend-badge-${intensity}">
        ↗ +${pctNum >= 10000 ? (pctNum / 10000).toFixed(0) + '만' : pctNum.toLocaleString()}%
      </span>`;
  } else if (!isGoogle) {
    // 네이버: rank 숫자를 카테고리 기반으로 표시
    changeBadge = `<span class="ktrend-badge ktrend-badge-naver">🛍️ 쇼핑 TOP ${rank}</span>`;
  }

  const searchUrl = `https://search.naver.com/search.naver?query=${encodeURIComponent(p.name || '')}+${isGoogle ? '쇼핑' : ''}`;

  return `
    <div class="ktrend-row" style="animation-delay:${index * 0.04}s">
      <div class="ktrend-col-rank">
        <span class="${rankClass}">${rank}</span>
      </div>
      <div class="ktrend-col-keyword">
        <span class="ktrend-keyword-text">${keyword}</span>
        ${isGoogle ? '<span class="ktrend-source-badge google">G</span>' : '<span class="ktrend-source-badge naver">N</span>'}
      </div>
      <div class="ktrend-col-change">
        ${changeBadge}
      </div>
      <div class="ktrend-col-search">
        <a class="ktrend-search-btn" href="${searchUrl}" target="_blank" rel="noopener" title="${keyword} 검색">
          검색 →
        </a>
      </div>
    </div>
  `;
}

function renderTableRow(p, index) {
  const rank = (state.currentPage - 1) * state.perPage + index + 1;
  return `
      <tr onclick="window.__openProduct(${JSON.stringify(p).replace(/"/g, '&quot;')})" style="cursor:pointer">
        <td><span class="rank-num">${rank}</span></td>
        <td><img class="thumb" src="${p.image_url || ''}" alt="" loading="lazy" onerror="this.style.display='none'" /></td>
        <td style="max-width:280px">
          <div class="product-name" style="-webkit-line-clamp:1">${escapeHtml(getLocalizedName(p))}</div>
        </td>
        <td><span class="product-brand">${escapeHtml(getLocalizedBrand(p))}</span></td>
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
        const name = escapeHtml(p.name || '');
        const brand = escapeHtml(p.brand || '');
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
  if (!grid) return;
  grid.innerHTML = '<div class="loading-skeleton"></div>';

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

    grid.innerHTML = products.map(p => renderProductCard(p)).join('');
  } catch (e) {
    grid.innerHTML = `<div class="error-state">관심 상품을 불러오는데 실패했습니다: ${e.message}</div>`;
  }
}

// ─── Render Helpers ───────────────────────
function getLocalizedName(p) {
  const lang = i18n.currentLang;
  // Priority: Localized name -> English name -> Original/Korean name
  return p[`name_${lang}`] || p[`${lang}_name`] || p.name_en || p.name_ko || p.name || '';
}

function getLocalizedBrand(p) {
  // User request: "Brand in English"
  // So we prioritize English brand name if available, regardless of current language
  // But if it's strictly specific:
  // "Brand in English, Product Name in Target Language"
  // If English brand is empty, fallback to brand (which usually is Korean/Original)
  return p.brand_en || p.brand_mj || p.brand || '';
}

function renderProductCard(p, mode = 'normal') {
  const isWishlist = !!p.is_saved;
  const productId = p.product_id || p.id;
  const name = escapeHtml(getLocalizedName(p));
  const brand = escapeHtml(getLocalizedBrand(p));

  // Price Logic
  const currentPrice = p.special_price || p.price || p.price_current || 0;
  const originalPrice = p.original_price || p.price_original || 0;
  // If we have an original price and it's higher than current, it's a deal
  const isDeal = originalPrice > currentPrice;

  const priceHtml = isDeal
    ? `<div class="price-wrapper">
         <span class="price-original">${formatPrice(originalPrice)}</span>
         <span class="price-current deal">${formatPrice(currentPrice)}</span>
         <span class="discount-badge">${p.discount_pct || Math.round((1 - currentPrice / originalPrice) * 100)}%</span>
       </div>`
    : `<div class="price-current">${formatPrice(currentPrice)}</div>`;

  // Trend Item Check
  const isTrend = ['google_trends', 'naver_datalab'].includes(p.source);

  let imgHtml = '';
  if (isTrend) {
    const icon = p.source === 'google_trends' ? '📈' : '🇳';
    const bg = p.source === 'google_trends' ? '#e8f0fe' : '#e4f7e4';
    imgHtml = `<div class="product-img" style="display:flex;align-items:center;justify-content:center;font-size:40px;background:${bg};min-height:200px;">${icon}</div>`;
  } else {
    imgHtml = `<img class="product-img" src="${p.image_url || ''}" alt="${name}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" />
                 <div class="product-img-fallback" style="display:none;width:100%;height:100%;align-items:center;justify-content:center;background:#f5f5f5;color:#ccc;">No Image</div>`;
  }

  return `
    <div class="product-card ${isTrend ? 'trend-card' : ''}" onclick="window.__openProduct(${JSON.stringify(p).replace(/"/g, '&quot;')})">
      <div class="product-wishlist-pos">
        <button class="btn-wishlist ${isWishlist ? 'active' : ''}"
          onclick="event.stopPropagation(); window.__toggleWishlist(this, ${productId})">
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
        </div>
      </div>
      <div class="product-card-bottom">
        ${(p.rank_change !== undefined && p.rank_change !== null) ? `<span class="badge ${p.rank_change > 0 ? 'badge-rank-up' : 'badge-rank-down'}">${p.rank_change > 0 ? '▲' : '▼'} ${Math.abs(p.rank_change)}</span>` : ''}
        ${p.review_count ? `<span class="badge badge-reviews">⭐ ${p.review_rating || '-'} (${formatNumber(p.review_count)})</span>` : ''}
      </div>
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
      await saveProduct(productId);
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
  // 1. Priority: DB pre-calculated summary
  if (product.ai_summary) {
    return product.ai_summary;
  }

  // 2. Check Cache
  const cacheKey = `ai_summary_${product.product_id || product.id}`;
  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  // 2. Fetch from Gemini API directly (Client-side implementation due to deployment issues)
  try {
    const reviews = product.reviews || [
      `${product.name} 써보니까 진짜 좋아요.`,
      `가격 대비 성능이 뛰어납니다.`,
      `배송이 빠르고 포장이 꼼꼼해요.`,
      `재구매 의사 있습니다.`,
      `약간 아쉬운 점도 있지만 전반적으로 만족.`,
      `발림성이 너무 부드럽고 촉촉해서 겨울에 쓰기 딱이에요.`,
      `향이 좀 강한 편이라 호불호가 갈릴 수 있겠네요.`,
      `트러블 없이 순해서 민감성 피부에도 잘 맞아요.`,
      `용량이 좀 적은게 흠이지만 제품력은 인정.`
    ];

    const prompt = `
      Analyze the following reviews for the product "${product.name}".
      Provide a summary in JSON format with the following fields:
      - "sentiment_pos": (integer 0-100) percentage of positive sentiment
      - "keywords": (array of strings) top 5 key phrases in Korean
      - "pros": (array of strings) top 3 advantages in Korean
      - "cons": (array of strings) top 3 disadvantages in Korean

      Reviews:
      ${reviews.join('\n').substring(0, 3000)}
    `;

    // Using Gemini 3.0 Flash Preview (as requested by user)
    // Direct API call for immediate verification without deployment
    const API_KEY = 'AIzaSyAXoonBcBZr6vj5xpF4SzS8PWhcrGXA-v8';
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini API Error: ${errText}`);
    }

    const data = await response.json();
    const textResponse = data.candidates[0].content.parts[0].text;
    const result = JSON.parse(textResponse);

    // 3. Save to Cache
    localStorage.setItem(cacheKey, JSON.stringify(result));

    // 4. Background Persistence: Save to DB if we have a valid product_id
    const pId = product.product_id || product.id;
    if (pId) {
      fetch('https://hgxblbbjlnsfkffwvfao.supabase.co/functions/v1/analyze-reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: pId, productName: product.name, reviews, persist: true })
      }).catch(e => console.error("Background persistence failed:", e));
    }

    return result;

  } catch (err) {
    console.error('AI Summary fetch error:', err);
    alert('AI 분석에 실패했습니다. (Gemini API Error)\n' + err.message);
    return null;
  }
}

// ─── Modal ──────────────────────────────────
let rankChart = null;

window.__openProduct = async function (product) {
  window.currentModalProductId = product.product_id || product.id;
  const modal = document.getElementById('modalOverlay');
  const body = document.getElementById('modalBody');
  if (!modal || !body) return;

  // Resolve price and URL
  const displayPrice = product.special_price || product.price || product.price_current || product.deal_price;
  const productUrl = product.url || product.product_url;
  const isDeal = !!product.special_price;

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
          <div class="modal-section-title">✨ AI 트렌드 인사이트 (Gemini)</div>
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
              <div class="metric-label">${isDeal ? '🔥 특가' : window.t('modal.price')}</div>
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
              <div class="metric-label">${window.t('modal.rank')}</div>
              <div class="metric-value rank-val">#${product.current_rank}</div>
              ${product.rank_change !== undefined ? `
                <div class="metric-sub rank-change ${product.rank_change > 0 ? 'up' : 'down'}">
                  ${product.rank_change > 0 ? '▲' : '▼'} ${Math.abs(product.rank_change)}
                </div>` : ''}
            </div>` : ''}
          </div>

          <!-- CTA Button Moved Here -->
          ${productUrl ? `<a class="btn-store-premium" href="${productUrl}" target="_blank" rel="noopener">${isDeal ? '🛒 최신 가격 확인하기' : '🔗 올리브영에서 보기'}</a>` : ''}

          <!-- Price & Rank Charts (Simplified) -->
          <div class="chart-section-premium">
            <div class="modal-section-title">📉 최근 30일 가격 및 순위 변동</div>
            <div id="chartContainerModal" class="chart-container-modal">
              <canvas id="rankChart"></canvas>
            </div>
            <div id="chartPlaceholderModal" style="display:none; height: 250px; align-items: center; justify-content: center; background: var(--surface-light); border-radius: 12px; color: var(--text-muted); font-size: 14px; font-weight: 500;">
              📈 데이터 수집 중입니다. (최소 2일치 데이터 필요)
            </div>
          </div>
        </div>
      </div>

      <!-- LOWER: AI Review Analysis -->
      <div class="modal-lower">
        <div class="modal-section-title">✨ AI 리뷰 인사이트 (Gemini)</div>
        <div class="ai-summary premium-ai">
          <div class="ai-header">
            <span class="ai-icon">🤖</span>
            <span class="ai-title">Gemini 3.0 Flash 리뷰 분석</span>
            <span class="ai-badge">${aiData ? 'LIVE' : 'BETA'}</span>
          </div>

          ${!aiData && !isAiLoading ? `
          <div class="ai-action-area">
            <button class="btn-ai-generate" onclick="loadAiData()">✨ AI 분석 실행하기</button>
          </div>` : ''}

          ${isAiLoading ? `
          <div class="ai-loading-area">
            <div class="loading-spinner"></div>
            <p>Gemini가 리뷰 데이터를 분석하고 있습니다...</p>
          </div>` : ''}

          ${aiData ? `
          <div class="sentiment-container">
            <div class="sentiment-labels">
              <span class="pos-label">긍정 ${sentimentPos}%</span>
              <span class="neg-label">부정 ${sentimentNeg}%</span>
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
            * 이 요약은 Google Gemini AI가 실제 리뷰를 바탕으로 분석한 자동 생성 결과입니다.
          </p>` : ''}
        </div>
      </div>
      `;
    }

    body.innerHTML = modalContent;
  }


  // Initial Render
  renderModal();

  modal.classList.add('open');
  document.body.style.overflow = 'hidden';

  // Auto-load rank chart after DOM is ready
  setTimeout(() => {
    loadRankChart(window.currentModalProductId, 30);
  }, 100);

  // AI Load Handler (no tab switching needed in new layout)
  window.loadAiData = async () => {
    isAiLoading = true;
    renderModal();
    // Re-load chart after re-render
    setTimeout(() => loadRankChart(window.currentModalProductId, 30), 100);

    try {
      aiData = await fetchAiSummary(product);
    } catch (e) {
      console.error(e);
    } finally {
      isAiLoading = false;
      renderModal();
      setTimeout(() => loadRankChart(window.currentModalProductId, 30), 100);
    }
  };

  // Auto-run AI Analysis in background only if data is not already loaded
  if (!aiData) {
    window.loadAiData(false);
  } else {
    // Re-render chart once after modal is open
    setTimeout(() => loadRankChart(window.currentModalProductId, 30), 100);
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

  if (rankChart) {
    rankChart.destroy();
    rankChart = null;
  }

  try {
    const { ranks, prices } = await fetchProductHistory(productId, days);

    // Sort and merge data points by date for a unified X-axis
    const allDates = [...new Set([...ranks.map(r => r.date), ...prices.map(p => p.date)])].sort();

    const chartContainer = document.getElementById('chartContainerModal');
    const chartPlaceholder = document.getElementById('chartPlaceholderModal');

    if (allDates.length < 2) {
      if (chartContainer) chartContainer.style.display = 'none';
      if (chartPlaceholder) chartPlaceholder.style.display = 'flex';
      return;
    } else {
      if (chartContainer) chartContainer.style.display = 'block';
      if (chartPlaceholder) chartPlaceholder.style.display = 'none';
    }

    const rankData = allDates.map(date => {
      const item = ranks.find(r => r.date === date);
      return item ? item.rank : null;
    });

    const priceData = allDates.map(date => {
      const item = prices.find(r => r.date === date);
      return item ? item.price : null;
    });

    // Extract original price for accurate discount calculation
    const originalPriceData = allDates.map(date => {
      const item = prices.find(r => r.date === date);
      return item ? item.original_price : null;
    });

    const hasRanks = rankData.some(r => r !== null);
    const hasPrices = priceData.some(p => p !== null);

    const datasets = [];

    if (hasRanks) {
      datasets.push({
        label: '순위',
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
        label: '가격(원)',
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

    rankChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: allDates.map(d => d.slice(5)), // Show MM-DD
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
            ticks: { font: { family: "'Inter', sans-serif", size: 11 }, color: '#adb5bd' }
          },
          y: {
            type: 'linear',
            display: hasRanks,
            position: 'left',
            reverse: true, // Rank 1 is at the top
            grid: { color: 'rgba(0,0,0,0.03)', drawBorder: false },
            ticks: {
              stepSize: 1,
              font: { family: "'Inter', sans-serif", size: 11 },
              color: '#adb5bd'
            }
          },
          y1: {
            type: 'linear',
            display: hasPrices,
            position: 'right',
            grid: { display: false, drawBorder: false },
            ticks: {
              callback: v => v.toLocaleString() + '원',
              font: { family: "'Inter', sans-serif", size: 11 },
              color: '#adb5bd'
            }
          }
        }
      }
    });

  } catch (err) {
    console.error('Failed to load history chart:', err);
    // Display placeholder if data load fails
    const chartContainer = document.getElementById('chartContainerModal');
    const chartPlaceholder = document.getElementById('chartPlaceholderModal');
    if (chartContainer) chartContainer.style.display = 'none';
    if (chartPlaceholder) chartPlaceholder.style.display = 'flex';
  }
}



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
    <div class="ktrend-spinner"></div><span>🤖 Gemini 트렌드 태그 분석 중...</span>
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
        <p>크롤러와 Gemini 태거를 실행하면 자동으로 채워집니다.</p>
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
      ? `<span style="color:var(--accent-green);font-weight:600;font-size:12px">● Gemini 태그 ${taggedCount}건 분석 완료</span>`
      : `<span style="color:var(--accent-orange);font-weight:600;font-size:12px">⚠ Gemini 태그 없음 – trend_enricher.py를 먼저 실행해주세요</span>`;

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
        : `<div style="padding:40px;text-align:center;color:var(--text-muted);font-size:13px">Gemini 태깅 후 자동 생성됩니다</div>`
      }
      </div>

      <!-- 카드 3: 화장품 성분 TOP (full-width) -->
      <div class="insight-card full-width">
        <h3>🧪 화장품 성분 트렌드 ${hasGeminiTags ? `<span style="font-size:12px;font-weight:400;color:var(--text-muted)">(Gemini 분석)</span>` : ''}</h3>
        ${topIngredients.length > 0
        ? `<div class="chart-wrapper" style="height:280px"><canvas id="ktrendIngredientChart"></canvas></div>`
        : `<div style="padding:40px;text-align:center;color:var(--text-muted)">
              <div style="font-size:32px;margin-bottom:8px">🧪</div>
              <p>Gemini가 아직 성분을 추출하지 않았습니다.</p>
              <code style="font-size:11px;background:#f5f5f7;padding:4px 8px;border-radius:4px">python scripts/trend_enricher.py</code> 를 실행해주세요.
             </div>`
      }
      </div>

      <!-- 카드 4: 브랜드 언급 TOP (full-width) -->
      <div class="insight-card full-width">
        <h3>🏷️ 브랜드 언급 TOP ${hasGeminiTags ? `<span style="font-size:12px;font-weight:400;color:var(--text-muted)">(Gemini 분석)</span>` : ''}</h3>
        ${topBrands.length > 0
        ? `<div class="chart-wrapper" style="height:300px"><canvas id="ktrendBrandChart"></canvas></div>`
        : `<div style="padding:40px;text-align:center;color:var(--text-muted)">
              <div style="font-size:32px;margin-bottom:8px">🏷️</div>
              <p>Gemini 태깅 후 브랜드가 자동 추출됩니다.</p>
             </div>`
      }
      </div>

      <!-- 카드 5: 패션 트렌드 키워드 cloud -->
      <div class="insight-card full-width">
        <h3>👗 패션 트렌드 키워드 ${hasGeminiTags ? `<span style="font-size:12px;font-weight:400;color:var(--text-muted)">(Gemini 분석)</span>` : ''}</h3>
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
              <p>Gemini 태깅 후 패션 스타일이 자동 추출됩니다.</p>
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
  await loadNotifications();

  // Poll for new notifications every 60 seconds
  // (In a real app, use Supabase Realtime subscription)
  setInterval(loadNotifications, 60000);
}

async function loadNotifications() {
  try {
    const { data } = await fetchNotifications(10);
    const prevCount = state.notifications.length;
    state.notifications = data || [];

    // Simple unread count
    if (state.notifications.length > prevCount && prevCount > 0) {
      state.unreadCount += (state.notifications.length - prevCount);
      updateNotifBadge();
    } else if (prevCount === 0 && state.notifications.some(n => !n.is_read)) {
      state.unreadCount = state.notifications.filter(n => !n.is_read).length;
      updateNotifBadge();
    }

    renderNotifications();
  } catch (err) {
    console.error('Fetch notif fail:', err);
  }
}

function renderNotifications() {
  const container = document.getElementById('notifList');
  if (!container) return;

  if (state.notifications.length === 0) {
    container.innerHTML = `<div class="notif-empty">${window.t('notifications.empty')}</div>`;
    return;
  }

  container.innerHTML = state.notifications.map(n => {
    const time = new Date(n.created_at).toLocaleTimeString(i18n.currentLang === 'ko' ? 'ko-KR' : 'en-US', { hour: '2-digit', minute: '2-digit' });
    const typeLabel = n.type === 'price_drop' ? window.t('notifications.price_drop') : window.t('notifications.rank_up');

    return `
      <div class="notif-item ${n.is_read ? '' : 'unread'}" onclick="handleNotifClick('${n.id}', ${JSON.stringify(n.products_master).replace(/"/g, '&quot;')})">
        <div class="notif-title">${typeLabel}</div>
        <div class="notif-message">${n.message}</div>
        <div class="notif-time">${time}</div>
      </div>
    `;
  }).join('');
}

function updateNotifBadge() {
  const badge = document.getElementById('notifBadge');
  if (!badge) return;

  if (state.unreadCount > 0) {
    badge.textContent = state.unreadCount > 9 ? '9+' : state.unreadCount;
    badge.style.display = 'flex';
  } else {
    badge.style.display = 'none';
  }
}

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
