import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, eachDayOfInterval, isSameDay, isToday } from 'date-fns';
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon, ClockIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import api from '../../api/axios';
import { Timesheet, Project, Task } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { TimesheetStatusBadge } from '../common/Badge';
import TimesheetQuickAddModal from './TimesheetQuickAddModal';
import TimesheetEditModal from './TimesheetEditModal';
import LoadingSpinner from '../common/LoadingSpinner';

interface WeeklyTimesheetViewProps {
  selectedDate?: Date;
}

const WeeklyTimesheetView: React.FC<WeeklyTimesheetViewProps> = ({ 
  selectedDate = new Date() 
}) => {
  const { user } = useAuth();
  const [currentWeek, setCurrentWeek] = useState(selectedDate);
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickAddDate, setQuickAddDate] = useState<string | null>(null);
  const [editTimesheet, setEditTimesheet] = useState<Timesheet | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const isManagerOrAbove = ['MANAGER', 'TEAM_LEAD', 'ADMIN'].includes(user?.role || '');

  // Calculate week boundaries
  const weekStart = useMemo(() => startOfWeek(currentWeek, { weekStartsOn: 1 }), [currentWeek]);
  const weekEnd = useMemo(() => endOfWeek(currentWeek, { weekStartsOn: 1 }), [currentWeek]);
  const weekDays = useMemo(() => eachDayOfInterval({ start: weekStart, end: weekEnd }), [weekStart, weekEnd]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [timesheetsRes, projectsRes] = await Promise.all([
        api.get('/timesheets', {
          params: {
            start_date: format(weekStart, 'yyyy-MM-dd'),
            end_date: format(weekEnd, 'yyyy-MM-dd'),
            limit: 100
          }
        }),
        api.get('/projects')
      ]);

      setTimesheets(timesheetsRes.data.data || []);
      setProjects(projectsRes.data.data || []);
    } catch (error) {
      toast.error('Failed to load timesheet data');
    } finally {
      setLoading(false);
    }
  }, [weekStart, weekEnd]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Group timesheets by date
  const timesheetsByDate = useMemo(() => {
    const grouped: Record<string, Timesheet[]> = {};
    timesheets.forEach(ts => {
      const dateKey = ts.date;
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(ts);
    });
    return grouped;
  }, [timesheets]);

  // Calculate totals
  const weeklyTotals = useMemo(() => {
    const totals = { total: 0, billable: 0, nonBillable: 0 };
    timesheets.forEach(ts => {
      totals.total += ts.hours;
      if (ts.is_billable) {
        totals.billable += ts.hours;
      } else {
        totals.nonBillable += ts.hours;
      }
    });
    return totals;
  }, [timesheets]);

  const getDayTotalHours = (date: Date) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    return timesheetsByDate[dateKey]?.reduce((sum, ts) => sum + ts.hours, 0) || 0;
  };

  const handlePreviousWeek = () => {
    setCurrentWeek(prev => subWeeks(prev, 1));
  };

  const handleNextWeek = () => {
    setCurrentWeek(prev => addWeeks(prev, 1));
  };

  const handleQuickAdd = (date: Date) => {
    setQuickAddDate(format(date, 'yyyy-MM-dd'));
    setShowQuickAdd(true);
  };

  const handleEdit = (timesheet: Timesheet) => {
    setEditTimesheet(timesheet);
  };

  const handleSubmit = async (id: number) => {
    setActionLoading(id);
    try {
      await api.post(`/timesheets/${id}/submit`);
      toast.success('Submitted for approval');
      fetchData();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Submit failed');
    } finally {
      setActionLoading(null);
    }
  };

  const handleApprove = async (id: number) => {
    setActionLoading(id);
    try {
      await api.post(`/timesheets/${id}/approve`);
      toast.success('Timesheet approved');
      fetchData();
    } catch (error) {
      toast.error('Action failed');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: number) => {
    setActionLoading(id);
    try {
      await api.post(`/timesheets/${id}/reject`, { comment: 'Rejected by manager' });
      toast.success('Timesheet rejected');
      fetchData();
    } catch (error) {
      toast.error('Action failed');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this timesheet entry?')) return;
    
    try {
      await api.delete(`/timesheets/${id}`);
      toast.success('Timesheet deleted');
      fetchData();
    } catch (error) {
      toast.error('Delete failed');
    }
  };

  const onTimesheetSaved = () => {
    fetchData();
    setShowQuickAdd(false);
    setEditTimesheet(null);
    setQuickAddDate(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold text-gray-900">Timesheet</h1>
          <div className="flex items-center space-x-2 bg-gray-50 rounded-lg p-1">
            <button
              onClick={handlePreviousWeek}
              className="p-2 hover:bg-white rounded-md transition-colors"
            >
              <ChevronLeftIcon className="h-5 w-5 text-gray-600" />
            </button>
            <span className="px-4 py-2 text-sm font-medium text-gray-900 min-w-[200px] text-center">
              {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
            </span>
            <button
              onClick={handleNextWeek}
              className="p-2 hover:bg-white rounded-md transition-colors"
            >
              <ChevronRightIcon className="h-5 w-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Weekly Summary */}
        <div className="flex items-center space-x-6 text-sm">
          <div className="flex items-center space-x-2">
            <ClockIcon className="h-5 w-5 text-gray-500" />
            <span className="font-medium">{weeklyTotals.total.toFixed(1)}h Total</span>
          </div>
          <div className="text-green-600 font-medium">
            {weeklyTotals.billable.toFixed(1)}h Billable
          </div>
          <div className="text-gray-500">
            {weeklyTotals.nonBillable.toFixed(1)}h Non-billable
          </div>
        </div>
      </div>

      {/* Weekly Grid */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {/* Header Row */}
        <div className="grid grid-cols-8 bg-gray-50 border-b border-gray-200">
          <div className="p-4 font-semibold text-gray-700 border-r border-gray-200">
            Project/Task
          </div>
          {weekDays.map((day) => (
            <div
              key={day.toISOString()}
              className={`p-4 border-r border-gray-200 last:border-r-0 text-center ${
                isToday(day) ? 'bg-blue-50 border-blue-200' : ''
              }`}
            >
              <div className="font-semibold text-gray-700">
                {format(day, 'EEE')}
              </div>
              <div className={`text-sm ${isToday(day) ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>
                {format(day, 'MMM d')}
              </div>
              <div className="text-xs mt-1 font-medium text-gray-600">
                {getDayTotalHours(day).toFixed(1)}h
              </div>
            </div>
          ))}
        </div>

        {/* Project Rows */}
        {projects.length > 0 ? (
          <>
            {projects.map((project) => {
              const projectTimesheets = timesheets.filter(ts => ts.project_id === project.id);
              if (projectTimesheets.length === 0 && !isManagerOrAbove) return null;

              return (
                <div key={project.id} className="border-b border-gray-200 last:border-b-0">
                  <div className="grid grid-cols-8">
                    <div className="p-4 bg-gray-50 border-r border-gray-200">
                      <div className="font-medium text-gray-900 text-sm">
                        {project.name}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {project.project_code}
                      </div>
                    </div>
                    {weekDays.map((day) => {
                      const dayKey = format(day, 'yyyy-MM-dd');
                      const dayTimesheets = projectTimesheets.filter(ts => ts.date === dayKey);
                      const dayTotal = dayTimesheets.reduce((sum, ts) => sum + ts.hours, 0);

                      return (
                        <div
                          key={`${project.id}-${dayKey}`}
                          className={`p-2 border-r border-gray-200 last:border-r-0 min-h-[80px] relative group ${
                            isToday(day) ? 'bg-blue-50/30' : ''
                          }`}
                        >
                          {dayTimesheets.length > 0 ? (
                            <div className="space-y-1">
                              {dayTimesheets.map((ts) => (
                                <TimesheetEntry
                                  key={ts.id}
                                  timesheet={ts}
                                  isManagerOrAbove={isManagerOrAbove}
                                  currentUserId={user?.id}
                                  onEdit={() => handleEdit(ts)}
                                  onDelete={() => handleDelete(ts.id)}
                                  onSubmit={() => handleSubmit(ts.id)}
                                  onApprove={() => handleApprove(ts.id)}
                                  onReject={() => handleReject(ts.id)}
                                  actionLoading={actionLoading === ts.id}
                                />
                              ))}
                              {dayTotal > 0 && (
                                <div className="text-xs font-medium text-blue-600 mt-1">
                                  {dayTotal.toFixed(1)}h
                                </div>
                              )}
                            </div>
                          ) : (
                            <button
                              onClick={() => handleQuickAdd(day)}
                              className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-gray-50 transition-all rounded"
                            >
                              <PlusIcon className="h-5 w-5 text-gray-400" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </>
        ) : (
          <div className="p-12 text-center text-gray-500">
            <ClockIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Projects Found</h3>
            <p className="text-gray-500">You need projects to track time. Contact your administrator.</p>
          </div>
        )}

        {/* Quick Add Row */}
        <div className="bg-gray-50 border-t border-gray-200">
          <div className="grid grid-cols-8">
            <div className="p-4 border-r border-gray-200">
              <button
                onClick={() => {
                  setQuickAddDate(format(new Date(), 'yyyy-MM-dd'));
                  setShowQuickAdd(true);
                }}
                className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 font-medium text-sm"
              >
                <PlusIcon className="h-4 w-4" />
                <span>Add Time</span>
              </button>
            </div>
            {weekDays.map((day) => (
              <div key={`quick-add-${day.toISOString()}`} className="p-4 border-r border-gray-200 last:border-r-0 text-center">
                <button
                  onClick={() => handleQuickAdd(day)}
                  className="text-gray-400 hover:text-blue-600 transition-colors"
                >
                  <PlusIcon className="h-5 w-5 mx-auto" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showQuickAdd && (
        <TimesheetQuickAddModal
          isOpen={showQuickAdd}
          onClose={() => {
            setShowQuickAdd(false);
            setQuickAddDate(null);
          }}
          onSave={onTimesheetSaved}
          initialDate={quickAddDate}
          projects={projects}
        />
      )}

      {editTimesheet && (
        <TimesheetEditModal
          isOpen={!!editTimesheet}
          onClose={() => setEditTimesheet(null)}
          onSave={onTimesheetSaved}
          timesheet={editTimesheet}
          projects={projects}
        />
      )}
    </div>
  );
};

// Individual Timesheet Entry Component
interface TimesheetEntryProps {
  timesheet: Timesheet;
  isManagerOrAbove: boolean;
  currentUserId?: number;
  onEdit: () => void;
  onDelete: () => void;
  onSubmit: () => void;
  onApprove: () => void;
  onReject: () => void;
  actionLoading: boolean;
}

const TimesheetEntry: React.FC<TimesheetEntryProps> = ({
  timesheet,
  isManagerOrAbove,
  currentUserId,
  onEdit,
  onDelete,
  onSubmit,
  onApprove,
  onReject,
  actionLoading
}) => {
  const canEdit = timesheet.status === 'DRAFT' && timesheet.user_id === currentUserId;
  const canSubmit = timesheet.status === 'DRAFT' && timesheet.user_id === currentUserId;
  const canApprove = timesheet.status === 'SUBMITTED' && isManagerOrAbove;

  return (
    <div className="group relative">
      <div className="bg-white border border-gray-200 rounded p-2 hover:shadow-sm transition-shadow">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-gray-900 truncate">
              {timesheet.hours}h
            </div>
            {timesheet.task_name && (
              <div className="text-xs text-gray-500 truncate">
                {timesheet.task_name}
              </div>
            )}
            <div className="flex items-center space-x-2 mt-1">
              <TimesheetStatusBadge status={timesheet.status} />
              {timesheet.is_billable && (
                <span className="inline-block w-2 h-2 bg-green-400 rounded-full" title="Billable" />
              )}
            </div>
          </div>
        </div>

        {/* Action buttons - shown on hover */}
        <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="flex space-x-1">
            {canEdit && (
              <button
                onClick={onEdit}
                className="p-1 text-blue-600 hover:bg-blue-50 rounded text-xs"
                title="Edit"
              >
                ✏️
              </button>
            )}
            {canSubmit && (
              <button
                onClick={onSubmit}
                disabled={actionLoading}
                className="p-1 text-green-600 hover:bg-green-50 rounded"
                title="Submit"
              >
                <CheckIcon className="h-3 w-3" />
              </button>
            )}
            {canApprove && (
              <>
                <button
                  onClick={onApprove}
                  disabled={actionLoading}
                  className="p-1 text-green-600 hover:bg-green-50 rounded"
                  title="Approve"
                >
                  <CheckIcon className="h-3 w-3" />
                </button>
                <button
                  onClick={onReject}
                  disabled={actionLoading}
                  className="p-1 text-red-500 hover:bg-red-50 rounded"
                  title="Reject"
                >
                  <XMarkIcon className="h-3 w-3" />
                </button>
              </>
            )}
            {canEdit && (
              <button
                onClick={onDelete}
                className="p-1 text-red-500 hover:bg-red-50 rounded text-xs"
                title="Delete"
              >
                🗑️
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeeklyTimesheetView;