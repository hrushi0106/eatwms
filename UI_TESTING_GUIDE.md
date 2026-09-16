# UI Testing Guide — Employee Attendance & Timesheet System

> **Prepared by:** Team Leader  
> **Date:** September 16, 2026  
> **System:** EvoluXion Software Solutions — Employee Attendance & Timesheet System  
> **Frontend URL:** http://localhost:5173 (dev) | https://your-domain.com (prod)

---

## 📋 Table of Contents

1. [User Roles & Test Accounts](#user-roles--test-accounts)
2. [Auth Screens](#1-auth-screens)
3. [Employee Screens](#2-employee-screens)
4. [Manager Screens](#3-manager-screens)
5. [Team Lead Screens](#4-team-lead-screens)
6. [Admin Screens](#5-admin-screens)
7. [Shared Screens (All Roles)](#6-shared-screens-all-roles)
8. [Testing Checklist](#testing-checklist)

---

## User Roles & Test Accounts

| Role | Email | Password | Access Level |
|------|-------|----------|--------------|
| **Admin** | admin@company.com | Admin@123 | Full access |
| **Manager** | manager@company.com | Manager@123 | Manager + Employee screens |
| **Team Lead** | teamlead@company.com | Lead@123 | Team Lead + Employee screens |
| **Employee** | employee@company.com | Employee@123 | Employee screens only |

> ⚠️ Dev credentials are visible on the Login page only in development mode.

---

## 1. Auth Screens

### 1.1 Login Page
**URL:** `/login`  
**Access:** Public (unauthenticated)

**What to see:**
- Centered card on a blue-to-white gradient background
- Company logo at the top (`/logo.svg`)
- Subtitle: "Employee Attendance & Timesheet System"
- Email field with placeholder `you@company.com`
- Password field with show/hide toggle eye icon
- "Forgot password?" link (right-aligned)
- "Sign In" primary button (full width)
- In DEV mode: blue info box showing all 4 test credentials

**Things to test:**
- [ ] Submit empty form → both fields show inline red error messages
- [ ] Invalid email format → "Enter a valid email address" under email
- [ ] Wrong credentials → red error banner appears inside the card + toast notification
- [ ] Correct credentials → redirects to the appropriate dashboard based on role
- [ ] Password visibility toggle works
- [ ] "Forgot password?" navigates to `/forgot-password`
- [ ] Loading spinner shows inside button during submission
- [ ] Already logged-in user visiting `/login` → redirects to dashboard

---

### 1.2 Forgot Password Page
**URL:** `/forgot-password`  
**Access:** Public

**What to see:**
- Similar card layout to Login
- Single email input field
- "Send Reset Link" button
- Link back to Login

**Things to test:**
- [ ] Submit empty → validation error on email
- [ ] Valid email → success message shown
- [ ] Invalid email format → inline error
- [ ] Back to login link works

---

### 1.3 Reset Password Page
**URL:** `/reset-password/:token`  
**Access:** Public (via email link)

**What to see:**
- New password + confirm password fields
- Submit button

**Things to test:**
- [ ] Password mismatch → error message
- [ ] Weak password → validation error
- [ ] Valid token + valid password → success redirect to login
- [ ] Invalid/expired token → error message

---

## 2. Employee Screens

> Login as: `employee@company.com` / `Employee@123`

### 2.1 Employee Dashboard
**URL:** `/dashboard`  
**Access:** All logged-in users

**What to see:**
- Page title "Dashboard"
- Summary stat cards (attendance stats for today)
- Quick action buttons (Check In / Check Out)
- Recent activity or today's status

**Things to test:**
- [ ] Page loads without errors
- [ ] Stat cards show numbers (not blank)
- [ ] Today's date is correct
- [ ] Check In button is active before checking in
- [ ] After check-in: button state changes

---

### 2.2 Check In Page
**URL:** `/attendance/check-in`  
**Access:** All employees

**What to see:**
- Work mode selector (WFH / Office)
- Check In button
- Current time displayed
- Optional note/remarks field

**Things to test:**
- [ ] Select work mode and submit → attendance recorded
- [ ] Submitting without work mode → validation error
- [ ] Already checked in → button disabled or warning shown
- [ ] Success toast after check-in
- [ ] Page redirects or updates after successful check-in

---

### 2.3 Check Out Page
**URL:** `/attendance/check-out`  
**Access:** All employees

**What to see:**
- Check Out button
- Duration worked shown
- Optional remarks field

**Things to test:**
- [ ] Check out without prior check-in → appropriate error/warning
- [ ] Successful check-out → duration calculated and displayed
- [ ] Success toast shown
- [ ] Cannot check out twice for same day

---

### 2.4 Attendance History Page
**URL:** `/attendance/history`  
**Access:** All employees

**What to see:**
- Table/list of past attendance records
- Columns: Date, Work Mode, Check In, Check Out, Duration, Status
- Status badges (Present, Absent, Late, WFH, etc.)
- Date filter or pagination

**Things to test:**
- [ ] Table loads with historical records
- [ ] Status badges display with correct colors:
  - Present → green
  - Absent → red
  - Late → orange/yellow
  - WFH → purple
- [ ] Date filter works (if present)
- [ ] Pagination works (if present)
- [ ] Empty state message shown when no records

---

### 2.5 Timesheet List Page
**URL:** `/timesheet`  
**Access:** All employees

**What to see:**
- List/table of submitted timesheets
- Status column (Draft, Submitted, Approved, Rejected)
- "New Timesheet" button
- Edit link on each row

**Things to test:**
- [ ] Table loads
- [ ] "New Timesheet" button navigates to `/timesheet/new`
- [ ] Edit link navigates to `/timesheet/:id/edit`
- [ ] Status badges display correctly
- [ ] Empty state when no timesheets

---

### 2.6 Timesheet Form Page
**URL:** `/timesheet/new` and `/timesheet/:id/edit`  
**Access:** All employees

**What to see:**
- Date field
- Project selector (dropdown)
- Task description textarea
- Hours worked input
- Save/Submit buttons

**Things to test:**
- [ ] All required fields validated on submit
- [ ] Project dropdown populated from API
- [ ] Hours field accepts only valid numbers
- [ ] Saving as draft vs submitting
- [ ] Edit mode pre-populates all fields
- [ ] Success redirect to timesheet list after save

---

### 2.7 Projects Page
**URL:** `/projects`  
**Access:** All employees

**What to see:**
- Grid or list of projects assigned to the user
- Project name, description, status
- Click-through to project detail (if applicable)

**Things to test:**
- [ ] Projects load
- [ ] Empty state if no projects assigned
- [ ] Status badge colors correct

---

### 2.8 Tasks Page
**URL:** `/tasks`  
**Access:** All employees

**What to see:**
- List/kanban of tasks assigned to the user
- Task name, project, priority, status, due date
- Filter by status or project (if present)
- Click row to open task detail

**Things to test:**
- [ ] Tasks load
- [ ] Clicking a task navigates to `/tasks/:id`
- [ ] Priority indicators visible (High/Medium/Low)
- [ ] Filter/sort works (if present)
- [ ] Empty state when no tasks

---

### 2.9 Task Detail Page
**URL:** `/tasks/:id`  
**Access:** All employees

**What to see:**
- Task title, description, status, priority, due date
- Assigned members
- Task updates/comments section
- Add update/comment form

**Things to test:**
- [ ] All task fields load correctly
- [ ] Comments/updates list loads
- [ ] Submit new update → appears in list
- [ ] Empty update → validation error
- [ ] Back navigation works

---

### 2.10 Leave Application Page
**URL:** `/leave/apply`  
**Access:** All employees

**What to see:**
- Leave type selector (Annual, Sick, etc.)
- Start date / End date pickers
- Reason/remarks textarea
- Available balance for selected leave type
- Submit button

**Things to test:**
- [ ] Leave type dropdown populated
- [ ] Balance updates when leave type changes
- [ ] Start date after end date → validation error
- [ ] Applying for more days than balance → error
- [ ] Required fields enforced
- [ ] Success toast + redirect after submission

---

### 2.11 Leave History Page
**URL:** `/leave/history`  
**Access:** All employees

**What to see:**
- Table of leave requests
- Columns: Leave Type, Start Date, End Date, Days, Status, Reason
- Status badges: Pending (yellow), Approved (green), Rejected (red)

**Things to test:**
- [ ] Table loads
- [ ] Status badges display correctly
- [ ] Empty state when no leave requests
- [ ] Data is sorted by date (most recent first)

---

## 3. Manager Screens

> Login as: `manager@company.com` / `Manager@123`

### 3.1 Manager Dashboard
**URL:** `/manager/dashboard`  
**Access:** Manager, Admin

**What to see:**
- Page title "Manager Dashboard"
- Refresh button (top right)
- **8 stat cards:**
  - Total Employees (blue)
  - Present Today (green)
  - Absent (red)
  - WFH (purple)
  - In Office (indigo)
  - On Leave (yellow)
  - Pending Leaves (yellow)
  - Open Exceptions (red)
- **Quick action buttons:**
  - "Leave Requests (N)" → goes to `/leave/approvals`
  - "Exceptions (N)" → goes to `/exceptions`
  - "Reports" → goes to `/reports`
- **Today's Team Attendance table:**
  - Columns: Employee, Work Mode, Check In, Check Out, Duration, Status
  - Work Mode badges (WFH, Office)
  - Attendance status badges

**Things to test:**
- [ ] All 8 stat cards load with numbers
- [ ] Refresh button reloads data
- [ ] Badge counts show on Leave Requests & Exceptions buttons when > 0
- [ ] Team attendance table loads with employee rows
- [ ] Work Mode badges render (WFH purple, Office blue, etc.)
- [ ] Attendance status badges render with correct colors
- [ ] Duration column shows formatted time (e.g., "7h 45m")
- [ ] Empty team attendance shows "No team members found"
- [ ] Quick links navigate to correct pages
- [ ] Loading spinner shows before data loads

---

### 3.2 Team Attendance Page
**URL:** `/team/attendance`  
**Access:** Team Lead, Manager, Admin

**What to see:**
- Date picker or filter
- Table of team members' attendance
- Export button (if available)

**Things to test:**
- [ ] Default loads today's attendance
- [ ] Date filter changes the data shown
- [ ] All team members appear
- [ ] Status badges correct

---

### 3.3 Leave Approvals Page
**URL:** `/leave/approvals`  
**Access:** Team Lead, Manager, Admin

**What to see:**
- List of pending leave requests
- Employee name, leave type, dates, reason
- Approve / Reject action buttons per row

**Things to test:**
- [ ] Pending requests load
- [ ] Approve button → status changes to Approved, row removed or badge updated
- [ ] Reject button → prompts for reason, then updates status
- [ ] Empty state: "No pending leave requests"
- [ ] Toast notification on approve/reject

---

### 3.4 Exceptions Page
**URL:** `/exceptions`  
**Access:** Team Lead, Manager, Admin

**What to see:**
- List of attendance exceptions (late check-in, missing check-out, etc.)
- Employee name, date, exception type, status
- Resolve/Review action

**Things to test:**
- [ ] Exceptions list loads
- [ ] Resolve action works
- [ ] Status changes after resolution
- [ ] Empty state shown when no open exceptions

---

### 3.5 Reports Page
**URL:** `/reports`  
**Access:** Manager, Admin

**What to see:**
- Filter options: date range, department, employee
- Report type selector (Attendance, Timesheet, Leave)
- Generate Report button
- Results table or chart
- Export to CSV/PDF (if available)

**Things to test:**
- [ ] Filters work and update results
- [ ] Generate button fetches data
- [ ] Export functionality works
- [ ] Empty state for no data in range
- [ ] Loading state during fetch

---

## 4. Team Lead Screens

> Login as: `teamlead@company.com` / `Lead@123`

### 4.1 Team Lead Dashboard
**URL:** `/teamlead/dashboard`  
**Access:** Team Lead, Manager, Admin

**What to see:**
- Team summary stats
- Team members' attendance overview
- Pending actions (leaves, exceptions)

**Things to test:**
- [ ] Dashboard loads with team data
- [ ] Stats are accurate
- [ ] Quick action links work

---

## 5. Admin Screens

> Login as: `admin@company.com` / `Admin@123`

### 5.1 Admin Dashboard
**URL:** `/admin/dashboard`  
**Access:** Admin only

**What to see:**
- System-wide stats
- All departments summary
- Active employees count
- Recent activity

**Things to test:**
- [ ] Dashboard loads
- [ ] Stats are system-wide (not just one team)
- [ ] Non-admin accessing this URL → redirected

---

### 5.2 Employees Page
**URL:** `/admin/employees`  
**Access:** Admin only

**What to see:**
- Table of all employees
- Columns: Name, Employee Code, Department, Role, Status
- "Add Employee" button
- Edit / Deactivate actions per row
- Search/filter bar

**Things to test:**
- [ ] All employees listed
- [ ] Search by name works
- [ ] Filter by department/role works
- [ ] Add Employee → form opens / navigates to form
- [ ] Edit → pre-populates employee data
- [ ] Deactivate → confirmation dialog shown
- [ ] Deactivated employee status changes

---

### 5.3 Departments Page
**URL:** `/admin/departments`  
**Access:** Admin only

**What to see:**
- List of all departments
- Department name, manager, employee count
- Add / Edit / Delete actions

**Things to test:**
- [ ] Department list loads
- [ ] Add new department → form validation + save
- [ ] Edit → updates correctly
- [ ] Delete → confirmation dialog → removes from list
- [ ] Cannot delete department with employees (should show error)

---

### 5.4 Admin Projects Page
**URL:** `/admin/projects`  
**Access:** Admin, Manager

**What to see:**
- All projects list
- Project name, status, assigned manager, team members
- Add / Edit / Archive actions

**Things to test:**
- [ ] All projects load
- [ ] Add project form validates required fields
- [ ] Edit updates project details
- [ ] Archive/status change works
- [ ] Assigning team members to projects

---

### 5.5 Settings Page
**URL:** `/admin/settings`  
**Access:** Admin only

**What to see:**
- System configuration options
- Work hours settings
- Leave policy configuration
- Notification settings

**Things to test:**
- [ ] Current settings load correctly
- [ ] Save changes persists settings
- [ ] Invalid values show validation errors
- [ ] Non-admin accessing → redirected

---

### 5.6 Audit Logs Page
**URL:** `/admin/audit-logs`  
**Access:** Admin only

**What to see:**
- Chronological list of system actions
- Columns: Timestamp, User, Action, Resource, IP
- Filter by date range, user, action type

**Things to test:**
- [ ] Logs load with entries
- [ ] Date filter works
- [ ] User filter works
- [ ] Entries are in reverse-chronological order
- [ ] Timestamps are in correct timezone

---

## 6. Shared Screens (All Roles)

### 6.1 Notifications Page
**URL:** `/notifications`  
**Access:** All logged-in users

**What to see:**
- List of notifications with timestamps
- Read/Unread indicators
- Mark as read action
- Notification type icons

**Things to test:**
- [ ] Notifications load
- [ ] Unread notifications highlighted
- [ ] Mark as read → indicator updates
- [ ] "Mark all as read" (if present) works
- [ ] Empty state when no notifications
- [ ] Click notification → navigates to relevant page

---

### 6.2 Profile Page
**URL:** `/profile`  
**Access:** All logged-in users

**What to see:**
- User's name, email, employee code, department, role
- Profile photo (if supported)
- Edit profile section
- Change password section

**Things to test:**
- [ ] Profile data loads correctly
- [ ] Edit saves updated info
- [ ] Password change validates old password
- [ ] New password ≠ confirm password → error
- [ ] Success toast on save
- [ ] Profile photo upload (if supported)

---

## Testing Checklist

### Cross-Cutting Concerns

- [ ] **Role-based access:** Employee cannot access Manager/Admin URLs (redirected)
- [ ] **Session expiry:** Accessing any protected page while logged out → redirected to `/login`
- [ ] **Loading states:** Every data-fetching page shows a spinner before data loads
- [ ] **Error states:** API failures show toast errors (not blank screens)
- [ ] **Empty states:** Tables/lists show a friendly message when empty
- [ ] **Responsive layout:** All pages usable on mobile (375px), tablet (768px), desktop (1280px)
- [ ] **Toast notifications:** Appear for success and error actions, auto-dismiss
- [ ] **Navigation sidebar:** All menu items navigate correctly
- [ ] **Logout:** Clears session and redirects to `/login`

### Browser Compatibility

| Browser | Version | Pass/Fail |
|---------|---------|-----------|
| Chrome | Latest | |
| Firefox | Latest | |
| Edge | Latest | |
| Safari | Latest | |

---

## 🐛 Bug Report Template

When reporting a UI issue, use this format:

```
Screen: [Page name + URL]
Role: [Which user role]
Steps to reproduce:
  1. ...
  2. ...
Expected: ...
Actual: ...
Screenshot: [attach]
Browser/Device: ...
```

---

*Document generated from source code review of `frontend/src/pages/` and `frontend/src/App.tsx`*
