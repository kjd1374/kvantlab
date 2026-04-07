/**
 * Internationalization (i18n) Utility
 * Manages language state and translation strings
 */

const SUPPORTED_LANGUAGES = ['ko', 'en', 'vi', 'th', 'id', 'ja'];
const DEFAULT_LANGUAGE = 'en';

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
    'auth.btn_resend': { 'en': 'Resend', 'ko': '재발송' },
    'auth.verified': { 'en': 'Verified', 'ko': '인증 완료' },
    'auth.sending_otp': { 'en': 'Sending...', 'ko': '전송 중...' },
    'auth.resend_otp': { 'en': 'Resend OTP', 'ko': '인증번호 재발송' },
    'auth.verifying': { 'en': 'Verifying...', 'ko': '확인 중...' },
    'auth.otp_time_left': { 'en': 'Time left:', 'ko': '남은 시간:' },
    'auth.otp_expired': { 'en': 'OTP has expired.', 'ko': '인증 시간이 만료되었습니다.' },
    'auth.signup_success_partner': { 'en': 'You have successfully signed up and registered as a Partner!', 'ko': '회원가입 및 파트너 등록이 완료되었습니다!' },
    'auth.invalid_email': { 'en': 'Please enter a valid email address.', 'ko': '올바른 이메일 주소를 입력해주세요.' },
    'auth.invalid_otp': { 'en': 'Please enter the correct OTP.', 'ko': '인증번호를 정확히 입력해주세요.' },
    'auth.invalid_credentials': { 'en': 'Invalid email or password.', 'ko': '이메일 또는 비밀번호가 일치하지 않습니다.' },
    'auth.err_general': { 'en': 'An error occurred during authentication.', 'ko': '인증 처리 중 오류가 발생했습니다.' },
    'auth.err_req_otp': { 'en': 'Please verify your email first.', 'ko': '이메일 인증을 먼저 완료해주세요.' },
    'auth.err_pwd_mismatch': { 'en': 'Passwords do not match.', 'ko': '비밀번호가 일치하지 않습니다.' },
    'auth.err_req_name': { 'en': 'Please enter both name and company.', 'ko': '이름과 소속을 모두 입력해주세요.' },
    'auth.err_req_pf': { 'en': 'Please select your target platform and category.', 'ko': '주요 활용 플랫폼과 주력 카테고리를 선택해주세요.' },
    'auth.err_session': { 'en': 'Session was lost. Please try again.', 'ko': '세션 정보를 찾을 수 없습니다. 다시 시도해주세요.' },
    'auth.cat_beauty': { 'en': 'Beauty/Cosmetics', 'ko': '뷰티/코스메틱' },
    'auth.cat_fashion': { 'en': 'Fashion/Apparel', 'ko': '패션/어패럴' },
    'auth.cat_food': { 'en': 'Food/Supplements', 'ko': '식품/건기식' },
    'auth.cat_living': { 'en': 'Living/Home', 'ko': '리빙/생활용품' },
    'auth.pf_tiktok': { 'en': 'TikTok', 'ko': '틱톡' },
    'auth.pf_fb_ig': { 'en': 'Facebook/Instagram', 'ko': '페이스북/인스타' },
    'auth.pf_shopee': { 'en': 'Shopee/Lazada', 'ko': '쇼피/라자다' },
    'auth.pf_qoo10': { 'en': 'Qoo10', 'ko': '큐텐' },
    'auth.pf_amazon': { 'en': 'Amazon', 'ko': '아마존' },
    'common.login_signup': { 'en': 'Login / Register', 'ko': '로그인 / 회원가입' },
    'common.admin': { 'en': 'Admin Panel', 'ko': '관리자 페이지' },
    'common.partner': { 'en': 'Partner Dashboard', 'ko': '파트너 페이지' },
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
    'tutorial.subtitle': { 'ko': 'K-Vant를 활용해 글로벌 매출을 극대화하는 3단계 비법', 'en': '3-step guide to maximizing global sales with K-Vant' },
    'tutorial.step1_title': { 'ko': 'Always-Fresh Rankings', 'en': 'Always-Fresh Rankings' },
    'tutorial.step1_desc': { 'ko': "Track what's actually selling in Korea — right now. Real-time rankings from Olive Young, Musinsa, Naver Shopping & more, updated daily so you never miss a trending product.", 'en': "Track what's actually selling in Korea — right now. Real-time rankings from Olive Young, Musinsa, Naver Shopping & more, updated daily so you never miss a trending product." },
    'tutorial.step2_title': { 'ko': 'Request Any Product, Instantly', 'en': 'Request Any Product, Instantly' },
    'tutorial.step2_desc': { 'ko': "Spot something worth selling? Hit the cart button to request a sourcing quote directly from Korea. Can't find it in the rankings? Submit a URL or image — if it exists in Korea, we'll track it down.", 'en': "Spot something worth selling? Hit the cart button to request a sourcing quote directly from Korea. Can't find it in the rankings? Submit a URL or image — if it exists in Korea, we'll track it down." },
    'tutorial.step3_title': { 'ko': 'AI That Reads the Market for You', 'en': 'AI That Reads the Market for You' },
    'tutorial.step3_desc': { 'ko': "K-Vant's AI analyzes thousands of real buyer reviews across Korean platforms — so you see not just what's ranking, but why it's winning. Spot the next trend before it hits your market.", 'en': "K-Vant's AI analyzes thousands of real buyer reviews across Korean platforms — so you see not just what's ranking, but why it's winning. Spot the next trend before it hits your market." },
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

    // Sourcing Signals
    'signal.blue_title': { ko: 'Blue Ocean (소싱 기회)', en: 'Blue Ocean (Opportunities)' },
    'signal.blue_desc': { ko: '리뷰 적음 · 랭킹 급상승', en: 'Low reviews · Ranking surges' },
    'signal.red_title': { ko: 'Red Ocean (경쟁 심화)', en: 'Red Ocean (Heavy Competition)' },
    'signal.red_desc': { ko: '초격차 상위권 · 경쟁 치열', en: 'Top Tier · Fierce Competition' },
    'signal.steady_title': { ko: 'Steady Sellers (안정성)', en: 'Steady Sellers (Secure)' },
    'signal.steady_desc': { ko: '압도적 리뷰 · 롱런 아이템', en: 'Massive reviews · Long-run items' },
    'table.action_sourcing': { ko: '소싱', en: 'Sourcing' }
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

        // Update data-i18n-html for HTML content
        document.querySelectorAll('[data-i18n-html]').forEach(el => {
            const key = el.getAttribute('data-i18n-html');
            if (key) {
               const translation = this.t(key);
               if (translation !== key) {
                   el.innerHTML = translation;
               }
            }
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
