const express = require('express');
const router = express.Router();
const Grade = require('../lib/Grade');
const User = require('../lib/User');
const Subject = require('../lib/Subject');
const { protect } = require('../middleware/auth');
const requireDb = require('../middleware/requireDb');

router.use(requireDb);

router.get('/', protect, async (req, res, next) => {
  try {
    const grades = Grade.find({ student: parseInt(req.user.id) });
    
    const result = grades.map(g => {
      const subject = Subject.findById(g.subject);
      const quiz = g.quiz ? { title: 'Test' } : null;
      return {
        ...g,
        subject: subject ? { _id: subject._id, name: subject.name, nameUz: subject.nameUz } : null,
        quiz
      };
    });

    res.json({
      success: true,
      count: result.length,
      data: result
    });
  } catch (err) {
    next(err);
  }
});

router.get('/student/:studentId', protect, async (req, res, next) => {
  try {
    const { studentId } = req.params;
    const studentIdNum = parseInt(studentId);
    
    const isOwn = studentIdNum === parseInt(req.user.id);
    const isStaff = ['teacher', 'admin'].includes(req.user.role);
    let isParent = false;

    if (req.user.role === 'parent') {
      const parent = User.findById(req.user.id);
      if (parent && parent.children) {
        isParent = parent.children.some(c => parseInt(c) === studentIdNum);
      }
    }

    if (!isOwn && !isStaff && !isParent) {
      return res.status(403).json({
        success: false,
        message: "Bu o'quvchining baholarini ko'rish huquqingiz yo'q"
      });
    }

    const grades = Grade.find({ student: studentIdNum });
    
    const result = grades.map(g => {
      const subject = Subject.findById(g.subject);
      return {
        ...g,
        subject: subject ? { _id: subject._id, name: subject.name, nameUz: subject.nameUz } : null
      };
    });

    res.json({
      success: true,
      count: result.length,
      data: result
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
