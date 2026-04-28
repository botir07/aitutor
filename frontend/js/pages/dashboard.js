// Dashboard sahifasi
MaktabAI.prototype.renderDashboard = async function() {
  const main = document.getElementById('main-content-area');
  main.innerHTML = `
    <div class="fade-in">
      <h1 class="text-3xl font-bold text-white mb-6">Dashboard</h1>
      
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div class="glass-panel rounded-xl p-6">
          <h3 class="text-lg font-semibold text-white">O'rtacha baho</h3>
          <p class="text-4xl font-bold text-emerald-400 mt-2">4.8</p>
          <p class="text-sm text-slate-400 mt-1">Top 5%</p>
        </div>
        
        <div class="glass-panel rounded-xl p-6">
          <h3 class="text-lg font-semibold text-white">Testlar</h3>
          <p class="text-4xl font-bold text-blue-400 mt-2">142</p>
          <p class="text-sm text-slate-400 mt-1">Bajarilgan</p>
        </div>
        
        <div class="glass-panel rounded-xl p-6">
          <h3 class="text-lg font-semibold text-white">Fanlar</h3>
          <p class="text-4xl font-bold text-amber-400 mt-2">8</p>
          <p class="text-sm text-slate-400 mt-1">Aktiv</p>
        </div>
        
        <div class="glass-panel rounded-xl p-6">
          <h3 class="text-lg font-semibold text-white">Vaqt</h3>
          <p class="text-4xl font-bold text-purple-400 mt-2">24s</p>
          <p class="text-sm text-slate-400 mt-1">Bu hafta</p>
        </div>
      </div>
      
      <div class="glass-panel rounded-xl p-6">
        <h2 class="text-xl font-bold text-white mb-4">Yaqinda testlar</h2>
        <p class="text-slate-400">Test ma'lumotlari yuklanmoqda...</p>
      </div>
    </div>
  `;
};
