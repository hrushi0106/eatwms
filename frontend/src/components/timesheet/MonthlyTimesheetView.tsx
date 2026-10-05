import React, { useState, useMemo, useCallback } from 'react';
import { format, eachDayOfInterval, startOfMonth, endOfMonth, isWeekend, isToday, isSameMonth, addDays, subDays } from 'date-fns';
import {
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  PauseCircleIcon,
  PlusIcon,
  EyeIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  FireIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import { Timesheet, Project, Task } from '../../types';
import { TimesheetStatusWorkflow } from './TimesheetStatusWorkflow';
import { useAuth } from '../../contexts/AuthContext';

interface MonthlyTimesheetViewProps {
  currentDate?: Date;
  viewMode?: 'daily' | 'weekly' | 'monthly';
  timesheets?: Timesheet[];
  projects?: Project[];
  tasks?: Task[];
  loading?: boolean;
  onDataRefresh?: () => void;
  dateRange?: { start: Date; end: Date };
  searchQuery?: string;
}

interface CalendarDay {
  date: Date;
  timesheets: Timesheet[];
  totalHours: number;
  regularHours: number;
  overtimeHours: number;
  billableHours: number;
  status: 'complete' | 'partial' | 'missing' | 'leave' | 'holiday' | 'working' | 'over-time';
  statusCounts: {
    draft: number;
    submitted: number;
    approved: number;
    rejected: number;
  };
  isCurrentMonth: boolean;
  isToday: boolean;
  isWeekend: boolean;
  projects: string[];
  streak?: number;
}

const MonthlyTimesheetView: React.FC<MonthlyTimesheetViewProps> = ({
  currentDate = new Date(),
  timesheets = [],
  projects = [],
  tasks = [],
  loading = false,
  onDataRefresh,
}) => {
  const { user } = useAuth();
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);
  const [hoveredDay, setHoveredDay] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<'calendar' | 'stats'>('calendar');
  
  const isManagerOrAbove = ['MANAGER', 'TEAM_LEAD', 'ADMIN'].includes(user?.role || '');
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);

  // Generate calendar days including previous/next month padding
  const calendarDays = useMemo(() => {
    // Get first day of the week containing the first day of the month
    const calendarStart = new Date(monthStart);
    calendarStart.setDate(calendarStart.getDate() - monthStart.getDay());
    
    // Get last day of the week containing the last day of the month
    const calendarEnd = new Date(monthEnd);
    calendarEnd.setDate(calendarEnd.getDate() + (6 - monthEnd.getDay()));

    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
    let currentStreak = 0;
    const processedDays: CalendarDay[] = [];

    days.forEach((date, index) => {
      const dayTimesheets = timesheets.filter(
        (ts) => ts.date === format(date, 'yyyy-MM-dd')
      );
      
      const totalHours = dayTimesheets.reduce((sum, ts) => sum + ts.hours, 0);
      const overtimeHours = dayTimesheets.reduce((sum, ts) => sum + (ts.overtime_hours || 0), 0);
      const regularHours = Math.max(0, totalHours - overtimeHours);
      const billableHours = dayTimesheets
        .filter(ts => ts.is_billable)
        .reduce((sum, ts) => sum + ts.hours, 0);

      // Count statuses
      const statusCounts = {
        draft: dayTimesheets.filter(ts => ts.status === 'DRAFT').length,
        submitted: dayTimesheets.filter(ts => ts.status === 'SUBMITTED').length,
        approved: dayTimesheets.filter(ts => ts.status === 'APPROVED').length,
        rejected: dayTimesheets.filter(ts => ts.status === 'REJECTED').length,
      };

      // Get unique projects
      const projects = [...new Set(dayTimesheets.map(ts => ts.project_name).filter(Boolean))];
      
      let status: CalendarDay['status'] = 'missing';
      const weekendDay = isWeekend(date);
      
      if (weekendDay) {
        status = 'holiday';
      } else if (dayTimesheets.length > 0) {
        if (totalHours >= 8) {
          status = overtimeHours > 0 ? 'over-time' : 'complete';
        } else if (totalHours >= 4) {
          status = 'partial';
        } else {
          status = 'working';
        }
      } else if (dayTimesheets.some(ts => ts.status === 'DRAFT')) {
        status = 'working';
      }

      // Calculate streak
      if (status === 'complete' || status === 'over-time') {
        currentStreak += 1;
      } else if (!weekendDay) {
        currentStreak = 0;
      }

      const calendarDay: CalendarDay = {
        date,
        timesheets: dayTimesheets,
        totalHours,
        regularHours,
        overtimeHours,
        billableHours,
        status,
        statusCounts,
        isCurrentMonth: isSameMonth(date, currentDate),
        isToday: isToday(date),
        isWeekend: weekendDay,
        projects,
        streak: currentStreak,
      };

      processedDays.push(calendarDay);
    });

    return processedDays;
  }, [currentDate, timesheets, monthStart, monthEnd]);

  const getStatusIcon = (status: CalendarDay['status'], streak?: number) => {
    switch (status) {
      case 'complete':
        return (
          <div className="relative">
            <CheckCircleIcon className="h-4 w-4 text-green-500" />
            {streak && streak >= 5 && (
              <FireIcon className="h-3 w-3 text-orange-500 absolute -top-1 -right-1" />
            )}
          </div>
        );
      case 'over-time':
        return (
          <div className="relative">
            <CheckCircleIcon className="h-4 w-4 text-purple-500" />
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-orange-400 rounded-full"></div>
          </div>
        );
      case 'partial':
        return <ClockIcon className="h-4 w-4 text-blue-500" />;
      case 'working':
        return <ClockIcon className="h-4 w-4 text-yellow-500" />;
      case 'missing':
        return <ExclamationTriangleIcon className="h-4 w-4 text-red-500" />;
      case 'leave':
        return <PauseCircleIcon className="h-4 w-4 text-orange-500" />;
      case 'holiday':
        return <div className="h-4 w-4 rounded-full bg-gray-300" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: CalendarDay['status']) => {
    switch (status) {
      case 'complete':
        return 'bg-green-100 border-green-300 text-green-700';
      case 'over-time':
        return 'bg-purple-100 border-purple-300 text-purple-700';
      case 'partial':
        return 'bg-blue-100 border-blue-300 text-blue-700';
      case 'working':
        return 'bg-yellow-100 border-yellow-300 text-yellow-700';
      case 'missing':
        return 'bg-red-100 border-red-300 text-red-700';
      case 'leave':
        return 'bg-orange-100 border-orange-300 text-orange-700';
      case 'holiday':
        return 'bg-gray-100 border-gray-300 text-gray-600';
      default:
        return 'bg-white border-gray-200 text-gray-700';
    }
  };

  const getDayBackgroundColor = (day: CalendarDay) => {
    let baseColor = '';
    
    if (!day.isCurrentMonth) {
      baseColor = 'bg-gray-50';
    } else if (day.isToday) {
      baseColor = 'bg-blue-50';
    } else {
      baseColor = 'bg-white';
    }

    // Add intensity based on hours
    if (day.totalHours > 0 && day.isCurrentMonth) {
      const intensity = Math.min(day.totalHours / 8, 1);
      if (day.status === 'complete') {
        return `${baseColor} bg-gradient-to-br from-green-50 to-green-100`;
      } else if (day.status === 'over-time') {
        return `${baseColor} bg-gradient-to-br from-purple-50 to-purple-100`;
      } else if (day.status === 'partial') {
        return `${baseColor} bg-gradient-to-br from-blue-50 to-blue-100`;
      }
    }

    return baseColor;
  };

  // Handle day click
  const handleDayClick = useCallback((day: CalendarDay) => {
    if (!day.isCurrentMonth) return;
    setSelectedDay(day);
  }, []);

  // Handle add time entry
  const handleAddTimeEntry = useCallback((day: CalendarDay) => {
    // This would open the time entry modal for the specific date
    console.log('Add time entry for:', format(day.date, 'yyyy-MM-dd'));
  }, []);

  // Calculate comprehensive monthly summary
  const monthlySummary = useMemo(() => {
    const currentMonthDays = calendarDays.filter(day => day.isCurrentMonth);
    const workingDays = currentMonthDays.filter(day => !day.isWeekend);
    const completeDays = currentMonthDays.filter(day => day.status === 'complete' || day.status === 'over-time').length;
    
    const totalHours = currentMonthDays.reduce((sum, day) => sum + day.totalHours, 0);
    const totalRegularHours = currentMonthDays.reduce((sum, day) => sum + day.regularHours, 0);
    const totalOvertimeHours = currentMonthDays.reduce((sum, day) => sum + day.overtimeHours, 0);
    const totalBillableHours = currentMonthDays.reduce((sum, day) => sum + day.billableHours, 0);
    
    const expectedHours = workingDays.length * 8;
    const completionRate = workingDays.length > 0 ? (completeDays / workingDays.length) * 100 : 0;
    
    // Calculate streaks
    const maxStreak = Math.max(...currentMonthDays.map(day => day.streak || 0));
    const currentStreakDays = currentMonthDays.reverse().find(day => (day.streak || 0) > 0);
    const currentStreak = currentStreakDays?.streak || 0;
    
    // Project distribution
    const allProjects = currentMonthDays.flatMap(day => day.projects);
    const projectCounts = allProjects.reduce((acc, project) => {
      acc[project] = (acc[project] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const topProjects = Object.entries(projectCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([project, count]) => ({ project, count }));

    // Status distribution
    const statusCounts = {
      complete: currentMonthDays.filter(day => day.status === 'complete').length,
      overTime: currentMonthDays.filter(day => day.status === 'over-time').length,
      partial: currentMonthDays.filter(day => day.status === 'partial').length,
      missing: currentMonthDays.filter(day => day.status === 'missing').length,
      working: currentMonthDays.filter(day => day.status === 'working').length,
    };

    return {
      totalHours,
      totalRegularHours,
      totalOvertimeHours,
      totalBillableHours,
      expectedHours,
      completeDays,
      partialDays: statusCounts.partial,
      missingDays: statusCounts.missing,
      workingDays: workingDays.length,
      completionRate,
      averageHours: workingDays.length > 0 ? totalHours / workingDays.length : 0,
      maxStreak,
      currentStreak,
      topProjects,
      statusCounts,
      efficiency: expectedHours > 0 ? (totalHours / expectedHours) * 100 : 0,
    };
  }, [calendarDays]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 35 }).map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const weekdayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="p-6 space-y-6">
      {/* Month Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 flex items-center space-x-2">
            <CalendarDaysIcon className="h-6 w-6 text-blue-600" />
            <span>{format(currentDate, 'MMMM yyyy')}</span>
          </h2>
          <p className="text-sm text-gray-600 mt-1">Monthly timesheet overview</p>
        </div>

        {/* View Toggle */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'calendar'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Calendar
            </button>
            <button
              onClick={() => setViewMode('stats')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'stats'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Statistics
            </button>
          </div>
        </div>
      </div>

      {/* Enhanced Monthly Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-2xl font-bold text-blue-600">
              {monthlySummary.totalHours.toFixed(1)}h
            </div>
            <ClockIcon className="h-6 w-6 text-blue-600" />
          </div>
          <div className="text-sm text-gray-600">Total Hours</div>
          <div className="text-xs text-gray-500 mt-1">
            {monthlySummary.expectedHours}h expected • {monthlySummary.efficiency.toFixed(0)}% efficiency
          </div>
          {monthlySummary.totalOvertimeHours > 0 && (
            <div className="text-xs text-orange-600 font-medium mt-1">
              +{monthlySummary.totalOvertimeHours.toFixed(1)}h overtime
            </div>
          )}
        </div>
        
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-2xl font-bold text-green-600">
              {monthlySummary.completeDays}/{monthlySummary.workingDays}
            </div>
            <CheckCircleIcon className="h-6 w-6 text-green-600" />
          </div>
          <div className="text-sm text-gray-600">Complete Days</div>
          <div className="text-xs text-gray-500 mt-1">
            {monthlySummary.completionRate.toFixed(0)}% completion rate
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1 mt-2">
            <div
              className="bg-green-600 h-1 rounded-full transition-all duration-300"
              style={{ width: `${monthlySummary.completionRate}%` }}
            ></div>
          </div>
        </div>
        
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-2xl font-bold text-purple-600">
              {monthlySummary.averageHours.toFixed(1)}h
            </div>
            <ChartBarIcon className="h-6 w-6 text-purple-600" />
          </div>
          <div className="text-sm text-gray-600">Avg per Day</div>
          <div className="text-xs text-gray-500 mt-1">
            {monthlySummary.totalBillableHours.toFixed(1)}h billable
          </div>
        </div>
        
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-2xl font-bold text-orange-600">
              {monthlySummary.currentStreak}
            </div>
            <FireIcon className="h-6 w-6 text-orange-600" />
          </div>
          <div className="text-sm text-gray-600">Current Streak</div>
          <div className="text-xs text-gray-500 mt-1">
            Best: {monthlySummary.maxStreak} days
          </div>
        </div>
      </div>

      {/* Statistics View */}
      {viewMode === 'stats' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Status Distribution */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Status Distribution</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <CheckCircleIcon className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-gray-700">Complete Days</span>
                </div>
                <span className="text-sm font-medium text-gray-900">
                  {monthlySummary.statusCounts.complete + monthlySummary.statusCounts.overTime}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <ClockIcon className="h-4 w-4 text-blue-500" />
                  <span className="text-sm text-gray-700">Partial Days</span>
                </div>
                <span className="text-sm font-medium text-gray-900">
                  {monthlySummary.statusCounts.partial}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <ExclamationTriangleIcon className="h-4 w-4 text-red-500" />
                  <span className="text-sm text-gray-700">Missing Days</span>
                </div>
                <span className="text-sm font-medium text-gray-900">
                  {monthlySummary.statusCounts.missing}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <ClockIcon className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm text-gray-700">In Progress</span>
                </div>
                <span className="text-sm font-medium text-gray-900">
                  {monthlySummary.statusCounts.working}
                </span>
              </div>
            </div>
          </div>

          {/* Top Projects */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Projects</h3>
            <div className="space-y-3">
              {monthlySummary.topProjects.map((item, index) => (
                <div key={item.project} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${
                      index === 0 ? 'bg-blue-500' : 
                      index === 1 ? 'bg-green-500' : 'bg-orange-500'
                    }`} />
                    <span className="text-sm text-gray-700 truncate">{item.project}</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    {item.count} days
                  </span>
                </div>
              ))}
              {monthlySummary.topProjects.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">
                  No project data available
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Status Workflow */}
      {timesheets.length > 0 && (
        <TimesheetStatusWorkflow
          timesheets={timesheets}
          canManageAll={isManagerOrAbove}
          onStatusUpdate={() => onDataRefresh?.()}
        />
      )}

      {/* Enhanced Calendar */}
      {viewMode === 'calendar' && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          {/* Calendar Header */}
          <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
            {weekdayNames.map((day) => (
              <div key={day} className="p-4 text-center text-sm font-semibold text-gray-700">
                {day}
              </div>
            ))}
          </div>

          {/* Enhanced Calendar Grid */}
          <div className="grid grid-cols-7">
            {calendarDays.map((day) => (
              <div
                key={day.date.toISOString()}
                className={`min-h-[140px] border-b border-r border-gray-200 p-3 cursor-pointer transition-all duration-200 hover:shadow-md relative ${
                  getDayBackgroundColor(day)
                } ${
                  !day.isCurrentMonth ? 'opacity-50' : ''
                } ${
                  selectedDay?.date.toISOString() === day.date.toISOString() 
                    ? 'ring-2 ring-blue-500' : ''
                }`}
                onClick={() => handleDayClick(day)}
                onMouseEnter={() => setHoveredDay(day.date)}
                onMouseLeave={() => setHoveredDay(null)}
              >
                {/* Date Header with Enhanced Info */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-1">
                    <span className={`text-sm font-semibold ${
                      !day.isCurrentMonth 
                        ? 'text-gray-400' 
                        : day.isToday 
                        ? 'text-blue-600' 
                        : 'text-gray-900'
                    }`}>
                      {format(day.date, 'd')}
                    </span>
                    {day.streak && day.streak >= 3 && (
                      <div className="text-xs bg-orange-100 text-orange-600 px-1 rounded font-medium">
                        {day.streak}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-1">
                    {day.status !== 'holiday' && getStatusIcon(day.status, day.streak)}
                    {day.timesheets.length > 0 && (
                      <span className="text-xs text-gray-500 bg-gray-100 px-1 rounded">
                        {day.timesheets.length}
                      </span>
                    )}
                  </div>
                </div>

                {/* Hours Display with Visual Indicator */}
                {day.totalHours > 0 && (
                  <div className="mb-2">
                    <div className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor(day.status)}`}>
                      {day.totalHours.toFixed(1)}h
                      {day.overtimeHours > 0 && (
                        <span className="ml-1 text-orange-600">+{day.overtimeHours.toFixed(1)}h</span>
                      )}
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
                      <div
                        className={`h-1 rounded-full transition-all duration-300 ${
                          day.status === 'complete' ? 'bg-green-500' :
                          day.status === 'over-time' ? 'bg-purple-500' :
                          day.status === 'partial' ? 'bg-blue-500' :
                          'bg-yellow-500'
                        }`}
                        style={{ width: `${Math.min((day.totalHours / 8) * 100, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                {/* Projects Preview with Color Indicators */}
                <div className="space-y-1 flex-1">
                  {day.timesheets.slice(0, 2).map((ts, index) => (
                    <div
                      key={ts.id}
                      className="text-xs text-gray-600 truncate flex items-center space-x-1"
                      title={`${ts.project_name} - ${ts.hours}h (${ts.status})`}
                    >
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        ts.is_billable ? 'bg-green-400' : 'bg-blue-400'
                      }`} />
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        ts.status === 'APPROVED' ? 'bg-green-400' :
                        ts.status === 'SUBMITTED' ? 'bg-yellow-400' :
                        ts.status === 'REJECTED' ? 'bg-red-400' :
                        'bg-gray-400'
                      }`} />
                      <span className="truncate font-medium">{ts.project_name}</span>
                    </div>
                  ))}
                  {day.timesheets.length > 2 && (
                    <div className="text-xs text-gray-500 font-medium">
                      +{day.timesheets.length - 2} more entries
                    </div>
                  )}
                </div>

                {/* Status Labels and Quick Actions */}
                <div className="flex items-center justify-between mt-auto">
                  {day.status === 'missing' && day.isCurrentMonth && !day.isWeekend && (
                    <div className="text-xs text-red-600 font-medium">
                      Missing
                    </div>
                  )}
                  {day.status === 'holiday' && (
                    <div className="text-xs text-gray-500">
                      Weekend
                    </div>
                  )}
                  {day.status === 'working' && (
                    <div className="text-xs text-yellow-600 font-medium">
                      In Progress
                    </div>
                  )}

                  {/* Quick Action Buttons (shown on hover) */}
                  {day.isCurrentMonth && !day.isWeekend && (
                    <div className={`flex items-center space-x-1 transition-opacity ${
                      hoveredDay?.toISOString() === day.date.toISOString() 
                        ? 'opacity-100' : 'opacity-0'
                    }`}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddTimeEntry(day);
                        }}
                        className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors"
                        title="Add Time Entry"
                      >
                        <PlusIcon className="h-3 w-3" />
                      </button>
                      {day.timesheets.length > 0 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDay(day);
                          }}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="View Details"
                        >
                          <EyeIcon className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Billable Hours Indicator */}
                {day.billableHours > 0 && (
                  <div className="absolute top-1 right-1">
                    <div className="w-2 h-2 bg-green-400 rounded-full" title={`${day.billableHours.toFixed(1)}h billable`}></div>
                  </div>
                )}

                {/* Status Count Dots */}
                {day.timesheets.length > 0 && (
                  <div className="absolute bottom-1 left-1 flex space-x-0.5">
                    {day.statusCounts.draft > 0 && (
                      <div className="w-1.5 h-1.5 bg-gray-400 rounded-full" title={`${day.statusCounts.draft} draft`}></div>
                    )}
                    {day.statusCounts.submitted > 0 && (
                      <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full" title={`${day.statusCounts.submitted} submitted`}></div>
                    )}
                    {day.statusCounts.approved > 0 && (
                      <div className="w-1.5 h-1.5 bg-green-400 rounded-full" title={`${day.statusCounts.approved} approved`}></div>
                    )}
                    {day.statusCounts.rejected > 0 && (
                      <div className="w-1.5 h-1.5 bg-red-400 rounded-full" title={`${day.statusCounts.rejected} rejected`}></div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Enhanced Legend */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Legend</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="flex items-center space-x-2">
            <CheckCircleIcon className="h-4 w-4 text-green-500" />
            <span>Complete (8+ hours)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="relative">
              <CheckCircleIcon className="h-4 w-4 text-purple-500" />
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-orange-400 rounded-full"></div>
            </div>
            <span>Overtime</span>
          </div>
          <div className="flex items-center space-x-2">
            <ClockIcon className="h-4 w-4 text-blue-500" />
            <span>Partial (4-8 hours)</span>
          </div>
          <div className="flex items-center space-x-2">
            <ClockIcon className="h-4 w-4 text-yellow-500" />
            <span>In Progress</span>
          </div>
          <div className="flex items-center space-x-2">
            <ExclamationTriangleIcon className="h-4 w-4 text-red-500" />
            <span>Missing</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="h-4 w-4 rounded-full bg-gray-300" />
            <span>Weekend</span>
          </div>
          <div className="flex items-center space-x-2">
            <FireIcon className="h-4 w-4 text-orange-500" />
            <span>Streak (5+ days)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="flex space-x-0.5">
              <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
              <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full"></div>
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
            </div>
            <span>Entry Status</span>
          </div>
        </div>
        
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span>Billable</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                <span>Non-billable</span>
              </div>
            </div>
            <span>Click any day to view details</span>
          </div>
        </div>
      </div>

      {/* Day Detail Modal */}
      {selectedDay && (
        <DayDetailModal
          day={selectedDay}
          onClose={() => setSelectedDay(null)}
          projects={projects}
          tasks={tasks}
          onDataRefresh={onDataRefresh}
        />
      )}
    </div>
  );
};

// Day Detail Modal Component
interface DayDetailModalProps {
  day: CalendarDay;
  onClose: () => void;
  projects: Project[];
  tasks: Task[];
  onDataRefresh?: () => void;
}

const DayDetailModal: React.FC<DayDetailModalProps> = ({
  day,
  onClose,
  projects,
  tasks,
  onDataRefresh,
}) => {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />
        
        <div className="relative w-full max-w-2xl bg-white rounded-lg shadow-xl">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {format(day.date, 'EEEE, MMMM dd, yyyy')}
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {day.totalHours.toFixed(1)}h logged • {day.timesheets.length} entries
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              ×
            </button>
          </div>

          <div className="p-6">
            {/* Day Summary */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-lg font-semibold text-blue-600">
                  {day.totalHours.toFixed(1)}h
                </div>
                <div className="text-xs text-gray-600">Total Hours</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-lg font-semibold text-green-600">
                  {day.billableHours.toFixed(1)}h
                </div>
                <div className="text-xs text-gray-600">Billable</div>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <div className="text-lg font-semibold text-purple-600">
                  {day.overtimeHours.toFixed(1)}h
                </div>
                <div className="text-xs text-gray-600">Overtime</div>
              </div>
            </div>

            {/* Timesheet Entries */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-gray-900">Time Entries</h4>
              {day.timesheets.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">
                  No time entries for this day
                </p>
              ) : (
                day.timesheets.map((ts) => (
                  <div key={ts.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${
                        ts.status === 'APPROVED' ? 'bg-green-400' :
                        ts.status === 'SUBMITTED' ? 'bg-yellow-400' :
                        ts.status === 'REJECTED' ? 'bg-red-400' :
                        'bg-gray-400'
                      }`} />
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {ts.project_name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {ts.task_name || 'General Work'} • {ts.status}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-gray-900">
                        {ts.hours}h
                      </div>
                      <div className="text-xs text-gray-500">
                        {ts.is_billable ? 'Billable' : 'Non-billable'}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="flex items-center justify-end px-6 py-4 bg-gray-50 space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Close
            </button>
            {!day.isWeekend && (
              <button className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">
                Add Entry
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
};

export default MonthlyTimesheetView;