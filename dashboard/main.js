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
  fetchProductHistory,
  fetchFaqs,
  fetchUserInquiries,
  submitInquiry,
  toggleWishlistStatus,
  fetchLatestUpdateTime
} from './supabase.js?v=4';
import { setupAuthUI } from './src/auth.js?v=12';
import { i18n } from './src/i18n.js?v=7';
import { OliveYoungBridge } from './source_bridges/oliveyoung.js?v=3';
import { MusinsaBridge } from './source_bridges/musinsa.js?v=2';
import { AblyBridge } from './source_bridges/ably.js';
import { ShinsegaeBridge } from './source_bridges/shinsegae.js';
import { KoreaTrendBridge } from './source_bridges/k_trend.js?v=2';
import { SteadySellerBridge } from './source_bridges/steady_seller.js';
import { ModernHouseBridge } from './source_bridges/modernhouse.js';

const bridges = {
  oliveyoung: OliveYoungBridge,
  musinsa: MusinsaBridge,
  ably: AblyBridge,
  shinsegae: ShinsegaeBridge, // Keep key for UI mapping but ID is ssg
  ssg: ShinsegaeBridge,
  k_trend: KoreaTrendBridge,
  steady_sellers: SteadySellerBridge,
  modernhouse: ModernHouseBridge
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
let isNavigatingHistory = false;

function updateURL(isReplace = false) {
  if (isNavigatingHistory) return;
  const url = new URL(window.location.href);
  url.searchParams.set('platform', state.currentPlatform);
  if (state.activeTab) url.searchParams.set('tab', state.activeTab);
  if (state.activeCategory) url.searchParams.set('category', state.activeCategory);

  const stateObj = {
    platform: state.currentPlatform,
    tab: state.activeTab,
    category: state.activeCategory
  };

  if (isReplace) {
    history.replaceState(stateObj, '', url.toString());
  } else {
    // Only push if URL actually changed
    if (window.location.href !== url.toString()) {
      history.pushState(stateObj, '', url.toString());
    }
  }
}

// ─── Main Tab Routing (Ranking / Trend / Sourcing) ────
window.switchMainTab = function (mainTabId) {
  // Update header nav active state
  document.querySelectorAll('.header-nav-item').forEach(el => {
    el.classList.remove('active');
  });

  const mainContent = document.getElementById('mainContent');
  const sourcingView = document.getElementById('sourcingView');
  const kpiGrid = document.getElementById('kpiGrid');
  const filterBar = document.querySelector('.filter-bar');
  const tabBar = document.querySelector('.tab-bar');

  if (mainTabId === 'ranking') {
    document.querySelectorAll('.header-nav-item')[0].classList.add('active');
    if (mainContent) mainContent.style.display = ''; // restore CSS default (block)
    if (sourcingView) sourcingView.style.display = 'none';

    // Show ranking-specific UI elements
    if (kpiGrid) kpiGrid.style.display = '';
    if (filterBar) filterBar.style.display = '';
    if (tabBar) tabBar.style.display = '';

    // Set active group on platform-switcher container (CSS handles visibility)
    const switcher = document.querySelector('.platform-switcher');
    if (switcher) switcher.dataset.activeGroup = 'ranking';

    // Default to oliveyoung if current platform is trend
    if (state.currentPlatform === 'k_trend') {
      const btn = document.querySelector('.platform-btn[data-platform="oliveyoung"]');
      if (btn) btn.click();
    }

  } else if (mainTabId === 'trend') {
    document.querySelectorAll('.header-nav-item')[1].classList.add('active');
    if (mainContent) mainContent.style.display = ''; // restore CSS default (block)
    if (sourcingView) sourcingView.style.display = 'none';

    // Hide ranking-specific UI elements (K-Trend renders its own KPIs/filters)
    if (kpiGrid) kpiGrid.style.display = 'none';
    if (filterBar) filterBar.style.display = 'none';
    if (tabBar) tabBar.style.display = 'none';

    // Set active group on platform-switcher container (CSS handles visibility)
    const switcher = document.querySelector('.platform-switcher');
    if (switcher) switcher.dataset.activeGroup = 'trend';

    // Default to k_trend
    if (state.currentPlatform !== 'k_trend') {
      const btn = document.querySelector('.platform-btn[data-platform="k_trend"]');
      if (btn) btn.click();
    }

  } else if (mainTabId === 'sourcing') {
    document.querySelectorAll('.header-nav-item')[2].classList.add('active');
    if (mainContent) mainContent.style.display = 'none';
    if (sourcingView) sourcingView.style.display = 'block';

    // Reload sourcing history if the user is authenticated and function exists
    if (window.renderSourcingHistory) window.renderSourcingHistory();

    // Scroll to top
    window.scrollTo(0, 0);
  }
};


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
    if (state.activeBridge.renderCustomHeader) {
      controls.innerHTML = state.activeBridge.renderCustomHeader(state);
      if (state.activeBridge.bindCustomHeaderEvents) {
        state.activeBridge.bindCustomHeaderEvents(() => loadTab(state.activeTab));
      }
    } else {
      controls.innerHTML = ''; // Clear previous platform's controls
    }
  }

  // Re-attach platform listeners if they were in the controls or bar
  if (window.attachPlatformListeners) window.attachPlatformListeners();

  // Reset Category & Search & Tab State
  state.activeCategory = null;
  state.searchQuery = '';
  const searchInput = document.getElementById('searchInput');
  if (searchInput) searchInput.value = '';

  // Ensure activeTab is valid for the new platform, otherwise default to the first tab
  if (state.activeBridge.tabs && state.activeBridge.tabs.length > 0) {
    if (!state.activeBridge.tabs.some(t => t.id === state.activeTab)) {
      state.activeTab = state.activeBridge.tabs[0].id;
    }
  } else {
    state.activeTab = 'all';
  }

  // Clean up stale content from previous platform (only dynamically-added custom areas in tab-all)
  const tabAll = document.getElementById('tab-all');
  if (tabAll) {
    tabAll.querySelectorAll('.custom-content-area').forEach(el => { el.innerHTML = ''; el.style.display = 'none'; });
  }

  // Render Tabs for this platform
  renderTabs();

  // Activate the correct tab-content pane (like switchTab does)
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  const targetTab = document.getElementById(`tab-${state.activeTab}`);
  if (targetTab) targetTab.classList.add('active');

  // Reload Data
  await Promise.all([
    loadCategories(),
    loadKPIs(),
    loadTab(state.activeTab)
  ]);

  updateURL();
}

// ─── Init ───────────────────────────────────
document.addEventListener('DOMContentLoaded', init);

async function init() {
  try {
    // Parse initial URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const initialPlatform = urlParams.get('platform');
    const initialTab = urlParams.get('tab');
    const initialCategory = urlParams.get('category');

    if (initialPlatform && bridges[initialPlatform]) {
      state.currentPlatform = initialPlatform;
      state.activeBridge = bridges[initialPlatform];
      document.body.dataset.platform = initialPlatform;
    } else {
      // Default to oliveyoung if no valid platform in URL
      state.currentPlatform = 'oliveyoung';
      state.activeBridge = OliveYoungBridge;
    }

    if (initialTab) {
      // Ensure tab is valid for the bridge
      if (state.activeBridge.tabs && state.activeBridge.tabs.some(t => t.id === initialTab)) {
        state.activeTab = initialTab;
      }
    }

    if (initialCategory) {
      state.activeCategory = initialCategory;
    }

    // Set initial URL state (replace)
    updateURL(true);

    // ─── Back-button Guard ───────────────────────
    // When logged-in user loads app.html, replace history so landing page
    // isn't behind us, and push a guard entry to prevent accidental exit.
    const session = getSession();
    if (session) {
      // Replace the entry so pressing back won't return to index.html
      history.replaceState({ guard: true }, '', window.location.href);
      // Push a duplicate so first "back" press stays on this page
      history.pushState({ guard: true }, '', window.location.href);
    }

    // Listen to browser Back/Forward navigation
    window.addEventListener('popstate', async (e) => {
      // Guard: if a logged-in user tries to navigate away from app.html, block it
      const currentSession = getSession();
      if (currentSession && !window.location.pathname.includes('app.html')) {
        history.pushState(null, '', '/app.html');
        return;
      }
      // Guard: re-push guard entry so repeated back presses stay on page
      if (currentSession && (!e.state || e.state.guard)) {
        history.pushState({ guard: true }, '', window.location.href);
        return;
      }

      const sp = new URLSearchParams(window.location.search);
      const plat = sp.get('platform') || 'oliveyoung';
      const tb = sp.get('tab') || 'all';
      const cat = sp.get('category');

      isNavigatingHistory = true; // Prevent pushing state while restoring

      // If platform changed
      if (state.currentPlatform !== plat) {
        state.activeCategory = cat || null; // Restore category early so setPlatform uses it
        state.activeTab = tb;
        state.currentPlatform = null; // Force setPlatform to run its UI updates
        await setPlatform(plat);
      } else {
        let needsReload = false;

        // If Category changed
        if (state.activeCategory !== cat && cat) {
          state.activeCategory = cat;
          document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
          const chip = document.querySelector(`.chip[data-code="${cat}"]`);
          if (chip) chip.classList.add('active');
          needsReload = true;
        }

        // If Tab changed
        if (state.activeTab !== tb) {
          state.activeTab = tb;
          const container = document.querySelector('.tab-bar');
          if (container) {
            container.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            const actT = container.querySelector(`.tab[data-tab="${tb}"]`);
            if (actT) actT.classList.add('active');
          }
          needsReload = true;
        }

        if (needsReload) {
          await loadTab(state.activeTab);
        }
      }

      isNavigatingHistory = false;
    });

    await i18n.init();
    renderTabs();
    setupEventListeners();
    setupAuthUI();

    // Apply initial main tab routing to hide non-ranking platform buttons
    switchMainTab('ranking');

    await Promise.all([
      loadKPIs(),
      loadCategories()
    ]);
    initNotificationSystem();
    // loadCategories sets active category and triggers loadTab

    // Initialize Support View empty state
    window.toggleSupportView = toggleSupportView;
    window.submitSupportInquiry = submitSupportInquiry;
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
    // Legacy notification dropdown check (if retained)
    const notiDropdown = document.getElementById('notiDropdown');
    const notiBtn = document.getElementById('notiBtn');
    if (notiDropdown && notiBtn && !notiDropdown.contains(e.target) && !notiBtn.contains(e.target)) {
      notiDropdown.style.display = 'none';
    }

    // New notification dropdown
    const notifDropdown = document.getElementById('notifDropdown');
    const notifBell = document.getElementById('notifBell');
    if (notifDropdown && notifBell && !notifDropdown.contains(e.target) && !notifBell.contains(e.target)) {
      notifDropdown.classList.remove('open');
    }

    const langDropdown = document.getElementById('langDropdown');
    const langBtn = document.getElementById('langBtn');
    if (langDropdown && langBtn && !langDropdown.contains(e.target) && e.target !== langBtn) {
      langDropdown.classList.remove('open');
    }
  });

  // Notification Bell Click
  const notifBell = document.getElementById('notifBell');
  const notifDropdown = document.getElementById('notifDropdown');
  if (notifBell && notifDropdown) {
    notifBell.addEventListener('click', (e) => {
      e.stopPropagation();
      notifDropdown.classList.toggle('open');
    });
  }

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

  // Tutorial Modal Logic
  const tutorialOverlay = document.getElementById('tutorialModalOverlay');
  const skipTutorialBtn = document.getElementById('skipTutorialBtn');
  const tutorialPrevBtn = document.getElementById('tutorialPrevBtn');
  const tutorialNextBtn = document.getElementById('tutorialNextBtn');
  const tutorialPrimaryBtn = document.getElementById('tutorialPrimaryBtn');
  const dontShowCheckbox = document.getElementById('dontShowTutorial');
  const tutorialCarousel = document.getElementById('tutorialCarousel');
  const tutorialDots = document.querySelectorAll('#tutorialDots .dot');

  if (tutorialOverlay && tutorialCarousel) {
    let currentSlide = 0;
    const totalSlides = 3;

    function updateTutorialUI() {
      // Move carousel
      tutorialCarousel.style.transform = `translateX(-${currentSlide * (100 / totalSlides)}%)`;

      // Update dots
      if (tutorialDots.length > 0) {
        tutorialDots.forEach((dot, idx) => {
          dot.style.background = idx === currentSlide ? '#4f46e5' : '#cbd5e1';
        });
      }

      // Update buttons
      if (tutorialPrevBtn) {
        tutorialPrevBtn.style.display = currentSlide === 0 ? 'none' : 'flex';
      }

      if (tutorialNextBtn && tutorialPrimaryBtn) {
        if (currentSlide === totalSlides - 1) {
          tutorialNextBtn.style.display = 'none';
          tutorialPrimaryBtn.textContent = window.t ? window.t('tutorial.start_btn') : 'K-Vant 시작하기';
        } else {
          tutorialNextBtn.style.display = 'flex';
          tutorialPrimaryBtn.textContent = window.t ? window.t('tutorial.next_btn') : '다음 (Next)';
        }
      }
    }

    function closeTutorial() {
      if (dontShowCheckbox && dontShowCheckbox.checked) {
        localStorage.setItem('hide_tutorial_v1', 'true');
      }
      tutorialOverlay.classList.remove('open');
    }

    if (tutorialNextBtn) {
      tutorialNextBtn.addEventListener('click', () => {
        if (currentSlide < totalSlides - 1) {
          currentSlide++;
          updateTutorialUI();
        }
      });
    }

    if (tutorialPrevBtn) {
      tutorialPrevBtn.addEventListener('click', () => {
        if (currentSlide > 0) {
          currentSlide--;
          updateTutorialUI();
        }
      });
    }

    if (tutorialPrimaryBtn) {
      tutorialPrimaryBtn.addEventListener('click', () => {
        if (currentSlide < totalSlides - 1) {
          currentSlide++;
          updateTutorialUI();
        } else {
          closeTutorial();
        }
      });
    }

    if (skipTutorialBtn) {
      skipTutorialBtn.addEventListener('click', closeTutorial);
    }

    // Show tutorial after a short delay if not hidden
    setTimeout(() => {
      const isHidden = localStorage.getItem('hide_tutorial_v1') === 'true';
      if (!isHidden) {
        currentSlide = 0;
        updateTutorialUI();
        tutorialOverlay.classList.add('open');
      }
    }, 1000);
  }
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

  // Re-render custom header for platform if needed
  const controls = document.getElementById('platformControls');
  if (controls && state.activeBridge && state.activeBridge.renderCustomHeader) {
    controls.innerHTML = state.activeBridge.renderCustomHeader(state);
    if (state.activeBridge.bindCustomHeaderEvents) {
      state.activeBridge.bindCustomHeaderEvents(() => loadTab(state.activeTab));
    }
  }

  updateURL();
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
          if (controls) {
            controls.innerHTML = state.activeBridge.renderCustomHeader(state);
            if (state.activeBridge.bindCustomHeaderEvents) {
              state.activeBridge.bindCustomHeaderEvents(() => loadTab(state.activeTab));
            }
          }
        }

        // Ensure tab is valid for the current platform (e.g. if 'deals' tab doesn't exist here)
        const isValidTab = state.activeBridge.tabs.some(t => t.id === state.activeTab);
        if (!isValidTab) {
          switchTab(state.activeBridge.tabs[0].id);
        } else {
          updateURL();
          loadTab(state.activeTab);
        }

      });
      container.appendChild(btn);
    });

    // Musinsa: insert gender filter row in the section-header (right side of title)
    const existingGenderRow = document.querySelector('.musinsa-gender-row');
    if (existingGenderRow) existingGenderRow.remove();
    if (state.activeBridge && state.activeBridge.renderGenderRow) {
      const sectionHeader = document.querySelector('#tab-all .section-header');
      if (sectionHeader) {
        sectionHeader.style.position = 'relative';
        const genderDiv = document.createElement('div');
        genderDiv.innerHTML = state.activeBridge.renderGenderRow(state);
        const genderEl = genderDiv.firstElementChild;
        if (genderEl) {
          genderEl.style.position = 'absolute';
          genderEl.style.right = '0';
          genderEl.style.top = '50%';
          genderEl.style.transform = 'translateY(-50%)';
          genderEl.style.margin = '0';
          sectionHeader.appendChild(genderEl);
        }
      }
    }

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
    titleEl.removeAttribute('data-i18n');
    if (state.searchQuery) {
      titleEl.textContent = `${window.t('sections.all')} - ${state.searchQuery}`;
    } else if (state.currentPlatform === 'steady_sellers') {
      titleEl.textContent = "주요 스테디 셀러";
    } else {
      const activeChip = document.querySelector('#categoryChips .chip.active');
      const catName = activeChip ? activeChip.textContent : window.t('tabs.all') || 'All';
      titleEl.textContent = `${state.activeBridge.name} - ${catName}`;
    }
  }
  if (descEl) {
    descEl.removeAttribute('data-i18n');
    if (state.currentPlatform === 'steady_sellers') {
      descEl.textContent = window.t('common.desc_steady') || "K-Vant가 엄선한 최고의 상품 컬렉션";
    } else {
      descEl.textContent = (window.t('common.desc_platform') || '{platform} 플랫폼 데이터 분석 결과').replace('{platform}', state.activeBridge.name);
    }
  }

  // Update timestamp
  const timeEl = document.getElementById('rankingUpdateTime');
  if (timeEl) {
    timeEl.textContent = '';
    fetchLatestUpdateTime(state.currentPlatform).then(ts => {
      if (ts && timeEl) {
        // ts is generally returned in UTC string from Supabase (e.g. "2026-03-05T04:14:00Z")
        // JavaScript Date automatically parses and applies the local timezone (-9h offset for KST)
        const d = new Date(ts);
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const hh = String(d.getHours()).padStart(2, '0');
        const mi = String(d.getMinutes()).padStart(2, '0');
        timeEl.textContent = `🕐 Updated: ${d.getFullYear()}.${mm}.${dd} ${hh}:${mi} KST`;
      }
    });
  }

  try {
    const result = await state.activeBridge.fetchData(tabId, state);
    const data = result.data || [];
    const count = result.count || data.length;

    // Custom Renderer Support (e.g. Steady Sellers brand grouping)
    if (state.activeBridge.renderTabContent) {
      const customHtml = state.activeBridge.renderTabContent(tabId, result, state);
      if (customHtml) {
        // Hide standard table if it exists
        const tableContainer = activeTabContent?.querySelector('.table-container');
        if (tableContainer) tableContainer.style.display = 'none';

        // Find a suitable container for custom HTML. 
        // We prefer a .products-grid that is NOT a tbody, or a parent of grid.
        let target = activeTabContent?.querySelector('.custom-content-area');
        if (!target) {
          target = document.createElement('div');
          target.className = 'custom-content-area';
          if (activeTabContent) {
            activeTabContent.appendChild(target);
          }
        }

        target.innerHTML = customHtml;
        target.style.display = 'block';

        // Hide the original grid/tbody if it's separate
        if (grid) grid.style.display = 'none';

        // Custom tabs like k_trend shouldn't skip translation if they have products
        if (i18n.currentLang !== 'ko' && tabId !== 'crawl_logs' && data && data.length > 0) {
          translateProducts(data, i18n.currentLang);
        }

        i18n.documentUpdate();
        renderPagination(0);
        return;
      }
    } else {
      // Restore standard layout for standard bridges
      const tableContainer = activeTabContent?.querySelector('.table-container');
      if (tableContainer) tableContainer.style.display = 'block';
      if (grid) grid.style.display = (grid.tagName === 'TBODY' ? 'table-row-group' : 'grid');
      const target = activeTabContent?.querySelector('.custom-content-area');
      if (target) target.style.display = 'none';
    }

    if (data.length === 0) {
      if (grid.tagName === 'TBODY') {
        grid.innerHTML = `<tr><td colspan="8" class="empty-cell">${window.t('common.no_results')}</td></tr>`;
        const thead = grid.closest('table').querySelector('thead');
        if (thead) thead.style.display = 'none';
      } else {
        grid.innerHTML = emptyState(window.t('common.no_results'));
      }
      renderPagination(0);
      return;
    }

    const savedItems = await fetchSavedProducts();
    const savedIds = new Set(savedItems.data?.map(i => i.product_id) || []);

    if (grid.tagName === 'TBODY') {
      const thead = grid.closest('table').querySelector('thead');
      if (thead) thead.style.display = '';

      grid.innerHTML = data.map((p, idx) => {
        p.is_saved = savedIds.has(p.product_id || p.id);
        return renderTableRow(p, idx);
      }).join('');
      // 비-한국어 언어 설정이면 상품명/브랜드 배치 번역 비동기 실행
      if (i18n.currentLang !== 'ko') {
        translateProducts(data, i18n.currentLang);
      }
    } else {
      grid.innerHTML = data.map(p => {
        p.is_saved = savedIds.has(p.product_id || p.id);
        return renderProductCard(p, tabId === 'deals' ? 'deal' : 'normal');
      }).join('');

      // 카드 형태에서도 번역 트리거
      if (i18n.currentLang !== 'ko') {
        translateProducts(data, i18n.currentLang);
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
            <th data-i18n="table.review" style="text-align:center">리뷰</th>
            <th data-i18n="table.rating" style="text-align:center">평점</th>
            <th data-i18n="table.rank_change" style="text-align:center">변동</th>
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
  // Use the requested tabId rather than hardcoding global_trends
  const container = document.getElementById(`tab-${tabId}`);
  const grid = document.getElementById(`${tabId}Grid`);
  if (!container || !grid) return;

  // Ensure the correct tab-content pane is visible
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  container.classList.add('active');
  state.activeTab = tabId;

  grid.innerHTML = '<div class="loading-skeleton"></div>';

  try {
    const result = await state.activeBridge.fetchData(tabId, state);
    const data = result.data || [];

    // If the bridge provides a custom dashboard renderer, use it FIRST
    if (state.activeBridge.renderTabContent) {
      const customHtml = state.activeBridge.renderTabContent(tabId, result, state);
      if (customHtml !== null && customHtml !== undefined) {
        grid.innerHTML = customHtml;

        // Translate Naver Best brand/product names and hashtags for non-Korean languages
        if (i18n.currentLang !== 'ko') {
          _translateNaverBestElements(grid, i18n.currentLang);
        }
        return;
      }
    }

    // Fallback if no custom renderer exists
    if (data.length === 0) {
      grid.innerHTML = emptyState(window.t('common.no_results') || '트렌드 데이터가 없습니다.');
      return;
    }

    // Fallback: standard product card grid
    const savedItems = await fetchSavedProducts();
    const savedIds = new Set(savedItems.data?.map(i => i.product_id) || []);

    grid.innerHTML = data.map(p => {
      p.is_saved = savedIds.has(p.product_id || p.id);
      return renderProductCard(p, 'normal', true);
    }).join('');

    if (i18n.currentLang !== 'ko') {
      translateProducts(data, i18n.currentLang);
    }
  } catch (err) {
    console.error('K-Trend fetch error:', err);
    grid.innerHTML = `<div class="error-state">트렌드 데이터 로딩 실패: ${err.message}</div>`;
  }
}

function renderTableRow(p, index) {
  const rank = (state.currentPage - 1) * state.perPage + index + 1;
  const profile = getProfile();
  const isPro = isProMember(profile);
  const isLocked = !isPro;

  let name = escapeHtml(getLocalizedName(p));
  let brand = escapeHtml(getLocalizedBrand(p));

  if (isLocked) {
    name = maskText(name);
    brand = maskText(brand);
  }

  // Rank change display
  let rankChangeHtml = '<span style="color:#999;">—</span>';
  if (p.rank_change === null || p.rank_change === undefined) {
    if (p.prev_rank === null) {
      rankChangeHtml = '<span style="display:inline-block;background:#3b82f6;color:#fff;font-size:11px;font-weight:600;padding:2px 8px;border-radius:10px;">NEW</span>';
    }
  } else if (p.rank_change > 0) {
    rankChangeHtml = `<span style="color:#22c55e;font-weight:600;">▲${p.rank_change}</span>`;
  } else if (p.rank_change < 0) {
    rankChangeHtml = `<span style="color:#ef4444;font-weight:600;">▼${Math.abs(p.rank_change)}</span>`;
  }

  return `
      <tr class="${isLocked ? 'locked-row' : ''}" 
        onclick="${isLocked ? '' : `window.__openProduct(${JSON.stringify(p).replace(/"/g, '&quot;')})`}" 
        style="cursor:${isLocked ? 'default' : 'pointer'}">
        <td style="text-align:center;"><span class="rank-num">${rank}</span></td>
        <td style="text-align:center;"><img class="thumb" src="${p.image_url || ''}" alt="" loading="lazy" onerror="this.style.display='none'" /></td>
        <td style="max-width:280px">
          <div class="product-name" data-pid="${p.product_id || p.id}" style="-webkit-line-clamp:1">${name}</div>
        </td>
        <td style="text-align:center;"><span class="product-brand" data-brand-pid="${p.product_id || p.id}">${brand}</span></td>
        <td style="text-align:center;">${formatPrice(p.price || p.price_current)}</td>
        <td style="text-align:center;">${p.review_count > 0 ? formatNumber(p.review_count) : '-'}</td>
        <td style="text-align:center;">${p.review_rating > 5 ? '❤️ ' + formatNumber(p.review_rating) : (p.review_rating > 0 && !isNaN(p.review_rating) ? p.review_rating : '-')}</td>
        <td style="text-align:center;">${rankChangeHtml}</td>
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
            <td style="text-align:center;">${p.review_count > 0 ? formatNumber(p.review_count) : '-'}</td>
            <td style="text-align:center;">${p.review_rating > 5 ? '❤️ ' + formatNumber(p.review_rating) : (p.review_rating > 0 && !isNaN(p.review_rating) ? p.review_rating : '-')}</td>
            <td style="text-align:center;"><span style="color:#999;">—</span></td>
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

    // Deduplicate by name + brand (keep the most recently crawled data)
    const uniqueMap = new Map();
    filtered.forEach(p => {
      // Normalize name and brand for comparison
      const key = `${p.brand || ''}_${p.name || ''}`.toLowerCase().trim();
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, p);
      } else {
        const existing = uniqueMap.get(key);
        // Prefer the one with the latest created_at
        const existingTime = existing.created_at ? new Date(existing.created_at).getTime() : 0;
        const newTime = p.created_at ? new Date(p.created_at).getTime() : 0;

        if (newTime > existingTime) {
          uniqueMap.set(key, p);
        } else if (newTime === existingTime) {
          // Fallback if timestamps are identical
          const existingRank = existing.current_rank || 999;
          const newRank = p.current_rank || 999;
          if (newRank < existingRank) {
            uniqueMap.set(key, p);
          }
        }
      }
    });
    filtered = Array.from(uniqueMap.values());

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

  // Auto-compute discount for all items where special_price < price
  const patchedData = data.map(p => {
    const current = p.special_price || p.price || 0;
    const orig = p.original_price || p.price_original || p.price || 0;
    if (orig > current && current > 0) {
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
    // --- Deal Expiration Logic ---
    // Check Current KST Time for Deleting Expired Deals
    const nowKst = new Date();
    // UTC to KST by adding 9 hours
    const kstOffset = 9 * 60;
    const kstTime = new Date(nowKst.getTime() + (nowKst.getTimezoneOffset() + kstOffset) * 60000);
    const kstHour = kstTime.getHours();
    // Fetch today's deals to see if any wishlist item is actually an expired deal
    const dealsRes = await fetchDailySpecials('oliveyoung');
    const todayDeals = dealsRes.data || [];
    const todayDealIds = new Set(todayDeals.map(d => d.product_id));
    const dealDateStr = dealsRes.date || '';

    // Determine if today's deal is expired (Past 9 PM KST)
    // For safety, let's assume if it's past 9 PM, the deals for `dealDateStr` are expired.
    // Ideally we check if kstHour >= 21 and the deal's date is today's date in KST.
    const isDealExpired = kstHour >= 21;

    let expiredCount = 0;
    const activeProducts = [];

    const savedItems = await fetchSavedProducts();

    for (const p of savedItems?.data || []) {
      const pId = p.product_id || p.id;
      // If the item is in today's deals and it has expired
      if (p.platform === 'oliveyoung' && todayDealIds.has(pId) && isDealExpired) {
        // Auto-remove from wishlist
        try {
          await toggleWishlistStatus(pId, false);
          expiredCount++;
        } catch (e) { console.error("Failed to auto-remove expired deal:", e); }
      } else {
        activeProducts.push(p);
      }
    }

    if (expiredCount > 0) {
      alert(`올리브영 오늘의 특가 시간이 종료되어 ${expiredCount}개의 상품이 관심 상품에서 자동 삭제되었습니다.`);
    }

    if (activeProducts.length === 0) {
      grid.innerHTML = emptyState(window.t('sections.fav_empty'), window.t('sections.fav_empty_desc'));
      const quoteItemCount = document.getElementById('quoteItemCount');
      if (quoteItemCount) quoteItemCount.innerText = '0';
      return;
    }

    // 그룹화: 플랫폼별로 분리
    const grouped = activeProducts.reduce((acc, p) => {
      const platform = p.platform || '기타';
      if (!acc[platform]) acc[platform] = [];
      acc[platform].push(p);
      return acc;
    }, {});

    grid.innerHTML = Object.entries(grouped).map(([platform, items]) => {
      const isEn = window.i18n && window.i18n.currentLang === 'en';
      const pName = platform.charAt(0).toUpperCase() + platform.slice(1);
      return `
        <div class="wishlist-platform-group" style="margin-bottom: 24px;">
          <h3 style="font-size: 16px; margin-bottom: 12px; color: var(--text); display: flex; align-items: center; gap: 8px;">
            <span style="display:inline-block; width:4px; height:16px; background:var(--accent-blue); border-radius:2px;"></span>
            ${pName} 
            <span style="font-size: 12px; color: var(--text-muted); font-weight: 400;">(${items.length})</span>
          </h3>
          <div class="product-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px;">
            ${items.map(p => renderProductCard(p, 'normal', false, true)).join('')}
          </div>
        </div>
      `;
    }).join('');

    // 비-한국어 언어 설정이면 관심 상품도 번역 실행
    if (i18n.currentLang !== 'ko') {
      translateProducts(activeProducts, i18n.currentLang);
    }
    i18n.documentUpdate();

    if (actionBar) {
      actionBar.style.display = 'block';
      const quoteItemCount = document.getElementById('quoteItemCount');
      if (quoteItemCount) quoteItemCount.innerText = activeProducts.length;
    }
  } catch (e) {
    console.error("loadWishlist error:", e);
    grid.innerHTML = `<div class="error-state">관심 상품을 불러오는데 실패했습니다: ${e.message}</div>`;
  }
}

// ─── Render Helpers ───────────────────────

// Translate Naver Best elements (brand names, product names, hashtags) in-place
async function _translateNaverBestElements(container, targetLang) {
  if (targetLang === 'ko') return;
  const apiKey = import.meta.env.VITE_GOOGLE_TRANSLATE_API_KEY;
  if (!apiKey) return;

  // Collect all translatable elements
  const selectors = '.nb-brand-name, .nb-product-brand, .nb-product-name, .nb-hash';
  const elements = container.querySelectorAll(selectors);
  if (elements.length === 0) return;

  // Deduplicate texts and map elements
  const textToElements = {};
  elements.forEach(el => {
    const text = el.textContent.trim();
    if (!text || text.length < 2) return;
    const cacheKey = `nb_${targetLang}_${text}`;
    // Check cache first
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      el.textContent = cached;
      return;
    }
    if (!textToElements[text]) textToElements[text] = { cacheKey, elements: [] };
    textToElements[text].elements.push(el);
  });

  const entries = Object.entries(textToElements);
  if (entries.length === 0) return;

  // Batch translate (max 25 per request)
  const BATCH = 25;
  for (let i = 0; i < entries.length; i += BATCH) {
    const batch = entries.slice(i, i + BATCH);
    const qParams = batch.map(([text]) => `q=${encodeURIComponent(text)}`).join('&');
    try {
      const res = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `target=${targetLang}&source=ko&${qParams}`
      });
      if (!res.ok) continue;
      const data = await res.json();
      const translations = data?.data?.translations?.map(t => t.translatedText) || [];

      batch.forEach(([text, info], idx) => {
        const translated = translations[idx] || text;
        localStorage.setItem(info.cacheKey, translated);
        info.elements.forEach(el => { el.textContent = translated; });
      });
    } catch (e) {
      console.warn('Naver Best translation error:', e);
    }
  }
}

// API Batch Translation (Name & Brand) - Using Google Translation API (V2) for Ranking speed
const _translationCache = {};
async function translateProducts(products, targetLang) {
  if (targetLang === 'ko') return;

  // Use Google Translate API for Ranking View (List Speed)
  // AI Analysis (Product Detail) will use Gemini separately
  const apiKey = import.meta.env.VITE_GOOGLE_TRANSLATE_API_KEY;
  if (!apiKey) {
    console.warn("VITE_GOOGLE_TRANSLATE_API_KEY is missing! Using Gemini fallback...");
    return translateProductsWithGemini(products, targetLang);
  }

  // 1. Gather all tasks
  const tasks = []; // { type: 'name' | 'brand', p: product, text: string, cacheKey: string }

  products.forEach(p => {
    const pid = p.product_id || p.id;
    const nameCacheKey = `tr_${targetLang}_${pid}`;
    const brandCacheKey = `br_en_${pid}`;

    const rawName = p.name_ko || p.name || p.product_name;
    const rawBrand = p.brand_ko || p.brand || p.brand_name;

    if (!p[`name_${targetLang}`] && !_translationCache[nameCacheKey] && !localStorage.getItem(nameCacheKey) && rawName) {
      tasks.push({ type: 'name', p, text: rawName, cacheKey: nameCacheKey });
    }
    if (!p.brand_en && !localStorage.getItem(brandCacheKey) && rawBrand) {
      tasks.push({ type: 'brand', p, text: rawBrand, cacheKey: brandCacheKey, target: 'en' });
    }
  });

  if (tasks.length === 0) return;

  // 2. Batch and request (Standard Google Translate V2 API)
  const BATCH = 25;
  const groupedTasks = tasks.reduce((acc, t) => {
    const tgt = t.target || targetLang;
    if (!acc[tgt]) acc[tgt] = [];
    acc[tgt].push(t);
    return acc;
  }, {});

  for (const [tgtLang, langTasks] of Object.entries(groupedTasks)) {
    for (let i = 0; i < langTasks.length; i += BATCH) {
      const batch = langTasks.slice(i, i + BATCH);
      const qParameters = batch.map(t => `q=${encodeURIComponent(t.text)}`).join('&');

      try {
        // Using POST to handle long query strings
        const res = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `target=${tgtLang}&source=ko&${qParameters}`
        });

        if (!res.ok) continue;
        const data = await res.json();
        const translated = data?.data?.translations?.map(t => t.translatedText) || [];

        batch.forEach((t, idx) => {
          let resText = translated[idx] || t.text;
          if (t.type === 'brand') { resText = resText.replace(/ /g, ''); }

          _translationCache[t.cacheKey] = resText;
          localStorage.setItem(t.cacheKey, resText);

          const pid = t.p.product_id || t.p.id;
          const selector = t.type === 'name'
            ? `.product-name[data-pid="${pid}"], .gt-product-name[data-pid="${pid}"]`
            : `.product-brand[data-pid="${pid}"], .gt-product-brand[data-pid="${pid}"]`;

          document.querySelectorAll(selector).forEach(cell => {
            cell.textContent = resText;
          });
        });
      } catch (e) {
        console.warn(`Speed Translation error (${tgtLang}):`, e);
      }
    }
  }
}

// Fallback to Gemini if Google API key is missing (Historical logic kept for analysis etc)
async function translateProductsWithGemini(products, targetLang) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) return;

  const langNames = { vi: 'Vietnamese', en: 'English', th: 'Thai', id: 'Indonesian', ja: 'Japanese' };
  const tasks = [];
  products.forEach(p => {
    const pid = p.product_id || p.id;
    const nameCacheKey = `tr_${targetLang}_${pid}`;
    const brandCacheKey = `br_en_${pid}`;
    const rawName = p.name_ko || p.name || p.product_name;
    const rawBrand = p.brand_ko || p.brand || p.brand_name;
    if (!p[`name_${targetLang}`] && !_translationCache[nameCacheKey] && !localStorage.getItem(nameCacheKey) && rawName) {
      tasks.push({ type: 'name', p, text: rawName, cacheKey: nameCacheKey });
    }
    if (!p.brand_en && !localStorage.getItem(brandCacheKey) && rawBrand) {
      tasks.push({ type: 'brand', p, text: rawBrand, cacheKey: brandCacheKey, target: 'en' });
    }
  });

  if (tasks.length === 0) return;

  const groupedTasks = tasks.reduce((acc, t) => {
    const tgt = t.target || targetLang;
    if (!acc[tgt]) acc[tgt] = [];
    acc[tgt].push(t);
    return acc;
  }, {});

  for (const [tgtLang, langTasks] of Object.entries(groupedTasks)) {
    const tgtLangName = langNames[tgtLang] || tgtLang;
    const BATCH = 25;
    for (let i = 0; i < langTasks.length; i += BATCH) {
      const batch = langTasks.slice(i, i + BATCH);
      const qArray = batch.map(t => t.text);
      try {
        const prompt = `Translate the following list to ${tgtLangName}. Return ONLY a valid JSON array of strings in exactly the same order. Do not wrap in markdown or backticks.\n\n` + JSON.stringify(qArray);
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.1 }
          })
        });
        if (!res.ok) continue;
        const data = await res.json();
        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!rawText) continue;
        const translated = JSON.parse(rawText.replace(/```json/g, '').replace(/```/g, '').trim());
        batch.forEach((t, idx) => {
          let resText = translated[idx] || t.text;
          if (t.type === 'brand') resText = resText.replace(/ /g, '');
          _translationCache[t.cacheKey] = resText;
          localStorage.setItem(t.cacheKey, resText);
          const pid = t.p.product_id || t.p.id;
          const selector = t.type === 'name'
            ? `.product-name[data-pid="${pid}"], .gt-product-name[data-pid="${pid}"]`
            : `.product-brand[data-pid="${pid}"], .gt-product-brand[data-pid="${pid}"]`;
          document.querySelectorAll(selector).forEach(cell => cell.textContent = resText);
        });
      } catch (e) { console.warn("Gemini translation error", e); }
    }
  }
}

// Google Cloud Translation API (Speed) for keywords
async function translateKeywords(items, targetLang, targetType = 'category') {
  if (!items || items.length === 0) return;
  const apiKey = import.meta.env.VITE_GOOGLE_TRANSLATE_API_KEY;
  if (!apiKey) return null; // Keywords usually aren't worth Gemini's cost/speed in lists

  try {
    const qParameters = items.map(t => `q=${encodeURIComponent(t)}`).join('&');
    const res = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `target=${targetLang}&source=ko&${qParameters}`
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.data?.translations?.map(t => t.translatedText) || null;
  } catch (e) {
    console.warn(`Keyword translation error (${targetType}):`, e);
    return null;
  }
}


function getLocalizedName(p) {
  const lang = i18n.currentLang;
  // 한국어 설정이면 원본 제품명 그대로
  if (lang === 'ko') return p.name_ko || p.name || '';

  // 1. DB에 해당 언어 번역 있으면 바로 사용
  const localized = p[`name_${lang}`] || p[`${lang}_name`];
  if (localized) return localized;

  // 2. 메모리/로컬 캐시에 번역 있으면 사용
  const pid = p.product_id || p.id;
  const cacheKey = `tr_${lang}_${pid}`;
  const cached = _translationCache[cacheKey] || localStorage.getItem(cacheKey);
  if (cached) { _translationCache[cacheKey] = cached; return cached; }

  // 3. 영어가 있으면 영어 반환 (번역되는 동안 임시 표시)
  if (p.name_en) return p.name_en;

  // 4. 전부 없으면 한국어 원본 반환 (아직 번역 API가 안 끝났을 때 나오는 기본 텍스트)
  return p.name_ko || p.name || '';
}

function getLocalizedBrand(p) {
  const lang = i18n.currentLang;

  // 한국어면 한국어 원본 반환
  if (lang === 'ko') return p.brand_ko || p.brand || '';

  // 영문/기타 언어: 무조건 영어 브랜드명 우선
  if (p.brand_en) return p.brand_en;

  // 영문 캐시 확인
  const pid = p.product_id || p.id;
  const cacheKey = `br_en_${pid}`;
  const cached = localStorage.getItem(cacheKey);
  if (cached) return cached;

  // 정 번역이 안됐을 때만 한국어 원본
  return p.brand_ko || p.brand || '';
}

function renderProductCard(p, mode = 'normal', isGlobalTrend = false, isWishlistTab = false) {
  const isWishlist = !!p.is_saved;
  const productId = p.product_id || p.id;

  // Membership Check
  const profile = getProfile();
  const isPro = isProMember(profile);
  const isLocked = !isPro && !isGlobalTrend;

  let name = escapeHtml(getLocalizedName(p));
  let brand = escapeHtml(getLocalizedBrand(p));

  if (isLocked) {
    name = maskText(name);
    brand = maskText(brand);
  }

  // Price Logic
  const currentPrice = p.special_price || p.price || p.price_current || 0;
  const originalPrice = p.original_price || p.price_original || 0;
  // If we have an original price and it's higher than current, it's a deal
  const isDeal = originalPrice > currentPrice;

  // deal mode: use discount_rate from DB if no original price available
  const discountPct = p.discount_pct || p.discount_rate || (isDeal ? Math.round((1 - currentPrice / originalPrice) * 100) : 0);
  const showDeal = isDeal || (mode === 'deal' && discountPct > 0);

  let priceHtml = '';
  if (isGlobalTrend) {
    priceHtml = `<div class="price-current" style="color:var(--accent-blue);font-size:16px;">💬 ${formatNumber(currentPrice)}건 언급</div>`;
  } else if (showDeal && discountPct > 0) {
    priceHtml = `<div class="deal-price-row">
             ${originalPrice > 0 ? `<span class="deal-orig-price">${formatPrice(originalPrice)}</span>` : ''}
             <span class="deal-sale-price">${formatPrice(currentPrice)}</span>
             <span class="deal-pct">${discountPct}%</span>
           </div>`;
  } else {
    priceHtml = `<div class="price-current">${formatPrice(currentPrice)}</div>`;
  }

  const isTrend = ['google_trends', 'naver_datalab'].includes(p.source);

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
          <button type="button" class="btn-qty" onclick="event.stopPropagation(); window.__updateSourcingQty(this, -5)">-</button>
          <input type="number" class="sourcing-qty-input" data-product-id="${productId}" value="5" min="5" step="5" style="width:50px; text-align:center; border:1px solid var(--border); border-radius:4px; font-size:12px; padding:2px; background:var(--background); color:var(--text);" onclick="event.stopPropagation();">
          <button type="button" class="btn-qty" onclick="event.stopPropagation(); window.__updateSourcingQty(this, 5)">+</button>
      </div>
    </div>
  ` : '';

  return `
    <div class="product-card ${isTrend || isGlobalTrend ? 'trend-card' : ''} ${isLocked ? 'locked-card' : ''}" 
      data-name-ko="${escapeHtml(p.name || p.name_ko || '')}"
      data-name-en="${escapeHtml(p.name_en || '')}"
      data-brand-ko="${escapeHtml(p.brand || p.brand_ko || '')}"
      data-brand-en="${escapeHtml(p.brand_en || '')}"
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
        ${p.review_count > 0 ? `<span class="badge badge-reviews">⭐ ${p.review_rating > 0 ? p.review_rating : '-'} (${isGlobalTrend ? '-' : formatNumber(p.review_count)})</span>` : ''}
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
  const langCode = window.i18n && window.i18n.currentLang ? window.i18n.currentLang : 'ko';
  const langNameMap = { 'ko': 'Korean', 'en': 'English', 'vi': 'Vietnamese', 'th': 'Thai', 'id': 'Indonesian', 'ja': 'Japanese' };
  const targetLang = langNameMap[langCode] || 'Korean';

  // 1. Check LocalStorage cache with language-specific key
  const cacheKey = `ai_summary_${product.product_id || product.id}_${langCode}`;
  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    try { return JSON.parse(cached); } catch (e) { }
  }

  // 2. Priority: DB pre-calculated summary (avoids API cost if Korean)
  if (product.ai_summary && product.ai_summary.pros && langCode === 'ko') {
    return product.ai_summary;
  }

  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('VITE_GEMINI_API_KEY not set in .env');
  }

  let prompt = '';

  if (product.ai_summary && product.ai_summary.pros && langCode !== 'ko') {
    // 3. Translate existing DB summary to target language efficiently
    prompt = `Translate the following JSON object's string arrays ('keywords', 'pros', 'cons') into ${targetLang}. 
Keep the exact same JSON schema and do not change the 'sentiment_pos' integer.
Return ONLY valid JSON.

JSON to translate:
${JSON.stringify(product.ai_summary)}
`;
  } else {
    // 4. Analyze from raw reviews or product context into target language
    const reviews = product.reviews;

    if (reviews && reviews.length > 0) {
      // Real reviews available
      prompt = `Analyze the following Korean product reviews for "${product.name}".
Return ONLY valid JSON matching this exact schema. All string values (keywords, pros, cons) MUST BE WRITTEN IN ${targetLang}.
{
  "sentiment_pos": (integer 0-100),
  "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "pros": ["pro1", "pro2", "pro3"],
  "cons": ["con1", "con2", "con3"]
}

CRITICAL INSTRUCTION FOR CONS:
Never use vague or generic statements.
Extract highly specific product flaws mentioned by users.
If the reviews do not contain any specific negative feedback, simply output a statement in ${targetLang} saying no specific cons mentioned.

Reviews:
${reviews.join('\n').substring(0, 2000)}`;
    } else {
      // No real reviews - analyze based on product info
      const brand = product.brand || '';
      const reviewCountInfo = product.review_count > 0 ? `This product has ${product.review_count} reviews with an average rating of ${product.review_rating}/5.` : '';
      prompt = `You are analyzing a Korean beauty/fashion product: "${product.name}" by "${brand}".
${reviewCountInfo}
Based on publicly known information about this product and brand, provide a general analysis.
Return ONLY valid JSON matching this exact schema. All string values MUST BE WRITTEN IN ${targetLang}.
{
  "sentiment_pos": (integer 0-100),
  "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "pros": ["pro1", "pro2", "pro3"],
  "cons": ["con1", "con2", "con3"]
}

Provide realistic, specific analysis based on the product type and brand reputation. Do NOT make up fake reviews.`;
    }
  }

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

  // Save to language-specific local cache
  localStorage.setItem(cacheKey, JSON.stringify(result));

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
  const isPro = isProMember(profile);

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

  // Initial State: Use localized cache, or pre-calculated summary if Korean
  const langCode = window.i18n && window.i18n.currentLang ? window.i18n.currentLang : 'ko';
  const cacheKey = `ai_summary_${product.product_id || product.id}_${langCode}`;
  let aiData = null;

  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) aiData = JSON.parse(cached);
  } catch (e) { }

  if (!aiData && product.ai_summary && langCode === 'ko') {
    aiData = product.ai_summary;
  }

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

    if (sourceKey === 'steady_sellers') {
      // --- STEADY SELLER PRODUCT DETAIL ---
      const imgUrls = product.image_urls && product.image_urls.length > 0
        ? product.image_urls
        : (product.image_url ? [product.image_url] : []);
      const mainImg = imgUrls[0] || '';
      const desc = product.description || '';
      const formattedPrice = new Intl.NumberFormat().format(displayPrice || 0);
      const pSize = product.product_size || '';
      const pWeight = product.product_weight || '';
      const pNotes = product.notes || '';
      const pOptions = Array.isArray(product.options) ? product.options : [];

      // Build specs section
      const hasSpecs = pSize || pWeight;
      const specsHtml = hasSpecs ? `
        <div style="display:flex; gap:12px; margin-bottom:12px;">
          ${pSize ? `<div style="flex:1; background:#f8f9fa; border-radius:8px; padding:10px 12px;">
            <div style="font-size:11px; color:#888; margin-bottom:3px;">📐 ${window.t('modal.size') || '크기'}</div>
            <div style="font-size:14px; font-weight:600; color:#333;">${escapeHtml(pSize)}</div>
          </div>` : ''}
          ${pWeight ? `<div style="flex:1; background:#f8f9fa; border-radius:8px; padding:10px 12px;">
            <div style="font-size:11px; color:#888; margin-bottom:3px;">⚖️ ${window.t('modal.weight') || '무게/용량'}</div>
            <div style="font-size:14px; font-weight:600; color:#333;">${escapeHtml(pWeight)}</div>
          </div>` : ''}
        </div>
      ` : '';

      // Provide a global function for calculating total price based on option and quantity
      window.__calcSsTotal = function () {
        const sel = document.getElementById('ssOptionSelect');
        const qty = document.getElementById('ssOptionQty');
        const res = document.getElementById('ssOptionPrice');
        if (sel && qty && res) {
          const selectedOpt = sel.options[sel.selectedIndex];
          const p = selectedOpt ? selectedOpt.dataset.price : '';
          if (p) {
            const total = Number(p) * Math.max(1, parseInt(qty.value) || 1);
            res.textContent = '₩' + total.toLocaleString();
          } else {
            res.textContent = '₩0';
          }
        }
      };

      // Build options section - dropdown format with quantity
      const optionsHtml = pOptions.length > 0 ? `
        <div style="margin-bottom:14px;">
          <div style="font-size:12px; font-weight:600; color:#555; margin-bottom:8px;">🏷️ ${window.t('modal.options')}</div>
          <div style="display:flex; gap:10px; align-items:center; margin-bottom:8px;">
            <select id="ssOptionSelect" onchange="window.__calcSsTotal()"
              style="flex:3; padding:10px 12px; border-radius:8px; border:1px solid #ffe0b2; background:#fff8f0; font-size:13px; color:#333; cursor:pointer; appearance:auto; min-width:0;">
              <option value="" data-price="">${window.t('modal.select_option')}</option>
              ${pOptions.map(opt => `<option value="${escapeHtml(opt.name || '')}" data-price="${opt.price || 0}">${escapeHtml(opt.name || '')} — ₩${new Intl.NumberFormat().format(opt.price || 0)}</option>`).join('')}
            </select>
            <div style="flex:1; display:flex; align-items:center; background:#fff8f0; border:1px solid #ffe0b2; border-radius:8px; overflow:hidden;">
              <span style="font-size:12px; color:#888; padding-left:10px; white-space:nowrap;">${window.t('modal.quantity')}</span>
              <input type="number" id="ssOptionQty" value="1" min="1" oninput="window.__calcSsTotal()"
                style="width:100%; border:none; background:transparent; padding:10px 8px; text-align:right; font-size:13px; color:#333; outline:none;">
            </div>
          </div>
          <div id="ssOptionPriceRow" style="display:flex; justify-content:flex-end; align-items:center; padding:8px 12px; background:#fff3e0; border-radius:8px;">
            <span style="font-size:13px; color:#888; margin-right:8px;">${window.t('modal.estimated_price')}:</span>
            <span id="ssOptionPrice" style="font-size:18px; font-weight:700; color:#e65100;">₩0</span>
          </div>
        </div>
      ` : '';

      // Build notes section
      const notesHtml = pNotes ? `
        <div style="margin-bottom:14px; padding:10px 12px; background:#f0f4ff; border-radius:8px; border:1px solid #d0d8f0;">
          <div style="font-size:11px; color:#6b7db3; margin-bottom:3px;">📝 ${window.t('modal.notes')}</div>
          <div style="font-size:13px; color:#333; line-height:1.5;">${escapeHtml(pNotes)}</div>
        </div>
      ` : '';

      modalContent = `
        <div class="modal-upper ss-detail-upper">
          <div class="modal-image-col ss-gallery">
            <div class="ss-main-img-wrapper">
              <img id="ssMainImage" class="modal-img-fixed ss-main-img" src="${mainImg}" alt="${escapeHtml(getLocalizedName(product))}">
            </div>
            ${imgUrls.length > 1 ? `
              <div class="ss-thumb-row">
                ${imgUrls.map((url, i) => `
                  <img class="ss-thumb ${i === 0 ? 'ss-thumb-active' : ''}" src="${url}" alt="thumb ${i + 1}"
                    onclick="document.getElementById('ssMainImage').src='${url}'; document.querySelectorAll('.ss-thumb').forEach(t=>t.classList.remove('ss-thumb-active')); this.classList.add('ss-thumb-active');">
                `).join('')}
              </div>
            ` : ''}
          </div>
          <div class="modal-info-col ss-info">
            <div class="ss-brand-label">${escapeHtml(product.brand || '')}</div>
            <h2 class="ss-product-title product-name" data-pid="${product.id}">${escapeHtml(getLocalizedName(product))}</h2>
            <div class="ss-price-display">
              <span class="ss-price-currency">₩</span>
              <span class="ss-price-amount">${formattedPrice}</span>
            </div>
            ${specsHtml}
            ${desc ? `
              <div class="ss-description">
                <div class="ss-desc-label">${window.t('modal.product_info') || 'PRODUCT INFORMATION'}</div>
                <p class="ss-desc-text">${escapeHtml(desc)}</p>
              </div>
            ` : ''}
            ${notesHtml}
            ${optionsHtml}
            <button class="btn-store-link ss-sourcing-btn" onclick="window.__openSourcingFromSteady && window.__openSourcingFromSteady(${JSON.stringify({ name: product.name, brand: product.brand, price: displayPrice, image_url: mainImg }).replace(/"/g, '&quot;')})">
              📦 ${window.t('sourcing.request_quote') || 'Request Sourcing Quote'}
            </button>
          </div>
        </div>
      `;
    } else if (isTrendItem) {
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
              <div class="metric-value" id="modalReviewCount">${product.review_count > 0 ? formatNumber(product.review_count) : (product.review_rating > 5 ? '-' : formatNumber(product.review_count))}</div>
              ${product.review_rating && product.review_rating <= 5 ? `<div class="metric-sub" id="modalReviewRating">⭐ ${product.review_rating}</div>` : `<div class="metric-sub" id="modalReviewRating">${product.review_count > 0 ? '⭐ ' + product.review_rating : ''}</div>`}
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
            <button class="btn-store-premium" style="flex:1; background:#fff; color:#f06595; border:1px solid #f06595; padding:12px; border-radius:12px; font-weight:700; cursor:pointer;" onclick="window.__sourcingRequestFromModal('${(product.id || product.product_id)}')">
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

  // AI Load Handler
  window.loadAiData = async () => {
    isAiLoading = true;
    renderModal();
    // Re-load chart after re-render
    setTimeout(() => window.__setChartTab && window.__setChartTab('all'), 50);

    try {
      aiData = await fetchAiSummary(product);
    } catch (e) {
      console.error(e);
      alert('AI 분석 중 오류가 발생했습니다: ' + (e.message || 'API Key 확인 또는 할당량 초과'));
    } finally {
      isAiLoading = false;
      renderModal();
      setTimeout(() => window.__setChartTab && window.__setChartTab('all'), 50);
    }
  };

  // Fetch live review data if missing or unreliable, then run AI analysis
  const shouldFetchReviews = product.source === 'oliveyoung' &&
    (product.review_count === 0 || product.review_count === undefined || product.review_rating > 5);

  if (shouldFetchReviews && product.product_id) {
    // Try to fetch reviews from server in background
    (async () => {
      try {
        const serverPort = 6002;
        const resp = await fetch(`http://localhost:${serverPort}/api/product-reviews?goodsNo=${encodeURIComponent(product.product_id)}`);
        if (resp.ok) {
          const reviewData = await resp.json();
          if (reviewData.success) {
            // Update product object with real data
            if (reviewData.reviewCount > 0) product.review_count = reviewData.reviewCount;
            if (reviewData.rating > 0 && reviewData.rating <= 5) product.review_rating = reviewData.rating;
            if (reviewData.reviews && reviewData.reviews.length > 0) product.reviews = reviewData.reviews;

            // Update DOM elements if they exist
            const countEl = document.getElementById('modalReviewCount');
            const ratingEl = document.getElementById('modalReviewRating');
            if (countEl && product.review_count > 0) countEl.textContent = formatNumber(product.review_count);
            if (ratingEl && product.review_rating > 0 && product.review_rating <= 5) ratingEl.innerHTML = `⭐ ${product.review_rating}`;
          }
        }
      } catch (e) {
        console.warn('[Review Fetch] Server unavailable:', e.message);
      }

      // Run AI analysis after review fetch (whether it succeeded or not)
      if (!aiData) {
        window.loadAiData(false);
      }
    })();
  } else if (!aiData) {
    // No review fetch needed, run AI analysis directly
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
  try {
    const { ranks, prices } = await fetchProductHistory(productId, days);

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
  return data.filter(item => {
    const itemName = String(item.name || item.product_name || '').toLowerCase();
    const itemBrand = String(item.brand || item.brand_name || '').toLowerCase();
    return itemName.includes(q) || itemBrand.includes(q);
  });
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
// ─── Help Functions for Subscription & Masking ──────────────────────────────
/**
 * Check if the user is a PRO member (Admin or Active Pro with non-expired date)
 */
function isProMember(profile) {
  if (!profile) return false;
  if (profile.role === 'admin') return true;
  if (profile.subscription_tier !== 'pro') return false;

  if (!profile.subscription_expires_at) return false;
  const expiryDate = new Date(profile.subscription_expires_at);
  return expiryDate > new Date();
}

/**
 * Mask text for limited preview (e.g. "Samsung" -> "Sa****")
 */
function maskText(text) {
  if (!text) return '';
  const str = String(text);
  if (str.length <= 1) return '*';
  if (str.length <= 3) return str.substring(0, 1) + '**';
  return str.substring(0, 2) + '****';
}
// Expose to window for bridges
window.__isProMember = isProMember;
window.__maskText = maskText;
window.getProfile = getProfile;
// ─────────────────────────────────────────────────────────────────────────────

async function initNotificationSystem() {
  const session = getSession();
  if (!session) return;
  fetchAndRenderNotifications();
  // Poll every 60 seconds
  setInterval(fetchAndRenderNotifications, 60000);
}

function translateNotification(title, message, lang) {
  if (!lang || lang === 'ko') return { title, message };

  const translations = {
    en: {
      '📦 견적 출발 안내': '📦 Quote Preparation Started',
      '📦 견적 도착 안내': '📦 Quote Ready',
      '✅ 발주/배송 환료': '✅ Order/Delivery Completed',
      '❌ 요청 취소 안내': '❌ Request Canceled',
      '요청하신 소싱 제품의 견적 산출이 시작되었습니다.': 'We have started calculating the quote for the requested sourcing products.',
      '요청하신 소싱 건에 대한 총 예상 견적': 'A total estimated quote has been calculated for your sourcing request.',
      '요청하신 소싱 건의 발주 및 배송 처리가 완료되었습니다.': 'The order and delivery process for your sourcing request has been completed.',
      '요청하신 소싱 건이 취소되었습니다. 관리자 메시지를 확인해주세요.': 'Your sourcing request has been canceled. Please check the admin message.',
      '새로운 알림이 없습니다.': 'No new notifications.'
    },
    ja: {
      '📦 견적 출발 안내': '📦 見積開始の案内',
      '📦 견적 도착 안내': '📦 見積完了の案内',
      '✅ 발주/배송 환료': '✅ 発注/配送完了',
      '❌ 요청 취소 안내': '❌ リクエストキャンセル案内',
      '요청하신 소싱 제품의 견적 산출이 시작되었습니다.': 'リクエストされたソーシング製品の見積算出が開始されました。',
      '요청하신 소싱 건에 대한 총 예상 견적': 'ソーシング案件の総予想見積もりが算出されました。',
      '요청하신 소싱 건의 발주 및 배송 처리가 완료되었습니다.': 'ソーシング案件の発注および配送処理が完了しました。',
      '요청하신 소싱 건이 취소되었습니다. 관리자 메시지를 확인해주세요.': 'ソーシング案件がキャンセルされました。管理者メッセージを確認してください。',
      '새로운 알림이 없습니다.': '新しい通知はありません。'
    },
    th: {
      '📦 견적 출발 안내': '📦 แจ้งเริ่มดำเนินการประเมินราคา',
      '📦 견적 도착 안내': '📦 แจ้งการประเมินราคาเสร็จสิ้น',
      '✅ 발주/배송 환료': '✅ สั่งซื้อ/จัดส่งเสร็จสมบูรณ์',
      '❌ 요청 취소 안내': '❌ แจ้งยกเลิกคำขอ',
      '새로운 알림이 없습니다.': 'ไม่มีการแจ้งเตือนใหม่'
    },
    vi: {
      '📦 견적 출발 안내': '📦 Thông báo bắt đầu báo giá',
      '📦 견적 도착 안내': '📦 Thông báo báo giá đã sẵn sàng',
      '✅ 발주/배송 환료': '✅ Đơn hàng/Giao hàng hoàn tất',
      '❌ 요청 취소 안내': '❌ Thông báo hủy yêu cầu',
      '새로운 알림이 없습니다.': 'Không có thông báo mới'
    }
  };

  const dict = translations[lang] || translations['en'];
  let tTitle = dict[title] || title;
  let tMessage = message;

  // Handle dynamic price messages
  if (message.includes('총 예상 견적')) {
    const priceMatch = message.match(/\(([^)]+)\)/);
    const priceStr = priceMatch ? priceMatch[1] : '';
    if (lang === 'en') {
      tMessage = `A total estimated quote of ${priceStr} has been calculated for your sourcing request.`;
    } else if (lang === 'ja') {
      tMessage = `ソーシング案件の総予想見積もり(${priceStr})が算出されました。`;
    } else if (dict['요청하신 소싱 건에 대한 총 예상 견적']) {
      tMessage = dict['요청하신 소싱 건에 대한 총 예상 견적'] + (priceStr ? ` (${priceStr})` : '');
    }
  } else {
    tMessage = dict[message] || message;
  }

  return { title: tTitle, message: tMessage };
}

async function fetchAndRenderNotifications() {
  const session = getSession();
  if (!session) return;

  try {
    const res = await fetch(`/api/notifications?user_id=${session.user.id}&_t=${Date.now()}`, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0'
      }
    });
    if (!res.ok) return;
    const data = await res.json();
    if (data.success && data.notifications) {
      const badge = document.getElementById('notifBadge');
      const listBody = document.getElementById('notifList');
      if (!badge || !listBody) return;

      const allNotifs = data.notifications;
      const unreadCount = allNotifs.filter(n => !n.is_read).length;

      // Badge shows only unread count
      if (unreadCount > 0) {
        badge.style.display = 'block';
        badge.innerText = unreadCount > 99 ? '99+' : unreadCount;
      } else {
        badge.style.display = 'none';
      }

      if (allNotifs.length > 0) {
        const lang = (window.i18n && window.i18n.currentLang) || 'ko';
        const hasUnread = unreadCount > 0;

        // Update header actions
        const headerActions = document.querySelector('.notif-actions');
        if (headerActions) {
          headerActions.innerHTML = `
            ${hasUnread ? `<button class="notif-mark-read-btn" onclick="window.__markAllRead()">${lang === 'en' ? 'Mark all read' : '모두 읽음'}</button>` : ''}
            <button class="notif-clear-btn" onclick="window.__clearAllNotifs()">${lang === 'en' ? 'Clear all' : '모두 지우기'}</button>
          `;
        }

        listBody.innerHTML = allNotifs.map(n => {
          const { title: tTitle, message: tMsg } = translateNotification(n.title, n.message, lang);
          const langCode = lang === 'en' ? 'en-US' : (lang === 'ko' ? 'ko-KR' : lang);
          const readClass = n.is_read ? 'read' : 'unread';

          return `
            <div class="notif-item ${readClass}" data-nid="${n.id}" onclick="handleNotiClick('${n.id}', '${n.link || ''}')">
              <div class="notif-item-header">
                <div class="notif-title">${escapeHtml(tTitle)}</div>
                <button class="notif-delete-btn" onclick="event.stopPropagation(); window.__deleteNotif('${n.id}')" title="${lang === 'en' ? 'Delete' : '삭제'}">✕</button>
              </div>
              <div class="notif-message">${escapeHtml(tMsg)}</div>
              <div class="notif-time">${new Date(n.created_at).toLocaleString(langCode)}</div>
            </div>
          `;
        }).join('');
      } else {
        badge.style.display = 'none';
        const emptyMsg = (window.t && window.t('notifications.empty')) || '새로운 알림이 없습니다.';
        listBody.innerHTML = `<div style="color:var(--text-muted); font-size:13px; text-align:center; padding:40px 16px;">${emptyMsg}</div>`;

        // Hide actions when no notifs
        const headerActions = document.querySelector('.notif-actions');
        if (headerActions) headerActions.innerHTML = '';
      }
    }
  } catch (e) {
    console.error("Failed to fetch notifications:", e);
  }
}

// Alias for compatibility
window.renderNotifications = fetchAndRenderNotifications;

window.handleNotiClick = async function (id, link) {
  try {
    await fetch(`/api/notifications/${id}/read`, { method: 'PUT' });
    // Update UI immediately
    const item = document.querySelector(`.notif-item[data-nid="${id}"]`);
    if (item) {
      item.classList.remove('unread');
      item.classList.add('read');
    }
  } catch (e) { console.error(e); }

  // Refresh badge count
  fetchAndRenderNotifications();

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

// Delete individual notification
window.__deleteNotif = async function (id) {
  try {
    await fetch(`/api/notifications/${id}`, { method: 'DELETE' });
    // Remove from DOM immediately
    const item = document.querySelector(`.notif-item[data-nid="${id}"]`);
    if (item) item.remove();
    // Refresh badge and check if empty
    fetchAndRenderNotifications();
  } catch (e) {
    console.error('Delete notification error:', e);
  }
};

// Mark all as read  
window.__markAllRead = async function () {
  const session = getSession();
  if (!session) return;
  try {
    await fetch(`/api/notifications/mark-all-read?user_id=${session.user.id}`, { method: 'PUT' });
    fetchAndRenderNotifications();
  } catch (e) {
    console.error('Mark all read error:', e);
  }
};

// Clear all notifications
window.__clearAllNotifs = async function () {
  const session = getSession();
  if (!session) return;
  try {
    await fetch(`/api/notifications/clear?user_id=${session.user.id}`, { method: 'DELETE' });
    fetchAndRenderNotifications();
  } catch (e) {
    console.error('Clear notifications error:', e);
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

  // Re-render gender row to update active state
  const existingGenderRow = document.querySelector('.musinsa-gender-row');
  if (existingGenderRow && state.activeBridge && state.activeBridge.renderGenderRow) {
    const genderDiv = document.createElement('div');
    genderDiv.innerHTML = state.activeBridge.renderGenderRow(state);
    existingGenderRow.replaceWith(genderDiv.firstElementChild);
  }

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

  // Account Info
  const emailInput = document.getElementById('myPageEmail');
  const roleInput = document.getElementById('myPageRole');
  const phoneInput = document.getElementById('myPagePhone');
  const countryInput = document.getElementById('myPageCountry');
  const cityInput = document.getElementById('myPageCity');
  const zipInput = document.getElementById('myPageZip');
  const address1Input = document.getElementById('myPageAddress1');
  const address2Input = document.getElementById('myPageAddress2');

  if (emailInput && session) emailInput.value = session.user.email || '';
  if (roleInput) roleInput.value = profile?.role || 'user';
  if (phoneInput) phoneInput.value = profile?.phone || '';
  if (countryInput) countryInput.value = profile?.country || '';
  if (cityInput) cityInput.value = profile?.city || '';
  if (zipInput) zipInput.value = profile?.zip_code || '';
  if (address1Input) address1Input.value = profile?.address1 || '';
  if (address2Input) address2Input.value = profile?.address2 || '';

  // Fill Billing Tab
  const planBadge = document.getElementById('myPagePlanBadge');
  const planDesc = document.getElementById('myPagePlanDesc');
  const subscribedAt = document.getElementById('myPageSubscribedAt');
  const expiresAt = document.getElementById('myPageExpiresAt');
  const cancelBtn = document.getElementById('cancelSubscriptionBtn');
  const renewBtn = document.getElementById('renewSubscriptionBtn');
  const extendBtn = document.getElementById('extendSubscriptionBtn');

  const tier = (profile.subscription_tier || 'free').toLowerCase();
  const expiryDate = profile.subscription_expires_at ? new Date(profile.subscription_expires_at) : null;
  const isExpired = expiryDate ? expiryDate < new Date() : false;
  const effectiveTier = (tier === 'pro' && isExpired) ? 'free' : tier;

  // Calculate days remaining until expiry
  const now = new Date();
  const daysRemaining = expiryDate ? Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24)) : null;

  if (planBadge) {
    planBadge.textContent = effectiveTier === 'pro' ? 'Pro' : 'Free';
    planBadge.className = `plan-badge ${effectiveTier === 'pro' ? 'pro' : ''}`;
  }

  // Helper for Date Formatting
  const fmtDate = (date) => date ? new Date(date).toLocaleDateString(i18n.currentLang === 'ko' ? 'ko-KR' : 'en-US') : '-';

  if (subscribedAt) subscribedAt.textContent = fmtDate(profile.created_at);

  // === Subscription Button Visibility Logic ===
  // Hide all subscription buttons first
  if (renewBtn) renewBtn.style.display = 'none';
  if (extendBtn) extendBtn.style.display = 'none';
  if (cancelBtn) cancelBtn.style.display = 'none';

  // Detect trial user: Pro tier, no subscription_id, account created within 14 days
  const createdDate = profile.created_at ? new Date(profile.created_at) : null;
  const daysSinceCreation = createdDate ? Math.ceil((now - createdDate) / (1000 * 60 * 60 * 24)) : null;
  const isTrial = effectiveTier === 'pro' && !profile.subscription_id && daysSinceCreation !== null && daysSinceCreation <= 14;

  if (planDesc) {
    if (profile.role === 'admin') {
      planDesc.textContent = window.t('mypage.status_admin');
    } else if (tier === 'pro' && isExpired) {
      // Expired PRO → show Renew button
      const dateStr = fmtDate(expiryDate);
      planDesc.textContent = `${window.t('mypage.status_expired')} (${dateStr})`;
      if (renewBtn) renewBtn.style.display = 'block';
    } else if (isTrial) {
      // Trial user (Pro trial, no subscription)
      const dateStr = fmtDate(expiryDate);
      planDesc.textContent = window.t('mypage.status_trial').replace('{date}', dateStr);
      if (renewBtn) renewBtn.style.display = 'block';
    } else if (effectiveTier === 'pro') {
      if (profile.subscription_id) {
        // Active auto-renewing PRO
        planDesc.textContent = window.t('mypage.status_pro_active');
        if (cancelBtn) cancelBtn.style.display = 'block';
        // If expiring within 7 days, show Extend too
        if (daysRemaining !== null && daysRemaining <= 7) {
          if (extendBtn) extendBtn.style.display = 'block';
        }
      } else {
        // PRO but cancelled (no auto-renew) – still active until expiry
        const dateStr = fmtDate(expiryDate);
        planDesc.textContent = window.t('mypage.status_pro_cancelled').replace('{date}', dateStr);
        // If expiring within 7 days, show Extend option
        if (daysRemaining !== null && daysRemaining <= 7) {
          if (extendBtn) extendBtn.style.display = 'block';
        }
      }
    } else {
      // Free tier
      planDesc.textContent = window.t('mypage.status_free');
      // Show Renew (upgrade) for free users
      if (renewBtn) renewBtn.style.display = 'block';
    }
  }

  if (expiresAt) {
    if (profile.role === 'admin') {
      expiresAt.textContent = window.t('mypage.status_admin');
    } else if (expiryDate) {
      const dateStr = fmtDate(expiryDate);
      if (isExpired) {
        expiresAt.textContent = `${window.t('mypage.status_expired')} (${dateStr})`;
        expiresAt.style.color = 'var(--accent-red, #e03131)';
      } else if (isTrial) {
        expiresAt.textContent = `${dateStr}`;
        expiresAt.style.color = 'var(--accent-blue)';
      } else if (profile.subscription_id) {
        expiresAt.textContent = `${dateStr} (${window.t('mypage.status_auto_renew')})`;
        expiresAt.style.color = 'var(--accent-blue)';
      } else {
        expiresAt.textContent = `${dateStr} (${window.t('mypage.status_no_renew')})`;
        expiresAt.style.color = 'var(--text-secondary)';
      }
      // Show "D-day" badge if expiring soon
      if (!isExpired && daysRemaining !== null && daysRemaining <= 7) {
        expiresAt.textContent += ` ⚠️ D-${daysRemaining}`;
        expiresAt.style.color = '#e67e22';
      }
    } else {
      expiresAt.textContent = '무제한';
    }
  }

  // Set default tab to account
  switchMyPageTab('account');

  // Open modal
  modal.classList.add('open');
  document.body.classList.add('one-page');
};

// ─── Account Management ──────────────────────
document.getElementById('btnSaveProfile')?.addEventListener('click', async () => {
  const session = getSession();
  if (!session) return;
  const phone = document.getElementById('myPagePhone')?.value || '';
  const country = document.getElementById('myPageCountry')?.value || '';
  const city = document.getElementById('myPageCity')?.value || '';
  const zip_code = document.getElementById('myPageZip')?.value || '';
  const address1 = document.getElementById('myPageAddress1')?.value || '';
  const address2 = document.getElementById('myPageAddress2')?.value || '';

  const btn = document.getElementById('btnSaveProfile');
  const origText = btn.innerText;
  btn.innerText = window.t('common.saving') || '저장 중...';
  btn.disabled = true;

  try {
    const { updateUserProfile } = await import('./supabase.js');
    const { error } = await updateUserProfile(session.user.id, {
      phone, country, city, zip_code, address1, address2
    });
    if (error) throw new Error(error.message || (window.t('common.save_failed') || '저장 실패'));
    alert(window.t('mypage.save_success') || '계정 정보가 성공적으로 저장되었습니다.');
  } catch (e) {
    alert((window.t('common.error') || '오류: ') + e.message);
  } finally {
    btn.innerText = origText;
    btn.disabled = false;
  }
});

document.getElementById('btnDeleteAccount')?.addEventListener('click', async () => {
  const siteLang = i18n?.currentLang || 'ko';
  const confirmMsg = siteLang === 'ko'
    ? '정말 회원 탈퇴를 진행하시겠습니까?\n\n• 모든 데이터(프로필, 관심상품, 견적내역 등)가 영구 삭제됩니다.\n• 활성 구독이 있다면 자동으로 해지됩니다.\n• 이 작업은 되돌릴 수 없습니다.'
    : 'Are you sure you want to delete your account?\n\n• All data (profile, wishlists, quotes, etc.) will be permanently deleted.\n• Active subscriptions will be automatically cancelled.\n• This action cannot be undone.';

  if (!confirm(confirmMsg)) return;

  // Double confirm for safety
  const doubleConfirm = siteLang === 'ko'
    ? '마지막 확인: 정말로 탈퇴하시겠습니까?'
    : 'Final confirmation: Are you sure?';
  if (!confirm(doubleConfirm)) return;

  const session = getSession();
  if (!session) return;

  const btn = document.getElementById('btnDeleteAccount');
  const origText = btn.innerText;
  btn.innerText = siteLang === 'ko' ? '처리 중...' : 'Processing...';
  btn.disabled = true;

  try {
    const res = await fetch('/api/user/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: session.user.id })
    });
    const data = await res.json();

    if (data.success) {
      alert(siteLang === 'ko'
        ? '탈퇴 처리가 완료되었습니다. 이용해 주셔서 감사합니다.'
        : 'Account deleted successfully. Thank you for using our service.');
      // Clear local storage and redirect
      localStorage.clear();
      window.location.href = '/';
    } else {
      throw new Error(data.error || '탈퇴 처리 실패');
    }
  } catch (e) {
    alert((siteLang === 'ko' ? '오류: ' : 'Error: ') + e.message);
    btn.innerText = origText;
    btn.disabled = false;
  }
});

function switchMyPageTab(tabName) {
  const accountTab = document.getElementById('myPageAccountTab');
  const billingTab = document.getElementById('myPageBillingTab');
  const supportTab = document.getElementById('myPageSupportTab');
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
  if (supportTab) supportTab.style.display = tabName === 'support' ? 'block' : 'none';

  if (tabName === 'support') {
    window.loadFaqs();
  }

  // Render PayPal button when billing tab is open
  if (tabName === 'billing') {
    const profile = getProfile() || {};
    const tier = (profile.subscription_tier || 'free').toLowerCase();
    const expiryDate = profile.subscription_expires_at ? new Date(profile.subscription_expires_at) : null;
    const isExpired = expiryDate ? expiryDate < new Date() : false;
    const effectiveTier = (tier === 'pro' && isExpired) ? 'free' : tier;

    // Determine if PayPal button should show (for non-active-pro users)
    if (effectiveTier !== 'pro') {
      // Small delay to ensure container is ready in DOM
      setTimeout(() => renderPayPalButtons(), 100);
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

  // Cancel Subscription Handler
  const cancelBtn = document.getElementById('cancelSubscriptionBtn');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', async () => {
      const siteLang = i18n.currentLang || 'ko';
      const msg = siteLang === 'ko'
        ? '정말로 구독을 해지하시겠습니까?\n이번 결제 주기(만료일)까지만 Pro 혜택이 유지되며 이후에는 더 이상 자동 연장 결제되지 않습니다.'
        : 'Are you sure you want to cancel your subscription?\nPro benefits will remain until the end of the current billing cycle, and you will not be charged again.';

      if (!confirm(msg)) {
        return;
      }

      const session = getSession();
      if (!session) return alert('로그인이 필요합니다. / Login required.');

      cancelBtn.disabled = true;
      cancelBtn.textContent = '처리 중... / Processing...';
      cancelBtn.style.opacity = '0.5';

      try {
        const res = await fetch('/api/paypal/cancel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: session.user.id })
        });
        const data = await res.json();

        if (data.success) {
          alert(siteLang === 'ko' ? '구독 해지가 완료되었습니다. 만료일까지 Pro 혜택이 유지됩니다.' : 'Subscription cancelled. Pro benefits remain until expiry date.');
          window.location.reload();
        } else {
          alert(data.error || '해지 실패. 관리자에게 문의하세요. / Cancellation failed.');
        }
      } catch (err) {
        alert('오류가 발생했습니다. / An error occurred.');
        console.error(err);
      } finally {
        cancelBtn.disabled = false;
        cancelBtn.textContent = window.t('mypage.btn_cancel') || '🚫 구독 해지 (Cancel)';
        cancelBtn.style.opacity = '1';
      }
    });
  }

  // ToS Checkbox Logic
  const tosCheckbox = document.getElementById('tosCheckbox');
  const paypalBlocker = document.getElementById('paypalBlocker');
  if (tosCheckbox && paypalBlocker) {
    tosCheckbox.addEventListener('change', (e) => {
      if (e.target.checked) {
        paypalBlocker.style.display = 'none';
      } else {
        // Only show blocker if paypal container is also visible
        const pp = document.getElementById('paypal-button-container');
        if (pp && pp.style.display !== 'none') {
          paypalBlocker.style.display = 'block';
        }
      }
    });
  }

});


let paypalButtonsRendered = false;
let currentSubscriptionPeriod = 'yearly'; // 'monthly' | 'yearly' - Initial selection is Annual (Active)

function renderPayPalButtons() {
  const ppContainer = document.getElementById('paypal-button-container');
  console.log('[PayPal Debug] renderPayPalButtons called. Container:', ppContainer ? 'Found' : 'NOT Found');

  if (!ppContainer) return;

  // Reset flag if container was emptied (e.g. navigating away and back)
  if (paypalButtonsRendered && ppContainer.children.length === 0) {
    console.log('[PayPal Debug] Container was emptied, resetting rendered flag.');
    paypalButtonsRendered = false;
  }

  // Always re-render if period changed, so clear out children manually here in upcoming step
  // But wait, the previous code had a short circuit. Let's remove the short circuit
  // if we are explicitly re-rendering for a tier change.
  // Actually, to make toggle work seamlessly, we will just clear it if period changed.

  // Typo check: Handle both VITE_PAYPAL_PLAN_ID_YEARLY and VITE_PAYPAY_PLAN_ID_YEARLY
  const VITE_PAYPAL_PLAN_ID = (import.meta.env.VITE_PAYPAL_PLAN_ID || '').trim();
  const VITE_PAYPAL_PLAN_ID_YEARLY = (import.meta.env.VITE_PAYPAL_PLAN_ID_YEARLY || import.meta.env.VITE_PAYPAY_PLAN_ID_YEARLY || '').trim();

  let planId = VITE_PAYPAL_PLAN_ID;
  if (currentSubscriptionPeriod === 'yearly') {
    planId = VITE_PAYPAL_PLAN_ID_YEARLY || VITE_PAYPAL_PLAN_ID;
  }

  const clientId = (import.meta.env.VITE_PAYPAL_CLIENT_ID || '').trim();
  console.log('[PayPal Debug] Starting render with PlanID:', planId, 'ClientID:', clientId, 'Period:', currentSubscriptionPeriod);

  if (!planId || !clientId) {
    console.error('[PayPal Debug] PayPal Plan ID or Client ID is missing');
    alert('결제 설정이 누락되었습니다. 관리자에게 문의해주세요.');
    return;
  }

  // Dynamically load PayPal SDK if not already loaded
  if (typeof paypal === 'undefined') {
    const existingScript = document.getElementById('paypal-sdk-script');
    if (!existingScript) {
      console.log('[PayPal Debug] Injecting PayPal SDK script dynamically...');
      const script = document.createElement('script');
      script.id = 'paypal-sdk-script';
      script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&vault=true&intent=subscription&currency=USD`;
      script.setAttribute('data-sdk-integration-source', 'button-factory');
      script.onload = () => {
        console.log('[PayPal Debug] PayPal SDK loaded directly, re-calling render...');
        renderPayPalButtons();
      };
      script.onerror = () => {
        console.error('[PayPal Debug] Failed to load PayPal SDK');
        alert('결제 모듈을 불러오는데 실패했습니다.');
      };
      document.head.appendChild(script);
    } else {
      console.warn('[PayPal Debug] PayPal SDK script exists but paypal is undefined. Waiting...');
      setTimeout(renderPayPalButtons, 500);
    }
    return;
  }

  // Clear container and show loading state
  ppContainer.innerHTML = '<div id="paypal-loading" style="text-align:center; padding:20px; color:#64748b; font-size:14px;"><span class="spinner" style="display:inline-block; width:16px; height:16px; border:2px solid #e2e8f0; border-top-color:#4351b6; border-radius:50%; animation:spin 0.8s linear infinite; margin-right:8px; vertical-align:middle;"></span>결제 버튼 로딩 중...</div>';

  if (!document.getElementById('paypal-spin-style')) {
    const style = document.createElement('style');
    style.id = 'paypal-spin-style';
    style.innerHTML = '@keyframes spin { to { transform: rotate(360deg); } }';
    document.head.appendChild(style);
  }

  // Check eligibility for subscriptions
  const buttons = paypal.Buttons({
    style: {
      shape: 'rect',
      color: 'gold',
      layout: 'vertical',
      label: 'subscribe'
    },
    createSubscription: function (data, actions) {
      console.log('[PayPal Debug] Creating subscription with Plan ID:', planId);
      return actions.subscription.create({
        plan_id: planId,
        application_context: {
          brand_name: 'Kvantlab',
          shipping_preference: 'NO_SHIPPING',
          user_action: 'SUBSCRIBE_NOW'
        }
      });
    },
    onApprove: async function (data, actions) {
      console.log('[PayPal Debug] PayPal subscription approved:', data.subscriptionID);
      const session = getSession();
      if (!session) {
        alert('로그인이 필요합니다.');
        return;
      }
      try {
        const res = await fetch('/api/subscription/activate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: session.user.id,
            subscriptionId: data.subscriptionID
          })
        });
        const result = await res.json();
        if (result.success) {
          alert(i18n.currentLang === 'ko'
            ? '🎉 Pro 구독이 활성화되었습니다!'
            : '🎉 Pro subscription activated!');
          window.location.reload();
        } else {
          alert(result.error || '구독 활성화 실패');
        }
      } catch (err) {
        console.error('[PayPal Debug] Subscription activation error:', err);
        alert('오류가 발생했습니다. / An error occurred.');
      }
    },
    onError: function (err) {
      console.error('[PayPal Debug] onError triggered:', err);
      console.error('[PayPal Debug] Error details:', JSON.stringify(err, Object.getOwnPropertyNames(err)));
      const errMsg = err?.message || JSON.stringify(err) || 'Unknown PayPal Error';
      alert('PayPal 결제 중 오류가 발생했습니다!\nPlan ID: ' + planId + '\n에러 내용: ' + errMsg + '\n\n참고: 시크릿 모드/사파리인 경우 작동하지 않을 수 있습니다. 일반 브라우저에서 다시 시도해주세요.');
    },
    onCancel: function () {
      console.log('[PayPal Debug] PayPal subscription cancelled by user');
    }
  });

  if (buttons.isEligible()) {
    console.log('[PayPal Debug] Buttons are eligible, rendering now...');
    buttons.render('#paypal-button-container').then(() => {
      const loader = document.getElementById('paypal-loading');
      if (loader) loader.remove();
    }).catch(err => {
      console.error('[PayPal Debug] Render failed:', err);
    });
    paypalButtonsRendered = true;
  } else {
    console.error('[PayPal Debug] Buttons are NOT eligible for this account/configuration.');
    ppContainer.innerHTML = '<div style="color:#e03131; font-size:13px; text-align:center; padding:10px;">결제 버튼을 불러올 수 없습니다. (Ineligible)</div>';
  }
}
// Renew Subscription Handler (for expired or free users → toggle PayPal flow)
const renewBtn = document.getElementById('renewSubscriptionBtn');
if (renewBtn) {
  renewBtn.addEventListener('click', () => {
    const ppContainer = document.getElementById('paypal-button-container');
    const tosContainer = document.getElementById('tos-container');
    const subscriptionCards = document.getElementById('subscriptionCards');

    if (!ppContainer) return;

    const isVisible = ppContainer.style.display !== 'none';
    if (isVisible) {
      ppContainer.style.display = 'none';
      if (tosContainer) tosContainer.style.display = 'none';
      if (subscriptionCards) subscriptionCards.style.display = 'none';

      const siteLang = typeof i18n !== 'undefined' ? i18n.currentLang : 'ko';
      renewBtn.textContent = siteLang === 'ko' ? '구독 시작하기' : 'Start Subscription';
      renewBtn.style.background = '#4351b6';
    } else {
      if (tosContainer) tosContainer.style.display = 'block';
      if (subscriptionCards) subscriptionCards.style.display = 'flex';
      ppContainer.style.display = 'block';
      ppContainer.style.marginBottom = '16px';

      const tosCheck = document.getElementById('tosCheckbox');
      const blocker = document.getElementById('paypalBlocker');
      if (blocker && tosCheck) {
        blocker.style.display = tosCheck.checked ? 'none' : 'block';
      }

      ppContainer.innerHTML = ''; // Force clear for re-render
      paypalButtonsRendered = false;
      renderPayPalButtons(); // Render PayPal buttons

      ppContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const siteLang = typeof i18n !== 'undefined' ? i18n.currentLang : 'ko';
      renewBtn.textContent = siteLang === 'ko' ? '✕ 결제창 닫기' : '✕ Close Payment';
      renewBtn.style.background = '#64748b'; // generic gray to indicate close
    }
  });
}

// Subscription Period Toggle Handlers
const cardMonthly = document.getElementById('cardMonthly');
const cardYearly = document.getElementById('cardYearly');

function updateToggleUI() {
  if (!cardMonthly || !cardYearly) return;

  if (currentSubscriptionPeriod === 'monthly') {
    cardMonthly.classList.add('active');
    cardYearly.classList.remove('active');
  } else {
    cardYearly.classList.add('active');
    cardMonthly.classList.remove('active');
  }
}

if (cardMonthly) {
  cardMonthly.addEventListener('click', () => {
    if (currentSubscriptionPeriod === 'monthly') return;
    currentSubscriptionPeriod = 'monthly';
    updateToggleUI();

    // Re-render paypal buttons if visible - DEFERRED to fix UI lag
    const pp = document.getElementById('paypal-button-container');
    if (pp && pp.style.display !== 'none') {
      pp.innerHTML = '<div style="text-align:center; padding:20px; color:#64748b;">...</div>'; // Quick placeholder
      setTimeout(() => {
        paypalButtonsRendered = false;
        renderPayPalButtons();
      }, 10);
    }
  });
}

if (cardYearly) {
  cardYearly.addEventListener('click', () => {
    if (currentSubscriptionPeriod === 'yearly') return;
    currentSubscriptionPeriod = 'yearly';
    updateToggleUI();

    // Re-render paypal buttons if visible - DEFERRED to fix UI lag
    const pp = document.getElementById('paypal-button-container');
    if (pp && pp.style.display !== 'none') {
      pp.innerHTML = '<div style="text-align:center; padding:20px; color:#64748b;">...</div>'; // Quick placeholder
      setTimeout(() => {
        paypalButtonsRendered = false;
        renderPayPalButtons();
      }, 10);
    }
  });
}

// Extend Subscription Handler (for users expiring soon → toggle PayPal flow)
const extendBtn = document.getElementById('extendSubscriptionBtn');
if (extendBtn) {
  extendBtn.addEventListener('click', () => {
    const ppContainer = document.getElementById('paypal-button-container');
    const tosContainer = document.getElementById('tos-container');
    const subscriptionCards = document.getElementById('subscriptionCards');
    if (!ppContainer) return;

    const isVisible = ppContainer.style.display !== 'none';
    if (isVisible) {
      ppContainer.style.display = 'none';
      if (tosContainer) tosContainer.style.display = 'none';
      if (subscriptionCards) subscriptionCards.style.display = 'none';

      const siteLang = typeof i18n !== 'undefined' ? i18n.currentLang : 'ko';
      extendBtn.textContent = siteLang === 'ko' ? '⏳ 구독 연장 (Extend)' : '⏳ Extend Subscription';
    } else {
      if (tosContainer) tosContainer.style.display = 'block';
      if (subscriptionCards) subscriptionCards.style.display = 'flex';
      ppContainer.style.display = 'block';
      ppContainer.style.marginBottom = '16px';

      const tosCheck = document.getElementById('tosCheckbox');
      const blocker = document.getElementById('paypalBlocker');
      if (blocker && tosCheck) {
        blocker.style.display = tosCheck.checked ? 'none' : 'block';
      }

      ppContainer.innerHTML = ''; // Force clear for re-render
      paypalButtonsRendered = false;
      renderPayPalButtons(); // Render PayPal buttons

      ppContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const siteLang = typeof i18n !== 'undefined' ? i18n.currentLang : 'ko';
      extendBtn.textContent = siteLang === 'ko' ? '✕ 결제창 닫기' : '✕ Close Payment';
    }
  });
}

// ─── Sourcing Quote Request ────────────────
window.openQuoteModal = function (directItems = null) {
  let items = [];

  if (directItems && Array.isArray(directItems) && directItems.length > 0) {
    items = directItems;
  } else {
    const inputs = document.querySelectorAll('#wishlistGrid .sourcing-qty-input');
    inputs.forEach(input => {
      const card = input.closest('.product-card');
      const checkbox = card ? card.querySelector('.sourcing-item-checkbox') : null;
      if (checkbox && !checkbox.checked) return;

      const qty = parseInt(input.value) || 0;
      if (qty > 0) {
        const lang = i18n.currentLang;
        let name = 'Unknown';
        let brand = '';

        if (card) {
          const nameKo = card.getAttribute('data-name-ko');
          const nameEn = card.getAttribute('data-name-en');
          const brandKo = card.getAttribute('data-brand-ko');
          const brandEn = card.getAttribute('data-brand-en');
          // translateProducts() updates the visible .product-name text to the translated version
          const visibleName = card.querySelector('.product-name')?.innerText || '';
          const visibleBrand = card.querySelector('.product-brand')?.innerText || '';

          if (lang === 'ko') {
            name = nameKo || visibleName || 'Unknown';
            brand = brandKo || visibleBrand || '';
          } else {
            // Prefer the visible (already translated) text, then data-name-en, then Korean fallback
            name = (nameEn && nameEn.trim()) || visibleName || nameKo || 'Unknown';
            brand = (brandEn && brandEn.trim()) || visibleBrand || brandKo || '';
          }
        }

        const pid = input.getAttribute('data-product-id');
        const img = card ? (card.querySelector('img')?.src || '') : '';
        const priceText = card ? (card.querySelector('.product-price')?.innerText?.replace(/[^\d]/g, '') || '0') : '0';
        const price = parseInt(priceText) || 0;
        const source = card ? (card.querySelector('.product-source')?.innerText || 'Wishlist') : 'Wishlist';
        items.push({
          product_id: pid,
          name,
          brand,
          qty: qty,
          quantity: qty,
          image_url: img,
          price: price,
          source: source
        });
      }
    });
  }

  if (items.length === 0) {
    alert(window.t('sourcing.alert_empty_cart') || '장바구니가 비어 있습니다.');
    return;
  }

  // Add items to the global Sourcing cart
  if (!window.__srcCartItems) window.__srcCartItems = [];
  items.forEach(newItem => {
    const exists = window.__srcCartItems.some(it => String(it.product_id) === String(newItem.product_id));
    if (!exists) {
      window.__srcCartItems.push(newItem);
    }
  });

  // Navigate to Sourcing tab and render
  window.switchMainTab('sourcing');
  if (window.__srcRenderCart) {
    window.__srcRenderCart(window.__srcCartItems);
  }

  // Ensure placeholders are loaded
  if (typeof applyI18nPlaceholders === 'function') applyI18nPlaceholders();
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
    if (val < 5) val = 5;
    input.value = val;
  }
};

// ─── Quote Modal: Multi-SNS + Image Upload ────────────────
let __quoteImageFiles = [];

window.__addSnsInput = function () {
  const container = document.getElementById('quoteSnsLinksContainer');
  if (!container) return;
  const rows = container.querySelectorAll('.sns-link-row');
  if (rows.length >= 5) return;
  const placeholder = window.t('sourcing.modal_sns_placeholder') || '📌 SNS 링크 / 상품 URL';
  const row = document.createElement('div');
  row.className = 'sns-link-row';
  row.style.cssText = 'display: flex; flex-direction: column; gap: 4px; margin-bottom: 4px;';
  row.innerHTML = `
    <div style="display: flex; gap: 6px; align-items: center;">
      <input type="url" class="form-input quote-sns-input" placeholder="${placeholder}"
        style="flex:1; padding: 10px 12px; border: 1px solid var(--border); border-radius: 8px; font-size: 13px;"
        oninput="window.__validateSnsInput(this)">
      <button type="button" onclick="window.__removeSnsInput(this)"
        style="padding: 8px 11px; border-radius: 8px; border: 1px solid #e03131; background: transparent; color: #e03131; font-size: 16px; cursor: pointer; font-weight: 700; line-height: 1;">−</button>
    </div>
    <div class="sns-error" style="display:none; font-size:11px; color:#e03131; padding-left:2px;">올바른 URL 형식을 입력해주세요. (예: https://www.instagram.com/...)</div>`;
  container.appendChild(row);
};

window.__removeSnsInput = function (btn) {
  const row = btn.closest('.sns-link-row');
  if (row) row.remove();
};

window.__validateSnsInput = function (input) {
  const val = input.value.trim();
  const row = input.closest('.sns-link-row');
  const errEl = row ? row.querySelector('.sns-error') : null;
  if (!val) {
    input.style.borderColor = 'var(--border)';
    if (errEl) errEl.style.display = 'none';
    return true;
  }
  let isValid = false;
  try {
    const url = new URL(val);
    isValid = (url.protocol === 'http:' || url.protocol === 'https:');
  } catch (_) { isValid = false; }
  if (isValid) {
    input.style.borderColor = 'var(--accent-green, #34c759)';
    if (errEl) errEl.style.display = 'none';
  } else {
    input.style.borderColor = '#e03131';
    if (errEl) errEl.style.display = 'block';
  }
  return isValid;
};

window.__previewQuoteImages = function (files) {
  const MAX_SIZE_MB = 5;
  const allowed = [];
  const rejected = [];
  Array.from(files).forEach(file => {
    if (!file.type.startsWith('image/')) {
      rejected.push(`${file.name} (이미지 파일만 업로드 가능합니다)`);
    } else if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      rejected.push(`${file.name} (파일 크기가 5MB를 초과합니다)`);
    } else {
      allowed.push(file);
    }
  });
  if (rejected.length > 0) {
    alert('⚠️ 업로드 불가 파일:\n' + rejected.join('\n'));
  }
  const newFiles = allowed.slice(0, 5 - __quoteImageFiles.length);
  __quoteImageFiles.push(...newFiles);
  if (__quoteImageFiles.length > 5) __quoteImageFiles = __quoteImageFiles.slice(0, 5);
  renderQuoteImagePreviews();
};

window.__handleQuoteImageDrop = function (event) {
  const files = event.dataTransfer.files;
  window.__previewQuoteImages(files);
  const zone = document.getElementById('quoteImageDropZone');
  if (zone) zone.style.borderColor = 'var(--border)';
};

window.__removeQuoteImage = function (index) {
  __quoteImageFiles.splice(index, 1);
  renderQuoteImagePreviews();
};

function renderQuoteImagePreviews() {
  const container = document.getElementById('quoteImagePreviews');
  if (!container) return;
  container.innerHTML = __quoteImageFiles.map((f, i) => {
    const url = URL.createObjectURL(f);
    return `<div style="position:relative; width:64px; height:64px;">
      <img src="${url}" style="width:64px; height:64px; object-fit:cover; border-radius:8px; border:1px solid var(--border);">
      <button onclick="window.__removeQuoteImage(${i})" style="position:absolute; top:-5px; right:-5px; width:18px; height:18px; border-radius:50%; background:#e03131; color:white; font-size:10px; border:none; cursor:pointer; line-height:18px; text-align:center;">×</button>
    </div>`;
  }).join('');
}

// Update placeholder translations dynamically (for id-i18n-placeholder attributes)
function applyI18nPlaceholders() {
  document.querySelectorAll('[id-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('id-i18n-placeholder');
    const translated = window.t(key);
    if (translated) el.placeholder = translated;
  });
}
// Hook into the existing applyTranslations call
const _origApply = window.applyTranslations;
if (typeof _origApply === 'function') {
  window.applyTranslations = function (...args) {
    _origApply(...args);
    applyI18nPlaceholders();
  };
}

window.submitQuoteRequest = async function () {
  const btn = document.getElementById('btnSubmitQuote');

  if (btn) {
    btn.disabled = true;
    btn.innerText = window.t('sourcing.btn_submitting');
  }

  try {
    const session = getSession();
    if (!session) throw new Error(window.t('sourcing.alert_login'));

    // Collect items from cart
    const cartItems = (window.__srcCartItems || []).map(item => {
      const card = document.querySelector(`.src-cart-card[data-product-id="${item.product_id}"]`);
      const qtyInput = card?.querySelector('.src-cart-qty');
      const memoInput = card?.querySelector('.src-cart-memo');
      return {
        product_id: item.product_id,
        name: item.name,
        brand: item.brand || '',
        image_url: item.image_url || '',
        quantity: parseInt(qtyInput?.value) || item.qty || 1,
        memo: memoInput?.value?.trim() || ''
      };
    });

    // Collect per-row URL data
    const snsLinks = [];
    const urlItems = [];
    let hasInvalidLink = false;
    document.querySelectorAll('#srcUrlList .src-url-row-block').forEach(block => {
      const urlInput = block.querySelector('.src-url-input');
      const qtyInput = block.querySelector('.src-url-qty');
      const memoInput = block.querySelector('.src-url-memo');
      const url = urlInput?.value?.trim();
      if (url) {
        const valid = window.__validateSnsInput(urlInput);
        if (!valid) { hasInvalidLink = true; return; }
        snsLinks.push(url);
        urlItems.push({
          name: url,
          quantity: parseInt(qtyInput?.value) || 1,
          memo: memoInput?.value?.trim() || ''
        });
      }
    });

    if (hasInvalidLink) {
      alert(window.t('sourcing.alert_invalid_url') || '⚠️ 올바른 URL 형식이 아닌 링크가 있습니다.');
      return;
    }

    // Collect image tab data
    let imageUrls = [];
    const imageQty = document.getElementById('srcImageQty')?.value || 1;
    const imageMemo = document.getElementById('srcImageMemo')?.value?.trim() || '';

    if (window.__quoteImageFiles && window.__quoteImageFiles.length > 0) {
      if (btn) btn.innerText = window.t('sourcing.btn_uploading') || '이미지 업로드 중...';
      const formData = new FormData();
      window.__quoteImageFiles.forEach(file => {
        formData.append('images', file);
      });

      const uploadRes = await fetch('/api/sourcing/upload', {
        method: 'POST',
        body: formData
      });
      const uploadData = await uploadRes.json();
      if (!uploadData.success) {
        throw new Error(uploadData.error || 'Failed to upload images');
      }
      imageUrls = uploadData.urls;

      // Optionally treat the "image request" as an item if cart/urls were empty
      // but the original spec might just group them. Let's add a dummy item for images if everything else is empty
      // so it shows up neatly in the history product cell.
      if (cartItems.length === 0 && urlItems.length === 0) {
        urlItems.push({
          name: 'Image Request',
          quantity: parseInt(imageQty) || 1,
          memo: imageMemo
        });
      }
    }

    // Merge all items
    const items = [...cartItems];
    urlItems.forEach(u => items.push(u));

    // Build user message from url memos and image memo (keeping legacy behavior)
    let userMessage = '';
    if (imageMemo && urlItems.length === 0 && cartItems.length === 0) userMessage += imageMemo; // only add if we didn't push as dummy item, or just keep it simple

    if (items.length === 0 && snsLinks.length === 0 && imageUrls.length === 0) {
      throw new Error(window.t('sourcing.alert_empty_cart'));
    }

    if (btn) btn.innerText = window.t('sourcing.btn_submitting');

    const res = await fetch('/api/sourcing/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: session.user.id,
        user_email: session.user.email,
        items,
        user_message: userMessage,
        sns_links: snsLinks,
        image_urls: imageUrls
      })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || window.t('sourcing.alert_fail'));

    alert(window.t('sourcing.alert_success'));

    // Fix: Remove 'one-page' class if it was left over from a product modal
    document.body.classList.remove('one-page');

    // Reset form
    window.__srcCartItems = [];
    if (window.__srcRenderCart) window.__srcRenderCart([]);
    // Reset URL rows
    const urlList = document.getElementById('srcUrlList');
    if (urlList) {
      urlList.innerHTML = `
        <div class="src-url-row-block">
          <div class="src-url-row">
            <input type="url" class="src-url-input" placeholder="${window.t('sourcing.field_url_placeholder')}" oninput="window.__validateSnsInput(this)">
            <button class="src-btn-add-url" onclick="window.__srcAddUrl()" data-i18n="sourcing.btn_add_url">+ URL 추가</button>
          </div>
          <div class="src-row-pair" style="margin-top:8px;">
            <div class="src-field-group" style="flex:0 0 80px;">
              <input type="number" class="src-input-sm src-url-qty" value="5" min="5" placeholder="5">
            </div>
            <div class="src-field-group" style="flex:1;">
              <input type="text" class="src-input-sm src-url-memo" placeholder="${window.t('sourcing.field_memo_placeholder')}">
            </div>
          </div>
        </div>
      `;
    }
    // Reset image tab
    const imgQty = document.getElementById('srcImageQty');
    const imgMemo = document.getElementById('srcImageMemo');
    if (imgQty) imgQty.value = 1;
    if (imgMemo) imgMemo.value = '';

    // Reload history
    if (window.renderSourcingHistory) window.renderSourcingHistory();
  } catch (e) {
    console.error('Quote Submit Error:', e);
    alert('❌ Error: ' + e.message);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerText = window.t('sourcing.btn_submit');
    }
  }
};

// ─── Product Search Request ────────────────
let __searchImageFiles = [];

window.__previewSearchImages = function (files) {
  const newFiles = Array.from(files).slice(0, 5 - __searchImageFiles.length);
  __searchImageFiles.push(...newFiles);
  if (__searchImageFiles.length > 5) __searchImageFiles = __searchImageFiles.slice(0, 5);
  renderSearchImagePreviews();
};

window.__handleImageDrop = function (event) {
  const files = event.dataTransfer.files;
  window.__previewSearchImages(files);
  const label = document.getElementById('searchImageUploadLabel');
  if (label) label.style.borderColor = 'var(--border)';
};

function renderSearchImagePreviews() {
  const container = document.getElementById('searchImagePreviews');
  if (!container) return;
  container.innerHTML = __searchImageFiles.map((f, i) => {
    const url = URL.createObjectURL(f);
    return `<div style="position:relative; width:64px; height:64px;">
      <img src="${url}" style="width:64px; height:64px; object-fit:cover; border-radius:8px; border:1px solid var(--border);">
      <button onclick="window.__removeSearchImage(${i})" style="position:absolute; top:-5px; right:-5px; width:18px; height:18px; border-radius:50%; background:#e03131; color:white; font-size:10px; border:none; cursor:pointer; line-height:18px; text-align:center;">×</button>
    </div>`;
  }).join('');
}

window.__removeSearchImage = function (index) {
  __searchImageFiles.splice(index, 1);
  renderSearchImagePreviews();
};

window.submitSearchRequest = async function () {
  const btn = document.getElementById('btnSubmitSearchRequest');
  const snsLink = document.getElementById('searchSnsLink')?.value.trim();
  const note = document.getElementById('searchNote')?.value.trim();
  const session = getSession();
  if (!session) { alert(window.t('sourcing.alert_login')); return; }

  if (!snsLink && __searchImageFiles.length === 0 && !note) {
    alert(i18n.currentLang === 'ko' ? 'SNS 링크, 이미지 또는 설명 중 하나 이상을 입력해주세요.' : 'Please provide at least one of: SNS link, image, or description.');
    return;
  }

  if (btn) { btn.disabled = true; btn.innerText = window.t('sourcing.search_btn_submitting'); }

  try {
    // 1. Upload images to Supabase Storage
    const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm');
    const _sb = createClient(
      import.meta.env.VITE_SUPABASE_URL || window.__SUPABASE_URL__,
      import.meta.env.VITE_SUPABASE_ANON_KEY || window.__SUPABASE_ANON_KEY__
    );

    const imageUrls = [];
    for (const file of __searchImageFiles) {
      const ext = file.name.split('.').pop();
      const path = `${session.user.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const { data: upData, error: upErr } = await _sb.storage.from('search-request-images').upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = _sb.storage.from('search-request-images').getPublicUrl(path);
      imageUrls.push(publicUrl);
    }

    // 2. Submit request to backend
    const res = await fetch('/api/search-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: session.user.id,
        user_email: session.user.email,
        sns_link: snsLink,
        image_urls: imageUrls,
        note
      })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);

    alert(window.t('sourcing.search_success'));
    // Reset form
    document.getElementById('searchSnsLink').value = '';
    document.getElementById('searchNote').value = '';
    __searchImageFiles = [];
    renderSearchImagePreviews();
    window.loadSearchRequests();
  } catch (e) {
    console.error('Search request error:', e);
    alert('Error: ' + e.message);
  } finally {
    if (btn) { btn.disabled = false; btn.innerText = window.t('sourcing.search_btn_submit'); }
  }
};

window.loadSearchRequests = async function () {
  const list = document.getElementById('searchRequestList');
  if (!list) return;
  list.innerHTML = '<div class="loading-skeleton"></div>';
  const session = getSession();
  if (!session) return;

  try {
    const res = await fetch(`/api/search-request/history/${session.user.id}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error);

    if (!data.requests || data.requests.length === 0) {
      list.innerHTML = `<div style="text-align:center; padding:20px; color:var(--text-muted); font-size:13px;">${window.t('sourcing.search_history_empty')}</div>`;
      return;
    }

    list.innerHTML = data.requests.map(req => {
      const dateStr = new Date(req.created_at).toLocaleString(i18n.currentLang === 'ko' ? 'ko-KR' : 'en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
      let statusColor = '#e2e3e5'; let statusTxt = '#383d41'; let statusLabel = req.status;
      if (req.status === 'pending') { statusColor = '#fff3cd'; statusTxt = '#856404'; statusLabel = window.t('sourcing.search_status_pending'); }
      else if (req.status === 'found') { statusColor = '#d4edda'; statusTxt = '#155724'; statusLabel = window.t('sourcing.search_status_found'); }
      else if (req.status === 'not_found') { statusColor = '#f8d7da'; statusTxt = '#721c24'; statusLabel = window.t('sourcing.search_status_not_found'); }

      const imagesHtml = req.image_urls && req.image_urls.length > 0
        ? `<div style="display:flex; flex-wrap:wrap; gap:6px; margin-top:8px;">${req.image_urls.map(u => `<a href="${u}" target="_blank"><img src="${u}" style="width:54px; height:54px; object-fit:cover; border-radius:7px; border:1px solid #eee;"></a>`).join('')}</div>`
        : '';

      const replyHtml = req.admin_reply
        ? `<div style="margin-top:8px; padding:8px 12px; background:#f0f7ff; border-radius:8px; border-left:3px solid var(--accent-blue); font-size:12px; color:#333; line-height:1.5;">
            <span style="font-weight:600; font-size:11px; color:var(--accent-blue); display:block; margin-bottom:3px;">${window.t('sourcing.admin_reply_title')}</span>
            ${escapeHtml(req.admin_reply)}
          </div>` : '';

      return `<div style="border:1px solid #e8e8ed; border-radius:12px; padding:14px; background:var(--card-bg);">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
          <span style="font-size:11px; color:#aaa;">${dateStr}</span>
          <span style="background:${statusColor}; color:${statusTxt}; padding:2px 9px; border-radius:20px; font-size:11px; font-weight:600;">${statusLabel}</span>
        </div>
        ${req.sns_link ? `<div style="font-size:12px; color:var(--accent-blue); margin-bottom:4px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">🔗 ${escapeHtml(req.sns_link)}</div>` : ''}
        ${req.note ? `<div style="font-size:12px; color:var(--text); margin-bottom:4px;">${escapeHtml(req.note)}</div>` : ''}
        ${imagesHtml}
        ${replyHtml}
      </div>`;
    }).join('');
  } catch (e) {
    console.error(e);
    list.innerHTML = `<div style="color:var(--text); font-size:13px; text-align:center; padding:20px;">${window.t('sourcing.history_error')}<br>(${e.message})</div>`;
  }
};

// ─── Sourcing History (Table View for Main Tab) ────────────────
// ─── New Sourcing Page Functions ────────────────

// Tab switching (URL / Image)
window.__srcSwitchTab = function (tabId) {
  document.querySelectorAll('.src-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.src-tab-content').forEach(c => c.classList.remove('active'));
  const tabBtn = document.querySelector(`.src-tab[data-src-tab="${tabId}"]`);
  const tabContent = document.getElementById(tabId === 'url' ? 'srcTabUrl' : 'srcTabImage');
  if (tabBtn) tabBtn.classList.add('active');
  if (tabContent) tabContent.classList.add('active');
};

// Add URL row (per-row qty + comment)
window.__srcAddUrl = function () {
  const list = document.getElementById('srcUrlList');
  if (!list) return;
  const blocks = list.querySelectorAll('.src-url-row-block');
  if (blocks.length >= 5) { alert(window.t('sourcing.max_url_alert')); return; }
  const block = document.createElement('div');
  block.className = 'src-url-row-block';
  block.innerHTML = `
    <div class="src-url-row">
      <input type="url" class="src-url-input" placeholder="${window.t('sourcing.field_url_placeholder')}" oninput="window.__validateSnsInput(this)">
      <button class="src-btn-remove-url" onclick="this.closest('.src-url-row-block').remove()">✕</button>
    </div>
    <div class="src-row-pair" style="margin-top:8px;">
      <div class="src-field-group" style="flex:0 0 80px;">
        <input type="number" class="src-input-sm src-url-qty" value="5" min="5" placeholder="5">
      </div>
      <div class="src-field-group" style="flex:1;">
        <input type="text" class="src-input-sm src-url-memo" placeholder="${window.t('sourcing.field_memo_placeholder')}">
      </div>
    </div>
  `;
  list.appendChild(block);
};

// History filter
window.__srcSetFilter = function (btn) {
  document.querySelectorAll('.src-filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  window.__srcFilterHistory();
};
window.__srcFilterHistory = function () {
  const activeFilter = document.querySelector('.src-filter-btn.active');
  const status = activeFilter ? activeFilter.dataset.status : 'all';
  const search = (document.getElementById('srcHistorySearch')?.value || '').toLowerCase();
  document.querySelectorAll('#srcHistoryTbody tr[data-status]').forEach(row => {
    const matchStatus = status === 'all' || row.dataset.status === status;
    const matchSearch = !search || row.textContent.toLowerCase().includes(search);
    row.style.display = (matchStatus && matchSearch) ? '' : 'none';
  });
};

// Detail Modal
window.__srcOpenDetail = function (reqId) {
  const overlay = document.getElementById('srcDetailOverlay');
  const content = document.getElementById('srcDetailContent');
  if (!overlay || !content) return;
  const req = window.__srcHistoryData?.find(r => r.id == reqId);
  if (!req) return;

  const steps = [
    window.t('sourcing.step_received'),
    window.t('sourcing.step_review'),
    window.t('sourcing.step_quoted'),
    window.t('sourcing.step_confirmed')
  ];
  const statusMap = { pending: 1, quoted: 2, confirmed: 3 };
  const currentStep = statusMap[req.status] || 0;

  let stepperHtml = '<div class="src-stepper">';
  steps.forEach((label, i) => {
    const isActive = i <= currentStep;
    if (i > 0) stepperHtml += `<div class="src-step-line ${isActive ? '' : 'inactive'}"></div>`;
    stepperHtml += `
      <div class="src-step">
        <div class="src-step-circle ${isActive ? '' : 'inactive'}">${i + 1}</div>
        <div class="src-step-label ${isActive ? 'active' : 'inactive'}">${label}</div>
      </div>`;
  });
  stepperHtml += '</div>';

  const itemName = req.items?.[0]?.name || 'Direct Request';
  const locale = i18n.currentLang === 'ko' ? 'ko-KR' : 'en-US';
  const dateStr = new Date(req.created_at).toLocaleDateString(locale);
  const totalQty = req.items?.reduce((s, it) => s + (it.qty || 1), 0) || 1;

  let quoteHtml = '';
  if (req.status === 'quoted' && req.estimated_cost > 0) {
    quoteHtml = `
      <div class="src-quote-box">
        <div class="src-quote-title">${window.t('sourcing.admin_quote_reply')}</div>
        <div class="src-quote-detail">${window.t('sourcing.total_quote')} ₩${req.estimated_cost.toLocaleString()}</div>
        ${req.admin_reply ? `<div class="src-quote-note">${req.admin_reply}</div>` : ''}
      </div>`;
  }

  content.innerHTML = `
    <h3 style="font-size:16px; font-weight:700; margin:0 0 4px;">${escapeHtml(itemName)}</h3>
    <p style="font-size:12px; color:#888; margin:0 0 16px;">${dateStr}  ·  ${totalQty}</p>
    <div style="font-size:12px; font-weight:600; color:#555; margin-bottom:4px;">${window.t('sourcing.detail_title')}</div>
    ${stepperHtml}
    ${quoteHtml}
    <div class="src-modal-actions">
      ${req.status === 'quoted' ? `<button class="src-btn-confirm" onclick="alert('Coming soon!')">${window.t('sourcing.btn_confirm_order')}</button>` : ''}
      <button class="src-btn-close" onclick="window.__srcCloseDetail()">${window.t('sourcing.btn_close')}</button>
    </div>
  `;
  overlay.classList.add('active');
};
window.__srcCloseDetail = function () {
  document.getElementById('srcDetailOverlay')?.classList.remove('active');
};

// Cart rendering
window.__srcRenderCart = function (items) {
  const container = document.getElementById('srcCartProducts');
  const countEl = document.getElementById('srcCartCount');
  const emptyEl = document.getElementById('srcEmptyCart');
  if (!container) return;

  if (!items || items.length === 0) {
    if (countEl) countEl.textContent = '0';
    if (emptyEl) emptyEl.style.display = '';
    // Fix: clear the container so the last item is actually removed from the DOM
    container.innerHTML = emptyEl ? emptyEl.outerHTML : '';
    return;
  }
  if (countEl) countEl.textContent = items.length;
  if (emptyEl) emptyEl.style.display = 'none';

  const cardsHtml = items.map((item, i) => `
    <div class="src-cart-card" data-index="${i}" data-product-id="${item.product_id || item.id || ''}">
      <img class="src-thumb" src="${item.image_url || ''}" alt="" onerror="this.style.display='none'">
      <div class="src-info">
        <div class="src-brand">${escapeHtml(item.brand || '')}</div>
        <div class="src-name">${escapeHtml(item.name || '')}</div>
        <div class="src-meta">₩${(item.price || 0).toLocaleString()}  ·  ${item.source || ''}</div>
      </div>
      <div class="src-card-fields">
        <div style="flex:0 0 80px;"><label>${window.t('sourcing.field_qty')}</label><input type="number" class="src-cart-qty" value="${Math.max(item.qty || 5, 5)}" min="5" data-index="${i}"></div>
        <div style="flex:1;"><label>${window.t('sourcing.field_memo')}</label><input type="text" class="src-cart-memo" placeholder="${window.t('sourcing.field_memo_placeholder')}" data-index="${i}"></div>
      </div>
      <button class="src-btn-remove" onclick="window.__srcRemoveCartItem(${i})">✕</button>
    </div>
  `).join('');
  container.innerHTML = (emptyEl ? emptyEl.outerHTML : '') + cardsHtml;
};

window.__srcRemoveCartItem = function (index) {
  if (window.__srcCartItems) {
    window.__srcCartItems.splice(index, 1);
    window.__srcRenderCart(window.__srcCartItems);
  }
};

// History rendering (redesigned)
window.__srcHistoryData = [];
window.renderSourcingHistory = async function () {
  const tbody = document.getElementById('srcHistoryTbody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:30px;"><div class="loading-skeleton" style="height:40px;"></div></td></tr>';
  const session = getSession();
  if (!session) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:30px; color:#999;">${window.t('sourcing.login_required')}</td></tr>`;
    return;
  }

  try {
    const res = await fetch(`/api/sourcing/history/${session.user.id}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error);

    if (!data.requests || data.requests.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:30px; color:#999;">${window.t('sourcing.history_empty')}</td></tr>`;
      return;
    }

    window.__srcHistoryData = data.requests;

    tbody.innerHTML = data.requests.map(req => {
      const locale = i18n.currentLang === 'ko' ? 'ko-KR' : 'en-US';
      const dateStr = new Date(req.created_at).toLocaleString(locale, { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
      const totalQty = req.items?.reduce((s, it) => s + (it.qty || 1), 0) || '-';
      const totalCost = req.estimated_cost || 0;

      // Status badge
      let badgeClass = 'src-badge--received';
      let statusLabel = req.status;
      if (req.status === 'pending') { badgeClass = 'src-badge--pending'; statusLabel = window.t('sourcing.status_reviewing'); }
      else if (req.status === 'quoted') { badgeClass = 'src-badge--quoted'; statusLabel = window.t('sourcing.status_quote_done'); }
      else if (req.status === 'confirmed') { badgeClass = 'src-badge--confirmed'; statusLabel = window.t('sourcing.status_order_confirmed'); }
      else if (req.status === 'canceled') { badgeClass = 'src-badge--cancelled'; statusLabel = window.t('sourcing.status_cancel'); }

      // Product cell
      const firstItem = req.items?.[0];
      let productCellHtml = '';
      if (firstItem) {
        const imgHtml = firstItem.image_url ? `<img src="${firstItem.image_url}" alt="" onerror="this.style.display='none'">` : '<div style="width:40px;height:40px;background:#eee;border-radius:4px;"></div>';
        const sub = req.items.length > 1 ? `외 ${req.items.length - 1}건` : (req.sns_links?.length ? `🔗 링크 ${req.sns_links.length}개` : '');
        productCellHtml = `
          <div class="src-product-cell">
            ${imgHtml}
            <div class="src-product-info">
              <span class="src-product-name">${escapeHtml(firstItem.name || '직접 요청')}</span>
              ${sub ? `<span class="src-product-sub">${sub}</span>` : ''}
            </div>
          </div>`;
      } else if (req.sns_links?.length) {
        productCellHtml = `<div class="src-product-cell"><div class="src-product-info"><span class="src-product-name">URL Request</span><span class="src-product-sub">🔗 ${req.sns_links.length} links</span></div></div>`;
      } else {
        productCellHtml = `<span style="color:#aaa;">—</span>`;
      }

      // Quote price
      const priceHtml = (req.status === 'quoted' && totalCost > 0)
        ? `<span style="font-weight:700; color:#3949ab;">₩${totalCost.toLocaleString()}</span>`
        : '<span style="color:#bbb;">—</span>';

      // Action
      const actionHtml = (req.status === 'quoted' || req.status === 'confirmed')
        ? `<button class="src-btn-detail" onclick="window.__srcOpenDetail('${req.id}')">${window.t('sourcing.btn_details')}</button>`
        : `<button class="src-btn-detail disabled">${window.t('sourcing.btn_waiting')}</button>`;

      return `
        <tr data-status="${req.status}" data-req-id="${req.id}">
          <td>${dateStr}</td>
          <td>${productCellHtml}</td>
          <td style="text-align:center">${totalQty}</td>
          <td style="text-align:center"><span class="src-badge ${badgeClass}">${statusLabel}</span></td>
          <td style="text-align:center">${priceHtml}</td>
          <td style="text-align:center">${actionHtml}</td>
        </tr>
      `;
    }).join('');
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:15px; color:#e03131; font-size:13px;">${e.message}</td></tr>`;
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

// Auto-add to wishlist then navigate to sourcing tab
window.__sourcingRequestFromModal = async function (productId) {
  try {
    // Find and auto-save the product to wishlist if not already saved
    if (!window.currentModalIsSaved && productId) {
      const wishBtn = document.querySelector('#modalOverlay .btn-store-premium');
      if (wishBtn) {
        await window.__toggleWishlist(wishBtn, productId);
        if (wishBtn.classList.contains('active')) {
          wishBtn.innerHTML = window.t('modal.wishlist_saved');
          window.currentModalIsSaved = true;
        }
      }
    }
  } catch (e) {
    console.warn('Could not auto-add to wishlist:', e);
  }

  // Get product info from modal itself before closing
  const modalContent = document.getElementById('modalOverlay');
  const nameEl = modalContent ? modalContent.querySelector('.modal-title-premium, .modal-title') : null;
  const brandEl = modalContent ? modalContent.querySelector('.modal-brand-premium, .modal-brand') : null;
  const imgEl = modalContent ? modalContent.querySelector('.modal-img-premium, .modal-main-image') : null;
  const priceEl = modalContent ? modalContent.querySelector('.price-val') : null;

  const name = nameEl ? nameEl.innerText : 'Unknown';
  const brand = brandEl ? brandEl.innerText : '';
  const image = imgEl ? imgEl.src : '';
  // Parse price: remove ₩, commas, and 'Won' text
  const priceText = priceEl ? priceEl.innerText.replace(/[^\d]/g, '') : '0';
  const price = parseInt(priceText) || 0;
  const source = state?.currentPlatform || '';

  // Close product modal and restore scrolling
  if (modalContent) modalContent.classList.remove('open');
  document.body.classList.remove('one-page');
  document.body.style.overflow = '';

  // Build product item for cart
  const productItem = {
    product_id: productId,
    name: name,
    brand: brand,
    image_url: image,
    price: price,
    source: source,
    qty: 5
  };

  // Add to cart items and navigate to Sourcing tab
  if (!window.__srcCartItems) window.__srcCartItems = [];
  // Avoid duplicate
  const exists = window.__srcCartItems.some(it => String(it.product_id) === String(productId));
  if (!exists) {
    window.__srcCartItems.push(productItem);
  }

  // Switch to sourcing tab and render cart
  window.switchMainTab('sourcing');
  if (window.__srcRenderCart) {
    window.__srcRenderCart(window.__srcCartItems);
  }
};

window.toggleSupportView = function (viewName) {
  const faqView = document.getElementById('supportFaqView');
  const inquiryView = document.getElementById('supportInquiryView');
  const btnFaq = document.getElementById('btnSupportFaq');
  const btnInquiry = document.getElementById('btnSupportInquiry');

  if (viewName === 'faq') {
    faqView.style.display = 'block';
    inquiryView.style.display = 'none';
    btnFaq.classList.add('active');
    btnInquiry.classList.remove('active');
    window.loadFaqs();
  } else if (viewName === 'inquiry') {
    faqView.style.display = 'none';
    inquiryView.style.display = 'block';
    btnFaq.classList.remove('active');
    btnInquiry.classList.add('active');
    window.loadUserInquiries();
  }
};


window.loadFaqs = async function () {
  const list = document.getElementById('faqList');
  if (!list) return;
  list.innerHTML = '<div class="loading-skeleton"></div>';

  try {
    const { fetchFaqs } = await import('./supabase.js');
    const { data } = await fetchFaqs();
    if (!data || data.length === 0) {
      list.innerHTML = `<div style="text-align:center; padding:30px; color:var(--text-muted);">No FAQs found.</div>`;
      return;
    }

    const lang = i18n.currentLang || 'ko';

    list.innerHTML = data.map((faq, i) => {
      const q = lang === 'ko' ? faq.question_ko : (faq.question_en || faq.question_ko);
      const a = lang === 'ko' ? faq.answer_ko : (faq.answer_en || faq.answer_ko);
      return `
        <div style="border:1px solid #eee; border-radius:8px; overflow:hidden; background:white;">
          <button onclick="const a = document.getElementById('faq-ans-${i}'); a.style.display = a.style.display==='none' ? 'block' : 'none';"
            style="width:100%; text-align:left; padding:15px; background:#f9f9fb; border:none; font-weight:600; font-size:14px; cursor:pointer; display:flex; justify-content:space-between;">
            <span>Q. ${escapeHtml(q)}</span>
            <span style="color:#aaa;">+</span>
          </button>
          <div id="faq-ans-${i}" style="display:none; padding:15px; border-top:1px solid #efefef; font-size:13px; color:#444; line-height:1.6; background:white;">
            A. ${escapeHtml(a).replace(/\\n/g, '<br>')}
          </div>
        </div>
        `;
    }).join('');
  } catch (e) {
    list.innerHTML = `<div style="text-align:center; padding:15px; color:#e03131;">Load failed: ${e.message}</div>`;
  }
};

window.loadUserInquiries = async function () {
  const list = document.getElementById('inquiryList');
  if (!list) return;
  list.innerHTML = '<div class="loading-skeleton"></div>';

  try {
    const { fetchUserInquiries } = await import('./supabase.js');
    const { data } = await fetchUserInquiries();
    if (!data || data.length === 0) {
      list.innerHTML = `<div style="text-align:center; padding:20px; font-size:13px; color:#888;">${window.t('support.no_inquiries') || 'No inquiries found.'}</div>`;
      return;
    }

    list.innerHTML = data.map(inq => {
      const date = new Date(inq.created_at).toLocaleDateString(i18n.currentLang === 'ko' ? 'ko-KR' : 'en-US');
      let statusColor = '#e2e3e5'; let statusTxt = '#383d41'; let statusLabel = inq.status;
      if (inq.status === 'pending') { statusColor = '#fff3cd'; statusTxt = '#856404'; statusLabel = window.t('support.status_pending') || 'Pending'; }
      else if (inq.status === 'answered') { statusColor = '#d4edda'; statusTxt = '#155724'; statusLabel = window.t('support.status_answered') || 'Answered'; }
      else if (inq.status === 'closed') { statusColor = '#d1ecf1'; statusTxt = '#0c5460'; statusLabel = window.t('support.status_closed') || 'Closed'; }

      let html = `
        <div style="border:1px solid #e8e8ed; border-radius:8px; padding:15px; background:white; margin-bottom:10px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
            <div style="font-size:12px; color:#aaa;">[${inq.type}] ${date}</div>
            <span style="background:${statusColor}; color:${statusTxt}; padding:2px 8px; border-radius:12px; font-size:11px; font-weight:600;">${statusLabel}</span>
          </div>
          <div style="font-weight:600; font-size:14px; margin-bottom:5px;">${escapeHtml(inq.title)}</div>
          <div style="font-size:12px; color:#666; margin-bottom:10px; line-height:1.5;">${escapeHtml(inq.message || inq.content || '').replace(/\\n/g, '<br>')}</div>
          `;

      if (inq.admin_reply) {
        html += `
          <div style="margin-top:10px; padding:10px; background:#f0f7ff; border-radius:6px; border-left:3px solid var(--accent-blue); font-size:12px; color:#333;">
            <div style="font-weight:700; color:var(--accent-blue); margin-bottom:4px; font-size:11px;">💬 ${window.t('support.admin_reply_label') || 'Admin Reply'}</div>
            ${escapeHtml(inq.admin_reply).replace(/\\n/g, '<br>')}
          </div>
        `;
      }
      html += `</div>`;
      return html;
    }).join('');
  } catch (e) {
    list.innerHTML = `<div style="text-align:center; padding:15px; color:#e03131;">Load failed: ${e.message}</div>`;
  }
};

window.submitSupportInquiry = async function () {
  const type = document.getElementById('inquiryType').value;
  const title = document.getElementById('inquiryTitle').value.trim();
  const message = document.getElementById('inquiryContent').value.trim();

  if (!title || !message) {
    alert(i18n.currentLang === 'ko' ? '제목과 내용을 모두 입력해주세요.' : 'Please enter both title and content.');
    return;
  }

  const btn = document.getElementById('btnSubmitInquiry');
  if (!btn) return;
  const originalText = btn.innerText;
  btn.innerText = i18n.currentLang === 'ko' ? '등록 중...' : 'Submitting...';
  btn.disabled = true;

  try {
    const { submitInquiry } = await import('./supabase.js');
    const { error } = await submitInquiry(type, title, message);
    if (error) throw new Error(error.message);

    alert(i18n.currentLang === 'ko' ? '성공적으로 등록되었습니다.' : 'Submitted successfully.');
    document.getElementById('inquiryTitle').value = '';
    document.getElementById('inquiryContent').value = '';
    window.loadUserInquiries();
  } catch (err) {
    alert('Error: ' + err.message);
  } finally {
    btn.innerText = originalText;
    btn.disabled = false;
  }
};

