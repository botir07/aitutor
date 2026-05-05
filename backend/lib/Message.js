const { getDb } = require('../lib/database');

class Message {
  static create(data) {
    const db = getDb();
    const stmt = db.prepare(`
      INSERT INTO messages (sender, receiver, roomCode, content, type, isRead)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      data.sender, data.receiver || null, data.roomCode || null,
      data.content, data.type || 'text', data.isRead ? 1 : 0
    );
    
    return this.findById(result.lastInsertRowid);
  }
  
  static findById(id) {
    const db = getDb();
    const stmt = db.prepare('SELECT * FROM messages WHERE id = ?');
    const msg = stmt.get(id);
    return msg ? this.formatMessage(msg) : null;
  }
  
  static find(query = {}) {
    const db = getDb();
    let sql = 'SELECT * FROM messages WHERE 1=1';
    const params = [];
    
    if (query.sender) {
      sql += ' AND sender = ?';
      params.push(parseInt(query.sender));
    }
    
    if (query.receiver) {
      sql += ' AND receiver = ?';
      params.push(parseInt(query.receiver));
    }
    
    if (query.type) {
      sql += ' AND type = ?';
      params.push(query.type);
    }
    
    if (query.roomCode) {
      sql += ' AND roomCode = ?';
      params.push(query.roomCode);
    }
    
    sql += ' ORDER BY createdAt ASC';
    
    if (query.limit) {
      sql += ` LIMIT ${parseInt(query.limit)}`;
    }
    
    const stmt = db.prepare(sql);
    return stmt.all(...params).map(m => this.formatMessage(m));
  }
  
  static findWithOr(conditions) {
    const db = getDb();
    let sql = 'SELECT * FROM messages WHERE 1=0';
    const params = [];
    
    for (const cond of conditions) {
      if (cond.sender && cond.receiver) {
        sql += ' OR (sender = ? AND receiver = ?)';
        params.push(parseInt(cond.sender), parseInt(cond.receiver));
      } else if (cond.type) {
        sql += ' OR type = ?';
        params.push(cond.type);
      }
    }
    
    sql += ' ORDER BY createdAt ASC LIMIT 100';
    
    const stmt = db.prepare(sql);
    return stmt.all(...params).map(m => this.formatMessage(m));
  }
  
  static formatMessage(msg) {
    if (!msg) return null;
    return {
      _id: msg.id.toString(),
      id: msg.id,
      sender: msg.sender,
      receiver: msg.receiver,
      roomCode: msg.roomCode,
      content: msg.content,
      type: msg.type,
      isRead: !!msg.isRead,
      createdAt: msg.createdAt
    };
  }
}

module.exports = Message;
