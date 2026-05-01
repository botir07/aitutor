# Maktab AI - Premium Ta'lim Platformasi

O'zbekiston ta'lim tizimi uchun zamonaviy AI yordamchili platforma.

## Texnologiyalar

- **Backend**: Node.js, Express.js, MongoDB (Mongoose), JWT auth
- **Frontend**: HTML5, Tailwind CSS (CDN), Vanilla JavaScript (modulsiz)
- **Xavfsizlik**: helmet, express-rate-limit, express-validator, bcryptjs

## Talablar

- [Node.js](https://nodejs.org) 18+
- [MongoDB](https://www.mongodb.com/try/download/community) 6+ (lokal yoki Atlas)

## O'rnatish

### Windows (PowerShell)

```powershell
.\install.ps1
.\start.ps1
```

### Linux / macOS

```bash
bash install.sh
bash start.sh
```

### Qo'lda

```bash
cd backend
npm install
cp .env.example .env
# .env ni tahrirlang — kamida JWT_SECRET ni o'zgartiring
npm run dev
```

Server `http://localhost:5000` da ishga tushadi.
Frontend ham shu URL-da ochiladi (backend static fayllarni xizmat qiladi).

## Demo akkaunt

DB bo'sh bo'lsa, server avtomatik seed qiladi:

- Email: `demo@maktab.uz`
- Parol: `demo1234`

## Loyiha tuzilishi

```
aitutor/
├── backend/
│   ├── middleware/      # auth, errorHandler, requireDb
│   ├── models/          # User, Subject, Quiz, Grade, Message
│   ├── routes/          # auth, users, subjects, quizzes, grades, chat
│   ├── scripts/seed.js  # Boshlang'ich ma'lumotlar
│   ├── server.js        # Asosiy entrypoint
│   ├── .env             # Mahalliy sozlamalar (git-ga tushmaydi)
│   └── .env.example
└── frontend/
    ├── css/style.css
    ├── js/
    │   ├── api.js       # API client + Auth helper
    │   ├── auth-ui.js   # Login/Register modali
    │   └── app.js       # Sahifalar va ularning logikasi
    └── index.html
```

## API endpointlar

### Auth (rate-limited)
- `POST /api/auth/register` - Ro'yxatdan o'tish
- `POST /api/auth/login` - Tizimga kirish
- `GET  /api/auth/me` - Joriy foydalanuvchi
- `GET  /api/auth/profile` - To'liq profil

### Users (auth talab qilinadi)
- `PUT  /api/users/profile` - Profilni yangilash
- `PUT  /api/users/password` - Parolni o'zgartirish
- `GET  /api/users` - Barcha foydalanuvchilar (admin)

### Subjects
- `GET  /api/subjects` - Fanlar ro'yxati
- `GET  /api/subjects/:id` - Fan + darslari
- `POST /api/subjects` - Yangi fan (teacher/admin)

### Quizzes (auth talab qilinadi)
- `GET  /api/quizzes` - Testlar
- `GET  /api/quizzes/:id` - Bitta test (javobsiz)
- `POST /api/quizzes/:id/submit` - Test topshirish

### Grades (auth talab qilinadi)
- `GET  /api/grades` - Joriy o'quvchining baholari
- `GET  /api/grades/student/:studentId` - O'quvchi baholari (faqat ota-ona/o'qituvchi/admin)

### Chat (auth talab qilinadi)
- `POST /api/chat/ai` - AI mentorga xabar
- `GET  /api/chat/:userId` - Suhbat tarixi

### Boshqa
- `GET  /api/health` - Server holati

## Production

`.env` faylida:
- `NODE_ENV=production`
- `JWT_SECRET` — uzun va tasodifiy qatorga almashtiring (32+ belgi)
- `CORS_ORIGIN` — `*` o'rniga aniq domenlar

```bash
cd backend
npm run prod    # PM2 bilan
```

## Litsenziya

MIT
