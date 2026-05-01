const errorHandler = (err, req, res, next) => {
  if (process.env.NODE_ENV !== 'test') {
    console.error('[ERROR]', err.message);
    if (process.env.NODE_ENV !== 'production') console.error(err.stack);
  }

  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(val => val.message);
    return res.status(400).json({
      success: false,
      message: messages.join(', ')
    });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'Noto\'g\'ri ID format'
    });
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'maydon';
    return res.status(400).json({
      success: false,
      message: `${field} qiymati bazada mavjud`
    });
  }

  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token yaroqsiz yoki muddati o\'tgan'
    });
  }

  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Server xatoligi'
  });
};

module.exports = errorHandler;
