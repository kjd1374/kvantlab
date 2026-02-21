/**
 * Internationalization (i18n) Utility
 * Manages language state and translation strings
 */

const SUPPORTED_LANGUAGES = ['ko', 'en', 'vi', 'th', 'id', 'ja'];
const DEFAULT_LANGUAGE = 'ko';

class I18n {
    constructor() {
        this.currentLang = localStorage.getItem('app_lang') || DEFAULT_LANGUAGE;
        this.translations = {};
        this.isLoaded = false;
    }

    async init() {
        await this.loadTranslations(this.currentLang);
        this.documentUpdate();
        return this;
    }

    async loadTranslations(lang) {
        if (this.translations[lang]) return;

        try {
            const response = await fetch(`./locales/${lang}.json`);
            if (!response.ok) throw new Error(`Failed to load ${lang} translations`);
            this.translations[lang] = await response.json();
            this.isLoaded = true;
        } catch (err) {
            console.error('i18n load error:', err);
            // Fallback to English if not Korean
            if (lang !== 'en') await this.loadTranslations('en');
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
        const keys = keyPath.split('.');
        let result = this.translations[this.currentLang];

        for (const key of keys) {
            if (result && result[key]) {
                result = result[key];
            } else {
                // Fallback to English key if possible
                const english = this.translations['en'];
                if (english) {
                    let enResult = english;
                    for (const enKey of keys) {
                        if (enResult && enResult[enKey]) enResult = enResult[enKey];
                        else return keyPath;
                    }
                    return enResult;
                }
                return keyPath;
            }
        }
        return result;
    }

    documentUpdate() {
        // Update all elements with data-i18n attribute
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (el.tagName === 'INPUT' && el.type === 'text') {
                el.placeholder = this.t(key);
            } else {
                el.textContent = this.t(key);
            }
        });

        // Update data-i18n-title for tooltips/title attributes
        document.querySelectorAll('[data-i18n-title]').forEach(el => {
            const key = el.getAttribute('data-i18n-title');
            el.title = this.t(key);
        });

        // Update HTML lang attribute
        document.documentElement.lang = this.currentLang;
    }
}

// Export singleton
export const i18n = new I18n();
window.t = (key) => i18n.t(key);
