import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import api from '../../api/axios';
import { Task, TaskUpdate } from '../../types';
import { formatDate, formatDateTime, timeAgo } from '../../utils/format';
import { TaskStatusBadge, PriorityBadge } from '../../components/common/Badge';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { ArrowLeftIcon, ClockIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export default function TaskDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [task, setTask] = useState<Task | null>(null);
  const [updates, setUpdates] = useState<TaskUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: { progress_percentage: 0, work_update: '', time_spent: '', remaining_work: '', blocker: '' },
  });

  const fetch = async () => {
    try {
      const [taskRes, updatesRes] = await Promise.all([
        api.get(`/tasks/${id}`),
        api.get(`/tasks/${id}/updates`),
      ]);
      setTask(taskRes.data.data);
      setUpdates(updatesRes.data.data || []);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, [id]);

  useEffect(() => {
    if (task) reset({ progress_percentage: task.progress_percentage, work_update: '', time_spent: '', remaining_work: '', blocker: '' });
  }, [task]);

  const onSubmit = async (data: any) => {
    setSubmitting(true);
    try {
      await api.post(`/tasks/${id}/progress`, {
        progress_percentage: parseInt(data.progress_percentage),
        work_update: data.work_update,
        time_spent: data.time_spent ? parseFloat(data.time_spent) : undefined,
        remaining_work: data.remaining_work || undefined,
        blocker: data.blocker || undefined,
      });
      toast.success('Progress updated');
      fetch();
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Update failed'); }
    finally { setSubmitting(false); }
  };

  if (loading) return <LoadingSpinner fullPage />;
  if (!task) return <div className="text-center py-16 text-gray-500">Task not found</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <button onClick={() => navigate('/tasks')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeftIcon className="h-4 w-4" />
        Back to Tasks
      </button>

      {/* Task Header */}
      <div className="card p-6">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <PriorityBadge priority={task.priority} />
            <TaskStatusBadge status={task.status} />
          </div>
          {task.due_date && (
            <div className="text-right">
              <p className="text-xs text-gray-400">Due Date</p>
              <p className="text-sm font-semibold">{formatDate(task.due_date)}</p>
            </div>
          )}
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-1">{task.name}</h1>
        <p className="text-sm text-blue-600 mb-3">{task.project_name}</p>
        {task.description && <p className="text-sm text-gray-600">{task.description}</p>}

        <div className="mt-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-500">Progress</span>
            <span className="font-bold text-blue-700">{task.progress_percentage}%</span>
          </div>
          <div className="bg-gray-200 rounded-full h-3">
            <div className="bg-blue-600 h-3 rounded-full transition-all"
              style={{ width: `${task.progress_percentage}%` }} />
          </div>
        </div>

        {task.estimated_hours && (
          <div className="mt-3 flex items-center gap-2 text-sm text-gray-500">
            <ClockIcon className="h-4 w-4" />
            Estimated: {task.estimated_hours}h
          </div>
        )}
      </div>

      {/* Update Progress Form */}
      {task.status !== 'COMPLETED' && task.status !== 'CANCELLED' && (
        <div className="card p-6">
          <h2 className="section-title mb-4">Post Progress Update</h2>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="label">Progress % *</label>
              <input type="range" min="0" max="100" step="5"
                className="w-full accent-blue-600" {...register('progress_percentage')} />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>0%</span>
                <span className="font-semibold text-blue-700">{`${(register('progress_percentage') as any)?.ref?.value || task.progress_percentage}%`}</span>
                <span>100%</span>
              </div>
            </div>
            <div>
              <label className="label">Work Update *</label>
              <textarea rows={3} className={`input resize-none ${errors.work_update ? 'border-red-400' : ''}`}
                placeholder="Describe what you worked on..."
                {...register('work_update', { required: 'Work update is required' })} />
              {errors.work_update && <p className="text-xs text-red-600 mt-1">{errors.work_update.message as string}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Time Spent (hrs)</label>
                <input type="number" step="0.5" min="0" className="input" placeholder="e.g. 2" {...register('time_spent')} />
              </div>
              <div>
                <label className="label">Remaining Work</label>
                <input className="input" placeholder="e.g. Testing" {...register('remaining_work')} />
              </div>
            </div>
            <div>
              <label className="label">Blocker (if any)</label>
              <input className="input" placeholder="Describe any blockers..." {...register('blocker')} />
            </div>
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? 'Saving…' : 'Submit Update'}
            </button>
          </form>
        </div>
      )}

      {/* Update History */}
      {updates.length > 0 && (
        <div className="card p-6">
          <h2 className="section-title mb-4">Update History</h2>
          <div className="space-y-4">
            {updates.map((u) => (
              <div key={u.id} className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {u.user_name?.[0]}
                </div>
                <div className="flex-1 bg-gray-50 rounded-lg p-3">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium">{u.user_name}</span>
                    <span className="text-xs text-gray-400">{timeAgo(u.created_at)}</span>
                  </div>
                  <p className="text-sm text-gray-700">{u.work_update}</p>
                  {u.progress_percentage != null && (
                    <span className="text-xs text-blue-600 mt-1 inline-block">
                      Progress: {u.progress_percentage}%
                    </span>
                  )}
                  {u.blocker && (
                    <p className="text-xs text-red-600 mt-1">⚠ Blocker: {u.blocker}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
