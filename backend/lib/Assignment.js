const { getDb } = require('../lib/database');

class Assignment {
  static create(data) {
    const db = getDb();
    const stmt = db.prepare(`
      INSERT INTO assignments (title, description, subject, teacher, dueDate, maxScore, submissions)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      data.title, data.description,
      data.subject, data.teacher,
      data.dueDate, data.maxScore || 100,
      JSON.stringify(data.submissions || [])
    );
    
    return this.findById(result.lastInsertRowid);
  }
  
  static findById(id) {
    const db = getDb();
    const stmt = db.prepare('SELECT * FROM assignments WHERE id = ?');
    const assignment = stmt.get(id);
    return assignment ? this.formatAssignment(assignment) : null;
  }
  
  static find(query = {}) {
    const db = getDb();
    let sql = 'SELECT * FROM assignments WHERE 1=1';
    const params = [];
    
    if (query.subject) {
      sql += ' AND subject = ?';
      params.push(parseInt(query.subject));
    }
    
    if (query.teacher) {
      sql += ' AND teacher = ?';
      params.push(parseInt(query.teacher));
    }
    
    sql += ' ORDER BY dueDate ASC';
    
    const stmt = db.prepare(sql);
    return stmt.all(...params).map(a => this.formatAssignment(a));
  }
  
  static formatAssignment(assignment) {
    if (!assignment) return null;
    return {
      _id: assignment.id.toString(),
      id: assignment.id,
      title: assignment.title,
      description: assignment.description,
      subject: assignment.subject,
      teacher: assignment.teacher,
      dueDate: assignment.dueDate,
      maxScore: assignment.maxScore,
      submissions: JSON.parse(assignment.submissions || '[]'),
      createdAt: assignment.createdAt,
      updatedAt: assignment.updatedAt
    };
  }
}

module.exports = Assignment;
