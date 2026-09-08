// ─── Auth ────────────────────────────────────────────────────────────────────

export type Role = 'ADMIN' | 'MANAGER' | 'TEAM_LEAD' | 'EMPLOYEE';

export interface AuthUser {
  id: number;
  employee_code: string;
  first_name: string;
  last_name: string;
  email: string;
  role: Role;
  role_id: number;
  department_id: number | null;
  manager_id: number | null;
  team_lead_id: number | null;
  status: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
}

// ─── Users ───────────────────────────────────────────────────────────────────

export interface User {
  id: number;
  employee_code: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  role: Role;
  role_id: number;
  department_id: number | null;
  department_name: string | null;
  manager_id: number | null;
  manager_name: string | null;
  team_lead_id: number | null;
  joining_date: string | null;
  status: string;
  created_at: string;
}

// ─── Attendance ───────────────────────────────────────────────────────────────

export type AttendanceStatus = 'CHECKED_IN' | 'CHECKED_OUT' | 'INCOMPLETE' | 'ABSENT';
export type WorkModeCode = 'OFFICE' | 'WFH' | 'HYBRID';

export interface WorkMode {
  id: number;
  code: WorkModeCode;
  name: string;
  description: string | null;
  status: string;
}

export interface Attendance {
  id: number;
  user_id: number;
  attendance_date: string;
  work_mode_id: number;
  work_mode_code: WorkModeCode;
  work_mode_name: string;
  check_in_time: string;
  check_out_time: string | null;
  total_work_minutes: number;
  regular_work_minutes: number;
  overtime_minutes: number;
  status: AttendanceStatus;
  session_id: string;
  notes: string | null;
  created_at: string;
  employee_name?: string;
}

export interface AttendanceVerification {
  id: number;
  attendance_id: number;
  user_id: number;
  verification_type: 'CHECK_IN' | 'CHECK_OUT' | 'RANDOM_CHECK';
  verification_method: string;
  image_path: string | null;
  image_hash: string | null;
  captured_at: string;
  verification_status: 'VERIFIED' | 'FAILED' | 'PENDING';
  failure_reason: string | null;
  created_at: string;
}

// ─── Timesheet ────────────────────────────────────────────────────────────────

export type TimesheetStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';

export interface Timesheet {
  id: number;
  user_id: number;
  attendance_id: number | null;
  date: string;
  project_id: number;
  project_name: string;
  task_id: number | null;
  task_name: string | null;
  start_time: string | null;
  end_time: string | null;
  hours: number;
  overtime_hours: number;
  description: string;
  comment: string | null;
  is_billable: boolean;
  status: TimesheetStatus;
  reviewed_by: number | null;
  reviewed_at: string | null;
  created_at: string;
  employee_name?: string;
}

// ─── Projects & Tasks ─────────────────────────────────────────────────────────

export type ProjectStatus = 'ACTIVE' | 'COMPLETED' | 'ON_HOLD' | 'ARCHIVED';
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'BLOCKED' | 'COMPLETED' | 'CANCELLED';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface Project {
  id: number;
  project_code: string;
  name: string;
  description: string | null;
  client_name: string | null;
  start_date: string | null;
  end_date: string | null;
  status: ProjectStatus;
  created_at: string;
}

export interface Task {
  id: number;
  project_id: number;
  project_name: string;
  assigned_to: number | null;
  assigned_to_name: string | null;
  assigned_by: number | null;
  name: string;
  description: string | null;
  priority: TaskPriority;
  estimated_hours: number | null;
  due_date: string | null;
  status: TaskStatus;
  progress_percentage: number;
  created_at: string;
}

export interface TaskUpdate {
  id: number;
  task_id: number;
  user_id: number;
  user_name: string;
  progress_percentage: number;
  work_update: string;
  time_spent: number | null;
  remaining_work: string | null;
  blocker: string | null;
  created_at: string;
}

// ─── Leave ────────────────────────────────────────────────────────────────────

export type LeaveRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface LeaveType {
  id: number;
  name: string;
  description: string | null;
  annual_limit: number;
  is_paid: boolean;
  status: string;
}

export interface LeaveBalance {
  id: number;
  user_id: number;
  leave_type_id: number;
  leave_type_name: string;
  year: number;
  allocated_days: number;
  used_days: number;
  remaining_days: number;
}

export interface LeaveRequest {
  id: number;
  user_id: number;
  employee_name: string;
  leave_type_id: number;
  leave_type_name: string;
  start_date: string;
  end_date: string;
  total_days: number;
  reason: string;
  attachment_path: string | null;
  status: LeaveRequestStatus;
  reviewed_by: number | null;
  reviewer_name: string | null;
  reviewed_at: string | null;
  review_comment: string | null;
  created_at: string;
}

// ─── Notifications ────────────────────────────────────────────────────────────

export interface Notification {
  id: number;
  user_id: number;
  type: string;
  title: string;
  message: string;
  entity_type: string | null;
  entity_id: number | null;
  is_read: boolean;
  created_at: string;
  read_at: string | null;
}

// ─── Exceptions ───────────────────────────────────────────────────────────────

export type ExceptionType =
  | 'LATE_CHECKIN' | 'EARLY_CHECKOUT' | 'MISSING_CHECKOUT'
  | 'MISSING_CHECKIN' | 'LONG_IDLE' | 'MISSING_SELFIE'
  | 'TIMESHEET_MISMATCH' | 'MISSING_TIMESHEET';

export type ExceptionSeverity = 'LOW' | 'MEDIUM' | 'HIGH';
export type ExceptionStatus = 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED' | 'DISMISSED';

export interface AttendanceException {
  id: number;
  user_id: number;
  employee_name: string;
  attendance_id: number | null;
  exception_type: ExceptionType;
  severity: ExceptionSeverity;
  description: string;
  status: ExceptionStatus;
  reviewed_by: number | null;
  reviewer_name: string | null;
  reviewed_at: string | null;
  review_comment: string | null;
  exception_date: string;
  created_at: string;
}

// ─── Dashboard / KPI ──────────────────────────────────────────────────────────

export interface KPIData {
  attendanceRate: number;
  onTimeCheckInRate: number;
  wfhRate: number;
  timesheetCompletion: number;
  taskCompletionRate: number;
  verificationCompletion: number;
  exceptionRate: number;
  totalOvertimeMinutes: number;
  presentDays: number;
  expectedWorkingDays: number;
  totalCheckIns: number;
  onTimeCheckIns: number;
  wfhDays: number;
  totalPresentDays: number;
  submittedTimesheets: number;
  expectedTimesheets: number;
  completedTasks: number;
  assignedTasks: number;
}

export interface EmployeeDashboard {
  todayAttendance: Attendance | null;
  todayTimesheetHours: number;
  assignedTasksCount: number;
  completedTasksCount: number;
  recentTasks: Task[];
  leaveBalance: LeaveBalance[];
  unreadNotifications: number;
  currentStatus: string;
}

export interface ManagerDashboard {
  summary: {
    total: number;
    present: number;
    absent: number;
    wfh: number;
    office: number;
    onLeave: number;
    late: number;
    pendingReview: number;
    checkedOut: number;
  };
  teamAttendance: TeamAttendanceRow[];
  pendingLeaveRequests: number;
  openExceptions: number;
}

export interface TeamAttendanceRow {
  user_id: number;
  employee_name: string;
  employee_code: string;
  work_mode: WorkModeCode | null;
  check_in_time: string | null;
  check_out_time: string | null;
  total_work_minutes: number;
  timesheet_hours: number;
  status: AttendanceStatus | 'ABSENT';
  verification_status: string | null;
  idle_status: string;
  open_exceptions: number;
}

// ─── System Settings ──────────────────────────────────────────────────────────

export interface SystemSetting {
  id: number;
  setting_key: string;
  setting_value: string;
  description: string | null;
  updated_at: string;
}

// ─── API ──────────────────────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  meta?: PaginationMeta;
  errorCode?: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface Department {
  id: number;
  name: string;
  description: string | null;
  status: string;
  created_at: string;
}

export interface AuditLog {
  id: number;
  user_id: number | null;
  user_name: string | null;
  action: string;
  entity_type: string | null;
  entity_id: number | null;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}
