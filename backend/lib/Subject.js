const { getDb } = require('../lib/database');

class Subject {
  static create(data) {
    const db = getDb();
    const stmt = db.prepare(`
      INSERT INTO subjects (name, nameUz, nameRu, description, descriptionUz, descriptionRu, icon, color, category, status, totalLessons, difficulty, prerequisites, lessons, createdBy)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      data.name, data.nameUz, data.nameRu,
      data.description, data.descriptionUz, data.descriptionRu,
      data.icon || 'school', data.color || '#4edea3',
      data.category || 'core', data.status || 'active',
      data.totalLessons || 0, data.difficulty || 'beginner',
      JSON.stringify(data.prerequisites || []),
      JSON.stringify(data.lessons || []),
      data.createdBy || null
    );
    
    return this.findById(result.lastInsertRowid);
  }
  
  static findById(id) {
    const db = getDb();
    const stmt = db.prepare('SELECT * FROM subjects WHERE id = ?');
    const subject = stmt.get(id);
    return subject ? this.formatSubject(subject) : null;
  }
  
  static findOne(query) {
    const db = getDb();
    let sql = 'SELECT * FROM subjects WHERE ';
    const params = [];
    
    if (query.name) {
      sql += 'name = ?';
      params.push(query.name);
    } else if (query.id) {
      sql += 'id = ?';
      params.push(parseInt(query.id));
    } else {
      return null;
    }
    
    const stmt = db.prepare(sql);
    const subject = stmt.get(...params);
    return subject ? this.formatSubject(subject) : null;
  }
  
  static find(query = {}) {
    const db = getDb();
    let sql = 'SELECT * FROM subjects WHERE 1=1';
    const params = [];
    
    if (query.category) {
      sql += ' AND category = ?';
      params.push(query.category);
    }
    
    if (query.status) {
      sql += ' AND status = ?';
      params.push(query.status);
    }
    
    sql += ' ORDER BY createdAt DESC';
    
    const stmt = db.prepare(sql);
    return stmt.all(...params).map(s => this.formatSubject(s));
  }
  
  static countDocuments() {
    const db = getDb();
    const stmt = db.prepare('SELECT COUNT(*) as count FROM subjects');
    return stmt.get().count;
  }
  
  static formatSubject(subject) {
    if (!subject) return null;
    return {
      _id: subject.id.toString(),
      id: subject.id,
      name: subject.name,
      nameUz: subject.nameUz,
      nameRu: subject.nameRu,
      description: subject.description,
      descriptionUz: subject.descriptionUz,
      descriptionRu: subject.descriptionRu,
      icon: subject.icon,
      color: subject.color,
      category: subject.category,
      status: subject.status,
      totalLessons: subject.totalLessons,
      difficulty: subject.difficulty,
      prerequisites: JSON.parse(subject.prerequisites || '[]'),
      lessons: JSON.parse(subject.lessons || '[]'),
      createdBy: subject.createdBy,
      createdAt: subject.createdAt,
      updatedAt: subject.updatedAt
    };
  }
}

module.exports = Subject;
