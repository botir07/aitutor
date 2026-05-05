# CHANGES.md - Maktab AI Bug Fixes

## Fixed Bugs

### 1. Quiz maxAttempts Not Enforced (HIGH)
**File:** `backend/routes/quizzes.js`
**Issue:** The `/api/quizzes/:id/submit` endpoint did not track quiz attempts, allowing unlimited submissions despite `maxAttempts` setting.
**Fix:**
- Added `quiz_attempts` table in `database.js` to track individual student attempts per quiz
- Implemented attempt counting before allowing submission
- Returns 403 error when student exceeds their attempt limit
- Response now includes `attemptNumber` and `attemptsRemaining`

### 2. Missing Attendance Table (MEDIUM)
**File:** `backend/lib/database.js`
**Issue:** Database schema lacked an `attendance` table for tracking student attendance records.
**Fix:**
- Added `attendance` table with columns: id, studentId, date, status, teacherId, notes, createdAt
- Added indexes for efficient student and date queries

### 3. comparePassword Called Without Await (LOW)
**Files:** `backend/routes/auth.js`, `backend/routes/users.js`
**Issue:** `user.comparePassword()` returns a Promise but was being called without `await`, causing incorrect comparison results.
**Fix:**
- Added `await` keyword: `const passwordMatch = await user.comparePassword(password);`

## Database Schema Additions

### quiz_attempts table
```sql
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  quizId INTEGER NOT NULL,
  studentId INTEGER NOT NULL,
  attemptNumber INTEGER NOT NULL DEFAULT 1,
  score REAL,
  grade REAL,
  passed INTEGER,
  completedAt TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (quizId) REFERENCES quizzes(id),
  FOREIGN KEY (studentId) REFERENCES users(id),
  UNIQUE(quizId, studentId, attemptNumber)
);
```

### attendance table
```sql
CREATE TABLE IF NOT EXISTS attendance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  studentId INTEGER NOT NULL,
  date TEXT NOT NULL,
  status TEXT DEFAULT 'present',
  teacherId INTEGER,
  notes TEXT,
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (studentId) REFERENCES users(id),
  FOREIGN KEY (teacherId) REFERENCES users(id),
  UNIQUE(studentId, date)
);
```

## Test Results

All 50 E2E tests now pass:
```
✅ HAMMA TEST O'TDI: 50/50
```

---
*Date: 2026-05-05*
*Status: All critical bugs fixed and verified*