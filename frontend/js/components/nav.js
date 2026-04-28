// Top Navigation Bar
const TopNav = {
  render() {
    const nav = document.getElementById('topnav-container');
    nav.innerHTML = `
      <nav class="fixed top-0 w-full z-50 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800 shadow-lg flex justify-between items-center px-6 h-16">
        <div class="flex items-center gap-8">
          <div class="text-2xl font-bold tracking-tighter text-emerald-500">Maktab AI</div>
          <div class="hidden md:flex gap-6">
            <a href="#/ai-learning" class="text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer">AI Learning</a>
            <a href="#/quizzes" class="text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer">Testlar</a>
            <a href="#/subjects" class="text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer">Fanlar</a>
            <a href="#/gradebook" class="text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer">Baholar</a>
          </div>
        </div>
        <div class="flex items-center gap-4">
          <button class="text-slate-400 hover:text-emerald-400 transition-colors">
            <span class="material-symbols-outlined">notifications</span>
          </button>
          <button class="text-slate-400 hover:text-emerald-400 transition-colors" onclick="app.logout()">
            <span class="material-symbols-outlined">logout</span>
          </button>
          <img src="https://via.placeholder.com/32" alt="Avatar" class="w-8 h-8 rounded-full border border-slate-600" id="user-avatar">
        </div>
      </nav>
    `;
    
    if (app.currentUser) {
      document.getElementById('user-avatar').src = app.currentUser.avatar || 'https://via.placeholder.com/32';
    }
  }
};
