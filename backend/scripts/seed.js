const Subject = require('../lib/Subject');
const Quiz = require('../lib/Quiz');
const User = require('../lib/User');

const SUBJECTS = [
  { name: 'Matematika', nameUz: 'Matematika', icon: '📐', color: '#4edea3', category: 'core', difficulty: 'intermediate' },
  { name: 'Fizika',     nameUz: 'Fizika',     icon: '⚡', color: '#adc6ff', category: 'core', difficulty: 'intermediate' },
  { name: 'Biologiya',  nameUz: 'Biologiya',  icon: '🧬', color: '#ffb95f', category: 'core', difficulty: 'beginner' },
  { name: 'Kimyo',      nameUz: 'Kimyo',      icon: '⚗️', color: '#10b981', category: 'core', difficulty: 'intermediate' },
  { name: 'Tarix',      nameUz: 'Tarix',      icon: '📚', color: '#adc6ff', category: 'core', difficulty: 'beginner' }
];

async function ensureSeedData() {
  const subjectCount = Subject.countDocuments();
  let subjects = [];

  if (subjectCount === 0) {
    for (const sub of SUBJECTS) {
      subjects.push(Subject.create(sub));
    }
    console.log(`🌱 Seed: ${subjects.length} ta fan qo'shildi`);
  } else {
    subjects = Subject.find();
  }

  const quizCount = Quiz.countDocuments();
  if (quizCount === 0 && subjects.length > 0) {
    const math = subjects.find(s => s.name === 'Matematika');
    const physics = subjects.find(s => s.name === 'Fizika');
    const biology = subjects.find(s => s.name === 'Biologiya');

    const quizzes = [];
    if (math) quizzes.push({
      title: 'Kvadrat tenglamalar',
      description: 'Asosiy kvadrat tenglamalarni yechish',
      subject: math.id,
      timeLimit: 20,
      difficulty: 'easy',
      questions: [
        {
          text: 'x² - 5x + 6 = 0 tenglamaning ildizlari?',
          points: 1,
          options: [
            { text: 'x = 1, x = 6', isCorrect: false },
            { text: 'x = 2, x = 3', isCorrect: true },
            { text: 'x = -2, x = -3', isCorrect: false },
            { text: 'x = 0, x = 5', isCorrect: false }
          ]
        },
        {
          text: 'Diskriminant formulasi qaysi?',
          points: 1,
          options: [
            { text: 'D = b² - 4ac', isCorrect: true },
            { text: 'D = a² + b² + c²', isCorrect: false },
            { text: 'D = 2a + b', isCorrect: false },
            { text: 'D = b² + 4ac', isCorrect: false }
          ]
        }
      ]
    });

    if (physics) quizzes.push({
      title: 'Nyuton qonunlari',
      description: 'Klassik mexanika asoslari',
      subject: physics.id,
      timeLimit: 25,
      difficulty: 'medium',
      questions: [
        {
          text: 'F = ma — bu Nyutonning nechanchi qonuni?',
          points: 1,
          options: [
            { text: 'Birinchi', isCorrect: false },
            { text: 'Ikkinchi', isCorrect: true },
            { text: 'Uchinchi', isCorrect: false },
            { text: 'Hech qaysi', isCorrect: false }
          ]
        }
      ]
    });

    if (biology) quizzes.push({
      title: 'Hujayra tuzilishi',
      description: "Hayvon va o'simlik hujayralari",
      subject: biology.id,
      timeLimit: 20,
      difficulty: 'easy',
      questions: [
        {
          text: "Hujayraning energiya stansiyasi nima?",
          points: 1,
          options: [
            { text: 'Ribosoma', isCorrect: false },
            { text: 'Yadro', isCorrect: false },
            { text: 'Mitoxondriya', isCorrect: true },
            { text: 'Lizosoma', isCorrect: false }
          ]
        }
      ]
    });

    if (quizzes.length > 0) {
      for (const q of quizzes) {
        Quiz.create(q);
      }
      console.log(`🌱 Seed: ${quizzes.length} ta test qo'shildi`);
    }
  }

  if (!(await User.exists({ email: 'demo@maktab.uz' }))) {
    User.create({
      firstName: 'Demo',
      lastName: "O'quvchi",
      email: 'demo@maktab.uz',
      password: 'demo1234',
      role: 'student',
      grade: '10-A'
    });
    console.log("🌱 Seed: Demo o'quvchi (demo@maktab.uz / demo1234)");
  }

  if (!(await User.exists({ email: 'teacher@maktab.uz' }))) {
    User.create({
      firstName: 'Demo',
      lastName: "O'qituvchi",
      email: 'teacher@maktab.uz',
      password: 'teacher123',
      role: 'teacher'
    });
    console.log("🌱 Seed: Demo o'qituvchi (teacher@maktab.uz / teacher123)");
  }
}

module.exports = { ensureSeedData };
