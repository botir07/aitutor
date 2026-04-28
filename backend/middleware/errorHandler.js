const errorHandler = (err, req, res, next) => {
  console.error(err.stack);
  
  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(val => val.message);
    return res.status(400).json({
      success: false,
      message: messages.join(', ')
    });
  }
  
  // Mongoose duplicate key
  if (err.code === 11000) {
    return res.status(400).json({
      success: false,
      message: 'Bu ma\'lumot bazada mavjud'
    });
  }
  
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Server xatoligi'
  });
};

module.exports = errorHandler;
