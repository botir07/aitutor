const { getDb } = require('../lib/database');
const path = require('path');

module.exports = function requireDb(req, res, next) {
  try {
    const db = getDb();
    db.exec('SELECT 1');
    next();
  } catch (err) {
    return res.status(503).json({
      success: false,
      message: "Ma'lumotlar bazasi mavjud emas. Iltimos, dasturni qayta ishga tushiring."
    });
  }
};
