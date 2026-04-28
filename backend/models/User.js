const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, 'Ism kiritilishi shart'],
    trim: true,
    maxlength: 50
  },
  lastName: {
    type: String,
    required: [true, 'Familiya kiritilishi shart'],
    trim: true,
    maxlength: 50
  },
  email: {
    type: String,
    required: [true, 'Email kiritilishi shart'],
    unique: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Email formati noto\'g\'ri']
  },
  password: {
    type: String,
    required: [true, 'Parol kiritilishi shart'],
    minlength: 6,
    select: false
  },
  role: {
    type: String,
    enum: ['student', 'parent', 'teacher', 'admin'],
    default: 'student'
  },
  avatar: {
    type: String,
    default: 'default-avatar.png'
  },
  grade: String,
  studentId: String,
  phone: String,
  address: String,
  subjects: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject'
  }],
  preferences: {
    theme: {
      type: String,
      enum: ['dark', 'light'],
      default: 'dark'
    },
    language: {
      type: String,
      enum: ['uz', 'ru', 'en'],
      default: 'uz'
    },
    notifications: {
      schedule: { type: Boolean, default: true },
      grades: { type: Boolean, default: true },
      updates: { type: Boolean, default: false },
      homework: { type: Boolean, default: true }
    }
  },
  stats: {
    gpa: { type: Number, default: 0, min: 0, max: 5 },
    quizzesCompleted: { type: Number, default: 0 },
    totalStudyTime: { type: Number, default: 0 }, // daqiqalarda
    streak: { type: Number, default: 0 },
    rank: { type: String, default: 'Boshlovchi' },
    badges: [{
      name: String,
      icon: String,
      earnedAt: Date
    }]
  },
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  children: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  lastLogin: Date,
  isActive: {
    type: Boolean,
    default: true
  },
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Password hashlash
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Password solishtirish
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// JWT token yaratish
userSchema.methods.getSignedJwtToken = function() {
  return require('jsonwebtoken').sign(
    { id: this._id },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE }
  );
};

module.exports = mongoose.model('User', userSchema);
