# Employee Attendance, Timesheet & Work Monitoring System (EATWMS)

A production-ready, full-stack workforce management platform supporting office, WFH, and hybrid employees.

---

## Architecture Overview

```
Frontend (React + Vite + TypeScript + Tailwind)
     │
     │  REST API over HTTPS
     ▼
Backend (Node.js + Express + TypeScript)
     │
     ├── PostgreSQL 15   — primary data store
     ├── Redis 7         — session/cache support
     └── Local FS / S3   — selfie storage
```

---

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite 5, TypeScript, Tailwind CSS, Zustand, React Router 6 |
| Charts | Recharts |
| Backend | Node.js 20, Express 4, TypeScript 5 |
| ORM | Knex.js 3 (PostgreSQL driver) |
| Database | PostgreSQL 15 |
| Cache | Redis 7 |
| Auth | JWT + bcrypt |
| Validation | Zod |
| File Upload | Multer + Sharp |
| Excel Export | ExcelJS |
| Scheduling | node-cron |
| Logging | Pino |
| Testing | Jest + Supertest |
| Deployment | Docker + Docker Compose |

---

## Project Structure

```
d:\timeshhet\
├── backend/
│   ├── src/
│   │   ├── config/        # DB, Redis, env
│   │   ├── middleware/    # auth, rbac, validate, upload, rateLimit
│   │   ├── modules/       # auth, users, attendance, timesheets, tasks, leave, ...
│   │   ├── services/      # audit, notification, storage, kpi, scheduler
│   │   ├── types/
│   │   └── utils/
│   ├── migrations/        # 19 Knex migrations
│   ├── seeds/             # 9 seed files with development data
│   └── tests/             # unit, integration, security
├── frontend/
│   ├── src/
│   │   ├── api/           # Axios + per-domain API modules
│   │   ├── components/    # layout, common, webcam
│   │   ├── contexts/      # AuthContext
│   │   ├── pages/         # 25+ pages across all roles
│   │   ├── stores/        # Zustand: auth, notifications
│   │   └── utils/         # formatters
├── .kiro/specs/employee-monitoring/
│   ├── requirements.md
│   ├── design.md
│   └── tasks.md
├── docker-compose.yml
└── .env.example
```

---

## Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL 15
- Redis 7 (optional — degrades gracefully in dev)
- npm

### 1. Clone & Setup

```powershell
cd d:\timeshhet
```

### 2. Backend Setup

```powershell
cd backend
Copy-Item .env.example .env    # Edit .env with your DB credentials
npm install
```

### 3. Database Setup

```powershell
# Create database
psql -U postgres -c "CREATE DATABASE eatwms;"
psql -U postgres -c "CREATE USER eatwms_user WITH PASSWORD 'your_password';"
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE eatwms TO eatwms_user;"

# Run migrations
npm run migrate

# Seed development data
npm run seed
```

### 4. Start Backend

```powershell
npm run dev
# Backend runs on http://localhost:4000
```

### 5. Frontend Setup

```powershell
cd ..\frontend
npm install
npm run dev
# Frontend runs on http://localhost:3000
```

---

## Docker (Recommended)

```powershell
# Copy and configure environment
Copy-Item .env.example .env
# Edit .env with secure passwords

# Start all services
docker-compose up -d

# Run migrations (first time only)
docker-compose run --rm migrate

# Seed data (optional, development only)
docker exec eatwms_backend node -e "require('./dist/seeds/run')"
```

Services:
- Frontend: http://localhost:3000
- Backend: http://localhost:4000
- PostgreSQL: localhost:5432
- Redis: localhost:6379

---

## Environment Variables

See `backend/.env.example` for full list.

Key variables:

| Variable | Description | Default |
|---|---|---|
| `DB_HOST` | PostgreSQL host | localhost |
| `DB_NAME` | Database name | eatwms |
| `JWT_SECRET` | JWT signing secret (min 32 chars) | — |
| `REFRESH_TOKEN_SECRET` | Refresh token secret | — |
| `STORAGE_PROVIDER` | `local` or `s3` | local |
| `DEFAULT_TIMEZONE` | Display timezone | Asia/Kolkata |

---

## Development Credentials (Seed Data)

> These are **development only**. Never use in production.

| Role | Email | Password |
|---|---|---|
| Admin | admin@company.com | Admin@123 |
| Manager | manager@company.com | Manager@123 |
| Team Lead | teamlead@company.com | Lead@123 |
| Employee | employee@company.com | Employee@123 |

---

## API Reference

Base URL: `http://localhost:4000/api`

### Authentication

```
POST /api/auth/login           Login (email + password → JWT)
POST /api/auth/logout          Logout (invalidate refresh token)
GET  /api/auth/me              Current user profile
POST /api/auth/refresh         Refresh access token
POST /api/auth/forgot-password Send password reset email
POST /api/auth/reset-password  Reset password with token
```

### Attendance (Webcam Selfie Required)

```
POST /api/attendance/check-in        multipart/form-data: { selfie, work_mode_id }
POST /api/attendance/check-out       multipart/form-data: { selfie }
GET  /api/attendance/today           Today's attendance for current user
GET  /api/attendance/history         Paginated history (RBAC scoped)
GET  /api/attendance/team            Team attendance today (Manager/TL/Admin)
GET  /api/attendance/:id             Single record
GET  /api/verifications/:id/image    Serve selfie image (auth required)
```

### Timesheets

```
GET    /api/timesheets              List (RBAC scoped)
POST   /api/timesheets              Create (DRAFT)
PUT    /api/timesheets/:id          Update (DRAFT/REJECTED only)
DELETE /api/timesheets/:id          Delete (DRAFT only)
POST   /api/timesheets/:id/submit   Submit for approval
POST   /api/timesheets/:id/approve  Approve (Manager/TL/Admin)
POST   /api/timesheets/:id/reject   Reject with comment
```

### Projects & Tasks

```
GET  /api/projects              List projects
POST /api/projects              Create (Manager/Admin)
GET  /api/tasks                 List tasks (RBAC scoped)
POST /api/tasks                 Create (TL/Manager/Admin)
POST /api/tasks/:id/progress    Post progress update
GET  /api/tasks/:id/updates     Task update history
```

### Leave

```
POST /api/leave/request        Apply for leave
GET  /api/leave/my             My leave requests
GET  /api/leave/team           Team leave requests (Manager/TL)
GET  /api/leave/balance        Leave balances
GET  /api/leave/types          Available leave types
POST /api/leave/:id/approve    Approve (Manager/TL/Admin)
POST /api/leave/:id/reject     Reject with comment
POST /api/leave/:id/cancel     Cancel own pending request
```

### Dashboards & KPI

```
GET /api/dashboard/employee    Employee dashboard data
GET /api/dashboard/manager     Manager dashboard (RBAC)
GET /api/dashboard/teamlead    Team Lead dashboard
GET /api/dashboard/admin       Admin dashboard with charts
GET /api/dashboard/kpi         KPI calculations with date range
```

### Reports & Export

```
GET /api/reports/attendance    Attendance report
GET /api/reports/timesheet     Timesheet report
GET /api/reports/leave         Leave report
GET /api/reports/exceptions    Exception report
GET /api/reports/export        Export (format=csv|excel)
```

### Administration

```
GET  /api/users                List employees (Admin/Manager)
POST /api/users                Create employee (Admin)
PUT  /api/users/:id            Update employee (Admin)
PATCH /api/users/:id/deactivate  Deactivate (Admin)
GET  /api/departments          List departments
POST /api/departments          Create department (Admin)
GET  /api/audit-logs           Audit logs (Admin only)
GET  /api/settings             System settings
PUT  /api/settings             Update settings (Admin)
GET  /api/exceptions           Attendance exceptions
POST /api/exceptions/:id/review  Review exception
GET  /api/notifications        My notifications
POST /api/notifications/:id/read  Mark read
```

---

## Roles & Permissions

| Permission | Employee | Team Lead | Manager | Admin |
|---|---|---|---|---|
| Own Attendance | ✓ | ✓ | ✓ | ✓ |
| Team Attendance | — | ✓ | ✓ | ✓ |
| All Attendance | — | — | — | ✓ |
| Own Timesheet | ✓ | ✓ | ✓ | ✓ |
| Approve Timesheet | — | Limited | ✓ | ✓ |
| Leave Apply | ✓ | ✓ | ✓ | ✓ |
| Leave Approve | — | Limited | ✓ | ✓ |
| Create Tasks | — | ✓ | ✓ | ✓ |
| User Management | — | — | — | ✓ |
| Settings | — | — | — | ✓ |
| Audit Logs | — | — | — | ✓ |

---

## Webcam Check-In Flow

1. Employee selects work mode (Office / WFH / Hybrid)
2. Privacy notice displayed — employee accepts
3. Browser requests camera permission
4. Live video preview shown
5. Employee captures selfie
6. Preview: Retake or Confirm
7. On confirm: `POST /api/attendance/check-in` with `multipart/form-data`
8. Server generates timestamp (never trusts client time)
9. File validation: MIME + extension + file signature + size ≤ 5 MB
10. SHA-256 hash computed, file stored with UUID filename
11. Transaction: create attendance + verification + audit log
12. Late check-in exception detected if applicable

---

## KPI Formulas

```
Attendance Rate          = (Present Days / Expected Working Days) × 100
On-Time Check-In Rate    = (On-Time Check-Ins / Total Check-Ins) × 100
WFH Rate                 = (WFH Days / Total Present Days) × 100
Timesheet Completion     = (Submitted Timesheets / Expected Timesheets) × 100
Task Completion Rate     = (Completed Tasks / Assigned Tasks) × 100
Verification Completion  = (Successful Verifications / Expected Verifications) × 100
Exception Rate           = (Total Exceptions / Attendance Records) × 100
Overtime                 = max(0, Actual Hours − Standard Hours)
```

All KPIs use **live database queries**. No hardcoded values.

---

## Testing

```powershell
cd backend

# All tests
npm test

# Unit tests only (KPI formulas, duration, leave calculations)
npm run test:unit

# Integration tests (API flows, auth, RBAC)
npm run test:integration

# Security tests (JWT, SQL injection, file upload, headers)
npm run test:security

# Coverage report
npm run test:coverage
```

---

## Database Migrations

```powershell
cd backend

# Run all pending migrations
npm run migrate

# Rollback last batch
npm run migrate:rollback

# Seed development data
npm run seed
```

19 migrations in order:
1. roles → 2. departments → 3. work_modes → 4. users → 5. attendance →
6. attendance_verifications → 7. projects → 8. tasks → 9. task_updates →
10. timesheets → 11. leave_types → 12. leave_balances → 13. leave_requests →
14. activity_logs → 15. engagement_prompts → 16. notifications →
17. attendance_exceptions → 18. audit_logs → 19. system_settings

---

## Security

- JWT access tokens (8h) + refresh tokens (7d, hashed in DB)
- bcrypt password hashing (cost 12)
- RBAC enforced on every protected endpoint
- Rate limiting: 100 req/15min global, 10 req/15min login
- Helmet security headers
- CORS (trusted origin only)
- Input validation via Zod on all endpoints
- File validation: MIME + file signature (magic bytes) + extension + 5 MB limit
- UUID-based filenames (never user-provided)
- Selfie images behind authenticated API — never publicly accessible
- SQL injection prevention via parameterized queries (Knex)

---

## Privacy

- Webcam **only** activated during explicit check-in/check-out
- Privacy notice shown **before** camera activation
- No hidden/continuous monitoring
- Selfie access restricted by role (own: employee, team: manager, all: admin)
- Configurable selfie retention: `selfie_retention_days` (default: 90 days)
- Automatic cleanup via scheduled job

---

## Data Retention (Scheduled Daily)

| Data | Default Retention | Setting Key |
|---|---|---|
| Selfie images | 90 days | `selfie_retention_days` |
| Activity logs | 180 days | `activity_retention_days` |
| Audit logs | 365 days | `audit_retention_days` |

---

## Scheduled Jobs

| Job | Schedule | Action |
|---|---|---|
| Exception detection | Daily 23:30 | Detect MISSING_CHECKIN, MISSING_CHECKOUT, MISSING_TIMESHEET |
| Data retention | Daily 02:00 | Delete expired selfies, activity logs, old audit logs |

---

## Known Limitations (V1)

1. Email notifications not implemented — in-app notifications only
2. Random camera verification architecture prepared but disabled by default
3. Face recognition / AI verification not in V1 — extension points ready
4. No public holiday calendar — only weekends excluded from working days
5. Refresh token lookup is linear scan (small teams acceptable; use indexed token prefix for large scale)
6. Single-timezone display (configurable via settings, not per-user)
7. S3 storage provider stubbed — needs AWS SDK implementation for production

---

## Future Extension Points (V2/V3)

### V2 — Prepared Architecture
- `verification_method` field: SELFIE → FACE_RECOGNITION, LIVENESS, OTP
- `random_verification_enabled` system setting (already seeded, default: false)
- `VerificationProvider` interface ready for AI verification plug-in

### V3 — Future Scope
- Payroll integration via `PayrollService` interface
- Mobile app (React Native)
- Microservices migration (clean module boundaries ready)
- Kafka/RabbitMQ event bus
- AI productivity analytics

---

## Health Endpoints

```
GET /health     Service health check
GET /health/db  Database connection check
```

---

## Troubleshooting

**Camera not working in browser:**
- Ensure HTTPS or localhost (browser restricts camera on HTTP)
- Check camera permissions in browser settings
- Ensure no other app is using the camera

**PostgreSQL connection refused:**
- Verify DB is running: `pg_isready -h localhost -p 5432`
- Check credentials in `.env`

**Migration fails:**
- Ensure database and user exist with proper privileges
- Check `DB_NAME`, `DB_USER`, `DB_PASSWORD` in `.env`

**JWT errors:**
- Ensure `JWT_SECRET` is at least 32 characters
- Check token has not expired (default 8h)

**File upload errors:**
- Max 5 MB per selfie
- Allowed formats: JPEG, PNG, WEBP only
- Ensure `uploads/attendance/` directory is writable

---

## Deployment

### Production Deployment on Render

For complete deployment instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md) and [PRODUCTION_CHECKLIST.md](./PRODUCTION_CHECKLIST.md).

#### Quick Deploy Steps:

1. **Push to GitHub**
```bash
git push origin main
```

2. **Deploy Backend**
   - Render Dashboard → New Web Service
   - Connect GitHub repo, Root Directory: `backend`
   - Build Command: `npm run render-build`
   - Start Command: `npm run render-start` 
   - Add environment variables from `.env.render`

3. **Deploy Frontend**
   - Render Dashboard → New Static Site
   - Same repo, Root Directory: `frontend`
   - Build Command: `npm ci && npm run build`
   - Publish Directory: `dist`
   - Add `VITE_API_URL` environment variable

4. **Verify Deployment**
```bash
node verify-deployment.js https://your-frontend.onrender.com https://your-backend.onrender.com
```

#### Environment Configuration

Copy environment variables from:
- Backend: `backend/.env.render`
- Frontend: `frontend/.env.example`

**Important**: Change JWT secrets and default passwords before production use!

### Local Development (Quick Start)

```bash
# Install dependencies and start both servers
node start-dev.js

# Or manually:
# Terminal 1 (Backend)
cd backend && npm run dev

# Terminal 2 (Frontend)  
cd frontend && npm run dev
```

---

## License

Private — Internal use only.
