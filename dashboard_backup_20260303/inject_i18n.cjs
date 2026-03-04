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
        hero_subtitle_1: "From real-time shopping rankings to global K-Beauty trend analysis and product prediction.",
        hero_subtitle_2: "Discover data-driven sourcing opportunities fastest with K-Vant.",
        feature1_title: "Real-time Ranking & Trend Analysis",
        feature1_desc: "Track daily ranking data from major commerce platforms in real-time and analyze core market trends in one place.",
        feature2_title: "Product Prediction & AI Review Mining",
        feature2_desc: "AI analyzes thousands of reviews to identify consumer needs and predict promising products that will lead the next market.",
        feature3_title: "Convenient Global B2B Sourcing",
        feature3_desc: "Add trendy products to your cart and quickly request quotes for reasonable purchase prices and shipping fees.",
        announcements_title: "Latest Updates & Reports",
        empty_announcements: "No announcements available.",
        announcement_report: "Report",
        announcement_update: "Update",
        announcement_notice: "Notice"
    },
    vi: {
        hero_title_1: "Mọi Thứ Về Xu Hướng Thương Mại Điện Tử",
        hero_title_2: "Thông Tin Chuyên Sâu Từ AI",
        hero_subtitle_1: "Từ bảng xếp hạng mua sắm thời gian thực đến phân tích xu hướng K-Beauty toàn cầu và dự đoán sản phẩm.",
        hero_subtitle_2: "Khám phá các cơ hội nguồn hàng dựa trên dữ liệu nhanh nhất với K-Vant.",
        feature1_title: "Xếp Hạng Thời Gian Thực & Phân Tích Xu Hướng",
        feature1_desc: "Theo dõi dữ liệu xếp hạng hàng ngày từ các nền tảng thương mại lớn trong thời gian thực và phân tích các xu hướng thị trường cốt lõi tại một nơi.",
        feature2_title: "Dự Đoán Sản Phẩm & Khai Thác Đánh Giá AI",
        feature2_desc: "AI phân tích hàng ngàn đánh giá để xác định nhu cầu của người tiêu dùng và dự đoán các sản phẩm đầy hứa hẹn sẽ dẫn dắt thị trường tiếp theo.",
        feature3_title: "Nguồn Hàng B2B Toàn Cầu Tiện Lợi",
        feature3_desc: "Thêm các sản phẩm xu hướng vào giỏ hàng và nhanh chóng yêu cầu báo giá với mức giá thu mua và phí vận chuyển hợp lý.",
        announcements_title: "Cập Nhật & Báo Cáo Mới Nhất",
        empty_announcements: "Chưa có thông báo nào.",
        announcement_report: "Báo cáo",
        announcement_update: "Cập nhật",
        announcement_notice: "Thông báo"
    },
    th: {
        hero_title_1: "ทุกเรื่องเกี่ยวกับเทรนด์อีคอมเมิร์ซ",
        hero_title_2: "ข้อมูลเชิงลึกที่ขับเคลื่อนด้วย AI",
        hero_subtitle_1: "จากการจัดอันดับการช้อปปิ้งแบบเรียลไทม์ไปจนถึงการวิเคราะห์เทรนด์ K-Beauty ระดับโลกและการคาดการณ์ผลิตภัณฑ์",
        hero_subtitle_2: "ค้นพบโอกาสในการจัดหาแหล่งสินค้าตามข้อมูลได้เร็วที่สุดด้วย K-Vant",
        feature1_title: "การจัดอันดับแบบเรียลไทม์และการวิเคราะห์เทรนด์",
        feature1_desc: "ติดตามข้อมูลการจัดอันดับรายวันจากแพลตฟอร์มคอมเมิร์ซหลักแบบเรียลไทม์ และวิเคราะห์เทรนด์ตลาดหลักในที่เดียว",
        feature2_title: "การคาดการณ์ผลิตภัณฑ์และการขุดคุ้ยรีวิวด้วย AI",
        feature2_desc: "AI วิเคราะห์รีวิวนับพันรายการเพื่อระบุความต้องการของผู้บริโภคและคาดการณ์ผลิตภัณฑ์ที่มีแนวโน้มจะนำตลาดต่อไป",
        feature3_title: "การจัดหาแหล่งสินค้า B2B ทั่วโลกที่สะดวกสบาย",
        feature3_desc: "หยิบผลิตภัณฑ์ที่กำลังเป็นเทรนด์ใส่รถเข็น และขอใบเสนอราคาสำหรับราคารับซื้อและค่าจัดส่งที่เหมาะสมได้อย่างรวดเร็ว",
        announcements_title: "อัปเดตและรายงานล่าสุด",
        empty_announcements: "ไม่มีประกาศในขณะนี้",
        announcement_report: "รายงาน",
        announcement_update: "อัปเดต",
        announcement_notice: "ประกาศ"
    },
    id: {
        hero_title_1: "Segalanya Tentang Tren E-commerce",
        hero_title_2: "Wawasan Berbasis AI",
        hero_subtitle_1: "Dari peringkat belanja real-time hingga analisis tren K-Beauty global dan prediksi produk.",
        hero_subtitle_2: "Temukan peluang sourcing berbasis data tercepat dengan K-Vant.",
        feature1_title: "Peringkat Real-time & Analisis Tren",
        feature1_desc: "Lacak data peringkat harian dari platform e-commerce utama secara real-time dan analisis tren pasar inti di satu tempat.",
        feature2_title: "Prediksi Produk & Penambangan Ulasan AI",
        feature2_desc: "AI menganalisis ribuan ulasan untuk mengidentifikasi kebutuhan konsumen dan memprediksi produk menjanjikan yang akan memimpin pasar berikutnya.",
        feature3_title: "Sourcing B2B Global yang Nyaman",
        feature3_desc: "Tambahkan produk tren ke keranjang Anda dan minta kutipan harga pembelian dan biaya pengiriman yang wajar dengan cepat.",
        announcements_title: "Pembaruan & Laporan Terbaru",
        empty_announcements: "Belum ada pengumuman.",
        announcement_report: "Laporan",
        announcement_update: "Pembaruan",
        announcement_notice: "Pengumuman"
    },
    ja: {
        hero_title_1: "Eコマーストレンドのすべて",
        hero_title_2: "AIが分析するインサイト",
        hero_subtitle_1: "リアルタイムのショッピングランキングから、グローバルなK-Beautyトレンド分析、有望製品の予測まで。",
        hero_subtitle_2: "K-Vantでデータに基づいたソーシング機会を最も早く発掘してください。",
        feature1_title: "リアルタイムランキング＆トレンド分析",
        feature1_desc: "主要なコマースプラットフォームの日次ランキングデータをリアルタイムで把握し、市場の核心的なトレンドの流れを一箇所で比較分析します。",
        feature2_title: "予想製品＆AIレビューマイニング",
        feature2_desc: "数千件のレビューをAIが分析して消費者のニーズを把握し、次の市場を主導する有望な商品を予測します。",
        feature3_title: "便利なグローバルB2Bソーシング",
        feature3_desc: "発掘したトレンド商品をカートに入れ、合理的な仕入れ単価と配送料の見積もりを素早くリクエストできます。",
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
