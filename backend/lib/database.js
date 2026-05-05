const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../data/maktab_ai.db');

let db = null;

function getDb() {
  if (!db) {
    const fs = require('fs');
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    
    initializeTables();
  }
  return db;
}

function initializeTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      firstName TEXT NOT NULL,
      lastName TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'student',
      avatar TEXT DEFAULT 'default-avatar.png',
      grade TEXT,
      studentId TEXT,
      phone TEXT,
      address TEXT,
      preferences TEXT DEFAULT '{}',
      stats TEXT DEFAULT '{}',
      subjects TEXT DEFAULT '[]',
      parentId INTEGER,
      children TEXT DEFAULT '[]',
      lastLogin TEXT,
      isActive INTEGER DEFAULT 1,
      resetPasswordToken TEXT,
      resetPasswordExpire TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (parentId) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS subjects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      nameUz TEXT,
      nameRu TEXT,
      description TEXT,
      descriptionUz TEXT,
      descriptionRu TEXT,
      icon TEXT DEFAULT 'school',
      color TEXT DEFAULT '#4edea3',
      category TEXT DEFAULT 'core',
      status TEXT DEFAULT 'active',
      totalLessons INTEGER DEFAULT 0,
      difficulty TEXT DEFAULT 'beginner',
      prerequisites TEXT DEFAULT '[]',
      lessons TEXT DEFAULT '[]',
      createdBy INTEGER,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (createdBy) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS quizzes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      subject INTEGER NOT NULL,
      questions TEXT DEFAULT '[]',
      timeLimit INTEGER DEFAULT 30,
      passingScore INTEGER DEFAULT 70,
      maxAttempts INTEGER DEFAULT 3,
      difficulty TEXT DEFAULT 'medium',
      isActive INTEGER DEFAULT 1,
      totalPoints INTEGER DEFAULT 0,
      createdBy INTEGER,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (subject) REFERENCES subjects(id),
      FOREIGN KEY (createdBy) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS grades (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student INTEGER NOT NULL,
      teacher INTEGER,
      subject INTEGER NOT NULL,
      quiz INTEGER,
      type TEXT DEFAULT 'quiz',
      score REAL NOT NULL,
      grade REAL NOT NULL,
      maxScore REAL DEFAULT 100,
      feedback TEXT,
      comment TEXT,
      gradedBy INTEGER,
      date TEXT DEFAULT CURRENT_TIMESTAMP,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student) REFERENCES users(id),
      FOREIGN KEY (teacher) REFERENCES users(id),
      FOREIGN KEY (subject) REFERENCES subjects(id),
      FOREIGN KEY (quiz) REFERENCES quizzes(id)
    );

    CREATE TABLE IF NOT EXISTS assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      subject INTEGER NOT NULL,
      teacher INTEGER NOT NULL,
      dueDate TEXT NOT NULL,
      maxScore INTEGER DEFAULT 100,
      submissions TEXT DEFAULT '[]',
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (subject) REFERENCES subjects(id),
      FOREIGN KEY (teacher) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender INTEGER NOT NULL,
      receiver INTEGER,
      roomCode TEXT,
      content TEXT NOT NULL,
      type TEXT DEFAULT 'text',
      isRead INTEGER DEFAULT 0,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sender) REFERENCES users(id)
    );

    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
    CREATE INDEX IF NOT EXISTS idx_subjects_name ON subjects(name);
    CREATE INDEX IF NOT EXISTS idx_quizzes_subject ON quizzes(subject);
    CREATE INDEX IF NOT EXISTS idx_grades_student ON grades(student);
    CREATE INDEX IF NOT EXISTS idx_grades_subject ON grades(subject);

    CREATE TABLE IF NOT EXISTS rooms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      teacherId INTEGER,
      teacherName TEXT,
      maxPlayers INTEGER DEFAULT 20,
      isActive INTEGER DEFAULT 1,
      subject TEXT DEFAULT '',
      description TEXT DEFAULT '',
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (teacherId) REFERENCES users(id)
    );

    CREATE INDEX IF NOT EXISTS idx_rooms_code ON rooms(code);
    CREATE INDEX IF NOT EXISTS idx_rooms_teacherId ON rooms(teacherId);

    CREATE TABLE IF NOT EXISTS quiz_attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      quizId INTEGER NOT NULL,
      studentId INTEGER NOT NULL,
      attemptNumber INTEGER NOT NULL DEFAULT 1,
      score REAL,
      grade REAL,
      passed INTEGER,
      completedAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (quizId) REFERENCES quizzes(id),
      FOREIGN KEY (studentId) REFERENCES users(id),
      UNIQUE(quizId, studentId, attemptNumber)
    );

    CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz ON quiz_attempts(quizId);
    CREATE INDEX IF NOT EXISTS idx_quiz_attempts_student ON quiz_attempts(studentId);

    CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      studentId INTEGER NOT NULL,
      date TEXT NOT NULL,
      status TEXT DEFAULT 'present',
      teacherId INTEGER,
      notes TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (studentId) REFERENCES users(id),
      FOREIGN KEY (teacherId) REFERENCES users(id),
      UNIQUE(studentId, date)
    );

    CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance(studentId);
    CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
  `);
}

function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}

module.exports = { getDb, closeDb, DB_PATH };
