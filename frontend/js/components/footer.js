// Footer
const Footer = {
  render() {
    const footer = document.getElementById('footer-container');
    footer.innerHTML = `
      <footer class="w-full mt-auto bg-slate-950 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center px-8 py-6 ml-0 md:ml-64">
        <p class="text-slate-500 text-sm">© 2024 Maktab AI. An'anaviy ishonch va raqamli tezlashuv.</p>
        <div class="flex gap-6 text-sm">
          <a href="#" class="text-slate-500 hover:text-slate-300">Foydalanish shartlari</a>
          <a href="#" class="text-slate-500 hover:text-slate-300">Maxfiylik siyosati</a>
          <a href="#" class="text-slate-500 hover:text-slate-300">Bog'lanish</a>
        </div>
      </footer>
    `;
  }
};

// Mobile Navigation
const MobileNav = {
  render() {
    const container = document.getElementById('mobile-nav-container');
    container.innerHTML = `
      <nav class="lg:hidden fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 pb-6 pt-3 bg-slate-950/90 backdrop-blur-lg border-t border-slate-800 rounded-t-2xl shadow-lg">
        <a href="#/dashboard" class="flex flex-col items-center justify-center text-slate-400">
          <span class="material-symbols-outlined mb-1">dashboard</span>
          <span class="text-[10px] font-bold uppercase">Dashboard</span>
        </a>
        <a href="#/ai-learning" class="flex flex-col items-center justify-center text-slate-400">
          <span class="material-symbols-outlined mb-1">psychology</span>
          <span class="text-[10px] font-bold uppercase">AI Learn</span>
        </a>
        <a href="#/quizzes" class="flex flex-col items-center justify-center text-slate-400">
          <span class="material-symbols-outlined mb-1">quiz</span>
          <span class="text-[10px] font-bold uppercase">Testlar</span>
        </a>
        <a href="#/profile" class="flex flex-col items-center justify-center text-slate-400">
          <span class="material-symbols-outlined mb-1">person</span>
          <span class="text-[10px] font-bold uppercase">Profil</span>
        </a>
      </nav>
    `;
  }
};
