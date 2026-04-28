// Sidebar Navigation
const Sidebar = {
  render() {
    const sidebar = document.getElementById('sidebar-container');
    sidebar.innerHTML = `
      <aside class="hidden md:flex flex-col fixed left-0 top-16 h-[calc(100vh-64px)] w-64 bg-slate-900/50 backdrop-blur-2xl border-r border-slate-800 shadow-2xl py-6">
        <div class="px-6 mb-8">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
              <span class="material-symbols-outlined text-emerald-500">school</span>
            </div>
            <div>
              <h2 class="text-white font-semibold leading-tight">Learning Hub</h2>
              <p class="text-xs text-slate-400">Academic Excellence</p>
            </div>
          </div>
        </div>
        
        <nav class="flex-1 flex flex-col gap-1 px-2">
          <a href="#/dashboard" class="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-400 hover:bg-slate-800/80 hover:text-emerald-300 transition-all">
            <span class="material-symbols-outlined">dashboard</span>
            Dashboard
          </a>
          <a href="#/ai-learning" class="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-400 hover:bg-slate-800/80 hover:text-emerald-300 transition-all">
            <span class="material-symbols-outlined">psychology</span>
            AI Learning
          </a>
          <a href="#/quizzes" class="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-400 hover:bg-slate-800/80 hover:text-emerald-300 transition-all">
            <span class="material-symbols-outlined">quiz</span>
            Testlar
          </a>
          <a href="#/gradebook" class="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-400 hover:bg-slate-800/80 hover:text-emerald-300 transition-all">
            <span class="material-symbols-outlined">analytics</span>
            Baholar
          </a>
          <a href="#/subjects" class="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-400 hover:bg-slate-800/80 hover:text-emerald-300 transition-all">
            <span class="material-symbols-outlined">library_books</span>
            Fanlar
          </a>
        </nav>
        
        <div class="px-4 mt-auto">
          <a href="#/settings" class="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-400 hover:bg-slate-800/80 hover:text-emerald-300 transition-all">
            <span class="material-symbols-outlined">settings</span>
            Sozlamalar
          </a>
        </div>
      </aside>
    `;
  }
};
