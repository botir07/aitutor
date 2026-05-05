const { getDb } = require('../lib/database');

class Grade {
  static create(data) {
    const db = getDb();
    const stmt = db.prepare(`
      INSERT INTO grades (student, teacher, subject, quiz, type, score, grade, maxScore, feedback, comment, gradedBy, date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      data.student, data.teacher || null, data.subject,
      data.quiz || null, data.type || 'quiz',
      data.score, data.grade, data.maxScore || 100,
      data.feedback || null, data.comment || null,
      data.gradedBy || null, data.date || new Date().toISOString()
    );
    
    return this.findById(result.lastInsertRowid);
  }
  
  static findById(id) {
    const db = getDb();
    const stmt = db.prepare('SELECT * FROM grades WHERE id = ?');
    const grade = stmt.get(id);
    return grade ? this.formatGrade(grade) : null;
  }
  
  static find(query = {}) {
    const db = getDb();
    let sql = 'SELECT * FROM grades WHERE 1=1';
    const params = [];
    
    if (query.student) {
      sql += ' AND student = ?';
      params.push(parseInt(query.student));
    }
    
    if (query.subject) {
      sql += ' AND subject = ?';
      params.push(parseInt(query.subject));
    }
    
    if (query.type) {
      sql += ' AND type = ?';
      params.push(query.type);
    }
    
    sql += ' ORDER BY date DESC';
    
    const stmt = db.prepare(sql);
    return stmt.all(...params).map(g => this.formatGrade(g));
  }
  
  static formatGrade(grade) {
    if (!grade) return null;
    return {
      _id: grade.id.toString(),
      id: grade.id,
      student: grade.student,
      teacher: grade.teacher,
      subject: grade.subject,
      quiz: grade.quiz,
      type: grade.type,
      score: grade.score,
      grade: grade.grade,
      maxScore: grade.maxScore,
      feedback: grade.feedback,
      comment: grade.comment,
      gradedBy: grade.gradedBy,
      date: grade.date,
      createdAt: grade.createdAt,
      updatedAt: grade.updatedAt
    };
  }
}

module.exports = Grade;
