const express = require('express');
const mongoose = require('mongoose');
const { body, query, validationResult } = require('express-validator');
const User = require('../models/User');
const Subject = require('../models/Subject');
const Grade = require('../models/Grade');
const Attendance = require('../models/Attendance');
const Assignment = require('../models/Assignment');
const { protect, authorize } = require('../middleware/auth');
const requireDb = require('../middleware/requireDb');

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

module.exports = router;
