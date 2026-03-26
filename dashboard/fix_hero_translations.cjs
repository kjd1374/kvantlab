const fs = require('fs');
const path = require('path');
const dirs = ['public/locales'];

const translations = {
  ko: {
    heroPill: "실시간 한국 시장 트렌드 인텔리전스",
    heroH1: "경쟁자들은 이미 한국의 트렌드를<br>알고 있습니다.<br><em>당신은 어떤가요?</em>",
    heroSub: "올리브영, 무신사, 에이블리, 네이버 쇼핑 등의 실시간 랭킹 정보. 한국 상품 셀러들을 위한 솔루션입니다.",
    btnPrimary: "14일 무료 체험 시작하기 &rarr;",
    btnGhost: "라이브 데이터 보기 &darr;",
    heroNote: "신용카드 불필요 &nbsp;&middot;&nbsp; 언제든 해지 가능"
  },
  en: {
    heroPill: "Real-time Korean Market Intelligence",
    heroH1: "Your competitors already<br>know what's trending<br><em>in Korea.</em> <span class=\"line2\">Do you?</span>",
    heroSub: "Real-time rankings from Olive Young, Musinsa, Ably, Naver Shopping & more — with AI-powered review analysis. Built for K-product sellers.",
    btnPrimary: "Start Free &mdash; 14 Days &rarr;",
    btnGhost: "See live data &darr;",
    heroNote: "No credit card required &nbsp;&middot;&nbsp; Cancel anytime"
  },
  vi: {
    heroPill: "Thông tin thị trường Hàn Quốc theo thời gian thực",
    heroH1: "Đối thủ của bạn đã biết<br>xu hướng tại Hàn Quốc.<br><em>Còn bạn thì sao?</em>",
    heroSub: "Bảng xếp hạng thời gian thực từ Olive Young, Musinsa, Ably, Naver Shopping... với phân tích đánh giá bằng AI. Dành cho người bán hàng K-product.",
    btnPrimary: "Bắt đầu miễn phí 14 ngày &rarr;",
    btnGhost: "Xem dữ liệu trực tiếp &darr;",
    heroNote: "Không cần thẻ tín dụng &nbsp;&middot;&nbsp; Hủy bất cứ lúc nào"
  },
  th: {
    heroPill: "ข้อมูลตลาดเกาหลีแบบเรียลไทม์",
    heroH1: "คู่แข่งของคุณรู้แล้วว่า<br>อะไรกำลังฮิตในเกาหลี<br><em>แล้วคุณล่ะรู้ไหม?</em>",
    heroSub: "อันดับแบบเรียลไทม์จาก Olive Young, Musinsa, Ably, Naver Shopping และอื่นๆ พร้อมการวิเคราะห์รีวิวด้วย AI สร้างขึ้นสำหรับผู้ขายสินค้าเกาหลี",
    btnPrimary: "เริ่มทดลองใช้ฟรี 14 วัน &rarr;",
    btnGhost: "ดูข้อมูลสด &darr;",
    heroNote: "ไม่ต้องใช้บัตรเครดิต &nbsp;&middot;&nbsp; ยกเลิกได้ตลอดเวลา"
  }
};
translations.id = translations.en;
translations.ja = translations.en;

dirs.forEach(dir => {
  const fullDir = path.join(__dirname, dir);
  if (!fs.existsSync(fullDir)) return;
  fs.readdirSync(fullDir).forEach(file => {
    if (file.endsWith('.json')) {
      const lang = file.replace('.json', '');
      const filePath = path.join(fullDir, file);
      try {
        let content = fs.readFileSync(filePath, 'utf8');
        let data = JSON.parse(content);
        if (translations[lang]) {
          Object.assign(data, translations[lang]);
          fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
          console.log('Updated ' + filePath);
        }
      } catch(e) {
        console.error('Error in ' + filePath, e);
      }
    }
  });
});
