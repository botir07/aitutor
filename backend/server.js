require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const path = require('path');
const os = require('os');

const errorHandler = require('./middleware/errorHandler');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const subjectRoutes = require('./routes/subjects');
const quizRoutes = require('./routes/quizzes');
const gradeRoutes = require('./routes/grades');
const chatRoutes = require('./routes/chat');
const assignmentRoutes = require('./routes/assignments');
const teacherRoutes = require('./routes/teacher');

const app = express();

const corsOrigin = process.env.CORS_ORIGIN === '*' || !process.env.CORS_ORIGIN
  ? '*'
  : process.env.CORS_ORIGIN.split(',').map(s => s.trim());

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));
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
  res.json({
    status: 'OK',
    time: new Date(),
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/grades', gradeRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/teacher', teacherRoutes);

app.use(express.static(path.join(__dirname, '../frontend')));

app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Endpoint topilmadi' });
});

app.use(errorHandler);

const PORT = parseInt(process.env.PORT, 10) || 5000;
const HOST = process.env.HOST || '0.0.0.0';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/maktab_ai';
const USE_MEMORY_DB = String(process.env.USE_MEMORY_DB || '').toLowerCase() === 'true';

let memoryServer = null;

async function connectDb() {
  if (USE_MEMORY_DB) {
    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      memoryServer = await MongoMemoryServer.create();
      const uri = memoryServer.getUri();
      await mongoose.connect(uri);
      console.log('✅ In-memory MongoDB ulandi:', uri);
      console.log('   ⚠️  Ma\'lumotlar server qayta ishga tushganda yo\'qoladi (faqat dev uchun)');
      return true;
    } catch (err) {
      console.error('❌ In-memory MongoDB ishga tushmadi:', err.message);
      return false;
    }
  }

  try {
    await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
    console.log('✅ MongoDB ulandi:', MONGODB_URI);
    return true;
  } catch (err) {
    console.error('❌ MongoDB ulanmadi:', err.message);
    console.error('   Yechim variantlari:');
    console.error('   1) MongoDB-ni o\'rnating: https://www.mongodb.com/try/download/community');
    console.error('   2) Yoki .env da USE_MEMORY_DB=true qo\'ying (in-memory test rejimi)');
    console.error('   Server ishga tushadi, lekin DB-talab qiluvchi endpointlar 503 qaytaradi.');
    return false;
  }
}

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

  const dbOk = await connectDb();
  if (dbOk) {
    try {
      const seed = require('./scripts/seed');
      await seed.ensureSeedData();
    } catch (err) {
      console.warn('⚠️  Seed skripti ishlamadi:', err.message);
    }
  }

  const server = app.listen(PORT, HOST, () => {
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
    server.close(async () => {
      await mongoose.connection.close().catch(() => {});
      if (memoryServer) await memoryServer.stop().catch(() => {});
      process.exit(0);
    });
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

start();
