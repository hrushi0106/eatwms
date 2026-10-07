import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isToday, isWeekend, addWeeks, subWeeks, parseISO } from 'date-fns';
import {
  PlusIcon,
  ClockIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  XMarkIcon,
  CalendarDaysIcon,
  UserCircleIcon,
  ArrowPathIcon,
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
  break_duration?: number;
  description?: string;
  project_id?: number;
  task_id?: number;
  project_name?: string;
  task_name?: string;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  is_billable?: boolean;
  comment?: string;
}

interface Project {
  id: number;
  name: string;
}

interface Task {
  id: number;
  name: string;
  project_id: number;
}

const TimesheetDashboard: React.FC = () => {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<Timesheet | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [form, setForm] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    project_id: '',
    task_id: '',
    start_time: '09:00',
    end_time: '17:00',
    break_duration: 60,
    description: '',
    is_billable: true,
  });

  // Date range for the current week
  const dateRange = useMemo(() => ({
    start: startOfWeek(currentDate, { weekStartsOn: 1 }),
    end: endOfWeek(currentDate, { weekStartsOn: 1 }),
  }), [currentDate]);

  const weekDays = useMemo(() =>
    eachDayOfInterval({ start: dateRange.start, end: dateRange.end }),
    [dateRange]
  );

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [tsRes, projRes, taskRes] = await Promise.all([
        api.get('/timesheets', {
          params: {
            start_date: format(dateRange.start, 'yyyy-MM-dd'),
            end_date: format(dateRange.end, 'yyyy-MM-dd'),
            limit: 200,
          }
        }),
        api.get('/projects', { params: { status: 'ACTIVE', limit: 100 } }),
        api.get('/tasks', { params: { limit: 500 } }),
      ]);
      setTimesheets(tsRes.data.data || []);
      setProjects(projRes.data.data || []);
      setTasks(taskRes.data.data || []);
    } catch (err) {
      console.error('Fetch error:', err);
      toast.error('Failed to load timesheet data');
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Calculations
  const weeklyStats = useMemo(() => {
    const total = timesheets.reduce((s, t) => s + (Number(t.hours) || 0), 0);
    const overtime = timesheets.reduce((s, t) => s + (Number(t.overtime_hours) || 0), 0);
    const billable = timesheets.filter(t => t.is_billable).reduce((s, t) => s + (Number(t.hours) || 0), 0);
    const workDays = weekDays.filter(d => !isWeekend(d)).length;
    const expected = workDays * 8;
    return { total, overtime, regular: total - overtime, billable, expected, missing: Math.max(0, expected - total) };
  }, [timesheets, weekDays]);

  // Normalize date from DB (might come as "2026-10-07T00:00:00.000Z" or "2026-10-07")
  const normalizeDate = (dateStr: string) => {
    if (!dateStr) return '';
    return dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
  };

  const getDayTimesheets = (date: Date) => {
    const dayStr = format(date, 'yyyy-MM-dd');
    return timesheets.filter(t => normalizeDate(t.date) === dayStr);
  };

  const getDayHours = (date: Date) =>
    getDayTimesheets(date).reduce((s, t) => s + (Number(t.hours) || 0), 0);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'bg-green-100 text-green-800 border-green-200';
      case 'SUBMITTED': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'REJECTED': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Handlers
  const handleAddClick = (date?: string) => {
    setEditingEntry(null);
    setForm({
      date: date || format(new Date(), 'yyyy-MM-dd'),
      project_id: '',
      task_id: '',
      start_time: '09:00',
      end_time: '17:00',
      break_duration: 60,
      description: '',
      is_billable: true,
    });
    setShowAddModal(true);
  };

  const handleEditClick = (ts: Timesheet) => {
    setEditingEntry(ts);
    setForm({
      date: ts.date,
      project_id: String(ts.project_id || ''),
      task_id: String(ts.task_id || ''),
      start_time: ts.start_time || '09:00',
      end_time: ts.end_time || '17:00',
      break_duration: ts.break_duration || 60,
      description: ts.description || '',
      is_billable: ts.is_billable ?? true,
    });
    setShowAddModal(true);
  };

  const handleSave = async () => {
    if (!form.project_id) { toast.error('Please select a project'); return; }
    if (!form.description.trim()) { toast.error('Please add a description'); return; }

    setSubmitting(true);
    try {
      const [h1, m1] = form.start_time.split(':').map(Number);
      const [h2, m2] = form.end_time.split(':').map(Number);
      const totalMins = (h2 * 60 + m2) - (h1 * 60 + m1);
      const workMins = Math.max(0, totalMins - form.break_duration);
      const hours = Math.round((workMins / 60) * 100) / 100;
      const overtime = Math.max(0, hours - 8);

      const payload = {
        date: form.date,
        project_id: Number(form.project_id),
        task_id: form.task_id ? Number(form.task_id) : undefined,
        start_time: form.start_time,
        end_time: form.end_time,
        hours: Math.round(hours * 100) / 100,
        overtime_hours: Math.round(overtime * 100) / 100,
        description: form.description,
        is_billable: form.is_billable,
      };

      if (editingEntry) {
        await api.put(`/timesheets/${editingEntry.id}`, payload);
        toast.success('Timesheet updated successfully');
      } else {
        await api.post('/timesheets', payload);
        toast.success('Time entry added successfully');
      }
      setShowAddModal(false);
      await fetchData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to save time entry');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this time entry?')) return;
    try {
      await api.delete(`/timesheets/${id}`);
      toast.success('Entry deleted');
      fetchData();
    } catch { toast.error('Failed to delete entry'); }
  };

  const handleSubmit = async (id: number) => {
    try {
      await api.post(`/timesheets/${id}/submit`);
      toast.success('Submitted for approval');
      fetchData();
    } catch { toast.error('Failed to submit'); }
  };

  const filteredTasks = tasks.filter(t => t.project_id === Number(form.project_id));

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── HEADER ── */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* Left */}
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              <UserCircleIcon className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Timesheet</h1>
              <p className="text-sm text-gray-500">{user?.first_name} {user?.last_name} · {user?.role?.replace('_', ' ')}</p>
            </div>
          </div>
          {/* Right */}
          <div className="flex items-center space-x-3">
            <button onClick={fetchData} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg">
              <ArrowPathIcon className="h-5 w-5" />
            </button>
            <button
              onClick={() => handleAddClick()}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              <PlusIcon className="h-4 w-4" />
              <span>Add Time</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* ── WEEK NAVIGATION ── */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center space-x-3">
            <button onClick={() => setCurrentDate(d => subWeeks(d, 1))} className="p-2 hover:bg-gray-100 rounded-lg">
              <ChevronLeftIcon className="h-5 w-5 text-gray-600" />
            </button>
            <div className="flex items-center space-x-2">
              <CalendarDaysIcon className="h-5 w-5 text-gray-500" />
              <span className="text-sm font-semibold text-gray-900">
                {format(dateRange.start, 'MMM dd')} – {format(dateRange.end, 'MMM dd, yyyy')}
              </span>
            </div>
            <button onClick={() => setCurrentDate(d => addWeeks(d, 1))} className="p-2 hover:bg-gray-100 rounded-lg">
              <ChevronRightIcon className="h-5 w-5 text-gray-600" />
            </button>
          </div>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100"
          >
            This Week
          </button>
        </div>

        {/* ── SUMMARY CARDS ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          {[
            { label: 'Total Hours', value: `${weeklyStats.total.toFixed(1)}h`, color: 'blue', sub: `${weeklyStats.expected}h expected` },
            { label: 'Regular', value: `${weeklyStats.regular.toFixed(1)}h`, color: 'green', sub: 'Standard time' },
            { label: 'Overtime', value: `${weeklyStats.overtime.toFixed(1)}h`, color: 'orange', sub: weeklyStats.overtime > 0 ? 'Extra hours' : 'None' },
            { label: 'Billable', value: `${weeklyStats.billable.toFixed(1)}h`, color: 'purple', sub: `${weeklyStats.total > 0 ? ((weeklyStats.billable / weeklyStats.total) * 100).toFixed(0) : 0}% of total` },
            { label: 'Missing', value: `${weeklyStats.missing.toFixed(1)}h`, color: weeklyStats.missing > 0 ? 'red' : 'green', sub: weeklyStats.missing > 0 ? 'Still needed' : 'All logged ✓' },
          ].map(card => (
            <div key={card.label} className={`bg-white rounded-xl border p-4 ${card.color === 'blue' ? 'border-blue-200' : card.color === 'green' ? 'border-green-200' : card.color === 'orange' ? 'border-orange-200' : card.color === 'purple' ? 'border-purple-200' : card.color === 'red' ? 'border-red-200' : 'border-gray-200'}`}>
              <div className={`text-xl sm:text-2xl font-bold ${card.color === 'blue' ? 'text-blue-600' : card.color === 'green' ? 'text-green-600' : card.color === 'orange' ? 'text-orange-600' : card.color === 'purple' ? 'text-purple-600' : card.color === 'red' ? 'text-red-600' : 'text-gray-600'}`}>
                {card.value}
              </div>
              <div className="text-sm font-medium text-gray-700 mt-1">{card.label}</div>
              <div className="text-xs text-gray-500 mt-0.5">{card.sub}</div>
            </div>
          ))}
        </div>

        {/* ── WEEKLY PROGRESS ── */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="font-medium text-gray-700">Weekly Progress</span>
            <span className="text-gray-500">
              {weeklyStats.expected > 0 ? Math.min(100, (weeklyStats.total / weeklyStats.expected) * 100).toFixed(0) : 0}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-gradient-to-r from-blue-500 to-blue-600 h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, weeklyStats.expected > 0 ? (weeklyStats.total / weeklyStats.expected) * 100 : 0)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>{weeklyStats.total.toFixed(1)}h logged</span>
            <span>{weeklyStats.expected}h expected</span>
          </div>
        </div>

        {/* ── DAILY CARDS ── */}
        {loading ? (
          <div className="grid gap-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse h-24" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {weekDays.map(day => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const dayEntries = getDayTimesheets(day);
              const dayHours = getDayHours(day);
              const isCurrentDay = isToday(day);
              const isWeekendDay = isWeekend(day);

              return (
                <div
                  key={dateStr}
                  className={`bg-white rounded-xl border transition-shadow hover:shadow-md ${
                    isCurrentDay ? 'border-blue-400 ring-2 ring-blue-100' : 'border-gray-200'
                  } ${isWeekendDay ? 'opacity-60' : ''}`}
                >
                  {/* Day Header */}
                  <div className="flex items-center justify-between px-4 sm:px-6 py-4">
                    <div className="flex items-center space-x-4">
                      {/* Date Badge */}
                      <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center flex-shrink-0 ${
                        isCurrentDay ? 'bg-blue-600 text-white' : isWeekendDay ? 'bg-gray-100 text-gray-400' : 'bg-gray-50 text-gray-700'
                      }`}>
                        <span className="text-xs font-medium leading-none">{format(day, 'EEE')}</span>
                        <span className="text-lg font-bold leading-tight">{format(day, 'dd')}</span>
                      </div>

                      {/* Day Info */}
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold text-gray-900">{format(day, 'EEEE')}</span>
                          {isCurrentDay && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">Today</span>
                          )}
                          {isWeekendDay && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-500 rounded-full">Weekend</span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500 mt-0.5">
                          {dayEntries.length > 0 ? `${dayEntries.length} entr${dayEntries.length === 1 ? 'y' : 'ies'}` : 'No entries'}
                        </div>
                      </div>
                    </div>

                    {/* Hours + Actions */}
                    <div className="flex items-center space-x-3">
                      {/* Hours */}
                      <div className="text-right">
                        <div className={`text-xl font-bold ${
                          dayHours >= 8 ? 'text-green-600' : dayHours > 0 ? 'text-blue-600' : 'text-gray-300'
                        }`}>
                          {dayHours.toFixed(1)}h
                        </div>
                        {!isWeekendDay && (
                          <div className="text-xs text-gray-500">of 8h</div>
                        )}
                      </div>

                      {/* Status icons */}
                      {dayHours >= 8 && !isWeekendDay && (
                        <CheckCircleIcon className="h-5 w-5 text-green-500 flex-shrink-0" />
                      )}
                      {dayHours > 0 && dayHours < 8 && !isWeekendDay && (
                        <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500 flex-shrink-0" />
                      )}

                      {/* Add button */}
                      {!isWeekendDay && (
                        <button
                          onClick={() => handleAddClick(dateStr)}
                          className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                          title="Add time entry"
                        >
                          <PlusIcon className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Day Entries */}
                  {dayEntries.length > 0 && (
                    <div className="border-t border-gray-100 px-4 sm:px-6 py-3 space-y-2">
                      {dayEntries.map(ts => (
                        <div
                          key={ts.id}
                          className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3 hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <span className="font-semibold text-gray-900 text-sm">{ts.project_name || 'Unknown Project'}</span>
                              {ts.task_name && (
                                <span className="text-gray-500 text-sm">· {ts.task_name}</span>
                              )}
                              <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${getStatusColor(ts.status)}`}>
                                {ts.status}
                              </span>
                              {ts.is_billable && (
                                <span className="px-2 py-0.5 text-xs font-medium bg-green-50 text-green-700 border border-green-200 rounded-full">
                                  Billable
                                </span>
                              )}
                            </div>
                            {ts.description && (
                              <p className="text-xs text-gray-500 truncate max-w-md">{ts.description}</p>
                            )}
                            <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                              <span className="font-semibold text-blue-600">{ts.hours}h</span>
                              {ts.start_time && ts.end_time && (
                                <span>{ts.start_time} – {ts.end_time}</span>
                              )}
                              {ts.overtime_hours && ts.overtime_hours > 0 && (
                                <span className="text-orange-600">+{ts.overtime_hours}h OT</span>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center space-x-1 ml-3 flex-shrink-0">
                            {ts.status === 'DRAFT' && ts.user_id === user?.id && (
                              <>
                                <button
                                  onClick={() => handleSubmit(ts.id)}
                                  className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                  title="Submit"
                                >
                                  <CheckCircleIcon className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleEditClick(ts)}
                                  className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                  title="Edit"
                                >
                                  <PencilIcon className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleDelete(ts.id)}
                                  className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Delete"
                                >
                                  <TrashIcon className="h-4 w-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── ADD / EDIT MODAL ── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowAddModal(false)} />
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-blue-700">
              <h2 className="text-lg font-bold text-white">
                {editingEntry ? 'Edit Time Entry' : 'Add Time Entry'}
              </h2>
              <button onClick={() => setShowAddModal(false)} className="text-blue-200 hover:text-white">
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Date */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Project */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Project *</label>
                <select
                  value={form.project_id}
                  onChange={e => setForm(f => ({ ...f, project_id: e.target.value, task_id: '' }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select a project...</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* Task */}
              {filteredTasks.length > 0 && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Task</label>
                  <select
                    value={form.task_id}
                    onChange={e => setForm(f => ({ ...f, task_id: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select a task (optional)...</option>
                    {filteredTasks.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Time Range */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Start Time</label>
                  <input
                    type="time"
                    value={form.start_time}
                    onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">End Time</label>
                  <input
                    type="time"
                    value={form.end_time}
                    onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Break */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Break Duration (minutes)</label>
                <input
                  type="number"
                  min={0}
                  max={480}
                  value={form.break_duration}
                  onChange={e => setForm(f => ({ ...f, break_duration: Number(e.target.value) }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Calculated Hours Preview */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                {(() => {
                  const [h1, m1] = form.start_time.split(':').map(Number);
                  const [h2, m2] = form.end_time.split(':').map(Number);
                  const totalMins = (h2 * 60 + m2) - (h1 * 60 + m1);
                  const workMins = Math.max(0, totalMins - form.break_duration);
                  const hours = workMins / 60;
                  const ot = Math.max(0, hours - 8);
                  return (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-blue-700 font-medium">Calculated:</span>
                      <span className="font-bold text-blue-900">{hours.toFixed(2)}h total</span>
                      {ot > 0 && <span className="text-orange-600 font-medium">+{ot.toFixed(2)}h OT</span>}
                    </div>
                  );
                })()}
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Description *</label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="What did you work on?"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              {/* Billable Toggle */}
              <div className="flex items-center justify-between py-2">
                <div>
                  <span className="text-sm font-semibold text-gray-700">Billable</span>
                  <p className="text-xs text-gray-500">Mark this time as billable to client</p>
                </div>
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, is_billable: !f.is_billable }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    form.is_billable ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    form.is_billable ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end space-x-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={submitting}
                className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Saving...' : editingEntry ? 'Update' : 'Save Entry'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimesheetDashboard;
