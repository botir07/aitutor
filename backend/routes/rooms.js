const express = require('express');
const router = express.Router();
const Room = require('../lib/Room');
const { protect } = require('../middleware/auth');
const requireDb = require('../middleware/requireDb');

router.use(requireDb);

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

router.get('/', protect, async (req, res, next) => {
  try {
    const { active } = req.query;
    const filter = { limit: 50 };
    if (active !== undefined) {
      filter.isActive = active === 'true';
    }
    const rooms = Room.find(filter);
    res.json({ success: true, data: rooms });
  } catch (err) {
    next(err);
  }
});

router.get('/:code', protect, async (req, res, next) => {
  try {
    const room = Room.findOne({ code: req.params.code.toUpperCase() });
    if (!room) {
      return res.status(404).json({ success: false, message: 'Xona topilmadi' });
    }
    res.json({
      success: true,
      data: {
        name: room.name,
        code: room.code,
        teacherName: room.teacherName,
        maxPlayers: room.maxPlayers,
        subject: room.subject,
        description: room.description,
        isActive: room.isActive
      }
    });
  } catch (err) {
    next(err);
  }
});

router.post('/', protect, async (req, res, next) => {
  try {
    const { name, subject, description, maxPlayers } = req.body;
    if (!name || name.trim().length < 2) {
      return res.status(400).json({ success: false, message: 'Xona nomi kamida 2 ta belgi bo\'lishi kerak' });
    }
    const code = generateRoomCode();
    const room = Room.create({
      name: name.trim(),
      code,
      teacherId: parseInt(req.user.id),
      teacherName: `${req.user.firstName} ${req.user.lastName}`,
      subject: subject || '',
      description: description || '',
      maxPlayers: Math.min(Math.max(parseInt(maxPlayers, 10) || 20, 2), 50)
    });
    res.status(201).json({
      success: true,
      data: {
        _id: room._id,
        name: room.name,
        code: room.code,
        teacherName: room.teacherName,
        maxPlayers: room.maxPlayers,
        subject: room.subject,
        description: room.description
      }
    });
  } catch (err) {
    next(err);
  }
});

router.put('/:code', protect, async (req, res, next) => {
  try {
    const room = Room.findOne({ code: req.params.code.toUpperCase() });
    if (!room) {
      return res.status(404).json({ success: false, message: 'Xona topilmadi' });
    }
    if (room.teacherId.toString() !== req.user.id.toString()) {
      return res.status(403).json({ success: false, message: 'Faqat xona egasi o\'zgartirish qilishi mumkin' });
    }
    const { name, isActive, maxPlayers, subject, description } = req.body;
    const updated = Room.update(req.params.code.toUpperCase(), {
      name: name ? name.trim() : undefined,
      isActive,
      maxPlayers,
      subject,
      description
    });
    res.json({ success: true, data: { name: updated.name, isActive: updated.isActive, maxPlayers: updated.maxPlayers } });
  } catch (err) {
    next(err);
  }
});

router.delete('/:code', protect, async (req, res, next) => {
  try {
    const room = Room.findOne({ code: req.params.code.toUpperCase() });
    if (!room) {
      return res.status(404).json({ success: false, message: 'Xona topilmadi' });
    }
    if (room.teacherId.toString() !== req.user.id.toString()) {
      return res.status(403).json({ success: false, message: 'Faqat xona egasi o\'chirishi mumkin' });
    }
    Room.delete(req.params.code.toUpperCase());
    res.json({ success: true, message: 'Xona o\'chirildi' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
