import React, { useState } from 'react';
import { format, parseISO } from 'date-fns';
import {
  XMarkIcon,
  ClockIcon,
  UserIcon,
  FolderIcon,
  CheckCircleIcon,
  XCircleIcon,
  ChatBubbleLeftRightIcon,
  CalendarIcon,
  CurrencyDollarIcon,
} from '@heroicons/react/24/outline';
import { Timesheet } from '../../types';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { TimesheetStatusBadge } from '../common/Badge';

interface TimesheetDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  timesheet: Timesheet | null;
  onUpdate: () => void;
  canManage?: boolean;
}

const TimesheetDetailModal: React.FC<TimesheetDetailModalProps> = ({
  isOpen,
  onClose,
  timesheet,
  onUpdate,
  canManage = false,
}) => {
  const [actionLoading, setActionLoading] = useState(false);
  const [comment, setComment] = useState('');
  const [showCommentField, setShowCommentField] = useState(false);

  if (!isOpen || !timesheet) return null;

  const handleApprove = async () => {
    setActionLoading(true);
    try {
      await api.post(`/timesheets/${timesheet.id}/approve`, {
        comment: comment.trim() || undefined,
      });
      toast.success('Timesheet approved successfully');
      onUpdate();
      onClose();
    } catch (error: any) {
      console.error('Approve error:', error);
      toast.error(error?.response?.data?.message || 'Failed to approve timesheet');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!comment.trim()) {
      toast.error('Please provide a reason for rejection');
      setShowCommentField(true);
      return;
    }

    setActionLoading(true);
    try {
      await api.post(`/timesheets/${timesheet.id}/reject`, {
        comment: comment.trim(),
      });
      toast.success('Timesheet rejected');
      onUpdate();
      onClose();
    } catch (error: any) {
      console.error('Reject error:', error);
      toast.error(error?.response?.data?.message || 'Failed to reject timesheet');
    } finally {
      setActionLoading(false);
    }
  };

  const formatTime = (timeString: string) => {
    try {
      const time = new Date(`2000-01-01T${timeString}`);
      return format(time, 'h:mm a');
    } catch {
      return timeString;
    }
  };

  const calculateDuration = (startTime: string, endTime: string, breakDuration: number = 0) => {
    try {
      const start = new Date(`2000-01-01T${startTime}`);
      const end = new Date(`2000-01-01T${endTime}`);
      const diffInMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
      const totalHours = (diffInMinutes - breakDuration) / 60;
      return Math.max(0, totalHours).toFixed(2);
    } catch {
      return '0.00';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />
        
        <div className="relative w-full max-w-2xl bg-white rounded-lg shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Timesheet Entry Details</h3>
              <p className="text-sm text-gray-600 mt-1">
                {format(parseISO(timesheet.date), 'EEEE, MMMM dd, yyyy')}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Employee Information */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center space-x-3 mb-3">
                <UserIcon className="h-5 w-5 text-gray-500" />
                <h4 className="text-sm font-medium text-gray-900">Employee Information</h4>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Name:</span>
                  <p className="font-medium text-gray-900">{timesheet.employee_name}</p>
                </div>
                <div>
                  <span className="text-gray-600">Department:</span>
                  <p className="font-medium text-gray-900">{timesheet.department || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-gray-600">Employee ID:</span>
                  <p className="font-medium text-gray-900">{timesheet.employee_id || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-gray-600">Status:</span>
                  <TimesheetStatusBadge status={timesheet.status} />
                </div>
              </div>
            </div>

            {/* Project & Task Information */}
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center space-x-3 mb-3">
                <FolderIcon className="h-5 w-5 text-blue-500" />
                <h4 className="text-sm font-medium text-gray-900">Project & Task Details</h4>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Project:</span>
                  <p className="font-medium text-gray-900">{timesheet.project_name}</p>
                </div>
                <div>
                  <span className="text-gray-600">Task:</span>
                  <p className="font-medium text-gray-900">{timesheet.task_name || 'General Work'}</p>
                </div>
              </div>
            </div>

            {/* Time Information */}
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center space-x-3 mb-3">
                <ClockIcon className="h-5 w-5 text-green-500" />
                <h4 className="text-sm font-medium text-gray-900">Time Details</h4>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Start Time:</span>
                  <p className="font-medium text-gray-900">
                    {timesheet.start_time ? formatTime(timesheet.start_time) : 'N/A'}
                  </p>
                </div>
                <div>
                  <span className="text-gray-600">End Time:</span>
                  <p className="font-medium text-gray-900">
                    {timesheet.end_time ? formatTime(timesheet.end_time) : 'N/A'}
                  </p>
                </div>
                <div>
                  <span className="text-gray-600">Regular Hours:</span>
                  <p className="font-semibold text-green-600">{timesheet.hours}h</p>
                </div>
                <div>
                  <span className="text-gray-600">Overtime Hours:</span>
                  <p className="font-semibold text-orange-600">
                    {timesheet.overtime_hours || 0}h
                  </p>
                </div>
                <div>
                  <span className="text-gray-600">Break Duration:</span>
                  <p className="font-medium text-gray-900">
                    {timesheet.break_duration || 0} minutes
                  </p>
                </div>
                <div>
                  <span className="text-gray-600">Billable:</span>
                  <div className="flex items-center space-x-2">
                    {timesheet.is_billable ? (
                      <>
                        <CheckCircleIcon className="h-4 w-4 text-green-500" />
                        <span className="text-green-600 font-medium">Yes</span>
                      </>
                    ) : (
                      <>
                        <XCircleIcon className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-600">No</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Description */}
            {timesheet.description && (
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Work Description</h4>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {timesheet.description}
                  </p>
                </div>
              </div>
            )}

            {/* Timestamps */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center space-x-3 mb-3">
                <CalendarIcon className="h-5 w-5 text-gray-500" />
                <h4 className="text-sm font-medium text-gray-900">Timestamps</h4>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Created:</span>
                  <p className="font-medium text-gray-900">
                    {format(parseISO(timesheet.created_at), 'MMM dd, yyyy h:mm a')}
                  </p>
                </div>
                <div>
                  <span className="text-gray-600">Last Updated:</span>
                  <p className="font-medium text-gray-900">
                    {format(parseISO(timesheet.updated_at), 'MMM dd, yyyy h:mm a')}
                  </p>
                </div>
              </div>
            </div>

            {/* Manager Actions */}
            {canManage && timesheet.status === 'SUBMITTED' && (
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">Manager Actions</h4>
                
                {/* Comment Field */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Comments (optional for approval, required for rejection)
                    </label>
                    <textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Add a comment about this timesheet entry..."
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 bg-gray-50 rounded-b-lg">
            <div className="text-sm text-gray-600">
              Entry ID: {timesheet.id}
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Close
              </button>
              
              {canManage && timesheet.status === 'SUBMITTED' && (
                <>
                  <button
                    onClick={handleReject}
                    disabled={actionLoading}
                    className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <XMarkIcon className="h-4 w-4" />
                    <span>Reject</span>
                  </button>
                  
                  <button
                    onClick={handleApprove}
                    disabled={actionLoading}
                    className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <CheckCircleIcon className="h-4 w-4" />
                    <span>Approve</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimesheetDetailModal;