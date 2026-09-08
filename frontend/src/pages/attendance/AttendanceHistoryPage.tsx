import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';
import { Attendance, PaginationMeta } from '../../types';
import { formatDate, formatTime, formatMinutes } from '../../utils/format';
import { AttendanceStatusBadge, WorkModeBadge } from '../../components/common/Badge';
import Pagination from '../../components/common/Pagination';
import EmptyState from '../../components/common/EmptyState';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { ClockIcon, FunnelIcon } from '@heroicons/react/24/outline';

export default function AttendanceHistoryPage() {
  const [rows, setRows] = useState<Attendance[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ start_date: '', end_date: '', status: '', work_mode: '' });

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, limit: 20 };
      if (filters.start_date) params.start_date = filters.start_date;
      if (filters.end_date) params.end_date = filters.end_date;
      if (filters.status) params.status = filters.status;
      if (filters.work_mode) params.work_mode = filters.work_mode;
      const res = await api.get('/attendance/history', { params });
      setRows(res.data.data || []);
      setMeta(res.data.meta || null);
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => { fetch(); }, [fetch]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="page-title">Attendance History</h1>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-3">
          <input type="date" value={filters.start_date}
            onChange={(e) => { setFilters(f => ({ ...f, start_date: e.target.value })); setPage(1); }}
            className="input w-40" placeholder="From" />
          <input type="date" value={filters.end_date}
            onChange={(e) => { setFilters(f => ({ ...f, end_date: e.target.value })); setPage(1); }}
            className="input w-40" placeholder="To" />
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
      </div>

      {/* Table */}
      <div className="table-container">
        {loading ? (
          <div className="py-16 flex justify-center"><LoadingSpinner /></div>
        ) : rows.length === 0 ? (
          <EmptyState icon={<ClockIcon className="h-10 w-10 text-gray-300" />}
            title="No attendance records" description="No records found for the selected filters." />
        ) : (
          <>
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Work Mode</th>
                  <th>Check In</th>
                  <th>Check Out</th>
                  <th>Duration</th>
                  <th>Overtime</th>
                  <th>Status</th>
                  <th>Verified</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td className="font-medium">{formatDate(row.attendance_date)}</td>
                    <td><WorkModeBadge mode={row.work_mode_code} /></td>
                    <td>{formatTime(row.check_in_time)}</td>
                    <td>{row.check_out_time ? formatTime(row.check_out_time) : <span className="text-gray-400">—</span>}</td>
                    <td className="font-medium text-green-700">{formatMinutes(row.total_work_minutes)}</td>
                    <td>{row.overtime_minutes > 0 ? <span className="text-orange-600">{formatMinutes(row.overtime_minutes)}</span> : '—'}</td>
                    <td><AttendanceStatusBadge status={row.status} /></td>
                    <td><span className="text-xs text-green-600 font-medium">✓ Verified</span></td>
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
