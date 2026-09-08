# Employee Attendance, Timesheet & Work Monitoring System
# Implementation Tasks — V1

---

## TASK 1 — Analyze Existing Architecture
**Status:** COMPLETE — Greenfield project, no existing code.

---

## TASK 2 — Scaffold Project Structure

**Objective:** Initialize backend (Node.js/TypeScript/Express) and frontend (React/Vite/TypeScript) project skeletons with all dependencies.

**Files Affected:**
- `backend/package.json`, `backend/tsconfig.json`, `backend/knexfile.ts`
- `frontend/package.json`, `frontend/tsconfig.json`, `frontend/vite.config.ts`, `frontend/tailwind.config.ts`

**Dependencies:** None

**Acceptance Criteria:**
- [ ] `npm install` succeeds in both backend and frontend
- [ ] TypeScript compiles without errors
- [ ] `npm run dev` starts both servers

---

## TASK 3 — Database Migrations

**Objective:** Create Knex migrations for all database tables in correct dependency order.

**Files Affected:**
- `backend/migrations/001_create_roles.ts`
- `backend/migrations/002_create_departments.ts`
- `backend/migrations/003_create_work_modes.ts`
- `backend/migrations/004_create_users.ts`
- `backend/migrations/005_create_attendance.ts`
- `backend/migrations/006_create_attendance_verifications.ts`
- `backend/migrations/007_create_projects.ts`
- `backend/migrations/008_create_tasks.ts`
- `backend/migrations/009_create_task_updates.ts`
- `backend/migrations/010_create_timesheets.ts`
- `backend/migrations/011_create_leave_types.ts`
- `backend/migrations/012_create_leave_balances.ts`
- `backend/migrations/013_create_leave_requests.ts`
- `backend/migrations/014_create_activity_logs.ts`
- `backend/migrations/015_create_engagement_prompts.ts`
- `backend/migrations/016_create_notifications.ts`
- `backend/migrations/017_create_attendance_exceptions.ts`
- `backend/migrations/018_create_audit_logs.ts`
- `backend/migrations/019_create_system_settings.ts`

**Acceptance Criteria:**
- [ ] `npx knex migrate:latest` succeeds
- [ ] `npx knex migrate:rollback` succeeds
- [ ] All indexes, constraints, and foreign keys are created

---

## TASK 4 — Seed Data

**Objective:** Create seed data for development environment.

**Files Affected:**
- `backend/seeds/001_roles.ts`
- `backend/seeds/002_departments.ts`
- `backend/seeds/003_work_modes.ts`
- `backend/seeds/004_leave_types.ts`
- `backend/seeds/005_system_settings.ts`
- `backend/seeds/006_users.ts`
- `backend/seeds/007_projects.ts`
- `backend/seeds/008_tasks.ts`
- `backend/seeds/009_leave_balances.ts`

**Seed Users:**
- admin@company.com / Admin@123 (ADMIN)
- manager@company.com / Manager@123 (MANAGER)
- teamlead@company.com / Lead@123 (TEAM_LEAD)
- employee@company.com / Employee@123 (EMPLOYEE)

**Acceptance Criteria:**
- [ ] `npx knex seed:run` succeeds
- [ ] All seed data visible in DB
- [ ] Test users can log in

---

## TASK 5 — Authentication & RBAC

**Objective:** Implement login, logout, refresh token, forgot/reset password. RBAC middleware.

**Files Affected:**
- `backend/src/modules/auth/auth.routes.ts`
- `backend/src/modules/auth/auth.controller.ts`
- `backend/src/modules/auth/auth.service.ts`
- `backend/src/middleware/authenticate.ts`
- `backend/src/middleware/authorize.ts`

**Acceptance Criteria:**
- [ ] POST /api/auth/login returns JWT + refresh token
- [ ] Middleware rejects requests without valid JWT (401)
- [ ] RBAC middleware rejects unauthorized role (403)
- [ ] Rate limiting applied on login (10 req / 15 min)
- [ ] Audit log created on LOGIN and LOGOUT

---

## TASK 6 — User & Department Management APIs

**Objective:** CRUD for users, departments, work modes, roles.

**Files Affected:**
- `backend/src/modules/users/`
- `backend/src/modules/departments/`
- `backend/src/modules/workModes/`

**Acceptance Criteria:**
- [ ] Admin can create/update/deactivate users
- [ ] Admin can manage departments
- [ ] Employee can view/update own profile
- [ ] Deactivated users cannot login

---

## TASK 7 — Storage Service

**Objective:** Implement storage abstraction with local filesystem provider.

**Files Affected:**
- `backend/src/services/storage/StorageService.ts`
- `backend/src/services/storage/LocalStorageService.ts`
- `backend/src/services/storage/S3StorageService.ts`
- `backend/src/middleware/upload.ts`

**Acceptance Criteria:**
- [ ] File uploads to `uploads/attendance/`
- [ ] UUID-based filenames generated
- [ ] SHA-256 hash computed
- [ ] MIME/extension/file signature validation
- [ ] Files not publicly accessible
- [ ] GET /api/verifications/:id/image requires auth

---

## TASK 8 — Attendance Check-In API

**Objective:** Implement check-in endpoint with selfie upload and full transaction safety.

**Files Affected:**
- `backend/src/modules/attendance/attendance.routes.ts`
- `backend/src/modules/attendance/attendance.controller.ts`
- `backend/src/modules/attendance/attendance.service.ts`

**Transaction Flow:**
1. Validate JWT + user status
2. Validate work mode
3. Check no active session (UNIQUE constraint)
4. Validate selfie file
5. Store selfie
6. BEGIN TRANSACTION: create attendance, create verification, create audit log, check late exception
7. COMMIT or ROLLBACK

**Acceptance Criteria:**
- [ ] Duplicate check-in returns 409 ATTENDANCE_ALREADY_ACTIVE
- [ ] Server timestamp used, never client time
- [ ] Verification record created with image_path + image_hash
- [ ] Audit log created
- [ ] LATE_CHECKIN exception created if applicable

---

## TASK 9 — Attendance Check-Out API

**Objective:** Implement check-out endpoint.

**Transaction Flow:**
1. Find active attendance
2. Validate selfie
3. Store selfie
4. BEGIN TRANSACTION: update attendance (checkout time, duration, status), create verification, create audit log, check early checkout exception
5. COMMIT

**Acceptance Criteria:**
- [ ] Check-out without active session returns 404
- [ ] total_work_minutes, regular_work_minutes, overtime_minutes calculated
- [ ] EARLY_CHECKOUT exception created if applicable
- [ ] Audit log created

---

## TASK 10 — Timesheet APIs

**Objective:** Full timesheet CRUD with submit/approve/reject workflow.

**Files Affected:**
- `backend/src/modules/timesheets/`

**Acceptance Criteria:**
- [ ] Employee can create/edit/delete DRAFT timesheets
- [ ] Employee can submit timesheet (→ SUBMITTED)
- [ ] Manager/TL can approve (→ APPROVED) or reject (→ REJECTED) with comment
- [ ] Approved timesheets cannot be edited by employee
- [ ] RBAC scoping: Employee sees own, Manager sees team, Admin sees all

---

## TASK 11 — Projects & Tasks APIs

**Objective:** Project and task management with progress tracking.

**Files Affected:**
- `backend/src/modules/projects/`
- `backend/src/modules/tasks/`

**Acceptance Criteria:**
- [ ] Manager/Admin can create/update/archive projects
- [ ] TL/Manager/Admin can create/assign/update tasks
- [ ] Employee can view assigned tasks and post progress updates
- [ ] Task progress_percentage updates on each task_update
- [ ] RBAC scoping enforced

---

## TASK 12 — Leave Management APIs

**Objective:** Leave types, leave requests, approval workflow, balance management.

**Files Affected:**
- `backend/src/modules/leave/`

**Acceptance Criteria:**
- [ ] Employee can apply for leave
- [ ] Balance checked before approval
- [ ] Manager/Admin can approve/reject with comment
- [ ] Approval deducts balance, rejection restores it
- [ ] Approved leave excluded from absence calculations
- [ ] Notification created on status change

---

## TASK 13 — Activity & Inactivity APIs

**Objective:** Activity heartbeat, idle detection, engagement prompts.

**Files Affected:**
- `backend/src/modules/activity/`
- `backend/src/modules/engagement/`
- `backend/src/services/scheduler/`

**Acceptance Criteria:**
- [ ] POST /api/activity/ping records activity (requires active attendance)
- [ ] LONG_IDLE exception created when threshold exceeded
- [ ] Engagement prompts created per configured interval
- [ ] Employee can respond to engagement prompt
- [ ] Responses stored with timing data

---

## TASK 14 — Notifications API

**Objective:** In-app notification creation and retrieval.

**Files Affected:**
- `backend/src/modules/notifications/`

**Acceptance Criteria:**
- [ ] GET /api/notifications returns unread + recent read
- [ ] POST /api/notifications/:id/read marks as read
- [ ] POST /api/notifications/read-all marks all as read
- [ ] NotificationService.create() usable from all other modules

---

## TASK 15 — Exception Engine

**Objective:** Automated attendance exception detection and management.

**Files Affected:**
- `backend/src/modules/exceptions/`
- `backend/src/services/scheduler/exceptionJob.ts`

**Acceptance Criteria:**
- [ ] Daily job detects MISSING_CHECKIN, MISSING_CHECKOUT, MISSING_TIMESHEET
- [ ] Check-in triggers LATE_CHECKIN detection
- [ ] Check-out triggers EARLY_CHECKOUT, TIMESHEET_MISMATCH detection
- [ ] Activity monitoring triggers LONG_IDLE
- [ ] Manager can review + resolve/dismiss exceptions
- [ ] Notifications created for new exceptions

---

## TASK 16 — Dashboard & KPI APIs

**Objective:** Real database-backed KPI calculations for all four dashboards.

**Files Affected:**
- `backend/src/modules/dashboard/`
- `backend/src/services/kpi/`

**Acceptance Criteria:**
- [ ] Employee dashboard returns live today's data
- [ ] Manager dashboard shows accurate team summary
- [ ] Admin dashboard shows org-wide metrics and chart data
- [ ] All KPI formulas match spec (no hardcoded values)
- [ ] Date range filters work (today/week/month/custom)

---

## TASK 17 — Reports & Export APIs

**Objective:** Report generation with CSV and Excel export.

**Files Affected:**
- `backend/src/modules/reports/`

**Acceptance Criteria:**
- [ ] All 6 report types generate correctly
- [ ] CSV export works
- [ ] Excel (XLSX) export works
- [ ] RBAC scoping applied (employees see own, managers see team)

---

## TASK 18 — Audit Logs & Settings APIs

**Files Affected:**
- `backend/src/modules/audit/`
- `backend/src/modules/settings/`

**Acceptance Criteria:**
- [ ] Admin can view paginated audit logs with filters
- [ ] Admin can view/update system settings
- [ ] Settings change creates audit log
- [ ] Employees cannot access audit logs (403)

---

## TASK 19 — Security Middleware & Health

**Files Affected:**
- `backend/src/middleware/`
- `backend/src/app.ts`

**Acceptance Criteria:**
- [ ] Helmet headers applied
- [ ] CORS configured
- [ ] Rate limiting applied globally + login
- [ ] GET /health returns 200
- [ ] GET /health/db returns DB connection status

---

## TASK 20 — Frontend: React + Vite + TypeScript Setup

**Files Affected:**
- `frontend/` (all setup files)

**Acceptance Criteria:**
- [ ] Vite dev server starts
- [ ] Tailwind CSS working
- [ ] Axios configured with base URL + interceptors
- [ ] React Router configured

---

## TASK 21 — Frontend: Auth Pages

**Files:**
- `frontend/src/pages/auth/LoginPage.tsx`
- `frontend/src/pages/auth/ForgotPasswordPage.tsx`
- `frontend/src/pages/auth/ResetPasswordPage.tsx`
- `frontend/src/contexts/AuthContext.tsx`

**Acceptance Criteria:**
- [ ] Login form with email/password, validation
- [ ] Successful login stores token and redirects by role
- [ ] Invalid credentials shows error
- [ ] Forgot password form works
- [ ] Protected routes redirect unauthenticated users

---

## TASK 22 — Frontend: Layout Components

**Files:**
- `frontend/src/components/layout/Sidebar.tsx`
- `frontend/src/components/layout/Header.tsx`
- `frontend/src/components/layout/AppLayout.tsx`
- `frontend/src/components/common/` (Button, Card, Badge, Modal, Table, Toast)

**Acceptance Criteria:**
- [ ] Role-based sidebar navigation
- [ ] Responsive (mobile sidebar toggle)
- [ ] Header shows user name, role, notifications bell
- [ ] Common components reusable across pages

---

## TASK 23 — Frontend: WebcamCapture Component

**Files:**
- `frontend/src/components/webcam/WebcamCapture.tsx`
- `frontend/src/components/webcam/PrivacyNotice.tsx`

**Acceptance Criteria:**
- [ ] Privacy notice shown before camera activation
- [ ] Camera permission request
- [ ] Live video preview
- [ ] Capture button takes photo (canvas.toBlob)
- [ ] Preview captured photo
- [ ] Retake / Confirm buttons
- [ ] Loading state while uploading
- [ ] Camera unavailable error state
- [ ] Permission denied error state
- [ ] File size validation (5 MB client-side)

---

## TASK 24 — Frontend: Employee Dashboard

**Files:**
- `frontend/src/pages/employee/DashboardPage.tsx`

**Acceptance Criteria:**
- [ ] Work mode selector
- [ ] Check-in status card
- [ ] Current duration (live updating)
- [ ] Quick action buttons (Start Work, Check Out, Add Timesheet, Update Task)
- [ ] Today's timesheet summary
- [ ] Assigned tasks with progress
- [ ] Leave balance cards
- [ ] Recent notifications

---

## TASK 25 — Frontend: Attendance Pages

**Files:**
- `frontend/src/pages/attendance/CheckInPage.tsx`
- `frontend/src/pages/attendance/CheckOutPage.tsx`
- `frontend/src/pages/attendance/AttendanceHistoryPage.tsx`

**Acceptance Criteria:**
- [ ] Check-in page: work mode select → webcam → submit
- [ ] Check-out page: webcam → submit
- [ ] History table with filters (date range, work mode, status)
- [ ] Pagination
- [ ] View attendance details + verification status

---

## TASK 26 — Frontend: Timesheet Pages

**Files:**
- `frontend/src/pages/timesheet/TimesheetListPage.tsx`
- `frontend/src/pages/timesheet/TimesheetFormPage.tsx`

**Acceptance Criteria:**
- [ ] List with filter by date/status
- [ ] Create/edit form with project+task selection, hours, description
- [ ] Submit for approval button
- [ ] Status badges
- [ ] Manager review UI (approve/reject with comment)

---

## TASK 27 — Frontend: Projects & Tasks Pages

**Files:**
- `frontend/src/pages/projects/ProjectsPage.tsx`
- `frontend/src/pages/tasks/TasksPage.tsx`
- `frontend/src/pages/tasks/TaskDetailPage.tsx`

**Acceptance Criteria:**
- [ ] Project list with status filters
- [ ] Task list with priority/status filters
- [ ] Task detail with progress update form
- [ ] Task update history timeline
- [ ] Manager/Admin: create/edit task modal

---

## TASK 28 — Frontend: Leave Pages

**Files:**
- `frontend/src/pages/leave/LeaveApplicationPage.tsx`
- `frontend/src/pages/leave/LeaveHistoryPage.tsx`
- `frontend/src/pages/leave/LeaveApprovalsPage.tsx`

**Acceptance Criteria:**
- [ ] Leave application form with date picker, type, reason
- [ ] Leave balance displayed
- [ ] My leave history with status
- [ ] Manager: team leave requests table with approve/reject
- [ ] Confirmation modal before action

---

## TASK 29 — Frontend: Manager Dashboard

**Files:**
- `frontend/src/pages/manager/ManagerDashboardPage.tsx`
- `frontend/src/pages/manager/TeamAttendancePage.tsx`
- `frontend/src/pages/manager/ExceptionsPage.tsx`

**Acceptance Criteria:**
- [ ] Summary cards (Present, Absent, WFH, On Leave, Late, etc.)
- [ ] Team attendance table with live data
- [ ] Exception list with review modal
- [ ] Pending leave requests section
- [ ] Filters: date, department, work mode

---

## TASK 30 — Frontend: Team Lead Dashboard

**Files:**
- `frontend/src/pages/teamlead/TeamLeadDashboardPage.tsx`

**Acceptance Criteria:**
- [ ] Shows only assigned team members
- [ ] Task progress overview
- [ ] Attendance for team
- [ ] Exception alerts
- [ ] No access to admin-level data

---

## TASK 31 — Frontend: Admin Dashboard & Management Pages

**Files:**
- `frontend/src/pages/admin/AdminDashboardPage.tsx`
- `frontend/src/pages/admin/EmployeesPage.tsx`
- `frontend/src/pages/admin/DepartmentsPage.tsx`
- `frontend/src/pages/admin/AuditLogsPage.tsx`

**Acceptance Criteria:**
- [ ] Global KPI cards
- [ ] Recharts charts (daily attendance, WFH vs Office, exceptions, task completion)
- [ ] Employee CRUD table
- [ ] Department management
- [ ] Audit log table with filters

---

## TASK 32 — Frontend: Reports & Export

**Files:**
- `frontend/src/pages/reports/ReportsPage.tsx`

**Acceptance Criteria:**
- [ ] Report type selector
- [ ] Date range + filters
- [ ] Data table preview
- [ ] Download CSV button
- [ ] Download Excel button
- [ ] RBAC (employees see own only)

---

## TASK 33 — Frontend: Notifications & Settings

**Files:**
- `frontend/src/pages/notifications/NotificationsPage.tsx`
- `frontend/src/pages/admin/SettingsPage.tsx`

**Acceptance Criteria:**
- [ ] Notification center with read/unread state
- [ ] Mark all read
- [ ] Admin settings form (organized by section)
- [ ] Settings save with confirmation

---

## TASK 34 — Docker Configuration

**Files:**
- `backend/Dockerfile`
- `frontend/Dockerfile`
- `docker-compose.yml`
- `.env.example`

**Acceptance Criteria:**
- [ ] `docker-compose up` starts all 4 services
- [ ] PostgreSQL persists data in volume
- [ ] Backend connects to DB and Redis
- [ ] Frontend served by Nginx
- [ ] Health checks configured

---

## TASK 35 — CI/CD GitHub Actions

**Files:**
- `.github/workflows/ci.yml`

**Acceptance Criteria:**
- [ ] Runs on push to main and PRs
- [ ] Steps: Install → Lint → Unit Tests → Build → Integration Tests → Docker Build

---

## TASK 36 — Test Suite

**Files:**
- `backend/tests/unit/`
- `backend/tests/integration/`
- `backend/tests/security/`

**Acceptance Criteria:**
- [ ] Unit tests: KPI calculations, duration, overtime, exceptions
- [ ] Integration tests: login, check-in, check-out, timesheet, leave
- [ ] Security tests: unauthorized access, role escalation, file upload validation
- [ ] All tests pass

---

## TASK 37 — README Documentation

**Files:**
- `README.md`

**Acceptance Criteria:**
- [ ] Project overview
- [ ] Architecture diagram
- [ ] Setup instructions
- [ ] Environment variables
- [ ] Migration + seed commands
- [ ] How to run (dev + Docker)
- [ ] API reference
- [ ] Test instructions
- [ ] Known limitations
