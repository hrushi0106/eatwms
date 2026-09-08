import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { Timesheet, PaginationMeta } from '../../types';
import { formatDate } from '../../utils/format';
import { TimesheetStatusBadge } from '../../components/common/Badge';
import Pagination from '../../components/common/Pagination';
import EmptyState from '../../components/common/EmptyState';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { ConfirmModal } from '../../components/common/Modal';
import { DocumentTextIcon, PlusIcon, TrashIcon, PaperAirplaneIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

export default function TimesheetListPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Timesheet[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ start_date: '', end_date: '', status: '' });
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const isManagerOrAbove = ['MANAGER', 'TEAM_LEAD', 'ADMIN'].includes(user?.role || '');

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, limit: 20 };
      if (filters.start_date) params.start_date = filters.start_date;
      if (filters.end_date) params.end_date = filters.end_date;
      if (filters.status) params.status = filters.status;
      const res = await api.get('/timesheets', { params });
      setRows(res.data.data || []);
      setMeta(res.data.meta || null);
    } finally { setLoading(false); }
  }, [page, filters]);

  useEffect(() => { fetch(); }, [fetch]);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/timesheets/${deleteId}`);
      toast.success('Timesheet deleted');
      setDeleteId(null);
      fetch();
    } catch { toast.error('Delete failed'); }
  };

  const handleSubmit = async (id: number) => {
    setActionLoading(id);
    try {
      await api.post(`/timesheets/${id}/submit`);
      toast.success('Submitted for approval');
      fetch();
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Submit failed'); }
    finally { setActionLoading(null); }
  };

  const handleApprove = async (id: number) => {
    setActionLoading(id);
    try {
      await api.post(`/timesheets/${id}/approve`);
      toast.success('Timesheet approved');
      fetch();
    } catch { toast.error('Action failed'); }
    finally { setActionLoading(null); }
  };

  const handleReject = async (id: number) => {
    setActionLoading(id);
    try {
      await api.post(`/timesheets/${id}/reject`, { comment: 'Rejected by manager' });
      toast.success('Timesheet rejected');
      fetch();
    } catch { toast.error('Action failed'); }
    finally { setActionLoading(null); }
  };

  const totalHours = rows.reduce((s, r) => s + Number(r.hours), 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Timesheets</h1>
          {rows.length > 0 && <p className="text-sm text-gray-500 mt-1">Total: {totalHours.toFixed(1)} hours</p>}
        </div>
        <Link to="/timesheet/new" className="btn-primary">
          <PlusIcon className="h-4 w-4" />
          New Entry
        </Link>
      </div>

      <div className="card p-4">
        <div className="flex flex-wrap gap-3">
          <input type="date" value={filters.start_date}
            onChange={(e) => { setFilters(f => ({ ...f, start_date: e.target.value })); setPage(1); }}
            className="input w-40" />
          <input type="date" value={filters.end_date}
            onChange={(e) => { setFilters(f => ({ ...f, end_date: e.target.value })); setPage(1); }}
            className="input w-40" />
          <select value={filters.status}
            onChange={(e) => { setFilters(f => ({ ...f, status: e.target.value })); setPage(1); }}
            className="input w-44">
            <option value="">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
          <button onClick={() => { setFilters({ start_date: '', end_date: '', status: '' }); setPage(1); }}
            className="btn-secondary text-sm">Clear</button>
        </div>
      </div>

      <div className="table-container">
        {loading ? <div className="py-16 flex justify-center"><LoadingSpinner /></div>
          : rows.length === 0 ? (
            <EmptyState icon={<DocumentTextIcon className="h-10 w-10 text-gray-300" />}
              title="No timesheets" description="Start by adding a new timesheet entry."
              action={<Link to="/timesheet/new" className="btn-primary">Add Entry</Link>} />
          ) : (
            <>
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    {isManagerOrAbove && <th>Employee</th>}
                    <th>Project</th>
                    <th>Task</th>
                    <th>Hours</th>
                    <th>Description</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((ts) => (
                    <tr key={ts.id}>
                      <td className="font-medium">{formatDate(ts.date)}</td>
                      {isManagerOrAbove && <td className="text-sm">{ts.employee_name}</td>}
                      <td className="text-sm font-medium">{ts.project_name}</td>
                      <td className="text-sm text-gray-500">{ts.task_name || '—'}</td>
                      <td className="font-semibold text-blue-700">{ts.hours}h</td>
                      <td className="text-sm max-w-[200px] truncate">{ts.description}</td>
                      <td><TimesheetStatusBadge status={ts.status} /></td>
                      <td>
                        <div className="flex items-center gap-1">
                          {ts.status === 'DRAFT' && ts.user_id === user?.id && (
                            <>
                              <Link to={`/timesheet/${ts.id}/edit`}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="Edit">✏️</Link>
                              <button onClick={() => handleSubmit(ts.id)}
                                disabled={actionLoading === ts.id}
                                className="p-1.5 text-green-600 hover:bg-green-50 rounded" title="Submit">
                                <PaperAirplaneIcon className="h-4 w-4" />
                              </button>
                              <button onClick={() => setDeleteId(ts.id)}
                                className="p-1.5 text-red-500 hover:bg-red-50 rounded" title="Delete">
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            </>
                          )}
                          {ts.status === 'SUBMITTED' && isManagerOrAbove && (
                            <>
                              <button onClick={() => handleApprove(ts.id)} disabled={actionLoading === ts.id}
                                className="p-1.5 text-green-600 hover:bg-green-50 rounded" title="Approve">
                                <CheckIcon className="h-4 w-4" />
                              </button>
                              <button onClick={() => handleReject(ts.id)} disabled={actionLoading === ts.id}
                                className="p-1.5 text-red-500 hover:bg-red-50 rounded" title="Reject">
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
              {meta && <Pagination meta={meta} onPageChange={setPage} />}
            </>
          )}
      </div>

      <ConfirmModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Timesheet"
        message="Are you sure you want to delete this timesheet entry? This action cannot be undone."
        confirmLabel="Delete"
      />
    </div>
  );
}
