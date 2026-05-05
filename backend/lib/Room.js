const { getDb } = require('../lib/database');

class Room {
  static create(data) {
    const db = getDb();
    const stmt = db.prepare(`
      INSERT INTO rooms (name, code, teacherId, teacherName, maxPlayers, isActive, subject, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      data.name, data.code, data.teacherId, data.teacherName,
      data.maxPlayers || 20, data.isActive !== false ? 1 : 0,
      data.subject || '', data.description || ''
    );
    
    return this.findById(result.lastInsertRowid);
  }
  
  static findById(id) {
    const db = getDb();
    const stmt = db.prepare('SELECT * FROM rooms WHERE id = ?');
    const room = stmt.get(id);
    return room ? this.formatRoom(room) : null;
  }
  
  static findOne(query) {
    const db = getDb();
    let sql = 'SELECT * FROM rooms WHERE ';
    const params = [];
    
    if (query.code) {
      sql += 'code = ?';
      params.push(query.code);
    } else if (query.id) {
      sql += 'id = ?';
      params.push(parseInt(query.id));
    } else {
      return null;
    }
    
    const stmt = db.prepare(sql);
    const room = stmt.get(...params);
    return room ? this.formatRoom(room) : null;
  }
  
  static find(query = {}) {
    const db = getDb();
    let sql = 'SELECT * FROM rooms WHERE 1=1';
    const params = [];
    
    if (query.isActive !== undefined) {
      sql += ' AND isActive = ?';
      params.push(query.isActive ? 1 : 0);
    }
    
    if (query.teacherId) {
      sql += ' AND teacherId = ?';
      params.push(parseInt(query.teacherId));
    }
    
    sql += ' ORDER BY createdAt DESC';
    
    if (query.limit) {
      sql += ` LIMIT ${parseInt(query.limit)}`;
    }
    
    const stmt = db.prepare(sql);
    return stmt.all(...params).map(r => this.formatRoom(r));
  }
  
  static update(code, data) {
    const db = getDb();
    const updates = [];
    const values = [];
    
    if (data.name !== undefined) { updates.push('name = ?'); values.push(data.name); }
    if (data.isActive !== undefined) { updates.push('isActive = ?'); values.push(data.isActive ? 1 : 0); }
    if (data.maxPlayers !== undefined) { updates.push('maxPlayers = ?'); values.push(data.maxPlayers); }
    if (data.subject !== undefined) { updates.push('subject = ?'); values.push(data.subject); }
    if (data.description !== undefined) { updates.push('description = ?'); values.push(data.description); }
    
    if (updates.length > 0) {
      values.push(code);
      db.prepare(`UPDATE rooms SET ${updates.join(', ')}, updatedAt = CURRENT_TIMESTAMP WHERE code = ?`).run(...values);
    }
    
    return this.findOne({ code });
  }
  
  static delete(code) {
    const db = getDb();
    db.prepare('DELETE FROM rooms WHERE code = ?').run(code);
  }
  
  static formatRoom(room) {
    if (!room) return null;
    return {
      _id: room.id.toString(),
      id: room.id,
      name: room.name,
      code: room.code,
      teacherId: room.teacherId,
      teacherName: room.teacherName,
      maxPlayers: room.maxPlayers,
      isActive: !!room.isActive,
      subject: room.subject,
      description: room.description,
      createdAt: room.createdAt,
      updatedAt: room.updatedAt
    };
  }
}

module.exports = Room;
