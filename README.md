# Maktab AI

O‘zbekiston maktablari uchun yagona backend + statik frontend: fanlar, testlar, baholar, AI chat, **o‘qituvchi paneli** (davomat, vazifalar, qo‘lda baholash).

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## Imkoniyatlar

| Modul | Tavsif |
|--------|--------|
| **Auth** | Ro‘yxatdan o‘tish, JWT, rollar: `student`, `parent`, `teacher`, `admin` |
| **Fanlar va darslar** | Subject modeli + REST |
| **Testlar** | Savollar, topshirish, `maxAttempts` cheklovi, GPA yangilanishi |
| **Baholar** | O‘quvchi ko‘rinishi, IDOR himoyasi (ota-ona/o‘qituvchi) |
| **AI chat** | Oddiy javob (keyinchalik LLM integratsiyasi uchun tayyor API) |
| **O‘qituvchi paneli** | Dashboard, o‘quvchilar, davomat (bulk), statistika, qo‘lda baho, vazifalar |
| **Xavfsizlik** | helmet, rate-limit, express-validator, bcrypt; production’da zaif `JWT_SECRET` bloklanadi |

## Texnologiyalar

- **Backend:** Node.js 18+, Express 4, Mongoose 7, MongoDB
- **Frontend:** HTML, Tailwind (CDN), vanilla JS (`api.js`, `app.js`, `auth-ui.js`)
- **Dev / test:** `mongodb-memory-server` (E2E), `nodemon`

## Talablar

- [Node.js](https://nodejs.org) 18+
- [MongoDB](https://www.mongodb.com/try/download/community) 6+ **yoki** `.env` da `USE_MEMORY_DB=true` (faqat rivojlantirish; qayta ishga tushganda ma’lumot yo‘qoladi)

## Tez boshlash

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

### Qo‘lda

```bash
cd backend
npm install
cp .env.example .env
# JWT_SECRET ni o‘zgartiring (production’da majburiy)
npm run dev
```

Brauzer: **http://localhost:5000** — frontend shu server orqali statik tarzda beriladi.

## Demo akkauntlar

Server ishga tushganda `scripts/seed.js` yetishmayotgan demo foydalanuvchilarni yaratadi:

| Rol | Email | Parol |
|-----|--------|--------|
| O‘quvchi | `demo@maktab.uz` | `demo1234` |
| O‘qituvchi | `teacher@maktab.uz` | `teacher123` |

O‘qituvchi paneli: **http://localhost:5000/teacher.html** (avval shu akkaunt bilan asosiy saytda login qiling, token `localStorage`da saqlanadi).

## Loyiha tuzilishi

```
aitutor/
├── backend/
│   ├── middleware/
│   │   ├── auth.js          # JWT protect, role authorize
│   │   ├── errorHandler.js
│   │   └── requireDb.js     # Mongo ulanmagan bo‘lsa 503
│   ├── models/
│   │   ├── User.js
│   │   ├── Subject.js
│   │   ├── Quiz.js
│   │   ├── Grade.js         # quiz + o‘qituvchi bahosi (type: baholash)
│   │   ├── Message.js
│   │   ├── Attendance.js    # kunlik davomat
│   │   └── Assignment.js    # vazifa + submissions
│   ├── routes/
│   │   ├── auth.js
│   │   ├── users.js
│   │   ├── subjects.js
│   │   ├── quizzes.js
│   │   ├── grades.js
│   │   ├── chat.js
│   │   └── teacher.js       # o‘qituvchi API
│   ├── scripts/
│   │   ├── seed.js
│   │   └── test-e2e.js      # in-memory DB + HTTP testlar
│   ├── server.js
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── css/style.css
│   ├── js/
│   │   ├── api.js           # Auth + API.teacher
│   │   ├── auth-ui.js
│   │   └── app.js           # SPA (#/dashboard, …)
│   ├── index.html
│   └── teacher.html         # o‘qituvchi paneli (alohida sahifa)
├── install.ps1 / install.sh
├── start.ps1 / start.sh
├── README.md
├── PROMPT.md                # loyiha konteksti (AI / yangi dasturchilar)
└── LICENSE
```

## API qisqacha

Barcha JSON javoblar odatda `{ success, message?, data?, ... }` formatida.

### Umumiy

| Method | Path | Tavsif |
|--------|------|--------|
| GET | `/api/health` | Server + DB holati |

### Auth (login/register rate-limit)

| Method | Path | Auth |
|--------|------|------|
| POST | `/api/auth/register` | — |
| POST | `/api/auth/login` | — |
| GET | `/api/auth/me` | JWT |
| GET | `/api/auth/profile` | JWT |

### Users

| Method | Path | Auth |
|--------|------|------|
| GET | `/api/users` | admin |
| PUT | `/api/users/profile` | JWT |
| PUT | `/api/users/password` | JWT |

### Subjects / Quizzes / Grades / Chat

| Method | Path | Tavsif |
|--------|------|--------|
| GET | `/api/subjects` | Fanlar |
| GET | `/api/subjects/:id` | Bitta fan |
| POST | `/api/subjects` | Yangi fan (teacher/admin) |
| GET | `/api/quizzes` | Testlar ro‘yxati |
| GET | `/api/quizzes/:id` | Test (to‘g‘ri javoblar yashirin) |
| POST | `/api/quizzes/:id/submit` | Topshirish (`maxAttempts` tekshiruvi) |
| POST | `/api/quizzes` | Yangi test (teacher/admin) |
| GET | `/api/grades` | Joriy foydalanuvchi baholari |
| GET | `/api/grades/student/:studentId` | Boshqa o‘quvchi (ruxsat bilan) |
| POST | `/api/chat/ai` | AI xabar |
| GET | `/api/chat/:userId` | Xabar tarixi (1:1 model) |

### O‘qituvchi (`teacher` yoki `admin`, JWT)

| Method | Path | Tavsif |
|--------|------|--------|
| GET | `/api/teacher/dashboard` | Statistika, so‘nggi baholar |
| GET | `/api/teacher/students` | `?q=` qidiruv |
| POST | `/api/teacher/attendance` | Bulk davomat |
| GET | `/api/teacher/attendance` | Tarix |
| GET | `/api/teacher/attendance/stats` | `?days=30` foizlar |
| POST | `/api/teacher/grades` | Qo‘lda baho (`studentId`, `subjectId`, `score`, …) |
| POST | `/api/teacher/assignments` | Vazifa yaratish |
| GET | `/api/teacher/assignments` | Ro‘yxat |
| PUT | `/api/teacher/assignments/:id/grade` | Vazifaga baho |

## Testlar

```bash
cd backend
npm run test:e2e
```

Skript in-memory MongoDB ishga tushiradi, serverni import qiladi va asosiy oqimlarni HTTP orqali tekshiradi.

## Muhit o‘zgaruvchilari (`backend/.env`)

| O‘zgaruvchi | Tavsif |
|-------------|--------|
| `PORT` | Default `5000` |
| `MONGODB_URI` | Mongo connection string |
| `USE_MEMORY_DB` | `true` — faqat dev |
| `JWT_SECRET` | Imzo kaliti; production’da kuchli qiymat |
| `JWT_EXPIRE` | Masalan `7d` |
| `CORS_ORIGIN` | `*` yoki vergul bilan domenlar |
| `NODE_ENV` | `development` / `production` / `test` |

`.env` faylni git’ga qo‘shmang — faqat `.env.example`.

## Production

1. `NODE_ENV=production`
2. `JWT_SECRET` — uzun tasodifiy qator (server zaif qiymat bilan ishga tushmaydi)
3. `CORS_ORIGIN` — aniq frontend domenlari
4. Haqiqiy MongoDB (memory DB emas)

```bash
cd backend
npm run prod   # PM2 — package.json dagi skriptga qarang
```

## Keyingi qadamlar (tavsiya)

- Haqiqiy LLM integratsiyasi (`/api/chat/ai`)
- O‘quvchiga vazifa topshirish (hozir faqat o‘qituvchi baholaydi)
- `teacher.html` ni asosiy SPA ichiga birlashtirish
- Swagger / OpenAPI hujjatlari

## Hujjatlar

- **`PROMPT.md`** — loyiha strukturasi, konventsiyalar va kontekst (Cursor / boshqa AI uchun).

## Litsenziya

MIT — `LICENSE` fayliga qarang.
