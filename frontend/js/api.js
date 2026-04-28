// Maktab AI - API konfiguratsiyasi
const API_URL = 'http://localhost:5000';
const SOCKET_URL = 'http://localhost:5000';

// API so'rovlar uchun yordamchi class
class API {
  static async request(endpoint, options = {}) {
    const token = localStorage.getItem('maktab_ai_token');
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` })
      },
      ...options
    };
    
    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body);
    }
    
    try {
      const response = await fetch(`${API_URL}${endpoint}`, config);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Xatolik yuz berdi');
      }
      
      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }
  
  static async get(endpoint) {
    return this.request(endpoint);
  }
  
  static async post(endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      body: data
    });
  }
  
  static async put(endpoint, data) {
    return this.request(endpoint, {
      method: 'PUT',
      body: data
    });
  }
  
  static async delete(endpoint) {
    return this.request(endpoint, {
      method: 'DELETE'
    });
  }
}

// API xizmatlari
const AuthService = {
  login: (email, password) => API.post('/api/auth/login', { email, password }),
  register: (userData) => API.post('/api/auth/register', userData),
  getProfile: () => API.get('/api/auth/profile')
};

const SubjectsService = {
  getAll: () => API.get('/api/subjects'),
  getById: (id) => API.get(`/api/subjects/${id}`)
};

const QuizzesService = {
  getAll: () => API.get('/api/quizzes'),
  getById: (id) => API.get(`/api/quizzes/${id}`),
  submit: (id, answers) => API.post(`/api/quizzes/${id}/submit`, { answers })
};

const GradesService = {
  getByStudent: (studentId) => API.get(`/api/grades/student/${studentId || ''}`)
};

const UsersService = {
  updateProfile: (data) => API.put('/api/users/profile', data)
};
