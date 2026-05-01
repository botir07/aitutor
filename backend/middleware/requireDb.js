const mongoose = require('mongoose');

module.exports = function requireDb(req, res, next) {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      success: false,
      message: 'Ma\'lumotlar bazasi mavjud emas. Iltimos, MongoDB ishga tushirilganini tekshiring.'
    });
  }
  next();
};
