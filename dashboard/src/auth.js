/**
 * Authentication UI Module
 */
import { signUp, signIn, signOut, getSession } from '../supabase.js';

export function setupAuthUI() {
  const headerRight = document.querySelector('.header-right');
  const session = getSession();

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

function renderAuthButton(container, session) {
  if (session) {
    container.innerHTML = `
      <div class="user-profile">
        <div class="user-avatar">${session.user.email[0].toUpperCase()}</div>
        <div class="user-dropdown">
          <div class="user-email">${session.user.email}</div>
          <button id="logoutBtn" class="dropdown-item">${window.t('common.logout')}</button>
        </div>
      </div>
    `;
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', signOut);
  } else {
    container.innerHTML = `
      <button id="loginOpenBtn" class="btn-login">${window.t('common.login_signup')}</button>
    `;
    const loginBtn = document.getElementById('loginOpenBtn');
    if (loginBtn) loginBtn.addEventListener('click', () => {
      document.getElementById('authModal').classList.add('open');
    });
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
          <button class="auth-tab active" data-mode="login">${window.t('auth.login')}</button>
          <button class="auth-tab" data-mode="signup">${window.t('auth.signup')}</button>
        </div>
        <form id="authForm" class="auth-form">
          <div class="form-group">
            <label>${window.t('auth.email')}</label>
            <input type="email" id="authEmail" required placeholder="example@email.com">
          </div>
          <div class="form-group">
            <label>${window.t('auth.password')}</label>
            <input type="password" id="authPassword" required placeholder="••••••••">
          </div>
          <button type="submit" id="authSubmitBtn" class="btn-submit">${window.t('auth.login')}</button>
          <div id="authError" class="auth-error"></div>
        </form>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', modalHtml);

  const modal = document.getElementById('authModal');
  const form = document.getElementById('authForm');
  const tabs = document.querySelectorAll('.auth-tab');
  const submitBtn = document.getElementById('authSubmitBtn');
  const errorDiv = document.getElementById('authError');
  let mode = 'login';

  // Toggle Login/Signup
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      mode = tab.dataset.mode;
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      submitBtn.textContent = mode === 'login' ? window.t('auth.login') : window.t('auth.signup');
      errorDiv.textContent = '';
    });
  });

  // Close Modal
  document.getElementById('authModalClose').addEventListener('click', () => {
    modal.classList.remove('open');
  });

  // Handle Form Submit
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('authEmail').value;
    const password = document.getElementById('authPassword').value;

    submitBtn.disabled = true;
    submitBtn.textContent = mode === 'login' ? window.t('auth.logging_in') : window.t('auth.signing_up');
    errorDiv.textContent = '';

    try {
      if (mode === 'login') {
        const result = await signIn(email, password);
        if (result.error) throw new Error(result.error_description || result.error);
        window.location.reload();
      } else {
        const result = await signUp(email, password);
        if (result.error) throw new Error(result.error);
        alert(window.t('auth.signup_success'));
        mode = 'login';
        tabs[0].click();
      }
    } catch (err) {
      errorDiv.textContent = err.message;
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = mode === 'login' ? window.t('auth.login') : window.t('auth.signup');
    }
  });
}
