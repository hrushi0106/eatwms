import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import ProtectedRoute from './components/common/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';
import LoadingSpinner from './components/common/LoadingSpinner';

// Lazy-load pages
const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/auth/ResetPasswordPage'));

// Employee pages
const EmployeeDashboardPage = lazy(() => import('./pages/employee/DashboardPage'));
const CheckInPage = lazy(() => import('./pages/attendance/CheckInPage'));
const CheckOutPage = lazy(() => import('./pages/attendance/CheckOutPage'));
const AttendanceHistoryPage = lazy(() => import('./pages/attendance/AttendanceHistoryPage'));
const TimesheetListPage = lazy(() => import('./pages/timesheet/TimesheetListPage'));
const TimesheetFormPage = lazy(() => import('./pages/timesheet/TimesheetFormPage'));
const ProjectsPage = lazy(() => import('./pages/projects/ProjectsPage'));
const TasksPage = lazy(() => import('./pages/tasks/TasksPage'));
const TaskDetailPage = lazy(() => import('./pages/tasks/TaskDetailPage'));
const LeaveApplicationPage = lazy(() => import('./pages/leave/LeaveApplicationPage'));
const LeaveHistoryPage = lazy(() => import('./pages/leave/LeaveHistoryPage'));
const NotificationsPage = lazy(() => import('./pages/notifications/NotificationsPage'));
const ProfilePage = lazy(() => import('./pages/profile/ProfilePage'));

// Manager pages
const ManagerDashboardPage = lazy(() => import('./pages/manager/ManagerDashboardPage'));
const TeamAttendancePage = lazy(() => import('./pages/manager/TeamAttendancePage'));
const LeaveApprovalsPage = lazy(() => import('./pages/leave/LeaveApprovalsPage'));
const ExceptionsPage = lazy(() => import('./pages/manager/ExceptionsPage'));
const ReportsPage = lazy(() => import('./pages/reports/ReportsPage'));

// Team Lead pages
const TeamLeadDashboardPage = lazy(() => import('./pages/teamlead/TeamLeadDashboardPage'));

// Admin pages
const AdminDashboardPage = lazy(() => import('./pages/admin/AdminDashboardPage'));
const EmployeesPage = lazy(() => import('./pages/admin/EmployeesPage'));
const DepartmentsPage = lazy(() => import('./pages/admin/DepartmentsPage'));
const AdminProjectsPage = lazy(() => import('./pages/admin/AdminProjectsPage'));
const SettingsPage = lazy(() => import('./pages/admin/SettingsPage'));
const AuditLogsPage = lazy(() => import('./pages/admin/AuditLogsPage'));

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Suspense fallback={<LoadingSpinner fullPage />}>
          <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password/:token" element={<ResetPasswordPage />} />

          {/* Protected routes inside AppLayout */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              {/* Employee */}
              <Route path="/dashboard" element={<EmployeeDashboardPage />} />
              <Route path="/attendance/check-in" element={<CheckInPage />} />
              <Route path="/attendance/check-out" element={<CheckOutPage />} />
              <Route path="/attendance/history" element={<AttendanceHistoryPage />} />
              <Route path="/timesheet" element={<TimesheetListPage />} />
              <Route path="/timesheet/new" element={<TimesheetFormPage />} />
              <Route path="/timesheet/:id/edit" element={<TimesheetFormPage />} />
              <Route path="/projects" element={<ProjectsPage />} />
              <Route path="/tasks" element={<TasksPage />} />
              <Route path="/tasks/:id" element={<TaskDetailPage />} />
              <Route path="/leave/apply" element={<LeaveApplicationPage />} />
              <Route path="/leave/history" element={<LeaveHistoryPage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/profile" element={<ProfilePage />} />

              {/* Manager */}
              <Route
                path="/manager/dashboard"
                element={
                  <ProtectedRoute roles={['MANAGER', 'ADMIN']}>
                    <ManagerDashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/team/attendance"
                element={
                  <ProtectedRoute roles={['TEAM_LEAD', 'MANAGER', 'ADMIN']}>
                    <TeamAttendancePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/leave/approvals"
                element={
                  <ProtectedRoute roles={['TEAM_LEAD', 'MANAGER', 'ADMIN']}>
                    <LeaveApprovalsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/exceptions"
                element={
                  <ProtectedRoute roles={['TEAM_LEAD', 'MANAGER', 'ADMIN']}>
                    <ExceptionsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/reports"
                element={
                  <ProtectedRoute roles={['MANAGER', 'ADMIN']}>
                    <ReportsPage />
                  </ProtectedRoute>
                }
              />

              {/* Team Lead */}
              <Route
                path="/teamlead/dashboard"
                element={
                  <ProtectedRoute roles={['TEAM_LEAD', 'MANAGER', 'ADMIN']}>
                    <TeamLeadDashboardPage />
                  </ProtectedRoute>
                }
              />

              {/* Admin */}
              <Route
                path="/admin/dashboard"
                element={
                  <ProtectedRoute roles={['ADMIN']}>
                    <AdminDashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/employees"
                element={
                  <ProtectedRoute roles={['ADMIN']}>
                    <EmployeesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/departments"
                element={
                  <ProtectedRoute roles={['ADMIN']}>
                    <DepartmentsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/projects"
                element={
                  <ProtectedRoute roles={['ADMIN', 'MANAGER']}>
                    <AdminProjectsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/settings"
                element={
                  <ProtectedRoute roles={['ADMIN']}>
                    <SettingsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/audit-logs"
                element={
                  <ProtectedRoute roles={['ADMIN']}>
                    <AuditLogsPage />
                  </ProtectedRoute>
                }
              />
            </Route>
          </Route>

          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Suspense>
    </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
