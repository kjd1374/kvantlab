const fs = require('fs');
const path = require('path');

const STRINGS = {
    ko: {
        hero_title_1: "이커머스 트렌드의 모든 것",
        hero_title_2: "AI가 분석하는 인사이트",
        hero_subtitle_1: "실시간 쇼핑 랭킹부터 글로벌 K-뷰티 트렌드 분석, 유망 제품 예측까지.",
        hero_subtitle_2: "K-Vant에서 데이터 기반의 소싱 기회를 가장 빠르게 발굴하세요.",
        feature1_title: "실시간 랭킹 & 트렌드 분석",
        feature1_desc: "주요 커머스 플랫폼의 일간 순위 데이터를 실시간으로 파악하고, 시장의 핵심 트렌드 흐름을 한곳에서 비교 분석합니다.",
        feature2_title: "예상 제품 & AI 리뷰 마이닝",
        feature2_desc: "수천 개의 리뷰를 AI가 분석하여 소비자의 니즈를 파악하고, 다음 시장을 주도할 유망 상품을 예측해 냅니다.",
        feature3_title: "편리한 글로벌 B2B 소싱",
        feature3_desc: "발굴한 트렌디한 제품들을 장바구니에 담아, 합리적인 매입 단가와 배송비 견적을 쉽고 빠르게 요청할 수 있습니다.",
        announcements_title: "최신 업데이트 및 리포트",
        empty_announcements: "등록된 공지사항이 없습니다.",
        announcement_report: "리포트",
        announcement_update: "업데이트",
        announcement_notice: "공지사항"
    },
    en: {
        hero_title_1: "Everything about E-commerce Trends",
        hero_title_2: "AI-Powered Insights",
        hero_subtitle_1: "From real-time rankings of Olive Young, Musinsa, and Ably to global K-Beauty trends.",
        hero_subtitle_2: "Check the fastest and most accurate commerce metrics on DataPool.",
        feature1_title: "Comprehensive Commerce Rankings",
        feature1_desc: "Easily compare and plan using daily rankings from top domestic platforms like Olive Young, Ably, Musinsa, and Shinsegae in one place.",
        feature2_title: "Gemini AI Review Mining",
        feature2_desc: "AI summarizes thousands of real reviews to provide cross-analysis of sentiments, benefits, and drawbacks.",
        feature3_title: "Global Purchase Trend Tracking",
        feature3_desc: "Discover overseas K-Trends by analyzing Southeast Asian beauty influencers and Google Search big data.",
        announcements_title: "Latest Updates & Reports",
        empty_announcements: "No announcements available.",
        announcement_report: "Report",
        announcement_update: "Update",
        announcement_notice: "Notice"
    },
    vi: {
        hero_title_1: "Mọi Thứ Về Xu Hướng Thương Mại Điện Tử",
        hero_title_2: "Thông Tin Chuyên Sâu Từ AI",
        hero_subtitle_1: "Từ bảng xếp hạng thời gian thực của Olive Young, Musinsa và Ably đến xu hướng K-Beauty toàn cầu.",
        hero_subtitle_2: "Xem các chỉ số thương mại nhanh nhất và chính xác nhất trên DataPool.",
        feature1_title: "Bảng Xếp Hạng Thương Mại Toàn Diện",
        feature1_desc: "Dễ dàng so sánh và lập kế hoạch sử dụng bảng xếp hạng hàng ngày từ các nền tảng hàng đầu trong nước như Olive Young, Ably, Musinsa và Shinsegae ở cùng một nơi.",
        feature2_title: "Khai Thác Đánh Giá Bằng Gemini AI",
        feature2_desc: "AI tóm tắt hàng ngàn đánh giá thực tế để cung cấp phân tích chéo về cảm xúc, công dụng và nhược điểm.",
        feature3_title: "Theo Dõi Xu Hướng Mua Sắm Toàn Cầu",
        feature3_desc: "Khám phá các K-Trends bằng cách phân tích KOLs làm đẹp Đông Nam Á và dữ liệu lớn từ Google Search.",
        announcements_title: "Cập Nhật & Báo Cáo Mới Nhất",
        empty_announcements: "Chưa có thông báo nào.",
        announcement_report: "Báo cáo",
        announcement_update: "Cập nhật",
        announcement_notice: "Thông báo"
    },
    th: {
        hero_title_1: "ทุกเรื่องเกี่ยวกับเทรนด์อีคอมเมิร์ซ",
        hero_title_2: "ข้อมูลเชิงลึกที่ขับเคลื่อนด้วย AI",
        hero_subtitle_1: "จากการจัดอันดับแบบเรียลไทม์ของ Olive Young, Musinsa และ Ably สู่เทรนด์ K-Beauty ระดับโลก",
        hero_subtitle_2: "ตรวจสอบตัวชี้วัดทางการค้าที่เร็วและแม่นยำที่สุดใน DataPool",
        feature1_title: "การจัดอันดับการค้าแบบครอบคลุม",
        feature1_desc: "เปรียบเทียบและวางแผนได้ง่ายๆ โดยใช้อันดับรายวันจากแพลตฟอร์มชั้นนำในประเทศ เช่น Olive Young, Ably, Musinsa และ Shinsegae ไว้ในที่เดียว",
        feature2_title: "การขุดข้อมูลรีวิวด้วย Gemini AI",
        feature2_desc: "AI สรุปรีวิวจริงหลายพันรายการเพื่อให้วิเคราะห์ข้ามความรู้สึก ประโยชน์ และข้อบกพร่อง",
        feature3_title: "การติดตามเทรนด์การซื้อทั่วโลก",
        feature3_desc: "ค้นพบ K-Trends ในต่างประเทศโดยการวิเคราะห์บิวตี้อินฟลูเอนเซอร์ในเอเชียตะวันออกเฉียงใต้และบิ๊กดาต้าของ Google Search",
        announcements_title: "อัปเดตและรายงานล่าสุด",
        empty_announcements: "ไม่มีประกาศในขณะนี้",
        announcement_report: "รายงาน",
        announcement_update: "อัปเดต",
        announcement_notice: "ประกาศ"
    },
    id: {
        hero_title_1: "Segalanya Tentang Tren E-commerce",
        hero_title_2: "Wawasan Berbasis AI",
        hero_subtitle_1: "Dari peringkat real-time Olive Young, Musinsa, dan Ably hingga tren K-Beauty global.",
        hero_subtitle_2: "Periksa metrik perdagangan tercepat dan paling akurat di DataPool.",
        feature1_title: "Peringkat E-commerce Komprehensif",
        feature1_desc: "Bandingkan dan rencanakan dengan mudah menggunakan peringkat harian dari platform domestik teratas seperti Olive Young, Ably, Musinsa, dan Shinsegae di satu tempat.",
        feature2_title: "Penambangan Ulasan Gemini AI",
        feature2_desc: "AI merangkum ribuan ulasan nyata untuk memberikan analisis silang sentimen, manfaat, dan kekurangan.",
        feature3_title: "Pelacakan Tren Pembelian Global",
        feature3_desc: "Temukan K-Trends di luar negeri dengan menganalisis influencer kecantikan Asia Tenggara dan data besar Google Search.",
        announcements_title: "Pembaruan & Laporan Terbaru",
        empty_announcements: "Belum ada pengumuman.",
        announcement_report: "Laporan",
        announcement_update: "Pembaruan",
        announcement_notice: "Pengumuman"
    },
    ja: {
        hero_title_1: "Eコマーストレンドのすべて",
        hero_title_2: "AIが分析するインサイト",
        hero_subtitle_1: "Olive Young、Musinsa、AblyのリアルタイムランキングからグローバルK-Beautyトレンドまで。",
        hero_subtitle_2: "DataPoolで最も速く正確なコマース指標を確認してください。",
        feature1_title: "核心コマースランキング総合",
        feature1_desc: "Olive Young、Ably、Musinsa、Shinsegaeなど、国内主要プラットフォームの日間順位を1カ所で簡単に比較して企画できます。",
        feature2_title: "Gemini AIレビューマイニング",
        feature2_desc: "数千件の実際の使用レビューをAIが要約し、感情、効果、短所をクロス分析して提供します。",
        feature3_title: "グローバル実購買トレンド追跡",
        feature3_desc: "東南アジアの美容インフルエンサーおよびGoogle検索のビッグデータを分析し、海外のK-Trendを発掘します。",
        announcements_title: "最新のアップデートおよびレポート",
        empty_announcements: "登録されたお知らせはありません。",
        announcement_report: "レポート",
        announcement_update: "アップデート",
        announcement_notice: "お知らせ"
    }
};

const localesDir = path.join(__dirname, 'public', 'locales');
for (const [lang, landingData] of Object.entries(STRINGS)) {
    const filePath = path.join(localesDir, `${lang}.json`);
    if (fs.existsSync(filePath)) {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        data.landing = landingData;
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        console.log(`Updated ${lang}.json`);
    }
}
