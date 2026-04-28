const mongoose = require('mongoose');

const gradeSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  subject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    required: true
  },
  quiz: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quiz'
  },
  type: {
    type: String,
    enum: ['quiz', 'exam', 'homework', 'participation'],
    default: 'quiz'
  },
  score: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  grade: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  maxScore: {
    type: Number,
    default: 100
  },
  feedback: String,
  gradedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  date: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Baho qo'yilganda o'quvchi statistikasini yangilash
gradeSchema.post('save', async function() {
  const User = mongoose.model('User');
  const student = await User.findById(this.student);
  
  if (student) {
    const grades = await this.constructor.find({ student: this.student });
    const avgGrade = grades.reduce((sum, g) => sum + g.grade, 0) / grades.length;
    
    student.stats.gpa = Math.round(avgGrade * 100) / 100;
    
    if (this.type === 'quiz') {
      student.stats.quizzesCompleted = grades.filter(g => g.type === 'quiz').length;
    }
    
    await student.save();
  }
});

module.exports = mongoose.model('Grade', gradeSchema);
