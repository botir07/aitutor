// Login va Register UI
const AuthUI = {
  otp: {
    email: '',
    verified: false,
    cooldown: 0,
    timer: null
  },

  showLogin() {
    document.body.innerHTML = `
      <div class="min-h-screen flex items-center justify-center p-4 bg-grid">
        <div class="glass rounded-3xl p-8 max-w-md w-full">
          <div class="text-center mb-8">
            <h1 class="text-3xl font-black gradient-text mb-2">🚀 Maktab AI</h1>
            <p class="text-slate-400 text-sm">Premium Ta'lim Platformasi</p>
          </div>

          <div class="flex gap-2 mb-6">
            <button id="tab-login" class="flex-1 py-2 rounded-lg bg-emerald-500 text-white font-semibold transition">Kirish</button>
            <button id="tab-register" class="flex-1 py-2 rounded-lg text-slate-400 font-semibold transition">Ro'yxatdan o'tish</button>
          </div>

          <button id="btn-demo" type="button" class="w-full mb-4 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-bold flex items-center justify-center gap-2">
            <span class="material-symbols-outlined text-xl">play_circle</span>
            Demo talaba sifatida kirish
          </button>

          <div class="flex items-center gap-3 mb-4">
            <div class="flex-1 h-px bg-slate-700"></div>
            <span class="text-xs text-slate-500">yoki</span>
            <div class="flex-1 h-px bg-slate-700"></div>
          </div>

          <form id="login-form" class="space-y-4">
            <div>
              <label class="block text-sm text-slate-400 mb-1">Email</label>
              <input type="email" name="email" required class="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-emerald-500 outline-none" placeholder="demo@maktab.uz">
            </div>
            <div>
              <label class="block text-sm text-slate-400 mb-1">Parol</label>
              <input type="password" name="password" required class="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-emerald-500 outline-none" placeholder="••••••••">
            </div>
            <button type="submit" class="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 text-white font-bold">Kirish</button>
            <p id="auth-status" class="text-sm text-center"></p>
          </form>

          <form id="register-form" class="space-y-4 hidden">
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-sm text-slate-400 mb-1">Ism</label>
                <input type="text" name="firstName" required class="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-emerald-500 outline-none">
              </div>
              <div>
                <label class="block text-sm text-slate-400 mb-1">Familiya</label>
                <input type="text" name="lastName" required class="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-emerald-500 outline-none">
              </div>
            </div>
            <div>
              <label class="block text-sm text-slate-400 mb-1">Email</label>
              <div class="flex flex-col sm:flex-row gap-2">
                <input id="register-email" type="email" name="email" required class="flex-1 w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-emerald-500 outline-none transition" autocomplete="email">
                <button id="send-otp-btn" type="button" class="sm:w-32 px-4 py-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-semibold transition flex items-center justify-center gap-2">
                  Send OTP
                </button>
              </div>
            </div>
            <div id="otp-section" class="hidden opacity-0 -translate-y-2 transition-all duration-300">
              <label class="block text-sm text-slate-400 mb-1">OTP kod</label>
              <div class="flex flex-col sm:flex-row gap-2">
                <input id="otp-input" type="text" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" class="flex-1 w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white tracking-[0.35em] text-center focus:border-emerald-500 outline-none" placeholder="000000">
                <button id="verify-otp-btn" type="button" class="sm:w-32 px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition flex items-center justify-center gap-2">
                  Verify OTP
                </button>
              </div>
              <div class="flex items-center justify-between gap-3 mt-2 text-xs">
                <span id="otp-timer" class="text-slate-500">Kod 05:00 ichida amal qiladi</span>
                <button id="resend-otp-btn" type="button" class="hidden text-emerald-400 hover:text-emerald-300 font-semibold">Resend OTP</button>
              </div>
            </div>
            <div>
              <label class="block text-sm text-slate-400 mb-1">Parol (kamida 6 ta belgi)</label>
              <input type="password" name="password" minlength="6" required class="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-emerald-500 outline-none">
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-sm text-slate-400 mb-1">Rol</label>
                <select name="role" class="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-emerald-500 outline-none">
                  <option value="student">O'quvchi</option>
                  <option value="parent">Ota-ona</option>
                  <option value="teacher">O'qituvchi</option>
                </select>
              </div>
              <div>
                <label class="block text-sm text-slate-400 mb-1">Sinf</label>
                <input type="text" name="grade" placeholder="10-A" class="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-emerald-500 outline-none">
              </div>
            </div>
            <button type="submit" class="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 text-white font-bold">Ro'yxatdan o'tish</button>
            <p id="auth-status-register" class="text-sm text-center"></p>
          </form>

          <p class="text-center text-xs text-slate-500 mt-6">Demo: demo@maktab.uz / demo1234</p>
        </div>
      </div>`;

    const loginTab = document.getElementById('tab-login');
    const registerTab = document.getElementById('tab-register');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');

    loginTab.addEventListener('click', () => {
      loginTab.className = 'flex-1 py-2 rounded-lg bg-emerald-500 text-white font-semibold transition';
      registerTab.className = 'flex-1 py-2 rounded-lg text-slate-400 font-semibold transition';
      loginForm.classList.remove('hidden');
      registerForm.classList.add('hidden');
    });
    registerTab.addEventListener('click', () => {
      registerTab.className = 'flex-1 py-2 rounded-lg bg-emerald-500 text-white font-semibold transition';
      loginTab.className = 'flex-1 py-2 rounded-lg text-slate-400 font-semibold transition';
      registerForm.classList.remove('hidden');
      loginForm.classList.add('hidden');
    });

    loginForm.addEventListener('submit', AuthUI.handleLogin);
    registerForm.addEventListener('submit', AuthUI.handleRegister);
    document.getElementById('send-otp-btn').addEventListener('click', () => AuthUI.handleSendOTP());
    document.getElementById('verify-otp-btn').addEventListener('click', () => AuthUI.handleVerifyOTP());
    document.getElementById('resend-otp-btn').addEventListener('click', () => AuthUI.handleSendOTP(true));
    document.getElementById('register-email').addEventListener('input', AuthUI.resetOTPState);

    document.getElementById('btn-demo').addEventListener('click', async () => {
      const btn = document.getElementById('btn-demo');
      btn.disabled = true;
      btn.innerHTML = '<span class="loader" style="width:20px;height:20px;border-width:2px"></span> Yuklanmoqda...';
      await AuthUI.handleDemo();
      btn.disabled = false;
    });
  },

  toast(message, type = 'success') {
    let host = document.getElementById('toast-host');
    if (!host) {
      host = document.createElement('div');
      host.id = 'toast-host';
      host.className = 'fixed top-4 right-4 z-[9999] flex flex-col gap-3 max-w-[calc(100vw-2rem)]';
      document.body.appendChild(host);
    }

    const toast = document.createElement('div');
    const styles = type === 'error'
      ? 'border-red-500/40 bg-red-950/90 text-red-100'
      : 'border-emerald-500/40 bg-slate-900/95 text-emerald-100';
    toast.className = `glass rounded-xl px-4 py-3 border shadow-xl ${styles} fade-in text-sm`;
    toast.textContent = message;
    host.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-8px)';
      toast.style.transition = 'all 0.25s ease';
      setTimeout(() => toast.remove(), 250);
    }, 3200);
  },

  setButtonLoading(button, loadingText, isLoading) {
    if (!button) return;
    if (isLoading) {
      button.dataset.originalText = button.innerHTML;
      button.disabled = true;
      button.innerHTML = `<span class="loader" style="width:16px;height:16px;border-width:2px"></span> ${loadingText}`;
      return;
    }
    button.disabled = false;
    button.innerHTML = button.dataset.originalText || button.textContent;
  },

  getRegisterEmail() {
    return document.getElementById('register-email')?.value.trim() || '';
  },

  resetOTPState() {
    if (AuthUI.otp.verified || AuthUI.otp.email) {
      AuthUI.otp = { email: '', verified: false, cooldown: 0, timer: AuthUI.otp.timer };
      AuthUI.stopOTPTimer();
      const section = document.getElementById('otp-section');
      const emailInput = document.getElementById('register-email');
      const resendBtn = document.getElementById('resend-otp-btn');
      section?.classList.add('hidden', 'opacity-0', '-translate-y-2');
      emailInput?.removeAttribute('readonly');
      emailInput?.classList.remove('opacity-60', 'cursor-not-allowed');
      if (resendBtn) resendBtn.classList.add('hidden');
    }
  },

  revealOTPSection() {
    const section = document.getElementById('otp-section');
    if (!section) return;
    section.classList.remove('hidden');
    requestAnimationFrame(() => {
      section.classList.remove('opacity-0', '-translate-y-2');
    });
  },

  stopOTPTimer() {
    if (AuthUI.otp.timer) {
      clearInterval(AuthUI.otp.timer);
      AuthUI.otp.timer = null;
    }
  },

  startOTPTimer(seconds = 60) {
    AuthUI.stopOTPTimer();
    AuthUI.otp.cooldown = seconds;
    const timerEl = document.getElementById('otp-timer');
    const resendBtn = document.getElementById('resend-otp-btn');
    const sendBtn = document.getElementById('send-otp-btn');

    const tick = () => {
      if (timerEl) {
        const mm = String(Math.floor(AuthUI.otp.cooldown / 60)).padStart(2, '0');
        const ss = String(AuthUI.otp.cooldown % 60).padStart(2, '0');
        timerEl.textContent = AuthUI.otp.cooldown > 0
          ? `Qayta yuborish ${mm}:${ss} dan keyin. Kod 5 daqiqa amal qiladi.`
          : 'Kodni qayta yuborishingiz mumkin';
      }
      if (sendBtn) sendBtn.disabled = AuthUI.otp.cooldown > 0 || AuthUI.otp.verified;
      if (resendBtn) resendBtn.classList.toggle('hidden', AuthUI.otp.cooldown > 0 || AuthUI.otp.verified);

      if (AuthUI.otp.cooldown <= 0) {
        AuthUI.stopOTPTimer();
        return;
      }
      AuthUI.otp.cooldown -= 1;
    };

    tick();
    AuthUI.otp.timer = setInterval(tick, 1000);
  },

  async handleSendOTP() {
    const email = AuthUI.getRegisterEmail();
    const emailInput = document.getElementById('register-email');
    const sendBtn = document.getElementById('send-otp-btn');
    const otpInput = document.getElementById('otp-input');
    const verifyBtn = document.getElementById('verify-otp-btn');

    if (!emailInput?.checkValidity()) {
      emailInput?.reportValidity();
      return;
    }

    AuthUI.setButtonLoading(sendBtn, 'Sending...', true);
    try {
      const res = await API.sendOTP(email);
      AuthUI.otp.email = email;
      AuthUI.otp.verified = false;
      if (otpInput) {
        otpInput.value = '';
        otpInput.readOnly = false;
      }
      if (verifyBtn) {
        verifyBtn.disabled = false;
        verifyBtn.innerHTML = 'Verify OTP';
      }
      if (emailInput) {
        emailInput.readOnly = true;
        emailInput.classList.add('opacity-60', 'cursor-not-allowed');
      }
      AuthUI.revealOTPSection();
      AuthUI.startOTPTimer(60);
      AuthUI.toast(res.message || 'OTP emailga yuborildi');
    } catch (err) {
      AuthUI.toast(err.message, 'error');
    } finally {
      AuthUI.setButtonLoading(sendBtn, 'Sending...', false);
      if (sendBtn) sendBtn.disabled = AuthUI.otp.cooldown > 0 || AuthUI.otp.verified;
    }
  },

  async handleVerifyOTP() {
    const email = AuthUI.otp.email || AuthUI.getRegisterEmail();
    const otpInput = document.getElementById('otp-input');
    const verifyBtn = document.getElementById('verify-otp-btn');
    const sendBtn = document.getElementById('send-otp-btn');
    const timerEl = document.getElementById('otp-timer');
    const otp = otpInput?.value.trim() || '';

    if (!/^\d{6}$/.test(otp)) {
      AuthUI.toast('6 xonali OTP kodni kiriting', 'error');
      otpInput?.focus();
      return;
    }

    AuthUI.setButtonLoading(verifyBtn, 'Checking...', true);
    try {
      const res = await API.verifyOTP(email, otp);
      AuthUI.otp.verified = true;
      AuthUI.stopOTPTimer();
      if (otpInput) otpInput.readOnly = true;
      if (verifyBtn) verifyBtn.innerHTML = 'Verified';
      if (sendBtn) sendBtn.disabled = true;
      if (timerEl) timerEl.textContent = 'Email tasdiqlandi';
      document.getElementById('resend-otp-btn')?.classList.add('hidden');
      AuthUI.toast(res.message || 'Email tasdiqlandi');
    } catch (err) {
      AuthUI.toast(err.message, 'error');
    } finally {
      if (!AuthUI.otp.verified) {
        AuthUI.setButtonLoading(verifyBtn, 'Checking...', false);
      }
    }
  },

  async handleDemo() {
    try {
      const res = await API.login('demo@maktab.uz', 'demo1234');
      Auth.setToken(res.token);
      Auth.setUser(res.user);
      window.location.href = '/demo';
    } catch (err) {
      const status = document.getElementById('auth-status') || document.createElement('p');
      status.textContent = 'Demo foydalanuvchi topilmadi. Iltimos, ro\'yxatdan o\'ting.';
      status.className = 'text-sm text-center text-amber-400 mt-2';
      document.querySelector('#login-form')?.parentNode?.appendChild(status);
    }
  },

  async handleLogin(e) {
    e.preventDefault();
    const status = document.getElementById('auth-status');
    const data = Object.fromEntries(new FormData(e.target));
    status.textContent = 'Kirilmoqda...';
    status.className = 'text-sm text-center text-slate-400';
    try {
      const res = await API.login(data.email, data.password);
      Auth.setToken(res.token);
      Auth.setUser(res.user);
      if (res.user && ['teacher', 'admin'].includes(res.user.role)) {
        window.location.href = '/teacher.html';
        return;
      }
      window.location.href = '/#/dashboard';
    } catch (err) {
      status.textContent = err.message;
      status.className = 'text-sm text-center text-red-400';
    }
  },

  async handleRegister(e) {
    e.preventDefault();
    const status = document.getElementById('auth-status-register');
    const data = Object.fromEntries(new FormData(e.target));
    if (!AuthUI.otp.verified || AuthUI.otp.email !== data.email) {
      status.textContent = 'Avval emailga yuborilgan OTP kodni tasdiqlang.';
      status.className = 'text-sm text-center text-amber-400';
      AuthUI.toast('Ro\'yxatdan o\'tish uchun emailni tasdiqlang', 'error');
      return;
    }
    status.textContent = 'Ro\'yxatdan o\'tilmoqda...';
    status.className = 'text-sm text-center text-slate-400';
    try {
      const res = await API.register(data);
      Auth.setToken(res.token);
      Auth.setUser(res.user);
      if (res.user && ['teacher', 'admin'].includes(res.user.role)) {
        window.location.href = '/teacher.html';
        return;
      }
      window.location.href = '/#/dashboard';
    } catch (err) {
      status.textContent = err.message;
      status.className = 'text-sm text-center text-red-400';
    }
  }
};

window.AuthUI = AuthUI;
