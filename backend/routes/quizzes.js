const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Quiz = require('../models/Quiz');
const Grade = require('../models/Grade');
const { protect, authorize } = require('../middleware/auth');
const requireDb = require('../middleware/requireDb');

router.use(requireDb);

// Barcha testlar — savol javobsiz (frontendga to'g'ri javoblarni yubormaymiz)
router.get('/', protect, async (req, res, next) => {
  try {
    const quizzes = await Quiz.find({ isActive: true })
      .populate('subject', 'name nameUz icon color')
      .select('-questions.options.isCorrect -questions.explanation')
      .sort('-createdAt');

    res.json({
      success: true,
      count: quizzes.length,
      data: quizzes
    });
  } catch (err) {
    next(err);
  }
});

// Bitta test — savollarni ham yuboradi, lekin to'g'ri javoblar olib tashlanadi
router.get('/:id', protect, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Test ID noto\'g\'ri' });
    }

    const quiz = await Quiz.findById(req.params.id)
      .populate('subject', 'name nameUz icon color')
      .lean();

    if (!quiz || !quiz.isActive) {
      return res.status(404).json({ success: false, message: 'Test topilmadi' });
    }

    quiz.questions = quiz.questions.map(q => ({
      _id: q._id,
      text: q.text,
      points: q.points,
      difficulty: q.difficulty,
      options: q.options.map(opt => ({ _id: opt._id, text: opt.text }))
    }));

    res.json({ success: true, data: quiz });
  } catch (err) {
    next(err);
  }
});

// Test topshirish
router.post('/:id/submit', protect, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Test ID noto\'g\'ri' });
    }

    const quiz = await Quiz.findById(req.params.id);
    if (!quiz || !quiz.isActive) {
      return res.status(404).json({ success: false, message: 'Test topilmadi' });
    }

    const answers = Array.isArray(req.body.answers) ? req.body.answers : [];
    let earned = 0;

    for (const answer of answers) {
      if (!answer || !answer.questionId || !answer.selectedOption) continue;
      const question = quiz.questions.id(answer.questionId);
      if (!question) continue;
      const correct = question.options.find(opt => opt.isCorrect);
      if (correct && correct._id.toString() === answer.selectedOption.toString()) {
        earned += question.points;
      }
    }

    const totalPoints = quiz.totalPoints || quiz.questions.reduce((s, q) => s + q.points, 0) || 1;
    const percentage = Math.round((earned / totalPoints) * 100);
    const grade =
      percentage >= 90 ? 5 :
      percentage >= 70 ? 4 :
      percentage >= 50 ? 3 : 2;

    await Grade.create({
      student: req.user.id,
      subject: quiz.subject,
      quiz: quiz._id,
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
        passed: percentage >= (quiz.passingScore || 70)
      }
    });
  } catch (err) {
    next(err);
  }
});

// Yangi test (teacher/admin)
router.post('/', protect, authorize('teacher', 'admin'), async (req, res, next) => {
  try {
    const quiz = await Quiz.create({ ...req.body, createdBy: req.user.id });
    res.status(201).json({ success: true, data: quiz });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
