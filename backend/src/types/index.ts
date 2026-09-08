import { Request } from 'express';

export interface AuthUser {
  id: number;
  email: string;
  employee_code: string;
  first_name: string;
  last_name: string;
  role: string;
  role_id: number;
  department_id: number | null;
  manager_id: number | null;
  team_lead_id: number | null;
  status: string;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

export type Role = 'ADMIN' | 'MANAGER' | 'TEAM_LEAD' | 'EMPLOYEE';

export type WorkModeCode = 'OFFICE' | 'WFH' | 'HYBRID';

export type AttendanceStatus = 'CHECKED_IN' | 'CHECKED_OUT' | 'INCOMPLETE' | 'ABSENT';

export type VerificationType = 'CHECK_IN' | 'CHECK_OUT' | 'RANDOM_CHECK';

export type VerificationMethod = 'SELFIE' | 'FACE_RECOGNITION' | 'LIVENESS' | 'OTP' | 'DEVICE';

export type VerificationStatus = 'VERIFIED' | 'FAILED' | 'PENDING';

export type TimesheetStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'BLOCKED' | 'COMPLETED' | 'CANCELLED';

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type ProjectStatus = 'ACTIVE' | 'COMPLETED' | 'ON_HOLD' | 'ARCHIVED';

export type LeaveRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export type ExceptionType =
  | 'LATE_CHECKIN'
  | 'EARLY_CHECKOUT'
  | 'MISSING_CHECKOUT'
  | 'MISSING_CHECKIN'
  | 'LONG_IDLE'
  | 'MISSING_SELFIE'
  | 'TIMESHEET_MISMATCH'
  | 'MISSING_TIMESHEET';

export type ExceptionSeverity = 'LOW' | 'MEDIUM' | 'HIGH';

export type ExceptionStatus = 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED' | 'DISMISSED';

export type NotificationType =
  | 'CHECKIN_REMINDER'
  | 'CHECKOUT_REMINDER'
  | 'TIMESHEET_REMINDER'
  | 'LEAVE_STATUS'
  | 'TASK_ASSIGNED'
  | 'TASK_DUE'
  | 'ATTENDANCE_EXCEPTION'
  | 'LEAVE_REQUEST'
  | 'TIMESHEET_SUBMITTED'
  | 'MISSING_CHECKOUT'
  | 'LONG_IDLE';

export type AuditAction =
  | 'LOGIN'
  | 'LOGOUT'
  | 'CHECK_IN'
  | 'CHECK_OUT'
  | 'TIMESHEET_CREATED'
  | 'TIMESHEET_UPDATED'
  | 'TIMESHEET_DELETED'
  | 'TIMESHEET_APPROVED'
  | 'TIMESHEET_REJECTED'
  | 'LEAVE_CREATED'
  | 'LEAVE_APPROVED'
  | 'LEAVE_REJECTED'
  | 'ATTENDANCE_UPDATED'
  | 'USER_CREATED'
  | 'USER_UPDATED'
  | 'USER_DEACTIVATED'
  | 'SETTINGS_CHANGED';

export type ActivityType =
  | 'MOUSE_MOVE'
  | 'KEYBOARD'
  | 'IDLE_START'
  | 'IDLE_END'
  | 'ENGAGEMENT_RESPONSE'
  | 'PAGE_FOCUS'
  | 'PAGE_BLUR'
  | 'HEARTBEAT';

// DB row types
export interface UserRow {
  id: number;
  employee_code: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  password_hash: string;
  role_id: number;
  department_id: number | null;
  manager_id: number | null;
  team_lead_id: number | null;
  joining_date: string | null;
  status: string;
  refresh_token_hash: string | null;
  password_reset_token: string | null;
  password_reset_expires: Date | null;
  created_at: Date;
  updated_at: Date;
  // joined
  role?: string;
  department_name?: string;
  manager_name?: string;
}

export interface AttendanceRow {
  id: number;
  user_id: number;
  attendance_date: string;
  work_mode_id: number;
  check_in_time: Date;
  check_out_time: Date | null;
  total_work_minutes: number;
  regular_work_minutes: number;
  overtime_minutes: number;
  status: AttendanceStatus;
  check_in_ip: string | null;
  check_out_ip: string | null;
  check_in_user_agent: string | null;
  check_out_user_agent: string | null;
  check_in_device: string | null;
  check_out_device: string | null;
  session_id: string;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
  // joined
  work_mode_code?: string;
  work_mode_name?: string;
  employee_name?: string;
}

export interface SystemSetting {
  id: number;
  setting_key: string;
  setting_value: string;
  description: string | null;
  updated_by: number | null;
  updated_at: Date;
}

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
  successfulVerifications: number;
  expectedVerifications: number;
  totalExceptions: number;
  totalAttendanceRecords: number;
}
