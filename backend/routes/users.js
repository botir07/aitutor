const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const User = require('../lib/User');
const { getDb } = require('../lib/database');
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

router.get('/', protect, authorize('admin'), async (req, res, next) => {
  try {
    const db = getDb();
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 200);
    const offset = (page - 1) * limit;

    const users = db.prepare(`
      SELECT id, firstName, lastName, email, role, avatar, grade, createdAt, updatedAt
      FROM users
      ORDER BY createdAt DESC
      LIMIT ? OFFSET ?
    `).all(limit, offset);

    const totalResult = db.prepare('SELECT COUNT(*) as count FROM users').get();
    const total = totalResult.count;

    res.json({
      success: true,
      count: users.length,
      total,
      page,
      data: users.map(u => ({ ...u, _id: u.id.toString() }))
    });
  } catch (err) {
    next(err);
  }
});

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
      const db = getDb();
      const uid = parseInt(req.user.id);
      const updates = [];
      const values = [];

      const fields = ['firstName', 'lastName', 'phone', 'address', 'grade'];
      for (const key of fields) {
        if (req.body[key] !== undefined) {
          updates.push(`${key} = ?`);
          values.push(req.body[key]);
        }
      }

      if (req.body.theme !== undefined || req.body.language !== undefined) {
        const current = User.findById(uid);
        if (current) {
          const prefs = current.preferences || {};
          if (req.body.theme !== undefined) prefs.theme = req.body.theme;
          if (req.body.language !== undefined) prefs.language = req.body.language;
          updates.push('preferences = ?');
          values.push(JSON.stringify(prefs));
        }
      }

      if (updates.length > 0) {
        values.push(uid);
        db.prepare(`UPDATE users SET ${updates.join(', ')}, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`).run(...values);
      }

      const user = User.findById(uid);
      res.json({
        success: true,
        data: user
      });
    } catch (err) {
      next(err);
    }
  }
);

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
      const user = User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ success: false, message: 'Foydalanuvchi topilmadi' });
      }

      const ok = user.comparePassword(req.body.currentPassword);
      if (!ok) {
        return res.status(401).json({ success: false, message: 'Joriy parol noto\'g\'ri' });
      }

      const bcrypt = require('bcryptjs');
      const hashedPassword = bcrypt.hashSync(req.body.newPassword, 12);
      const db = getDb();
      db.prepare('UPDATE users SET password = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?').run(hashedPassword, user.id);

      res.json({ success: true, message: 'Parol muvaffaqiyatli o\'zgartirildi' });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
