const fs = require('fs');
const path = require('path');
const dirs = ['public/locales'];

const translations = {
  ko: {
    heroInterviewText: "\"K-Vant Lab 덕분에 상품 소싱이 비교도 안 되게 빨라졌습니다. 한국 트렌드를 가장 먼저 파악하고 판매해서 매출 단위가 달라졌어요!\"",
    heroInterviewName: "태국 탑 뷰티/패션 셀러"
  },
  en: {
    heroInterviewText: "\"Using K-Vant Lab, I can source products incredibly fast. Capturing Korean trends before anyone else gave me a massive competitive edge and skyrocketed my profits!\"",
    heroInterviewName: "Top Beauty/Fashion Seller, Thailand"
  },
  vi: {
    heroInterviewText: "\"Sử dụng K-Vant Lab, tôi tìm nguồn hàng nhanh không tưởng. Nắm bắt xu hướng Hàn Quốc trước đối thủ giúp tôi có lợi thế cạnh tranh tuyệt đối và doanh thu tăng vọt!\"",
    heroInterviewName: "Người Bán Hàng Đầu Thời Trang/Mỹ Phẩm, Thái Lan"
  },
  th: {
    heroInterviewText: "\"ด้วย K-Vant Lab ฉันสามารถหาสินค้าได้เร็วมาก การจับเทรนด์เกาหลีก่อนใครทำให้ฉันได้เปรียบคู่แข่งอย่างมหาศาล และทำกำไรเพิ่มขึ้นแบบก้าวกระโดด!\"",
    heroInterviewName: "ผู้ขายสินค้าความงาม/แฟชั่นยอดนิยม, ไทย"
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
