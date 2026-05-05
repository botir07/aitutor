const express = require('express');
const router = express.Router();
const Quiz = require('../lib/Quiz');
const Grade = require('../lib/Grade');
const Subject = require('../lib/Subject');
const { getDb } = require('../lib/database');
const { protect, authorize } = require('../middleware/auth');
const requireDb = require('../middleware/requireDb');

router.use(requireDb);

router.get('/', protect, async (req, res, next) => {
  try {
    const quizzes = Quiz.find({ isActive: true });
    
    const result = quizzes.map(q => {
      const subject = Subject.findById(q.subject);
      return {
        ...q,
        subject: subject ? { _id: subject._id, name: subject.name, nameUz: subject.nameUz, icon: subject.icon, color: subject.color } : null,
        questions: q.questions ? q.questions.map(quest => ({
          _id: quest._id || quest.id,
          text: quest.text,
          points: quest.points,
          difficulty: quest.difficulty,
          options: quest.options ? quest.options.map((opt, idx) => ({ _id: idx, text: opt.text })) : []
        })) : []
      };
    });

    res.json({
      success: true,
      count: result.length,
      data: result
    });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', protect, async (req, res, next) => {
  try {
    const quiz = Quiz.findById(req.params.id);
    if (!quiz) {
      return res.status(404).json({ success: false, message: 'Test topilmadi' });
    }

    const subject = Subject.findById(quiz.subject);
    
    const result = {
      ...quiz,
      subject: subject ? { _id: subject._id, name: subject.name, nameUz: subject.nameUz, icon: subject.icon, color: subject.color } : null,
      questions: quiz.questions ? quiz.questions.map((q, qIdx) => ({
        _id: qIdx,
        text: q.text,
        points: q.points,
        difficulty: q.difficulty,
        options: q.options ? q.options.map((opt, oIdx) => ({ _id: oIdx, text: opt.text })) : []
      })) : []
    };

    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/submit', protect, async (req, res, next) => {
  try {
    const quiz = Quiz.findById(req.params.id);
    if (!quiz) {
      return res.status(404).json({ success: false, message: 'Test topilmadi' });
    }

    const db = getDb();
    const studentId = parseInt(req.user.id);
    const quizId = quiz.id;

    const attemptCount = db.prepare(
      'SELECT COUNT(*) as count FROM quiz_attempts WHERE quizId = ? AND studentId = ?'
    ).get(quizId, studentId).count;

    if (attemptCount >= (quiz.maxAttempts || 3)) {
      return res.status(403).json({
        success: false,
        message: `Siz ${quiz.maxAttempts || 3} marta urinishlimitiga yetdingiz. Bu testni qayta topshirib bo'lmaydi.`
      });
    }

    const answers = Array.isArray(req.body.answers) ? req.body.answers : [];
    let earned = 0;

    for (const answer of answers) {
      if (!answer || answer.questionIndex === undefined || answer.selectedOption === undefined) continue;
      const question = quiz.questions ? quiz.questions[answer.questionIndex] : null;
      if (!question) continue;
      const correctIdx = question.options ? question.options.findIndex(opt => opt.isCorrect) : -1;
      if (correctIdx === answer.selectedOption) {
        earned += question.points || 1;
      }
    }

    const totalPoints = quiz.totalPoints || (quiz.questions ? quiz.questions.reduce((s, q) => s + (q.points || 1), 0) : 1) || 1;
    const percentage = Math.round((earned / totalPoints) * 100);
    const grade =
      percentage >= 90 ? 5 :
      percentage >= 70 ? 4 :
      percentage >= 50 ? 3 : 2;
    const passed = percentage >= (quiz.passingScore || 70);

    const nextAttempt = attemptCount + 1;
    db.prepare(`
      INSERT INTO quiz_attempts (quizId, studentId, attemptNumber, score, grade, passed)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(quizId, studentId, nextAttempt, percentage, grade, passed ? 1 : 0);

    Grade.create({
      student: studentId,
      subject: quiz.subject,
      quiz: quizId,
      type: 'quiz',
      score: percentage,
      grade,
      maxScore: 100
    });

    res.json({
      success: true,
      data: {
        score: percentage,
        grade,
        earnedPoints: earned,
        totalPoints,
        passed,
        attemptNumber: nextAttempt,
        attemptsRemaining: Math.max(0, (quiz.maxAttempts || 3) - nextAttempt)
      }
    });
  } catch (err) {
    next(err);
  }
});

router.post('/', protect, authorize('teacher', 'admin'), async (req, res, next) => {
  try {
    const quiz = Quiz.create({ ...req.body, createdBy: parseInt(req.user.id) });
    res.status(201).json({ success: true, data: quiz });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
