/**
 * Authentication UI Module
 */
import { signUp, signIn, signOut, getSession, sendOtp, verifyOtp, updateUserPassword, updateUserProfile, fetchUserProfile } from '../supabase.js';

// Fallback for i18n when not loaded via i18n.js
window.t = window.t || ((key) => {
  const fallbacks = {
    'common.admin': '관리자 페이지',
    'mypage.title': '마이페이지',
    'tabs.favorites': '관심 상품',
    'common.logout': '로그아웃',
    'common.login_signup': '1개월 무료로 시작하기 (로그인/가입)',
    'auth.login': '로그인',
    'auth.signup': '회원가입',
    'auth.email': '이메일',
    'auth.password': '비밀번호',
    'auth.logging_in': '로그인 중...',
    'auth.signing_up': '가입 중...'
  };
  return fallbacks[key] || key.split('.').pop();
});

export function setupAuthUI() {
  const headerRight = document.querySelector('.header-right');
  const session = getSession();

  // Initialize Auto-Logout on Inactivity
  if (session && !window._autoLogoutInitiated) {
    window._autoLogoutInitiated = true;
    let logoutTimer;

    // 3 hours = 10800000 ms
    const resetLogoutTimer = () => {
      clearTimeout(logoutTimer);
      logoutTimer = setTimeout(async () => {
        if (getSession()) {
          alert(window.t ? window.t('auth.auto_logout_msg') || '장시간 활동이 없어 보안을 위해 자동 로그아웃 되었습니다.' : '장시간 활동이 없어 보호를 위해 자동 로그아웃 되었습니다.');
          await signOut();
          window.location.href = '/index.html';
        }
      }, 10800000);
    };

    // Listen to common user activities with passive to not hurt performance
    ['mousedown', 'keydown', 'scroll', 'touchstart'].forEach(eventName => {
      document.addEventListener(eventName, resetLogoutTimer, { passive: true });
    });
    resetLogoutTimer();
  }

  // Create Auth Container in Header
  let authContainer = document.querySelector('.header-auth');
  if (!authContainer) {
    authContainer = document.createElement('div');
    authContainer.className = 'header-auth';
    headerRight.appendChild(authContainer);
  }

  renderAuthButton(authContainer, session);
  setupAuthModals();

  // Listen for language changes to re-render
  window.addEventListener('languageChanged', () => {
    renderAuthButton(authContainer, getSession());
    // Force refresh modal if it exists
    const modal = document.getElementById('authModal');
    if (modal) {
      modal.remove();
      setupAuthModals();
    }
  });
}

async function renderAuthButton(container, session) {
  if (session) {
    let isAdmin = false;
    try {
      const profileData = await fetchUserProfile(session.user.id);
      if (profileData) {
        localStorage.setItem('sb-profile', JSON.stringify(profileData));
        if (profileData.role === 'admin') {
          isAdmin = true;
        }
      }
    } catch (err) { console.error('Error fetching role for dropdown:', err); }

    container.innerHTML = `
      <div class="user-profile">
        <div class="user-avatar">${session.user.email[0].toUpperCase()}</div>
        <div class="user-dropdown">
          <div class="user-email">${session.user.email}</div>
          ${isAdmin ? `<a href="/admin/index.html" class="dropdown-item">${window.t('common.admin') || '관리자 페이지'}</a>` : ''}
          <a href="#" onclick="event.preventDefault(); window.openMyPageModal(); setTimeout(() => document.querySelector('.auth-tab[data-mypage-tab=\\'account\\']').click(), 50);" class="dropdown-item">${window.t('mypage.title') || '마이페이지 (계정 정보)'}</a>
          <a href="#" onclick="event.preventDefault(); window.openMyPageModal(); setTimeout(() => document.querySelector('.auth-tab[data-mypage-tab=\\'billing\\']').click(), 50);" class="dropdown-item">${window.t('mypage.billing') || '결제 / 플랜 관리'}</a>
          <a href="#" onclick="event.preventDefault(); window.openMyPageModal(); setTimeout(() => document.querySelector('.auth-tab[data-mypage-tab=\\'sourcing\\']').click(), 50);" class="dropdown-item">${window.t('sourcing.mypage_tab') || '견적 / 소싱 장바구니'}</a>
          <a href="#" onclick="event.preventDefault(); if(document.querySelector('.tab[data-tab=\\'wishlist\\']')) document.querySelector('.tab[data-tab=\\'wishlist\\']').click();" class="dropdown-item">${window.t('tabs.favorites') || '관심 상품 (찜)'}</a>
          
          <div style="margin-top: 8px; border-top: 1px solid #eee; padding-top: 8px;">
            <div style="font-size: 11px; color: #888; padding: 4px 12px; text-transform: uppercase;">${window.t('support.title') || '고객센터'}</div>
            <a href="#" onclick="event.preventDefault(); window.openMyPageModal(); setTimeout(() => { document.querySelector('.auth-tab[data-mypage-tab=\\'support\\']').click(); window.toggleSupportView('inquiry'); }, 50);" class="dropdown-item" style="font-size: 13px;">${window.t('support.inquiry') || '1:1 문의'}</a>
            <a href="#" onclick="event.preventDefault(); window.openMyPageModal(); setTimeout(() => { document.querySelector('.auth-tab[data-mypage-tab=\\'support\\']').click(); window.toggleSupportView('faq'); }, 50);" class="dropdown-item" style="font-size: 13px;">${window.t('support.faq') || 'FAQ'}</a>
            <a href="#" onclick="event.preventDefault(); window.openMyPageModal(); setTimeout(() => { document.querySelector('.auth-tab[data-mypage-tab=\\'support\\']').click(); window.toggleSupportView('inquiry'); document.getElementById('inquiryType').value = 'feedback'; }, 50);" class="dropdown-item" style="font-size: 13px;">${window.t('support.feedback') || '건의 & 요청사항'}</a>
          </div>

          <button id="logoutBtn" class="dropdown-item" style="color:#d32f2f; margin-top:4px; border-top:1px solid #eee;">${window.t('common.logout')}</button>
        </div>
      </div>
    `;
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
        await signOut();
        window.location.href = '/index.html';
      });
    }
  } else {
    container.innerHTML = `
      <button id="loginOpenBtn" class="btn-login" data-i18n="common.login_signup">로그인 / 회원가입</button>
    `;
    const loginBtn = document.getElementById('loginOpenBtn');
    if (loginBtn) loginBtn.addEventListener('click', () => {
      document.getElementById('authModal').classList.add('open');
    });
  }

  if (window.i18n) {
    window.i18n.documentUpdate();
  }
}

function setupAuthModals() {
  // Create Modal HTML if doesn't exist
  if (document.getElementById('authModal')) return;

  const modalHtml = `
    <div class="modal-overlay" id="authModal">
      <div class="modal auth-modal">
        <button class="modal-close" id="authModalClose">&times;</button>
        <div class="auth-tabs">
          <button class="auth-tab active" data-mode="login" data-i18n="auth.login">로그인</button>
          <button class="auth-tab" data-mode="signup" data-i18n="auth.signup">회원가입</button>
        </div>
        <form id="authForm" class="auth-form">
          <!-- Email -->
          <div class="form-group">
            <label><span data-i18n="auth.email">이메일</span> <span class="required">*</span></label>
            <div style="display: flex; gap: 8px;">
              <input type="email" id="authEmail" required data-i18n="auth.email_placeholder" placeholder="example@email.com" style="flex:1;">
              <button type="button" id="sendOtpBtn" class="btn-secondary signup-only" data-i18n="auth.send_otp" style="display:none; white-space:nowrap; padding: 0 12px; border-radius: 6px; cursor: pointer; border: 1px solid var(--border); background: var(--bg-hover); color: var(--text-primary);">인증번호 발송</button>
            </div>
            <div id="otpSentMsg" data-i18n="auth.otp_sent" style="display:none; color: var(--accent-green); font-size: 11px; margin-top: 4px;">인증번호가 발송되었습니다.</div>
          </div>

          <!-- OTP -->
          <div class="form-group signup-only" id="otpGroup" style="display:none;">
            <label><span data-i18n="auth.otp_code">이메일 인증번호</span> <span class="required">*</span></label>
            <div style="display: flex; gap: 8px;">
              <input type="text" id="authOtp" data-i18n="auth.otp_placeholder" placeholder="인증번호 입력" style="flex:1;" maxlength="8">
              <button type="button" id="verifyOtpBtn" class="btn-secondary" data-i18n="auth.otp_verify" style="white-space:nowrap; padding: 0 12px; border-radius: 6px; cursor: pointer; border: 1px solid var(--border); background: var(--bg-hover); color: var(--text-primary);">확인</button>
            </div>
            <div id="otpTimer" style="font-size: 11px; color: var(--accent-red); margin-top: 4px; display: none;">남은 시간: 03:00</div>
            <div id="otpError" style="font-size: 11px; color: var(--accent-red); margin-top: 4px;"></div>
          </div>

          <!-- Password -->
          <div class="form-group">
            <label><span data-i18n="auth.password">비밀번호</span> <span class="required">*</span></label>
            <input type="password" id="authPassword" required data-i18n="auth.password_placeholder" placeholder="8자 이상 영문/숫자 조합" minlength="8">
          </div>

          <!-- Password Confirm -->
          <div class="form-group signup-only" style="display:none;">
            <label><span data-i18n="auth.password_confirm">비밀번호 확인</span> <span class="required">*</span></label>
            <input type="password" id="authPasswordConfirm" data-i18n="auth.password_confirm_placeholder" placeholder="비밀번호 재입력" minlength="8">
          </div>

          <!-- Name & Company (Row) -->
          <div class="form-row signup-only" style="display:none; gap: 12px;">
            <div class="form-group" style="flex:1;">
              <label><span data-i18n="auth.name">이름</span> <span class="required">*</span></label>
              <input type="text" id="authName" data-i18n="auth.name_placeholder" placeholder="홍길동">
            </div>
            <div class="form-group" style="flex:1;">
              <label><span data-i18n="auth.company">소속 (회사/브랜드명)</span> <span class="required">*</span></label>
              <input type="text" id="authCompany" data-i18n="auth.company_placeholder" placeholder="케이밴트">
            </div>
          </div>

          <!-- Platform & Category (Row) -->
          <div class="form-row signup-only" style="display:none; gap: 12px;">
             <!-- Platform -->
            <div class="form-group" style="flex:1;">
              <label><span data-i18n="auth.platform_label">주요 활용 플랫폼</span> <span class="required">*</span></label>
              <select id="authPlatform" style="width: 100%; padding: 10px; border-radius: 6px; border: 1px solid var(--border); background: #ffffff; color: #111111;">
                <option value="" data-i18n="auth.select">선택해주세요</option>
                <option value="tiktok" data-i18n="auth.pf_tiktok">틱톡</option>
                <option value="facebook" data-i18n="auth.pf_fb_ig">페이스북/인스타</option>
                <option value="shopee" data-i18n="auth.pf_shopee">쇼피/라자다</option>
                <option value="qoo10" data-i18n="auth.pf_qoo10">큐텐</option>
                <option value="amazon" data-i18n="auth.pf_amazon">아마존</option>
                <option value="other" data-i18n="auth.other">기타</option>
              </select>
              <input type="text" id="authPlatformOther" data-i18n="auth.other_platform" placeholder="플랫폼 직접 입력" style="display:none; margin-top: 8px;">
            </div>

            <!-- Category -->
            <div class="form-group" style="flex:1;">
              <label><span data-i18n="auth.category_label">주력 카테고리</span> <span class="required">*</span></label>
              <select id="authCategory" style="width: 100%; padding: 10px; border-radius: 6px; border: 1px solid var(--border); background: #ffffff; color: #111111;">
                <option value="" data-i18n="auth.select">선택해주세요</option>
                <option value="beauty" data-i18n="auth.cat_beauty">뷰티/코스메틱</option>
                <option value="fashion" data-i18n="auth.cat_fashion">패션/어패럴</option>
                <option value="food" data-i18n="auth.cat_food">식품/건기식</option>
                <option value="living" data-i18n="auth.cat_living">리빙/생활용품</option>
                <option value="other" data-i18n="auth.other">기타</option>
              </select>
              <input type="text" id="authCategoryOther" data-i18n="auth.other_category" placeholder="카테고리 직접 입력" style="display:none; margin-top: 8px;">
            </div>
          </div>

          <button type="submit" id="authSubmitBtn" class="btn-submit" data-i18n="auth.login">로그인</button>
          <div id="authError" class="auth-error" style="color: var(--accent-red); margin-top: 10px; font-size: 12px; text-align: center;"></div>
        </form>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', modalHtml);

  // Trigger i18n translation immediately after injecting into the DOM
  if (window.i18n) {
    window.i18n.documentUpdate();
  }

  const modal = document.getElementById('authModal');
  const form = document.getElementById('authForm');
  const tabs = document.querySelectorAll('.auth-tab');
  const submitBtn = document.getElementById('authSubmitBtn');
  const errorDiv = document.getElementById('authError');
  let mode = 'login';
  let isOtpVerified = false;

  // Toggle Login/Signup
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      mode = tab.dataset.mode;
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      const submitI18nKey = mode === 'login' ? 'auth.login' : 'auth.signup';
      submitBtn.setAttribute('data-i18n', submitI18nKey);
      submitBtn.textContent = window.t(submitI18nKey);

      errorDiv.textContent = '';

      // Toggle signup-only fields
      const signupFields = document.querySelectorAll('.signup-only');
      signupFields.forEach(el => {
        el.style.display = mode === 'signup' ? (el.tagName === 'DIV' && el.classList.contains('form-row') ? 'flex' : (el.id === 'sendOtpBtn' ? 'block' : 'block')) : 'none';
      });

      // Clear all inputs on toggle
      form.reset();
      isOtpVerified = false;
      document.getElementById('authOtp').disabled = false;
      document.getElementById('verifyOtpBtn').textContent = window.t('auth.otp_verify');
      document.getElementById('verifyOtpBtn').disabled = false;
    });
  });

  // Dynamic input toggles for select boxes
  document.getElementById('authPlatform').addEventListener('change', (e) => {
    const otherInput = document.getElementById('authPlatformOther');
    otherInput.style.display = e.target.value === 'other' ? 'block' : 'none';
    if (e.target.value !== 'other') otherInput.value = '';
  });

  document.getElementById('authCategory').addEventListener('change', (e) => {
    const otherInput = document.getElementById('authCategoryOther');
    otherInput.style.display = e.target.value === 'other' ? 'block' : 'none';
    if (e.target.value !== 'other') otherInput.value = '';
  });

  // Close Modal
  document.getElementById('authModalClose').addEventListener('click', () => {
    modal.classList.remove('open');
  });

  // --- OTP Flow Logic ---
  let otpTimerInterval = null;

  function startOtpTimer() {
    let timeLeft = 180; // 3 minutes
    const timerEl = document.getElementById('otpTimer');
    timerEl.style.display = 'block';
    if (otpTimerInterval) clearInterval(otpTimerInterval);

    otpTimerInterval = setInterval(() => {
      timeLeft--;
      const m = Math.floor(timeLeft / 60).toString().padStart(2, '0');
      const s = (timeLeft % 60).toString().padStart(2, '0');
      timerEl.textContent = `${window.t('auth.otp_time_left')} ${m}:${s}`;
      if (timeLeft <= 0) {
        clearInterval(otpTimerInterval);
        timerEl.textContent = window.t('auth.otp_expired');
        isOtpVerified = false;
        document.getElementById('verifyOtpBtn').disabled = true;
      }
    }, 1000);
  }

  // Send OTP
  document.getElementById('sendOtpBtn').addEventListener('click', async () => {
    const email = document.getElementById('authEmail').value;
    errorDiv.textContent = '';

    if (!email || !email.includes('@')) {
      errorDiv.textContent = window.t('auth.invalid_email') || '올바른 이메일 주소를 먼저 입력해주세요.';
      return;
    }

    const btn = document.getElementById('sendOtpBtn');
    btn.disabled = true;
    btn.textContent = window.t('auth.sending_otp') || '전송 중...';

    const otpErrorDiv = document.getElementById('otpError');
    if (otpErrorDiv) otpErrorDiv.textContent = '';

    const result = await sendOtp(email);
    if (result.error) {
      if (otpErrorDiv) otpErrorDiv.textContent = result.error_description || result.error.message || result.error;
      btn.disabled = false;
      btn.textContent = window.t('auth.resend_otp') || '인증번호 재발송';
    } else {
      btn.textContent = window.t('auth.btn_resend') || '재발송';
      btn.disabled = false;
      document.getElementById('otpGroup').style.display = 'block';
      document.getElementById('otpSentMsg').style.display = 'block';
      startOtpTimer();
    }
  });

  // Verify OTP
  document.getElementById('verifyOtpBtn').addEventListener('click', async () => {
    const email = document.getElementById('authEmail').value;
    const otp = document.getElementById('authOtp').value;
    const otpErrorDiv = document.getElementById('otpError');

    errorDiv.textContent = '';
    if (otpErrorDiv) otpErrorDiv.textContent = '';

    if (!otp || otp.length < 4) {
      if (otpErrorDiv) otpErrorDiv.textContent = window.t('auth.invalid_otp') || '인증번호를 정확히 입력해주세요.';
      return;
    }

    const btn = document.getElementById('verifyOtpBtn');
    btn.disabled = true;
    btn.textContent = window.t('auth.verifying') || '확인 중...';

    const result = await verifyOtp(email, otp);
    if (result.error) {
      if (otpErrorDiv) otpErrorDiv.textContent = result.error_description || result.error.message || result.error;
      btn.disabled = false;
      btn.textContent = window.t('auth.otp_verify');
    } else {
      isOtpVerified = true;
      btn.textContent = window.t('auth.verified') || '인증 완료';
      btn.style.background = 'var(--accent-green)';
      btn.style.color = 'white';
      btn.style.border = 'none';
      document.getElementById('authOtp').disabled = true;

      if (otpTimerInterval) clearInterval(otpTimerInterval);
      document.getElementById('otpTimer').style.display = 'none';
      document.getElementById('otpSentMsg').style.display = 'none';
    }
  });

  // Form Submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorDiv.textContent = '';

    const email = document.getElementById('authEmail').value;
    const password = document.getElementById('authPassword').value;

    submitBtn.disabled = true;
    submitBtn.textContent = mode === 'login' ? window.t('auth.logging_in') : window.t('auth.signing_up');

    try {
      if (mode === 'login') {
        const result = await signIn(email, password);
        if (result.error) throw new Error(result.error_description || result.error);
        if (window.location.pathname === '/' || window.location.pathname.endsWith('index.html')) {
          window.location.href = '/app.html';
        } else {
          window.location.reload();
        }
      } else {
        // --- Detailed Signup Validation ---
        if (!isOtpVerified) {
          throw new Error(window.t('auth.err_req_otp') || '이메일 인증을 먼저 완료해주세요.');
        }

        const passwordConfirm = document.getElementById('authPasswordConfirm').value;
        if (password !== passwordConfirm) {
          throw new Error(window.t('auth.err_pwd_mismatch') || '비밀번호가 일치하지 않습니다.');
        }

        const name = document.getElementById('authName').value.trim();
        const company = document.getElementById('authCompany').value.trim();
        if (!name || !company) {
          throw new Error(window.t('auth.err_req_name') || '이름과 소속을 모두 입력해주세요.');
        }

        const platformSelect = document.getElementById('authPlatform').value;
        const platform = platformSelect === 'other' ? document.getElementById('authPlatformOther').value.trim() : platformSelect;

        const categorySelect = document.getElementById('authCategory').value;
        const category = categorySelect === 'other' ? document.getElementById('authCategoryOther').value.trim() : categorySelect;

        if (!platform || !category) {
          throw new Error(window.t('auth.err_req_pf') || '주요 활용 플랫폼과 주력 카테고리를 선택해주세요.');
        }

        // 1. User is already authenticated via OTP. We just need to update their password.
        const pwResult = await updateUserPassword(password);
        if (pwResult.error) throw new Error(pwResult.error_description || pwResult.error.message);

        // 2. Update their profile with the extended B2B fields
        // Note: The user.id is stored in local storage from the getSession() / OTP verification step
        const sessionStr = localStorage.getItem('sb-user');
        if (!sessionStr) throw new Error(window.t('auth.err_session') || '세션 정보를 찾을 수 없습니다. 다시 시도해주세요.');

        const userObj = JSON.parse(sessionStr);
        const profileUpdateResult = await updateUserProfile(userObj.id, {
          name: name,
          company: company,
          primary_platform: platform,
          primary_category: category,
          subscription_tier: 'free',
          subscription_expires_at: null,
          daily_usage: 0
        });

        if (profileUpdateResult.error) {
          console.error('Profile update warning:', profileUpdateResult.error);
          // Non-blocking warning
        }

        alert(window.t('auth.signup_success') || '회원가입이 완료되었습니다!');

        // Auto-redirect to dashboard
        window.location.href = '/app.html';
      }
    } catch (err) {
      errorDiv.textContent = err.message || window.t('auth.err_general') || '가입 처리 중 오류가 발생했습니다.';
    } finally {
      submitBtn.disabled = false;
      const submitI18nKey = mode === 'login' ? 'auth.login' : 'auth.signup';
      submitBtn.setAttribute('data-i18n', submitI18nKey);
      submitBtn.textContent = window.t(submitI18nKey);
    }
  });
}
