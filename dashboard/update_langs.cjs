const fs = require('fs');
const path = require('path');
const dirs = ['public/locales'];

const newKeys = {
  ko: {
    heroWithoutTitle: 'K-Vant Lab 도입 전',
    heroWithoutDesc: '끝없는 수동 검색,<br>감에 의존한 소싱',
    heroWithTitle: 'K-Vant Lab 도입 후',
    heroWithDesc: '실시간 데이터 추적,<br>명확한 시장 트렌드 파악'
  },
  en: {
    heroWithoutTitle: 'Without K-Vant Lab',
    heroWithoutDesc: 'Endless manual searches,<br>guessing what sells.',
    heroWithTitle: 'With K-Vant Lab',
    heroWithDesc: 'Real-time data tracking,<br>instant market clarity.'
  },
  vi: {
    heroWithoutTitle: 'Trước K-Vant Lab',
    heroWithoutDesc: 'Tìm kiếm thủ công vô tận,<br>đoán xem cái gì bán được.',
    heroWithTitle: 'Sau K-Vant Lab',
    heroWithDesc: 'Theo dõi dữ liệu thời gian thực,<br>nhìn rõ xu hướng ngay lập tức.'
  },
  th: {
    heroWithoutTitle: 'ก่อนใช้ K-Vant Lab',
    heroWithoutDesc: 'ค้นหาด้วยมือไม่รู้จักจบสิ้น,<br>ต้องเดาว่าอะไรขายดี',
    heroWithTitle: 'หลังใช้ K-Vant Lab',
    heroWithDesc: 'ติดตามข้อมูลแบบเรียลไทม์,<br>เห็นเทรนด์ตลาดชัดเจนทันที'
  }
};
newKeys.id = newKeys.en;
newKeys.ja = newKeys.en;

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
        if (newKeys[lang]) {
          Object.assign(data, newKeys[lang]);
          fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
          console.log('Updated ' + filePath);
        }
      } catch(e) {
        console.error('Error in ' + filePath, e);
      }
    }
  });
});
