import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ClockIcon, CheckCircleIcon, PlusIcon, ArrowRightIcon,
  CalendarDaysIcon, BriefcaseIcon, BellIcon, PlayIcon, StopIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../api/axios';
import { Attendance, Task, LeaveBalance, Notification } from '../../types';
import { formatTime, formatMinutes, formatDate, getLiveWorkDuration } from '../../utils/format';
import { AttendanceStatusBadge, WorkModeBadge, TaskStatusBadge } from '../../components/common/Badge';
import StatCard from '../../components/common/StatCard';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

interface DashboardData {
  today_attendance: Attendance | null;
  today_timesheet_hours: number;
  tasks: { assigned: number; COMPLETED: number; IN_PROGRESS: number; TODO: number };
  recent_tasks: Task[];
  leave_balance: LeaveBalance[];
  unread_notifications: number;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [liveDuration, setLiveDuration] = useState('');

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await api.get('/dashboard/employee');
      setData(res.data.data);
    } catch {
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  // Live duration ticker
  useEffect(() => {
    if (!data?.today_attendance?.check_in_time || data.today_attendance.status !== 'CHECKED_IN') return;
    const update = () => setLiveDuration(getLiveWorkDuration(data.today_attendance!.check_in_time));
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [data?.today_attendance]);

  if (loading) return <LoadingSpinner fullPage text="Loading dashboard…" />;

  const att = data?.today_attendance;
  const checkedIn = att?.status === 'CHECKED_IN';
  const checkedOut = att?.status === 'CHECKED_OUT';

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Good {getGreeting()}, {user?.first_name}!</h1>
          <p className="text-gray-500 text-sm mt-1">{formatDate(new Date(), 'EEEE, dd MMMM yyyy')}</p>
        </div>
        <div className="flex gap-2">
          {!att && (
            <Link to="/attendance/check-in" className="btn-primary">
              <PlayIcon className="h-4 w-4" />
              Start Work
            </Link>
          )}
          {checkedIn && (
            <Link to="/attendance/check-out" className="btn-danger">
              <StopIcon className="h-4 w-4" />
              Check Out
            </Link>
          )}
        </div>
      </div>

      {/* Today's Status Card */}
      <div className="card p-6">
        <div className="flex items-start justify-between mb-4">
          <h2 className="section-title">Today's Attendance</h2>
          {att && <WorkModeBadge mode={att.work_mode_code} />}
        </div>

        {att ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Check In</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{formatTime(att.check_in_time)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Check Out</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {att.check_out_time ? formatTime(att.check_out_time) : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Duration</p>
              <p className="text-2xl font-bold text-green-600 mt-1">
                {checkedIn ? liveDuration || formatMinutes(att.total_work_minutes) : formatMinutes(att.total_work_minutes)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Status</p>
              <div className="mt-1">
                <AttendanceStatusBadge status={att.status} />
                <p className="text-xs text-gray-400 mt-1">Verified ✓</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center py-8 gap-3">
            <ClockIcon className="h-12 w-12 text-gray-300" />
            <p className="text-gray-500 font-medium">You haven't checked in yet</p>
            <Link to="/attendance/check-in" className="btn-primary">
              <PlayIcon className="h-4 w-4" />
              Start Work Now
            </Link>
          </div>
        )}
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          title="Timesheet Today"
          value={`${(data?.today_timesheet_hours || 0).toFixed(1)}h`}
          icon={<ClockIcon className="h-5 w-5" />}
          color="blue"
        />
        <StatCard
          title="Active Tasks"
          value={data?.tasks?.IN_PROGRESS || 0}
          subtitle={`${data?.tasks?.assigned || 0} total assigned`}
          icon={<BriefcaseIcon className="h-5 w-5" />}
          color="indigo"
        />
        <StatCard
          title="Completed Tasks"
          value={data?.tasks?.COMPLETED || 0}
          icon={<CheckCircleIcon className="h-5 w-5" />}
          color="green"
        />
        <StatCard
          title="Annual Leave Left"
          value={`${data?.leave_balance?.find((b) => b.leave_type_name === 'Annual Leave')?.remaining_days || 0}d`}
          icon={<CalendarDaysIcon className="h-5 w-5" />}
          color="purple"
        />
      </div>

      {/* Two-column: Tasks + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tasks */}
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h2 className="section-title">My Active Tasks</h2>
            <Link to="/tasks" className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
              View all <ArrowRightIcon className="h-3 w-3" />
            </Link>
          </div>
          <div className="divide-y divide-gray-100">
            {data?.recent_tasks?.length ? (
              data.recent_tasks.map((task) => (
                <Link
                  key={task.id}
                  to={`/tasks/${task.id}`}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{task.name}</p>
                    <p className="text-xs text-gray-500 truncate">{task.project_name}</p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {task.due_date && (
                      <span className="text-xs text-gray-400">{formatDate(task.due_date)}</span>
                    )}
                    <TaskStatusBadge status={task.status} />
                    <div className="w-16">
                      <div className="bg-gray-200 rounded-full h-1.5">
                        <div
                          className="bg-blue-600 h-1.5 rounded-full"
                          style={{ width: `${task.progress_percentage}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-400 text-right mt-0.5">{task.progress_percentage}%</p>
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <div className="px-6 py-8 text-center text-gray-400 text-sm">No active tasks assigned</div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-4">
          <div className="card p-4">
            <h2 className="section-title mb-4">Quick Actions</h2>
            <div className="space-y-2">
              <QuickAction icon={<ClockIcon className="h-4 w-4" />} label="Add Timesheet" to="/timesheet/new" color="blue" />
              <QuickAction icon={<BriefcaseIcon className="h-4 w-4" />} label="View Tasks" to="/tasks" color="indigo" />
              <QuickAction icon={<CalendarDaysIcon className="h-4 w-4" />} label="Apply for Leave" to="/leave/apply" color="purple" />
              <QuickAction icon={<BellIcon className="h-4 w-4" />} label="Notifications" to="/notifications" color="yellow" />
            </div>
          </div>

          {/* Leave Balances */}
          <div className="card p-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Leave Balances</h2>
            <div className="space-y-3">
              {data?.leave_balance?.slice(0, 3).map((lb) => (
                <div key={lb.id}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-600 truncate">{lb.leave_type_name}</span>
                    <span className="font-medium text-gray-900">{lb.remaining_days}/{lb.allocated_days}d</span>
                  </div>
                  <div className="bg-gray-200 rounded-full h-1.5">
                    <div
                      className="bg-blue-500 h-1.5 rounded-full"
                      style={{ width: `${(lb.remaining_days / lb.allocated_days) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickAction({ icon, label, to, color }: { icon: React.ReactNode; label: string; to: string; color: string }) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600 hover:bg-blue-100',
    indigo: 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100',
    purple: 'bg-purple-50 text-purple-600 hover:bg-purple-100',
    yellow: 'bg-yellow-50 text-yellow-600 hover:bg-yellow-100',
  };
  return (
    <Link
      to={to}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${colorMap[color]}`}
    >
      {icon}
      {label}
      <ArrowRightIcon className="h-3 w-3 ml-auto" />
    </Link>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}
