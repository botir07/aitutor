const express = require('express');
const cors = require('cors');
const path = require('path');
const os = require('os');

const app = express();

// CORS - hammaga ruxsat
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// API
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', time: new Date() });
});

app.get('/api/subjects', (req, res) => {
  res.json([
    { id: 1, name: 'Matematika', icon: '📐', color: '#4edea3', lessons: '42/120', progress: 35 },
    { id: 2, name: 'Fizika', icon: '⚡', color: '#adc6ff', lessons: '80/95', progress: 84 },
    { id: 3, name: 'Biologiya', icon: '🧬', color: '#ffb95f', lessons: '12/60', progress: 20 },
    { id: 4, name: 'Kimyo', icon: '⚗️', color: '#10b981', lessons: '0/85', progress: 0 },
    { id: 5, name: 'Tarix', icon: '📚', color: '#adc6ff', lessons: '100/100', progress: 100 }
  ]);
});

app.get('/api/quizzes', (req, res) => {
  res.json([
    { id: 1, title: 'Kvadrat tenglamalar', subject: 'Matematika', questions: 10, time: '20:00', difficulty: 'Oson' },
    { id: 2, title: 'Nyuton qonunlari', subject: 'Fizika', questions: 15, time: '25:00', difficulty: "O'rta" },
    { id: 3, title: 'Hujayra tuzilishi', subject: 'Biologiya', questions: 12, time: '20:00', difficulty: 'Oson' }
  ]);
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

const PORT = 5000;
const HOST = '0.0.0.0';

const server = app.listen(PORT, HOST, () => {
  console.log('\n=========================================');
  console.log('  ✅ MAKTAB AI ISHLAMOQDA');
  console.log('=========================================');
  
  // Haqiqiy IP larni topish
  const nets = os.networkInterfaces();
  const results = [];
  
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      const familyV4Value = typeof net.family === 'string' ? 'IPv4' : 4;
      if (net.family === familyV4Value && !net.internal) {
        results.push(net.address);
      }
    }
  }
  
  if (results.length > 0) {
    console.log('  📱 Telefon/Planshet uchun:');
    results.forEach(ip => {
      console.log(`     http://${ip}:${PORT}`);
    });
  }
  
  console.log(`  💻 Kompyuter: http://localhost:${PORT}`);
  console.log(`  🔧 Test: http://127.0.0.1:${PORT}/api/health`);
  console.log('=========================================\n');
});
