const { getDb } = require('../lib/database');

class Quiz {
  static create(data) {
    const db = getDb();
    const totalPoints = (data.questions || []).reduce((sum, q) => sum + (q.points || 1), 0);
    
    const stmt = db.prepare(`
      INSERT INTO quizzes (title, description, subject, questions, timeLimit, passingScore, maxAttempts, difficulty, isActive, totalPoints, createdBy)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      data.title, data.description,
      data.subject, JSON.stringify(data.questions || []),
      data.timeLimit || 30, data.passingScore || 70,
      data.maxAttempts || 3, data.difficulty || 'medium',
      data.isActive !== false ? 1 : 0, totalPoints,
      data.createdBy || null
    );
    
    return this.findById(result.lastInsertRowid);
  }
  
  static findById(id) {
    const db = getDb();
    const stmt = db.prepare('SELECT * FROM quizzes WHERE id = ?');
    const quiz = stmt.get(id);
    return quiz ? this.formatQuiz(quiz) : null;
  }
  
  static findOne(query) {
    const db = getDb();
    let sql = 'SELECT * FROM quizzes WHERE ';
    const params = [];
    
    if (query.id) {
      sql += 'id = ?';
      params.push(parseInt(query.id));
    } else if (query._id) {
      sql += 'id = ?';
      params.push(parseInt(query._id));
    } else {
      return null;
    }
    
    const stmt = db.prepare(sql);
    const quiz = stmt.get(...params);
    return quiz ? this.formatQuiz(quiz) : null;
  }
  
  static find(query = {}) {
    const db = getDb();
    let sql = 'SELECT * FROM quizzes WHERE 1=1';
    const params = [];
    
    if (query.subject) {
      sql += ' AND subject = ?';
      params.push(parseInt(query.subject));
    }
    
    if (query.difficulty) {
      sql += ' AND difficulty = ?';
      params.push(query.difficulty);
    }
    
    if (query.isActive !== undefined) {
      sql += ' AND isActive = ?';
      params.push(query.isActive ? 1 : 0);
    }
    
    sql += ' ORDER BY createdAt DESC';
    
    const stmt = db.prepare(sql);
    return stmt.all(...params).map(q => this.formatQuiz(q));
  }
  
  static countDocuments() {
    const db = getDb();
    const stmt = db.prepare('SELECT COUNT(*) as count FROM quizzes');
    return stmt.get().count;
  }
  
  static formatQuiz(quiz) {
    if (!quiz) return null;
    return {
      _id: quiz.id.toString(),
      id: quiz.id,
      title: quiz.title,
      description: quiz.description,
      subject: quiz.subject,
      questions: JSON.parse(quiz.questions || '[]'),
      timeLimit: quiz.timeLimit,
      passingScore: quiz.passingScore,
      maxAttempts: quiz.maxAttempts,
      difficulty: quiz.difficulty,
      isActive: !!quiz.isActive,
      totalPoints: quiz.totalPoints,
      createdBy: quiz.createdBy,
      createdAt: quiz.createdAt,
      updatedAt: quiz.updatedAt
    };
  }
}

module.exports = Quiz;
