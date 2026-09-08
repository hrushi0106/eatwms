import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';
import { AuditLog, PaginationMeta } from '../../types';
import { formatDateTime } from '../../utils/format';
import Pagination from '../../components/common/Pagination';
import EmptyState from '../../components/common/EmptyState';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { ClipboardDocumentListIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

const actionColors: Record<string, string> = {
  LOGIN: 'bg-green-100 text-green-800', LOGOUT: 'bg-gray-100 text-gray-700',
  CHECK_IN: 'bg-blue-100 text-blue-800', CHECK_OUT: 'bg-indigo-100 text-indigo-800',
  TIMESHEET_APPROVED: 'bg-green-100 text-green-800', TIMESHEET_REJECTED: 'bg-red-100 text-red-800',
  LEAVE_APPROVED: 'bg-green-100 text-green-800', LEAVE_REJECTED: 'bg-red-100 text-red-800',
  USER_CREATED: 'bg-blue-100 text-blue-800', USER_DEACTIVATED: 'bg-red-100 text-red-800',
  SETTINGS_CHANGED: 'bg-orange-100 text-orange-800',
};

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ action: '', start_date: '', end_date: '' });

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, limit: 25 };
      if (filters.action) params.action = filters.action;
      if (filters.start_date) params.start_date = filters.start_date;
      if (filters.end_date) params.end_date = filters.end_date;
      const res = await api.get('/audit-logs', { params });
      setLogs(res.data.data || []);
      setMeta(res.data.meta || null);
    } finally { setLoading(false); }
  }, [page, filters]);

  useEffect(() => { fetch(); }, [fetch]);

  const actions = ['LOGIN', 'LOGOUT', 'CHECK_IN', 'CHECK_OUT', 'TIMESHEET_APPROVED', 'TIMESHEET_REJECTED',
    'LEAVE_APPROVED', 'LEAVE_REJECTED', 'USER_CREATED', 'USER_UPDATED', 'USER_DEACTIVATED', 'SETTINGS_CHANGED'];

  return (
    <div className="space-y-5">
      <h1 className="page-title">Audit Logs</h1>

      <div className="card p-4 flex flex-wrap gap-3">
        <select value={filters.action}
          onChange={(e) => { setFilters(f => ({ ...f, action: e.target.value })); setPage(1); }}
          className="input w-52">
          <option value="">All Actions</option>
          {actions.map((a) => <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>)}
        </select>
        <input type="date" value={filters.start_date}
          onChange={(e) => { setFilters(f => ({ ...f, start_date: e.target.value })); setPage(1); }}
          className="input w-40" />
        <input type="date" value={filters.end_date}
          onChange={(e) => { setFilters(f => ({ ...f, end_date: e.target.value })); setPage(1); }}
          className="input w-40" />
        <button onClick={() => { setFilters({ action: '', start_date: '', end_date: '' }); setPage(1); }}
          className="btn-secondary text-sm">Clear</button>
      </div>

      <div className="table-container">
        {loading ? (
          <div className="py-16 flex justify-center"><LoadingSpinner /></div>
        ) : logs.length === 0 ? (
          <EmptyState icon={<ClipboardDocumentListIcon className="h-10 w-10 text-gray-300" />} title="No audit logs" />
        ) : (
          <>
            <table className="table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>User</th>
                  <th>Action</th>
                  <th>Entity</th>
                  <th>IP Address</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td className="text-xs text-gray-500 whitespace-nowrap">{formatDateTime(log.created_at)}</td>
                    <td className="text-sm">{log.user_name || <span className="text-gray-400">System</span>}</td>
                    <td>
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${actionColors[log.action] || 'bg-gray-100 text-gray-700'}`}>
                        {log.action.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="text-xs text-gray-500">
                      {log.entity_type && <span>{log.entity_type} #{log.entity_id}</span>}
                    </td>
                    <td className="text-xs text-gray-400 font-mono">{log.ip_address || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {meta && <Pagination meta={meta} onPageChange={setPage} />}
          </>
        )}
      </div>
    </div>
  );
}
