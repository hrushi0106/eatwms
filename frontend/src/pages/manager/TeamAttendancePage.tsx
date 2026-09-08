import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';
import { Attendance, PaginationMeta } from '../../types';
import { formatDate, formatTime, formatMinutes } from '../../utils/format';
import { AttendanceStatusBadge, WorkModeBadge } from '../../components/common/Badge';
import Pagination from '../../components/common/Pagination';
import EmptyState from '../../components/common/EmptyState';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { ClockIcon } from '@heroicons/react/24/outline';

export default function TeamAttendancePage() {
  const [rows, setRows] = useState<any[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [view, setView] = useState<'today' | 'history'>('today');
  const [filters, setFilters] = useState({ start_date: '', end_date: '', status: '', work_mode: '' });

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      if (view === 'today') {
        const res = await api.get('/attendance/team');
        setRows(res.data.data || []);
        setMeta(null);
      } else {
        const params: Record<string, string | number> = { page, limit: 20 };
        if (filters.start_date) params.start_date = filters.start_date;
        if (filters.end_date) params.end_date = filters.end_date;
        if (filters.status) params.status = filters.status;
        if (filters.work_mode) params.work_mode = filters.work_mode;
        const res = await api.get('/attendance/history', { params });
        setRows(res.data.data || []);
        setMeta(res.data.meta || null);
      }
    } finally { setLoading(false); }
  }, [view, page, filters]);

  useEffect(() => { fetch(); }, [fetch]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="page-title">Team Attendance</h1>
        <button onClick={fetch} className="btn-secondary text-sm">↻ Refresh</button>
      </div>

      <div className="flex gap-2">
        {(['today', 'history'] as const).map((v) => (
          <button key={v} onClick={() => { setView(v); setPage(1); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${view === v ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            {v === 'today' ? "Today's Attendance" : 'History'}
          </button>
        ))}
      </div>

      {view === 'history' && (
        <div className="card p-4 flex flex-wrap gap-3">
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
            <option value="CHECKED_IN">Checked In</option>
            <option value="CHECKED_OUT">Checked Out</option>
            <option value="INCOMPLETE">Incomplete</option>
          </select>
          <select value={filters.work_mode}
            onChange={(e) => { setFilters(f => ({ ...f, work_mode: e.target.value })); setPage(1); }}
            className="input w-40">
            <option value="">All Modes</option>
            <option value="OFFICE">Office</option>
            <option value="WFH">WFH</option>
            <option value="HYBRID">Hybrid</option>
          </select>
          <button onClick={() => { setFilters({ start_date: '', end_date: '', status: '', work_mode: '' }); setPage(1); }}
            className="btn-secondary text-sm">Clear</button>
        </div>
      )}

      <div className="table-container">
        {loading ? (
          <div className="py-16 flex justify-center"><LoadingSpinner /></div>
        ) : rows.length === 0 ? (
          <EmptyState icon={<ClockIcon className="h-10 w-10 text-gray-300" />}
            title="No attendance records" description="No records found." />
        ) : (
          <>
            <table className="table">
              <thead>
                <tr>
                  <th>Employee</th>
                  {view === 'history' && <th>Date</th>}
                  <th>Work Mode</th>
                  <th>Check In</th>
                  <th>Check Out</th>
                  <th>Duration</th>
                  <th>Status</th>
                  {view === 'today' && <th>Exceptions</th>}
                </tr>
              </thead>
              <tbody>
                {rows.map((row: any, i: number) => (
                  <tr key={row.id || row.user_id || i}>
                    <td>
                      <div>
                        <p className="font-medium text-sm">{row.employee_name}</p>
                        <p className="text-xs text-gray-400">{row.employee_code}</p>
                      </div>
                    </td>
                    {view === 'history' && <td className="text-sm">{formatDate(row.attendance_date)}</td>}
                    <td>
                      {(row.work_mode_code || row.work_mode)
                        ? <WorkModeBadge mode={row.work_mode_code || row.work_mode} />
                        : <span className="text-gray-400 text-xs">—</span>}
                    </td>
                    <td className="text-sm">{row.check_in_time ? formatTime(row.check_in_time) : <span className="text-gray-400">—</span>}</td>
                    <td className="text-sm">{row.check_out_time ? formatTime(row.check_out_time) : <span className="text-gray-400">—</span>}</td>
                    <td className="text-sm font-medium text-green-700">
                      {row.total_work_minutes ? formatMinutes(row.total_work_minutes) : '—'}
                    </td>
                    <td>
                      {(row.status || row.attendance_status)
                        ? <AttendanceStatusBadge status={row.status || row.attendance_status} />
                        : <span className="badge badge-red">Absent</span>}
                    </td>
                    {view === 'today' && (
                      <td>
                        {row.open_exceptions > 0
                          ? <span className="badge badge-red">{row.open_exceptions} open</span>
                          : <span className="text-xs text-gray-400">None</span>}
                      </td>
                    )}
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
