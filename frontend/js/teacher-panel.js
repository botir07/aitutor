// O'qituvchi kabineti — faqat /teacher.html (o'qituvchi vositalari + AI test)
(function (global) {
  function esc(s) {
    if (s == null) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  let mainEl = null;
  let tabsEl = null;
  let welcomeEl = null;
  let studentsCache = [];
  let subjectsCache = [];
  let quizDraft = null;

  async function loadCaches() {
    const [st, sub] = await Promise.all([
      API.teacher.students().catch(() => ({ data: [] })),
      API.getSubjects().catch(() => ({ data: [] }))
    ]);
    studentsCache = st.data || [];
    subjectsCache = sub.data || [];
  }

  function setTab(name) {
    if (!tabsEl) return;
    tabsEl.querySelectorAll('[data-tab]').forEach((b) => {
      const on = b.getAttribute('data-tab') === name;
      b.classList.toggle('teacher-nav-active', on);
      b.classList.toggle('text-slate-300', on);
      b.classList.toggle('text-slate-400', !on);
    });
  }

  async function renderDash() {
    setTab('dash');
    mainEl.innerHTML = '<div class="flex justify-center py-12"><div class="loader mx-auto"></div></div>';
    const [res, quizRes] = await Promise.all([
      API.teacher.dashboard(),
      API.teacher.myQuizzes().catch(() => ({ data: [] }))
    ]);
    const d = res.data;
    const quizN = (quizRes.data && quizRes.data.length) || 0;
    const rg = (d.recentGrades || []).map((g) => {
      const sn = g.student ? (g.student.firstName + ' ' + g.student.lastName) : '—';
      const sub = g.subject ? (g.subject.nameUz || g.subject.name) : '—';
      return `<tr class="border-t border-slate-800"><td class="py-2">${esc(sn)}</td><td>${esc(sub)}</td><td>${g.score}%</td><td>${g.grade}</td></tr>`;
    }).join('');

    mainEl.innerHTML = `
      <div class="max-w-5xl space-y-6">
        <p class="text-slate-500 text-sm">Xush kelibsiz. Bu yerda faqat sinf va fan boshqaruvi — o'quvchi testlari va AI chat alohida saytda.</p>
        <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div class="tp-glass rounded-2xl p-5">
            <p class="text-slate-500 text-xs uppercase tracking-wide">O'quvchilar</p>
            <p class="text-3xl font-bold text-emerald-400 mt-1">${d.studentCount}</p>
          </div>
          <div class="tp-glass rounded-2xl p-5">
            <p class="text-slate-500 text-xs uppercase tracking-wide">Bugungi davomat</p>
            <p class="text-3xl font-bold text-amber-400 mt-1">${d.today.attendanceRatePercent}%</p>
            <p class="text-xs text-slate-500 mt-1">${d.today.presentOrExcused} / ${d.studentCount}</p>
          </div>
          <div class="tp-glass rounded-2xl p-5">
            <p class="text-slate-500 text-xs uppercase tracking-wide">7 kun yozuv</p>
            <p class="text-3xl font-bold text-sky-400 mt-1">${d.weekAttendanceCount}</p>
          </div>
          <div class="tp-glass rounded-2xl p-5">
            <p class="text-slate-500 text-xs uppercase tracking-wide">Mening testlarim</p>
            <p class="text-3xl font-bold text-violet-400 mt-1">${quizN}</p>
            <button type="button" data-goto-tests class="text-xs text-violet-300 hover:underline mt-2">Testlar (AI) →</button>
          </div>
        </div>
        <div class="tp-glass rounded-2xl p-5">
          <h2 class="font-semibold text-white mb-3">So'nggi journal (qo'lda baholar)</h2>
          <div class="overflow-x-auto">
            <table class="w-full text-sm text-left">
              <thead><tr class="text-slate-500"><th class="pb-2">O'quvchi</th><th>Fan</th><th>Ball</th><th>Baho</th></tr></thead>
              <tbody>${rg || '<tr><td colspan="4" class="py-4 text-slate-500">Hozircha yozuv yo\'q</td></tr>'}</tbody>
            </table>
          </div>
        </div>
      </div>`;
    const gt = mainEl.querySelector('[data-goto-tests]');
    if (gt) gt.onclick = () => renderTests();
  }

  async function renderStudents() {
    setTab('students');
    mainEl.innerHTML = `
      <div class="tp-glass rounded-2xl p-5 mb-4 flex gap-3 flex-wrap max-w-5xl">
        <input type="search" id="stu-q" placeholder="Qidirish..." class="flex-1 min-w-[200px] bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-white text-sm">
        <button type="button" id="stu-search" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-white text-sm font-semibold">Qidirish</button>
      </div>
      <div id="stu-list" class="tp-glass rounded-2xl p-5 max-w-5xl"><p class="text-slate-500">Yuklanmoqda...</p></div>`;

    async function run(q) {
      const r = await API.teacher.students(q);
      const rows = (r.data || []).map((s) =>
        `<tr class="border-t border-slate-800"><td class="py-2 font-mono text-xs">${s._id}</td><td>${esc(s.firstName)} ${esc(s.lastName)}</td><td>${esc(s.email)}</td><td>${esc(s.grade || '—')}</td></tr>`
      ).join('');
      document.getElementById('stu-list').innerHTML =
        `<div class="overflow-x-auto"><table class="w-full text-sm"><thead><tr class="text-slate-500 text-left"><th class="pb-2">ID</th><th>Ism</th><th>Email</th><th>Sinf</th></tr></thead><tbody>${rows || '<tr><td colspan="4">Topilmadi</td></tr>'}</tbody></table></div>`;
    }
    document.getElementById('stu-search').onclick = () => run(document.getElementById('stu-q').value.trim());
    await run('');
  }

  async function renderAttendance() {
    setTab('att');
    await loadCaches();
    const today = new Date().toISOString().slice(0, 10);
    const rows = studentsCache.map((s) => `
      <tr class="border-t border-slate-800" data-sid="${s._id}">
        <td class="py-2">${esc(s.firstName)} ${esc(s.lastName)}</td>
        <td>
          <select class="att-status bg-slate-900 border border-slate-700 rounded-lg text-sm px-2 py-1">
            <option value="present">Keldi</option>
            <option value="absent">Kelmadi</option>
            <option value="late">Kech</option>
            <option value="excused">Sababli</option>
          </select>
        </td>
        <td><input type="text" class="att-note w-full bg-slate-900 border border-slate-700 rounded-lg text-sm px-2 py-1" placeholder="Izoh"></td>
      </tr>`).join('');

    mainEl.innerHTML = `
      <div class="max-w-5xl space-y-4">
        <div class="tp-glass rounded-2xl p-5 flex flex-wrap gap-3 items-end">
          <div>
            <label class="block text-xs text-slate-500 mb-1">Sana</label>
            <input type="date" id="att-date" value="${today}" class="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm">
          </div>
          <button type="button" id="att-save" class="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-white font-semibold text-sm">Saqlash</button>
          <span id="att-msg" class="text-sm text-slate-400"></span>
        </div>
        <div class="tp-glass rounded-2xl p-5 overflow-x-auto">
          <table class="w-full text-sm text-left">
            <thead><tr class="text-slate-500"><th>O'quvchi</th><th>Holat</th><th>Izoh</th></tr></thead>
            <tbody>${rows || '<tr><td colspan="3">O\'quvchi yo\'q</td></tr>'}</tbody>
          </table>
        </div>
      </div>`;

    document.getElementById('att-save').onclick = async () => {
      const date = document.getElementById('att-date').value;
      const records = [];
      mainEl.querySelectorAll('tr[data-sid]').forEach((tr) => {
        records.push({
          studentId: tr.getAttribute('data-sid'),
          status: tr.querySelector('.att-status').value,
          note: tr.querySelector('.att-note').value
        });
      });
      if (!records.length) return;
      document.getElementById('att-msg').textContent = 'Saqlanmoqda...';
      try {
        await API.teacher.saveAttendance(date, records);
        document.getElementById('att-msg').textContent = 'Saqlandi ✓';
      } catch (e) {
        document.getElementById('att-msg').textContent = e.message || 'Xato';
      }
    };
  }

  async function renderAttHist() {
    setTab('att-hist');
    mainEl.innerHTML = '<div class="flex justify-center py-12 text-slate-500">Yuklanmoqda...</div>';
    const r = await API.teacher.attendance({});
    const rows = (r.data || []).map((a) => {
      const st = a.student;
      const nm = st ? st.firstName + ' ' + st.lastName : '—';
      return `<tr class="border-t border-slate-800"><td class="py-2">${a.date ? new Date(a.date).toISOString().slice(0, 10) : ''}</td><td>${esc(nm)}</td><td>${esc(a.status)}</td><td>${esc(a.note || '')}</td></tr>`;
    }).join('');
    mainEl.innerHTML = `
      <div class="max-w-5xl space-y-4">
        <div class="tp-glass rounded-2xl p-5 overflow-x-auto">
          <h2 class="font-semibold text-white mb-3">Davomat tarixi</h2>
          <table class="w-full text-sm text-left"><thead><tr class="text-slate-500"><th>Sana</th><th>O'quvchi</th><th>Holat</th><th>Izoh</th></tr></thead>
          <tbody>${rows || '<tr><td colspan="4">Bo\'sh</td></tr>'}</tbody></table>
        </div>
        <div class="tp-glass rounded-2xl p-5">
          <h2 class="font-semibold text-white mb-3">Statistika (30 kun)</h2>
          <div id="att-stats" class="text-sm text-slate-400">Yuklanmoqda...</div>
        </div>
      </div>`;
    const s = await API.teacher.attendanceStats(30);
    const sr = (s.data || []).map((x) => {
      const st = x.student;
      const nm = st && st.firstName ? st.firstName + ' ' + st.lastName : '—';
      return `<tr class="border-t border-slate-800"><td class="py-2">${esc(nm)}</td><td>${x.attendancePercent}%</td><td>${x.daysRecorded} kun</td></tr>`;
    }).join('');
    document.getElementById('att-stats').innerHTML =
      `<table class="w-full text-left"><thead><tr class="text-slate-500"><th>O'quvchi</th><th>Foiz</th><th>Yozuvlar</th></tr></thead><tbody>${sr || '<tr><td colspan="3">Ma\'lumot yo\'q</td></tr>'}</tbody></table>`;
  }

  async function renderJournal() {
    setTab('journal');
    await loadCaches();
    const stOpts = studentsCache.map((s) => `<option value="${s._id}">${esc(s.firstName)} ${esc(s.lastName)}</option>`).join('');
    const subOpts = subjectsCache.map((s) => `<option value="${s._id}">${esc(s.nameUz || s.name)}</option>`).join('');
    mainEl.innerHTML = `
      <div class="max-w-lg">
        <h2 class="text-lg font-semibold text-white mb-2">Journal — qo'lda baho</h2>
        <p class="text-slate-500 text-sm mb-4">Bu yerda sinf journali uchun ball qo'yiladi. O'quvchi test topshirishi alohida «Testlar» bo'limida.</p>
        <div class="tp-glass rounded-2xl p-5">
          <form id="grade-form" class="space-y-3">
            <div><label class="text-xs text-slate-500">O'quvchi</label>
              <select name="studentId" required class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm">${stOpts}</select></div>
            <div><label class="text-xs text-slate-500">Fan</label>
              <select name="subjectId" required class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm">${subOpts}</select></div>
            <div><label class="text-xs text-slate-500">Ball (0–100)</label>
              <input name="score" type="number" min="0" max="100" value="85" required class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm"></div>
            <div><label class="text-xs text-slate-500">Izoh</label>
              <textarea name="comment" rows="2" class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm"></textarea></div>
            <button type="submit" class="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-white font-semibold text-sm">Saqlash</button>
            <p id="grade-msg" class="text-sm text-slate-400"></p>
          </form>
        </div>
      </div>`;
    document.getElementById('grade-form').onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const body = Object.fromEntries(fd.entries());
      document.getElementById('grade-msg').textContent = '...';
      try {
        await API.teacher.postGrade(body);
        document.getElementById('grade-msg').textContent = 'Saqlandi ✓';
      } catch (err) {
        document.getElementById('grade-msg').textContent = err.message;
      }
    };
  }

  async function renderHw() {
    setTab('hw');
    await loadCaches();
    const subOpts = subjectsCache.map((s) => `<option value="${s._id}">${esc(s.nameUz || s.name)}</option>`).join('');
    const stOpts = studentsCache.map((s) => `<option value="${s._id}">${esc(s.firstName)} ${esc(s.lastName)}</option>`).join('');

    mainEl.innerHTML = `
      <div class="max-w-5xl space-y-6">
        <p class="text-slate-500 text-sm">Uy vazifasi berish va tekshirish.</p>
        <div class="grid lg:grid-cols-2 gap-6">
          <div class="tp-glass rounded-2xl p-5">
            <h2 class="font-semibold text-white mb-4">Yangi vazifa</h2>
            <form id="hw-create" class="space-y-3 text-sm">
              <input name="title" required placeholder="Sarlavha" class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white">
              <textarea name="description" placeholder="Tavsif" rows="2" class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white"></textarea>
              <select name="subjectId" required class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white">${subOpts}</select>
              <input name="dueDate" type="datetime-local" required class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white">
              <input name="maxScore" type="number" min="1" value="100" class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white">
              <button type="submit" class="w-full py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-white font-semibold">Yaratish</button>
              <p id="hw-msg" class="text-slate-400 text-sm"></p>
            </form>
          </div>
          <div class="tp-glass rounded-2xl p-5">
            <h2 class="font-semibold text-white mb-4">Vazifaga baho</h2>
            <form id="hw-grade" class="space-y-3 text-sm">
              <select id="hw-aid" class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white"><option value="">— Vazifa —</option></select>
              <select name="studentId" class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white">${stOpts}</select>
              <input name="score" type="number" min="0" placeholder="Ball" required class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white">
              <input name="feedback" placeholder="Izoh" class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white">
              <button type="submit" class="w-full py-2 bg-amber-600 hover:bg-amber-500 rounded-xl text-white font-semibold">Baho qo'yish</button>
              <p id="hw-gmsg" class="text-slate-400 text-sm"></p>
            </form>
          </div>
        </div>
        <div class="tp-glass rounded-2xl p-5" id="hw-list-wrap">Yuklanmoqda...</div>
      </div>`;

    const list = await API.teacher.assignments();
    const sel = document.getElementById('hw-aid');
    (list.data || []).forEach((a) => {
      const o = document.createElement('option');
      o.value = a._id;
      o.textContent = a.title + ' — ' + new Date(a.dueDate).toLocaleString();
      sel.appendChild(o);
    });

    document.getElementById('hw-create').onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const body = Object.fromEntries(fd.entries());
      document.getElementById('hw-msg').textContent = '...';
      try {
        await API.teacher.createAssignment({ ...body, dueDate: new Date(body.dueDate).toISOString() });
        document.getElementById('hw-msg').textContent = 'Yaratildi ✓';
        renderHw();
      } catch (err) {
        document.getElementById('hw-msg').textContent = err.message;
      }
    };

    document.getElementById('hw-grade').onsubmit = async (e) => {
      e.preventDefault();
      const aid = document.getElementById('hw-aid').value;
      if (!aid) return;
      const fd = new FormData(e.target);
      const body = Object.fromEntries(fd.entries());
      document.getElementById('hw-gmsg').textContent = '...';
      try {
        await API.teacher.gradeAssignment(aid, body);
        document.getElementById('hw-gmsg').textContent = 'Saqlandi ✓';
      } catch (err) {
        document.getElementById('hw-gmsg').textContent = err.message;
      }
    };

    const cards = (list.data || []).map((a) => {
      const subs = (a.submissions || []).length;
      return `<div class="border border-slate-700 rounded-xl p-4 mb-3">
        <div class="font-medium text-white">${esc(a.title)}</div>
        <div class="text-xs text-slate-500">${new Date(a.dueDate).toLocaleString()} · topshiriqlar: ${subs}</div>
      </div>`;
    }).join('');
    document.getElementById('hw-list-wrap').innerHTML =
      `<h3 class="font-semibold text-white mb-3">Ro'yxat</h3>${cards || '<p class="text-slate-500">Hozircha yo\'q</p>'}`;
  }

  function buildQuizListRows(myQ) {
    return (myQ.data || []).map((q) => {
      const sn = q.subject ? (q.subject.nameUz || q.subject.name) : '—';
      const st = q.isActive !== false ? 'Faol' : 'O\'chirilgan';
      return `<tr class="border-t border-slate-800"><td class="py-2 pr-4">${esc(q.title)}</td><td class="py-2">${esc(sn)}</td><td class="py-2">${q.questionCount ?? 0}</td><td class="py-2 text-slate-400">${st}</td></tr>`;
    }).join('');
  }

  async function renderTests() {
    setTab('tests');
    await loadCaches();
    const subOpts = subjectsCache.map((s) => `<option value="${s._id}">${esc(s.nameUz || s.name)}</option>`).join('');
    const myQ = await API.teacher.myQuizzes().catch(() => ({ data: [] }));
    const listRows = buildQuizListRows(myQ);

    if (!quizDraft) {
      mainEl.innerHTML = `
        <div class="max-w-3xl space-y-6">
          <div>
            <h2 class="text-xl font-bold text-white flex items-center gap-2"><span class="material-symbols-outlined text-violet-400">auto_awesome</span>Yangi test — AI yordamida</h2>
            <p class="text-slate-500 text-sm mt-2 leading-relaxed">Mavzu yozing; AI savollar va variantlar tuzadi. Natijani tekshirib, tahrirlang, keyin bazaga saqlang. Serverda <code class="text-emerald-400/90">GROQ_API_KEY</code> (yoki OpenAI) bo'lishi kerak.</p>
          </div>
          <div class="tp-glass rounded-2xl p-5 space-y-4">
            <div class="grid sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs text-slate-500 mb-1">Fan</label>
                <select id="ai-subject" class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm">${subOpts}</select>
              </div>
              <div>
                <label class="block text-xs text-slate-500 mb-1">Savollar soni</label>
                <input type="number" id="ai-num" min="3" max="15" value="5" class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm">
              </div>
            </div>
            <div>
              <label class="block text-xs text-slate-500 mb-1">Mavzu / bo'lim</label>
              <input type="text" id="ai-topic" class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm" placeholder="Masalan: Nyuton qonunlari" maxlength="400">
            </div>
            <div>
              <label class="block text-xs text-slate-500 mb-1">Qiyinlik</label>
              <select id="ai-diff" class="w-full max-w-xs bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm">
                <option value="easy">Oson</option>
                <option value="medium" selected>O'rtacha</option>
                <option value="hard">Qiyin</option>
              </select>
            </div>
            <button type="button" id="ai-gen" class="inline-flex items-center justify-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-semibold text-sm">
              <span class="material-symbols-outlined text-lg">psychology</span>
              AI bilan tayyorlash
            </button>
            <p id="ai-msg" class="text-sm text-amber-200/80"></p>
          </div>
          <div class="tp-glass rounded-2xl p-5">
            <h3 class="font-semibold text-white mb-3">Mening testlarim</h3>
            <div class="overflow-x-auto">
              <table class="w-full text-sm text-left">
                <thead><tr class="text-slate-500"><th class="pb-2">Sarlavha</th><th>Fan</th><th>Savollar</th><th>Holat</th></tr></thead>
                <tbody>${listRows || '<tr><td colspan="4" class="py-4 text-slate-500">Hozircha test yo\'q — yuqoridan yarating.</td></tr>'}</tbody>
              </table>
            </div>
          </div>
        </div>`;

      document.getElementById('ai-gen').onclick = async () => {
        const subjectId = document.getElementById('ai-subject').value;
        const topic = document.getElementById('ai-topic').value.trim();
        const numQuestions = parseInt(document.getElementById('ai-num').value, 10) || 5;
        const difficulty = document.getElementById('ai-diff').value;
        const msg = document.getElementById('ai-msg');
        const btn = document.getElementById('ai-gen');
        if (!topic) {
          msg.textContent = 'Mavzuni kiriting.';
          return;
        }
        msg.textContent = 'AI ishlayapti (10–40 s)...';
        btn.disabled = true;
        try {
          const r = await API.teacher.generateQuizAI({ subjectId, topic, numQuestions, difficulty });
          quizDraft = r.data;
          renderTests();
        } catch (e) {
          msg.textContent = e.message || 'Xato';
        }
        btn.disabled = false;
      };
      return;
    }

    const qBlocks = quizDraft.questions.map((q, qi) => {
      const opts = q.options.map((o, oi) => `
        <div class="flex gap-2 items-center mt-1.5">
          <input type="radio" name="cor-${qi}" value="${oi}" ${o.isCorrect ? 'checked' : ''} class="accent-emerald-500 shrink-0">
          <input type="text" class="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-sm text-white q-opt" data-qi="${qi}" data-oi="${oi}" value="${esc(o.text)}">
        </div>`).join('');
      return `
        <div class="tp-glass rounded-xl p-4 mb-4" data-qcard="${qi}">
          <p class="text-xs text-slate-500 mb-1">Savol ${qi + 1}</p>
          <textarea class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white q-text" rows="3" data-qi="${qi}">${esc(q.text)}</textarea>
          <p class="text-xs text-slate-500 mt-2">To'g'ri javobni belgilang</p>
          ${opts}
        </div>`;
    }).join('');

    mainEl.innerHTML = `
      <div class="max-w-3xl space-y-6">
        <div class="flex flex-wrap items-center gap-3">
          <h2 class="text-xl font-bold text-white">Tahrir va saqlash</h2>
          <button type="button" id="qd-cancel" class="text-sm text-slate-400 hover:text-white underline">Bekor qilish</button>
        </div>
        <div class="tp-glass rounded-2xl p-5 space-y-3">
          <input type="text" id="qd-title" class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-medium" value="${esc(quizDraft.title)}">
          <textarea id="qd-desc" rows="2" class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white">${esc(quizDraft.description || '')}</textarea>
          <div class="grid sm:grid-cols-3 gap-3 text-sm">
            <div><label class="text-xs text-slate-500">Vaqt (daq)</label><input type="number" id="qd-time" value="30" min="5" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-white"></div>
            <div><label class="text-xs text-slate-500">O'tish %</label><input type="number" id="qd-pass" value="70" min="0" max="100" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-white"></div>
            <div><label class="text-xs text-slate-500">Urinishlar</label><input type="number" id="qd-attempts" value="3" min="1" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-white"></div>
          </div>
        </div>
        <div id="qd-qlist">${qBlocks}</div>
        <button type="button" id="qd-save" class="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold">Bazaga saqlash</button>
        <p id="qd-msg" class="text-sm text-slate-400"></p>
        <div class="tp-glass rounded-2xl p-5">
          <h3 class="font-semibold text-white mb-3">Mening testlarim</h3>
          <div class="overflow-x-auto">
            <table class="w-full text-sm text-left">
              <thead><tr class="text-slate-500"><th class="pb-2">Sarlavha</th><th>Fan</th><th>Savollar</th><th>Holat</th></tr></thead>
              <tbody>${listRows || '<tr><td colspan="4" class="py-4">—</td></tr>'}</tbody>
            </table>
          </div>
        </div>
      </div>`;

    document.getElementById('qd-cancel').onclick = () => {
      quizDraft = null;
      renderTests();
    };

    document.getElementById('qd-save').onclick = async () => {
      const title = document.getElementById('qd-title').value.trim();
      const description = document.getElementById('qd-desc').value.trim();
      const msg = document.getElementById('qd-msg');
      const saveBtn = document.getElementById('qd-save');
      if (!title) {
        msg.textContent = 'Sarlavha kerak.';
        return;
      }

      const questions = [];
      const n = quizDraft.questions.length;
      for (let qi = 0; qi < n; qi++) {
        const card = mainEl.querySelector('[data-qcard="' + qi + '"]');
        if (!card) continue;
        const ta = card.querySelector('.q-text');
        const text = (ta && ta.value) ? ta.value.trim() : '';
        const corEl = card.querySelector('input[name="cor-' + qi + '"]:checked');
        const corIdx = corEl ? parseInt(corEl.value, 10) : 0;
        const inps = card.querySelectorAll('.q-opt');
        const options = [];
        inps.forEach((inp, oi) => {
          options.push({ text: (inp.value || '').trim() || 'Variant ' + (oi + 1), isCorrect: oi === corIdx });
        });
        if (options.length !== 4) continue;
        questions.push({
          text,
          difficulty: quizDraft.questions[qi].difficulty || quizDraft.difficulty,
          points: quizDraft.questions[qi].points || 1,
          explanation: quizDraft.questions[qi].explanation || '',
          options
        });
      }

      if (questions.length < 3) {
        msg.textContent = 'Kamida 3 ta savol to\'liq bo\'lishi kerak.';
        return;
      }

      msg.textContent = 'Saqlanmoqda…';
      saveBtn.disabled = true;
      try {
        await API.createQuiz({
          title,
          description,
          subject: quizDraft.subjectId,
          difficulty: quizDraft.difficulty,
          timeLimit: parseInt(document.getElementById('qd-time').value, 10) || 30,
          passingScore: parseInt(document.getElementById('qd-pass').value, 10) || 70,
          maxAttempts: parseInt(document.getElementById('qd-attempts').value, 10) || 3,
          questions
        });
        msg.textContent = 'Saqlandi. O\'quvchilar asosiy saytda «Testlar» bo\'limidan ko\'radi.';
        quizDraft = null;
        setTimeout(() => renderTests(), 900);
      } catch (e) {
        msg.textContent = e.message || 'Xato';
        saveBtn.disabled = false;
      }
    };
  }

  function onNavClick(e) {
    const btn = e.target.closest('[data-tab]');
    if (!btn || !tabsEl.contains(btn)) return;
    const t = btn.getAttribute('data-tab');
    if (t === 'dash') renderDash();
    else if (t === 'tests') renderTests();
    else if (t === 'students') renderStudents();
    else if (t === 'att') renderAttendance();
    else if (t === 'att-hist') renderAttHist();
    else if (t === 'journal') renderJournal();
    else if (t === 'hw') renderHw();
    else if (t === 'metaverse') renderMetaverse();
  }

  async function renderMetaverse() {
    setTab('metaverse');
    const roomsRes = await API.rooms.list().catch(() => ({ data: [] }));
    const rooms = roomsRes.data || [];
    const myRooms = rooms.filter(r => {
      const user = Auth.getUser();
      return user && (r.teacherId === user.id || r.teacherName === `${user.firstName} ${user.lastName}`);
    });

    mainEl.innerHTML = `
      <div class="max-w-4xl space-y-6">
        <div class="flex items-center justify-between">
          <h2 class="text-2xl font-bold text-white flex items-center gap-2">
            <span class="text-2xl">🌐</span> Metaverse Boshqaruv
          </h2>
          <a href="/metaverse.html" target="_blank" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-white text-sm font-semibold flex items-center gap-2">
            <span class="material-symbols-outlined text-base">vrpano</span>
            Metaversga O'tish
          </a>
        </div>

        <div class="tp-glass rounded-2xl p-5">
          <h3 class="font-semibold text-white mb-4 flex items-center gap-2">
            <span class="text-emerald-400 text-lg">📡</span> Aktiv Xonalar
          </h3>
          ${myRooms.length === 0
            ? `<div class="text-center py-8 text-slate-500">
                <span class="material-symbols-outlined text-4xl">meeting_room</span>
                <p class="mt-2">Siz yaratgan xonalar yo'q</p>
                <p class="text-sm mt-1">Metaversda "Ko'p O'yinchi" tugmasini bosing</p>
              </div>`
            : `<div class="space-y-3">
                ${myRooms.map(room => `
                  <div class="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                    <div>
                      <div class="text-white font-semibold">${esc(room.name)}</div>
                      <div class="text-xs text-slate-400 mt-1">
                        Kod: <span class="font-mono text-emerald-400">${room.code}</span>
                        ${room.subject ? ` · ${esc(room.subject)}` : ''}
                      </div>
                    </div>
                    <div class="flex items-center gap-3">
                      <span class="px-3 py-1 rounded-full text-xs font-medium ${room.isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}">
                        ${room.isActive ? 'Faol' : 'Yopiq'}
                      </span>
                      <button onclick="toggleRoomActive('${room.code}', ${!room.isActive})" class="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm text-white">
                        ${room.isActive ? 'Yopish' : 'Ochish'}
                      </button>
                      <button onclick="deleteRoom('${room.code}')" class="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-sm text-red-400">
                        O'chirish
                      </button>
                    </div>
                  </div>
                `).join('')}
              </div>`
          }
        </div>

        <div class="tp-glass rounded-2xl p-5">
          <h3 class="font-semibold text-white mb-4 flex items-center gap-2">
            <span class="text-blue-400 text-lg">🔑</span> Kod Bilanqo'shilish
          </h3>
          <div class="flex gap-3">
            <input type="text" id="join-room-code" placeholder="6 xonali kod" maxlength="6"
              class="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-white font-mono uppercase tracking-widest">
            <button onclick="joinMetaverseRoom()" class="px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-white font-semibold">
              Qo'shilish
            </button>
          </div>
          <p class="text-xs text-slate-500 mt-2">O'quvchilar ushbu kod bilan metaverse xonasiga qo'shilishi mumkin</p>
        </div>

        <div class="tp-glass rounded-2xl p-5">
          <h3 class="font-semibold text-white mb-4 flex items-center gap-2">
            <span class="text-amber-400 text-lg">ℹ️</span> Metaverse Haqida
          </h3>
          <div class="text-sm text-slate-400 space-y-2">
            <p>• O'quvchilar <a href="/metaverse.html" class="text-emerald-400 hover:underline">metaverse.html</a> sahifasida "Ko'p O'yinchi" tugmasini bosib xonalarga qo'shilishadi.</p>
            <p>• Xonalarni yaratish va boshqarish uchun quyidagi kodni oling va o'quvchilarga boring.</p>
            <p>• O'qituvchi sifatida siz xonani yopishingiz yoki o'chirishingiz mumkin.</p>
          </div>
        </div>
      </div>
    `;

    window.toggleRoomActive = async (code, active) => {
      try {
        await API.rooms.update(code, { isActive: active });
        showNotification(active ? 'Xona ochildi' : 'Xona yopildi');
        renderMetaverse();
      } catch (err) {
        showNotification('Xato: ' + err.message);
      }
    };

    window.deleteRoom = async (code) => {
      if (!confirm('Xonani o\'chirishni tasdiqlaysizmi?')) return;
      try {
        await API.rooms.delete(code);
        showNotification('Xona o\'chirildi');
        renderMetaverse();
      } catch (err) {
        showNotification('Xato: ' + err.message);
      }
    };

    window.joinMetaverseRoom = () => {
      const code = document.getElementById('join-room-code').value.trim().toUpperCase();
      if (!code || code.length !== 6) {
        showNotification('6 xonali kod kiriting');
        return;
      }
      window.open(`/metaverse.html?room=${code}`, '_blank');
    };

    window.showNotification = (msg) => {
      const n = document.createElement('div');
      n.className = 'fixed bottom-4 right-4 bg-emerald-600 text-white px-6 py-3 rounded-xl shadow-lg z-50';
      n.textContent = msg;
      document.body.appendChild(n);
      setTimeout(() => n.remove(), 3000);
    };
  }

  global.TeacherPanel = {
    async ensureGate() {
      if (!Auth.isLoggedIn()) {
        window.location.href = '/';
        return false;
      }
      const me = await API.me();
      if (!me || !me.data) {
        window.location.href = '/';
        return false;
      }
      if (!['teacher', 'admin'].includes(me.data.role)) {
        window.location.href = '/';
        return false;
      }
      Auth.setUser(me.data);
      return true;
    },

    start(opts) {
      mainEl = opts.main;
      tabsEl = opts.tabs;
      welcomeEl = opts.welcome || null;
      if (opts.user && welcomeEl) {
        welcomeEl.textContent =
          (opts.user.firstName || '') + ' ' + (opts.user.lastName || '') + ' · ' + (opts.user.role === 'admin' ? 'Admin' : 'O\'qituvchi');
      }
      tabsEl.removeEventListener('click', onNavClick);
      tabsEl.addEventListener('click', onNavClick);
      quizDraft = null;
      mainEl.innerHTML = '';
      renderDash();
    }
  };
})(window);
