import React, { useState, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import {
  XMarkIcon,
  PlusIcon,
  ClockIcon,
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { Timesheet, Project, Task } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import TimesheetEntryForm from './TimesheetEntryForm';
import { ConfirmModal } from '../common/Modal';

interface DailyTimesheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: Date;
  timesheets: Timesheet[];
  projects: Project[];
  tasks: Task[];
  onDataRefresh: () => void;
}

const DailyTimesheetModal: React.FC<DailyTimesheetModalProps> = ({
  isOpen,
  onClose,
  date,
  timesheets,
  projects,
  tasks,
  onDataRefresh,
}) => {
  const { user } = useAuth();
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<Timesheet | null>(null);

  const dayStats = useMemo(() => {
    const totalHours = timesheets.reduce((sum, ts) => sum + ts.hours, 0);
    const billableHours = timesheets.filter(ts => ts.is_billable).reduce((sum, ts) => sum + ts.hours, 0);
    const overtimeHours = timesheets.reduce((sum, ts) => sum + (ts.overtime_hours || 0), 0);
    const regularHours = totalHours - overtimeHours;
    
    const startTimes = timesheets.filter(ts => ts.start_time).map(ts => ts.start_time!);
    const endTimes = timesheets.filter(ts => ts.end_time).map(ts => ts.end_time!);
    
    const checkIn = startTimes.length > 0 ? startTimes.sort()[0] : null;
    const checkOut = endTimes.length > 0 ? endTimes.sort().reverse()[0] : null;
    
    return {
      totalHours,
      regularHours,
      overtimeHours,
      billableHours,
      nonBillableHours: totalHours - billableHours,
      checkIn,
      checkOut,
      projectCount: new Set(timesheets.map(ts => ts.project_id)).size,
      entryCount: timesheets.length,
    };
  }, [timesheets]);

  const handleDelete = async () => {
    if (!deleteId) return;
    
    setLoading(true);
    try {
      await api.delete(`/timesheets/${deleteId}`);
      toast.success('Timesheet entry deleted');
      setDeleteId(null);
      onDataRefresh();
    } catch (error) {
      toast.error('Failed to delete timesheet entry');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (timesheetId: number) => {
    setLoading(true);
    try {
      await api.post(`/timesheets/${timesheetId}/submit`);
      toast.success('Timesheet entry submitted for approval');
      onDataRefresh();
    } catch (error) {
      toast.error('Failed to submit timesheet entry');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-screen items-center justify-center p-2 sm:p-4">
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />
          
          <div className="relative w-full max-w-xs sm:max-w-sm md:max-w-2xl lg:max-w-4xl bg-white rounded-lg shadow-xl mx-2 sm:mx-0">
            {/* Header - Responsive design */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 md:p-6 border-b border-gray-200">
              <div className="flex-1 pr-2 sm:pr-0">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 leading-tight">
                  Daily Timesheet
                </h2>
                <p className="text-sm sm:text-base text-gray-600 mt-1">
                  {format(date, 'EEEE, MMM dd, yyyy')}
                </p>
                <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-2 text-xs sm:text-sm text-gray-600">
                  <span>{dayStats.entryCount} entries</span>
                  <span className="hidden sm:inline">•</span>
                  <span>{dayStats.projectCount} projects</span>
                  <span className="hidden sm:inline">•</span>
                  <span>{dayStats.totalHours.toFixed(1)} hours total</span>
                </div>
              </div>
              <button
                onClick={onClose}
                className="absolute top-3 right-3 sm:relative sm:top-0 sm:right-0 p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <XMarkIcon className="h-5 sm:h-6 w-5 sm:w-6 text-gray-400" />
              </button>
            </div>

            {/* Summary Cards - Responsive grid */}
            <div className="p-3 sm:p-4 md:p-6 border-b border-gray-200">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 sm:p-3 md:p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex-1">
                      <div className="text-lg sm:text-xl md:text-2xl font-bold text-blue-600">
                        {dayStats.totalHours.toFixed(1)}h
                      </div>
                      <div className="text-xs sm:text-sm text-gray-700">Total Hours</div>
                    </div>
                    <ClockIcon className="hidden sm:block h-4 sm:h-5 md:h-6 w-4 sm:w-5 md:w-6 text-blue-600 mt-1 sm:mt-0" />
                  </div>
                </div>
                
                <div className="bg-green-50 border border-green-200 rounded-lg p-2 sm:p-3 md:p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex-1">
                      <div className="text-lg sm:text-xl md:text-2xl font-bold text-green-600">
                        {dayStats.billableHours.toFixed(1)}h
                      </div>
                      <div className="text-xs sm:text-sm text-gray-700">Billable</div>
                    </div>
                    <CheckCircleIcon className="hidden sm:block h-4 sm:h-5 md:h-6 w-4 sm:w-5 md:w-6 text-green-600 mt-1 sm:mt-0" />
                  </div>
                </div>
                
                {dayStats.overtimeHours > 0 ? (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-2 sm:p-3 md:p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex-1">
                        <div className="text-lg sm:text-xl md:text-2xl font-bold text-orange-600">
                          {dayStats.overtimeHours.toFixed(1)}h
                        </div>
                        <div className="text-xs sm:text-sm text-gray-700">Overtime</div>
                      </div>
                      <ExclamationTriangleIcon className="hidden sm:block h-4 sm:h-5 md:h-6 w-4 sm:w-5 md:w-6 text-orange-600 mt-1 sm:mt-0" />
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-2 sm:p-3 md:p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex-1">
                        <div className="text-lg sm:text-xl md:text-2xl font-bold text-gray-600">
                          0h
                        </div>
                        <div className="text-xs sm:text-sm text-gray-700">Overtime</div>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-2 sm:p-3 md:p-4 col-span-2 md:col-span-1">
                  <div className="text-sm sm:text-base md:text-lg font-semibold text-gray-900 mb-1 text-center md:text-left">
                    {dayStats.checkIn && dayStats.checkOut ? (
                      <>
                        <span className="block md:hidden">{dayStats.checkIn} - {dayStats.checkOut}</span>
                        <span className="hidden md:block">{dayStats.checkIn} - {dayStats.checkOut}</span>
                      </>
                    ) : (
                      'No check-in/out'
                    )}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-600 text-center md:text-left">Work Hours</div>
                </div>
              </div>
            </div>

            {/* Time Entries List - Enhanced responsive design */}
            <div className="p-3 sm:p-4 md:p-6 max-h-60 sm:max-h-80 md:max-h-96 overflow-y-auto">
              {timesheets.length === 0 ? (
                <div className="text-center py-6 sm:py-8">
                  <ClockIcon className="h-10 sm:h-12 w-10 sm:w-12 text-gray-300 mx-auto mb-3 sm:mb-4" />
                  <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">No time entries</h3>
                  <p className="text-sm sm:text-base text-gray-500">No timesheet entries for this day.</p>
                </div>
              ) : (
                <div className="space-y-3 sm:space-y-4">
                  {timesheets.map((timesheet) => (
                    <div
                      key={timesheet.id}
                      className="bg-gray-50 border border-gray-200 rounded-lg p-3 sm:p-4 hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between">
                        <div className="flex-1 min-w-0">
                          {/* Project and Task - Responsive layout */}
                          <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2 mb-2">
                            <h4 className="text-sm sm:text-base font-semibold text-gray-900 truncate">
                              {timesheet.project_name}
                            </h4>
                            {timesheet.task_name && (
                              <>
                                <span className="hidden sm:inline text-gray-400">•</span>
                                <span className="text-xs sm:text-sm text-gray-600 truncate">
                                  {timesheet.task_name}
                                </span>
                              </>
                            )}
                            <div className={`inline-flex px-2 py-0.5 text-xs rounded-full mt-1 sm:mt-0 ${
                              timesheet.is_billable 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {timesheet.is_billable ? 'Billable' : 'Non-Billable'}
                            </div>
                          </div>

                          {/* Description - Responsive text */}
                          <p className="text-xs sm:text-sm text-gray-700 mb-2 sm:mb-3 line-clamp-2">
                            {timesheet.description}
                          </p>

                          {/* Time Details - Responsive layout */}
                          <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 text-xs sm:text-sm text-gray-600 space-y-1 sm:space-y-0">
                            <div className="flex items-center space-x-1">
                              <ClockIcon className="h-3 sm:h-4 w-3 sm:w-4" />
                              <span className="font-medium">{timesheet.hours}h</span>
                            </div>
                            {timesheet.start_time && timesheet.end_time && (
                              <div className="font-mono text-xs">
                                {timesheet.start_time} - {timesheet.end_time}
                              </div>
                            )}
                            {timesheet.overtime_hours && timesheet.overtime_hours > 0 && (
                              <div className="text-orange-600 font-medium">
                                +{timesheet.overtime_hours}h overtime
                              </div>
                            )}
                          </div>

                          {/* Status and Comment - Responsive layout */}
                          <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2 mt-2 space-y-1 sm:space-y-0">
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                              timesheet.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                              timesheet.status === 'SUBMITTED' ? 'bg-blue-100 text-blue-800' :
                              timesheet.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {timesheet.status}
                            </span>
                            {timesheet.comment && (
                              <span className="text-xs text-gray-500 truncate">
                                Note: {timesheet.comment}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Actions - Responsive layout */}
                        <div className="flex items-center justify-end space-x-1 sm:space-x-2 mt-3 lg:mt-0 lg:ml-4">
                          {timesheet.status === 'DRAFT' && timesheet.user_id === user?.id && (
                            <>
                              <button
                                onClick={() => handleSubmit(timesheet.id)}
                                disabled={loading}
                                className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
                                title="Submit for approval"
                              >
                                <CheckCircleIcon className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => setEditingEntry(timesheet)}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                title="Edit entry"
                              >
                                <PencilIcon className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => setDeleteId(timesheet.id)}
                                className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors"
                                title="Delete entry"
                              >
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer - Responsive layout */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-0 p-3 sm:p-4 md:p-6 border-t border-gray-200">
              <button
                onClick={() => setShowEntryForm(true)}
                className="flex items-center justify-center space-x-2 px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm sm:text-base"
              >
                <PlusIcon className="h-4 w-4" />
                <span>Add Time Entry</span>
              </button>
              
              <button
                onClick={onClose}
                className="px-3 sm:px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm sm:text-base"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Timesheet Entry"
        message="Are you sure you want to delete this timesheet entry? This action cannot be undone."
        confirmLabel="Delete"
      />

      {/* Timesheet Entry Form */}
      <TimesheetEntryForm
        isOpen={showEntryForm || !!editingEntry}
        onClose={() => {
          setShowEntryForm(false);
          setEditingEntry(null);
        }}
        onSave={() => {
          setShowEntryForm(false);
          setEditingEntry(null);
          onDataRefresh();
        }}
        selectedDate={format(date, 'yyyy-MM-dd')}
        projects={projects}
        tasks={tasks}
        editingTimesheet={editingEntry}
        mode={editingEntry ? 'edit' : 'create'}
      />
    </>
  );
};

export default DailyTimesheetModal;