const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { body, validationResult } = require('express-validator');
const Message = require('../models/Message');
const { protect } = require('../middleware/auth');
const requireDb = require('../middleware/requireDb');

router.use(requireDb);

// Foydalanuvchi bilan suhbat tarixi
router.get('/:userId', protect, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.userId)) {
      return res.status(400).json({ success: false, message: 'Foydalanuvchi ID noto\'g\'ri' });
    }

    const messages = await Message.find({
      $or: [
        { sender: req.user.id, receiver: req.params.userId },
        { sender: req.params.userId, receiver: req.user.id }
      ]
    })
      .populate('sender', 'firstName lastName avatar')
      .sort('createdAt')
      .limit(100);

    res.json({
      success: true,
      count: messages.length,
      data: messages
    });
  } catch (err) {
    next(err);
  }
});

// AI mentorga xabar — hozircha oddiy "echo + tip" (haqiqiy AI integratsiya keyinroq)
router.post(
  '/ai',
  protect,
  [body('content').trim().notEmpty().withMessage('Xabar bo\'sh bo\'lishi mumkin emas').isLength({ max: 4000 })],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: errors.array().map(e => e.msg).join(', ') });
      }

      const userMsg = await Message.create({
        sender: req.user.id,
        content: req.body.content,
        type: 'ai_chat'
      });

      const reply = generateAIReply(req.body.content);

      const aiMsg = await Message.create({
        sender: req.user.id,
        content: reply,
        type: 'ai_response'
      });

      res.json({
        success: true,
        data: {
          userMessage: userMsg,
          reply: aiMsg
        }
      });
    } catch (err) {
      next(err);
    }
  }
);

function generateAIReply(input) {
  const text = (input || '').toLowerCase();
  if (text.includes('salom') || text.includes('hi') || text.includes('hello')) {
    return 'Salom! Bugun qanday mavzuda yordam kerak?';
  }
  if (text.includes('matematika') || text.includes('tenglama')) {
    return 'Matematika bo\'yicha yordam beraman. Qaysi mavzu — algebra, geometriya, yoki boshqasi?';
  }
  if (text.includes('fizika')) {
    return 'Fizika qiziqarli fan! Mexanika, elektr, optika — qaysi bo\'lim sizga kerak?';
  }
  return 'Tushundim. Bu mavzuni qadamma-qadam tushuntirib beraman. Iltimos, savolingizni aniqroq ifodalang.';
}

module.exports = router;
