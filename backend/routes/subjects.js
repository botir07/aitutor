const express = require('express');
const router = express.Router();
const Subject = require('../models/Subject');
const { protect, authorize } = require('../middleware/auth');

// Barcha fanlarni olish
router.get('/', protect, async (req, res) => {
  try {
    const subjects = await Subject.find({ status: 'active' })
      .populate('prerequisites')
      .sort('name');
    
    res.json({
      success: true,
      count: subjects.length,
      data: subjects
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Yangi fan qo'shish (teacher/admin)
router.post('/', protect, authorize('teacher', 'admin'), async (req, res) => {
  try {
    const subject = await Subject.create(req.body);
    
    res.status(201).json({
      success: true,
      data: subject
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
