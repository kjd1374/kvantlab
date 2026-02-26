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
    'table.rank': { ko: '순위', en: 'Rank' },
    'table.image': { ko: '이미지', en: 'Image' },
    'table.name': { ko: '상품명', en: 'Product Name' },
    'table.brand': { ko: '브랜드', en: 'Brand' },
    'table.price': { ko: '가격', en: 'Price' },
    'table.review': { ko: '리뷰', en: 'Reviews' },
    'table.rating': { ko: '평점', en: 'Rating' },
    'table.link': { ko: '링크', en: 'Link' },
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
    'common.login_signup': { 'en': 'Login / Register', 'ko': '로그인 / 회원가입' }
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
