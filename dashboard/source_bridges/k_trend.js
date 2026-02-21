/**
 * Korea Trend Source Bridge
 */
import { fetchTrending } from '../supabase.js';

export const KoreaTrendBridge = {
    id: 'k_trend',
    name: 'Korea Trends',
    tabs: [
        { id: 'insights', icon: '📊', label: 'tabs.insights' },
        { id: 'trending', icon: '📈', label: 'tabs.trending' }
    ],

    async getKPIs(currentPlatform) {
        return [
            { id: 'google', icon: '📈', value: '20', label: 'Google Trends' },
            { id: 'naver', icon: '🇳', value: '10', label: 'Naver DataLab' }
        ];
    },

    async getCategories() {
        return {
            data: [
                { category_code: 'google', name_ko: '구글 트렌드', name_en: 'Google Trends', depth: 1 },
                { category_code: 'naver', name_ko: '네이버 데이터랩', name_en: 'Naver DataLab', depth: 1 }
            ],
            count: 2
        };
    },

    async fetchData(tabId, state) {
        // Map category 'google' or 'naver' to fetchTrending platform
        const platform = state.activeCategory === 'naver' ? 'naver_datalab' : 'google_trends';
        return await fetchTrending(100, platform);
    },

    renderCustomHeader(state) { return ''; }
};
