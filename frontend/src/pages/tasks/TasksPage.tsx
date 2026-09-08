import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { Task, Project } from '../../types';
import { formatDate } from '../../utils/format';
import { TaskStatusBadge, PriorityBadge } from '../../components/common/Badge';
import EmptyState from '../../components/common/EmptyState';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Modal from '../../components/common/Modal';
import { ClipboardDocumentCheckIcon, PlusIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';

export default function TasksPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [filters, setFilters] = useState({ status: '', priority: '' });
  const canCreate = ['TEAM_LEAD', 'MANAGER', 'ADMIN'].includes(user?.role || '');

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (filters.status) params.status = filters.status;
      if (filters.priority) params.priority = filters.priority;
      const res = await api.get('/tasks', { params });
      setTasks(res.data.data || []);
    } finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { fetch(); }, [fetch]);
  useEffect(() => { if (canCreate) api.get('/projects').then((r) => setProjects(r.data.data || [])); }, []);

  const priorityOrder: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
  const sorted = [...tasks].sort((a, b) => (priorityOrder[a.priority] ?? 99) - (priorityOrder[b.priority] ?? 99));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="page-title">Tasks</h1>
        {canCreate && (
          <button onClick={() => setShowCreate(true)} className="btn-primary">
            <PlusIcon className="h-4 w-4" />
            New Task
          </button>
        )}
      </div>

      <div className="card p-4 flex flex-wrap gap-3">
        <select value={filters.status}
          onChange={(e) => setFilters(f => ({ ...f, status: e.target.value }))}
          className="input w-44">
          <option value="">All Statuses</option>
          <option value="TODO">To Do</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="BLOCKED">Blocked</option>
          <option value="COMPLETED">Completed</option>
        </select>
        <select value={filters.priority}
          onChange={(e) => setFilters(f => ({ ...f, priority: e.target.value }))}
          className="input w-40">
          <option value="">All Priorities</option>
          <option value="CRITICAL">Critical</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>
        <button onClick={() => setFilters({ status: '', priority: '' })} className="btn-secondary text-sm">Clear</button>
      </div>

      {loading ? (
        <div className="py-16 flex justify-center"><LoadingSpinner /></div>
      ) : sorted.length === 0 ? (
        <EmptyState icon={<ClipboardDocumentCheckIcon className="h-10 w-10 text-gray-300" />}
          title="No tasks found" description="Tasks assigned to you will appear here." />
      ) : (
        <div className="space-y-3">
          {sorted.map((task) => (
            <Link key={task.id} to={`/tasks/${task.id}`}
              className="card p-5 flex items-center gap-4 hover:shadow-card-hover transition-shadow">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <PriorityBadge priority={task.priority} />
                  <TaskStatusBadge status={task.status} />
                </div>
                <p className="font-semibold text-gray-900 truncate">{task.name}</p>
                <p className="text-sm text-gray-500 truncate">{task.project_name}</p>
              </div>
              <div className="flex items-center gap-4 flex-shrink-0">
                {task.due_date && (
                  <div className="text-right hidden sm:block">
                    <p className="text-xs text-gray-400">Due</p>
                    <p className="text-sm font-medium">{formatDate(task.due_date)}</p>
                  </div>
                )}
                <div className="w-20 hidden sm:block">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-400">Progress</span>
                    <span className="font-medium">{task.progress_percentage}%</span>
                  </div>
                  <div className="bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full transition-all"
                      style={{ width: `${task.progress_percentage}%` }} />
                  </div>
                </div>
                <ChevronRightIcon className="h-4 w-4 text-gray-400" />
              </div>
            </Link>
          ))}
        </div>
      )}

      {canCreate && (
        <CreateTaskModal
          isOpen={showCreate}
          onClose={() => setShowCreate(false)}
          projects={projects}
          onCreated={() => { fetch(); setShowCreate(false); }}
        />
      )}
    </div>
  );
}

function CreateTaskModal({ isOpen, onClose, projects, onCreated }: {
  isOpen: boolean; onClose: () => void; projects: Project[]; onCreated: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const onSubmit = async (data: any) => {
    setLoading(true);
    try {
      await api.post('/tasks', {
        ...data, project_id: parseInt(data.project_id),
        assigned_to: data.assigned_to ? parseInt(data.assigned_to) : undefined,
        estimated_hours: data.estimated_hours ? parseFloat(data.estimated_hours) : undefined,
      });
      toast.success('Task created');
      reset();
      onCreated();
    } catch { toast.error('Failed to create task'); }
    finally { setLoading(false); }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Task" size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="label">Task Name *</label>
          <input className="input" {...register('name', { required: true })} placeholder="Enter task name" />
        </div>
        <div>
          <label className="label">Project *</label>
          <select className="input" {...register('project_id', { required: true })}>
            <option value="">Select project</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Priority</label>
            <select className="input" {...register('priority')}>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">Critical</option>
            </select>
          </div>
          <div>
            <label className="label">Due Date</label>
            <input type="date" className="input" {...register('due_date')} />
          </div>
        </div>
        <div>
          <label className="label">Description</label>
          <textarea rows={3} className="input resize-none" {...register('description')} />
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button type="submit" disabled={loading} className="btn-primary flex-1">
            {loading ? 'Creating…' : 'Create Task'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
