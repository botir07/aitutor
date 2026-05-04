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
  chatHistory: (userId) => request(`/api/chat/${userId}`),

  // Vazifalar (o'quvchi)
  assignmentsList: () => request('/api/assignments'),
  assignmentDetail: (id) => request(`/api/assignments/${id}`),
  submitAssignment: (id, content) =>
    request(`/api/assignments/${id}/submit`, { method: 'POST', body: { content } }),

  // Health
  health: () => request('/api/health'),

  // O'qituvchi paneli (faqat role: teacher | admin)
  teacher: {
    dashboard: () => request('/api/teacher/dashboard'),
    students: (q) => {
      const qs = q ? `?q=${encodeURIComponent(q)}` : '';
      return request(`/api/teacher/students${qs}`);
    },
    saveAttendance: (date, records) =>
      request('/api/teacher/attendance', { method: 'POST', body: { date, records } }),
    attendance: (params = {}) => {
      const pairs = Object.entries(params).filter(([, v]) => v != null && v !== '');
      const qs = pairs.length ? `?${new URLSearchParams(pairs).toString()}` : '';
      return request(`/api/teacher/attendance${qs}`);
    },
    attendanceStats: (days = 30) => request(`/api/teacher/attendance/stats?days=${days}`),
    postGrade: (body) =>
      request('/api/teacher/grades', {
        method: 'POST',
        body: {
          studentId: body.studentId,
          subjectId: body.subjectId,
          score: Number(body.score),
          type: body.type || 'baholash',
          comment: body.comment
        }
      }),
    createAssignment: (body) =>
      request('/api/teacher/assignments', {
        method: 'POST',
        body: {
          title: body.title,
          description: body.description || '',
          subjectId: body.subjectId,
          dueDate: body.dueDate,
          maxScore: body.maxScore != null ? Number(body.maxScore) : undefined
        }
      }),
    assignments: () => request('/api/teacher/assignments'),
    gradeAssignment: (assignmentId, body) =>
      request(`/api/teacher/assignments/${assignmentId}/grade`, {
        method: 'PUT',
        body: {
          studentId: body.studentId,
          score: Number(body.score),
          feedback: body.feedback || ''
        }
      }),
    generateQuizAI: (body) =>
      request('/api/teacher/quizzes/generate-ai', { method: 'POST', body }),
    myQuizzes: () => request('/api/teacher/quizzes')
  },

  createQuiz: (body) => request('/api/quizzes', { method: 'POST', body }),

  // Multiplayer Rooms
  rooms: {
    list: () => request('/api/rooms'),
    get: (code) => request(`/api/rooms/${code}`),
    create: (body) => request('/api/rooms', { method: 'POST', body }),
    update: (code, body) => request(`/api/rooms/${code}`, { method: 'PUT', body }),
    delete: (code) => request(`/api/rooms/${code}`, { method: 'DELETE' })
  }
};

window.API = API;
window.Auth = Auth;
