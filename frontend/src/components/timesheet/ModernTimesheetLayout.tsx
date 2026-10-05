import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfDay, addDays, subDays } from 'date-fns';
import TimesheetHeader from './TimesheetHeader';
import TimesheetSummaryCards from './TimesheetSummaryCards';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../api/axios';
import { Timesheet, Project, Task } from '../../types';
import toast from 'react-hot-toast';

export type ViewMode = 'daily' | 'weekly' | 'monthly';

interface ModernTimesheetLayoutProps {
  children?: React.ReactNode;
  defaultViewMode?: ViewMode;
  onDateRangeChange?: (startDate: Date, endDate: Date) => void;
  onViewModeChange?: (mode: ViewMode) => void;
}

const ModernTimesheetLayout: React.FC<ModernTimesheetLayoutProps> = ({
  children,
  defaultViewMode = 'weekly',
  onDateRangeChange,
  onViewModeChange,
}) => {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>(defaultViewMode);
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Calculate date range based on view mode
  const dateRange = useMemo(() => {
    switch (viewMode) {
      case 'daily':
        const dayStart = startOfDay(currentDate);
        return { start: dayStart, end: dayStart };
      case 'weekly':
        return {
          start: startOfWeek(currentDate, { weekStartsOn: 1 }),
          end: endOfWeek(currentDate, { weekStartsOn: 1 }),
        };
      case 'monthly':
        return {
          start: startOfMonth(currentDate),
          end: endOfMonth(currentDate),
        };
      default:
        return { start: new Date(), end: new Date() };
    }
  }, [currentDate, viewMode]);

  // Fetch timesheet data
  const fetchData = useCallback(async () => {
    if (!dateRange.start || !dateRange.end) return;
    
    setLoading(true);
    try {
      const [timesheetsRes, projectsRes, tasksRes] = await Promise.all([
        api.get('/timesheets', {
          params: {
            start_date: format(dateRange.start, 'yyyy-MM-dd'),
            end_date: format(dateRange.end, 'yyyy-MM-dd'),
            limit: 200,
          },
        }),
        api.get('/projects', { params: { status: 'ACTIVE', limit: 100 } }),
        api.get('/tasks', { params: { limit: 500 } }),
      ]);

      setTimesheets(timesheetsRes.data.data || []);
      setProjects(projectsRes.data.data || []);
      setTasks(tasksRes.data.data || []);
    } catch (error) {
      console.error('Failed to fetch timesheet data:', error);
      toast.error('Failed to load timesheet data');
    } finally {
      setLoading(false);
    }
  }, [dateRange.start, dateRange.end]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter timesheets based on search query
  const filteredTimesheets = useMemo(() => {
    if (!searchQuery.trim()) return timesheets;
    
    const query = searchQuery.toLowerCase();
    return timesheets.filter(
      (ts) =>
        ts.project_name?.toLowerCase().includes(query) ||
        ts.task_name?.toLowerCase().includes(query) ||
        ts.description?.toLowerCase().includes(query)
    );
  }, [timesheets, searchQuery]);

  // Calculate totals
  const totalHours = useMemo(() => {
    const regular = filteredTimesheets.reduce((sum, ts) => sum + ts.hours, 0);
    const overtime = filteredTimesheets.reduce((sum, ts) => sum + (ts.overtime_hours || 0), 0);
    return {
      regular,
      overtime,
      total: regular + overtime,
      billable: filteredTimesheets
        .filter((ts) => ts.is_billable)
        .reduce((sum, ts) => sum + ts.hours, 0),
      nonBillable: filteredTimesheets
        .filter((ts) => !ts.is_billable)
        .reduce((sum, ts) => sum + ts.hours, 0),
    };
  }, [filteredTimesheets]);

  // Calculate summary stats for different statuses
  const summaryStats = useMemo(() => {
    const stats = {
      totalHours: totalHours.total,
      regularHours: totalHours.regular,
      overtimeHours: totalHours.overtime,
      billableHours: totalHours.billable,
      leaveHours: 0, // Will be calculated from leave data when integrated
      missingHours: 0, // Will be calculated based on expected working hours
      workingDays: 0,
      submittedEntries: 0,
      approvedEntries: 0,
      pendingEntries: 0,
    };

    // Calculate working days in the current range
    let current = new Date(dateRange.start);
    while (current <= dateRange.end) {
      const dayOfWeek = current.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Exclude weekends
        stats.workingDays++;
      }
      current = addDays(current, 1);
    }

    // Calculate expected hours (assuming 8 hours per working day)
    const expectedHours = stats.workingDays * 8;
    stats.missingHours = Math.max(0, expectedHours - stats.totalHours);

    // Count entries by status
    filteredTimesheets.forEach((ts) => {
      switch (ts.status) {
        case 'SUBMITTED':
          stats.submittedEntries++;
          break;
        case 'APPROVED':
          stats.approvedEntries++;
          break;
        case 'DRAFT':
          stats.pendingEntries++;
          break;
      }
    });

    return stats;
  }, [filteredTimesheets, totalHours, dateRange]);

  const handleDateChange = useCallback((date: Date) => {
    setCurrentDate(date);
  }, []);

  const handleViewModeChange = useCallback((mode: ViewMode) => {
    setViewMode(mode);
    onViewModeChange?.(mode);
  }, [onViewModeChange]);

  const handleTodayClick = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  // Notify parent of date range changes
  useEffect(() => {
    onDateRangeChange?.(dateRange.start, dateRange.end);
  }, [dateRange.start, dateRange.end, onDateRangeChange]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Responsive container with mobile-first approach */}
      <div className="w-full max-w-7xl mx-auto">
        {/* Modern Header with responsive design */}
        <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm shadow-sm border-b border-gray-200/50">
          <div className="px-2 sm:px-4 md:px-6 lg:px-8 py-3 sm:py-4">
            <TimesheetHeader
              currentDate={currentDate}
              onDateChange={handleDateChange}
              viewMode={viewMode}
              onViewModeChange={handleViewModeChange}
              onTodayClick={handleTodayClick}
              onSearchChange={handleSearchChange}
              showSearch={true}
              totalHours={totalHours}
            />
          </div>
        </div>

        {/* Summary Cards with responsive spacing */}
        <div className="px-2 sm:px-4 md:px-6 lg:px-8 py-3 sm:py-4 md:py-6">
          <TimesheetSummaryCards
            stats={summaryStats}
            loading={loading}
            viewMode={viewMode}
          />
        </div>

        {/* Main Content Area with responsive design */}
        <div className="px-2 sm:px-4 md:px-6 lg:px-8 pb-4 sm:pb-6 md:pb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200/50 
                         min-h-[400px] sm:min-h-[500px] md:min-h-[600px] 
                         overflow-hidden">
            {/* Content with responsive padding */}
            <div className="p-2 sm:p-4 md:p-6 lg:p-8 h-full">
              {/* Content passed via children prop or rendered timesheet views */}
              {children && React.isValidElement(children) ? (
                React.cloneElement(children as React.ReactElement, {
                  currentDate,
                  viewMode,
                  timesheets: filteredTimesheets,
                  projects,
                  tasks,
                  loading,
                  onDataRefresh: fetchData,
                  dateRange,
                  searchQuery,
                })
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <p className="text-gray-500">No content to display</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModernTimesheetLayout;