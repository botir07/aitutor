const { getDb } = require('../lib/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

class User {
  static create(data) {
    const db = getDb();
    const hashedPassword = bcrypt.hashSync(data.password, 12);
    
    const stmt = db.prepare(`
      INSERT INTO users (firstName, lastName, email, password, role, avatar, grade, studentId, phone, address, subjects, preferences, stats)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      data.firstName,
      data.lastName,
      data.email,
      hashedPassword,
      data.role || 'student',
      data.avatar || 'default-avatar.png',
      data.grade || null,
      data.studentId || null,
      data.phone || null,
      data.address || null,
      JSON.stringify(data.subjects || []),
      JSON.stringify(data.preferences || {
        theme: 'dark',
        language: 'uz',
        notifications: { schedule: true, grades: true, updates: false, homework: true }
      }),
      JSON.stringify(data.stats || { gpa: 0, quizzesCompleted: 0, totalStudyTime: 0, streak: 0, rank: 'Boshlovchi', badges: [] })
    );
    
    return this.findById(result.lastInsertRowid);
  }
  
  static findById(id) {
    const db = getDb();
    const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
    const user = stmt.get(id);
    return user ? this.formatUser(user) : null;
  }
  
  static findOne(query) {
    const db = getDb();
    let sql = 'SELECT * FROM users WHERE ';
    const params = [];
    
    if (query.email) {
      sql += 'email = ?';
      params.push(query.email);
    } else if (query.id) {
      sql += 'id = ?';
      params.push(query.id);
    } else {
      return null;
    }
    
    const stmt = db.prepare(sql);
    const user = stmt.get(...params);
    return user ? this.formatUser(user) : null;
  }
  
  static find(query = {}) {
    const db = getDb();
    let sql = 'SELECT * FROM users WHERE 1=1';
    const params = [];
    
    if (query.role) {
      sql += ' AND role = ?';
      params.push(query.role);
    }
    
    if (query.grade) {
      sql += ' AND grade = ?';
      params.push(query.grade);
    }
    
    const stmt = db.prepare(sql);
    return stmt.all(...params).map(u => this.formatUser(u));
  }
  
  static async exists(query) {
    const user = this.findOne(query);
    return !!user;
  }
  
  async save() {
    const db = getDb();
    const stmt = db.prepare(`
      UPDATE users SET 
        firstName = ?, lastName = ?, email = ?, role = ?, avatar = ?, grade = ?,
        phone = ?, address = ?, subjects = ?, preferences = ?, stats = ?,
        parentId = ?, children = ?, lastLogin = ?, isActive = ?,
        resetPasswordToken = ?, resetPasswordExpire = ?, updatedAt = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    
    stmt.run(
      this.firstName, this.lastName, this.email, this.role, this.avatar, this.grade,
      this.phone, this.address, JSON.stringify(this.subjects || []),
      JSON.stringify(this.preferences || {}), JSON.stringify(this.stats || {}),
      this.parentId, JSON.stringify(this.children || []), this.lastLogin, this.isActive ? 1 : 0,
      this.resetPasswordToken, this.resetPasswordExpire, this.id
    );
    
    return User.findById(this.id);
  }
  
  async comparePassword(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
  }
  
  getSignedJwtToken() {
    return jwt.sign(
      { id: this.id, firstName: this.firstName, lastName: this.lastName, role: this.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE }
    );
  }
  
  static formatUser(user) {
    if (!user) return null;
    const formatted = {
      _id: user.id.toString(),
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      password: user.password,
      role: user.role,
      avatar: user.avatar,
      grade: user.grade,
      studentId: user.studentId,
      phone: user.phone,
      address: user.address,
      subjects: JSON.parse(user.subjects || '[]'),
      preferences: JSON.parse(user.preferences || '{}'),
      stats: JSON.parse(user.stats || '{}'),
      parentId: user.parentId,
      children: JSON.parse(user.children || '[]'),
      lastLogin: user.lastLogin,
      isActive: !!user.isActive,
      resetPasswordToken: user.resetPasswordToken,
      resetPasswordExpire: user.resetPasswordExpire,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
    formatted.comparePassword = (pwd) => bcrypt.compareSync(pwd, formatted.password);
    formatted.getSignedJwtToken = () => jwt.sign(
      { id: formatted.id, firstName: formatted.firstName, lastName: formatted.lastName, role: formatted.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE }
    );
    formatted.save = async function() {
      const db = getDb();
      const stmt = db.prepare(`
        UPDATE users SET 
          firstName = ?, lastName = ?, email = ?, role = ?, avatar = ?, grade = ?,
          phone = ?, address = ?, subjects = ?, preferences = ?, stats = ?,
          parentId = ?, children = ?, lastLogin = ?, isActive = ?,
          resetPasswordToken = ?, resetPasswordExpire = ?, updatedAt = CURRENT_TIMESTAMP
        WHERE id = ?
      `);
      stmt.run(
        this.firstName, this.lastName, this.email, this.role, this.avatar, this.grade,
        this.phone, this.address, JSON.stringify(this.subjects || []),
        JSON.stringify(this.preferences || {}), JSON.stringify(this.stats || {}),
        this.parentId, JSON.stringify(this.children || []), this.lastLogin, this.isActive ? 1 : 0,
        this.resetPasswordToken, this.resetPasswordExpire, this.id
      );
      return User.findById(this.id);
    };
    return formatted;
  }
}

module.exports = User;
