const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const User = require('../models/User');
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

// Barcha foydalanuvchilar (admin)
router.get('/', protect, authorize('admin'), async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 200);

    const [users, total] = await Promise.all([
      User.find()
        .select('-password')
        .skip((page - 1) * limit)
        .limit(limit)
        .sort('-createdAt'),
      User.countDocuments()
    ]);

    res.json({
      success: true,
      count: users.length,
      total,
      page,
      data: users
    });
  } catch (err) {
    next(err);
  }
});

// Profilni yangilash — faqat ruxsat etilgan maydonlar
router.put(
  '/profile',
  protect,
  [
    body('firstName').optional().trim().isLength({ min: 1, max: 50 }),
    body('lastName').optional().trim().isLength({ min: 1, max: 50 }),
    body('phone').optional().trim().isLength({ max: 30 }),
    body('address').optional().trim().isLength({ max: 200 }),
    body('grade').optional().isString().isLength({ max: 20 }),
    body('theme').optional().isIn(['dark', 'light']),
    body('language').optional().isIn(['uz', 'ru', 'en'])
  ],
  handleValidation,
  async (req, res, next) => {
    try {
      const allowed = ['firstName', 'lastName', 'phone', 'address', 'grade'];
      const updates = {};

      for (const key of allowed) {
        if (req.body[key] !== undefined) updates[key] = req.body[key];
      }
      if (req.body.theme !== undefined) updates['preferences.theme'] = req.body.theme;
      if (req.body.language !== undefined) updates['preferences.language'] = req.body.language;

      const user = await User.findByIdAndUpdate(
        req.user.id,
        updates,
        { new: true, runValidators: true }
      ).select('-password');

      res.json({
        success: true,
        data: user
      });
    } catch (err) {
      next(err);
    }
  }
);

// Parolni o'zgartirish
router.put(
  '/password',
  protect,
  [
    body('currentPassword').notEmpty().withMessage('Joriy parol kiritilishi shart'),
    body('newPassword').isLength({ min: 6 }).withMessage('Yangi parol kamida 6 ta belgidan iborat bo\'lishi kerak')
  ],
  handleValidation,
  async (req, res, next) => {
    try {
      const user = await User.findById(req.user.id).select('+password');
      const ok = await user.comparePassword(req.body.currentPassword);
      if (!ok) {
        return res.status(401).json({ success: false, message: 'Joriy parol noto\'g\'ri' });
      }
      user.password = req.body.newPassword;
      await user.save();
      res.json({ success: true, message: 'Parol muvaffaqiyatli o\'zgartirildi' });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
