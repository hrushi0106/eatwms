import React, { useState, useMemo, useCallback } from 'react';
import { format, eachDayOfInterval, isWeekend, isToday, parseISO } from 'date-fns';
import {
  PlusIcon,
  ClockIcon,
  PlayIcon,
  PauseIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  PencilIcon,
  EyeIcon,
  PaperAirplaneIcon,
} from '@heroicons/react/24/outline';
import { Timesheet, Project, Task } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import TimesheetEntryForm from './TimesheetEntryForm';
import DailyTimesheetModal from './DailyTimesheetModal';
import BulkTimesheetActions from './BulkTimesheetActions';
import { TimesheetStatusWorkflow } from './TimesheetStatusWorkflow';

interface WeeklyTimesheetViewProps {
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

interface DayEntry {
  date: Date;
  timesheets: Timesheet[];
  totalHours: number;
  regularHours: number;
  overtimeHours: number;
  checkIn?: string;
  checkOut?: string;
  breakDuration: number;
  status: 'working' | 'complete' | 'missing' | 'leave' | 'holiday' | 'partial';
  canEdit: boolean;
  hasSubmittedEntries: boolean;
}

interface TimeEntry {
  id?: number;
  project_id: number;
  task_id?: number;
  start_time: string;
  end_time: string;
  hours: number;
  description: string;
  is_billable: boolean;
}

const WeeklyTimesheetView: React.FC<WeeklyTimesheetViewProps> = ({
  currentDate = new Date(),
  viewMode = 'weekly',
  timesheets = [],
  projects = [],
  tasks = [],
  loading = false,
  onDataRefresh,
  dateRange,
  searchQuery,
}) => {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTimesheet, setEditingTimesheet] = useState<Timesheet | null>(null);
  const [submittingWeek, setSubmittingWeek] = useState(false);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [selectedTimesheets, setSelectedTimesheets] = useState<Set<number>>(new Set());

  const isManagerOrAbove = ['MANAGER', 'TEAM_LEAD', 'ADMIN'].includes(user?.role || '');

  // Calculate expected working hours (8 hours per weekday)
  const expectedHoursPerDay = 8;
  const breakDurationDefault = 1; // 1 hour default break

  // Generate days for the week with enhanced data calculation
  const weekDays = useMemo(() => {
    if (!dateRange) return [];
    
    const days = eachDayOfInterval({
      start: dateRange.start,
      end: dateRange.end,
    });

    return days.map((date): DayEntry => {
      const dateStr = format(date, 'yyyy-MM-dd');
      const dayTimesheets = timesheets.filter((ts) => ts.date === dateStr);
      
      const totalHours = dayTimesheets.reduce((sum, ts) => sum + ts.hours, 0);
      const overtimeHours = dayTimesheets.reduce((sum, ts) => sum + (ts.overtime_hours || 0), 0);
      const regularHours = totalHours - overtimeHours;
      
      // Get earliest start time and latest end time
      const startTimes = dayTimesheets.filter(ts => ts.start_time).map(ts => ts.start_time!);
      const endTimes = dayTimesheets.filter(ts => ts.end_time).map(ts => ts.end_time!);
      
      const checkIn = startTimes.length > 0 ? startTimes.sort()[0] : undefined;
      const checkOut = endTimes.length > 0 ? endTimes.sort().reverse()[0] : undefined;

      // Calculate break duration (simplified - could be enhanced with actual break data)
      const breakDuration = dayTimesheets.length > 0 ? breakDurationDefault : 0;

      // Determine status with more granular logic
      let status: DayEntry['status'] = 'missing';
      if (isWeekend(date)) {
        status = 'holiday';
      } else if (dayTimesheets.length > 0) {
        if (totalHours >= expectedHoursPerDay) {
          status = 'complete';
        } else if (totalHours >= expectedHoursPerDay * 0.5) {
          status = 'partial';
        } else {
          status = 'working';
        }
      }

      // Check if user can edit (own entries and DRAFT/REJECTED status)
      const canEdit = dayTimesheets.every(ts => 
        ts.user_id === user?.id && ['DRAFT', 'REJECTED'].includes(ts.status)
      );

      // Check if any entries are submitted/approved
      const hasSubmittedEntries = dayTimesheets.some(ts => 
        ['SUBMITTED', 'APPROVED'].includes(ts.status)
      );

      return {
        date,
        timesheets: dayTimesheets,
        totalHours,
        regularHours,
        overtimeHours,
        checkIn,
        checkOut,
        breakDuration,
        status,
        canEdit: canEdit || dayTimesheets.length === 0,
        hasSubmittedEntries,
      };
    });
  }, [dateRange, timesheets, user?.id]);

  // Calculate weekly totals and statistics
  const weeklyStats = useMemo(() => {
    const workingDays = weekDays.filter(day => !isWeekend(day.date));
    const completeDays = weekDays.filter(day => day.status === 'complete').length;
    const totalHours = weekDays.reduce((sum, day) => sum + day.totalHours, 0);
    const totalRegular = weekDays.reduce((sum, day) => sum + day.regularHours, 0);
    const totalOvertime = weekDays.reduce((sum, day) => sum + day.overtimeHours, 0);
    const expectedTotal = workingDays.length * expectedHoursPerDay;
    const missingHours = Math.max(0, expectedTotal - totalHours);
    
    return {
      totalHours,
      totalRegular,
      totalOvertime,
      completeDays,
      workingDays: workingDays.length,
      expectedTotal,
      missingHours,
      completionRate: workingDays.length > 0 ? (completeDays / workingDays.length) * 100 : 0,
      canSubmitWeek: weekDays.some(day => day.timesheets.length > 0 && day.canEdit),
    };
  }, [weekDays]);

  // Handle actions
  const handleAddTime = useCallback((date: Date) => {
    if (projects.length === 0) {
      toast.error('No projects available. Please contact your administrator.');
      return;
    }
    setSelectedDate(date);
    setShowAddModal(true);
  }, [projects.length]);

  const handleEditTimesheet = useCallback((timesheet: Timesheet) => {
    if (!['DRAFT', 'REJECTED'].includes(timesheet.status)) {
      toast.error('Only draft or rejected timesheets can be edited');
      return;
    }
    setEditingTimesheet(timesheet);
  }, []);

  const handleViewTimesheet = useCallback((timesheet: Timesheet) => {
    // Open view modal or navigate to detail page
    console.log('View timesheet:', timesheet);
  }, []);

  const handleSubmitWeek = useCallback(async () => {
    if (!weeklyStats.canSubmitWeek) {
      toast.error('No draft timesheets to submit');
      return;
    }

    setSubmittingWeek(true);
    try {
      // Get all draft timesheets for the week
      const draftTimesheets = weekDays
        .flatMap(day => day.timesheets)
        .filter(ts => ts.status === 'DRAFT' && ts.user_id === user?.id);

      // Submit each draft timesheet
      await Promise.all(
        draftTimesheets.map(ts => api.post(`/timesheets/${ts.id}/submit`))
      );

      toast.success(`Successfully submitted ${draftTimesheets.length} timesheet entries`);
      onDataRefresh?.();
    } catch (error) {
      console.error('Submit week error:', error);
      toast.error('Failed to submit weekly timesheet');
    } finally {
      setSubmittingWeek(false);
    }
  }, [weekDays, weeklyStats.canSubmitWeek, user?.id, onDataRefresh]);

  // Bulk action handlers
  const handleSelectTimesheet = useCallback((timesheetId: number) => {
    setSelectedTimesheets(prev => {
      const newSet = new Set(prev);
      if (newSet.has(timesheetId)) {
        newSet.delete(timesheetId);
      } else {
        newSet.add(timesheetId);
      }
      return newSet;
    });
  }, []);

  const handleSelectAllTimesheets = useCallback(() => {
    const allTimesheetIds = weekDays
      .flatMap(day => day.timesheets)
      .filter(ts => ts.user_id === user?.id && ['DRAFT', 'REJECTED'].includes(ts.status))
      .map(ts => ts.id);
    
    setSelectedTimesheets(new Set(allTimesheetIds));
  }, [weekDays, user?.id]);

  const handleDeselectAllTimesheets = useCallback(() => {
    setSelectedTimesheets(new Set());
  }, []);

  const handleBulkAction = useCallback(async (action: string, timesheetIds: number[]) => {
    try {
      switch (action) {
        case 'submit':
          await Promise.all(
            timesheetIds.map(id => api.post(`/timesheets/${id}/submit`))
          );
          toast.success(`Successfully submitted ${timesheetIds.length} timesheet entries`);
          break;
        case 'delete':
          await Promise.all(
            timesheetIds.map(id => api.delete(`/timesheets/${id}`))
          );
          toast.success(`Successfully deleted ${timesheetIds.length} timesheet entries`);
          break;
        default:
          break;
      }
      
      setSelectedTimesheets(new Set());
      onDataRefresh?.();
    } catch (error) {
      console.error('Bulk action error:', error);
      toast.error(`Failed to ${action} selected timesheets`);
    }
  }, [onDataRefresh]);

  const getStatusIcon = (status: DayEntry['status']) => {
    switch (status) {
      case 'complete':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'partial':
        return <ClockIcon className="h-5 w-5 text-blue-500" />;
      case 'working':
        return <PlayIcon className="h-5 w-5 text-blue-400" />;
      case 'missing':
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />;
      case 'leave':
        return <PauseIcon className="h-5 w-5 text-orange-500" />;
      case 'holiday':
        return <div className="h-5 w-5 rounded-full bg-gray-300" />;
      default:
        return null;
    }
  };

  const getStatusText = (status: DayEntry['status']) => {
    switch (status) {
      case 'complete':
        return 'Complete';
      case 'partial':
        return 'Partial';
      case 'working':
        return 'In Progress';
      case 'missing':
        return 'Missing';
      case 'leave':
        return 'On Leave';
      case 'holiday':
        return 'Weekend';
      default:
        return '';
    }
  };

  const getStatusColor = (status: DayEntry['status']) => {
    switch (status) {
      case 'complete':
        return 'bg-green-50 border-green-200 text-green-700';
      case 'partial':
        return 'bg-blue-50 border-blue-200 text-blue-700';
      case 'working':
        return 'bg-blue-50 border-blue-200 text-blue-600';
      case 'missing':
        return 'bg-red-50 border-red-200 text-red-700';
      case 'leave':
        return 'bg-orange-50 border-orange-200 text-orange-700';
      case 'holiday':
        return 'bg-gray-50 border-gray-200 text-gray-600';
      default:
        return 'bg-white border-gray-200 text-gray-700';
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-3">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Week Overview Header - Responsive design */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        <div className="flex-1">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Weekly Timesheet</h2>
          <p className="text-sm sm:text-base text-gray-600 mt-1">
            {dateRange && format(dateRange.start, 'MMM dd')} - {dateRange && format(dateRange.end, 'MMM dd, yyyy')}
          </p>
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 mt-2 text-xs sm:text-sm">
            <span className="text-gray-600">
              {weeklyStats.completeDays}/{weeklyStats.workingDays} days complete
            </span>
            <span className="text-gray-400">•</span>
            <span className="text-gray-600">
              {weeklyStats.totalHours.toFixed(1)}h/{weeklyStats.expectedTotal}h logged
            </span>
            {weeklyStats.missingHours > 0 && (
              <>
                <span className="text-gray-400">•</span>
                <span className="text-red-600 font-medium">
                  {weeklyStats.missingHours.toFixed(1)}h missing
                </span>
              </>
            )}
          </div>
        </div>
        
        {/* Action buttons - responsive layout */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
          {selectedTimesheets.size > 0 && (
            <BulkTimesheetActions
              selectedCount={selectedTimesheets.size}
              timesheetIds={Array.from(selectedTimesheets)}
              onAction={handleBulkAction}
              onSelectAll={handleSelectAllTimesheets}
              onDeselectAll={handleDeselectAllTimesheets}
            />
          )}
          
          <button 
            onClick={() => onDataRefresh?.()}
            className="px-3 sm:px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
          >
            Refresh
          </button>
          {weeklyStats.canSubmitWeek && (
            <button 
              onClick={handleSubmitWeek}
              disabled={submittingWeek}
              className="flex items-center justify-center space-x-2 px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              <PaperAirplaneIcon className="h-4 w-4" />
              <span>{submittingWeek ? 'Submitting...' : 'Submit Week'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Weekly Progress Bar - Enhanced responsive design */}
      <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Weekly Progress</span>
          <span className="text-sm text-gray-600">
            {weeklyStats.completionRate.toFixed(0)}% complete
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 sm:h-3">
          <div
            className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 sm:h-3 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${weeklyStats.completionRate}%` }}
          ></div>
        </div>
        {/* Additional stats for larger screens */}
        <div className="hidden sm:flex items-center justify-between mt-3 pt-3 border-t border-gray-100 text-xs text-gray-600">
          <span>Days completed: {weeklyStats.completeDays}</span>
          <span>Hours logged: {weeklyStats.totalHours.toFixed(1)}h</span>
          <span>Expected: {weeklyStats.expectedTotal}h</span>
        </div>
      </div>

      {/* Status Workflow */}
      {weekDays.some(day => day.timesheets.length > 0) && (
        <TimesheetStatusWorkflow
          timesheets={weekDays.flatMap(day => day.timesheets)}
          canManageAll={isManagerOrAbove}
          onStatusUpdate={() => onDataRefresh?.()}
        />
      )}

      {/* Desktop Table View (hidden on mobile) */}
      <div className="hidden lg:block bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <input
                    type="checkbox"
                    checked={selectedTimesheets.size > 0 && selectedTimesheets.size === weekDays.flatMap(day => day.timesheets).filter(ts => ts.user_id === user?.id && ['DRAFT', 'REJECTED'].includes(ts.status)).length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        handleSelectAllTimesheets();
                      } else {
                        handleDeselectAllTimesheets();
                      }
                    }}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                </th>
                <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Day
                </th>
                <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Check In
                </th>
                <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Check Out
                </th>
                <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Break
                </th>
                <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Regular
                </th>
                <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Overtime
                </th>
                <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {weekDays.map((day) => {
                const regularHours = Math.min(day.totalHours, 8);
                const overtimeHours = Math.max(0, day.totalHours - 8);
                const isCurrentDay = isToday(day.date);

                return (
                  <tr
                    key={day.date.toISOString()}
                    className={`hover:bg-gray-50 transition-colors ${
                      isCurrentDay ? 'bg-blue-50 hover:bg-blue-100' : ''
                    }`}
                  >
                    {/* Selection Checkbox */}
                    <td className="px-4 xl:px-6 py-4 whitespace-nowrap">
                      {day.timesheets.length > 0 && day.canEdit && (
                        <div className="flex items-center space-y-1">
                          {day.timesheets
                            .filter(ts => ts.user_id === user?.id && ['DRAFT', 'REJECTED'].includes(ts.status))
                            .map(ts => (
                              <input
                                key={ts.id}
                                type="checkbox"
                                checked={selectedTimesheets.has(ts.id)}
                                onChange={() => handleSelectTimesheet(ts.id)}
                                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              />
                            ))}
                        </div>
                      )}
                    </td>

                    {/* Date */}
                    <td className="px-4 xl:px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {format(day.date, 'MMM dd')}
                      </div>
                      <div className="text-xs text-gray-500">
                        {format(day.date, 'yyyy')}
                      </div>
                    </td>

                    {/* Day */}
                    <td className="px-4 xl:px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm font-medium ${
                        isWeekend(day.date) ? 'text-gray-400' : 'text-gray-900'
                      }`}>
                        {format(day.date, 'EEEE')}
                      </div>
                    </td>

                    {/* Check In */}
                    <td className="px-4 xl:px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {day.checkIn ? (
                          <span className="font-mono">{day.checkIn}</span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </div>
                    </td>

                    {/* Check Out */}
                    <td className="px-4 xl:px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {day.checkOut ? (
                          <span className="font-mono">{day.checkOut}</span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </div>
                    </td>

                    {/* Break */}
                    <td className="px-4 xl:px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {day.breakDuration > 0 ? (
                          <span className="font-mono">{day.breakDuration.toFixed(1)}h</span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </div>
                    </td>

                    {/* Regular Hours */}
                    <td className="px-4 xl:px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-green-600">
                        {day.regularHours.toFixed(1)}h
                      </div>
                    </td>

                    {/* Overtime */}
                    <td className="px-4 xl:px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm font-semibold ${
                        day.overtimeHours > 0 ? 'text-orange-600' : 'text-gray-400'
                      }`}>
                        {day.overtimeHours.toFixed(1)}h
                      </div>
                    </td>

                    {/* Total Hours */}
                    <td className="px-4 xl:px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-blue-600">
                        {day.totalHours.toFixed(1)}h
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-4 xl:px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(day.status)}
                        <span className={`text-sm px-2 py-1 rounded-full border text-xs font-medium ${getStatusColor(day.status)}`}>
                          {getStatusText(day.status)}
                        </span>
                        {day.hasSubmittedEntries && (
                          <span className="text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                            Submitted
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-4 xl:px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-1 xl:space-x-2">
                        {day.canEdit && (
                          <button
                            onClick={() => handleAddTime(day.date)}
                            className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
                            title="Add Time Entry"
                          >
                            <PlusIcon className="h-3 xl:h-4 w-3 xl:w-4" />
                          </button>
                        )}
                        
                        {day.timesheets.length > 0 && (
                          <button
                            onClick={() => setSelectedDate(day.date)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="View Details"
                          >
                            <EyeIcon className="h-3 xl:h-4 w-3 xl:w-4" />
                          </button>
                        )}
                        
                        {day.canEdit && day.timesheets.length > 0 && (
                          <button
                            onClick={() => handleEditTimesheet(day.timesheets[0])}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Edit"
                          >
                            <PencilIcon className="h-3 xl:h-4 w-3 xl:w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card View (visible on small screens) */}
      <div className="lg:hidden space-y-3">
        {weekDays.map((day) => {
          const regularHours = Math.min(day.totalHours, 8);
          const overtimeHours = Math.max(0, day.totalHours - 8);
          const isCurrentDay = isToday(day.date);

          return (
            <div
              key={day.date.toISOString()}
              className={`bg-white border border-gray-200 rounded-lg p-4 ${
                isCurrentDay ? 'ring-2 ring-blue-500 border-blue-300' : ''
              } hover:shadow-md transition-shadow`}
            >
              {/* Card Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  {/* Selection checkbox for mobile */}
                  {day.timesheets.length > 0 && day.canEdit && (
                    <div className="flex flex-col space-y-1">
                      {day.timesheets
                        .filter(ts => ts.user_id === user?.id && ['DRAFT', 'REJECTED'].includes(ts.status))
                        .map(ts => (
                          <input
                            key={ts.id}
                            type="checkbox"
                            checked={selectedTimesheets.has(ts.id)}
                            onChange={() => handleSelectTimesheet(ts.id)}
                            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                        ))}
                    </div>
                  )}
                  
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className={`text-lg font-semibold ${
                        isWeekend(day.date) ? 'text-gray-400' : 'text-gray-900'
                      }`}>
                        {format(day.date, 'EEEE')}
                      </h3>
                      {isCurrentDay && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          Today
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">
                      {format(day.date, 'MMM dd, yyyy')}
                    </p>
                  </div>
                </div>
                
                {/* Status and hours for mobile */}
                <div className="text-right">
                  <div className="flex items-center space-x-2 justify-end mb-1">
                    {getStatusIcon(day.status)}
                    <span className={`text-xs px-2 py-1 rounded-full border font-medium ${getStatusColor(day.status)}`}>
                      {getStatusText(day.status)}
                    </span>
                  </div>
                  <div className="text-lg font-bold text-blue-600">
                    {day.totalHours.toFixed(1)}h
                  </div>
                </div>
              </div>

              {/* Time Details Grid */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-gray-600 mb-1">Check In</div>
                  <div className="text-sm font-mono text-gray-900">
                    {day.checkIn || '—'}
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-gray-600 mb-1">Check Out</div>
                  <div className="text-sm font-mono text-gray-900">
                    {day.checkOut || '—'}
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-gray-600 mb-1">Break</div>
                  <div className="text-sm font-mono text-gray-900">
                    {day.breakDuration > 0 ? `${day.breakDuration.toFixed(1)}h` : '—'}
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-gray-600 mb-1">Regular</div>
                  <div className="text-sm font-semibold text-green-600">
                    {day.regularHours.toFixed(1)}h
                  </div>
                </div>
              </div>

              {/* Overtime indicator */}
              {day.overtimeHours > 0 && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-2 mb-3">
                  <div className="flex items-center space-x-2">
                    <ExclamationTriangleIcon className="h-4 w-4 text-orange-600" />
                    <span className="text-sm font-medium text-orange-800">
                      {day.overtimeHours.toFixed(1)}h overtime
                    </span>
                  </div>
                </div>
              )}

              {/* Submitted entries indicator */}
              {day.hasSubmittedEntries && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 mb-3">
                  <div className="flex items-center space-x-2">
                    <PaperAirplaneIcon className="h-4 w-4 text-blue-600" />
                    <span className="text-sm text-blue-800">
                      Has submitted entries
                    </span>
                  </div>
                </div>
              )}

              {/* Action Buttons for Mobile */}
              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <div className="flex items-center space-x-2">
                  {day.canEdit && (
                    <button
                      onClick={() => handleAddTime(day.date)}
                      className="flex items-center space-x-1 px-3 py-2 text-green-600 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors text-sm"
                    >
                      <PlusIcon className="h-4 w-4" />
                      <span className="hidden sm:inline">Add Time</span>
                    </button>
                  )}
                  
                  {day.timesheets.length > 0 && (
                    <button
                      onClick={() => setSelectedDate(day.date)}
                      className="flex items-center space-x-1 px-3 py-2 text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors text-sm"
                    >
                      <EyeIcon className="h-4 w-4" />
                      <span className="hidden sm:inline">View</span>
                    </button>
                  )}
                </div>
                
                {day.canEdit && day.timesheets.length > 0 && (
                  <button
                    onClick={() => handleEditTimesheet(day.timesheets[0])}
                    className="flex items-center space-x-1 px-3 py-2 text-gray-600 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors text-sm"
                  >
                    <PencilIcon className="h-4 w-4" />
                    <span className="hidden sm:inline">Edit</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Enhanced Weekly Summary - Responsive Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xl sm:text-2xl font-bold text-blue-600">
              {weeklyStats.totalHours.toFixed(1)}h
            </div>
            <ClockIcon className="h-5 sm:h-6 w-5 sm:w-6 text-blue-600" />
          </div>
          <div className="text-sm text-gray-600">Total Hours</div>
          <div className="text-xs text-gray-500 mt-1">
            {weeklyStats.expectedTotal}h expected
          </div>
        </div>
        
        <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xl sm:text-2xl font-bold text-green-600">
              {weeklyStats.totalRegular.toFixed(1)}h
            </div>
            <CheckCircleIcon className="h-5 sm:h-6 w-5 sm:w-6 text-green-600" />
          </div>
          <div className="text-sm text-gray-600">Regular Hours</div>
        </div>
        
        <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xl sm:text-2xl font-bold text-orange-600">
              {weeklyStats.totalOvertime.toFixed(1)}h
            </div>
            <ExclamationTriangleIcon className="h-5 sm:h-6 w-5 sm:w-6 text-orange-600" />
          </div>
          <div className="text-sm text-gray-600">Overtime Hours</div>
        </div>
        
        <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xl sm:text-2xl font-bold text-blue-600">
              {weeklyStats.completeDays}/{weeklyStats.workingDays}
            </div>
            <PlayIcon className="h-5 sm:h-6 w-5 sm:w-6 text-blue-600" />
          </div>
          <div className="text-sm text-gray-600">Days Complete</div>
          <div className="text-xs text-gray-500 mt-1">
            {weeklyStats.completionRate.toFixed(0)}% completion
          </div>
        </div>
        
        <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4 sm:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between mb-2">
            <div className={`text-xl sm:text-2xl font-bold ${
              weeklyStats.missingHours > 0 ? 'text-red-600' : 'text-green-600'
            }`}>
              {weeklyStats.missingHours.toFixed(1)}h
            </div>
            {weeklyStats.missingHours > 0 ? (
              <ExclamationTriangleIcon className="h-5 sm:h-6 w-5 sm:w-6 text-red-600" />
            ) : (
              <CheckCircleIcon className="h-5 sm:h-6 w-5 sm:w-6 text-green-600" />
            )}
          </div>
          <div className="text-sm text-gray-600">
            {weeklyStats.missingHours > 0 ? 'Missing Hours' : 'All Hours Logged'}
          </div>
        </div>
      </div>

      {/* Daily Detail Modal */}
      {selectedDate && (
        <DailyTimesheetModal
          isOpen={!!selectedDate}
          onClose={() => setSelectedDate(null)}
          date={selectedDate}
          timesheets={timesheets.filter(ts => ts.date === format(selectedDate, 'yyyy-MM-dd'))}
          projects={projects}
          tasks={tasks}
          onDataRefresh={() => onDataRefresh?.()}
        />
      )}

      {/* Add Time Entry Form */}
      <TimesheetEntryForm
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setSelectedDate(null);
        }}
        onSave={() => {
          setShowAddModal(false);
          setSelectedDate(null);
          onDataRefresh?.();
        }}
        selectedDate={selectedDate ? format(selectedDate, 'yyyy-MM-dd') : undefined}
        projects={projects}
        tasks={tasks}
        editingTimesheet={editingTimesheet}
        mode={editingTimesheet ? 'edit' : 'create'}
      />
    </div>
  );
};

export default WeeklyTimesheetView;