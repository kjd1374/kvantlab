const fs = require('fs');
const path = require('path');
const localesDir = path.join(__dirname, 'public/locales');
const files = fs.readdirSync(localesDir).filter(f => f.endsWith('.json'));

for (const file of files) {
  const filePath = path.join(localesDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  const json = JSON.parse(content);
  
  if (json.support && json.support.faq) {
    if (file === 'en.json' || file === 'id.json' || file === 'vi.json') {
      json.support.faq = "Notice";
    } else {
      // ko.json, ja.json, th.json
      json.support.faq = "공지사항(Notice)";
    }
    fs.writeFileSync(filePath, JSON.stringify(json, null, 2), 'utf8');
    console.log(`Updated ${file}`);
  }
}
