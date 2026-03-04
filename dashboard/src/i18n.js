/**
 * Internationalization (i18n) Utility
 * Manages language state and translation strings
 */

const SUPPORTED_LANGUAGES = ['ko', 'en', 'vi', 'th', 'id', 'ja'];
const DEFAULT_LANGUAGE = 'ko';

const FALLBACK_STRINGS = {
    'platforms.oliveyoung': { ko: '올리브영', en: 'Olive Young' },
    'platforms.musinsa': { ko: '무신사', en: 'Musinsa' },
    'platforms.ably': { ko: '에이블리', en: 'Ably' },
    'platforms.ssg': { ko: '신세계', en: 'Shinsegae' },
    'platforms.k_trend': { ko: '코리아 트렌드', en: 'Korea Trends' },
    'platforms.steady_sellers': { ko: '스테디 셀러', en: 'Steady Sellers' },
    'platforms.modernhouse': { ko: '모던하우스', en: 'Modern House' },
    'table.rank': { ko: '순위', en: 'Rank' },
    'table.image': { ko: '이미지', en: 'Image' },
    'table.name': { ko: '상품명', en: 'Product Name' },
    'table.brand': { ko: '브랜드', en: 'Brand' },
    'table.price': { ko: '가격', en: 'Price' },
    'table.review': { ko: '리뷰', en: 'Reviews' },
    'table.rating': { ko: '평점', en: 'Rating' },
    'table.rank_change': { ko: '변동', en: 'Change' },
    'auth.email': { 'en': 'Email', 'ko': '이메일' },
    'auth.password': { 'en': 'Password', 'ko': '비밀번호' },
    'auth.name': { 'en': 'Name', 'ko': '이름' },
    'auth.company': { 'en': 'Company / Brand', 'ko': '소속 (회사/브랜드명)' },
    'auth.email_placeholder': { 'en': 'example@email.com', 'ko': 'example@email.com' },
    'auth.password_placeholder': { 'en': '8+ chars, letters & numbers', 'ko': '8자 이상 영문/숫자 조합' },
    'auth.otp_code': { 'en': 'Email OTP', 'ko': '이메일 인증번호' },
    'auth.otp_placeholder': { 'en': 'Enter 6-digit number', 'ko': '6자리 숫자 입력' },
    'auth.otp_verify': { 'en': 'Verify', 'ko': '확인' },
    'auth.send_otp': { 'en': 'Send OTP', 'ko': '인증번호 발송' },
    'auth.password_confirm': { 'en': 'Confirm Password', 'ko': '비밀번호 확인' },
    'auth.password_confirm_placeholder': { 'en': 'Re-enter password', 'ko': '비밀번호 재입력' },
    'auth.name_placeholder': { 'en': 'John Doe', 'ko': '홍길동' },
    'auth.company_placeholder': { 'en': 'K-Vant', 'ko': '케이밴트' },
    'auth.platform_label': { 'en': 'Target Platform', 'ko': '주요 활용 플랫폼' },
    'auth.category_label': { 'en': 'Main Category', 'ko': '주력 카테고리' },
    'auth.select': { 'en': 'Please select', 'ko': '선택해주세요' },
    'auth.login': { 'en': 'Login', 'ko': '로그인' },
    'auth.signup': { 'en': 'Sign Up', 'ko': '회원가입' },
    'auth.other_platform': { 'en': 'Enter platform directly', 'ko': '플랫폼 직접 입력' },
    'auth.other_category': { 'en': 'Enter category directly', 'ko': '카테고리 직접 입력' },
    'common.login_signup': { 'en': 'Login / Register', 'ko': '로그인 / 회원가입' },
    'mypage.btn_renew': { 'ko': '🔄 구독 갱신 (Renew)', 'en': '🔄 Renew Subscription' },
    'mypage.btn_extend': { 'ko': '⏳ 구독 연장 (Extend)', 'en': '⏳ Extend Subscription' },
    'mypage.btn_cancel': { 'ko': '🚫 구독 해지 (Cancel)', 'en': '🚫 Cancel Subscription' },
    'mypage.status_free': { 'ko': '현재 무료 플랜을 이용 중입니다. (일일 상세 조회 10회 제한)', 'en': 'You are on the Free plan. (Limited to 10 daily detail views)' },
    'mypage.status_trial': { 'ko': '🎉 2주간 Pro 체험 기간입니다! ({date}까지)', 'en': '🎉 2-week Pro trial active! (Until {date})' },
    'mypage.status_pro_active': { 'ko': 'Pro 플랜 이용 중 (자동 갱신)', 'en': 'Pro plan active (Auto-renewal)' },
    'mypage.status_pro_cancelled': { 'ko': '{date}까지 Pro 이용 가능', 'en': 'Pro access until {date}' },
    'mypage.status_expired': { 'ko': '구독 만료됨', 'en': 'Subscription expired' },
    'mypage.status_admin': { 'ko': '관리자 (무제한)', 'en': 'Admin (Unlimited)' },
    'mypage.status_auto_renew': { 'ko': '자동 갱신', 'en': 'Auto-renewal' },
    'mypage.status_no_renew': { 'ko': '갱신 안함', 'en': 'No auto-renewal' },
    'mypage.status_trial_until': { 'ko': '체험 종료일', 'en': 'Trial ends' },
    'mypage.tos_agree_bold': { 'ko': '[필수] 결제 및 환불 규정 동의', 'en': '[Required] Agree to Terms & No-Refund Policy' },
    'mypage.tos_agree_desc': {
        'ko': '본 서비스는 디지털 콘텐츠(데이터 리포트) 제공 서비스로서, 결제 완료 및 서비스 권한 부여 이후에는 전자상거래법에 의거하여 환불이 불가함을 확인하고 동의합니다.',
        'en': 'This is a digital content service. By proceeding with the payment, you agree to our Terms of Service and acknowledge that all sales are final and non-refundable.'
    },
    'mypage.tos_alert': { 'ko': '결제 및 환불 규정에 동의하셔야 결제가 가능합니다.', 'en': 'Please agree to the Terms of Service to proceed with payment.' },

    // Tutorial Modal
    'tutorial.title': { 'ko': '🚀 K-Vant 100% 활용 가이드', 'en': '🚀 K-Vant 100% Usage Guide' },
    'tutorial.subtitle': { 'ko': '한국 트렌드 데이터를 활용해 글로벌 매출을 극대화하는 3단계 비법', 'en': '3-step secret to maximizing global sales with Korean trend data' },
    'tutorial.step1_title': { 'ko': '실시간 급상승 브랜드 포착', 'en': 'Catch Real-time Trending Brands' },
    'tutorial.step1_desc': { 'ko': '한국 1위 H&B 스토어(올리브영)와 패션 플랫폼(무신사)에서 지금 현지인들이 가장 많이 찾는 브랜드를 실시간으로 확인하세요. BETA로 제공되는 코리아 트렌드/스테디 셀러 탭은 최고의 소싱 소스입니다.', 'en': 'Check in real-time what brands locals are searching for the most on Korea\'s No.1 H&B store (Olive Young) and fashion platform (Musinsa). The BETA Korea Trends / Steady Sellers tabs are your best sourcing sources.' },
    'tutorial.step2_title': { 'ko': '원클릭 B2B 도매 소싱 요청', 'en': 'One-Click B2B Wholesale Sourcing' },
    'tutorial.step2_desc': { 'ko': '마음에 드는 상품의 장바구니 버튼을 눌러 소싱 리스트에 담으세요. 이후 우측 하단의 [견적 요청] 버튼을 누르면 K-Vant 전문 소서가 최저가 도매가로 상품을 한국에서 공급해 드립니다.', 'en': 'Add products you like to your sourcing list using the cart button. Then click the [Request Quote] button to get the lowest wholesale supply directly from Korea.' },
    'tutorial.step3_title': { 'ko': 'Pro 버전을 통한 무제한 분석', 'en': 'Unlimited Analysis with Pro' },
    'tutorial.step3_desc': { 'ko': 'Free 버전을 통해 경험해보신 후, Pro 플랜으로 업그레이드하여 AI 브랜드 리뷰 마이닝 및 제한 없는 상세 상품 데이터 조회를 시작하세요. Pro 회원에게는 소싱 수수료 감면 혜택도 주어집니다.', 'en': 'Experience the Free version, then upgrade to Pro for AI brand review mining and unlimited detailed product data access. Pro members also get exclusive discounts on sourcing fees.' },
    'tutorial.start_btn': { 'ko': 'K-Vant 시작하기', 'en': 'Start K-Vant' },
    'tutorial.next_btn': { 'ko': '다음 (Next)', 'en': 'Next' },
    'tutorial.dont_show': { 'ko': '다시 보지 않기', 'en': 'Don\'t show again' },

    // Korea Trends – Tab names
    'tabs.global_trends': { ko: '🌏 글로벌 트렌드', en: '🌏 Global Trends' },
    'tabs.naver_best': { ko: '🇰🇷 대한민국 트렌드 🇰🇷', en: '🇰🇷 Korea Best 🇰🇷' },
    'tabs.apply': { ko: '적용', en: 'Apply' },

    // Naver Best – Section titles
    'naver_best.products_title': { ko: '🛍️ 베스트 상품 순위', en: '🛍️ Best Product Rankings' },
    'naver_best.brands_title': { ko: '🏢 베스트 브랜드 순위', en: '🏢 Best Brand Rankings' },
    'naver_best.header': { ko: '🇰🇷 네이버 쇼핑 베스트', en: '🇰🇷 Naver Shopping Best' },
    'naver_best.empty': { ko: '데이터가 없습니다. 잠시 후 다시 시도하세요.', en: 'No data available. Please try again later.' },
    'naver_best.count': { ko: '오늘의 베스트셀러', en: "Today's Best Sellers" },

    // Naver Best – Period toggles
    'naver_best.daily': { ko: '일간', en: 'Daily' },
    'naver_best.weekly': { ko: '주간', en: 'Weekly' },
    'naver_best.monthly': { ko: '월간', en: 'Monthly' },

    // Naver Best – Category names
    'naver_cat.A': { ko: '전체', en: 'All' },
    'naver_cat.50000000': { ko: '패션의류', en: 'Fashion' },
    'naver_cat.50000001': { ko: '패션잡화', en: 'Accessories' },
    'naver_cat.50000002': { ko: '화장품/미용', en: 'Beauty' },
    'naver_cat.50000003': { ko: '디지털/가전', en: 'Digital' },
    'naver_cat.50000004': { ko: '가구/인테리어', en: 'Furniture' },
    'naver_cat.50000005': { ko: '출산/육아', en: 'Baby' },
    'naver_cat.50000006': { ko: '식품', en: 'Food' },
    'naver_cat.50000007': { ko: '스포츠/레저', en: 'Sports' },
    'naver_cat.50000008': { ko: '생활/건강', en: 'Living' },
};

class I18n {
    constructor() {
        this.currentLang = localStorage.getItem('app_lang') || DEFAULT_LANGUAGE;
        this.translations = { 'en': {}, 'ko': {}, 'vi': {}, 'th': {}, 'id': {}, 'ja': {} };
        this.isLoaded = false;
        this.loadedLangs = new Set();
    }

    async init() {
        try {
            // Always load English as a baseline for reliable fallback
            await this.loadTranslations('en');
            if (this.currentLang !== 'en') {
                await this.loadTranslations(this.currentLang);
            }
            this.isLoaded = true;
            this.documentUpdate();
        } catch (e) {
            console.error('i18n init critical error:', e);
            // Even if failed, mark as loaded to allow documentUpdate to use fallbacks
            this.isLoaded = true;
            this.documentUpdate();
        }
        return this;
    }

    async loadTranslations(lang) {
        if (this.loadedLangs.has(lang)) return;

        try {
            // Add revision to bypass browser cache
            const rev = Date.now();
            const response = await fetch(`./locales/${lang}.json?v=${rev}`);
            if (!response.ok) throw new Error(`Failed to load ${lang} translations`);
            const data = await response.json();

            // Merge or assign
            this.translations[lang] = data;
            this.loadedLangs.add(lang);
        } catch (err) {
            console.error(`i18n load error (${lang}):`, err);
            // Fallback: if we can't load any, at least we have empty objects
        }
    }

    async setLanguage(lang) {
        if (!SUPPORTED_LANGUAGES.includes(lang)) return;
        this.currentLang = lang;
        localStorage.setItem('app_lang', lang);
        await this.loadTranslations(lang);
        this.documentUpdate();

        // Dispatch event for components to listen
        window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang } }));
    }

    t(keyPath) {
        if (!keyPath) return '';
        const keys = keyPath.split('.');

        const getFromObj = (obj, pathKeys) => {
            if (!obj) return null;
            let current = obj;
            for (const key of pathKeys) {
                if (current && typeof current === 'object' && key in current) {
                    current = current[key];
                } else {
                    return null;
                }
            }
            return current;
        };

        // 1. Try Current Language
        let result = getFromObj(this.translations[this.currentLang], keys);
        if (result !== null && typeof result === 'string') return result;

        // 2. Try English Fallback
        if (this.currentLang !== 'en') {
            result = getFromObj(this.translations['en'], keys);
            if (result !== null && typeof result === 'string') return result;
        }

        // 3. Absolute Last Resort: Hardcoded Fallbacks
        if (FALLBACK_STRINGS[keyPath]) {
            return FALLBACK_STRINGS[keyPath][this.currentLang] || FALLBACK_STRINGS[keyPath]['en'] || keyPath;
        }

        // 4. Return the key itself
        return keyPath;
    }

    documentUpdate() {
        // Even if not fully isLoaded, we can try translating with whatever we have

        // Update all elements with data-i18n attribute
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (!key) return;
            const translation = this.t(key);

            if ((el.tagName === 'INPUT' && (el.type === 'text' || el.type === 'search' || el.type === 'password' || el.type === 'email')) || el.tagName === 'TEXTAREA') {
                el.placeholder = translation;
            } else if (el.tagName === 'OPTGROUP') {
                el.label = translation;
            } else {
                el.textContent = translation;
            }
        });

        // Update data-i18n-title for tooltips/title attributes
        document.querySelectorAll('[data-i18n-title]').forEach(el => {
            const key = el.getAttribute('data-i18n-title');
            if (key) el.title = this.t(key);
        });

        // Update data-i18n-href for links
        document.querySelectorAll('[data-i18n-href]').forEach(el => {
            const key = el.getAttribute('data-i18n-href');
            if (key) el.href = this.t(key);
        });

        // Update HTML lang attribute
        document.documentElement.lang = this.currentLang;

        // Special fix for platforms that might be rendered twice or missing data-i18n
        document.querySelectorAll('.platform-btn').forEach(btn => {
            const platform = btn.getAttribute('data-platform');
            if (platform && !btn.hasAttribute('data-i18n')) {
                btn.setAttribute('data-i18n', `platforms.${platform}`);
                btn.textContent = this.t(`platforms.${platform}`);
            }
        });
    }
}

// Export singleton
export const i18n = new I18n();
window.i18n = i18n;
window.t = (key) => i18n.t(key);
