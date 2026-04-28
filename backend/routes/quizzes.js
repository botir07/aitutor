const express = require('express');
const router = express.Router();
const Quiz = require('../models/Quiz');
const Grade = require('../models/Grade');
const { protect } = require('../middleware/auth');

// Testlarni olish
router.get('/', protect, async (req, res) => {
  try {
    const quizzes = await Quiz.find({ isActive: true })
      .populate('subject', 'name nameUz')
      .sort('-createdAt');
    
    res.json({
      success: true,
      count: quizzes.length,
      data: quizzes
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Test topshirish
router.post('/:id/submit', protect, async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    
    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: 'Test topilmadi'
      });
    }
    
    const { answers } = req.body; // [{questionId, selectedOption}]
    let score = 0;
    
    answers.forEach(answer => {
      const question = quiz.questions.id(answer.questionId);
      if (question) {
        const correctOption = question.options.find(opt => opt.isCorrect);
        if (correctOption && correctOption._id.toString() === answer.selectedOption) {
          score += question.points;
        }
      }
    });
    
    const percentage = (score / quiz.totalPoints) * 100;
    const grade = percentage >= 90 ? 5 :
                  percentage >= 70 ? 4 :
                  percentage >= 50 ? 3 : 2;
    
    // Bahoni saqlash
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
        totalPoints: quiz.totalPoints,
        earnedPoints: score
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
