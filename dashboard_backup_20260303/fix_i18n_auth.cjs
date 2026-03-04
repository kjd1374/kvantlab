const fs = require('fs');
const path = require('path');

const dirs = [
  path.join(__dirname, 'locales'),
  path.join(__dirname, 'public/locales')
];

const newKeysKo = {
    "login": "로그인",
    "signup": "회원가입",
    "email": "이메일",
    "password": "비밀번호",
    "logging_in": "로그인 중...",
    "signing_up": "가입 중...",
    "email_placeholder": "example@email.com",
    "send_otp": "인증번호 발송",
    "otp_sent": "인증번호가 발송되었습니다.",
    "otp_code": "이메일 인증번호",
    "otp_placeholder": "인증번호 입력",
    "otp_verify": "확인",
    "password_placeholder": "8자 이상 영문/숫자 조합",
    "password_confirm": "비밀번호 확인",
    "password_confirm_placeholder": "비밀번호 재입력",
    "name": "이름",
    "name_placeholder": "홍길동",
    "company": "소속 (회사/브랜드명)",
    "company_placeholder": "케이밴트",
    "platform_label": "주요 활용 플랫폼",
    "select": "선택해주세요",
    "pf_tiktok": "틱톡",
    "pf_fb_ig": "페이스북/인스타",
    "pf_shopee": "쇼피/라자다",
    "pf_qoo10": "큐텐",
    "pf_amazon": "아마존",
    "other": "기타",
    "other_platform": "플랫폼 직접 입력",
    "category_label": "주력 카테고리",
    "cat_beauty": "뷰티/코스메틱",
    "cat_fashion": "패션/어패럴",
    "cat_food": "식품/건기식",
    "cat_living": "리빙/생활용품",
    "other_category": "카테고리 직접 입력",
    "otp_expired": "시간 초과",
    "invalid_email": "올바른 이메일 주소를 먼저 입력해주세요.",
    "sending_otp": "전송 중...",
    "resend_otp": "인증번호 재발송",
    "invalid_otp": "인증번호를 정확히 입력해주세요.",
    "verifying": "확인 중...",
    "verified": "인증 완료",
    "err_req_name": "이름을 입력해주세요.",
    "err_req_company": "소속(회사/브랜드명)을 입력해주세요.",
    "err_req_platform": "주요 활용 플랫폼을 선택 또는 입력해주세요.",
    "err_req_category": "주력 카테고리를 선택 또는 입력해주세요.",
    "err_pw_match": "비밀번호가 일치하지 않습니다.",
    "err_pw_length": "비밀번호는 최소 8자 이상이어야 합니다.",
    "err_otp_req": "이메일 인증을 먼저 완료해주세요."
};

const newKeysEn = {
    "login": "Login",
    "signup": "Sign Up",
    "email": "Email",
    "password": "Password",
    "logging_in": "Logging in...",
    "signing_up": "Signing up...",
    "email_placeholder": "example@email.com",
    "send_otp": "Send OTP",
    "otp_sent": "OTP has been sent.",
    "otp_code": "Email OTP",
    "otp_placeholder": "Enter OTP",
    "otp_verify": "Verify",
    "password_placeholder": "8+ chars, letters & numbers",
    "password_confirm": "Confirm Password",
    "password_confirm_placeholder": "Re-enter password",
    "name": "Name",
    "name_placeholder": "John Doe",
    "company": "Company / Brand",
    "company_placeholder": "K-Vant",
    "platform_label": "Main Platform",
    "select": "Please select",
    "pf_tiktok": "TikTok",
    "pf_fb_ig": "Facebook/IG",
    "pf_shopee": "Shopee/Lazada",
    "pf_qoo10": "Qoo10",
    "pf_amazon": "Amazon",
    "other": "Other",
    "other_platform": "Enter platform directly",
    "category_label": "Main Category",
    "cat_beauty": "Beauty/Cosmetics",
    "cat_fashion": "Fashion/Apparel",
    "cat_food": "Food/Supplements",
    "cat_living": "Living/Household",
    "other_category": "Enter category directly",
    "otp_expired": "Time exp",
    "invalid_email": "Please enter a valid email first.",
    "sending_otp": "Sending...",
    "resend_otp": "Resend OTP",
    "invalid_otp": "Please enter correct OTP.",
    "verifying": "Verifying...",
    "verified": "Verified",
    "err_req_name": "Please enter your name.",
    "err_req_company": "Please enter your company.",
    "err_req_platform": "Please select a platform.",
    "err_req_category": "Please select a category.",
    "err_pw_match": "Passwords do not match.",
    "err_pw_length": "Password must be at least 8 chars.",
    "err_otp_req": "Please complete email verification first."
};

dirs.forEach(dir => {
  if (fs.existsSync(dir)) {
    fs.readdirSync(dir).forEach(file => {
      if (file.endsWith('.json')) {
        const filePath = path.join(dir, file);
        try {
          const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          if (!data.auth) data.auth = {};
          
          let keysToAdd = file.includes('ko.json') ? newKeysKo : newKeysEn;
          let modified = false;
          
          for (const [k, v] of Object.entries(keysToAdd)) {
            if (!data.auth[k]) {
                data.auth[k] = v;
                modified = true;
            }
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
