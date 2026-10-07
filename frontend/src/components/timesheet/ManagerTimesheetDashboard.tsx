import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  format, startOfWeek, endOfWeek, addWeeks, subWeeks,
  eachDayOfInterval, isWeekend,
} from 'date-fns';
import {
  UserGroupIcon, ChevronLeftIcon, ChevronRightIcon,
  CalendarIcon, ClockIcon, CheckCircleIcon, ExclamationTriangleIcon,
  ChartBarIcon, UserIcon, CheckIcon, XMarkIcon, EyeIcon,
  ArrowPathIcon, DocumentTextIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../api/axios';
import toast from 'react-hot-toast';

interface Timesheet {
  id: number;
  user_id: number;
  date: string;
  hours: number;
  overtime_hours?: number;
  start_time?: string;
  end_time?: string;
  description?: string;
  project_id?: number;
  task_id?: number;
  project_name?: string;
  task_name?: string;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  is_billable?: boolean;
  comment?: string;
  employee_name?: string;
  department?: string;
  updated_at?: string;
}

const ManagerTimesheetDashboard: React.FC = () => {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('SUBMITTED');
  const [rejectModal, setRejectModal] = useState<{ id: number; comment: string } | null>(null);
  const [detailModal, setDetailModal] = useState<Timesheet | null>(null);

  const dateRange = useMemo(() => ({
    start: startOfWeek(currentDate, { weekStartsOn: 1 }),
    end: endOfWeek(currentDate, { weekStartsOn: 1 }),
  }), [currentDate]);

  // Fetch team timesheets using the existing /timesheets endpoint
  // (the backend already filters by manager's team when role is MANAGER/TEAM_LEAD)
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/timesheets', {
        params: {
          start_date: format(dateRange.start, 'yyyy-MM-dd'),
          end_date: format(dateRange.end, 'yyyy-MM-dd'),
          limit: 500,
          ...(filterStatus && { status: filterStatus }),
        },
      });
      setTimesheets(res.data.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load team timesheets');
    } finally {
      setLoading(false);
    }
  }, [dateRange, filterStatus]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Stats
  const stats = useMemo(() => {
    const all = timesheets;
    const workDays = eachDayOfInterval(dateRange).filter(d => !isWeekend(d)).length;
    const uniqueEmployees = new Set(all.map(t => t.user_id)).size;
    const pending = all.filter(t => t.status === 'SUBMITTED').length;
    const approved = all.filter(t => t.status === 'APPROVED').length;
    const rejected = all.filter(t => t.status === 'REJECTED').length;
    const totalHours = all.reduce((s, t) => s + (Number(t.hours) || 0), 0);
    return { pending, approved, rejected, totalHours, uniqueEmployees, workDays };
  }, [timesheets, dateRange]);

  // Filtered entries for table
  const filtered = useMemo(() =>
    filterStatus ? timesheets.filter(t => t.status === filterStatus) : timesheets,
    [timesheets, filterStatus]
  );

  const handleApprove = async (id: number) => {
    setActionLoading(id);
    try {
      await api.post(`/timesheets/${id}/approve`);
      toast.success('Timesheet approved');
      fetchData();
    } catch {
      toast.error('Failed to approve');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!rejectModal) return;
    setActionLoading(rejectModal.id);
    try {
      await api.post(`/timesheets/${rejectModal.id}/reject`, { comment: rejectModal.comment || 'Rejected by manager' });
      toast.success('Timesheet rejected');
      setRejectModal(null);
      fetchData();
    } catch {
      toast.error('Failed to reject');
    } finally {
      setActionLoading(null);
    }
  };

  const handleBulkApprove = async () => {
    const ids = filtered.filter(t => t.status === 'SUBMITTED').map(t => t.id);
    if (!ids.length) { toast.error('No submitted entries to approve'); return; }
    setLoading(true);
    try {
      await Promise.all(ids.map(id => api.post(`/timesheets/${id}/approve`)));
      toast.success(`Approved ${ids.length} entries`);
      fetchData();
    } catch {
      toast.error('Bulk approve failed');
      setLoading(false);
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'bg-green-100 text-green-800 border-green-200';
      case 'SUBMITTED': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'REJECTED': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const normalizeDate = (d: string) => d?.includes('T') ? d.split('T')[0] : d;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── HEADER ── */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <UserGroupIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Manager Dashboard</h1>
              <p className="text-sm text-gray-500">Team Timesheet Approvals</p>
            </div>
          </div>

          {/* Week navigation */}
          <div className="flex items-center space-x-3">
            <button onClick={() => setCurrentDate(d => subWeeks(d, 1))} className="p-2 hover:bg-gray-100 rounded-lg">
              <ChevronLeftIcon className="h-5 w-5 text-gray-600" />
            </button>
            <div className="flex items-center space-x-2 px-3 py-2 bg-gray-100 rounded-lg">
              <CalendarIcon className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-semibold text-gray-900">
                {format(dateRange.start, 'MMM dd')} – {format(dateRange.end, 'MMM dd, yyyy')}
              </span>
            </div>
            <button onClick={() => setCurrentDate(d => addWeeks(d, 1))} className="p-2 hover:bg-gray-100 rounded-lg">
              <ChevronRightIcon className="h-5 w-5 text-gray-600" />
            </button>
            <button onClick={() => setCurrentDate(new Date())} className="px-3 py-2 text-sm text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100">
              This Week
            </button>
            <button onClick={fetchData} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg" title="Refresh">
              <ArrowPathIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* ── STAT CARDS ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Pending Approval', value: stats.pending, color: 'orange', icon: ExclamationTriangleIcon },
            { label: 'Approved', value: stats.approved, color: 'green', icon: CheckCircleIcon },
            { label: 'Team Hours', value: `${stats.totalHours.toFixed(1)}h`, color: 'blue', icon: ClockIcon },
            { label: 'Employees', value: stats.uniqueEmployees, color: 'purple', icon: ChartBarIcon },
          ].map(card => (
            <div key={card.label} className={`bg-white rounded-xl border p-4 ${
              card.color === 'orange' ? 'border-orange-200' :
              card.color === 'green' ? 'border-green-200' :
              card.color === 'blue' ? 'border-blue-200' : 'border-purple-200'
            }`}>
              <div className="flex items-center justify-between mb-1">
                <span className={`text-2xl font-bold ${
                  card.color === 'orange' ? 'text-orange-600' :
                  card.color === 'green' ? 'text-green-600' :
                  card.color === 'blue' ? 'text-blue-600' : 'text-purple-600'
                }`}>{card.value}</span>
                <card.icon className={`h-5 w-5 ${
                  card.color === 'orange' ? 'text-orange-400' :
                  card.color === 'green' ? 'text-green-400' :
                  card.color === 'blue' ? 'text-blue-400' : 'text-purple-400'
                }`} />
              </div>
              <div className="text-sm text-gray-600">{card.label}</div>
            </div>
          ))}
        </div>

        {/* ── FILTER + BULK ── */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center space-x-3">
            <span className="text-sm font-medium text-gray-700">Filter:</span>
            {['', 'SUBMITTED', 'APPROVED', 'REJECTED', 'DRAFT'].map(s => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                  filterStatus === s
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400 hover:text-blue-600'
                }`}
              >
                {s || 'All'}
              </button>
            ))}
          </div>
          {stats.pending > 0 && (
            <button
              onClick={handleBulkApprove}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
            >
              <CheckIcon className="h-4 w-4" />
              <span>Approve All Pending ({stats.pending})</span>
            </button>
          )}
        </div>

        {/* ── TABLE ── */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">
              {filterStatus || 'All'} Entries
              <span className="ml-2 text-sm font-normal text-gray-500">({filtered.length})</span>
            </h2>
          </div>

          {loading ? (
            <div className="py-16 text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
              <p className="text-gray-500 mt-3">Loading team timesheets...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <DocumentTextIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-base font-medium text-gray-900">No entries found</h3>
              <p className="text-sm text-gray-500 mt-1">
                {filterStatus ? `No ${filterStatus.toLowerCase()} entries this week` : 'No timesheet entries this week'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50">
                  <tr>
                    {['Employee', 'Date', 'Project / Task', 'Hours', 'Time', 'Status', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map(ts => (
                    <tr key={ts.id} className="hover:bg-gray-50 transition-colors">
                      {/* Employee */}
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-2">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <UserIcon className="h-4 w-4 text-blue-600" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {ts.employee_name || `Employee #${ts.user_id}`}
                            </div>
                            {ts.department && (
                              <div className="text-xs text-gray-500">{ts.department}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      {/* Date */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{format(new Date(normalizeDate(ts.date)), 'MMM dd, yyyy')}</div>
                        <div className="text-xs text-gray-500">{format(new Date(normalizeDate(ts.date)), 'EEEE')}</div>
                      </td>
                      {/* Project */}
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-gray-900">{ts.project_name || '—'}</div>
                        {ts.task_name && <div className="text-xs text-gray-500">{ts.task_name}</div>}
                        {ts.description && (
                          <div className="text-xs text-gray-400 mt-0.5 truncate max-w-[180px]">{ts.description}</div>
                        )}
                      </td>
                      {/* Hours */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-sm font-bold text-blue-600">{Number(ts.hours).toFixed(1)}h</span>
                        {ts.overtime_hours && Number(ts.overtime_hours) > 0 && (
                          <div className="text-xs text-orange-600">+{Number(ts.overtime_hours).toFixed(1)}h OT</div>
                        )}
                        {ts.is_billable && <div className="text-xs text-green-600">Billable</div>}
                      </td>
                      {/* Time */}
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-600 font-mono">
                        {ts.start_time && ts.end_time ? `${ts.start_time} – ${ts.end_time}` : '—'}
                      </td>
                      {/* Status */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getStatusStyle(ts.status)}`}>
                          {ts.status}
                        </span>
                        {ts.comment && (
                          <div className="text-xs text-gray-400 mt-1 truncate max-w-[100px]" title={ts.comment}>
                            {ts.comment}
                          </div>
                        )}
                      </td>
                      {/* Actions */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => setDetailModal(ts)}
                            className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                            title="View details"
                          >
                            <EyeIcon className="h-4 w-4" />
                          </button>
                          {ts.status === 'SUBMITTED' && (
                            <>
                              <button
                                onClick={() => handleApprove(ts.id)}
                                disabled={actionLoading === ts.id}
                                className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                                title="Approve"
                              >
                                <CheckIcon className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => setRejectModal({ id: ts.id, comment: '' })}
                                disabled={actionLoading === ts.id}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                                title="Reject"
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
      </div>

      {/* ── REJECT MODAL ── */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setRejectModal(null)} />
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Reject Timesheet</h2>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason (optional)</label>
            <textarea
              rows={3}
              value={rejectModal.comment}
              onChange={e => setRejectModal(r => r ? { ...r, comment: e.target.value } : r)}
              placeholder="Provide a reason for rejection..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 resize-none"
            />
            <div className="flex items-center justify-end space-x-3 mt-4">
              <button onClick={() => setRejectModal(null)} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
              <button
                onClick={handleReject}
                disabled={!!actionLoading}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {actionLoading ? 'Rejecting...' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DETAIL MODAL ── */}
      {detailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDetailModal(null)} />
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-blue-700">
              <h2 className="text-lg font-bold text-white">Timesheet Detail</h2>
              <button onClick={() => setDetailModal(null)} className="text-blue-200 hover:text-white">
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {[
                { label: 'Employee', value: detailModal.employee_name || `#${detailModal.user_id}` },
                { label: 'Date', value: format(new Date(normalizeDate(detailModal.date)), 'EEEE, MMM dd, yyyy') },
                { label: 'Project', value: detailModal.project_name || '—' },
                { label: 'Task', value: detailModal.task_name || '—' },
                { label: 'Hours', value: `${Number(detailModal.hours).toFixed(2)}h${detailModal.overtime_hours && Number(detailModal.overtime_hours) > 0 ? ` (+${Number(detailModal.overtime_hours).toFixed(2)}h OT)` : ''}` },
                { label: 'Time', value: detailModal.start_time && detailModal.end_time ? `${detailModal.start_time} – ${detailModal.end_time}` : '—' },
                { label: 'Billable', value: detailModal.is_billable ? 'Yes' : 'No' },
                { label: 'Status', value: detailModal.status },
                { label: 'Description', value: detailModal.description || '—' },
                ...(detailModal.comment ? [{ label: 'Comment', value: detailModal.comment }] : []),
              ].map(row => (
                <div key={row.label} className="flex justify-between text-sm border-b border-gray-50 pb-2">
                  <span className="font-medium text-gray-600">{row.label}</span>
                  <span className="text-gray-900 text-right max-w-[240px]">{row.value}</span>
                </div>
              ))}
            </div>
            {detailModal.status === 'SUBMITTED' && (
              <div className="flex items-center justify-end space-x-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
                <button
                  onClick={() => { setDetailModal(null); setRejectModal({ id: detailModal.id, comment: '' }); }}
                  className="px-4 py-2 text-sm font-medium text-red-600 border border-red-300 rounded-lg hover:bg-red-50"
                >
                  Reject
                </button>
                <button
                  onClick={() => { handleApprove(detailModal.id); setDetailModal(null); }}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700"
                >
                  Approve
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagerTimesheetDashboard;
