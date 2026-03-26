const fs = require('fs');
const path = require('path');
const dirs = ['public/locales'];

const translations = {
  ko: {
    heroInterviewText2: "\"어떤 화장품을 팔아야 할지 막막했는데, K-Vant 덕분에 정확한 수요를 알게 되었어요. 지금은 저희 뷰티 스토어가 현지 1위입니다!\"",
    heroInterviewName2: "베트남 뷰티 셀러",
    
    heroInterviewText3: "\"데이터의 정확도가 정말 놀랍습니다. 시장 조사를 위해 며칠을 버릴 필요 없이, 이젠 K-Vant로 10분만에 소싱 결정을 내립니다.\"",
    heroInterviewName3: "인도네시아 종합몰 대표"
  },
  en: {
    heroInterviewText2: "\"I used to be completely lost on what cosmetics to sell. K-Vant showed me the exact demand. Now my beauty store is #1 locally!\"",
    heroInterviewName2: "Top Beauty Seller, Vietnam",

    heroInterviewText3: "\"The accuracy of the Korean fashion data is unbelievable. I save days of market research and make sourcing decisions in 10 minutes.\"",
    heroInterviewName3: "E-commerce CEO, Indonesia"
  },
  vi: {
    heroInterviewText2: "\"Trước đây tôi không biết nên bán mỹ phẩm gì. K-Vant đã cho tôi thấy chính xác nhu cầu. Giờ cửa hàng sắc đẹp của tôi đang đứng nhất!\"",
    heroInterviewName2: "Người bán Mỹ phẩm Cấp cao, Việt Nam",

    heroInterviewText3: "\"Dữ liệu thời trang Hàn Quốc chính xác đến khó tin. Tôi tiết kiệm được hàng ngày trời nghiên cứu thị trường và chốt đơn nhập hàng chỉ trong 10 phút.\"",
    heroInterviewName3: "Giám đốc E-commerce, Indonesia"
  },
  th: {
    heroInterviewText2: "\"เมื่อก่อนฉันไม่รู้เลยว่าจะขายเครื่องสำอางอะไรดี K-Vant ช่วยบอกความต้องการที่แท้จริงให้ฉัน ตอนนี้ร้านความงามของฉันเป็นอันดับ 1 แล้ว!\"",
    heroInterviewName2: "ผู้ขายสินค้าความงามยอดนิยม, เวียดนาม",

    heroInterviewText3: "\"ความแม่นยำของข้อมูลแฟชั่นเกาหลีนั้นน่าเหลือเชื่อมาก ฉันประหยัดเวลาการวิจัยตลาดไปได้หลายวัน และตัดสินใจเรื่องสินค้าได้ใน 10 นาที\"",
    heroInterviewName3: "ซีอีโอ E-commerce, อินโดนีเซีย"
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
