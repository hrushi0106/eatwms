import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import StatCard from '../../components/common/StatCard';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import {
  UsersIcon, ClockIcon, HomeIcon, BuildingOfficeIcon,
  ExclamationTriangleIcon, CalendarDaysIcon, ChartBarIcon,
} from '@heroicons/react/24/outline';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { formatDate } from '../../utils/format';
import toast from 'react-hot-toast';

export default function AdminDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [kpi, setKpi] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState('month');

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [dashRes, kpiRes] = await Promise.all([
        api.get('/dashboard/admin'),
        api.get('/dashboard/kpi', { params: { range } }),
      ]);
      setData(dashRes.data.data);
      setKpi(kpiRes.data.data);
    } catch { toast.error('Failed to load dashboard'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, [range]);

  if (loading) return <LoadingSpinner fullPage text="Loading admin dashboard…" />;
  if (!data) return null;

  const { summary, charts } = data;

  const chartData = charts?.daily_attendance?.map((d: any) => ({
    date: formatDate(d.date, 'dd MMM'),
    Present: d.count,
  })) || [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="page-title">Admin Dashboard</h1>
        <div className="flex gap-2">
          {['today', 'week', 'month'].map((r) => (
            <button key={r} onClick={() => setRange(r)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize ${range === r ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
              {r === 'today' ? 'Today' : r === 'week' ? 'This Week' : 'This Month'}
            </button>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard title="Total Employees" value={summary.total_employees} icon={<UsersIcon className="h-5 w-5" />} color="blue" />
        <StatCard title="Present Today" value={summary.present} icon={<ClockIcon className="h-5 w-5" />} color="green" />
        <StatCard title="Active Sessions" value={summary.active_sessions} icon={<ChartBarIcon className="h-5 w-5" />} color="indigo" />
        <StatCard title="WFH" value={summary.wfh} icon={<HomeIcon className="h-5 w-5" />} color="purple" />
        <StatCard title="In Office" value={summary.office} icon={<BuildingOfficeIcon className="h-5 w-5" />} color="indigo" />
        <StatCard title="Absent" value={Math.max(0, summary.absent)} icon={<UsersIcon className="h-5 w-5" />} color="red" />
        <StatCard title="Pending Approvals" value={summary.pending_approvals} icon={<CalendarDaysIcon className="h-5 w-5" />} color="yellow" />
        <StatCard title="Open Exceptions" value={summary.open_exceptions} icon={<ExclamationTriangleIcon className="h-5 w-5" />} color="red" />
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <Link to="/admin/employees" className="btn-secondary text-sm">Manage Employees</Link>
        <Link to="/exceptions" className="btn-secondary text-sm">Review Exceptions {summary.open_exceptions > 0 && `(${summary.open_exceptions})`}</Link>
        <Link to="/leave/approvals" className="btn-secondary text-sm">Leave Approvals {summary.pending_approvals > 0 && `(${summary.pending_approvals})`}</Link>
        <Link to="/reports" className="btn-secondary text-sm">Generate Reports</Link>
        <Link to="/admin/audit-logs" className="btn-secondary text-sm">Audit Logs</Link>
        <Link to="/admin/settings" className="btn-secondary text-sm">Settings</Link>
      </div>

      {/* KPI Grid */}
      {kpi && (
        <div className="card p-6">
          <h2 className="section-title mb-5">KPI Summary</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
            <KPIItem label="Attendance Rate" value={`${kpi.attendanceRate}%`} color="green" />
            <KPIItem label="On-Time Check-In" value={`${kpi.onTimeCheckInRate}%`} color="blue" />
            <KPIItem label="WFH Rate" value={`${kpi.wfhRate}%`} color="purple" />
            <KPIItem label="Timesheet Completion" value={`${kpi.timesheetCompletion}%`} color="indigo" />
            <KPIItem label="Task Completion" value={`${kpi.taskCompletionRate}%`} color="green" />
            <KPIItem label="Verification Rate" value={`${kpi.verificationCompletion}%`} color="blue" />
            <KPIItem label="Exception Rate" value={`${kpi.exceptionRate}%`} color="red" />
            <KPIItem label="Total Overtime" value={`${Math.floor(kpi.totalOvertimeMinutes / 60)}h`} color="orange" />
          </div>
        </div>
      )}

      {/* Daily Attendance Chart */}
      {chartData.length > 0 && (
        <div className="card p-6">
          <h2 className="section-title mb-5">Daily Attendance (Last 7 Days)</h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="Present" fill="#2563eb" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

function KPIItem({ label, value, color }: { label: string; value: string; color: string }) {
  const colors: Record<string, string> = {
    green: 'text-green-600', blue: 'text-blue-600', purple: 'text-purple-600',
    indigo: 'text-indigo-600', red: 'text-red-600', orange: 'text-orange-600',
  };
  return (
    <div className="text-center">
      <p className={`text-3xl font-bold ${colors[color] || 'text-gray-900'}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  );
}
