const fs = require('fs');
const path = require('path');

const dirs = [
  path.join(__dirname, 'locales'),
  path.join(__dirname, 'public/locales')
];

dirs.forEach(dir => {
  if (fs.existsSync(dir)) {
    fs.readdirSync(dir).forEach(file => {
      if (file.endsWith('.json')) {
        const filePath = path.join(dir, file);
        try {
          const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          let modified = false;

          if (!data.auth) {
            data.auth = {};
          }

          if (data['auth.btn_resend']) {
            data.auth.btn_resend = data['auth.btn_resend'];
            delete data['auth.btn_resend'];
            modified = true;
          }

          if (data['auth.otp_time_left']) {
            data.auth.otp_time_left = data['auth.otp_time_left'];
            delete data['auth.otp_time_left'];
            modified = true;
          }

          if (modified) {
            fs.writeFileSync(filePath, JSON.stringify(data, null, 4));
            console.log(`Updated ${filePath}`);
          }
        } catch (e) {
          console.error(`Error processing ${filePath}: ${e.message}`);
        }
      }
    });
  }
});
