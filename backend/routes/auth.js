const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const User = require('../lib/User');
const { protect } = require('../middleware/auth');
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

const sanitizeUser = (user) => ({
  id: user.id || user._id,
  firstName: user.firstName,
  lastName: user.lastName,
  email: user.email,
  role: user.role,
  avatar: user.avatar,
  grade: user.grade,
  stats: user.stats,
  preferences: user.preferences
});

router.post(
  '/register',
  [
    body('firstName').trim().notEmpty().withMessage('Ism kiritilishi shart').isLength({ max: 50 }),
    body('lastName').trim().notEmpty().withMessage('Familiya kiritilishi shart').isLength({ max: 50 }),
    body('email').trim().isEmail().withMessage('Email formati noto\'g\'ri').normalizeEmail(),
    body('password').isLength({ min: 6 }).withMessage('Parol kamida 6 ta belgidan iborat bo\'lishi kerak'),
    body('role').optional().isIn(['student', 'parent', 'teacher']).withMessage('Yaroqsiz rol'),
    body('grade').optional().isString().isLength({ max: 20 })
  ],
  handleValidation,
  async (req, res, next) => {
    try {
      const { firstName, lastName, email, password, role, grade } = req.body;

      const existingUser = User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Bu email allaqachon ro\'yxatdan o\'tgan'
        });
      }

      const user = User.create({
        firstName,
        lastName,
        email,
        password,
        role: role || 'student',
        grade
      });

      const token = user.getSignedJwtToken();

      res.status(201).json({
        success: true,
        token,
        user: sanitizeUser(user)
      });
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  '/login',
  [
    body('email').trim().isEmail().withMessage('Email formati noto\'g\'ri').normalizeEmail(),
    body('password').notEmpty().withMessage('Parol kiritilishi shart')
  ],
  handleValidation,
  async (req, res, next) => {
    try {
      const { email, password } = req.body;

      const user = User.findOne({ email });
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Email yoki parol noto\'g\'ri'
        });
      }

      const passwordMatch = user.comparePassword(password);
      if (!passwordMatch) {
        return res.status(401).json({
          success: false,
          message: 'Email yoki parol noto\'g\'ri'
        });
      }

      if (!user.isActive) {
        return res.status(403).json({
          success: false,
          message: 'Akkauntingiz faol emas'
        });
      }

      user.lastLogin = new Date().toISOString();
      user.save();

      const token = user.getSignedJwtToken();

      res.json({
        success: true,
        token,
        user: sanitizeUser(user)
      });
    } catch (err) {
      next(err);
    }
  }
);

router.get('/profile', protect, async (req, res, next) => {
  try {
    res.json({
      success: true,
      data: req.user
    });
  } catch (err) {
    next(err);
  }
});

router.get('/me', protect, (req, res) => {
  res.json({
    success: true,
    data: sanitizeUser(req.user)
  });
});

module.exports = router;
