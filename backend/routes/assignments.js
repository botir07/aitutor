const express = require('express');
const { body, validationResult } = require('express-validator');
const Assignment = require('../lib/Assignment');
const Subject = require('../lib/Subject');
const User = require('../lib/User');
const { protect, authorize } = require('../middleware/auth');
const requireDb = require('../middleware/requireDb');

const router = express.Router();

router.use(requireDb);
router.use(protect);

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

router.get('/', authorize('student', 'admin'), async (req, res, next) => {
  try {
    const list = Assignment.find();
    const uid = parseInt(req.user.id);
    
    const data = list.map((a) => {
      const subject = Subject.findById(a.subject);
      const teacher = User.findById(a.teacher);
      const submissions = a.submissions || [];
      const sub = submissions.find(s => parseInt(s.student) === uid);
      
      return {
        ...a,
        subject: subject ? { _id: subject._id, name: subject.name, nameUz: subject.nameUz, icon: subject.icon, color: subject.color } : null,
        teacher: teacher ? { firstName: teacher.firstName, lastName: teacher.lastName, email: teacher.email } : null,
        mySubmission: sub ? {
          content: sub.content,
          submittedAt: sub.submittedAt,
          score: sub.score,
          feedback: sub.feedback,
          gradedAt: sub.gradedAt
        } : null,
        submissionCount: submissions.length
      };
    });

    data.sort((a, b) => new Date(b.dueDate) - new Date(a.dueDate));

    res.json({ success: true, count: data.length, data });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', authorize('student', 'admin'), async (req, res, next) => {
  try {
    const a = Assignment.findById(req.params.id);
    if (!a) {
      return res.status(404).json({ success: false, message: 'Vazifa topilmadi' });
    }

    const subject = Subject.findById(a.subject);
    const teacher = User.findById(a.teacher);
    const uid = parseInt(req.user.id);
    const sub = (a.submissions || []).find(s => parseInt(s.student) === uid);

    res.json({
      success: true,
      data: {
        ...a,
        subject: subject ? { _id: subject._id, name: subject.name, nameUz: subject.nameUz, icon: subject.icon, color: subject.color } : null,
        teacher: teacher ? { firstName: teacher.firstName, lastName: teacher.lastName, email: teacher.email } : null,
        mySubmission: sub || null
      }
    });
  } catch (err) {
    next(err);
  }
});

router.post(
  '/:id/submit',
  authorize('student', 'admin'),
  [body('content').trim().notEmpty().withMessage('Javob matni kerak').isLength({ max: 8000 })],
  handleValidation,
  async (req, res, next) => {
    try {
      if (req.user.role === 'admin') {
        return res.status(403).json({ success: false, message: 'Admin topshirib bo\'lmaydi' });
      }

      const assignment = Assignment.findById(req.params.id);
      if (!assignment) {
        return res.status(404).json({ success: false, message: 'Vazifa topilmadi' });
      }

      const { getDb } = require('../lib/database');
      const db = getDb();
      const uid = parseInt(req.user.id);
      const submissions = assignment.submissions || [];
      const subIdx = submissions.findIndex(s => parseInt(s.student) === uid);
      
      const now = new Date().toISOString();
      if (subIdx === -1) {
        submissions.push({
          student: uid,
          content: req.body.content,
          submittedAt: now
        });
      } else {
        submissions[subIdx].content = req.body.content;
        submissions[subIdx].submittedAt = now;
      }

      const stmt = db.prepare('UPDATE assignments SET submissions = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?');
      stmt.run(JSON.stringify(submissions), assignment.id);

      res.status(201).json({
        success: true,
        message: 'Topshirildi',
        data: { mySubmission: { content: req.body.content, submittedAt: now } }
      });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
