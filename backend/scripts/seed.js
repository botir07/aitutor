const Subject = require('../lib/Subject');
const Quiz = require('../lib/Quiz');
const User = require('../lib/User');

const SUBJECTS = [
  // Matematika va informatika
  { name: 'Matematika', nameUz: 'Matematika', icon: 'calculate', color: '#4edea3', category: 'core', difficulty: 'intermediate', descriptionUz: 'Algebra, geometriya va matematik analiz asoslari' },
  { name: 'Algebra', nameUz: 'Algebra', icon: 'functions', color: '#22c55e', category: 'core', difficulty: 'intermediate', descriptionUz: 'Algebraik ifodalar, tenglamalar va tengsizliklar' },
  { name: 'Geometriya', nameUz: 'Geometriya', icon: 'hexagon', color: '#10b981', category: 'core', difficulty: 'intermediate', descriptionUz: 'Tekis va fazoviy geometriya' },
  { name: 'Informatika', nameUz: 'Informatika va AT', icon: 'computer', color: '#06b6d4', category: 'core', difficulty: 'beginner', descriptionUz: 'Kompyuter savodxonligi va dasturlash asoslari' },

  // Tabiiy fanlar
  { name: 'Fizika', nameUz: 'Fizika', icon: 'bolt', color: '#3b82f6', category: 'core', difficulty: 'intermediate', descriptionUz: 'Mexanika, elektr va optika qonunlari' },
  { name: 'Kimyo', nameUz: 'Kimyo', icon: 'science', color: '#f59e0b', category: 'core', difficulty: 'intermediate', descriptionUz: 'Kimyoviy elementlar, birikmalar va reaktsiyalar' },
  { name: 'Biologiya', nameUz: 'Biologiya', icon: 'eco', color: '#84cc16', category: 'core', difficulty: 'beginner', descriptionUz: 'Organizmlar tuzilishi va hayotiy jarayonlar' },
  { name: 'Geografiya', nameUz: 'Geografiya', icon: 'public', color: '#14b8a6', category: 'core', difficulty: 'beginner', descriptionUz: 'Yer sharining tabiati va iqtisodiyoti' },

  // Ijtimoiy fanlar
  { name: 'Tarix', nameUz: 'Tarix', icon: 'history_edu', color: '#8b5cf6', category: 'core', difficulty: 'beginner', descriptionUz: "O'zbekiston va jahon tarixi" },
  { name: 'O\'zbekiston tarixi', nameUz: "O'zbekiston tarixi", icon: 'account_balance', color: '#a855f7', category: 'core', difficulty: 'beginner', descriptionUz: "O'zbekiston xalqi tarixi" },
  { name: 'Huquq', nameUz: 'Huquq', icon: 'gavel', color: '#6366f1', category: 'core', difficulty: 'intermediate', descriptionUz: 'Konstitutsiyaviy huquq va qonunchilik' },
  { name: 'Fuqaroshunoslik', nameUz: 'Fuqaroshunoslik', icon: 'groups', color: '#7c3aed', category: 'core', difficulty: 'intermediate', descriptionUz: 'Fuqarolik jamiyati asoslari' },

  // Til fanlari
  { name: 'O\'zbek tili', nameUz: "O'zbek tili", icon: 'translate', color: '#eab308', category: 'core', difficulty: 'beginner', descriptionUz: "O'zbek tili grammatikasi va nutq ko'nikmalari" },
  { name: 'Adabiyot', nameUz: 'Adabiyot', icon: 'menu_book', color: '#d97706', category: 'core', difficulty: 'beginner', descriptionUz: 'Badiiy asarlar va adabiy tahlil' },
  { name: 'Ingliz tili', nameUz: 'Ingliz tili', icon: 'language', color: '#f97316', category: 'core', difficulty: 'intermediate', descriptionUz: 'Ingliz tili grammatikasi va muloqot' },
  { name: 'Rus tili', nameUz: 'Rus tili', icon: 'translate', color: '#fb923c', category: 'elective', difficulty: 'intermediate', descriptionUz: 'Rus tili asoslari' },
  { name: 'Nemis tili', nameUz: 'Nemis tili', icon: 'language', color: '#fbbf24', category: 'elective', difficulty: 'intermediate', descriptionUz: 'Nemis tili asoslari' },

  // San\'at va texnologiya
  { name: 'Musiqa', nameUz: 'Musiqa', icon: 'music_note', color: '#ec4899', category: 'extra', difficulty: 'beginner', descriptionUz: 'Musiqa nazariyasi va amaliy ko\'nikmalar' },
  { name: 'Tasviriy san\'at', nameUz: 'Tasviriy san\'at', icon: 'palette', color: '#f43f5e', category: 'extra', difficulty: 'beginner', descriptionUz: 'Rasm chizish va kreativlik' },
  { name: 'Chizmachilik', nameUz: 'Chizmachilik', icon: 'architecture', color: '#64748b', category: 'elective', difficulty: 'intermediate', descriptionUz: 'Geometrik chizmalar va texnik chizish' },

  // Jismoniy tarbiya
  { name: 'Jismoniy tarbiya', nameUz: 'Jismoniy tarbiya', icon: 'sports_soccer', color: '#22c55e', category: 'core', difficulty: 'beginner', descriptionUz: 'Sport va sog\'lomlashtirish' },
  { name: 'Mehnat ta\'limi', nameUz: "Mehnat ta'limi", icon: 'construction', color: '#78716c', category: 'extra', difficulty: 'beginner', descriptionUz: 'Amaliy mehnat ko\'nikmalari' },

  // Qo\'shimcha fanlar
  { name: 'Ekologiya', nameUz: 'Ekologiya asoslari', icon: 'park', color: '#22d3ee', category: 'elective', difficulty: 'beginner', descriptionUz: 'Tabiat va atrof-muhit' },
  { name: 'Psixologiya', nameUz: 'Psixologiya asoslari', icon: 'psychology', color: '#a78bfa', category: 'elective', difficulty: 'intermediate', descriptionUz: 'Inson psixologiyasi' }
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
