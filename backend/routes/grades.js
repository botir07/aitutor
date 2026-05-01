const express = require('express');
const router = express.Router();
const Grade = require('../models/Grade');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const requireDb = require('../middleware/requireDb');

router.use(requireDb);

// Joriy foydalanuvchining baholari
router.get('/', protect, async (req, res, next) => {
  try {
    const grades = await Grade.find({ student: req.user.id })
      .populate('subject', 'name nameUz')
      .populate('quiz', 'title')
      .sort('-date')
      .limit(100);

    res.json({
      success: true,
      count: grades.length,
      data: grades
    });
  } catch (err) {
    next(err);
  }
});

// Boshqa o'quvchining baholari — faqat ota-ona, o'qituvchi yoki admin
router.get('/student/:studentId', protect, async (req, res, next) => {
  try {
    const { studentId } = req.params;

    const isOwn = studentId === req.user.id.toString();
    const isStaff = ['teacher', 'admin'].includes(req.user.role);
    let isParent = false;

    if (req.user.role === 'parent') {
      const parent = await User.findById(req.user.id).select('children');
      isParent = parent && parent.children.some(c => c.toString() === studentId);
    }

    if (!isOwn && !isStaff && !isParent) {
      return res.status(403).json({
        success: false,
        message: 'Bu o\'quvchining baholarini ko\'rish huquqingiz yo\'q'
      });
    }

    const grades = await Grade.find({ student: studentId })
      .populate('subject', 'name nameUz')
      .populate('quiz', 'title')
      .sort('-date')
      .limit(100);

    res.json({
      success: true,
      count: grades.length,
      data: grades
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
