import React, { useState } from 'react';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, startOfMonth, endOfMonth, addMonths, subMonths, isToday } from 'date-fns';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CalendarDaysIcon,
  UserCircleIcon,
  ClockIcon,
  Bars3Icon,
  BellIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';

export interface TimesheetHeaderProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
  viewMode: 'daily' | 'weekly' | 'monthly';
  onViewModeChange: (mode: 'daily' | 'weekly' | 'monthly') => void;
  onTodayClick: () => void;
  onSearchChange?: (query: string) => void;
  showSearch?: boolean;
  showFilters?: boolean;
  onToggleFilters?: () => void;
  activeFilterCount?: number;
  totalHours?: {
    regular: number;
    overtime: number;
    total: number;
  };
}

const TimesheetHeader: React.FC<TimesheetHeaderProps> = ({
  currentDate,
  onDateChange,
  viewMode,
  onViewModeChange,
  onTodayClick,
  onSearchChange,
  showSearch = false,
  showFilters = false,
  onToggleFilters,
  activeFilterCount = 0,
  totalHours,
}) => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

  const handlePrevious = () => {
    switch (viewMode) {
      case 'daily':
        onDateChange(new Date(currentDate.getTime() - 24 * 60 * 60 * 1000));
        break;
      case 'weekly':
        onDateChange(subWeeks(currentDate, 1));
        break;
      case 'monthly':
        onDateChange(subMonths(currentDate, 1));
        break;
    }
  };

  const handleNext = () => {
    switch (viewMode) {
      case 'daily':
        onDateChange(new Date(currentDate.getTime() + 24 * 60 * 60 * 1000));
        break;
      case 'weekly':
        onDateChange(addWeeks(currentDate, 1));
        break;
      case 'monthly':
        onDateChange(addMonths(currentDate, 1));
        break;
    }
  };

  const getDateRangeText = () => {
    switch (viewMode) {
      case 'daily':
        return format(currentDate, 'EEEE, MMMM dd, yyyy');
      case 'weekly':
        const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
        if (weekStart.getMonth() === weekEnd.getMonth()) {
          return `${format(weekStart, 'MMM dd')} - ${format(weekEnd, 'dd, yyyy')}`;
        }
        return `${format(weekStart, 'MMM dd')} - ${format(weekEnd, 'MMM dd, yyyy')}`;
      case 'monthly':
        return format(currentDate, 'MMMM yyyy');
      default:
        return '';
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    onSearchChange?.(value);
  };

  const isCurrentPeriod = () => {
    const today = new Date();
    switch (viewMode) {
      case 'daily':
        return isToday(currentDate);
      case 'weekly':
        const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
        return today >= weekStart && today <= weekEnd;
      case 'monthly':
        const monthStart = startOfMonth(currentDate);
        const monthEnd = endOfMonth(currentDate);
        return today >= monthStart && today <= monthEnd;
      default:
        return false;
    }
  };

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4">
      {/* Top Row - Main Header */}
      <div className="flex items-center justify-between mb-4">
        {/* Left Section - Title and Employee Info */}
        <div className="flex items-center space-x-6">
          {/* Page Title */}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Timesheet</h1>
            <p className="text-sm text-gray-600 mt-1">
              Manage your work hours and track time efficiently
            </p>
          </div>

          {/* Employee Profile Card */}
          <div className="flex items-center bg-gray-50 rounded-lg px-4 py-3 border border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <UserCircleIcon className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-900">
                  {user?.first_name} {user?.last_name}
                </div>
                <div className="text-xs text-gray-600">
                  {user?.employee_code} • {user?.role?.replace('_', ' ')}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Section - Actions and Search */}
        <div className="flex items-center space-x-4">
          {/* Search Bar */}
          {showSearch && (
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search projects, tasks..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="w-64 pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>
          )}

          {/* Notifications */}
          <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <BellIcon className="h-5 w-5" />
          </button>

          {/* Menu */}
          <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <Bars3Icon className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Bottom Row - Navigation and View Controls */}
      <div className="flex items-center justify-between">
        {/* Left - Date Navigation */}
        <div className="flex items-center space-x-4">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            {(['daily', 'weekly', 'monthly'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => onViewModeChange(mode)}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors capitalize ${
                  viewMode === mode
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          {/* Date Navigation */}
          <div className="flex items-center bg-gray-50 rounded-lg border border-gray-200">
            <button
              onClick={handlePrevious}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-l-lg transition-colors"
            >
              <ChevronLeftIcon className="h-5 w-5" />
            </button>
            
            <div className="px-6 py-2 min-w-[240px] text-center">
              <div className="flex items-center justify-center space-x-2">
                <CalendarDaysIcon className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-semibold text-gray-900">
                  {getDateRangeText()}
                </span>
              </div>
            </div>
            
            <button
              onClick={handleNext}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-r-lg transition-colors"
            >
              <ChevronRightIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Today Button */}
          <button
            onClick={onTodayClick}
            disabled={isCurrentPeriod()}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              isCurrentPeriod()
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200'
            }`}
          >
            Today
          </button>
        </div>

        {/* Right - Quick Stats */}
        {totalHours && (
          <div className="flex items-center space-x-6">
            {/* Total Hours Summary */}
            <div className="flex items-center space-x-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg px-4 py-2 border border-blue-200">
              <div className="flex items-center space-x-2">
                <ClockIcon className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-gray-700">
                  {viewMode === 'daily' ? 'Today' : viewMode === 'weekly' ? 'This Week' : 'This Month'}:
                </span>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-center">
                  <div className="text-lg font-bold text-gray-900">
                    {totalHours.total.toFixed(1)}h
                  </div>
                  <div className="text-xs text-gray-600">Total</div>
                </div>
                <div className="w-px h-6 bg-gray-300" />
                <div className="text-center">
                  <div className="text-sm font-semibold text-green-600">
                    {totalHours.regular.toFixed(1)}h
                  </div>
                  <div className="text-xs text-gray-600">Regular</div>
                </div>
                {totalHours.overtime > 0 && (
                  <>
                    <div className="w-px h-6 bg-gray-300" />
                    <div className="text-center">
                      <div className="text-sm font-semibold text-orange-600">
                        {totalHours.overtime.toFixed(1)}h
                      </div>
                      <div className="text-xs text-gray-600">Overtime</div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TimesheetHeader;