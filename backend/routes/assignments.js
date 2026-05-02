const express = require('express');
const mongoose = require('mongoose');
const { body, validationResult } = require('express-validator');
const Assignment = require('../models/Assignment');
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

// O'quvchi: barcha vazifalar + o'z topshirig'i
router.get('/', authorize('student', 'admin'), async (req, res, next) => {
  try {
    const list = await Assignment.find({})
      .sort('-dueDate')
      .limit(100)
      .populate('subject', 'name nameUz icon color')
      .populate('teacher', 'firstName lastName email')
      .lean();

    const uid = req.user.id.toString();
    const data = list.map((a) => {
      const sub = (a.submissions || []).find(s => String(s.student) === uid);
      const { submissions, ...rest } = a;
      return {
        ...rest,
        mySubmission: sub
          ? {
              content: sub.content,
              submittedAt: sub.submittedAt,
              score: sub.score,
              feedback: sub.feedback,
              gradedAt: sub.gradedAt
            }
          : null,
        submissionCount: (a.submissions || []).length
      };
    });

    res.json({ success: true, count: data.length, data });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', authorize('student', 'admin'), async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'ID noto\'g\'ri' });
    }
    const a = await Assignment.findById(req.params.id)
      .populate('subject', 'name nameUz icon color')
      .populate('teacher', 'firstName lastName email')
      .lean();

    if (!a) {
      return res.status(404).json({ success: false, message: 'Vazifa topilmadi' });
    }

    const uid = req.user.id.toString();
    const sub = (a.submissions || []).find(s => String(s.student) === uid);
    const { submissions, ...rest } = a;
    res.json({
      success: true,
      data: {
        ...rest,
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
      if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({ success: false, message: 'ID noto\'g\'ri' });
      }

      if (req.user.role === 'admin') {
        return res.status(403).json({ success: false, message: 'Admin topshirib bo\'lmaydi' });
      }

      const assignment = await Assignment.findById(req.params.id);
      if (!assignment) {
        return res.status(404).json({ success: false, message: 'Vazifa topilmadi' });
      }

      const sub = assignment.submissions.find(s => s.student.toString() === req.user.id.toString());
      if (!sub) {
        assignment.submissions.push({
          student: req.user.id,
          content: req.body.content,
          submittedAt: new Date()
        });
      } else {
        sub.content = req.body.content;
        sub.submittedAt = new Date();
      }

      await assignment.save();
      const fresh = await Assignment.findById(assignment._id)
        .populate('subject', 'name nameUz')
        .lean();
      const mine = (fresh.submissions || []).find(s => String(s.student) === req.user.id.toString());

      res.status(201).json({
        success: true,
        message: 'Topshirildi',
        data: { mySubmission: mine }
      });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
