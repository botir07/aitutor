const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');

// Barcha o'quvchilarni olish (admin uchun)
router.get('/', protect, authorize('admin'), async (req, res) => {
  try {
    const users = await User.find()
      .populate('subjects')
      .select('-password');
    
    res.json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Profilni yangilash
router.put('/profile', protect, async (req, res) => {
  try {
    const updates = {
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      phone: req.body.phone,
      address: req.body.address,
      'preferences.theme': req.body.theme,
      'preferences.language': req.body.language
    };
    
    // undefined qiymatlarni olib tashlash
    Object.keys(updates).forEach(key => {
      if (updates[key] === undefined) delete updates[key];
    });
    
    const user = await User.findByIdAndUpdate(
      req.user.id,
      updates,
      { new: true, runValidators: true }
    );
    
    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
