 import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { formatTime, formatMinutes } from '../../utils/format';
import { AttendanceStatusBadge, WorkModeBadge } from '../../components/common/Badge';
import StatCard from '../../components/common/StatCard';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import {
  UsersIcon, ClockIcon, ExclamationTriangleIcon, CalendarDaysIcon,
  HomeIcon, BuildingOfficeIcon, ArrowTrendingUpIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface ManagerDashboardData {
  summary: {
    total: number; present: number; absent: number; wfh: number; office: number;
    on_leave: number; late: number; pending_review: number; checked_out: number;
  };
  team_attendance: any[];
  pending_leave_requests: number;
  open_exceptions: number;
}

export default function ManagerDashboardPage() {
  const [data, setData] = useState<ManagerDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    try {
      const res = await api.get('/dashboard/manager');
      setData(res.data.data);
    } catch { toast.error('Failed to load dashboard'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  if (loading) return <LoadingSpinner fullPage text="Loading manager dashboard…" />;
  if (!data) return null;

  const { summary } = data;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="page-title">Manager Dashboard</h1>
        <button onClick={fetch} className="btn-secondary text-sm">↻ Refresh</button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-4">
        <StatCard title="Total Employees" value={summary.total} icon={<UsersIcon className="h-5 w-5" />} color="blue" />
        <StatCard title="Present Today" value={summary.present} icon={<ClockIcon className="h-5 w-5" />} color="green" />
        <StatCard title="Absent" value={Math.max(0, summary.absent)} icon={<UsersIcon className="h-5 w-5" />} color="red" />
        <StatCard title="WFH" value={summary.wfh} icon={<HomeIcon className="h-5 w-5" />} color="purple" />
        <StatCard title="In Office" value={summary.office} icon={<BuildingOfficeIcon className="h-5 w-5" />} color="indigo" />
        <StatCard title="On Leave" value={summary.on_leave} icon={<CalendarDaysIcon className="h-5 w-5" />} color="yellow" />
        <StatCard title="Pending Leaves" value={data.pending_leave_requests} icon={<CalendarDaysIcon className="h-5 w-5" />} color="yellow" />
        <StatCard title="Open Exceptions" value={data.open_exceptions} icon={<ExclamationTriangleIcon className="h-5 w-5" />} color="red" />
      </div>

      {/* Quick links */}
      <div className="flex gap-3 flex-wrap">
        <Link to="/leave/approvals" className="btn-primary text-sm">
          <CalendarDaysIcon className="h-4 w-4" />
          Leave Requests {data.pending_leave_requests > 0 && `(${data.pending_leave_requests})`}
        </Link>
        <Link to="/exceptions" className="btn-secondary text-sm">
          <ExclamationTriangleIcon className="h-4 w-4" />
          Exceptions {data.open_exceptions > 0 && `(${data.open_exceptions})`}
        </Link>
        <Link to="/reports" className="btn-secondary text-sm">
          <ArrowTrendingUpIcon className="h-4 w-4" />
          Reports
        </Link>
      </div>

      {/* Team attendance table */}
      <div className="table-container">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="section-title">Today's Team Attendance</h2>
        </div>
        {data.team_attendance.length === 0 ? (
          <div className="py-12 text-center text-gray-400 text-sm">No team members found</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Work Mode</th>
                <th>Check In</th>
                <th>Check Out</th>
                <th>Duration</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.team_attendance.map((row: any) => (
                <tr key={row.user_id}>
                  <td>
                    <div>
                      <p className="font-medium text-sm">{row.employee_name}</p>
                      <p className="text-xs text-gray-400">{row.employee_code}</p>
                    </div>
                  </td>
                  <td>
                    {row.work_mode ? <WorkModeBadge mode={row.work_mode} /> : <span className="text-gray-400 text-xs">—</span>}
                  </td>
                  <td className="text-sm">{row.check_in_time ? formatTime(row.check_in_time) : <span className="text-gray-400">—</span>}</td>
                  <td className="text-sm">{row.check_out_time ? formatTime(row.check_out_time) : <span className="text-gray-400">—</span>}</td>
                  <td className="text-sm font-medium text-green-700">
                    {row.total_work_minutes ? formatMinutes(row.total_work_minutes) : '—'}
                  </td>
                  <td>
                    {row.attendance_status
                      ? <AttendanceStatusBadge status={row.attendance_status} />
                      : <span className="badge badge-red">Absent</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
