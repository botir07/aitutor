const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const os = require('os');
const http = require('http');
const { Server } = require('socket.io');

const { getDb, closeDb } = require('./lib/database');
const errorHandler = require('./middleware/errorHandler');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const subjectRoutes = require('./routes/subjects');
const quizRoutes = require('./routes/quizzes');
const gradeRoutes = require('./routes/grades');
const chatRoutes = require('./routes/chat');
const assignmentRoutes = require('./routes/assignments');
const teacherRoutes = require('./routes/teacher');
const roomRoutes = require('./routes/rooms');

const app = express();

const corsOrigin = process.env.CORS_ORIGIN === '*' || !process.env.CORS_ORIGIN
  ? '*'
  : process.env.CORS_ORIGIN.split(',').map(s => s.trim());

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  originAgentCluster: false
}));

app.use((req, res, next) => {
  res.setHeader('Origin-Agent-Cluster', '?0');
  res.setHeader('Cross-Origin-Opener-Policy', 'unsafe-none');
  next();
});
app.use(cors({ origin: corsOrigin }));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Juda ko\'p urinish. 15 daqiqadan keyin qayta urinib ko\'ring.' }
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api/', apiLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

app.get('/api/health', (req, res) => {
  let dbStatus = 'disconnected';
  try {
    const db = getDb();
    db.prepare('SELECT 1').get();
    dbStatus = 'connected';
  } catch (e) {
    dbStatus = 'error: ' + e.message;
  }
  res.json({
    status: 'OK',
    time: new Date(),
    db: dbStatus,
    env: process.env.NODE_ENV || 'development'
  });
});

app.use((req, res, next) => {
  if (req.method === 'POST' && ['/send-otp', '/verify-otp'].includes(req.path)) {
    return authRoutes(req, res, next);
  }
  return next();
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/grades', gradeRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/rooms', roomRoutes);

app.use(express.static(path.join(__dirname, '../frontend')));

app.get('/demo', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/demo.html'));
});

app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Endpoint topilmadi' });
});

app.use(errorHandler);

const PORT = parseInt(process.env.PORT, 10) || 5000;
const HOST = process.env.HOST || '0.0.0.0';

async function start() {
  if (process.env.NODE_ENV === 'production') {
    const secret = process.env.JWT_SECRET;
    const unsafe = !secret ||
      secret === 'your_super_secret_jwt_key_here' ||
      secret === 'change_me_to_a_long_random_string_in_production_please_seriously';
    if (unsafe) {
      console.error('FATAL: production uchun JWT_SECRET ni .env da uzun, tasodifiy qiymatga almashtiring.');
      process.exit(1);
    }
  }

  try {
    getDb();
    console.log('✅ SQLite database ulandi');
  } catch (err) {
    console.error('❌ Database xatosi:', err.message);
    process.exit(1);
  }

  try {
    const seed = require('./scripts/seed');
    await seed.ensureSeedData();
  } catch (err) {
    console.warn('⚠️  Seed skripti ishlamadi:', err.message);
  }

  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      origin: corsOrigin === '*' ? '*' : corsOrigin,
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  const rooms = new Map();
  const playerRooms = new Map();

  io.on('connection', (socket) => {
    let currentUser = null;
    let currentRoom = null;

    socket.on('authenticate', (data) => {
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(data.token, process.env.JWT_SECRET || 'fallback_secret');
        currentUser = {
          id: decoded.id,
          firstName: decoded.firstName,
          lastName: decoded.lastName,
          role: decoded.role,
          avatar: data.avatar || '👤'
        };
        socket.emit('authenticated', { success: true, user: currentUser });
      } catch (err) {
        socket.emit('authenticated', { success: false, error: 'Invalid token' });
      }
    });

    socket.on('join-room', (data) => {
      if (!currentUser) {
        socket.emit('error', { message: 'Avval tizimga kiring' });
        return;
      }

      const { code } = data;
      if (currentRoom) {
        socket.leave(currentRoom);
        const roomData = rooms.get(currentRoom);
        if (roomData) {
          roomData.players = roomData.players.filter(p => p.id !== currentUser.id);
          io.to(currentRoom).emit('player-left', { playerId: currentUser.id });
        }
      }

      if (!rooms.has(code)) {
        rooms.set(code, {
          code,
          players: [],
          teacherId: null,
          teacherName: '',
          chatHistory: []
        });
      }

      const room = rooms.get(code);
      const existingPlayer = room.players.find(p => p.id === currentUser.id);
      if (!existingPlayer) {
        room.players.push({
          id: currentUser.id,
          name: `${currentUser.firstName} ${currentUser.lastName}`,
          avatar: currentUser.avatar,
          position: { x: Math.random() * 40 - 20, z: Math.random() * 40 - 20 },
          role: currentUser.role
        });
      }

      currentRoom = code;
      playerRooms.set(socket.id, code);
      socket.join(code);

      socket.emit('room-joined', {
        room: {
          code: room.code,
          players: room.players,
          teacherName: room.teacherName,
          chatHistory: room.chatHistory
        },
        user: currentUser
      });

      socket.to(code).emit('player-joined', {
        player: room.players.find(p => p.id === currentUser.id)
      });

      if (currentUser.role === 'teacher' || currentUser.role === 'admin') {
        room.teacherId = currentUser.id;
        room.teacherName = `${currentUser.firstName} ${currentUser.lastName}`;
        io.to(code).emit('teacher-updated', { teacherName: room.teacherName });
      }
    });

    socket.on('leave-room', () => {
      if (!currentRoom || !currentUser) return;

      const room = rooms.get(currentRoom);
      if (room) {
        room.players = room.players.filter(p => p.id !== currentUser.id);
        socket.to(currentRoom).emit('player-left', { playerId: currentUser.id });
      }

      socket.leave(currentRoom);
      currentRoom = null;
      playerRooms.delete(socket.id);
      socket.emit('room-left');
    });

    socket.on('player-move', (data) => {
      if (!currentRoom || !currentUser) return;

      const room = rooms.get(currentRoom);
      if (!room) return;

      const player = room.players.find(p => p.id === currentUser.id);
      if (player && data.position) {
        player.position = {
          x: Math.max(-100, Math.min(100, data.position.x)),
          z: Math.max(-100, Math.min(100, data.position.z))
        };
      }

      socket.to(currentRoom).emit('player-moved', {
        playerId: currentUser.id,
        position: player?.position
      });
    });

    socket.on('chat-message', (data) => {
      if (!currentRoom || !currentUser) return;

      const room = rooms.get(currentRoom);
      if (!room) return;

      const message = {
        id: Date.now().toString(),
        senderId: currentUser.id,
        senderName: `${currentUser.firstName} ${currentUser.lastName}`,
        senderAvatar: currentUser.avatar,
        content: (data.content || '').slice(0, 500),
        timestamp: new Date().toISOString()
      };

      room.chatHistory.push(message);
      if (room.chatHistory.length > 100) {
        room.chatHistory = room.chatHistory.slice(-100);
      }

      io.to(currentRoom).emit('chat-message', message);
    });

    socket.on('disconnect', () => {
      if (currentRoom && currentUser) {
        const room = rooms.get(currentRoom);
        if (room) {
          room.players = room.players.filter(p => p.id !== currentUser.id);
          io.to(currentRoom).emit('player-left', { playerId: currentUser.id });
        }
      }
      playerRooms.delete(socket.id);
    });
  });

  server.listen(PORT, HOST, () => {
    console.log('\n=========================================');
    console.log('  ✅ MAKTAB AI ISHLAMOQDA');
    console.log('=========================================');

    const nets = os.networkInterfaces();
    const ips = [];
    for (const name of Object.keys(nets)) {
      for (const net of nets[name]) {
        if (net.family === 'IPv4' && !net.internal) ips.push(net.address);
      }
    }

    if (ips.length > 0) {
      console.log('  📱 Telefon/Planshet uchun:');
      ips.forEach(ip => console.log(`     http://${ip}:${PORT}`));
    }
    console.log(`  💻 Kompyuter:  http://localhost:${PORT}`);
    console.log(`  🔧 Health:     http://localhost:${PORT}/api/health`);
    console.log('=========================================\n');
  });

  const shutdown = async (signal) => {
    console.log(`\n${signal} qabul qilindi, yopilmoqda...`);
    io.close();
    server.close(async () => {
      closeDb();
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

start();
