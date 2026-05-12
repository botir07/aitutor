// End-to-end test: in-memory MongoDB + real server + real HTTP requests
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { MongoMemoryServer } = require('mongodb-memory-server');

const COLOR = {
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  red:   (s) => `\x1b[31m${s}\x1b[0m`,
  cyan:  (s) => `\x1b[36m${s}\x1b[0m`,
  yellow:(s) => `\x1b[33m${s}\x1b[0m`,
  dim:   (s) => `\x1b[2m${s}\x1b[0m`
};

let passed = 0, failed = 0;
const PORT = 5099;
const BASE = `http://127.0.0.1:${PORT}`;

function assert(name, cond, detail = '') {
  if (cond) {
    console.log(`  ${COLOR.green('✓')} ${name}`);
    passed++;
  } else {
    console.log(`  ${COLOR.red('✗')} ${name} ${COLOR.dim(detail)}`);
    failed++;
  }
}

async function http(method, path, { token, body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  let data = null;
  try { data = await res.json(); } catch {}
  return { status: res.status, data };
}

(async () => {
  console.log(COLOR.cyan('\n🧪 Maktab AI — End-to-End Test\n'));

  // 1. In-memory MongoDB
  console.log(COLOR.cyan('1. In-memory MongoDB ishga tushirilmoqda...'));
  const mongo = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongo.getUri();
  process.env.JWT_SECRET = 'test_secret_for_e2e_only';
  process.env.PORT = String(PORT);
  process.env.NODE_ENV = 'test';
  console.log(`   ${COLOR.dim(process.env.MONGODB_URI)}\n`);

  // 2. Server import (after env is set)
  delete require.cache[require.resolve('../server.js')];
  require('../server.js');

  // Wait until server + DB ready
  for (let i = 0; i < 30; i++) {
    try {
      const r = await http('GET', '/api/health');
      if (r.data && r.data.db === 'connected') break;
    } catch {}
    await new Promise(r => setTimeout(r, 200));
  }

  // ============================================================
  console.log(COLOR.cyan('2. Health check'));
  {
    const r = await http('GET', '/api/health');
    assert('GET /api/health → 200', r.status === 200);
    assert('  db = connected',     r.data && r.data.db === 'connected');
  }

  // ============================================================
  console.log(COLOR.cyan('\n3. Auth flow'));
  let token, userId;
  const testEmail = `aziz.test.${Date.now()}@maktab.uz`;
  {
    const otpResponse = await http('POST', '/send-otp', {
      body: { email: testEmail }
    });
    assert('POST /send-otp -> 200', otpResponse.status === 200, JSON.stringify(otpResponse.data));

    const verifyResponse = await http('POST', '/verify-otp', {
      body: { email: testEmail, otp: otpResponse.data && otpResponse.data.otp }
    });
    assert('POST /verify-otp -> 200', verifyResponse.status === 200, JSON.stringify(verifyResponse.data));

    const r = await http('POST', '/api/auth/register', {
      body: {
        firstName: 'Aziz',
        lastName: 'Test',
        email: testEmail,
        password: 'testpass123',
        role: 'student',
        grade: '10-A'
      }
    });
    assert('POST /register → 201', r.status === 201, JSON.stringify(r.data));
    assert('  token qaytarildi',   !!(r.data && r.data.token));
    assert('  user.id mavjud',     !!(r.data && r.data.user && r.data.user.id));
    assert('  parol response-da YO\'Q', !(r.data && r.data.user && r.data.user.password));
    token = r.data.token;
    userId = r.data.user.id;
  }
  {
    const r = await http('POST', '/api/auth/register', {
      body: { firstName: 'A', lastName: 'B', email: testEmail, password: 'x123456' }
    });
    assert('Duplicate email → 400', r.status === 400);
  }
  {
    const r = await http('POST', '/api/auth/register', {
      body: { firstName: '', lastName: 'X', email: 'bad', password: '12' }
    });
    assert('Validation xato → 400', r.status === 400);
  }
  {
    const r = await http('POST', '/api/auth/login', {
      body: { email: testEmail, password: 'testpass123' }
    });
    assert('POST /login → 200', r.status === 200);
    assert('  token qaytarildi', !!(r.data && r.data.token));
  }
  {
    const r = await http('POST', '/api/auth/login', {
      body: { email: testEmail, password: 'wrong' }
    });
    assert('Noto\'g\'ri parol → 401', r.status === 401);
  }
  {
    const r = await http('GET', '/api/auth/me', { token });
    assert('GET /me with token → 200', r.status === 200);
    assert('  email mos keladi',       r.data && r.data.data && r.data.data.email === testEmail);
  }
  {
    const r = await http('GET', '/api/auth/me');
    assert('GET /me tokensiz → 401', r.status === 401);
  }
  {
    const r = await http('GET', '/api/auth/me', { token: 'fake.token.value' });
    assert('GET /me yomon token → 401', r.status === 401);
  }

  // ============================================================
  console.log(COLOR.cyan('\n4. Subjects (seed data)'));
  let firstSubject;
  {
    const r = await http('GET', '/api/subjects');
    assert('GET /subjects → 200',         r.status === 200);
    assert('  seed dan kamida 3 ta fan',  r.data && r.data.data && r.data.data.length >= 3);
    firstSubject = r.data && r.data.data && r.data.data[0];
  }

  // ============================================================
  console.log(COLOR.cyan('\n5. Quizzes'));
  let firstQuiz;
  {
    const r = await http('GET', '/api/quizzes', { token });
    assert('GET /quizzes → 200',          r.status === 200);
    assert('  seed dan kamida 1 ta test', r.data && r.data.data && r.data.data.length >= 1);
    firstQuiz = r.data && r.data.data && r.data.data[0];

    const hasIsCorrect = JSON.stringify(firstQuiz).includes('isCorrect');
    assert('  isCorrect frontendga uzatilmaydi (xavfsizlik)', !hasIsCorrect);
  }

  let fullQuiz;
  {
    const r = await http('GET', `/api/quizzes/${firstQuiz._id}`, { token });
    assert('GET /quizzes/:id → 200', r.status === 200);
    fullQuiz = r.data && r.data.data;
    assert('  savollar bor',         !!(fullQuiz && fullQuiz.questions && fullQuiz.questions.length));

    const optionsHaveIsCorrect = fullQuiz.questions.some(q =>
      q.options.some(o => Object.prototype.hasOwnProperty.call(o, 'isCorrect'))
    );
    assert('  options.isCorrect yashirin', !optionsHaveIsCorrect);
  }

  // Submit quiz: pick first option for each question
  {
    const answers = fullQuiz.questions.map(q => ({
      questionId: q._id,
      selectedOption: q.options[0]._id
    }));
    const r = await http('POST', `/api/quizzes/${firstQuiz._id}/submit`, { token, body: { answers } });
    assert('POST /quizzes/:id/submit → 200', r.status === 200);
    assert('  natija formati to\'g\'ri',
      r.data && r.data.data && typeof r.data.data.score === 'number' && typeof r.data.data.grade === 'number');
  }

  {
    const answers = fullQuiz.questions.map(q => ({
      questionId: q._id,
      selectedOption: q.options[0]._id
    }));
    for (let n = 2; n <= 3; n++) {
      const r = await http('POST', `/api/quizzes/${firstQuiz._id}/submit`, { token, body: { answers } });
      assert(`Qayta topshirish ${n} (maxAttempts) → 200`, r.status === 200);
    }
    {
      const r = await http('POST', `/api/quizzes/${firstQuiz._id}/submit`, { token, body: { answers } });
      assert('4-urinish (max 3) → 403', r.status === 403);
    }
  }

  {
    const r = await http('POST', `/api/quizzes/000000000000000000000000/submit`, { token, body: { answers: [] } });
    assert('Topilmagan quiz → 404', r.status === 404);
  }

  // ============================================================
  console.log(COLOR.cyan('\n6. Grades (IDOR himoyasi)'));
  {
    const r = await http('GET', '/api/grades', { token });
    assert('GET /grades → 200',         r.status === 200);
    assert('  kamida 1 ta baho mavjud', r.data && r.data.data && r.data.data.length >= 1);
  }
  {
    const r = await http('GET', '/api/grades/student/000000000000000000000099', { token });
    assert('Boshqa o\'quvchining baholari → 403', r.status === 403);
  }
  {
    const r = await http('GET', `/api/grades/student/${userId}`, { token });
    assert('O\'zining baholari → 200', r.status === 200);
  }

  // ============================================================
  console.log(COLOR.cyan('\n7. Profile update (role escalation himoyasi)'));
  {
    const r = await http('PUT', '/api/users/profile', {
      token,
      body: { firstName: 'Azizbek', role: 'admin', isActive: true }  // role/isActive — ignore qilinishi kerak
    });
    assert('PUT /profile → 200',        r.status === 200);
    assert('  firstName yangilandi',    r.data && r.data.data && r.data.data.firstName === 'Azizbek');
    assert('  role O\'ZGARMADI',        r.data && r.data.data && r.data.data.role === 'student');
  }

  {
    const r = await http('PUT', '/api/users/password', {
      token,
      body: { currentPassword: 'wrong', newPassword: 'newpass123' }
    });
    assert('Noto\'g\'ri joriy parol → 401', r.status === 401);
  }
  {
    const r = await http('PUT', '/api/users/password', {
      token,
      body: { currentPassword: 'testpass123', newPassword: 'newpass123' }
    });
    assert('Parolni o\'zgartirish → 200', r.status === 200);
  }
  {
    const r = await http('POST', '/api/auth/login', {
      body: { email: testEmail, password: 'newpass123' }
    });
    assert('Yangi parol bilan login → 200', r.status === 200);
    token = r.data.token;
  }

  // ============================================================
  console.log(COLOR.cyan('\n8. AI Chat'));
  {
    const r = await http('POST', '/api/chat/ai', { token, body: { content: 'Salom!' } });
    assert('POST /chat/ai → 200',       r.status === 200);
    assert('  reply qaytarildi',        !!(r.data && r.data.data && r.data.data.reply));
    const reply = r.data.data.reply.content || '';
    assert('  reply matematik salom',   /salom/i.test(reply));
  }
  {
    const r = await http('POST', '/api/chat/ai', { token, body: { content: '' } });
    assert('Bo\'sh xabar → 400',          r.status === 400);
  }

  // ============================================================
  console.log(COLOR.cyan('\n9. Frontend static fayllar'));
  {
    const r = await fetch(`${BASE}/`);
    const html = await r.text();
    assert('GET / → 200', r.status === 200);
    assert('  index.html xizmat qilinadi', html.includes('Maktab AI'));
  }
  {
    const r = await fetch(`${BASE}/js/api.js`);
    assert('GET /js/api.js → 200', r.status === 200);
  }
  {
    const r = await fetch(`${BASE}/js/app.js`);
    assert('GET /js/app.js → 200', r.status === 200);
  }
  {
    const r = await fetch(`${BASE}/random-route-that-does-not-exist`);
    const html = await r.text();
    assert('SPA fallback (har qanday non-API → index.html)', r.status === 200 && html.includes('Maktab AI'));
  }
  {
    const r = await fetch(`${BASE}/api/random-endpoint-that-does-not-exist`);
    assert('Mavjud bo\'lmagan API → 404', r.status === 404);
  }

  // ============================================================
  console.log(COLOR.cyan('\n10. Rate limiting (auth)'));
  {
    let blocked = false;
    for (let i = 0; i < 25; i++) {
      const r = await http('POST', '/api/auth/login', {
        body: { email: 'nonexistent@test.uz', password: 'x' }
      });
      if (r.status === 429) { blocked = true; break; }
    }
    assert('Login rate-limit ishlaydi (429)', blocked);
  }

  // ============================================================
  console.log('\n' + COLOR.cyan('═'.repeat(50)));
  if (failed === 0) {
    console.log(COLOR.green(`✅ HAMMA TEST O'TDI: ${passed}/${passed}`));
  } else {
    console.log(COLOR.red(`❌ ${failed} test fail, ${passed} o'tdi`));
  }
  console.log(COLOR.cyan('═'.repeat(50)) + '\n');

  await mongo.stop();
  process.exit(failed === 0 ? 0 : 1);
})().catch(err => {
  console.error(COLOR.red('FATAL: ' + err.message));
  console.error(err.stack);
  process.exit(1);
});
