import React, { useState } from 'react';
import api from '../../api/axios';
import { formatDate, formatTime, formatMinutes } from '../../utils/format';
import { AttendanceStatusBadge, WorkModeBadge, LeaveStatusBadge } from '../../components/common/Badge';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import { DocumentChartBarIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

type ReportType = 'attendance' | 'timesheet' | 'leave' | 'exceptions';

export default function ReportsPage() {
  const [reportType, setReportType] = useState<ReportType>('attendance');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);

  const generate = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      const res = await api.get(`/reports/${reportType}`, { params });
      setRows(res.data.data || []);
      setGenerated(true);
    } catch { toast.error('Failed to generate report'); }
    finally { setLoading(false); }
  };

  const exportReport = async (format: 'csv' | 'excel') => {
    try {
      const params: Record<string, string> = { format, type: reportType };
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      const res = await api.get('/reports/export', {
        params,
        responseType: 'blob',
      });
      const ext = format === 'csv' ? 'csv' : 'xlsx';
      const mime = format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      const url = window.URL.createObjectURL(new Blob([res.data], { type: mime }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance-report-${formatDate(new Date(), 'yyyy-MM-dd')}.${ext}`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success(`${format.toUpperCase()} exported`);
    } catch { toast.error('Export failed'); }
  };

  return (
    <div className="space-y-5">
      <h1 className="page-title">Reports</h1>

      {/* Controls */}
      <div className="card p-5">
        <div className="flex flex-wrap gap-4 mb-4">
          <div>
            <label className="label">Report Type</label>
            <select value={reportType} onChange={(e) => { setReportType(e.target.value as ReportType); setGenerated(false); }} className="input w-52">
              <option value="attendance">Attendance Report</option>
              <option value="timesheet">Timesheet Report</option>
              <option value="leave">Leave Report</option>
              <option value="exceptions">Exception Report</option>
            </select>
          </div>
          <div>
            <label className="label">Start Date</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="input w-44" />
          </div>
          <div>
            <label className="label">End Date</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="input w-44" />
          </div>
        </div>
        <div className="flex gap-3 flex-wrap">
          <button onClick={generate} disabled={loading} className="btn-primary">
            {loading ? 'Generating…' : 'Generate Report'}
          </button>
          {generated && rows.length > 0 && (
            <>
              <button onClick={() => exportReport('csv')} className="btn-secondary flex items-center gap-2">
                <ArrowDownTrayIcon className="h-4 w-4" />
                Export CSV
              </button>
              <button onClick={() => exportReport('excel')} className="btn-secondary flex items-center gap-2">
                <ArrowDownTrayIcon className="h-4 w-4" />
                Export Excel
              </button>
            </>
          )}
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="py-16 flex justify-center"><LoadingSpinner text="Generating report…" /></div>
      ) : generated && rows.length === 0 ? (
        <EmptyState icon={<DocumentChartBarIcon className="h-10 w-10 text-gray-300" />}
          title="No data found" description="No records match the selected criteria." />
      ) : generated && rows.length > 0 ? (
        <div className="table-container overflow-x-auto">
          <div className="px-6 py-3 bg-gray-50 border-b border-gray-100 text-sm text-gray-500">
            Showing {rows.length} record{rows.length !== 1 ? 's' : ''}
          </div>
          <table className="table min-w-full">
            {reportType === 'attendance' && (
              <>
                <thead><tr>
                  <th>Employee</th><th>Code</th><th>Date</th><th>Work Mode</th>
                  <th>Check In</th><th>Check Out</th><th>Minutes</th><th>Status</th><th>Verified</th>
                </tr></thead>
                <tbody>
                  {rows.map((r: any, i: number) => (
                    <tr key={i}>
                      <td className="font-medium text-sm">{r.employee_name}</td>
                      <td className="text-xs text-gray-400 font-mono">{r.employee_code}</td>
                      <td className="text-sm">{formatDate(r.attendance_date)}</td>
                      <td><WorkModeBadge mode={r.work_mode} /></td>
                      <td className="text-sm">{r.check_in_time ? formatTime(r.check_in_time) : '—'}</td>
                      <td className="text-sm">{r.check_out_time ? formatTime(r.check_out_time) : '—'}</td>
                      <td className="text-sm font-medium text-green-700">{formatMinutes(r.total_work_minutes)}</td>
                      <td><AttendanceStatusBadge status={r.status} /></td>
                      <td className="text-xs">{r.verification_status || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </>
            )}
            {reportType === 'timesheet' && (
              <>
                <thead><tr><th>Employee</th><th>Code</th><th>Project</th><th>Task</th><th>Date</th><th>Hours</th><th>Overtime</th><th>Status</th></tr></thead>
                <tbody>{rows.map((r: any, i: number) => (
                  <tr key={i}>
                    <td className="font-medium text-sm">{r.employee_name}</td>
                    <td className="text-xs font-mono">{r.employee_code}</td>
                    <td className="text-sm">{r.project_name}</td>
                    <td className="text-sm text-gray-500">{r.task_name || '—'}</td>
                    <td className="text-sm">{formatDate(r.date)}</td>
                    <td className="font-semibold text-blue-700">{r.hours}h</td>
                    <td className="text-orange-600">{r.overtime_hours > 0 ? `${r.overtime_hours}h` : '—'}</td>
                    <td><span className="badge badge-gray text-xs">{r.status}</span></td>
                  </tr>
                ))}</tbody>
              </>
            )}
            {reportType === 'leave' && (
              <>
                <thead><tr><th>Employee</th><th>Code</th><th>Type</th><th>Start</th><th>End</th><th>Days</th><th>Status</th></tr></thead>
                <tbody>{rows.map((r: any, i: number) => (
                  <tr key={i}>
                    <td className="font-medium text-sm">{r.employee_name}</td>
                    <td className="text-xs font-mono">{r.employee_code}</td>
                    <td className="text-sm">{r.leave_type}</td>
                    <td className="text-sm">{formatDate(r.start_date)}</td>
                    <td className="text-sm">{formatDate(r.end_date)}</td>
                    <td className="font-medium">{r.total_days}</td>
                    <td><LeaveStatusBadge status={r.status} /></td>
                  </tr>
                ))}</tbody>
              </>
            )}
            {reportType === 'exceptions' && (
              <>
                <thead><tr><th>Employee</th><th>Code</th><th>Type</th><th>Severity</th><th>Date</th><th>Status</th><th>Description</th></tr></thead>
                <tbody>{rows.map((r: any, i: number) => (
                  <tr key={i}>
                    <td className="font-medium text-sm">{r.employee_name}</td>
                    <td className="text-xs font-mono">{r.employee_code}</td>
                    <td className="text-xs font-medium">{r.exception_type.replace(/_/g, ' ')}</td>
                    <td><span className={`badge ${r.severity === 'HIGH' ? 'badge-red' : r.severity === 'MEDIUM' ? 'badge-yellow' : 'badge-gray'}`}>{r.severity}</span></td>
                    <td className="text-sm">{formatDate(r.exception_date)}</td>
                    <td><span className="badge badge-gray text-xs">{r.status}</span></td>
                    <td className="text-xs text-gray-500 max-w-[200px] truncate">{r.description}</td>
                  </tr>
                ))}</tbody>
              </>
            )}
          </table>
        </div>
      ) : null}
    </div>
  );
}
