// Maktab AI - Router
class Router {
  constructor(app) {
    this.app = app;
    this.routes = {
      'dashboard': 'renderDashboard',
      'ai-learning': 'renderAILearning',
      'quizzes': 'renderQuizzes',
      'gradebook': 'renderGradebook',
      'subjects': 'renderSubjects',
      'profile': 'renderProfile',
      'parents': 'renderParents',
      'settings': 'renderSettings'
    };
    this.currentPage = 'dashboard';
  }
  
  init() {
    window.addEventListener('hashchange', () => this.handleRoute());
    
    if (!window.location.hash) {
      window.location.hash = '#/dashboard';
    }
    
    this.handleRoute();
  }
  
  handleRoute() {
    const hash = window.location.hash.slice(2) || 'dashboard';
    const route = this.routes[hash];
    
    if (route && this.app.currentUser) {
      this.currentPage = hash;
      this.app[route]();
    } else if (!this.app.currentUser) {
      this.app.showAuthModal();
    }
  }
  
  navigate(page) {
    window.location.hash = `#/${page}`;
  }
}
