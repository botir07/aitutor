const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Message = require('../lib/Message');
const User = require('../lib/User');
const { protect } = require('../middleware/auth');
const requireDb = require('../middleware/requireDb');
const { resolveOpenAICompatConfig } = require('../utils/aiProvider');

router.use(requireDb);

router.get('/:userId', protect, async (req, res, next) => {
  try {
    const peerId = parseInt(req.params.userId);
    const selfId = parseInt(req.user.id);
    
    const messages = Message.findWithOr([
      { sender: selfId, receiver: peerId },
      { sender: peerId, receiver: selfId }
    ]);

    const result = messages.map(m => {
      const sender = User.findById(m.sender);
      return {
        ...m,
        sender: sender ? { firstName: sender.firstName, lastName: sender.lastName, avatar: sender.avatar } : { _id: m.sender }
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

      const userMsg = Message.create({
        sender: parseInt(req.user.id),
        content: req.body.content,
        type: 'ai_chat'
      });

      const reply = await generateAIReply(req.body.content);

      const aiMsg = Message.create({
        sender: parseInt(req.user.id),
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

function ruleBasedReply(input) {
  const text = (input || '').toLowerCase();
  if (text.includes('salom') || text.includes('hi') || text.includes('hello')) {
    return 'Salom! Bugun qanday mavzuda yordam kerak?';
  }
  if (text.includes('matematika') || text.includes('tenglama')) {
    return "Matematika bo'yicha yordam beraman. Qaysi mavzu — algebra, geometriya, yoki boshqasi?";
  }
  if (text.includes('fizika')) {
    return 'Fizika qiziqarli fan! Mexanika, elektr, optika — qaysi bo\'lim sizga kerak?';
  }
  return 'Tushundim. Bu mavzuni qadamma-qadam tushuntirib beraman. Iltimos, savolingizni aniqroq ifodalang.';
}

async function generateAIReply(input) {
  const { key, base, model } = resolveOpenAICompatConfig();
  if (!key) {
    return ruleBasedReply(input);
  }

  try {
    const res = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: process.env.AI_SYSTEM_PROMPT || 'Siz O\'zbekiston maktab o\'quvchilariga yordam beruvchi AI mentorsiz. Javoblarni o\'zbek tilida, qisqa va tushunarli yozing.'
          },
          { role: 'user', content: String(input).slice(0, 4000) }
        ],
        max_tokens: 900,
        temperature: 0.55
      })
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => res.statusText);
      console.warn('[chat] LLM javob xato:', res.status, errText.slice(0, 200));
      return ruleBasedReply(input);
    }

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content?.trim();
    if (text) return text;
  } catch (err) {
    console.warn('[chat] LLM so\'rov xato:', err.message);
  }

  return ruleBasedReply(input);
}

module.exports = router;
