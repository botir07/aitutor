# Maktab AI — project context prompt

Use this file when onboarding an AI assistant or a new developer. It describes repository layout, conventions, and behavioral contracts.

## Product summary

**Maktab AI** is a single-origin educational web app: Express serves JSON APIs under `/api/*` and static files from `frontend/`. The UI is Uzbek-first (“Maktab AI”). Roles: `student`, `parent`, `teacher`, `admin`. Features include subjects, quizzes with graded submissions, student gradebook, simple rule-based AI chat, and a **teacher panel** (attendance, manual grades, assignments).

## Tech stack

- Runtime: Node.js 18+
- Server: Express 4, `dotenv`, `helmet`, `cors`, `compression`, `morgan`, `express-rate-limit`
- DB: MongoDB via Mongoose 7
- Auth: JWT in `Authorization: Bearer <token>`, bcrypt password hashing on `User`
- Validation: `express-validator` on auth and several teacher routes
- Frontend: no bundler; Tailwind via CDN on `index.html` and `teacher.html`; shared `frontend/js/api.js` for `fetch` + `localStorage` token (`maktab_ai_token`, `maktab_ai_user`)

## Repository tree (authoritative)

```
aitutor/
├── README.md                 # Human-facing GitHub readme (UZ + API tables)
├── PROMPT.md                 # This file — AI / dev context
├── LICENSE
├── .gitignore                # includes .env, node_modules, uploads/, etc.
├── install.ps1 / install.sh
├── start.ps1 / start.sh
├── seed.ps1
├── pm2-start.sh
├── backend/
│   ├── server.js             # Express app, DB connect, seed, listen, graceful shutdown
│   ├── package.json
│   ├── .env.example
│   ├── middleware/
│   │   ├── auth.js           # protect, authorize(...roles)
│   │   ├── errorHandler.js   # CastError, duplicate key, JWT errors
│   │   └── requireDb.js      # 503 if mongoose.connection.readyState !== 1
│   ├── models/
│   │   ├── User.js
│   │   ├── Subject.js
│   │   ├── Quiz.js           # questions[], maxAttempts (default 3), totalPoints pre-save
│   │   ├── Grade.js          # student, teacher?, subject, quiz?, type enum includes 'baholash'
│   │   ├── Message.js        # sender, receiver?, type ai_chat | ai_response | ...
│   │   ├── Attendance.js     # unique compound index: student + date (UTC day semantics in routes)
│   │   └── Assignment.js     # teacher, subject, dueDate, submissions[]
│   ├── routes/
│   │   ├── auth.js           # register, login, profile, me; router.use(requireDb)
│   │   ├── users.js
│   │   ├── subjects.js
│   │   ├── quizzes.js        # submit enforces maxAttempts for type quiz grades only
│   │   ├── grades.js
│   │   ├── chat.js
│   │   └── teacher.js        # all routes: requireDb + protect + authorize('teacher','admin')
│   └── scripts/
│       ├── seed.js           # subjects, quizzes, demo student + demo teacher if missing
│       └── test-e2e.js       # MongoMemoryServer + HTTP integration checks
└── frontend/
    ├── index.html            # main SPA shell; nav links; teacher link class .teacher-nav-only
    ├── teacher.html          # standalone teacher UI; uses API.teacher.*
    ├── css/style.css
    └── js/
        ├── api.js            # request(), Auth, API, API.teacher
        ├── auth-ui.js
        └── app.js            # hash routes #/dashboard, …; renderUserChrome toggles .teacher-nav-only
```

## Server bootstrap (`backend/server.js`)

- Loads `.env` via `dotenv`.
- `USE_MEMORY_DB=true` spins up `mongodb-memory-server` (dev-only; data ephemeral).
- If real Mongo fails and memory DB is off, server still listens but DB routes return 503 via `requireDb`.
- **Production guard:** exits if `JWT_SECRET` is missing or equals known placeholder strings from `.env.example`.
- Static: `express.static(../frontend)` then SPA fallback for non-API GET routes to `index.html` (so `/teacher.html` is served as a real file when present).

## Auth & authorization

- `protect`: reads Bearer token, `jwt.verify` with `process.env.JWT_SECRET`, loads `User`, rejects inactive users.
- `authorize('teacher', 'admin')`: after `protect`, checks `req.user.role`.
- Student grade access: `GET /api/grades/student/:id` allows self, `teacher`, `admin`, or `parent` with child in `children` array.

## Data models (critical fields)

### User

- `role`: enum includes `teacher`.
- `stats.gpa`, `stats.quizzesCompleted` updated from `Grade` post-save hook (quizzesCompleted only counts `type === 'quiz'`).

### Grade

- `type`: `quiz` | `exam` | `homework` | `participation` | `baholash`.
- Quiz submissions create `type: 'quiz'`; teacher manual grades use `type: 'baholash'`, set `teacher`, optional `comment`, `subject` as ObjectId.
- `subject` is required (ObjectId → Subject). Do not change to string without migration.

### Attendance

- One document per student per calendar day (UTC midnight normalization in teacher routes).
- Bulk POST uses `bulkWrite` upserts.

### Assignment

- `submissions` subdocuments: student, score, feedback, timestamps.
- `PUT .../grade` upserts or updates submission for a student; max score validated.

## Teacher API mental model

- **Dashboard:** student count, today’s attendance rate (scoped to teacher unless admin), week row count, recent `baholash` grades.
- **Attendance:** teacher-scoped reads for non-admin; admin sees broader data where implemented.
- **Grades POST:** validates student is role `student`, subject exists; maps 0–100 score to 1–5 `grade` field consistently with quiz submit logic.

## Frontend contracts

- `API.request` on 401 logs out if token was present.
- Main app: `App.init()` → `API.me()` → `Auth.setUser` → `renderUserChrome()` shows `.teacher-nav-only` for `teacher` | `admin`.
- Teacher page: gate with `API.me()`; redirect if not staff. Uses `API.teacher.*` namespace in `api.js`.

## Testing

- Run from `backend/`: `npm run test:e2e` (requires devDependencies installed).
- Sets `NODE_ENV=test`, uses in-memory Mongo, hits real HTTP server on ephemeral port.

## Conventions for future changes

1. New authenticated routes: use `requireDb` if persistence required; use `protect` + `authorize` as needed.
2. Prefer ObjectId refs for `subject`, `student`, `teacher` — align with existing Mongoose patterns.
3. Keep frontend free of build step unless the team explicitly migrates to Vite/Webpack.
4. Do not commit `backend/.env`; rotate secrets if ever leaked in git history.
5. Uzbek user-facing strings in API `message` fields are intentional.

## Known limitations / backlog

- AI chat is stubbed (no external LLM).
- `GET /api/chat/:userId` targets 1:1 message pairs with `sender`/`receiver`; AI messages may omit `receiver` — history query may not list AI thread unless extended.
- Teacher panel is separate HTML page, not integrated into hash SPA.
- Assignments: student submission flow not implemented (grading API exists).

## Demo credentials (seed)

- Student: `demo@maktab.uz` / `demo1234`
- Teacher: `teacher@maktab.uz` / `teacher123`

End of context prompt.
