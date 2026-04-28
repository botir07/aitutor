const express = require('express');
const router = express.Router();
const Grade = require('../models/Grade');
const { protect } = require('../middleware/auth');

// O'quvchi baholarini olish
router.get('/student/:studentId?', protect, async (req, res) => {
  try {
    const studentId = req.params.studentId || req.user.id;
    
    const grades = await Grade.find({ student: studentId })
      .populate('subject', 'name nameUz')
      .populate('quiz', 'title')
      .sort('-date');
    
    res.json({
      success: true,
      count: grades.length,
      data: grades
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
