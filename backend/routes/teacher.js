const express = require('express');
const mongoose = require('mongoose');
const { body, query, validationResult } = require('express-validator');
const User = require('../models/User');
const Subject = require('../models/Subject');
const Grade = require('../models/Grade');
const Attendance = require('../models/Attendance');
const Assignment = require('../models/Assignment');
const Quiz = require('../models/Quiz');
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

// Dashboard
router.get('/dashboard', async (req, res, next) => {
  try {
    const studentCount = await User.countDocuments({ role: 'student', isActive: true });
    const today = startOfUtcDay(new Date());
    const todayFilter = { date: today };
    if (req.user.role !== 'admin') todayFilter.teacher = req.user._id;
    const todayRecords = await Attendance.find(todayFilter);
    const presentToday = todayRecords.filter(r =>
      ['present', 'late', 'excused'].includes(r.status)
    ).length;

    const attendanceRateToday = studentCount > 0
      ? Math.round((presentToday / studentCount) * 100)
      : 0;

    const weekStart = startOfUtcDay(new Date());
    weekStart.setUTCDate(weekStart.getUTCDate() - 6);

    const weekFilter = { date: { $gte: weekStart, $lte: today } };
    if (req.user.role !== 'admin') weekFilter.teacher = req.user._id;
    const weekAttendance = await Attendance.find(weekFilter).select('date status student');

    const recentGrades = await Grade.find(
      req.user.role === 'admin'
        ? { type: 'baholash' }
        : { teacher: req.user.id, type: 'baholash' }
    )
      .sort('-createdAt')
      .limit(8)
      .populate('student', 'firstName lastName email grade')
      .populate('subject', 'name nameUz');

    res.json({
      success: true,
      data: {
        studentCount,
        today: {
          date: today.toISOString().slice(0, 10),
          marked: todayRecords.length,
          presentOrExcused: presentToday,
          attendanceRatePercent: attendanceRateToday
        },
        weekAttendanceCount: weekAttendance.length,
        recentGrades
      }
    });
  } catch (err) {
    next(err);
  }
});

// Barcha o'quvchilar
router.get('/students', async (req, res, next) => {
  try {
    const q = (req.query.q || '').trim();
    const filter = { role: 'student', isActive: true };
    if (q) {
      filter.$or = [
        { firstName: new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') },
        { lastName: new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') },
        { email: new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }
      ];
    }
    const students = await User.find(filter)
      .select('firstName lastName email grade createdAt')
      .sort('lastName firstName')
      .limit(500);

    res.json({ success: true, count: students.length, data: students });
  } catch (err) {
    next(err);
  }
});

// Davomat — bulk
router.post(
  '/attendance',
  [
    body('date').notEmpty().withMessage('Sana kiritilishi shart'),
    body('records').isArray({ min: 1 }).withMessage('records massivi kerak'),
    body('records.*.studentId').isMongoId().withMessage('studentId noto\'g\'ri'),
    body('records.*.status').isIn(['present', 'absent', 'late', 'excused']).withMessage('status noto\'g\'ri'),
    body('records.*.note').optional().isString().isLength({ max: 500 })
  ],
  handleValidation,
  async (req, res, next) => {
    try {
      const day = startOfUtcDay(req.body.date);
      if (!day) {
        return res.status(400).json({ success: false, message: 'Sana formati noto\'g\'ri' });
      }

      const teacherId = req.user.id;
      const ops = req.body.records.map((r) => ({
        updateOne: {
          filter: { student: r.studentId, date: day },
          update: {
            $set: {
              student: r.studentId,
              teacher: teacherId,
              date: day,
              status: r.status,
              note: r.note || ''
            }
          },
          upsert: true
        }
      }));

      await Attendance.bulkWrite(ops, { ordered: false });

      const saved = await Attendance.find({ date: day, teacher: teacherId }).countDocuments();

      res.status(201).json({
        success: true,
        message: 'Davomat saqlandi',
        data: { date: day.toISOString().slice(0, 10), count: req.body.records.length, teacherMarked: saved }
      });
    } catch (err) {
      next(err);
    }
  }
);

// Davomat tarixi
router.get(
  '/attendance',
  [
    query('studentId').optional().isMongoId().withMessage('studentId noto\'g\'ri')
  ],
  handleValidation,
  async (req, res, next) => {
    try {
      const filter = {};
      if (req.query.studentId) filter.student = req.query.studentId;

      if (req.query.from || req.query.to) {
        filter.date = {};
        if (req.query.from) {
          const f = startOfUtcDay(req.query.from);
          if (f) filter.date.$gte = f;
        }
        if (req.query.to) {
          const t = startOfUtcDay(req.query.to);
          if (t) filter.date.$lte = t;
        }
      }

      if (req.user.role !== 'admin') {
        filter.teacher = req.user.id;
      }

      const rows = await Attendance.find(filter)
        .sort('-date')
        .limit(500)
        .populate('student', 'firstName lastName email grade')
        .populate('teacher', 'firstName lastName');

      res.json({ success: true, count: rows.length, data: rows });
    } catch (err) {
      next(err);
    }
  }
);

// Davomat statistikasi (o'quvchi bo'yicha foiz)
router.get('/attendance/stats', async (req, res, next) => {
  try {
    const days = Math.min(parseInt(req.query.days, 10) || 30, 365);
    const since = startOfUtcDay(new Date());
    since.setUTCDate(since.getUTCDate() - (days - 1));

    const match = { date: { $gte: since } };
    if (req.user.role !== 'admin') {
      match.teacher = req.user._id;
    }

    const agg = await Attendance.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$student',
          total: { $sum: 1 },
          present: {
            $sum: {
              $cond: [{ $in: ['$status', ['present', 'late', 'excused']] }, 1, 0]
            }
          }
        }
      }
    ]);

    const studentIds = agg.map(a => a._id);
    const students = await User.find({ _id: { $in: studentIds } })
      .select('firstName lastName email grade');

    const byId = Object.fromEntries(students.map(s => [s._id.toString(), s]));

    const data = agg.map((row) => {
      const st = byId[row._id.toString()];
      const pct = row.total > 0 ? Math.round((row.present / row.total) * 100) : 0;
      return {
        student: st || { _id: row._id },
        daysRecorded: row.total,
        presentOrLateOrExcused: row.present,
        attendancePercent: pct
      };
    });

    res.json({ success: true, count: data.length, data });
  } catch (err) {
    next(err);
  }
});

// Qo'lda baho
router.post(
  '/grades',
  [
    body('studentId').isMongoId().withMessage('studentId noto\'g\'ri'),
    body('subjectId').isMongoId().withMessage('subjectId noto\'g\'ri'),
    body('score').isFloat({ min: 0, max: 100 }).withMessage('score 0–100'),
    body('type').optional().isIn(['baholash', 'homework', 'participation', 'exam']),
    body('comment').optional().isString().isLength({ max: 2000 })
  ],
  handleValidation,
  async (req, res, next) => {
    try {
      const student = await User.findById(req.body.studentId);
      if (!student || student.role !== 'student') {
        return res.status(400).json({ success: false, message: 'O\'quvchi topilmadi' });
      }

      const subject = await Subject.findById(req.body.subjectId);
      if (!subject) {
        return res.status(400).json({ success: false, message: 'Fan topilmadi' });
      }

      const score = Number(req.body.score);
      const gradeNum = scoreToGrade5(score);
      const gType = req.body.type || 'baholash';

      const doc = await Grade.create({
        student: req.body.studentId,
        teacher: req.user.id,
        subject: req.body.subjectId,
        type: gType,
        score,
        grade: gradeNum,
        maxScore: 100,
        comment: req.body.comment || undefined,
        feedback: req.body.comment || undefined,
        gradedBy: req.user.id
      });

      const populated = await Grade.findById(doc._id)
        .populate('student', 'firstName lastName')
        .populate('subject', 'name nameUz');

      res.status(201).json({ success: true, data: populated });
    } catch (err) {
      next(err);
    }
  }
);

// Vazifa yaratish
router.post(
  '/assignments',
  [
    body('title').trim().notEmpty().isLength({ max: 200 }),
    body('description').optional().isString().isLength({ max: 4000 }),
    body('subjectId').isMongoId(),
    body('dueDate').notEmpty(),
    body('maxScore').optional().isFloat({ min: 1, max: 1000 })
  ],
  handleValidation,
  async (req, res, next) => {
    try {
      const subject = await Subject.findById(req.body.subjectId);
      if (!subject) {
        return res.status(400).json({ success: false, message: 'Fan topilmadi' });
      }

      const due = new Date(req.body.dueDate);
      if (Number.isNaN(due.getTime())) {
        return res.status(400).json({ success: false, message: 'dueDate noto\'g\'ri' });
      }

      const assignment = await Assignment.create({
        title: req.body.title,
        description: req.body.description,
        subject: req.body.subjectId,
        teacher: req.user.id,
        dueDate: due,
        maxScore: req.body.maxScore != null ? Number(req.body.maxScore) : 100
      });

      const populated = await Assignment.findById(assignment._id)
        .populate('subject', 'name nameUz');

      res.status(201).json({ success: true, data: populated });
    } catch (err) {
      next(err);
    }
  }
);

// Vazifalar ro'yxati
router.get('/assignments', async (req, res, next) => {
  try {
    const filter = req.user.role === 'admin' ? {} : { teacher: req.user.id };
    const list = await Assignment.find(filter)
      .sort('-createdAt')
      .limit(100)
      .populate('subject', 'name nameUz')
      .populate('teacher', 'firstName lastName');

    res.json({ success: true, count: list.length, data: list });
  } catch (err) {
    next(err);
  }
});

// Vazifaga baho
router.put(
  '/assignments/:id/grade',
  [
    body('studentId').isMongoId(),
    body('score').isFloat({ min: 0 }),
    body('feedback').optional().isString().isLength({ max: 2000 })
  ],
  handleValidation,
  async (req, res, next) => {
    try {
      if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({ success: false, message: 'ID noto\'g\'ri' });
      }

      const assignment = await Assignment.findById(req.params.id);
      if (!assignment) {
        return res.status(404).json({ success: false, message: 'Vazifa topilmadi' });
      }

      if (req.user.role !== 'admin' && assignment.teacher.toString() !== req.user.id.toString()) {
        return res.status(403).json({ success: false, message: 'Bu vazifani baholash huquqingiz yo\'q' });
      }

      const student = await User.findById(req.body.studentId);
      if (!student || student.role !== 'student') {
        return res.status(400).json({ success: false, message: 'O\'quvchi topilmadi' });
      }

      const score = Number(req.body.score);
      if (score > assignment.maxScore) {
        return res.status(400).json({
          success: false,
          message: `Ball ${assignment.maxScore} dan oshmasligi kerak`
        });
      }

      let sub = assignment.submissions.find(
        s => s.student.toString() === req.body.studentId
      );
      if (!sub) {
        assignment.submissions.push({
          student: req.body.studentId,
          score,
          feedback: req.body.feedback || '',
          gradedAt: new Date(),
          submittedAt: new Date()
        });
      } else {
        sub.score = score;
        sub.feedback = req.body.feedback || '';
        sub.gradedAt = new Date();
      }

      await assignment.save();
      const fresh = await Assignment.findById(assignment._id)
        .populate('subject', 'name nameUz')
        .populate('submissions.student', 'firstName lastName email');

      res.json({ success: true, data: fresh });
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

  const system = `Siz O'zbekiston maktabi uchun test tuzuvchi ekspertsiz. Faqat bitta JSON obyekt qaytaring, boshqa matn yoki markdown yo'q.
Format:
{"title":"string","description":"string","questions":[{"text":"string","difficulty":"easy|medium|hard","points":1,"explanation":"string","options":[{"text":"string","isCorrect":boolean}]}]}
Qoidalar: har bir savolda aynan 4 ta variant; faqat bittasida "isCorrect": true. Savollar o'zbek tilida.`;

  const userMsg = `Fan: "${subjectName}". Mavzu: "${topic}". Savollar soni: ${n}. Qiyinlik: ${diff}.`;

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

// Mening yaratgan testlarim (savollar yuklanmaydi — faqat soni)
router.get('/quizzes', async (req, res, next) => {
  try {
    const filter = req.user.role === 'admin' ? {} : { createdBy: req.user._id };
    const rows = await Quiz.aggregate([
      { $match: filter },
      { $sort: { updatedAt: -1 } },
      { $limit: 100 },
      {
        $project: {
          title: 1,
          description: 1,
          subject: 1,
          isActive: 1,
          difficulty: 1,
          timeLimit: 1,
          passingScore: 1,
          maxAttempts: 1,
          createdAt: 1,
          updatedAt: 1,
          questionCount: { $size: { $ifNull: ['$questions', []] } }
        }
      }
    ]);
    const subIds = [...new Set(rows.map((r) => r.subject).filter(Boolean))];
    const subjects = await Subject.find({ _id: { $in: subIds } }).select('name nameUz').lean();
    const subMap = Object.fromEntries(subjects.map((s) => [String(s._id), s]));
    const data = rows.map((r) => ({
      ...r,
      subject: subMap[String(r.subject)] || r.subject
    }));

    res.json({ success: true, count: data.length, data });
  } catch (err) {
    next(err);
  }
});

// AI yordamida test loyihasi (saqlanmagan — frontend tahrir qilib POST /api/quizzes qiladi)
router.post(
  '/quizzes/generate-ai',
  [
    body('subjectId').isMongoId().withMessage('Fan tanlang'),
    body('topic').trim().notEmpty().isLength({ max: 400 }).withMessage('Mavzu kiriting'),
    body('numQuestions').optional().isInt({ min: 3, max: 15 }),
    body('difficulty').optional().isIn(['easy', 'medium', 'hard'])
  ],
  handleValidation,
  async (req, res, next) => {
    try {
      const subject = await Subject.findById(req.body.subjectId).select('name nameUz');
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
            message:
              'AI test uchun GROQ_API_KEY yoki OPENAI_API_KEY sozlanmagan. .env faylga kalit qo\'shing.'
          });
        }
        return res.status(502).json({ success: false, message: e.message || 'AI xato' });
      }

      res.json({
        success: true,
        data: {
          ...draft,
          subjectId: req.body.subjectId
        }
      });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
