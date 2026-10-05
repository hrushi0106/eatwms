import React, { useState } from 'react';
import { format } from 'date-fns';
import {
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  PaperAirplaneIcon,
  XMarkIcon,
  ChatBubbleLeftIcon,
  UserIcon,
} from '@heroicons/react/24/outline';
import { Timesheet } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../api/axios';
import toast from 'react-hot-toast';

interface TimesheetStatusWorkflowProps {
  timesheets: Timesheet[];
  onStatusUpdate: () => void;
  viewMode: 'individual' | 'bulk';
  selectedDate?: Date;
}

interface StatusAction {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  description: string;
  requiresComment?: boolean;
  allowedRoles: string[];
  fromStatuses: string[];
  toStatus: string;
}

const statusActions: StatusAction[] = [
  {
    id: 'submit',
    label: 'Submit for Approval',
    icon: PaperAirplaneIcon,
    color: 'blue',
    description: 'Submit timesheet entries for manager review',
    allowedRoles: ['EMPLOYEE', 'TEAM_LEAD', 'MANAGER', 'ADMIN'],
    fromStatuses: ['DRAFT', 'REJECTED'],
    toStatus: 'SUBMITTED',
  },
  {
    id: 'approve',
    label: 'Approve',
    icon: CheckCircleIcon,
    color: 'green',
    description: 'Approve timesheet entries',
    allowedRoles: ['TEAM_LEAD', 'MANAGER', 'ADMIN'],
    fromStatuses: ['SUBMITTED'],
    toStatus: 'APPROVED',
  },
  {
    id: 'reject',
    label: 'Reject',
    icon: XMarkIcon,
    color: 'red',
    description: 'Reject timesheet entries with reason',
    requiresComment: true,
    allowedRoles: ['TEAM_LEAD', 'MANAGER', 'ADMIN'],
    fromStatuses: ['SUBMITTED'],
    toStatus: 'REJECTED',
  },
];

const TimesheetStatusWorkflow: React.FC<TimesheetStatusWorkflowProps> = ({
  timesheets,
  onStatusUpdate,
  viewMode,
  selectedDate,
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);
  const [showCommentModal, setShowCommentModal] = useState<{ action: StatusAction; entries: Timesheet[] } | null>(null);
  const [comment, setComment] = useState('');

  const isManagerOrAbove = ['MANAGER', 'TEAM_LEAD', 'ADMIN'].includes(user?.role || '');

  // Get applicable timesheet entries based on user role and permissions
  const getApplicableEntries = (action: StatusAction): Timesheet[] => {
    return timesheets.filter(ts => {
      // Check role permissions
      if (!action.allowedRoles.includes(user?.role || '')) return false;
      
      // Check status compatibility
      if (!action.fromStatuses.includes(ts.status)) return false;
      
      // For employees, they can only act on their own entries
      if (user?.role === 'EMPLOYEE' && ts.user_id !== user?.id) return false;
      
      // For team leads and managers, check hierarchy (simplified)
      if (['TEAM_LEAD', 'MANAGER'].includes(user?.role || '') && action.id !== 'submit') {
        // They should be able to act on their team's entries
        // This could be enhanced with actual team hierarchy checking
        return true;
      }
      
      return true;
    });
  };

  // Get status summary
  const statusSummary = React.useMemo(() => {
    const summary = {
      DRAFT: 0,
      SUBMITTED: 0,
      APPROVED: 0,
      REJECTED: 0,
    };
    
    timesheets.forEach(ts => {
      if (ts.status in summary) {
        summary[ts.status as keyof typeof summary]++;
      }
    });
    
    return summary;
  }, [timesheets]);

  const handleActionClick = async (action: StatusAction) => {
    const applicableEntries = getApplicableEntries(action);
    
    if (applicableEntries.length === 0) {
      toast.error(`No ${action.fromStatuses.join('/')} entries found`);
      return;
    }

    if (action.requiresComment) {
      setShowCommentModal({ action, entries: applicableEntries });
      return;
    }

    await executeAction(action, applicableEntries, '');
  };

  const executeAction = async (action: StatusAction, entries: Timesheet[], commentText: string = '') => {
    setLoading(action.id);
    
    try {
      const promises = entries.map(ts => {
        const endpoint = `/timesheets/${ts.id}/${action.id}`;
        const payload = commentText ? { comment: commentText } : {};
        return api.post(endpoint, payload);
      });

      await Promise.all(promises);
      
      toast.success(`Successfully ${action.label.toLowerCase()}d ${entries.length} timesheet entr${entries.length === 1 ? 'y' : 'ies'}`);
      onStatusUpdate();
      
      if (showCommentModal) {
        setShowCommentModal(null);
        setComment('');
      }
    } catch (error: any) {
      console.error('Status action error:', error);
      toast.error(error?.response?.data?.message || `Failed to ${action.label.toLowerCase()}`);
    } finally {
      setLoading(null);
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return 'bg-gray-100 text-gray-800';
      case 'SUBMITTED':
        return 'bg-blue-100 text-blue-800';
      case 'APPROVED':
        return 'bg-green-100 text-green-800';
      case 'REJECTED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getActionButtonColor = (color: string) => {
    switch (color) {
      case 'blue':
        return 'bg-blue-600 hover:bg-blue-700 text-white';
      case 'green':
        return 'bg-green-600 hover:bg-green-700 text-white';
      case 'red':
        return 'bg-red-600 hover:bg-red-700 text-white';
      default:
        return 'bg-gray-600 hover:bg-gray-700 text-white';
    }
  };

  if (timesheets.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No timesheet entries found for the selected period.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Overview */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Timesheet Status Overview
          {selectedDate && (
            <span className="text-sm font-normal text-gray-600 ml-2">
              ({format(selectedDate, 'MMMM yyyy')})
            </span>
          )}
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(statusSummary).map(([status, count]) => (
            <div key={status} className="text-center">
              <div className="text-2xl font-bold text-gray-900">{count}</div>
              <div className={`inline-block px-2 py-1 rounded-full text-sm font-medium ${getStatusBadgeColor(status)}`}>
                {status}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Available Actions</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {statusActions.map(action => {
            const applicableEntries = getApplicableEntries(action);
            const canPerformAction = applicableEntries.length > 0;
            const Icon = action.icon;
            
            return (
              <div key={action.id} className={`border rounded-lg p-4 ${
                canPerformAction ? 'border-gray-200' : 'border-gray-100 bg-gray-50'
              }`}>
                <div className="flex items-start space-x-3">
                  <div className={`p-2 rounded-lg ${
                    canPerformAction 
                      ? action.color === 'blue' ? 'bg-blue-100' :
                        action.color === 'green' ? 'bg-green-100' :
                        action.color === 'red' ? 'bg-red-100' : 'bg-gray-100'
                      : 'bg-gray-100'
                  }`}>
                    <Icon className={`h-5 w-5 ${
                      canPerformAction
                        ? action.color === 'blue' ? 'text-blue-600' :
                          action.color === 'green' ? 'text-green-600' :
                          action.color === 'red' ? 'text-red-600' : 'text-gray-600'
                        : 'text-gray-400'
                    }`} />
                  </div>
                  
                  <div className="flex-1">
                    <h4 className={`font-medium ${canPerformAction ? 'text-gray-900' : 'text-gray-500'}`}>
                      {action.label}
                    </h4>
                    <p className={`text-sm mt-1 ${canPerformAction ? 'text-gray-600' : 'text-gray-400'}`}>
                      {action.description}
                    </p>
                    
                    {canPerformAction && (
                      <div className="mt-3">
                        <button
                          onClick={() => handleActionClick(action)}
                          disabled={loading === action.id}
                          className={`inline-flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${getActionButtonColor(action.color)}`}
                        >
                          {loading === action.id ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Icon className="h-4 w-4" />
                          )}
                          <span>
                            {action.label} ({applicableEntries.length})
                          </span>
                        </button>
                      </div>
                    )}
                    
                    {!canPerformAction && (
                      <div className="mt-2 text-xs text-gray-400">
                        No applicable entries or insufficient permissions
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Workflow Status Legend */}
      <div className="bg-gray-50 rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Workflow Status Guide</h3>
        
        <div className="space-y-3">
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
            <span className="text-sm font-medium text-gray-900">DRAFT</span>
            <span className="text-sm text-gray-600">→ Entry created, can be edited or submitted</span>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
            <span className="text-sm font-medium text-gray-900">SUBMITTED</span>
            <span className="text-sm text-gray-600">→ Awaiting manager approval, cannot be edited</span>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-green-400 rounded-full"></div>
            <span className="text-sm font-medium text-gray-900">APPROVED</span>
            <span className="text-sm text-gray-600">→ Final approved state, ready for payroll</span>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-red-400 rounded-full"></div>
            <span className="text-sm font-medium text-gray-900">REJECTED</span>
            <span className="text-sm text-gray-600">→ Requires correction, can be edited and resubmitted</span>
          </div>
        </div>
      </div>

      {/* Comment Modal */}
      {showCommentModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowCommentModal(null)} />
            
            <div className="relative w-full max-w-md bg-white rounded-lg shadow-xl">
              <div className="p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className={`p-2 rounded-lg ${
                    showCommentModal.action.color === 'red' ? 'bg-red-100' : 'bg-blue-100'
                  }`}>
                    <showCommentModal.action.icon className={`h-5 w-5 ${
                      showCommentModal.action.color === 'red' ? 'text-red-600' : 'text-blue-600'
                    }`} />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">
                      {showCommentModal.action.label} Timesheets
                    </h3>
                    <p className="text-sm text-gray-600">
                      {showCommentModal.entries.length} entries selected
                    </p>
                  </div>
                </div>

                <div className="mb-4">
                  <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-2">
                    {showCommentModal.action.id === 'reject' ? 'Rejection Reason *' : 'Comment (Optional)'}
                  </label>
                  <textarea
                    id="comment"
                    rows={4}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder={showCommentModal.action.id === 'reject' 
                      ? 'Please provide a reason for rejection...' 
                      : 'Add a comment...'
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  />
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setShowCommentModal(null)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => executeAction(showCommentModal.action, showCommentModal.entries, comment)}
                    disabled={showCommentModal.action.requiresComment && !comment.trim()}
                    className={`px-4 py-2 text-sm font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed ${getActionButtonColor(showCommentModal.action.color)}`}
                  >
                    {loading === showCommentModal.action.id ? 'Processing...' : showCommentModal.action.label}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimesheetStatusWorkflow;