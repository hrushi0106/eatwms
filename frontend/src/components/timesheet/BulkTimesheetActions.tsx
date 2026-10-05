import React, { useState, useMemo } from 'react';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import {
  PaperAirplaneIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  CalendarDaysIcon,
  CheckIcon,
  XMarkIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { Timesheet } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../api/axios';
import toast from 'react-hot-toast';

interface BulkTimesheetActionsProps {
  timesheets?: Timesheet[];
  selectedDate?: Date;
  onUpdate?: () => void;
  viewMode?: 'weekly' | 'monthly';
  // Manager mode props
  selectedCount?: number;
  timesheetIds?: number[];
  onAction?: (action: string, timesheetIds: number[]) => void;
  onSelectAll?: () => void;
  onDeselectAll?: () => void;
  managerMode?: boolean;
}

interface ValidationResult {
  isValid: boolean;
  warnings: string[];
  errors: string[];
  missingDays: Date[];
  incompleteEntries: Timesheet[];
}

const BulkTimesheetActions: React.FC<BulkTimesheetActionsProps> = ({
  timesheets = [],
  selectedDate = new Date(),
  onUpdate = () => {},
  viewMode = 'weekly',
  // Manager mode props
  selectedCount = 0,
  timesheetIds = [],
  onAction = () => {},
  onSelectAll = () => {},
  onDeselectAll = () => {},
  managerMode = false,
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showValidation, setShowValidation] = useState(false);

  // Early return for manager mode
  if (managerMode) {
    return (
      <div className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center space-x-4">
          <span className="text-sm font-medium text-gray-700">
            {selectedCount} timesheet{selectedCount !== 1 ? 's' : ''} selected
          </span>
          <div className="flex items-center space-x-2">
            <button
              onClick={onSelectAll}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Select All
            </button>
            <span className="text-gray-400">|</span>
            <button
              onClick={onDeselectAll}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              Clear
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => onAction('approve', timesheetIds)}
            disabled={selectedCount === 0}
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <CheckIcon className="h-4 w-4" />
            <span>Approve Selected</span>
          </button>
          
          <button
            onClick={() => onAction('reject', timesheetIds)}
            disabled={selectedCount === 0}
            className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <XMarkIcon className="h-4 w-4" />
            <span>Reject Selected</span>
          </button>
        </div>
      </div>
    );
  }

  // Calculate period boundaries
  const periodStart = viewMode === 'weekly' 
    ? startOfWeek(selectedDate, { weekStartsOn: 1 })
    : new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
  
  const periodEnd = viewMode === 'weekly'
    ? endOfWeek(selectedDate, { weekStartsOn: 1 })
    : new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);

  // Filter user's timesheets only
  const userTimesheets = useMemo(() => {
    return timesheets.filter(ts => ts.user_id === user?.id);
  }, [timesheets, user?.id]);

  // Group timesheets by status
  const statusGroups = useMemo(() => {
    const groups = {
      DRAFT: [] as Timesheet[],
      SUBMITTED: [] as Timesheet[],
      APPROVED: [] as Timesheet[],
      REJECTED: [] as Timesheet[],
    };

    userTimesheets.forEach(ts => {
      if (ts.status in groups) {
        groups[ts.status as keyof typeof groups].push(ts);
      }
    });

    return groups;
  }, [userTimesheets]);

  // Validate timesheet completeness
  const validationResult = useMemo((): ValidationResult => {
    const warnings: string[] = [];
    const errors: string[] = [];
    const missingDays: Date[] = [];
    const incompleteEntries: Timesheet[] = [];

    // Check for missing weekdays (Monday to Friday)
    let current = new Date(periodStart);
    while (current <= periodEnd) {
      const dayOfWeek = current.getDay();
      if (dayOfWeek >= 1 && dayOfWeek <= 5) { // Monday to Friday
        const dateStr = format(current, 'yyyy-MM-dd');
        const dayTimesheets = userTimesheets.filter(ts => ts.date === dateStr);
        
        if (dayTimesheets.length === 0) {
          missingDays.push(new Date(current));
        } else {
          const totalHours = dayTimesheets.reduce((sum, ts) => sum + ts.hours, 0);
          if (totalHours < 6) { // Less than 6 hours might be incomplete
            warnings.push(`${format(current, 'MMM dd')} has only ${totalHours.toFixed(1)} hours logged`);
          }
        }
      }
      current.setDate(current.getDate() + 1);
    }

    // Check for incomplete entries (no description, very short time, etc.)
    userTimesheets.forEach(ts => {
      if (!ts.description || ts.description.length < 10) {
        incompleteEntries.push(ts);
        warnings.push(`Entry on ${format(new Date(ts.date), 'MMM dd')} needs better description`);
      }
      if (ts.hours < 0.25) {
        warnings.push(`Entry on ${format(new Date(ts.date), 'MMM dd')} has very short duration`);
      }
    });

    // Check if there are any entries to submit
    if (statusGroups.DRAFT.length === 0 && statusGroups.REJECTED.length === 0) {
      errors.push('No draft or rejected entries found to submit');
    }

    if (missingDays.length > 0) {
      errors.push(`Missing timesheet entries for ${missingDays.length} working day${missingDays.length > 1 ? 's' : ''}`);
    }

    const isValid = errors.length === 0;

    return {
      isValid,
      warnings,
      errors,
      missingDays,
      incompleteEntries,
    };
  }, [userTimesheets, statusGroups, periodStart, periodEnd]);

  const handleBulkSubmit = async (force: boolean = false) => {
    if (!force && !validationResult.isValid) {
      setShowValidation(true);
      return;
    }

    setLoading(true);
    try {
      const submittableEntries = [...statusGroups.DRAFT, ...statusGroups.REJECTED];
      
      if (submittableEntries.length === 0) {
        toast.error('No entries available for submission');
        return;
      }

      // Submit all draft and rejected entries
      const promises = submittableEntries.map(ts => 
        api.post(`/timesheets/${ts.id}/submit`)
      );

      await Promise.all(promises);

      toast.success(`Successfully submitted ${submittableEntries.length} timesheet entr${submittableEntries.length === 1 ? 'y' : 'ies'} for approval`);
      onUpdate();
      setShowValidation(false);
    } catch (error: any) {
      console.error('Bulk submit error:', error);
      toast.error(error?.response?.data?.message || 'Failed to submit timesheets');
    } finally {
      setLoading(false);
    }
  };

  const handleRecallSubmission = async () => {
    setLoading(true);
    try {
      // This would require a backend endpoint to recall submitted entries
      // For now, we'll show that it's not implemented
      toast.error('Recall functionality would need to be implemented on the backend');
    } catch (error: any) {
      toast.error('Failed to recall submissions');
    } finally {
      setLoading(false);
    }
  };

  const getTotalHours = () => {
    return userTimesheets.reduce((sum, ts) => sum + ts.hours, 0);
  };

  const getExpectedHours = () => {
    if (viewMode === 'weekly') {
      return 40; // 5 days × 8 hours
    }
    // For monthly, count working days
    let workingDays = 0;
    let current = new Date(periodStart);
    while (current <= periodEnd) {
      const dayOfWeek = current.getDay();
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        workingDays++;
      }
      current.setDate(current.getDate() + 1);
    }
    return workingDays * 8;
  };

  const expectedHours = getExpectedHours();
  const totalHours = getTotalHours();
  const completionRate = expectedHours > 0 ? (totalHours / expectedHours) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Summary Statistics */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            {viewMode === 'weekly' ? 'Weekly' : 'Monthly'} Summary
          </h3>
          <span className="text-sm text-gray-600">
            {format(periodStart, 'MMM dd')} - {format(periodEnd, 'MMM dd, yyyy')}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {totalHours.toFixed(1)}h
            </div>
            <div className="text-sm text-gray-600">Total Hours</div>
            <div className="text-xs text-gray-500">
              of {expectedHours}h expected
            </div>
          </div>

          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {statusGroups.APPROVED.length}
            </div>
            <div className="text-sm text-gray-600">Approved</div>
          </div>

          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {statusGroups.SUBMITTED.length}
            </div>
            <div className="text-sm text-gray-600">Pending</div>
          </div>

          <div className="text-center">
            <div className="text-2xl font-bold text-gray-600">
              {statusGroups.DRAFT.length + statusGroups.REJECTED.length}
            </div>
            <div className="text-sm text-gray-600">Draft/Rejected</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Completion Progress</span>
            <span className="text-sm text-gray-600">{completionRate.toFixed(0)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                completionRate >= 100 ? 'bg-green-500' :
                completionRate >= 80 ? 'bg-blue-500' :
                completionRate >= 60 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${Math.min(completionRate, 100)}%` }}
            ></div>
          </div>
        </div>

        {/* Validation Status */}
        <div className={`p-3 rounded-lg ${
          validationResult.isValid 
            ? 'bg-green-50 border border-green-200' 
            : validationResult.errors.length > 0 
            ? 'bg-red-50 border border-red-200'
            : 'bg-yellow-50 border border-yellow-200'
        }`}>
          <div className="flex items-center space-x-2">
            {validationResult.isValid ? (
              <CheckCircleIcon className="h-5 w-5 text-green-600" />
            ) : (
              <ExclamationTriangleIcon className="h-5 w-5 text-orange-600" />
            )}
            <span className={`text-sm font-medium ${
              validationResult.isValid ? 'text-green-800' : 'text-orange-800'
            }`}>
              {validationResult.isValid 
                ? 'Timesheet is ready for submission' 
                : `${validationResult.errors.length} issue${validationResult.errors.length > 1 ? 's' : ''} found`
              }
            </span>
          </div>
          
          {validationResult.warnings.length > 0 && (
            <div className="mt-2">
              <button
                onClick={() => setShowValidation(true)}
                className="text-sm text-orange-600 hover:text-orange-800 underline"
              >
                View details
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions</h3>
        
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => handleBulkSubmit(false)}
            disabled={loading || (statusGroups.DRAFT.length + statusGroups.REJECTED.length) === 0}
            className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <PaperAirplaneIcon className="h-4 w-4" />
            )}
            <span>
              Submit {viewMode === 'weekly' ? 'Week' : 'Month'} 
              ({statusGroups.DRAFT.length + statusGroups.REJECTED.length})
            </span>
          </button>

          {statusGroups.SUBMITTED.length > 0 && (
            <button
              onClick={handleRecallSubmission}
              disabled={loading}
              className="flex items-center space-x-2 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ClockIcon className="h-4 w-4" />
              <span>Recall Submissions ({statusGroups.SUBMITTED.length})</span>
            </button>
          )}

          <button
            onClick={() => setShowValidation(true)}
            className="flex items-center space-x-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <CalendarDaysIcon className="h-4 w-4" />
            <span>View Details</span>
          </button>
        </div>
      </div>

      {/* Validation Details Modal */}
      {showValidation && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowValidation(false)} />
            
            <div className="relative w-full max-w-lg bg-white rounded-lg shadow-xl">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Timesheet Validation
                </h3>

                {/* Errors */}
                {validationResult.errors.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-red-800 mb-2 flex items-center">
                      <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                      Issues that must be resolved:
                    </h4>
                    <ul className="space-y-1">
                      {validationResult.errors.map((error, index) => (
                        <li key={index} className="text-sm text-red-700">
                          • {error}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Warnings */}
                {validationResult.warnings.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-orange-800 mb-2">
                      Recommendations:
                    </h4>
                    <ul className="space-y-1">
                      {validationResult.warnings.map((warning, index) => (
                        <li key={index} className="text-sm text-orange-700">
                          • {warning}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Missing Days */}
                {validationResult.missingDays.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-800 mb-2">
                      Missing entries for:
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {validationResult.missingDays.map((date, index) => (
                        <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm">
                          {format(date, 'MMM dd')}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {validationResult.isValid && validationResult.warnings.length === 0 && (
                  <div className="text-center py-4">
                    <CheckCircleIcon className="h-12 w-12 text-green-500 mx-auto mb-2" />
                    <p className="text-green-800">All checks passed! Your timesheet is ready for submission.</p>
                  </div>
                )}

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={() => setShowValidation(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Close
                  </button>
                  
                  {!validationResult.isValid && (statusGroups.DRAFT.length + statusGroups.REJECTED.length) > 0 && (
                    <button
                      onClick={() => handleBulkSubmit(true)}
                      disabled={loading}
                      className="px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 disabled:opacity-50"
                    >
                      Submit Anyway
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BulkTimesheetActions;