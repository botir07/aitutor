// Maktab AI — frontend application logic

const App = {
  currentPage: 'dashboard',

  async init() {
    if (!Auth.isLoggedIn()) {
      AuthUI.showLogin();
      return;
    }

    try {
      const me = await API.me();
      Auth.setUser(me.data);
      this.renderUserChrome();
      this.showPage(window.location.hash.slice(2) || 'dashboard');
      window.addEventListener('hashchange', () => {
        this.showPage(window.location.hash.slice(2) || 'dashboard');
      });
    } catch (err) {
      console.error(err);
      Auth.logout();
    }
  },

  renderUserChrome() {
    const user = Auth.getUser();
    if (!user) return;
    const name = `${user.firstName} ${user.lastName}`;
    const initial = (user.firstName || '?').charAt(0).toUpperCase();
    document.querySelectorAll('[data-user-name]').forEach(el => el.textContent = name);
    document.querySelectorAll('[data-user-initial]').forEach(el => el.textContent = initial);
    document.querySelectorAll('[data-user-firstname]').forEach(el => el.textContent = user.firstName);

    const isStaff = ['teacher', 'admin'].includes(user.role);
    document.querySelectorAll('.teacher-nav-only').forEach(el => {
      el.classList.toggle('hidden', !isStaff);
    });

    const showStudentHw = user.role === 'student';
    document.querySelectorAll('.student-nav-only').forEach(el => {
      el.classList.toggle('hidden', !showStudentHw);
    });

    const hideStudentNav = user.role === 'teacher';
    document.querySelectorAll('.student-only-nav').forEach(el => {
      el.classList.toggle('hidden', hideStudentNav);
    });
  },

  async showPage(page) {
    this.currentPage = page;
    if (window.location.hash !== `#/${page}`) {
      window.location.hash = `#/${page}`;
    }

    document.querySelectorAll('[data-nav]').forEach(a => {
      const isActive = a.getAttribute('data-nav') === page;
      a.classList.toggle('text-emerald-400', isActive);
      a.classList.toggle('bg-slate-800/40', isActive);
      a.classList.toggle('text-slate-400', !isActive);
    });

    const main = document.getElementById('main-content');
    main.innerHTML = '<div class="flex justify-center py-20"><div class="loader"></div></div>';

    try {
      switch (page) {
        case 'dashboard': await Pages.dashboard(main); break;
        case 'subjects':  await Pages.subjects(main); break;
        case 'quizzes':   await Pages.quizzes(main); break;
        case 'grades':    await Pages.grades(main); break;
        case 'ai-chat':   await Pages.aiChat(main); break;
        case 'assignments': await Pages.assignments(main); break;
        case 'teacher':
          window.location.replace('/teacher.html');
          break;
        case 'profile':   await Pages.profile(main); break;
        default:          await Pages.dashboard(main);
      }
    } catch (err) {
      main.innerHTML = `
        <div class="glass rounded-2xl p-6 border-red-500/30">
          <div class="flex items-center gap-3 mb-2">
            <span class="material-symbols-outlined icon-lg text-red-400">error</span>
            <h2 class="text-xl font-bold text-red-400">Xatolik</h2>
          </div>
          <p class="text-slate-300">${escapeHtml(err.message)}</p>
        </div>`;
    }
  }
};

function escapeHtml(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
window.escapeHtml = escapeHtml;

function icon(name, sizeClass = 'icon-md', extraClass = '') {
  return `<span class="material-symbols-outlined ${sizeClass} ${extraClass}">${name}</span>`;
}

// ============================================================
// PAGES
// ============================================================
const Pages = {
  async dashboard(main) {
    const user = Auth.getUser() || {};
    const stats = user.stats || {};
    const [subjectsRes, gradesRes, quizzesRes] = await Promise.all([
      API.getSubjects().catch(() => ({ data: [] })),
      API.getMyGrades().catch(() => ({ data: [] })),
      API.getQuizzes().catch(() => ({ data: [] }))
    ]);
    const subjects = subjectsRes.data || [];
    const grades = gradesRes.data || [];
    const quizzes = quizzesRes.data || [];

    const avgGrade = grades.length
      ? (grades.reduce((s, g) => s + g.grade, 0) / grades.length).toFixed(1)
      : (stats.gpa || 0).toFixed(1);

    main.innerHTML = `
      <div class="slide-in space-y-6">
        <div>
          <h1 class="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            Xush kelibsiz, ${escapeHtml(user.firstName || '')}!
            ${icon('waving_hand', 'icon-xl', 'text-amber-400')}
          </h1>
          <p class="text-slate-400">Bugun qanday fan o'rganamiz?</p>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          ${statCard('star', avgGrade, "O'rtacha baho", 'emerald')}
          ${statCard('quiz', stats.quizzesCompleted || grades.filter(g=>g.type==='quiz').length, 'Topshirilgan testlar', 'blue')}
          ${statCard('library_books', subjects.length, 'Mavjud fanlar', 'amber')}
          ${statCard('local_fire_department', stats.streak || 0, 'Ketma-ket kun', 'orange')}
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div class="glass rounded-2xl p-6">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-xl font-bold text-white flex items-center gap-2">
                ${icon('history', 'icon-md', 'text-emerald-400')}
                Oxirgi baholar
              </h2>
              <a href="#/grades" class="text-sm text-emerald-400 hover:text-emerald-300">Hammasi →</a>
            </div>
            ${grades.length === 0
              ? `<div class="text-center py-8">
                  ${icon('school', 'icon-2xl', 'text-slate-600')}
                  <p class="text-slate-400 mt-2">Hali baholar yo'q.<br>Birinchi testni yeching!</p>
                </div>`
              : `<div class="space-y-3">${grades.slice(0, 5).map(g => `
                  <div class="flex justify-between items-center p-3 bg-slate-800/40 rounded-xl">
                    <div class="flex items-center gap-3">
                      ${subjectIconBadge((g.subject && g.subject.icon) || 'menu_book', (g.subject && g.subject.color) || '#4edea3')}
                      <div>
                        <p class="text-white font-semibold">${escapeHtml((g.subject && (g.subject.nameUz || g.subject.name)) || 'Fan')}</p>
                        <p class="text-xs text-slate-400">${new Date(g.date).toLocaleDateString('uz-UZ')}</p>
                      </div>
                    </div>
                    <span class="px-3 py-1 rounded-lg ${gradeColor(g.grade)} font-bold text-lg">${g.grade}</span>
                  </div>`).join('')}</div>`
            }
          </div>

          <div class="glass rounded-2xl p-6">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-xl font-bold text-white flex items-center gap-2">
                ${icon('lightbulb', 'icon-md', 'text-amber-400')}
                Tavsiya etilgan testlar
              </h2>
              <a href="#/quizzes" class="text-sm text-emerald-400 hover:text-emerald-300">Hammasi →</a>
            </div>
            ${quizzes.length === 0
              ? `<div class="text-center py-8">
                  ${icon('inventory_2', 'icon-2xl', 'text-slate-600')}
                  <p class="text-slate-400 mt-2">Testlar topilmadi</p>
                </div>`
              : `<div class="space-y-3">${quizzes.slice(0, 4).map(q => `
                  <button onclick="QuizUI.start('${q._id}')" class="w-full text-left p-3 bg-slate-800/40 hover:bg-slate-800 rounded-xl transition flex items-center gap-3 group">
                    ${subjectIconBadge((q.subject && q.subject.icon) || 'quiz', (q.subject && q.subject.color) || '#4edea3')}
                    <div class="flex-1 min-w-0">
                      <p class="text-white font-semibold truncate">${escapeHtml(q.title)}</p>
                      <p class="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                        ${icon('list_alt', 'icon-sm')} ${(q.questions && q.questions.length) || 0} savol
                        <span class="text-slate-600">·</span>
                        ${icon('timer', 'icon-sm')} ${q.timeLimit || 30} daq
                      </p>
                    </div>
                    ${icon('chevron_right', 'icon-md', 'text-slate-500 group-hover:text-emerald-400 transition')}
                  </button>`).join('')}</div>`
            }
          </div>
        </div>
      </div>`;
  },

  async subjects(main) {
    const res = await API.getSubjects();
    const subjects = res.data || [];

    main.innerHTML = `
      <div class="slide-in space-y-6">
        <h1 class="text-3xl font-bold text-white mb-6 flex items-center gap-3">
          ${icon('library_books', 'icon-xl', 'text-emerald-400')}
          Fanlar
        </h1>
        ${subjects.length === 0
          ? `<div class="glass rounded-2xl p-12 text-center">
              ${icon('search_off', 'icon-2xl', 'text-slate-600')}
              <p class="text-slate-400 mt-3">Fanlar topilmadi</p>
            </div>`
          : `<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              ${subjects.map(s => `
                <div class="glass rounded-2xl p-6 card-hover cursor-pointer">
                  <div class="flex items-center justify-between mb-4">
                    ${subjectIconBadge(s.icon || 'menu_book', s.color || '#4edea3', 'icon-lg', 'w-14 h-14')}
                    <span class="px-3 py-1 rounded-full bg-slate-800 text-xs text-slate-400 capitalize">${escapeHtml(s.difficulty || 'beginner')}</span>
                  </div>
                  <h3 class="text-xl font-bold text-white mb-2">${escapeHtml(s.nameUz || s.name)}</h3>
                  <p class="text-slate-400 text-sm mb-4 line-clamp-2">${escapeHtml(s.description || s.descriptionUz || "Fan haqida qo'shimcha ma'lumot")}</p>
                  <div class="flex items-center gap-4 text-xs text-slate-400 pt-3 border-t border-slate-800">
                    <span class="flex items-center gap-1">${icon('menu_book', 'icon-sm')} ${s.totalLessons || (s.lessons ? s.lessons.length : 0)} dars</span>
                    <span class="flex items-center gap-1 capitalize">${icon('label', 'icon-sm')} ${escapeHtml(s.category || 'core')}</span>
                  </div>
                </div>
              `).join('')}
            </div>`}
      </div>`;
  },

  async quizzes(main) {
    const res = await API.getQuizzes();
    const quizzes = res.data || [];

    main.innerHTML = `
      <div class="slide-in space-y-6">
        <h1 class="text-3xl font-bold text-white mb-6 flex items-center gap-3">
          ${icon('quiz', 'icon-xl', 'text-blue-400')}
          Testlar
        </h1>
        ${quizzes.length === 0
          ? `<div class="glass rounded-2xl p-12 text-center">
              ${icon('inventory_2', 'icon-2xl', 'text-slate-600')}
              <p class="text-slate-400 mt-3">Testlar topilmadi</p>
            </div>`
          : `<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              ${quizzes.map(q => `
                <div class="glass rounded-2xl p-6 card-hover">
                  <div class="flex items-center gap-3 mb-4">
                    ${subjectIconBadge((q.subject && q.subject.icon) || 'quiz', (q.subject && q.subject.color) || '#4edea3', 'icon-md', 'w-10 h-10')}
                    <span class="text-sm text-slate-300 font-medium">${escapeHtml((q.subject && (q.subject.nameUz || q.subject.name)) || 'Fan')}</span>
                    <span class="ml-auto px-3 py-1 rounded-full ${difficultyBadge(q.difficulty)} text-xs font-semibold capitalize">${escapeHtml(q.difficulty || 'medium')}</span>
                  </div>
                  <h3 class="text-lg font-bold text-white mb-3">${escapeHtml(q.title)}</h3>
                  ${q.description ? `<p class="text-sm text-slate-400 mb-3 line-clamp-2">${escapeHtml(q.description)}</p>` : ''}
                  <div class="flex items-center gap-4 text-sm text-slate-400 mb-4">
                    <span class="flex items-center gap-1">${icon('list_alt', 'icon-sm')} ${(q.questions && q.questions.length) || 0} savol</span>
                    <span class="flex items-center gap-1">${icon('timer', 'icon-sm')} ${q.timeLimit || 30} daqiqa</span>
                  </div>
                  <button onclick="QuizUI.start('${q._id}')" class="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-semibold transition-all flex items-center justify-center gap-2">
                    ${icon('play_arrow', 'icon-md')} Testni boshlash
                  </button>
                </div>
              `).join('')}
            </div>`}
      </div>`;
  },

  async grades(main) {
    const res = await API.getMyGrades();
    const grades = res.data || [];

    const avgGrade = grades.length
      ? (grades.reduce((s, g) => s + g.grade, 0) / grades.length).toFixed(2)
      : '—';
    const avgScore = grades.length
      ? Math.round(grades.reduce((s, g) => s + g.score, 0) / grades.length)
      : 0;

    main.innerHTML = `
      <div class="slide-in space-y-6">
        <h1 class="text-3xl font-bold text-white mb-6 flex items-center gap-3">
          ${icon('analytics', 'icon-xl', 'text-purple-400')}
          Baholar
        </h1>

        ${grades.length > 0 ? `
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            ${statCard('grade', avgGrade, "O'rtacha baho", 'emerald')}
            ${statCard('percent', avgScore + '%', "O'rtacha foiz", 'blue')}
            ${statCard('checklist', grades.length, 'Jami baholar', 'amber')}
          </div>
        ` : ''}

        ${grades.length === 0
          ? `<div class="glass rounded-2xl p-12 text-center">
              ${icon('grading', 'icon-2xl', 'text-slate-600')}
              <h3 class="text-white text-lg font-semibold mt-3">Hali baholar yo'q</h3>
              <p class="text-slate-400 mt-1">Test yeching va birinchi bahoyingizni oling!</p>
              <button onclick="App.showPage('quizzes')" class="mt-4 px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl font-semibold inline-flex items-center gap-2">
                ${icon('quiz', 'icon-md')} Testlarga o'tish
              </button>
            </div>`
          : `<div class="glass rounded-2xl overflow-hidden">
              <table class="w-full">
                <thead class="bg-slate-900/50">
                  <tr>
                    <th class="p-4 text-left text-sm text-slate-400 font-medium">Sana</th>
                    <th class="p-4 text-left text-sm text-slate-400 font-medium">Fan</th>
                    <th class="p-4 text-left text-sm text-slate-400 font-medium">Test</th>
                    <th class="p-4 text-center text-sm text-slate-400 font-medium">Foiz</th>
                    <th class="p-4 text-center text-sm text-slate-400 font-medium">Baho</th>
                  </tr>
                </thead>
                <tbody>
                  ${grades.map(g => `
                    <tr class="border-t border-slate-800 hover:bg-slate-800/30 transition">
                      <td class="p-4 text-sm text-slate-400">${new Date(g.date).toLocaleDateString('uz-UZ')}</td>
                      <td class="p-4">
                        <div class="flex items-center gap-2">
                          ${subjectIconBadge((g.subject && g.subject.icon) || 'menu_book', (g.subject && g.subject.color) || '#4edea3', 'icon-sm', 'w-8 h-8')}
                          <span class="font-semibold text-white">${escapeHtml((g.subject && (g.subject.nameUz || g.subject.name)) || '—')}</span>
                        </div>
                      </td>
                      <td class="p-4 text-sm text-slate-300">${escapeHtml((g.quiz && g.quiz.title) || g.type)}</td>
                      <td class="p-4 text-center text-slate-300 font-medium">${g.score}%</td>
                      <td class="p-4 text-center">
                        <span class="inline-flex items-center justify-center w-10 h-10 rounded-full font-bold ${gradeColor(g.grade)}">${g.grade}</span>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>`}
      </div>`;
  },

  async assignments(main) {
    const user = Auth.getUser() || {};
    if (user.role !== 'student') {
      main.innerHTML = `
        <div class="glass rounded-2xl p-8 text-center text-slate-400">
          Vazifalar ro'yxati faqat <strong class="text-white">o'quvchi</strong> akkaunti uchun.
          O'qituvchilar vazifalarni <a href="/teacher.html" class="text-emerald-400 underline">o'qituvchi panelida</a> boshqaradi.
        </div>`;
      return;
    }

    main.innerHTML = `<div class="slide-in space-y-4"><div class="flex justify-center py-16"><div class="loader"></div></div></div>`;
    const res = await API.assignmentsList();
    const items = res.data || [];

    const cards = items.length === 0
      ? `<div class="glass rounded-2xl p-10 text-center text-slate-500">Hozircha topshiriq yo'q.</div>`
      : items.map((a) => {
        const st = a.subject || {};
        const sub = a.mySubmission;
        const due = new Date(a.dueDate);
        let statusLine = '';
        if (sub && sub.score != null) {
          statusLine = `<p class="text-emerald-400 text-sm mt-2">Baho: <strong>${sub.score}</strong> / ${a.maxScore}${sub.feedback ? ` — ${escapeHtml(sub.feedback)}` : ''}</p>`;
        } else if (sub && sub.submittedAt) {
          statusLine = `<p class="text-amber-400 text-sm mt-2">Javob yuborildi — tekshirilmoqda.</p>`;
        }
        return `
          <div class="glass rounded-2xl p-5 mb-4 border border-slate-800" data-assignment-card="${a._id}">
            <div class="flex flex-wrap justify-between gap-2">
              <h3 class="text-white font-bold">${escapeHtml(a.title)}</h3>
              <span class="text-xs text-slate-500">${due.toLocaleString('uz-UZ')}</span>
            </div>
            <p class="text-xs text-slate-500 mt-1">${escapeHtml(st.nameUz || st.name || '')} · max ${a.maxScore} ball</p>
            <p class="text-sm text-slate-400 mt-2 whitespace-pre-wrap">${escapeHtml(a.description || '')}</p>
            ${statusLine}
            <textarea id="hw-ta-${a._id}" rows="4" placeholder="Javobingizni yozing..."
              class="mt-3 w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:border-emerald-500 outline-none"></textarea>
            <button type="button" class="mt-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold btn-hw-submit" data-hw-id="${a._id}">
              ${sub && sub.submittedAt ? 'Qayta yuborish' : 'Topshirish'}
            </button>
            <p class="text-xs text-slate-500 mt-2 hw-msg-${a._id}"></p>
          </div>`;
      }).join('');

    main.innerHTML = `
      <div class="slide-in space-y-4">
        <h1 class="text-3xl font-bold text-white flex items-center gap-3">
          ${icon('assignment', 'icon-xl', 'text-emerald-400')}
          Mening vazifalarim
        </h1>
        ${cards}
      </div>`;

    items.forEach((a) => {
      const sub = a.mySubmission;
      const el = document.getElementById(`hw-ta-${a._id}`);
      if (el && sub && sub.content) el.value = sub.content;
    });

    main.querySelectorAll('.btn-hw-submit').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-hw-id');
        const ta = document.getElementById(`hw-ta-${id}`);
        const msg = main.querySelector(`.hw-msg-${id}`);
        const text = (ta && ta.value || '').trim();
        if (!text) {
          if (msg) msg.textContent = 'Javob bo\'sh bo\'lmasligi kerak.';
          return;
        }
        if (msg) msg.textContent = 'Yuborilmoqda...';
        btn.disabled = true;
        try {
          await API.submitAssignment(id, text);
          if (msg) msg.textContent = 'Yuborildi ✓';
          await Pages.assignments(main);
        } catch (err) {
          if (msg) msg.textContent = err.message || 'Xato';
          btn.disabled = false;
        }
      });
    });
  },

  async aiChat(main) {
    const user = Auth.getUser() || {};
    const uid = String(user.id || '');
    let history = [];
    try {
      if (uid) {
        const r = await API.chatHistory(uid);
        history = r.data || [];
      }
    } catch { /* offline / bo'sh */ }

    const historyHtml = history.map((m) => {
      if (m.type === 'ai_response') return aiBubble(m.content);
      if (m.type === 'ai_chat') return userBubble(m.content);
      const sid = String((m.sender && (m.sender._id || m.sender.id)) || m.sender || '');
      if (sid === uid) return userBubble(m.content);
      return incomingBubble(m.content);
    }).join('');

    const intro = history.length === 0
      ? `${aiBubble("Salom! Men sizning AI o'qituvchingizman. Bugun qaysi mavzuda yordam kerak? Matematika, fizika, biologiya yoki boshqa fan bo'yicha savol berishingiz mumkin.")}
            <div class="flex flex-wrap gap-2 ml-11">
              ${suggestionChip('Matematikadan yordam')}
              ${suggestionChip('Fizika qonunlari')}
              ${suggestionChip('Hujayra tuzilishi')}
            </div>`
      : '';

    main.innerHTML = `
      <div class="slide-in h-[calc(100vh-160px)] md:h-[calc(100vh-120px)] flex flex-col">
        <h1 class="text-3xl font-bold text-white mb-6 flex items-center gap-3">
          ${icon('psychology', 'icon-xl', 'text-emerald-400')}
          AI Mentor
        </h1>
        <p class="text-xs text-slate-500 mb-2">Kalit so'z: .env da GROQ_API_KEY yoki OPENAI_API_KEY — bo'lmasa oddiy qoida javob.</p>
        <div class="glass rounded-2xl flex-1 flex flex-col overflow-hidden">
          <div class="p-4 border-b border-slate-800 flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
              ${icon('smart_toy', 'icon-md', 'text-emerald-400')}
            </div>
            <div>
              <h3 class="text-white font-semibold">Maktab AI Mentor</h3>
              <span class="text-emerald-400 text-sm flex items-center gap-1.5">
                <span class="w-2 h-2 rounded-full bg-emerald-400 pulse"></span> Online
              </span>
            </div>
          </div>
          <div class="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar" id="chat-messages">
            ${historyHtml}
            ${intro}
          </div>
          <div class="p-4 border-t border-slate-800">
            <form id="chat-form" class="flex items-center gap-3">
              <input id="chat-input" type="text" placeholder="Xabaringizni yozing..." autocomplete="off" required
                class="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-sm">
              <button type="submit" class="px-5 py-3 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl transition-all flex items-center gap-2">
                ${icon('send', 'icon-md')}
                <span class="hidden md:inline">Yuborish</span>
              </button>
            </form>
          </div>
        </div>
      </div>`;

    const box = document.getElementById('chat-messages');
    if (box) box.scrollTop = box.scrollHeight;

    document.getElementById('chat-form').addEventListener('submit', ChatUI.send);
    document.querySelectorAll('[data-chip]').forEach(el => {
      el.addEventListener('click', () => {
        const input = document.getElementById('chat-input');
        input.value = el.dataset.chip;
        input.focus();
      });
    });
  },

  async profile(main) {
    let u;
    try {
      const res = await API.profile();
      u = (res && res.data) || Auth.getUser();
    } catch {
      u = Auth.getUser() || {};
    }

    main.innerHTML = `
      <div class="slide-in space-y-6 max-w-3xl">
        <h1 class="text-3xl font-bold text-white mb-6 flex items-center gap-3">
          ${icon('person', 'icon-xl', 'text-emerald-400')}
          Profil
        </h1>

        <div class="glass rounded-2xl p-6">
          <div class="flex items-center gap-4 mb-6 pb-6 border-b border-slate-800">
            <div class="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center text-white font-bold text-3xl">
              ${escapeHtml((u.firstName || '?').charAt(0).toUpperCase())}
            </div>
            <div>
              <h2 class="text-2xl font-bold text-white">${escapeHtml(u.firstName || '')} ${escapeHtml(u.lastName || '')}</h2>
              <p class="text-slate-400 flex items-center gap-1.5 mt-1">${icon('mail', 'icon-sm')} ${escapeHtml(u.email || '')}</p>
              <span class="inline-flex items-center gap-1 mt-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold capitalize border border-emerald-500/20">
                ${icon('verified', 'icon-sm')} ${escapeHtml(u.role || 'student')}
              </span>
            </div>
          </div>

          <form id="profile-form" class="space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              ${field('Ism', 'firstName', u.firstName)}
              ${field('Familiya', 'lastName', u.lastName)}
              ${field('Email', 'email', u.email, 'email', true)}
              ${field('Sinf', 'grade', u.grade || '')}
              ${field('Telefon', 'phone', u.phone || '')}
              ${field('Manzil', 'address', u.address || '')}
            </div>
            <div class="flex items-center gap-3 pt-2">
              <button type="submit" class="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl font-semibold flex items-center gap-2">
                ${icon('save', 'icon-md')} Saqlash
              </button>
              <span id="profile-status" class="text-sm"></span>
            </div>
          </form>
        </div>

        <div class="glass rounded-2xl p-6">
          <h2 class="text-xl font-bold text-white mb-4 flex items-center gap-2">
            ${icon('lock', 'icon-md', 'text-amber-400')}
            Parolni o'zgartirish
          </h2>
          <form id="password-form" class="space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              ${field('Joriy parol', 'currentPassword', '', 'password')}
              ${field('Yangi parol', 'newPassword', '', 'password')}
            </div>
            <div class="flex items-center gap-3">
              <button type="submit" class="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-semibold flex items-center gap-2">
                ${icon('key', 'icon-md')} Parolni o'zgartirish
              </button>
              <span id="password-status" class="text-sm"></span>
            </div>
          </form>
        </div>

        <button onclick="Auth.logout()" class="px-6 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl font-semibold border border-red-500/30 flex items-center gap-2">
          ${icon('logout', 'icon-md')} Chiqish
        </button>
      </div>`;

    document.getElementById('profile-form').addEventListener('submit', ProfileUI.save);
    document.getElementById('password-form').addEventListener('submit', ProfileUI.changePassword);
  }
};

// ============================================================
// QUIZ UI
// ============================================================
const QuizUI = {
  async start(quizId) {
    const main = document.getElementById('main-content');
    main.innerHTML = '<div class="flex justify-center py-20"><div class="loader"></div></div>';

    try {
      const res = await API.getQuiz(quizId);
      const quiz = res.data;

      const render = () => {
        main.innerHTML = `
          <div class="slide-in space-y-6 max-w-3xl">
            <button onclick="App.showPage('quizzes')" class="text-slate-400 hover:text-emerald-400 flex items-center gap-1">
              ${icon('arrow_back', 'icon-md')} Orqaga
            </button>
            <div>
              <h1 class="text-3xl font-bold text-white">${escapeHtml(quiz.title)}</h1>
              <p class="text-slate-400 mt-2 flex items-center gap-3">
                <span class="flex items-center gap-1">${icon('list_alt', 'icon-sm')} ${quiz.questions.length} savol</span>
                <span class="flex items-center gap-1">${icon('timer', 'icon-sm')} ${quiz.timeLimit || 30} daqiqa</span>
              </p>
            </div>
            <form id="quiz-form" class="space-y-4">
              ${quiz.questions.map((q, i) => `
                <div class="glass rounded-2xl p-6">
                  <div class="flex items-start gap-3 mb-4">
                    <span class="flex-shrink-0 w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-sm">${i + 1}</span>
                    <p class="text-white font-semibold flex-1">${escapeHtml(q.text)}</p>
                  </div>
                  <div class="space-y-2 pl-11">
                    ${q.options.map(opt => `
                      <label class="flex items-center gap-3 p-3 rounded-xl bg-slate-800/40 hover:bg-slate-800 cursor-pointer transition">
                        <input type="radio" name="q_${q._id}" value="${opt._id}" class="accent-emerald-500" required>
                        <span class="text-slate-200">${escapeHtml(opt.text)}</span>
                      </label>
                    `).join('')}
                  </div>
                </div>
              `).join('')}
              <button type="submit" class="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-bold text-lg flex items-center justify-center gap-2">
                ${icon('done_all', 'icon-md')} Topshirish
              </button>
            </form>
          </div>`;

        document.getElementById('quiz-form').addEventListener('submit', async (e) => {
          e.preventDefault();
          const form = e.target;
          const submitted = [];
          quiz.questions.forEach(q => {
            const sel = form.querySelector(`input[name="q_${q._id}"]:checked`);
            if (sel) submitted.push({ questionId: q._id, selectedOption: sel.value });
          });

          try {
            const result = await API.submitQuiz(quizId, submitted);
            QuizUI.showResult(quiz, result.data);
          } catch (err) {
            alert(err.message);
          }
        });
      };

      render();
    } catch (err) {
      main.innerHTML = `<div class="glass rounded-2xl p-6">
        <div class="flex items-center gap-3">${icon('error', 'icon-md', 'text-red-400')}<p class="text-red-400">${escapeHtml(err.message)}</p></div>
      </div>`;
    }
  },

  showResult(quiz, result) {
    const main = document.getElementById('main-content');
    const passed = result.passed;
    main.innerHTML = `
      <div class="slide-in max-w-2xl mx-auto text-center space-y-6 py-8">
        <div class="inline-flex items-center justify-center w-32 h-32 rounded-full ${passed ? 'bg-emerald-500/20' : 'bg-amber-500/20'}">
          ${icon(passed ? 'celebration' : 'sentiment_satisfied', 'icon-2xl', passed ? 'text-emerald-400' : 'text-amber-400')}
        </div>
        <h1 class="text-4xl font-bold text-white">${passed ? 'Tabriklaymiz!' : 'Yaxshi urinish!'}</h1>
        <p class="text-slate-400">${escapeHtml(quiz.title)}</p>

        <div class="glass rounded-2xl p-8 space-y-4">
          <div>
            <p class="text-7xl font-bold ${gradeColorText(result.grade)}">${result.grade}</p>
            <p class="text-slate-400 mt-1">Sizning bahoyingiz</p>
          </div>
          <div class="grid grid-cols-2 gap-4 pt-4 border-t border-slate-800">
            <div>
              <p class="text-3xl font-bold text-white">${result.score}%</p>
              <p class="text-sm text-slate-400">To'g'ri javoblar</p>
            </div>
            <div>
              <p class="text-3xl font-bold text-white">${result.earnedPoints}/${result.totalPoints}</p>
              <p class="text-sm text-slate-400">To'plangan ball</p>
            </div>
          </div>
        </div>

        <div class="flex gap-3 justify-center">
          <button onclick="App.showPage('quizzes')" class="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-semibold flex items-center gap-2">
            ${icon('arrow_back', 'icon-md')} Boshqa testlar
          </button>
          <button onclick="App.showPage('grades')" class="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl font-semibold flex items-center gap-2">
            ${icon('analytics', 'icon-md')} Baholarim
          </button>
        </div>
      </div>`;
  }
};
window.QuizUI = QuizUI;

// ============================================================
// CHAT UI
// ============================================================
const ChatUI = {
  async send(e) {
    e.preventDefault();
    const input = document.getElementById('chat-input');
    const messages = document.getElementById('chat-messages');
    const text = input.value.trim();
    if (!text) return;

    document.querySelectorAll('[data-chip]').forEach(el => el.parentElement.remove());

    messages.insertAdjacentHTML('beforeend', userBubble(text));
    input.value = '';
    messages.scrollTop = messages.scrollHeight;

    const typingId = 'typing-' + Date.now();
    messages.insertAdjacentHTML('beforeend', `
      <div id="${typingId}" class="flex gap-3">
        <div class="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">${icon('smart_toy', 'icon-sm', 'text-emerald-400')}</div>
        <div class="glass rounded-2xl rounded-tl-sm p-4">
          <span class="pulse text-slate-400 text-sm">yozmoqda...</span>
        </div>
      </div>`);
    messages.scrollTop = messages.scrollHeight;

    try {
      const res = await API.sendAI(text);
      document.getElementById(typingId)?.remove();
      messages.insertAdjacentHTML('beforeend', aiBubble(res.data.reply.content));
      messages.scrollTop = messages.scrollHeight;
    } catch (err) {
      document.getElementById(typingId)?.remove();
      messages.insertAdjacentHTML('beforeend', aiBubble('Xatolik: ' + err.message));
    }
  }
};
window.ChatUI = ChatUI;

function incomingBubble(text) {
  return `<div class="flex gap-3">
    <div class="w-8 h-8 rounded-full bg-slate-600/40 flex items-center justify-center flex-shrink-0 text-xs text-slate-300 font-bold">?</div>
    <div class="glass rounded-2xl rounded-tl-sm p-4 max-w-[70%]">
      <p class="text-white text-sm whitespace-pre-wrap">${escapeHtml(text)}</p>
    </div>
  </div>`;
}

function userBubble(text) {
  const user = Auth.getUser() || {};
  const initial = (user.firstName || '?').charAt(0).toUpperCase();
  return `<div class="flex gap-3 flex-row-reverse">
    <div class="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-sm font-bold text-blue-300 flex-shrink-0">${escapeHtml(initial)}</div>
    <div class="bg-blue-500/20 border border-blue-500/30 rounded-2xl rounded-tr-sm p-4 max-w-[70%]">
      <p class="text-white text-sm whitespace-pre-wrap">${escapeHtml(text)}</p>
    </div>
  </div>`;
}

function aiBubble(text) {
  return `<div class="flex gap-3">
    <div class="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">${icon('smart_toy', 'icon-sm', 'text-emerald-400')}</div>
    <div class="glass rounded-2xl rounded-tl-sm p-4 max-w-[70%]">
      <p class="text-white text-sm whitespace-pre-wrap">${escapeHtml(text)}</p>
    </div>
  </div>`;
}

function suggestionChip(text) {
  return `<button data-chip="${escapeHtml(text)}" class="px-3 py-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm border border-slate-700 hover:border-emerald-500/50 transition">${escapeHtml(text)}</button>`;
}

// ============================================================
// PROFILE UI
// ============================================================
const ProfileUI = {
  async save(e) {
    e.preventDefault();
    const status = document.getElementById('profile-status');
    const data = Object.fromEntries(new FormData(e.target));
    delete data.email;
    try {
      const res = await API.updateProfile(data);
      Auth.setUser({ ...Auth.getUser(), ...res.data });
      App.renderUserChrome();
      status.innerHTML = `<span class="text-emerald-400 flex items-center gap-1">${icon('check_circle', 'icon-sm')} Saqlandi</span>`;
      setTimeout(() => { status.innerHTML = ''; }, 3000);
    } catch (err) {
      status.innerHTML = `<span class="text-red-400 flex items-center gap-1">${icon('error', 'icon-sm')} ${escapeHtml(err.message)}</span>`;
    }
  },

  async changePassword(e) {
    e.preventDefault();
    const status = document.getElementById('password-status');
    const data = Object.fromEntries(new FormData(e.target));
    try {
      await API.changePassword(data.currentPassword, data.newPassword);
      e.target.reset();
      status.innerHTML = `<span class="text-emerald-400 flex items-center gap-1">${icon('check_circle', 'icon-sm')} Parol o'zgartirildi</span>`;
      setTimeout(() => { status.innerHTML = ''; }, 3000);
    } catch (err) {
      status.innerHTML = `<span class="text-red-400 flex items-center gap-1">${icon('error', 'icon-sm')} ${escapeHtml(err.message)}</span>`;
    }
  }
};
window.ProfileUI = ProfileUI;

// ============================================================
// HELPERS
// ============================================================
function statCard(iconName, value, label, color) {
  const colorClasses = {
    emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', bar: 'bg-emerald-500' },
    blue:    { bg: 'bg-blue-500/10',    text: 'text-blue-400',    bar: 'bg-blue-500' },
    amber:   { bg: 'bg-amber-500/10',   text: 'text-amber-400',   bar: 'bg-amber-500' },
    orange:  { bg: 'bg-orange-500/10',  text: 'text-orange-400',  bar: 'bg-orange-500' },
    purple:  { bg: 'bg-purple-500/10',  text: 'text-purple-400',  bar: 'bg-purple-500' }
  };
  const c = colorClasses[color] || colorClasses.emerald;
  return `<div class="glass rounded-2xl p-6 card-hover">
    <div class="w-12 h-12 rounded-xl ${c.bg} flex items-center justify-center mb-4">
      ${icon(iconName, 'icon-lg', c.text)}
    </div>
    <h3 class="text-3xl font-bold text-white">${escapeHtml(String(value))}</h3>
    <p class="text-slate-400 text-sm mt-1">${escapeHtml(label)}</p>
  </div>`;
}

function subjectIconBadge(iconName, color = '#4edea3', sizeClass = 'icon-md', extraClass = 'w-10 h-10') {
  return `<div class="${extraClass} rounded-xl flex items-center justify-center flex-shrink-0" style="background:${color}22; color:${color}">
    <span class="material-symbols-outlined ${sizeClass}">${escapeHtml(iconName)}</span>
  </div>`;
}

function gradeColor(g) {
  if (g >= 5) return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
  if (g >= 4) return 'bg-blue-500/20 text-blue-400 border border-blue-500/30';
  if (g >= 3) return 'bg-amber-500/20 text-amber-400 border border-amber-500/30';
  return 'bg-red-500/20 text-red-400 border border-red-500/30';
}
function gradeColorText(g) {
  if (g >= 5) return 'text-emerald-400';
  if (g >= 4) return 'text-blue-400';
  if (g >= 3) return 'text-amber-400';
  return 'text-red-400';
}
function difficultyBadge(d) {
  if (d === 'easy')   return 'bg-emerald-500/10 text-emerald-400';
  if (d === 'hard')   return 'bg-red-500/10 text-red-400';
  return 'bg-amber-500/10 text-amber-400';
}

function field(label, name, value = '', type = 'text', readOnly = false) {
  return `<div>
    <label class="block text-sm text-slate-400 mb-1">${escapeHtml(label)}</label>
    <input type="${type}" name="${name}" value="${escapeHtml(value)}" ${readOnly ? 'readonly' : ''}
      class="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:border-emerald-500 outline-none transition ${readOnly ? 'opacity-60 cursor-not-allowed' : ''}">
  </div>`;
}

window.App = App;
window.Pages = Pages;
