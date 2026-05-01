// Login va Register UI
const AuthUI = {
  showLogin() {
    document.body.innerHTML = `
      <div class="min-h-screen flex items-center justify-center p-4 bg-grid">
        <div class="glass rounded-3xl p-8 max-w-md w-full">
          <div class="text-center mb-8">
            <h1 class="text-3xl font-black gradient-text mb-2">🚀 Maktab AI</h1>
            <p class="text-slate-400 text-sm">Premium Ta'lim Platformasi</p>
          </div>

          <div class="flex gap-2 mb-6 bg-slate-800/50 p-1 rounded-xl">
            <button id="tab-login" class="flex-1 py-2 rounded-lg bg-emerald-500 text-white font-semibold transition">Kirish</button>
            <button id="tab-register" class="flex-1 py-2 rounded-lg text-slate-400 font-semibold transition">Ro'yxatdan o'tish</button>
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
              <input type="email" name="email" required class="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-emerald-500 outline-none">
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
      window.location.reload();
    } catch (err) {
      status.textContent = err.message;
      status.className = 'text-sm text-center text-red-400';
    }
  },

  async handleRegister(e) {
    e.preventDefault();
    const status = document.getElementById('auth-status-register');
    const data = Object.fromEntries(new FormData(e.target));
    status.textContent = 'Ro\'yxatdan o\'tilmoqda...';
    status.className = 'text-sm text-center text-slate-400';
    try {
      const res = await API.register(data);
      Auth.setToken(res.token);
      Auth.setUser(res.user);
      window.location.reload();
    } catch (err) {
      status.textContent = err.message;
      status.className = 'text-sm text-center text-red-400';
    }
  }
};

window.AuthUI = AuthUI;
