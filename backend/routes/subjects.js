const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const Subject = require('../models/Subject');
const { protect, authorize } = require('../middleware/auth');
const requireDb = require('../middleware/requireDb');

router.use(requireDb);

const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array().map(e => e.msg).join(', ')
    });
  }
  next();
};

// Barcha fanlar
router.get('/', async (req, res, next) => {
  try {
    const subjects = await Subject.find({ status: 'active' })
      .select('-lessons.content')
      .sort('name');

    res.json({
      success: true,
      count: subjects.length,
      data: subjects
    });
  } catch (err) {
    next(err);
  }
});

// Bitta fan + darslari
router.get('/:id', protect, async (req, res, next) => {
  try {
    const subject = await Subject.findById(req.params.id).populate('prerequisites', 'name nameUz');
    if (!subject) {
      return res.status(404).json({ success: false, message: 'Fan topilmadi' });
    }
    res.json({ success: true, data: subject });
  } catch (err) {
    next(err);
  }
});

// Yangi fan (teacher/admin)
router.post(
  '/',
  protect,
  authorize('teacher', 'admin'),
  [
    body('name').trim().notEmpty().withMessage('Fan nomi kiritilishi shart'),
    body('category').optional().isIn(['core', 'elective', 'extra']),
    body('difficulty').optional().isIn(['beginner', 'intermediate', 'advanced'])
  ],
  handleValidation,
  async (req, res, next) => {
    try {
      const subject = await Subject.create({ ...req.body, createdBy: req.user.id });
      res.status(201).json({ success: true, data: subject });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
