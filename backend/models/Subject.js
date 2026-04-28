const mongoose = require('mongoose');

const lessonSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  content: String,
  duration: Number, // daqiqalarda
  order: Number,
  isCompleted: {
    type: Boolean,
    default: false
  }
});

const subjectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Fan nomi kiritilishi shart'],
    unique: true
  },
  nameUz: String,
  nameRu: String,
  description: String,
  descriptionUz: String,
  descriptionRu: String,
  icon: {
    type: String,
    default: 'school'
  },
  color: {
    type: String,
    default: '#4edea3'
  },
  category: {
    type: String,
    enum: ['core', 'elective', 'extra'],
    default: 'core'
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'draft'],
    default: 'active'
  },
  totalLessons: {
    type: Number,
    default: 0
  },
  difficulty: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'beginner'
  },
  prerequisites: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject'
  }],
  lessons: [lessonSchema],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Virtual: O'quvchilar soni
subjectSchema.virtual('studentCount', {
  ref: 'User',
  localField: '_id',
  foreignField: 'subjects',
  count: true
});

module.exports = mongoose.model('Subject', subjectSchema);
