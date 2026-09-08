import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { formatTime, formatMinutes } from '../../utils/format';
import { AttendanceStatusBadge, WorkModeBadge, TaskStatusBadge } from '../../components/common/Badge';
import StatCard from '../../components/common/StatCard';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { UsersIcon, ClipboardDocumentCheckIcon, ExclamationTriangleIcon, ClockIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export default function TeamLeadDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard/teamlead')
      .then((r) => setData(r.data.data))
      .catch(() => toast.error('Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner fullPage />;
  if (!data) return null;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="page-title">Team Lead Dashboard</h1>
        <Link to="/team/attendance" className="btn-secondary text-sm">View Full Attendance</Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard title="Team Size" value={data.team_size} icon={<UsersIcon className="h-5 w-5" />} color="blue" />
        <StatCard title="Present Today" value={data.team_attendance?.length || 0} icon={<ClockIcon className="h-5 w-5" />} color="green" />
        <StatCard title="Active Tasks" value={data.active_tasks} icon={<ClipboardDocumentCheckIcon className="h-5 w-5" />} color="indigo" />
        <StatCard title="Open Exceptions" value={data.open_exceptions} icon={<ExclamationTriangleIcon className="h-5 w-5" />} color="red" />
      </div>

      {data.open_exceptions > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ExclamationTriangleIcon className="h-5 w-5 text-amber-600" />
            <p className="text-sm font-medium text-amber-800">{data.open_exceptions} attendance exception{data.open_exceptions !== 1 ? 's' : ''} need review</p>
          </div>
          <Link to="/exceptions" className="text-sm text-amber-700 font-semibold hover:text-amber-900">Review →</Link>
        </div>
      )}

      <div className="table-container">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="section-title">Today's Team Attendance</h2>
          <Link to="/team/attendance" className="text-sm text-blue-600 hover:text-blue-700">View all</Link>
        </div>
        {data.team_attendance?.length === 0 ? (
          <div className="py-12 text-center text-gray-400 text-sm">No team attendance records for today</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Work Mode</th>
                <th>Check In</th>
                <th>Duration</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.team_attendance?.map((row: any) => (
                <tr key={row.user_id}>
                  <td className="font-medium text-sm">{row.employee_name}</td>
                  <td>{row.work_mode_code ? <WorkModeBadge mode={row.work_mode_code} /> : <span className="text-gray-400 text-xs">—</span>}</td>
                  <td className="text-sm">{row.check_in_time ? formatTime(row.check_in_time) : <span className="text-gray-400">—</span>}</td>
                  <td className="text-sm font-medium text-green-700">{row.total_work_minutes ? formatMinutes(row.total_work_minutes) : '—'}</td>
                  <td><AttendanceStatusBadge status={row.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
