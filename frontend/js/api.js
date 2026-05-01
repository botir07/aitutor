// Maktab AI - API client
// Backend bilan bir xil origin-da xizmat qiladi (server.js static frontend serve qiladi)

const API_BASE = window.location.origin;
const TOKEN_KEY = 'maktab_ai_token';
const USER_KEY = 'maktab_ai_user';

const Auth = {
  getToken: () => localStorage.getItem(TOKEN_KEY),
  setToken: (t) => localStorage.setItem(TOKEN_KEY, t),
  clearToken: () => localStorage.removeItem(TOKEN_KEY),

  getUser: () => {
    try { return JSON.parse(localStorage.getItem(USER_KEY)); } catch { return null; }
  },
  setUser: (u) => localStorage.setItem(USER_KEY, JSON.stringify(u)),
  clearUser: () => localStorage.removeItem(USER_KEY),

  isLoggedIn: () => !!localStorage.getItem(TOKEN_KEY),

  logout() {
    Auth.clearToken();
    Auth.clearUser();
    window.location.reload();
  }
};

async function request(path, options = {}) {
  const token = Auth.getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };

  const config = { ...options, headers };
  if (config.body && typeof config.body === 'object' && !(config.body instanceof FormData)) {
    config.body = JSON.stringify(config.body);
  }

  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, config);
  } catch (err) {
    throw new Error('Server bilan ulanib bo\'lmadi. Internet aloqasini tekshiring.');
  }

  let data = null;
  try { data = await res.json(); } catch { /* ignore */ }

  if (res.status === 401 && Auth.isLoggedIn()) {
    Auth.logout();
    return;
  }

  if (!res.ok) {
    const msg = (data && data.message) || `Xatolik: ${res.status}`;
    throw new Error(msg);
  }

  return data;
}

const API = {
  // Auth
  register: (data) => request('/api/auth/register', { method: 'POST', body: data }),
  login:    (email, password) => request('/api/auth/login', { method: 'POST', body: { email, password } }),
  me:       () => request('/api/auth/me'),
  profile:  () => request('/api/auth/profile'),

  // Users
  updateProfile:  (data) => request('/api/users/profile', { method: 'PUT', body: data }),
  changePassword: (currentPassword, newPassword) =>
    request('/api/users/password', { method: 'PUT', body: { currentPassword, newPassword } }),

  // Subjects
  getSubjects: () => request('/api/subjects'),
  getSubject:  (id) => request(`/api/subjects/${id}`),

  // Quizzes
  getQuizzes:  () => request('/api/quizzes'),
  getQuiz:     (id) => request(`/api/quizzes/${id}`),
  submitQuiz:  (id, answers) => request(`/api/quizzes/${id}/submit`, { method: 'POST', body: { answers } }),

  // Grades
  getMyGrades: () => request('/api/grades'),

  // Chat
  sendAI: (content) => request('/api/chat/ai', { method: 'POST', body: { content } }),

  // Health
  health: () => request('/api/health')
};

window.API = API;
window.Auth = Auth;
