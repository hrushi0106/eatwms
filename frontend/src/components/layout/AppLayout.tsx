import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import Chatbot from '../chatbot/Chatbot';

function getPageTitle(pathname: string): string {
  const routes: Record<string, string> = {
    '/dashboard': 'My Dashboard',
    '/attendance/check-in': 'Check In',
    '/attendance/check-out': 'Check Out',
    '/attendance/history': 'Attendance History',
    '/timesheet': 'Timesheets',
    '/timesheet/new': 'New Timesheet Entry',
    '/projects': 'Projects',
    '/tasks': 'Tasks',
    '/leave/apply': 'Apply for Leave',
    '/leave/history': 'Leave History',
    '/leave/approvals': 'Leave Approvals',
    '/notifications': 'Notifications',
    '/profile': 'My Profile',
    '/manager/dashboard': 'Manager Dashboard',
    '/teamlead/dashboard': 'Team Lead Dashboard',
    '/team/attendance': 'Team Attendance',
    '/exceptions': 'Attendance Exceptions',
    '/reports': 'Reports',
    '/admin/dashboard': 'Admin Dashboard',
    '/admin/employees': 'Employees',
    '/admin/departments': 'Departments',
    '/admin/projects': 'Projects',
    '/admin/settings': 'System Settings',
    '/admin/audit-logs': 'Audit Logs',
  };

  // Check for exact match first, then prefix match
  if (routes[pathname]) return routes[pathname];
  for (const [path, title] of Object.entries(routes)) {
    if (pathname.startsWith(path + '/')) return title;
  }
  return 'EvoluXion WorkMonitor';
}

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const title = getPageTitle(location.pathname);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex transition-colors">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 lg:ml-64">
        <Header onMenuClick={() => setSidebarOpen(true)} title={title} />

        <main className="flex-1 p-4 sm:p-6 animate-fade-in">
          <Outlet />
        </main>
      </div>

      {/* Chatbot floats over all pages */}
      <Chatbot />
    </div>
  );
}
