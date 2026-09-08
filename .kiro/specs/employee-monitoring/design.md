# Employee Attendance, Timesheet & Work Monitoring System
# Design Specification — V1

---

## 1. Architecture Overview

The system is built as a **modular monolith** with clean module boundaries that allow future migration to microservices. The architecture separates concerns into distinct layers: API, Service, Repository, and Database.

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                              │
│              React + TypeScript + Vite (Port 3000)              │
│   Tailwind CSS │ React Router │ Axios │ WebRTC MediaDevices API  │
└───────────────────────────┬─────────────────────────────────────┘
                            │ HTTPS / REST API
┌───────────────────────────▼─────────────────────────────────────┐
│                       API LAYER                                  │
│              Node.js + Express.js (Port 4000)                   │
│   JWT Auth │ RBAC Middleware │ Rate Limiting │ Helmet │ CORS    │
├─────────────────────────────────────────────────────────────────┤
│                     SERVICE LAYER                                │
│  AttendanceService │ TimesheetService │ LeaveService │           │
│  TaskService │ NotificationService │ ReportService │             │
│  ExceptionService │ KPIService │ StorageService │ AuditService   │
├─────────────────────────────────────────────────────────────────┤
│                   REPOSITORY LAYER                               │
│         Knex.js Query Builder + PostgreSQL Driver               │
├─────────────────────────────────────────────────────────────────┤
│                    DATA LAYER                                    │
│   PostgreSQL 15 (primary) │ Redis (sessions/cache) │            │
│   Local FS uploads/ (dev) │ S3-compatible (prod)               │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Technology Stack

### Backend
| Component | Technology | Version |
|---|---|---|
| Runtime | Node.js | 20 LTS |
| Framework | Express.js | 4.x |
| Language | TypeScript | 5.x |
| ORM/Query | Knex.js | 3.x |
| Database | PostgreSQL | 15 |
| Cache | Redis | 7 |
| Auth | JWT (jsonwebtoken) | 9.x |
| Password | bcrypt | 5.x |
| Validation | Zod | 3.x |
| File Upload | Multer | 1.x |
| Image Processing | Sharp | 0.33 |
| Excel Export | ExcelJS | 4.x |
| CSV Export | csv-stringify | 6.x |
| Scheduling | node-cron | 3.x |
| Logging | Pino | 8.x |
| Testing | Jest + Supertest | latest |
| Security | Helmet, cors, express-rate-limit | latest |

### Frontend
| Component | Technology | Version |
|---|---|---|
| Framework | React | 18.x |
| Language | TypeScript | 5.x |
| Build Tool | Vite | 5.x |
| Routing | React Router | 6.x |
| HTTP Client | Axios | 1.x |
| State Management | Zustand | 4.x |
| UI Styling | Tailwind CSS | 3.x |
| UI Components | Headless UI + custom | latest |
| Charts | Recharts | 2.x |
| Date Handling | date-fns | 3.x |
| Forms | React Hook Form + Zod | latest |
| Notifications | react-hot-toast | 2.x |
| Webcam | browser MediaDevices API (native) | — |
| Table | TanStack Table | 8.x |
| Excel Client | xlsx (SheetJS) | latest |

---

## 3. Project Structure

```
d:\timeshhet\
├── backend/
│   ├── src/
│   │   ├── config/           # DB, Redis, env config
│   │   ├── middleware/        # auth, rbac, validate, upload, rateLimit
│   │   ├── modules/
│   │   │   ├── auth/          # login, logout, refresh, reset
│   │   │   ├── users/         # employee CRUD
│   │   │   ├── departments/   # department CRUD
│   │   │   ├── workModes/     # work mode management
│   │   │   ├── attendance/    # check-in, check-out, history
│   │   │   ├── verifications/ # selfie upload, image serve
│   │   │   ├── timesheets/    # CRUD, submit, approve
│   │   │   ├── projects/      # project CRUD
│   │   │   ├── tasks/         # task CRUD + updates
│   │   │   ├── leave/         # requests, balances, approval
│   │   │   ├── activity/      # activity logs, idle tracking
│   │   │   ├── engagement/    # engagement prompts
│   │   │   ├── notifications/ # in-app notifications
│   │   │   ├── exceptions/    # attendance exception engine
│   │   │   ├── dashboard/     # KPI, metrics aggregation
│   │   │   ├── reports/       # report generation + export
│   │   │   ├── audit/         # audit log queries
│   │   │   └── settings/      # system settings
│   │   ├── services/          # shared service logic
│   │   │   ├── storage/       # file storage abstraction
│   │   │   ├── kpi/           # KPI calculation engine
│   │   │   └── scheduler/     # cron jobs
│   │   ├── utils/             # helpers, response builder
│   │   ├── types/             # TypeScript types
│   │   └── app.ts             # Express app
│   ├── migrations/            # Knex migrations
│   ├── seeds/                 # Knex seed data
│   ├── tests/
│   │   ├── unit/
│   │   ├── integration/
│   │   └── security/
│   ├── uploads/               # local selfie storage (dev)
│   ├── knexfile.ts
│   ├── package.json
│   ├── tsconfig.json
│   └── Dockerfile
│
├── frontend/
│   ├── src/
│   │   ├── api/               # Axios instances + API calls
│   │   ├── components/
│   │   │   ├── common/        # Button, Card, Table, Badge, Modal
│   │   │   ├── layout/        # Sidebar, Header, Layout
│   │   │   ├── webcam/        # WebcamCapture component
│   │   │   ├── charts/        # Chart wrappers
│   │   │   └── forms/         # FormField, Select, DatePicker
│   │   ├── contexts/          # AuthContext, SettingsContext
│   │   ├── hooks/             # useAuth, useAttendance, useNotifications
│   │   ├── pages/
│   │   │   ├── auth/          # Login, ForgotPassword, ResetPassword
│   │   │   ├── employee/      # Dashboard, Attendance, Timesheet, Tasks, Leave
│   │   │   ├── manager/       # Dashboard, Team, Exceptions, Reports
│   │   │   ├── teamlead/      # Dashboard, Team, Tasks
│   │   │   └── admin/         # Dashboard, Employees, Settings, Audit
│   │   ├── stores/            # Zustand stores
│   │   ├── types/             # TypeScript types
│   │   ├── utils/             # formatters, validators
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── public/
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   ├── package.json
│   ├── tsconfig.json
│   └── Dockerfile
│
├── .kiro/
│   └── specs/employee-monitoring/
│       ├── requirements.md
│       ├── design.md
│       └── tasks.md
│
├── .github/
│   └── workflows/
│       └── ci.yml
│
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## 4. Database Design

### 4.1 ER Diagram (Text Representation)

```
users ────────────────────────────────────────────────────────────
  │ PK: id                                                        │
  │ FK: role_id → roles.id                                        │
  │ FK: department_id → departments.id                            │
  │ FK: manager_id → users.id (self-ref)                          │
  │ FK: team_lead_id → users.id (self-ref)                        │
  │                                                               │
  ├──< attendance ──────────────────────────────────────────────  │
  │       │ FK: user_id → users.id                                │
  │       │ FK: work_mode_id → work_modes.id                      │
  │       │                                                        │
  │       └──< attendance_verifications                           │
  │                 FK: attendance_id → attendance.id             │
  │                 FK: user_id → users.id                        │
  │                                                               │
  ├──< timesheets                                                 │
  │       FK: user_id → users.id                                  │
  │       FK: attendance_id → attendance.id (nullable)            │
  │       FK: project_id → projects.id                            │
  │       FK: task_id → tasks.id (nullable)                       │
  │                                                               │
  ├──< task_updates                                               │
  │       FK: task_id → tasks.id                                  │
  │       FK: user_id → users.id                                  │
  │                                                               │
  ├──< leave_requests                                             │
  │       FK: user_id → users.id                                  │
  │       FK: leave_type_id → leave_types.id                      │
  │       FK: reviewed_by → users.id (nullable)                   │
  │                                                               │
  ├──< leave_balances                                             │
  │       FK: user_id → users.id                                  │
  │       FK: leave_type_id → leave_types.id                      │
  │                                                               │
  ├──< activity_logs                                              │
  │       FK: user_id → users.id                                  │
  │                                                               │
  ├──< engagement_prompts                                         │
  │       FK: user_id → users.id                                  │
  │       FK: attendance_id → attendance.id                       │
  │                                                               │
  ├──< notifications                                              │
  │       FK: user_id → users.id                                  │
  │                                                               │
  ├──< attendance_exceptions                                      │
  │       FK: user_id → users.id                                  │
  │       FK: attendance_id → attendance.id (nullable)            │
  │       FK: reviewed_by → users.id (nullable)                   │
  │                                                               │
  └──< audit_logs                                                 │
          FK: user_id → users.id                                  │
                                                                  │
projects ────────────────────────────────────────────────────────  │
  │ PK: id                                                        │
  └──< tasks                                                      │
          PK: id                                                   │
          FK: project_id → projects.id                            │
          FK: assigned_to → users.id ────────────────────────────-
```

### 4.2 Table Definitions

#### `roles`
| Column | Type | Constraints | Description |
|---|---|---|---|
| id | SERIAL | PK | Auto-increment ID |
| name | VARCHAR(50) | NOT NULL, UNIQUE | Role name: ADMIN, MANAGER, TEAM_LEAD, EMPLOYEE |
| description | TEXT | | Role description |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |

#### `departments`
| Column | Type | Constraints | Description |
|---|---|---|---|
| id | SERIAL | PK | |
| name | VARCHAR(100) | NOT NULL, UNIQUE | Department name |
| description | TEXT | | |
| status | VARCHAR(20) | NOT NULL, DEFAULT 'ACTIVE' | ACTIVE, INACTIVE |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |

#### `work_modes`
| Column | Type | Constraints | Description |
|---|---|---|---|
| id | SERIAL | PK | |
| code | VARCHAR(20) | NOT NULL, UNIQUE | OFFICE, WFH, HYBRID |
| name | VARCHAR(50) | NOT NULL | Display name |
| description | TEXT | | |
| status | VARCHAR(20) | NOT NULL, DEFAULT 'ACTIVE' | |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |

#### `users`
| Column | Type | Constraints | Description |
|---|---|---|---|
| id | SERIAL | PK | |
| employee_code | VARCHAR(20) | NOT NULL, UNIQUE | EMP-001 format |
| first_name | VARCHAR(100) | NOT NULL | |
| last_name | VARCHAR(100) | NOT NULL | |
| email | VARCHAR(255) | NOT NULL, UNIQUE | Login email |
| phone | VARCHAR(20) | | |
| password_hash | VARCHAR(255) | NOT NULL | bcrypt hash |
| role_id | INTEGER | NOT NULL, FK → roles.id | |
| department_id | INTEGER | FK → departments.id | |
| manager_id | INTEGER | FK → users.id | |
| team_lead_id | INTEGER | FK → users.id | |
| joining_date | DATE | | |
| status | VARCHAR(20) | NOT NULL, DEFAULT 'ACTIVE' | ACTIVE, INACTIVE, SUSPENDED |
| refresh_token_hash | VARCHAR(255) | | Hashed refresh token |
| password_reset_token | VARCHAR(255) | | |
| password_reset_expires | TIMESTAMPTZ | | |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |

**Indexes:** email, employee_code, role_id, department_id, manager_id, status

#### `attendance`
| Column | Type | Constraints | Description |
|---|---|---|---|
| id | SERIAL | PK | |
| user_id | INTEGER | NOT NULL, FK → users.id | |
| attendance_date | DATE | NOT NULL | UTC date |
| work_mode_id | INTEGER | NOT NULL, FK → work_modes.id | |
| check_in_time | TIMESTAMPTZ | NOT NULL | Server-generated |
| check_out_time | TIMESTAMPTZ | | Server-generated on checkout |
| total_work_minutes | INTEGER | DEFAULT 0 | Calculated on checkout |
| regular_work_minutes | INTEGER | DEFAULT 0 | min(total, standard_minutes) |
| overtime_minutes | INTEGER | DEFAULT 0 | max(0, total - standard) |
| status | VARCHAR(30) | NOT NULL, DEFAULT 'CHECKED_IN' | CHECKED_IN, CHECKED_OUT, INCOMPLETE, ABSENT |
| check_in_ip | VARCHAR(50) | | |
| check_out_ip | VARCHAR(50) | | |
| check_in_user_agent | TEXT | | |
| check_out_user_agent | TEXT | | |
| check_in_device | VARCHAR(100) | | |
| check_out_device | VARCHAR(100) | | |
| session_id | UUID | UNIQUE | UUID v4 per session |
| notes | TEXT | | Admin notes |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |

**Constraints:**
- UNIQUE(user_id, attendance_date) — prevents duplicate active attendance
- CHECK: check_out_time > check_in_time (when not null)

**Indexes:** user_id, attendance_date, status, work_mode_id

#### `attendance_verifications`
| Column | Type | Constraints | Description |
|---|---|---|---|
| id | SERIAL | PK | |
| attendance_id | INTEGER | NOT NULL, FK → attendance.id | |
| user_id | INTEGER | NOT NULL, FK → users.id | |
| verification_type | VARCHAR(20) | NOT NULL | CHECK_IN, CHECK_OUT, RANDOM_CHECK |
| verification_method | VARCHAR(30) | NOT NULL, DEFAULT 'SELFIE' | SELFIE (V1), FACE_RECOGNITION (future) |
| image_path | VARCHAR(500) | | Storage path or S3 key |
| image_hash | VARCHAR(64) | | SHA-256 hex |
| captured_at | TIMESTAMPTZ | NOT NULL | Server timestamp |
| server_timestamp | TIMESTAMPTZ | NOT NULL | Authoritative time |
| ip_address | VARCHAR(50) | | |
| user_agent | TEXT | | |
| device_information | JSONB | | |
| verification_status | VARCHAR(20) | NOT NULL, DEFAULT 'VERIFIED' | VERIFIED, FAILED, PENDING |
| failure_reason | TEXT | | |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |

**Indexes:** attendance_id, user_id, verification_type, verification_status

#### `projects`
| Column | Type | Constraints | Description |
|---|---|---|---|
| id | SERIAL | PK | |
| project_code | VARCHAR(20) | NOT NULL, UNIQUE | PRJ-001 |
| name | VARCHAR(200) | NOT NULL | |
| description | TEXT | | |
| client_name | VARCHAR(200) | | |
| start_date | DATE | | |
| end_date | DATE | | |
| status | VARCHAR(20) | NOT NULL, DEFAULT 'ACTIVE' | ACTIVE, COMPLETED, ON_HOLD, ARCHIVED |
| created_by | INTEGER | FK → users.id | |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |

#### `tasks`
| Column | Type | Constraints | Description |
|---|---|---|---|
| id | SERIAL | PK | |
| project_id | INTEGER | NOT NULL, FK → projects.id | |
| assigned_to | INTEGER | FK → users.id | |
| assigned_by | INTEGER | FK → users.id | |
| name | VARCHAR(300) | NOT NULL | |
| description | TEXT | | |
| priority | VARCHAR(20) | NOT NULL, DEFAULT 'MEDIUM' | LOW, MEDIUM, HIGH, CRITICAL |
| estimated_hours | DECIMAL(6,2) | | |
| due_date | DATE | | |
| status | VARCHAR(20) | NOT NULL, DEFAULT 'TODO' | TODO, IN_PROGRESS, BLOCKED, COMPLETED, CANCELLED |
| progress_percentage | INTEGER | DEFAULT 0, CHECK 0-100 | |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |

**Indexes:** project_id, assigned_to, status, priority

#### `task_updates`
| Column | Type | Constraints | Description |
|---|---|---|---|
| id | SERIAL | PK | |
| task_id | INTEGER | NOT NULL, FK → tasks.id | |
| user_id | INTEGER | NOT NULL, FK → users.id | |
| progress_percentage | INTEGER | CHECK 0-100 | |
| work_update | TEXT | NOT NULL | |
| time_spent | DECIMAL(6,2) | | Hours spent |
| remaining_work | TEXT | | |
| blocker | TEXT | | |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |

#### `timesheets`
| Column | Type | Constraints | Description |
|---|---|---|---|
| id | SERIAL | PK | |
| user_id | INTEGER | NOT NULL, FK → users.id | |
| attendance_id | INTEGER | FK → attendance.id | Optional link |
| date | DATE | NOT NULL | |
| project_id | INTEGER | NOT NULL, FK → projects.id | |
| task_id | INTEGER | FK → tasks.id | |
| start_time | TIME | | |
| end_time | TIME | | |
| hours | DECIMAL(5,2) | NOT NULL, CHECK > 0 | |
| overtime_hours | DECIMAL(5,2) | DEFAULT 0 | |
| description | TEXT | NOT NULL | |
| comment | TEXT | | Manager comment on review |
| is_billable | BOOLEAN | DEFAULT true | |
| status | VARCHAR(20) | NOT NULL, DEFAULT 'DRAFT' | DRAFT, SUBMITTED, APPROVED, REJECTED |
| reviewed_by | INTEGER | FK → users.id | |
| reviewed_at | TIMESTAMPTZ | | |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |

**Indexes:** user_id, date, project_id, status

#### `leave_types`
| Column | Type | Constraints | Description |
|---|---|---|---|
| id | SERIAL | PK | |
| name | VARCHAR(100) | NOT NULL, UNIQUE | Annual, Sick, Casual, Unpaid |
| description | TEXT | | |
| annual_limit | DECIMAL(5,1) | NOT NULL | |
| is_paid | BOOLEAN | DEFAULT true | |
| status | VARCHAR(20) | NOT NULL, DEFAULT 'ACTIVE' | |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |

#### `leave_balances`
| Column | Type | Constraints | Description |
|---|---|---|---|
| id | SERIAL | PK | |
| user_id | INTEGER | NOT NULL, FK → users.id | |
| leave_type_id | INTEGER | NOT NULL, FK → leave_types.id | |
| year | INTEGER | NOT NULL | Calendar year |
| allocated_days | DECIMAL(5,1) | NOT NULL | |
| used_days | DECIMAL(5,1) | DEFAULT 0 | |
| remaining_days | DECIMAL(5,1) | Generated/computed | |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |

**Constraints:** UNIQUE(user_id, leave_type_id, year)

#### `leave_requests`
| Column | Type | Constraints | Description |
|---|---|---|---|
| id | SERIAL | PK | |
| user_id | INTEGER | NOT NULL, FK → users.id | |
| leave_type_id | INTEGER | NOT NULL, FK → leave_types.id | |
| start_date | DATE | NOT NULL | |
| end_date | DATE | NOT NULL | |
| total_days | DECIMAL(5,1) | NOT NULL | |
| reason | TEXT | NOT NULL | |
| attachment_path | VARCHAR(500) | | |
| status | VARCHAR(20) | NOT NULL, DEFAULT 'PENDING' | PENDING, APPROVED, REJECTED, CANCELLED |
| reviewed_by | INTEGER | FK → users.id | |
| reviewed_at | TIMESTAMPTZ | | |
| review_comment | TEXT | | |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |

#### `activity_logs`
| Column | Type | Constraints | Description |
|---|---|---|---|
| id | BIGSERIAL | PK | |
| user_id | INTEGER | NOT NULL, FK → users.id | |
| attendance_id | INTEGER | FK → attendance.id | |
| activity_type | VARCHAR(50) | NOT NULL | MOUSE_MOVE, KEYBOARD, IDLE_START, IDLE_END, ENGAGEMENT_RESPONSE, PAGE_FOCUS, PAGE_BLUR |
| metadata | JSONB | | Additional details |
| timestamp | TIMESTAMPTZ | NOT NULL | |
| ip_address | VARCHAR(50) | | |
| device_information | JSONB | | |

**Indexes:** user_id, attendance_id, activity_type, timestamp

#### `engagement_prompts`
| Column | Type | Constraints | Description |
|---|---|---|---|
| id | SERIAL | PK | |
| user_id | INTEGER | NOT NULL, FK → users.id | |
| attendance_id | INTEGER | NOT NULL, FK → attendance.id | |
| prompt_time | TIMESTAMPTZ | NOT NULL | When prompt was shown |
| response_time | TIMESTAMPTZ | | When employee responded |
| response | VARCHAR(30) | | WORKING, BREAK, AWAY |
| response_duration_seconds | INTEGER | | |
| status | VARCHAR(20) | NOT NULL, DEFAULT 'PENDING' | PENDING, RESPONDED, TIMEOUT |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |

#### `notifications`
| Column | Type | Constraints | Description |
|---|---|---|---|
| id | SERIAL | PK | |
| user_id | INTEGER | NOT NULL, FK → users.id | |
| type | VARCHAR(50) | NOT NULL | CHECKIN_REMINDER, CHECKOUT_REMINDER, TIMESHEET_REMINDER, LEAVE_STATUS, TASK_ASSIGNED, TASK_DUE, ATTENDANCE_EXCEPTION, LEAVE_REQUEST, TIMESHEET_SUBMITTED |
| title | VARCHAR(200) | NOT NULL | |
| message | TEXT | NOT NULL | |
| entity_type | VARCHAR(50) | | attendance, leave, task, timesheet |
| entity_id | INTEGER | | |
| is_read | BOOLEAN | DEFAULT false | |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| read_at | TIMESTAMPTZ | | |

**Indexes:** user_id, is_read, created_at

#### `attendance_exceptions`
| Column | Type | Constraints | Description |
|---|---|---|---|
| id | SERIAL | PK | |
| user_id | INTEGER | NOT NULL, FK → users.id | |
| attendance_id | INTEGER | FK → attendance.id | |
| exception_type | VARCHAR(30) | NOT NULL | LATE_CHECKIN, EARLY_CHECKOUT, MISSING_CHECKOUT, MISSING_CHECKIN, LONG_IDLE, MISSING_SELFIE, TIMESHEET_MISMATCH, MISSING_TIMESHEET |
| severity | VARCHAR(10) | NOT NULL | LOW, MEDIUM, HIGH |
| description | TEXT | NOT NULL | |
| status | VARCHAR(20) | NOT NULL, DEFAULT 'OPEN' | OPEN, UNDER_REVIEW, RESOLVED, DISMISSED |
| reviewed_by | INTEGER | FK → users.id | |
| reviewed_at | TIMESTAMPTZ | | |
| review_comment | TEXT | | |
| exception_date | DATE | NOT NULL | |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |

**Indexes:** user_id, exception_type, status, exception_date

#### `audit_logs`
| Column | Type | Constraints | Description |
|---|---|---|---|
| id | BIGSERIAL | PK | |
| user_id | INTEGER | FK → users.id | Who performed the action |
| action | VARCHAR(50) | NOT NULL | See audit action list |
| entity_type | VARCHAR(50) | | Type of entity affected |
| entity_id | INTEGER | | ID of entity affected |
| old_value | JSONB | | Previous state |
| new_value | JSONB | | New state |
| ip_address | VARCHAR(50) | | |
| user_agent | TEXT | | |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |

**Indexes:** user_id, action, entity_type, created_at

#### `system_settings`
| Column | Type | Constraints | Description |
|---|---|---|---|
| id | SERIAL | PK | |
| setting_key | VARCHAR(100) | NOT NULL, UNIQUE | |
| setting_value | TEXT | NOT NULL | |
| description | TEXT | | |
| updated_by | INTEGER | FK → users.id | |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |

---

## 5. Role Permission Matrix

```
Permission                  EMPLOYEE   TEAM_LEAD   MANAGER   ADMIN
──────────────────────────────────────────────────────────────────
Own Attendance                 YES        YES         YES      YES
Team Attendance                 NO        YES         YES      YES
All Attendance                  NO         NO          NO      YES
Override Attendance             NO         NO          NO      YES

Own Timesheet                  YES        YES         YES      YES
Team Timesheet                  NO        YES         YES      YES
All Timesheet                   NO         NO          NO      YES
Approve Timesheet               NO    LIMITED         YES      YES

Own Tasks                      YES        YES         YES      YES
Assign Tasks                    NO        YES         YES      YES
View Team Tasks                 NO        YES         YES      YES

Leave Apply                    YES        YES         YES      YES
Leave Approve (team)            NO    LIMITED         YES      YES
Leave Approve (all)             NO         NO          NO      YES

Own Dashboard                  YES        YES         YES      YES
Team Dashboard                  NO        YES         YES      YES
Admin Dashboard                 NO         NO          NO      YES

View Own Selfie                YES        YES         YES      YES
View Team Selfie                NO        YES         YES      YES
View All Selfies                NO         NO          NO      YES

Reports (own)                  YES        YES         YES      YES
Reports (team)                  NO        YES         YES      YES
Reports (all)                   NO         NO          NO      YES

User Management                 NO         NO          NO      YES
Department Management           NO         NO          NO      YES
Settings                        NO         NO     LIMITED      YES
Audit Logs                      NO         NO          NO      YES
Role Management                 NO         NO          NO      YES

Activity Logs (own)            YES        YES         YES      YES
Activity Logs (team)            NO        YES         YES      YES
```

---

## 6. API Design

### 6.1 Base URL
```
Development:  http://localhost:4000/api
Production:   https://api.yourdomain.com/api
```

### 6.2 Response Format
```json
// Success
{
  "success": true,
  "message": "Operation successful.",
  "data": {},
  "meta": { "page": 1, "limit": 20, "total": 100 }
}

// Error
{
  "success": false,
  "message": "Employee is already checked in.",
  "errorCode": "ATTENDANCE_ALREADY_ACTIVE"
}
```

### 6.3 HTTP Status Codes
| Code | Meaning |
|---|---|
| 200 | OK |
| 201 | Created |
| 400 | Bad Request / Validation error |
| 401 | Unauthorized (no/invalid JWT) |
| 403 | Forbidden (RBAC) |
| 404 | Not Found |
| 409 | Conflict (duplicate) |
| 422 | Unprocessable Entity |
| 429 | Too Many Requests |
| 500 | Internal Server Error |

### 6.4 Endpoint List

#### Authentication
```
POST   /api/auth/login                     Public
POST   /api/auth/logout                    Auth
GET    /api/auth/me                        Auth
POST   /api/auth/refresh                   Public (refresh token)
POST   /api/auth/forgot-password           Public
POST   /api/auth/reset-password            Public
```

#### Users / Employees
```
GET    /api/users                          Admin
POST   /api/users                          Admin
GET    /api/users/:id                      Admin | own
PUT    /api/users/:id                      Admin | own (limited)
PATCH  /api/users/:id/deactivate           Admin
GET    /api/users/me/profile               Auth
PUT    /api/users/me/profile               Auth
```

#### Departments
```
GET    /api/departments                    Auth
POST   /api/departments                    Admin
PUT    /api/departments/:id               Admin
PATCH  /api/departments/:id/status        Admin
```

#### Work Modes
```
GET    /api/work-modes                     Auth
POST   /api/work-modes                     Admin
PUT    /api/work-modes/:id                Admin
```

#### Attendance
```
POST   /api/attendance/check-in            Employee (multipart/form-data with selfie)
POST   /api/attendance/check-out           Employee (multipart/form-data with selfie)
GET    /api/attendance/today               Auth
GET    /api/attendance/history             Auth (own) | Manager (team) | Admin (all)
GET    /api/attendance/:id                 Auth (own) | Manager | Admin
PUT    /api/attendance/:id                 Admin (override)
GET    /api/attendance/team                Manager | TL | Admin
```

#### Verifications / Selfie
```
GET    /api/attendance/:id/verifications           Auth (own) | Manager | Admin
GET    /api/verifications/:id/image                Auth (own) | Manager | Admin
```

#### Timesheets
```
GET    /api/timesheets                     Auth (scoped by role)
POST   /api/timesheets                     Auth
GET    /api/timesheets/:id                 Auth (own) | Manager | Admin
PUT    /api/timesheets/:id                 Auth (own, DRAFT/REJECTED only)
DELETE /api/timesheets/:id                 Auth (own, DRAFT only)
POST   /api/timesheets/:id/submit          Auth (own)
POST   /api/timesheets/:id/approve         Manager | TL | Admin
POST   /api/timesheets/:id/reject          Manager | TL | Admin
```

#### Projects
```
GET    /api/projects                       Auth
POST   /api/projects                       Manager | Admin
GET    /api/projects/:id                   Auth
PUT    /api/projects/:id                   Manager | Admin
PATCH  /api/projects/:id/status            Manager | Admin
```

#### Tasks
```
GET    /api/tasks                          Auth (scoped)
POST   /api/tasks                          TL | Manager | Admin
GET    /api/tasks/:id                      Auth (own/team)
PUT    /api/tasks/:id                      TL | Manager | Admin
POST   /api/tasks/:id/progress             Auth (assigned employee, TL, Manager)
GET    /api/tasks/:id/updates              Auth (own/team)
```

#### Leave
```
POST   /api/leave/request                  Auth
GET    /api/leave/my                       Auth
GET    /api/leave/team                     TL | Manager | Admin
GET    /api/leave/balance                  Auth
POST   /api/leave/:id/approve              TL (limited) | Manager | Admin
POST   /api/leave/:id/reject               TL (limited) | Manager | Admin
POST   /api/leave/:id/cancel               Auth (own, PENDING only)
GET    /api/leave/types                    Auth
```

#### Activity
```
POST   /api/activity/ping                  Auth (heartbeat from client)
GET    /api/activity/my                    Auth
GET    /api/activity/team                  TL | Manager | Admin
```

#### Engagement
```
GET    /api/engagement/current             Auth
POST   /api/engagement/:id/respond        Auth
```

#### Notifications
```
GET    /api/notifications                  Auth
POST   /api/notifications/:id/read        Auth
POST   /api/notifications/read-all        Auth
DELETE /api/notifications/:id              Auth
```

#### Exceptions
```
GET    /api/exceptions                     Manager | TL | Admin
GET    /api/exceptions/my                  Auth
GET    /api/exceptions/:id                 Auth (own/manager/admin)
POST   /api/exceptions/:id/review         Manager | Admin
```

#### Dashboard
```
GET    /api/dashboard/employee             Auth
GET    /api/dashboard/manager              Manager | Admin
GET    /api/dashboard/teamlead             TL | Manager | Admin
GET    /api/dashboard/admin                Admin
GET    /api/dashboard/kpi                  Manager | Admin
```

#### Reports
```
GET    /api/reports/attendance             Auth (scoped)
GET    /api/reports/timesheet              Auth (scoped)
GET    /api/reports/monthly                Auth (scoped)
GET    /api/reports/team-performance       Manager | Admin
GET    /api/reports/leave                  Auth (scoped)
GET    /api/reports/exceptions             Manager | Admin
GET    /api/reports/export                 Auth (CSV/Excel, scoped)
```

#### Audit Logs
```
GET    /api/audit-logs                     Admin
GET    /api/audit-logs/:id                 Admin
```

#### Settings
```
GET    /api/settings                       Auth (public settings) | Admin (all)
PUT    /api/settings                       Admin
```

#### Health
```
GET    /health                             Public
GET    /health/db                          Public
```

---

## 7. Authentication Flow

```
CLIENT                              SERVER
  │                                   │
  │─── POST /api/auth/login ─────────►│
  │    { email, password }             │ validate credentials
  │                                   │ check user status
  │                                   │ generate access_token (8h)
  │                                   │ generate refresh_token (7d)
  │                                   │ store hash of refresh_token
  │                                   │ create audit log
  │◄── { access_token,                │
  │      refresh_token, user } ───────│
  │                                   │
  │─── API Request                    │
  │    Authorization: Bearer <token>  │ verify JWT signature
  │                                   │ check expiry
  │                                   │ attach user to req
  │                                   │ check RBAC
  │◄── Response ──────────────────────│
  │                                   │
  │─── POST /api/auth/refresh ────────│
  │    { refresh_token }               │ verify refresh token hash
  │                                   │ issue new access_token
  │◄── { access_token } ─────────────│
```

---

## 8. Webcam Check-In/Out Flow

```
BROWSER                             SERVER
  │                                   │
  │ Employee clicks "Start Work"       │
  │                                   │
  │ Privacy Notice Modal              │
  │ [User accepts]                    │
  │                                   │
  │ navigator.mediaDevices            │
  │   .getUserMedia({video: front})   │
  │                                   │
  │ Live preview in <video> element   │
  │                                   │
  │ Employee captures frame           │
  │ (canvas.toBlob())                 │
  │                                   │
  │ Preview captured image            │
  │ [Retake] or [Confirm]             │
  │                                   │
  │ If confirmed:                     │
  │   FormData { selfie, work_mode }  │
  │─── POST /api/attendance/check-in ►│
  │    multipart/form-data            │ validate JWT
  │                                   │ check no active session
  │                                   │ validate file (MIME/size/sig)
  │                                   │ generate UUID filename
  │                                   │ calculate SHA-256 hash
  │                                   │ store file
  │                                   │ BEGIN TRANSACTION
  │                                   │   create attendance (server ts)
  │                                   │   create verification record
  │                                   │   create audit log
  │                                   │   check late-checkin exception
  │                                   │ COMMIT
  │◄── { success, attendance } ───────│
  │                                   │
  │ Dashboard shows: Checked In ✓     │
```

---

## 9. KPI Calculation Engine

All KPIs are calculated from live database queries. No caching of KPI values.

```typescript
// Attendance Rate
attendanceRate = (presentDays / expectedWorkingDays) * 100

// Expected working days excludes:
// - Weekends (Saturday, Sunday by default)
// - Approved leave days
// - Public holidays (future: configurable holiday calendar)

// On-Time Check-In Rate
onTimeRate = (onTimeCheckIns / totalCheckIns) * 100
// on-time = check_in_time <= (standard_start_time + grace_period_minutes)

// WFH Rate
wfhRate = (wfhDays / totalPresentDays) * 100

// Timesheet Completion
timesheetCompletion = (daysWithSubmittedTimesheet / totalPresentDays) * 100

// Task Completion
taskCompletion = (completedTasks / assignedTasks) * 100

// Verification Completion
verificationCompletion = (successfulVerifications / expectedVerifications) * 100
// expectedVerifications = checkins + checkouts

// Exception Rate
exceptionRate = (totalExceptions / totalAttendanceRecords) * 100

// Overtime
overtimeMinutes = max(0, totalWorkMinutes - standardWorkMinutes)
```

---

## 10. Exception Detection Engine

Runs as a scheduled job (daily at 23:30) and also triggered on check-out:

```
DAILY JOB:
  For each active employee:
    1. Check MISSING_CHECKIN: no attendance record today (not on approved leave)
    2. Check MISSING_CHECKOUT: attendance.status = CHECKED_IN (no check-out by 23:30)
    3. Check MISSING_TIMESHEET: worked today but no submitted timesheet

ON CHECK-IN:
    4. Check LATE_CHECKIN: check_in_time > standard_start + grace_period

ON CHECK-OUT:
    5. Check EARLY_CHECKOUT: check_out_time < standard_end - grace_period
    6. Check TIMESHEET_MISMATCH: |attendance_duration - timesheet_hours| > threshold

CONTINUOUS (during active session):
    7. Check LONG_IDLE: no activity ping for > idle_threshold_minutes

SEVERITY MAPPING:
  LATE_CHECKIN         → LOW (if < 30 min late) | MEDIUM (30-60) | HIGH (> 60)
  EARLY_CHECKOUT       → LOW (if < 30 min early) | MEDIUM | HIGH
  MISSING_CHECKOUT     → HIGH
  MISSING_CHECKIN      → HIGH
  LONG_IDLE            → LOW (first occurrence) | MEDIUM (repeated)
  MISSING_SELFIE       → MEDIUM
  TIMESHEET_MISMATCH   → MEDIUM
  MISSING_TIMESHEET    → MEDIUM
```

---

## 11. Storage Service Abstraction

```typescript
interface StorageService {
  upload(file: Buffer, filename: string, mimetype: string): Promise<StorageResult>
  getSignedUrl(path: string): Promise<string>
  delete(path: string): Promise<void>
  exists(path: string): Promise<boolean>
}

// V1: LocalStorageService (writes to uploads/)
// Production: S3StorageService (AWS S3 / MinIO)
// Selected via STORAGE_PROVIDER env var
```

Files are:
1. Validated (MIME, extension, file signature, size)
2. Renamed to UUID-based filename
3. SHA-256 hashed
4. Stored via StorageService
5. Path/key saved in `attendance_verifications.image_path`

Selfie access:
```
GET /api/verifications/:id/image
  → Verifies JWT + RBAC
  → Reads image from storage
  → Streams with appropriate Content-Type header
  → Never returns a public URL
```

---

## 12. Frontend Architecture

### Routing Structure
```
/login                          Public
/forgot-password               Public
/reset-password/:token         Public

/dashboard                     Auth (role-based component)
/attendance                    Auth
/attendance/check-in           Employee
/attendance/check-out          Employee
/attendance/history            Auth

/timesheet                     Auth
/timesheet/new                 Employee, TL, Manager
/timesheet/:id                 Auth

/projects                      Auth
/projects/:id                  Auth
/tasks                         Auth
/tasks/:id                     Auth

/leave                         Auth
/leave/apply                   Employee, TL, Manager
/leave/requests                Manager, TL, Admin

/team/attendance               Manager, TL
/team/timesheets               Manager, TL
/team/tasks                    Manager, TL
/team/exceptions               Manager, TL, Admin

/admin/employees               Admin
/admin/departments             Admin
/admin/roles                   Admin
/admin/projects                Admin
/admin/reports                 Admin, Manager
/admin/settings                Admin
/admin/audit-logs              Admin

/notifications                 Auth
/profile                       Auth
```

### State Management (Zustand stores)
```
authStore        → user, tokens, login/logout actions
attendanceStore  → today's attendance, check-in/out state
notificationStore → notifications, unread count
settingsStore    → system settings (timezone, org name, etc.)
```

---

## 13. Security Implementation

### JWT
- Access token: 8h expiry, HS256 signed with JWT_SECRET
- Refresh token: 7d expiry, stored as bcrypt hash in DB
- Token stored in memory (access) + httpOnly cookie (refresh) or localStorage (configurable)

### Rate Limiting
```
Global:          100 req / 15 min / IP
Login:           10 req / 15 min / IP
File Upload:     20 req / 15 min / IP
```

### Input Validation
All request bodies validated with Zod schemas before reaching service layer.

### File Security
```
Allowed types: image/jpeg, image/png, image/webp
Allowed extensions: .jpg, .jpeg, .png, .webp
Max size: 5 MB
File signature check: FF D8 FF (JPEG), 89 50 4E 47 (PNG), 52 49 46 46 (WEBP)
Filename: UUID v4 + original extension
Storage: Non-public directory, requires auth to access
```

---

## 14. Future Architecture Extension Points

### V2 Extensions (prepared but disabled)
```typescript
// verification_method field in attendance_verifications
// Possible future values: FACE_RECOGNITION, LIVENESS, OTP, DEVICE
type VerificationMethod = 'SELFIE' | 'FACE_RECOGNITION' | 'LIVENESS' | 'OTP' | 'DEVICE'

// Interface for verification providers
interface VerificationProvider {
  verify(image: Buffer, userId: number): Promise<VerificationResult>
}

// random_verification_enabled system setting (default: false)
// Architecture ready, feature disabled in V1
```

### V3 Extensions (architecture prepared)
```
PayrollService interface — attendance + timesheet → payroll hours
MobileVerificationService — React Native webcam wrapper
AnalyticsService — ML productivity scoring service boundary
```

---

## 15. Docker Architecture

```
docker-compose.yml services:
  backend      → Node.js (port 4000)
  frontend     → Nginx serving React build (port 3000)
  postgres     → PostgreSQL 15 (port 5432)
  redis        → Redis 7 (port 6379)

Volumes:
  postgres_data → PostgreSQL data persistence
  redis_data    → Redis data persistence
  uploads       → Selfie file storage
```

---

## 16. Environment Variables

```env
# Server
NODE_ENV=development
PORT=4000
FRONTEND_URL=http://localhost:3000

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/eatwms
DB_HOST=localhost
DB_PORT=5432
DB_NAME=eatwms
DB_USER=eatwms_user
DB_PASSWORD=your_secure_password

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-jwt-secret-min-32-chars
JWT_EXPIRES_IN=8h
REFRESH_TOKEN_SECRET=your-refresh-secret-min-32-chars
REFRESH_TOKEN_EXPIRES_IN=7d

# Storage
STORAGE_PROVIDER=local        # local | s3
UPLOAD_DIR=./uploads
S3_BUCKET=eatwms-uploads
S3_REGION=ap-south-1
S3_ACCESS_KEY=
S3_SECRET_KEY=
S3_ENDPOINT=                  # For MinIO

# App
DEFAULT_TIMEZONE=Asia/Kolkata
MAX_FILE_SIZE_MB=5
BCRYPT_ROUNDS=12
```
