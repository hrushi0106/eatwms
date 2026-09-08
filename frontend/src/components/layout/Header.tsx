import React from 'react';
import { Link } from 'react-router-dom';
import {
  Bars3Icon, BellIcon, UserCircleIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import { useNotificationStore } from '../../stores/notificationStore';

interface HeaderProps {
  onMenuClick: () => void;
  title?: string;
}

export default function Header({ onMenuClick, title }: HeaderProps) {
  const { user } = useAuth();
  const unreadCount = useNotificationStore((s) => s.unreadCount);

  return (
    <header className="sticky top-0 z-20 bg-white border-b border-gray-200 h-16 flex items-center px-4 gap-4">
      {/* Mobile menu button */}
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100"
        aria-label="Open menu"
      >
        <Bars3Icon className="h-5 w-5" />
      </button>

      {/* Page title */}
      {title && (
        <h1 className="text-lg font-semibold text-gray-900 hidden sm:block">{title}</h1>
      )}

      <div className="flex-1" />

      {/* Right section */}
      <div className="flex items-center gap-2">
        {/* Notifications */}
        <Link
          to="/notifications"
          className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
          aria-label="Notifications"
        >
          <BellIcon className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Link>

        {/* User */}
        <Link
          to="/profile"
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
            {user?.first_name?.[0]}{user?.last_name?.[0]}
          </div>
          <span className="text-sm font-medium text-gray-700 hidden sm:block">
            {user?.first_name} {user?.last_name}
          </span>
        </Link>
      </div>
    </header>
  );
}
