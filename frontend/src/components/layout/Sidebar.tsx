import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  HomeIcon, ClockIcon, DocumentTextIcon, FolderIcon,
  ClipboardDocumentCheckIcon, CalendarDaysIcon, BellIcon, UserIcon,
  UsersIcon, ChartBarIcon, CogIcon, ClipboardDocumentListIcon,
  BuildingOfficeIcon, ExclamationTriangleIcon, DocumentChartBarIcon,
  ArrowRightOnRectangleIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import { Role } from '../../types';

interface NavItem {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: Role[];
}

const employeeNav: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: HomeIcon },
  { label: 'Attendance', path: '/attendance/history', icon: ClockIcon },
  { label: 'Timesheet', path: '/timesheet', icon: DocumentTextIcon },
  { label: 'Projects', path: '/projects', icon: FolderIcon },
  { label: 'My Tasks', path: '/tasks', icon: ClipboardDocumentCheckIcon },
  { label: 'Leave', path: '/leave/history', icon: CalendarDaysIcon },
  { label: 'Notifications', path: '/notifications', icon: BellIcon },
  { label: 'Profile', path: '/profile', icon: UserIcon },
];

const managerNav: NavItem[] = [
  { label: 'Dashboard', path: '/manager/dashboard', icon: HomeIcon },
  { label: 'Team Attendance', path: '/team/attendance', icon: UsersIcon },
  { label: 'Leave Approvals', path: '/leave/approvals', icon: CalendarDaysIcon },
  { label: 'Exceptions', path: '/exceptions', icon: ExclamationTriangleIcon },
  { label: 'Reports', path: '/reports', icon: DocumentChartBarIcon },
  { label: 'My Timesheet', path: '/timesheet', icon: DocumentTextIcon },
  { label: 'Notifications', path: '/notifications', icon: BellIcon },
  { label: 'Profile', path: '/profile', icon: UserIcon },
];

const teamLeadNav: NavItem[] = [
  { label: 'Dashboard', path: '/teamlead/dashboard', icon: HomeIcon },
  { label: 'Team Attendance', path: '/team/attendance', icon: UsersIcon },
  { label: 'Leave Approvals', path: '/leave/approvals', icon: CalendarDaysIcon },
  { label: 'Exceptions', path: '/exceptions', icon: ExclamationTriangleIcon },
  { label: 'My Timesheet', path: '/timesheet', icon: DocumentTextIcon },
  { label: 'Tasks', path: '/tasks', icon: ClipboardDocumentCheckIcon },
  { label: 'Notifications', path: '/notifications', icon: BellIcon },
  { label: 'Profile', path: '/profile', icon: UserIcon },
];

const adminNav: NavItem[] = [
  { label: 'Dashboard', path: '/admin/dashboard', icon: HomeIcon },
  { label: 'Employees', path: '/admin/employees', icon: UsersIcon },
  { label: 'Departments', path: '/admin/departments', icon: BuildingOfficeIcon },
  { label: 'Projects', path: '/admin/projects', icon: FolderIcon },
  { label: 'Team Attendance', path: '/team/attendance', icon: ClockIcon },
  { label: 'Leave Approvals', path: '/leave/approvals', icon: CalendarDaysIcon },
  { label: 'Exceptions', path: '/exceptions', icon: ExclamationTriangleIcon },
  { label: 'Reports', path: '/reports', icon: DocumentChartBarIcon },
  { label: 'Audit Logs', path: '/admin/audit-logs', icon: ClipboardDocumentListIcon },
  { label: 'Settings', path: '/admin/settings', icon: CogIcon },
  { label: 'Notifications', path: '/notifications', icon: BellIcon },
  { label: 'Profile', path: '/profile', icon: UserIcon },
];

function getNavItems(role: Role): NavItem[] {
  switch (role) {
    case 'ADMIN': return adminNav;
    case 'MANAGER': return managerNav;
    case 'TEAM_LEAD': return teamLeadNav;
    default: return employeeNav;
  }
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user, logout } = useAuth();
  const navItems = getNavItems(user?.role as Role || 'EMPLOYEE');

  const roleColors: Record<Role, string> = {
    ADMIN: 'bg-purple-100 text-purple-800',
    MANAGER: 'bg-blue-100 text-blue-800',
    TEAM_LEAD: 'bg-indigo-100 text-indigo-800',
    EMPLOYEE: 'bg-green-100 text-green-800',
  };
  const roleColor = roleColors[user?.role as Role || 'EMPLOYEE'] || 'bg-gray-100 text-gray-700';

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-4 border-b border-gray-100">
        <img
          src="/logo.svg"
          alt="EvoluXion Software Solutions"
          className="h-10 object-contain"
        />
      </div>

      {/* User info */}
      {user && (
        <div className="px-4 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
              {user.first_name[0]}{user.last_name[0]}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">
                {user.first_name} {user.last_name}
              </p>
              <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${roleColor}`}>
                {user.role.replace('_', ' ')}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-3 py-3 overflow-y-auto">
        <ul className="space-y-0.5">
          {navItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`
                }
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                <span className="truncate">{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Logout */}
      <div className="px-3 py-3 border-t border-gray-100">
        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 w-full transition-colors"
        >
          <ArrowRightOnRectangleIcon className="h-5 w-5" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-gray-200 fixed h-full z-30">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-white border-r border-gray-200 z-50 transform transition-transform duration-200 lg:hidden ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <SidebarContent />
      </aside>
    </>
  );
}
