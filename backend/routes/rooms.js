const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { protect } = require('../middleware/auth');
const requireDb = require('../middleware/requireDb');

router.use(requireDb);

const Room = mongoose.models.Room || mongoose.model('Room', new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  code: { type: String, required: true, unique: true },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  teacherName: String,
  maxPlayers: { type: Number, default: 20 },
  isActive: { type: Boolean, default: true },
  subject: { type: String, default: '' },
  description: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
}));

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
    const filter = {};
    if (active !== undefined) {
      filter.isActive = active === 'true';
    }
    const rooms = await Room.find(filter)
      .select('name code teacherName maxPlayers subject description createdAt isActive')
      .sort({ createdAt: -1 })
      .limit(50);
    res.json({ success: true, data: rooms });
  } catch (err) {
    next(err);
  }
});

router.get('/:code', protect, async (req, res, next) => {
  try {
    const room = await Room.findOne({ code: req.params.code.toUpperCase() });
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
    const room = await Room.create({
      name: name.trim(),
      code,
      teacherId: req.user.id,
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
    const room = await Room.findOne({ code: req.params.code.toUpperCase() });
    if (!room) {
      return res.status(404).json({ success: false, message: 'Xona topilmadi' });
    }
    if (room.teacherId.toString() !== req.user.id.toString()) {
      return res.status(403).json({ success: false, message: 'Faqat xona egasi o\'zgartirish qilishi mumkin' });
    }
    const { name, isActive, maxPlayers, subject, description } = req.body;
    if (name) room.name = name.trim();
    if (isActive !== undefined) room.isActive = Boolean(isActive);
    if (maxPlayers) room.maxPlayers = Math.min(Math.max(parseInt(maxPlayers, 10), 2), 50);
    if (subject !== undefined) room.subject = subject;
    if (description !== undefined) room.description = description;
    await room.save();
    res.json({ success: true, data: { name: room.name, isActive: room.isActive, maxPlayers: room.maxPlayers } });
  } catch (err) {
    next(err);
  }
});

router.delete('/:code', protect, async (req, res, next) => {
  try {
    const room = await Room.findOne({ code: req.params.code.toUpperCase() });
    if (!room) {
      return res.status(404).json({ success: false, message: 'Xona topilmadi' });
    }
    if (room.teacherId.toString() !== req.user.id.toString()) {
      return res.status(403).json({ success: false, message: 'Faqat xona egasi o\'chirishi mumkin' });
    }
    await room.deleteOne();
    res.json({ success: true, message: 'Xona o\'chirildi' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;