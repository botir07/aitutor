const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const User = require('../lib/User');
const { protect } = require('../middleware/auth');
const requireDb = require('../middleware/requireDb');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

router.use(requireDb);

const otpStore = new Map();
const otpRateLimit = new Map();
const verifiedEmailStore = new Map();

const OTP_EXPIRY = 5 * 60 * 1000;
const RESEND_COOLDOWN = 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;

const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [email, record] of otpStore.entries()) {
    if (now > record.expiresAt) otpStore.delete(email);
  }
  for (const [email, record] of verifiedEmailStore.entries()) {
    if (now > record.expiresAt) verifiedEmailStore.delete(email);
  }
  for (const [email, sentAt] of otpRateLimit.entries()) {
    if (now - sentAt > RESEND_COOLDOWN) otpRateLimit.delete(email);
  }
}, 60 * 1000);

cleanupTimer.unref?.();

let transporter;
try {
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    const smtpPort = parseInt(process.env.SMTP_PORT, 10) || 587;
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  } else {
    console.warn('SMTP_USER yoki SMTP_PASS topilmadi. OTP email yuborish ishlamaydi.');
  }
} catch (err) {
  console.warn('⚠️  SMTP not configured. OTP emails will not work.');
}

function generateOTP() {
  return crypto.randomInt(100000, 1000000).toString();
}

function hashOTP(otp) {
  return crypto.createHash('sha256').update(String(otp)).digest('hex');
}

function normalizeOtpRecord(email) {
  const record = otpStore.get(email);
  if (record && Date.now() > record.expiresAt) {
    otpStore.delete(email);
    return null;
  }
  return record || null;
}

function isEmailOtpVerified(email) {
  const record = verifiedEmailStore.get(email);
  if (record && Date.now() <= record.expiresAt) {
    return true;
  }
  verifiedEmailStore.delete(email);
  return false;
}

async function sendOTPEmail(email, otp) {
  if (!transporter) {
    return {
      success: process.env.NODE_ENV === 'test',
      error: 'SMTP_USER va SMTP_PASS backend/.env faylida sozlanmagan'
    };
  }
  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || '"Maktab AI" <noreply@maktab.uz>',
      to: email,
      subject: 'Maktab AI - Tasdiqlash kodi',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #4edea3;">🚀 Maktab AI</h1>
          </div>
          <div style="background: #1e293b; padding: 30px; border-radius: 12px;">
            <p style="color: #e2e8f0; margin-bottom: 20px;">Assalomu alaykum!</p>
            <p style="color: #e2e8f0; margin-bottom: 20px;">Ro'yxatdan o'tish uchun tasdiqlash kodi:</p>
            <div style="background: #0f172a; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
              <span style="font-size: 32px; font-weight: bold; color: #4edea3; letter-spacing: 8px;">${otp}</span>
            </div>
            <p style="color: #94a3b8; font-size: 14px;">Bu kod 5 daqiqa davomida amal qiladi.</p>
            <p style="color: #94a3b8; font-size: 14px;">Agar siz ro'yxatdan o'tmagan bo'lsangiz, bu xabarni e'tiborsiz qoldiring.</p>
          </div>
        </div>
      `
    });
    return { success: true };
  } catch (err) {
    console.error('OTP email error:', err.message);
    return { success: false, error: err.message };
  }
}

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

      if (!isEmailOtpVerified(email)) {
        return res.status(403).json({
          success: false,
          message: 'Ro\'yxatdan o\'tish uchun avval emailni OTP orqali tasdiqlang'
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
      otpStore.delete(email);
      verifiedEmailStore.delete(email);

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

      const passwordMatch = await user.comparePassword(password);
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

router.post(
  '/send-otp',
  [
    body('email').trim().isEmail().withMessage('Email formati noto\'g\'ri').normalizeEmail()
  ],
  handleValidation,
  async (req, res, next) => {
    try {
      const { email } = req.body;
      
      const now = Date.now();
      const rateLimit = otpRateLimit.get(email);
      if (rateLimit && now - rateLimit < RESEND_COOLDOWN) {
        const remaining = Math.ceil((RESEND_COOLDOWN - (now - rateLimit)) / 1000);
        return res.status(429).json({
          success: false,
          message: `${remaining} soniyadan keyin qayta yuborish mumkin`,
          remaining: remaining
        });
      }

      const existingUser = User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Bu email allaqachon ro\'yxatdan o\'tgan'
        });
      }

      const otp = generateOTP();
      const sent = await sendOTPEmail(email, otp);
      
      if (!sent.success) {
        return res.status(500).json({
          success: false,
          message: process.env.NODE_ENV === 'production'
            ? 'Email yuborishda xatolik. SMTP sozlamalarini tekshiring.'
            : `Email yuborishda xatolik: ${sent.error}`
        });
      }

      otpStore.set(email, {
        otpHash: hashOTP(otp),
        createdAt: now,
        expiresAt: now + OTP_EXPIRY,
        attempts: 0
      });
      verifiedEmailStore.delete(email);
      
      otpRateLimit.set(email, now);

      res.json({
        success: true,
        message: 'Tasdiqlash kodi emailga yuborildi',
        expiresIn: 300,
        ...(process.env.NODE_ENV === 'test' ? { otp } : {})
      });
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  '/verify-otp',
  [
    body('email').trim().isEmail().withMessage('Email formati noto\'g\'ri').normalizeEmail(),
    body('otp').trim().isLength({ min: 6, max: 6 }).isNumeric().withMessage('6 xonali kod kiritilishi shart')
  ],
  handleValidation,
  async (req, res, next) => {
    try {
      const { email, otp } = req.body;
      
      const record = normalizeOtpRecord(email);
      
      if (!record) {
        return res.status(400).json({
          success: false,
          message: 'Tasdiqlash kodi yuborilmagan. Avval kod yuboring.'
        });
      }

      if (record.attempts >= MAX_OTP_ATTEMPTS) {
        otpStore.delete(email);
        return res.status(400).json({
          success: false,
          message: 'Juda ko\'p urinish. Qayta kod yuboring.'
        });
      }

      const suppliedHash = hashOTP(otp);
      const expectedHash = Buffer.from(record.otpHash, 'hex');
      const actualHash = Buffer.from(suppliedHash, 'hex');
      const otpMatches = expectedHash.length === actualHash.length && crypto.timingSafeEqual(expectedHash, actualHash);

      if (!otpMatches) {
        record.attempts++;
        otpStore.set(email, record);
        const remaining = MAX_OTP_ATTEMPTS - record.attempts;
        return res.status(400).json({
          success: false,
          message: `Noto'g'ri kod. ${remaining} ta urinish qoldi.`
        });
      }

      otpStore.delete(email);
      verifiedEmailStore.set(email, {
        verifiedAt: Date.now(),
        expiresAt: record.expiresAt
      });

      res.json({
        success: true,
        message: 'Email muvaffaqiyatli tasdiqlandi',
        verified: true
      });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
