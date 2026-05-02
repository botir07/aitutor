const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    maxlength: 8000
  },
  score: {
    type: Number,
    min: 0
  },
  feedback: String,
  submittedAt: Date,
  gradedAt: Date
}, { _id: true });

const assignmentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    maxlength: 4000
  },
  subject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    required: true
  },
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  dueDate: {
    type: Date,
    required: true
  },
  maxScore: {
    type: Number,
    default: 100,
    min: 1,
    max: 1000
  },
  submissions: [submissionSchema]
}, {
  timestamps: true
});

module.exports = mongoose.model('Assignment', assignmentSchema);
