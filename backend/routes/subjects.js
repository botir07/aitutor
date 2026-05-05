const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const Subject = require('../lib/Subject');
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

router.get('/', async (req, res, next) => {
  try {
    const subjects = Subject.find({ status: 'active' });
    
    res.json({
      success: true,
      count: subjects.length,
      data: subjects
    });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', protect, async (req, res, next) => {
  try {
    const subject = Subject.findById(req.params.id);
    if (!subject) {
      return res.status(404).json({ success: false, message: 'Fan topilmadi' });
    }
    res.json({ success: true, data: subject });
  } catch (err) {
    next(err);
  }
});

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
      const subject = Subject.create({ ...req.body, createdBy: parseInt(req.user.id) });
      res.status(201).json({ success: true, data: subject });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
