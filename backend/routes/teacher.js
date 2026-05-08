const express = require('express');
const { body, query, validationResult } = require('express-validator');
const User = require('../lib/User');
const Subject = require('../lib/Subject');
const Grade = require('../lib/Grade');
const Assignment = require('../lib/Assignment');
const Quiz = require('../lib/Quiz');
const { getDb } = require('../lib/database');
const { protect, authorize } = require('../middleware/auth');
const requireDb = require('../middleware/requireDb');
const { resolveOpenAICompatConfig } = require('../utils/aiProvider');

const router = express.Router();

router.use(requireDb);
router.use(protect);
router.use(authorize('teacher', 'admin'));

function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array().map(e => e.msg).join(', ')
    });
  }
  next();
}

function startOfUtcDay(input) {
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return null;
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function scoreToGrade5(score) {
  const s = Math.max(0, Math.min(100, Number(score)));
  if (s >= 90) return 5;
  if (s >= 70) return 4;
  if (s >= 50) return 3;
  return 2;
}

router.get('/dashboard', async (req, res, next) => {
  try {
    const db = getDb();
    const studentCount = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'student' AND isActive = 1").get().count;
    
    const today = startOfUtcDay(new Date()).toISOString().slice(0, 10);
    const presentToday = db.prepare(`
      SELECT COUNT(*) as count FROM attendance 
      WHERE date = ? AND status IN ('present', 'excused')
    `).get(today).count;

    const attendanceRateToday = studentCount > 0
      ? Math.round((presentToday / studentCount) * 100)
      : 0;

    const recentGrades = Grade.find(
      req.user.role === 'admin'
        ? { type: 'baholash' }
        : { type: 'baholash' }
    ).slice(0, 8);

    const markedToday = db.prepare(`
      SELECT COUNT(DISTINCT studentId) as count FROM attendance WHERE date = ?
    `).get(today).count;

    res.json({
      success: true,
      data: {
        studentCount,
        today: {
          date: today,
          marked: markedToday,
          presentOrExcused: presentToday,
          attendanceRatePercent: attendanceRateToday
        },
        weekAttendanceCount: markedToday,
        recentGrades
      }
    });
  } catch (err) {
    next(err);
  }
});

router.get('/students', async (req, res, next) => {
  try {
    const db = getDb();
    const q = (req.query.q || '').trim();
    let students;
    
    if (q) {
      const searchTerm = '%' + q + '%';
      students = db.prepare(`
        SELECT id, firstName, lastName, email, grade, createdAt 
        FROM users 
        WHERE role = 'student' AND isActive = 1 
        AND (firstName LIKE ? OR lastName LIKE ? OR email LIKE ?)
        ORDER BY lastName, firstName
        LIMIT 500
      `).all(searchTerm, searchTerm, searchTerm);
    } else {
      students = db.prepare(`
        SELECT id, firstName, lastName, email, grade, createdAt 
        FROM users 
        WHERE role = 'student' AND isActive = 1
        ORDER BY lastName, firstName
        LIMIT 500
      `).all();
    }

    res.json({ success: true, count: students.length, data: students });
  } catch (err) {
    next(err);
  }
});

router.post(
  '/attendance',
  [
    body('date').notEmpty().withMessage('Sana kiritilishi shart'),
    body('records').isArray({ min: 1 }).withMessage('records massivi kerak')
  ],
  handleValidation,
  async (req, res, next) => {
    try {
      const day = startOfUtcDay(req.body.date);
      if (!day) {
        return res.status(400).json({ success: false, message: 'Sana formati noto\'g\'ri' });
      }

      const db = getDb();
      const dateStr = day.toISOString().slice(0, 10);
      const teacherId = parseInt(req.user.id);
      const insertStmt = db.prepare(`
        INSERT OR REPLACE INTO attendance (studentId, date, status, teacherId, notes)
        VALUES (?, ?, ?, ?, ?)
      `);

      const saveMany = db.transaction((records) => {
        for (const r of records) {
          insertStmt.run(
            parseInt(r.studentId),
            dateStr,
            r.status || 'present',
            teacherId,
            r.notes || null
          );
        }
      });

      saveMany(req.body.records);

      res.status(201).json({
        success: true,
        message: 'Davomat saqlandi',
        data: { date: dateStr, count: req.body.records.length, teacherMarked: req.body.records.length }
      });
    } catch (err) {
      next(err);
    }
  }
);

router.get('/attendance', async (req, res, next) => {
  try {
    const db = getDb();
    const date = req.query.date;
    const studentId = req.query.studentId;
    
    let sql = 'SELECT a.*, u.firstName, u.lastName FROM attendance a JOIN users u ON a.studentId = u.id WHERE 1=1';
    const params = [];
    
    if (date) {
      sql += ' AND a.date = ?';
      params.push(date);
    }
    if (studentId) {
      sql += ' AND a.studentId = ?';
      params.push(parseInt(studentId));
    }
    
    sql += ' ORDER BY a.date DESC, u.lastName';
    
    const records = db.prepare(sql).all(...params);
    
    res.json({ success: true, count: records.length, data: records });
  } catch (err) {
    next(err);
  }
});

router.get('/attendance/stats', async (req, res, next) => {
  try {
    const db = getDb();
    const days = Math.min(Math.max(parseInt(req.query.days, 10) || 30, 1), 365);
    const endDate = new Date().toISOString().slice(0, 10);
    const startDate = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);

    const stats = db.prepare(`
      SELECT status, COUNT(*) as count 
      FROM attendance 
      WHERE date BETWEEN ? AND ?
      GROUP BY status
    `).all(startDate, endDate);

    const total = stats.reduce((sum, s) => sum + s.count, 0);
    const present = stats.find(s => s.status === 'present')?.count || 0;
    const absent = stats.find(s => s.status === 'absent')?.count || 0;
    const excused = stats.find(s => s.status === 'excused')?.count || 0;
    const late = stats.find(s => s.status === 'late')?.count || 0;

    const result = {
      totalRecords: total,
      present,
      absent,
      excused,
      late,
      presentPercent: total > 0 ? Math.round((present / total) * 100) : 0,
      absentPercent: total > 0 ? Math.round((absent / total) * 100) : 0,
      period: { start: startDate, end: endDate }
    };

    res.json({ success: true, count: stats.length, data: result });
  } catch (err) {
    next(err);
  }
});

router.post(
  '/grades',
  [
    body('studentId').notEmpty().withMessage('studentId noto\'g\'ri'),
    body('subjectId').notEmpty().withMessage('subjectId noto\'g\'ri'),
    body('score').isFloat({ min: 0, max: 100 }).withMessage('score 0–100'),
    body('type').optional().isIn(['baholash', 'homework', 'participation', 'exam']),
    body('comment').optional().isString().isLength({ max: 2000 })
  ],
  handleValidation,
  async (req, res, next) => {
    try {
      const studentId = parseInt(req.body.studentId);
      const subjectId = parseInt(req.body.subjectId);
      
      const student = User.findById(studentId);
      if (!student || student.role !== 'student') {
        return res.status(400).json({ success: false, message: 'O\'quvchi topilmadi' });
      }

      const subject = Subject.findById(subjectId);
      if (!subject) {
        return res.status(400).json({ success: false, message: 'Fan topilmadi' });
      }

      const score = Number(req.body.score);
      const gradeNum = scoreToGrade5(score);
      const gType = req.body.type || 'baholash';

      const doc = Grade.create({
        student: studentId,
        teacher: parseInt(req.user.id),
        subject: subjectId,
        type: gType,
        score,
        grade: gradeNum,
        maxScore: 100,
        comment: req.body.comment || null,
        feedback: req.body.comment || null,
        gradedBy: parseInt(req.user.id)
      });

      res.status(201).json({ success: true, data: doc });
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  '/assignments',
  [
    body('title').trim().notEmpty().isLength({ max: 200 }),
    body('description').optional().isString().isLength({ max: 4000 }),
    body('subjectId').notEmpty(),
    body('dueDate').notEmpty(),
    body('maxScore').optional().isFloat({ min: 1, max: 1000 })
  ],
  handleValidation,
  async (req, res, next) => {
    try {
      const subjectId = parseInt(req.body.subjectId);
      const subject = Subject.findById(subjectId);
      if (!subject) {
        return res.status(400).json({ success: false, message: 'Fan topilmadi' });
      }

      const due = new Date(req.body.dueDate);
      if (Number.isNaN(due.getTime())) {
        return res.status(400).json({ success: false, message: 'dueDate noto\'g\'ri' });
      }

      const assignment = Assignment.create({
        title: req.body.title,
        description: req.body.description,
        subject: subjectId,
        teacher: parseInt(req.user.id),
        dueDate: due,
        maxScore: req.body.maxScore != null ? Number(req.body.maxScore) : 100
      });

      res.status(201).json({ success: true, data: assignment });
    } catch (err) {
      next(err);
    }
  }
);

router.get('/assignments', async (req, res, next) => {
  try {
    const filter = req.user.role === 'admin' ? {} : { teacher: parseInt(req.user.id) };
    const list = Assignment.find(filter);
    
    const result = list.map(a => {
      const subject = Subject.findById(a.subject);
      const teacher = User.findById(a.teacher);
      return {
        ...a,
        subject: subject ? { _id: subject._id, name: subject.name, nameUz: subject.nameUz } : null,
        teacher: teacher ? { firstName: teacher.firstName, lastName: teacher.lastName } : null
      };
    });

    res.json({ success: true, count: result.length, data: result });
  } catch (err) {
    next(err);
  }
});

router.put(
  '/assignments/:id/grade',
  [
    body('studentId').notEmpty(),
    body('score').isFloat({ min: 0 }),
    body('feedback').optional().isString().isLength({ max: 2000 })
  ],
  handleValidation,
  async (req, res, next) => {
    try {
      const assignmentId = parseInt(req.params.id);
      const studentId = parseInt(req.body.studentId);
      
      const assignment = Assignment.findById(assignmentId);
      if (!assignment) {
        return res.status(404).json({ success: false, message: 'Vazifa topilmadi' });
      }

      const score = Number(req.body.score);
      if (assignment.maxScore && score > assignment.maxScore) {
        return res.status(400).json({
          success: false,
          message: `Ball ${assignment.maxScore} dan oshmasligi kerak`
        });
      }

      const { getDb } = require('../lib/database');
      const db = getDb();
      const submissions = assignment.submissions || [];
      const subIdx = submissions.findIndex(s => parseInt(s.student) === studentId);
      
      const now = new Date().toISOString();
      if (subIdx === -1) {
        submissions.push({
          student: studentId,
          score,
          feedback: req.body.feedback || '',
          gradedAt: now,
          submittedAt: now
        });
      } else {
        submissions[subIdx].score = score;
        submissions[subIdx].feedback = req.body.feedback || '';
        submissions[subIdx].gradedAt = now;
      }

      const stmt = db.prepare('UPDATE assignments SET submissions = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?');
      stmt.run(JSON.stringify(submissions), assignmentId);

      res.json({ success: true, data: Assignment.findById(assignmentId) });
    } catch (err) {
      next(err);
    }
  }
);

async function generateQuizDraftWithAI({ subjectName, topic, numQuestions, difficulty }) {
  const { key, base, model, provider } = resolveOpenAICompatConfig();
  if (!key) {
    const e = new Error('NO_KEY');
    e.code = 'NO_KEY';
    throw e;
  }
  const n = Math.min(Math.max(parseInt(numQuestions, 10) || 5, 3), 15);
  const diff = ['easy', 'medium', 'hard'].includes(difficulty) ? difficulty : 'medium';

  const system = `Siz O'zbekiston maktab dasturi bo'yicha test tuzuvchi ekspertiz. Faqat bitta JSON obyekt qaytaring, boshqa matn yoki markdown yo'q.
Format:
{"title":"string","description":"string","questions":[{"text":"string","difficulty":"easy|medium|hard","points":1,"explanation":"string","options":[{"text":"string","isCorrect":boolean}]}]}
Qoidalar: 
- Har bir savolda aynan 4 ta variant; faqat bittasida "isCorrect": true
- Savollar O'zbek tilida
- Maktab 5-11 sinflar uchun mos
- O'quv dasturiga mos mavzular`;

  const userMsg = `Fan: "${subjectName}". Mavzu: "${topic}". Savollar soni: ${n}. Qiyinlik darajasi: ${diff}.`;

  const body = {
    model,
    messages: [{ role: 'system', content: system }, { role: 'user', content: userMsg }],
    max_tokens: 4500,
    temperature: 0.4
  };
  if (
    provider === 'groq' ||
    String(model).includes('gpt-4o') ||
    String(model).includes('gpt-3.5-turbo')
  ) {
    body.response_format = { type: 'json_object' };
  }

  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`AI xizmati: ${res.status} — ${t.slice(0, 180)}`);
  }

  const data = await res.json();
  const raw = data.choices?.[0]?.message?.content;
  if (!raw) throw new Error('AI javob bo\'sh');

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    const m = raw.match(/\{[\s\S]*\}/);
    if (!m) throw new Error('JSON tahlil qilinmadi');
    parsed = JSON.parse(m[0]);
  }

  if (!parsed.title || !Array.isArray(parsed.questions)) {
    throw new Error('AI noto\'g\'ri format qaytardi');
  }

  const questions = [];
  for (const q of parsed.questions.slice(0, n)) {
    if (!q || !q.text || !Array.isArray(q.options)) continue;
    const opts = q.options
      .filter(o => o && String(o.text || '').trim())
      .slice(0, 4)
      .map(o => ({ text: String(o.text).trim().slice(0, 500), isCorrect: !!o.isCorrect }));

    while (opts.length < 4) opts.push({ text: `Variant ${opts.length + 1}`, isCorrect: false });

    if (opts.filter(o => o.isCorrect).length !== 1) {
      opts.forEach((o, i) => { o.isCorrect = i === 0; });
    }

    questions.push({
      text: String(q.text).trim().slice(0, 1200),
      difficulty: ['easy', 'medium', 'hard'].includes(q.difficulty) ? q.difficulty : diff,
      points: Math.min(Math.max(parseInt(q.points, 10) || 1, 1), 10),
      explanation: q.explanation ? String(q.explanation).trim().slice(0, 800) : '',
      options: opts
    });
  }

  if (questions.length < 3) throw new Error('Kamida 3 ta savol yaratilmadi');

  return {
    title: String(parsed.title).trim().slice(0, 200),
    description: parsed.description ? String(parsed.description).trim().slice(0, 1500) : '',
    difficulty: diff,
    questions
  };
}

router.get('/quizzes', async (req, res, next) => {
  try {
    const filter = req.user.role === 'admin' ? {} : { createdBy: parseInt(req.user.id) };
    const quizzes = Quiz.find(filter);
    
    const result = quizzes.slice(0, 100).map(q => ({
      _id: q._id,
      id: q.id,
      title: q.title,
      description: q.description,
      subject: q.subject,
      isActive: q.isActive,
      difficulty: q.difficulty,
      timeLimit: q.timeLimit,
      passingScore: q.passingScore,
      maxAttempts: q.maxAttempts,
      createdAt: q.createdAt,
      updatedAt: q.updatedAt,
      questionCount: q.questions ? q.questions.length : 0
    }));

    res.json({ success: true, count: result.length, data: result });
  } catch (err) {
    next(err);
  }
});

router.post(
  '/quizzes/generate-ai',
  [
    body('subjectId').notEmpty().withMessage('Fan tanlang'),
    body('topic').trim().notEmpty().isLength({ max: 400 }).withMessage('Mavzu kiriting'),
    body('numQuestions').optional().isInt({ min: 3, max: 15 }),
    body('difficulty').optional().isIn(['easy', 'medium', 'hard'])
  ],
  handleValidation,
  async (req, res, next) => {
    try {
      const subjectId = parseInt(req.body.subjectId);
      const subject = Subject.findById(subjectId);
      if (!subject) {
        return res.status(400).json({ success: false, message: 'Fan topilmadi' });
      }

      const subjectName = subject.nameUz || subject.name;
      const numQuestions = req.body.numQuestions != null ? req.body.numQuestions : 5;
      const difficulty = req.body.difficulty || 'medium';

      let draft;
      try {
        draft = await generateQuizDraftWithAI({
          subjectName,
          topic: req.body.topic,
          numQuestions,
          difficulty
        });
      } catch (e) {
        if (e.code === 'NO_KEY') {
          return res.status(503).json({
            success: false,
            message: 'AI test uchun GROQ_API_KEY yoki OPENAI_API_KEY sozlanmagan. .env faylga kalit qo\'shing.'
          });
        }
        return res.status(502).json({ success: false, message: e.message || 'AI xato' });
      }

      res.json({
        success: true,
        data: {
          ...draft,
          subjectId: subjectId
        }
      });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
