import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isWeekend } from 'date-fns';
import {
  UserGroupIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  DocumentTextIcon,
  CalendarIcon,
  FunnelIcon,
  ChevronDownIcon,
  EyeIcon,
  CheckIcon,
  XMarkIcon,
  ChartBarIcon,
  UserIcon,
} from '@heroicons/react/24/outline';
import { Timesheet, User } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { TimesheetStatusBadge } from '../common/Badge';
import LoadingSpinner from '../common/LoadingSpinner';
import { BulkTimesheetActions } from './BulkTimesheetActions';
import TimesheetDetailModal from './TimesheetDetailModal';

interface TimesheetManagerViewProps {
  dateRange?: { start: Date; end: Date };
  onDataRefresh?: () => void;
}

interface TeamMemberStats {
  user_id: number;
  employee_name: string;
  employee_email: string;
  department: string;
  totalHours: number;
  expectedHours: number;
  submittedEntries: number;
  pendingEntries: number;
  approvedEntries: number;
  rejectedEntries: number;
  completionRate: number;
  lastSubmission?: string;
}

interface ManagerStats {
  totalTeamMembers: number;
  totalHoursLogged: number;
  totalHoursExpected: number;
  pendingApprovals: number;
  approvedThisWeek: number;
  rejectedThisWeek: number;
  averageCompletionRate: number;
  topPerformers: string[];
  needsAttention: string[];
}

const TimesheetManagerView: React.FC<TimesheetManagerViewProps> = ({
  dateRange,
  onDataRefresh,
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  const [selectedMember, setSelectedMember] = useState<number | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>('SUBMITTED');
  const [selectedTimesheets, setSelectedTimesheets] = useState<Set<number>>(new Set());
  const [actionLoading, setActionLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTimesheetDetail, setSelectedTimesheetDetail] = useState<Timesheet | null>(null);

  // Fetch team data
  const fetchTeamData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch team members
      const teamResponse = await api.get('/users/team');
      setTeamMembers(teamResponse.data.data || []);

      // Fetch team timesheets
      const params: any = {};
      if (dateRange) {
        params.start_date = format(dateRange.start, 'yyyy-MM-dd');
        params.end_date = format(dateRange.end, 'yyyy-MM-dd');
      }
      if (selectedMember) {
        params.user_id = selectedMember;
      }
      if (selectedStatus) {
        params.status = selectedStatus;
      }
      
      const timesheetResponse = await api.get('/timesheets/team', { params });
      setTimesheets(timesheetResponse.data.data || []);
    } catch (error) {
      console.error('Failed to fetch team data:', error);
      toast.error('Failed to load team timesheet data');
    } finally {
      setLoading(false);
    }
  }, [dateRange, selectedMember, selectedStatus]);

  useEffect(() => {
    fetchTeamData();
  }, [fetchTeamData]);

  // Calculate team member statistics
  const teamStats = useMemo((): TeamMemberStats[] => {
    if (!dateRange) return [];

    const workingDays = eachDayOfInterval(dateRange)
      .filter(day => !isWeekend(day)).length;
    const expectedHoursPerMember = workingDays * 8;

    const memberMap = new Map<number, TeamMemberStats>();
    
    // Initialize stats for all team members
    teamMembers.forEach(member => {
      memberMap.set(member.id, {
        user_id: member.id,
        employee_name: `${member.first_name} ${member.last_name}`,
        employee_email: member.email,
        department: member.department_name || 'N/A',
        totalHours: 0,
        expectedHours: expectedHoursPerMember,
        submittedEntries: 0,
        pendingEntries: 0,
        approvedEntries: 0,
        rejectedEntries: 0,
        completionRate: 0,
      });
    });

    // Aggregate timesheet data
    timesheets.forEach(ts => {
      const stats = memberMap.get(ts.user_id);
      if (stats) {
        stats.totalHours += ts.hours;
        
        switch (ts.status) {
          case 'SUBMITTED':
            stats.submittedEntries++;
            stats.pendingEntries++;
            break;
          case 'APPROVED':
            stats.approvedEntries++;
            break;
          case 'REJECTED':
            stats.rejectedEntries++;
            break;
        }

        if (ts.updated_at && (!stats.lastSubmission || ts.updated_at > stats.lastSubmission)) {
          stats.lastSubmission = ts.updated_at;
        }
      }
    });

    // Calculate completion rates
    Array.from(memberMap.values()).forEach(stats => {
      stats.completionRate = expectedHoursPerMember > 0 
        ? (stats.totalHours / expectedHoursPerMember) * 100 
        : 0;
    });

    return Array.from(memberMap.values()).sort((a, b) => b.pendingEntries - a.pendingEntries);
  }, [teamMembers, timesheets, dateRange]);

  // Calculate overall manager statistics
  const managerStats = useMemo((): ManagerStats => {
    const totalHoursLogged = teamStats.reduce((sum, member) => sum + member.totalHours, 0);
    const totalHoursExpected = teamStats.reduce((sum, member) => sum + member.expectedHours, 0);
    const pendingApprovals = teamStats.reduce((sum, member) => sum + member.pendingEntries, 0);
    const approvedThisWeek = teamStats.reduce((sum, member) => sum + member.approvedEntries, 0);
    const rejectedThisWeek = teamStats.reduce((sum, member) => sum + member.rejectedEntries, 0);
    const averageCompletionRate = teamStats.length > 0 
      ? teamStats.reduce((sum, member) => sum + member.completionRate, 0) / teamStats.length 
      : 0;

    const topPerformers = teamStats
      .filter(member => member.completionRate >= 90)
      .slice(0, 3)
      .map(member => member.employee_name);

    const needsAttention = teamStats
      .filter(member => member.completionRate < 50 || member.pendingEntries > 5)
      .slice(0, 3)
      .map(member => member.employee_name);

    return {
      totalTeamMembers: teamMembers.length,
      totalHoursLogged,
      totalHoursExpected,
      pendingApprovals,
      approvedThisWeek,
      rejectedThisWeek,
      averageCompletionRate,
      topPerformers,
      needsAttention,
    };
  }, [teamStats, teamMembers.length]);

  // Handle bulk actions
  const handleBulkAction = useCallback(async (action: string, timesheetIds: number[]) => {
    setActionLoading(true);
    try {
      switch (action) {
        case 'approve':
          await Promise.all(
            timesheetIds.map(id => api.post(`/timesheets/${id}/approve`))
          );
          toast.success(`Approved ${timesheetIds.length} timesheet entries`);
          break;
        case 'reject':
          await Promise.all(
            timesheetIds.map(id => api.post(`/timesheets/${id}/reject`, { 
              comment: 'Rejected by manager' 
            }))
          );
          toast.success(`Rejected ${timesheetIds.length} timesheet entries`);
          break;
        default:
          break;
      }
      
      setSelectedTimesheets(new Set());
      fetchTeamData();
      onDataRefresh?.();
    } catch (error) {
      console.error('Bulk action error:', error);
      toast.error(`Failed to ${action} selected timesheets`);
    } finally {
      setActionLoading(false);
    }
  }, [fetchTeamData, onDataRefresh]);

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
    const allTimesheetIds = timesheets
      .filter(ts => ts.status === 'SUBMITTED')
      .map(ts => ts.id);
    setSelectedTimesheets(new Set(allTimesheetIds));
  }, [timesheets]);

  const handleDeselectAllTimesheets = useCallback(() => {
    setSelectedTimesheets(new Set());
  }, []);

  // Handle individual timesheet actions
  const handleIndividualAction = useCallback(async (action: string, timesheetId: number) => {
    try {
      switch (action) {
        case 'approve':
          await api.post(`/timesheets/${timesheetId}/approve`);
          toast.success('Timesheet approved');
          break;
        case 'reject':
          await api.post(`/timesheets/${timesheetId}/reject`, { 
            comment: 'Rejected by manager' 
          });
          toast.success('Timesheet rejected');
          break;
      }
      
      fetchTeamData();
      onDataRefresh?.();
    } catch (error) {
      console.error('Individual action error:', error);
      toast.error(`Failed to ${action} timesheet`);
    }
  }, [fetchTeamData, onDataRefresh]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex justify-center py-16">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Manager Dashboard Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 flex items-center space-x-2">
            <UserGroupIcon className="h-6 w-6 text-blue-600" />
            <span>Team Timesheet Management</span>
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            {dateRange && format(dateRange.start, 'MMM dd')} - {dateRange && format(dateRange.end, 'MMM dd, yyyy')} • 
            {managerStats.totalTeamMembers} team members
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center space-x-2 px-4 py-2 border rounded-lg transition-colors ${
              showFilters
                ? 'bg-blue-50 border-blue-200 text-blue-700'
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <FunnelIcon className="h-4 w-4" />
            <span>Filters</span>
          </button>
          
          <button
            onClick={() => fetchTeamData()}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Manager Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-2xl font-bold text-orange-600">
              {managerStats.pendingApprovals}
            </div>
            <ExclamationTriangleIcon className="h-6 w-6 text-orange-600" />
          </div>
          <div className="text-sm text-gray-600">Pending Approvals</div>
          <div className="text-xs text-gray-500 mt-1">Requires your attention</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-2xl font-bold text-green-600">
              {managerStats.approvedThisWeek}
            </div>
            <CheckCircleIcon className="h-6 w-6 text-green-600" />
          </div>
          <div className="text-sm text-gray-600">Approved This Period</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-2xl font-bold text-blue-600">
              {managerStats.totalHoursLogged.toFixed(0)}h
            </div>
            <ClockIcon className="h-6 w-6 text-blue-600" />
          </div>
          <div className="text-sm text-gray-600">Team Hours Logged</div>
          <div className="text-xs text-gray-500 mt-1">
            {managerStats.totalHoursExpected.toFixed(0)}h expected
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-2xl font-bold text-purple-600">
              {managerStats.averageCompletionRate.toFixed(0)}%
            </div>
            <ChartBarIcon className="h-6 w-6 text-purple-600" />
          </div>
          <div className="text-sm text-gray-600">Avg Completion Rate</div>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Team Member
              </label>
              <select
                value={selectedMember || ''}
                onChange={(e) => setSelectedMember(e.target.value ? parseInt(e.target.value) : null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Team Members</option>
                {teamMembers.map(member => (
                  <option key={member.id} value={member.id}>
                    {member.first_name} {member.last_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Statuses</option>
                <option value="DRAFT">Draft</option>
                <option value="SUBMITTED">Submitted</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => {
                  setSelectedMember(null);
                  setSelectedStatus('SUBMITTED');
                }}
                className="w-full px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Team Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Team Member Statistics */}
        <div className="bg-white border border-gray-200 rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Team Overview</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {teamStats.slice(0, 5).map((member) => (
                <div key={member.user_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <UserIcon className="h-8 w-8 text-gray-400" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {member.employee_name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {member.department}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-sm font-semibold text-gray-900">
                      {member.totalHours.toFixed(1)}h
                    </div>
                    <div className="text-xs text-gray-500">
                      {member.completionRate.toFixed(0)}% complete
                    </div>
                    {member.pendingEntries > 0 && (
                      <div className="text-xs text-orange-600 font-medium">
                        {member.pendingEntries} pending
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Insights */}
        <div className="bg-white border border-gray-200 rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Quick Insights</h3>
          </div>
          <div className="p-6 space-y-4">
            {managerStats.topPerformers.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-green-700 mb-2">Top Performers</h4>
                <div className="space-y-2">
                  {managerStats.topPerformers.map((name, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <CheckCircleIcon className="h-4 w-4 text-green-500" />
                      <span className="text-sm text-gray-700">{name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {managerStats.needsAttention.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-orange-700 mb-2">Needs Attention</h4>
                <div className="space-y-2">
                  {managerStats.needsAttention.map((name, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <ExclamationTriangleIcon className="h-4 w-4 text-orange-500" />
                      <span className="text-sm text-gray-700">{name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-gray-200">
              <div className="text-sm text-gray-600">
                <p>Team is performing at {managerStats.averageCompletionRate.toFixed(0)}% capacity</p>
                <p className="mt-1">
                  {managerStats.pendingApprovals} submissions awaiting approval
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedTimesheets.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <BulkTimesheetActions
            selectedCount={selectedTimesheets.size}
            timesheetIds={Array.from(selectedTimesheets)}
            onAction={handleBulkAction}
            onSelectAll={handleSelectAllTimesheets}
            onDeselectAll={handleDeselectAllTimesheets}
            managerMode={true}
          />
        </div>
      )}

      {/* Timesheet Entries Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              Team Timesheet Entries
            </h3>
            <div className="text-sm text-gray-600">
              {timesheets.length} entries
            </div>
          </div>
        </div>

        {timesheets.length === 0 ? (
          <div className="text-center py-12">
            <DocumentTextIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No timesheet entries found</h3>
            <p className="text-gray-600">
              {selectedStatus ? `No ${selectedStatus.toLowerCase()} entries` : 'No entries for the selected criteria'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <input
                      type="checkbox"
                      checked={selectedTimesheets.size > 0 && selectedTimesheets.size === timesheets.filter(ts => ts.status === 'SUBMITTED').length}
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Employee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Project
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Hours
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {timesheets.map((timesheet) => (
                  <tr key={timesheet.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      {timesheet.status === 'SUBMITTED' && (
                        <input
                          type="checkbox"
                          checked={selectedTimesheets.has(timesheet.id)}
                          onChange={() => handleSelectTimesheet(timesheet.id)}
                          className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <UserIcon className="h-6 w-6 text-gray-400 mr-2" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {timesheet.employee_name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {timesheet.department}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {format(new Date(timesheet.date), 'MMM dd, yyyy')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {timesheet.project_name}
                      </div>
                      {timesheet.task_name && (
                        <div className="text-xs text-gray-500">
                          {timesheet.task_name}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-blue-600">
                        {timesheet.hours}h
                      </div>
                      {timesheet.overtime_hours && timesheet.overtime_hours > 0 && (
                        <div className="text-xs text-orange-600">
                          +{timesheet.overtime_hours}h OT
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <TimesheetStatusBadge status={timesheet.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setSelectedTimesheetDetail(timesheet)}
                          title="View Details"
                          className="p-1.5 text-gray-600 hover:bg-gray-50 rounded transition-colors"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                        
                        {timesheet.status === 'SUBMITTED' && (
                          <>
                            <button
                              onClick={() => handleIndividualAction('approve', timesheet.id)}
                              title="Approve"
                              className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
                            >
                              <CheckIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleIndividualAction('reject', timesheet.id)}
                              title="Reject"
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                            >
                              <XMarkIcon className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Timesheet Detail Modal */}
      <TimesheetDetailModal
        isOpen={!!selectedTimesheetDetail}
        onClose={() => setSelectedTimesheetDetail(null)}
        timesheet={selectedTimesheetDetail}
        onUpdate={() => {
          fetchTeamData();
          onDataRefresh?.();
        }}
        canManage={true}
      />
    </div>
  );
};

export default TimesheetManagerView;