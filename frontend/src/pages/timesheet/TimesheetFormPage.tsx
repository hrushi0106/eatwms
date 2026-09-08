import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '../../api/axios';
import { Project, Task } from '../../types';
import toast from 'react-hot-toast';

const schema = z.object({
  date: z.string().min(1, 'Date is required'),
  project_id: z.string().min(1, 'Project is required'),
  task_id: z.string().optional(),
  hours: z.string().min(1, 'Hours is required'),
  description: z.string().min(3, 'Description is required'),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  is_billable: z.boolean().optional(),
});

type FormData = z.infer<typeof schema>;

export default function TimesheetFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      is_billable: true,
    },
  });

  const selectedProjectId = watch('project_id');

  useEffect(() => {
    api.get('/projects').then((r) => setProjects(r.data.data || []));
    if (isEdit) {
      api.get(`/timesheets/${id}`).then((r) => {
        const ts = r.data.data;
        if (ts) {
          setValue('date', ts.date);
          setValue('project_id', String(ts.project_id));
          setValue('task_id', ts.task_id ? String(ts.task_id) : '');
          setValue('hours', String(ts.hours));
          setValue('description', ts.description);
          setValue('start_time', ts.start_time || '');
          setValue('end_time', ts.end_time || '');
          setValue('is_billable', ts.is_billable);
        }
      });
    }
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      api.get('/tasks', { params: { project_id: selectedProjectId } })
        .then((r) => setTasks(r.data.data || []));
    } else {
      setTasks([]);
    }
  }, [selectedProjectId]);

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      const payload = {
        date: data.date,
        project_id: parseInt(data.project_id),
        task_id: data.task_id ? parseInt(data.task_id) : undefined,
        hours: parseFloat(data.hours),
        description: data.description,
        start_time: data.start_time || undefined,
        end_time: data.end_time || undefined,
        is_billable: data.is_billable,
      };

      if (isEdit) {
        await api.put(`/timesheets/${id}`, payload);
        toast.success('Timesheet updated');
      } else {
        await api.post('/timesheets', payload);
        toast.success('Timesheet created');
      }
      navigate('/timesheet');
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Save failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="card p-8">
        <h2 className="text-xl font-bold text-gray-900 mb-6">{isEdit ? 'Edit Timesheet' : 'New Timesheet Entry'}</h2>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Date *</label>
              <input type="date" className={`input ${errors.date ? 'border-red-400' : ''}`} {...register('date')} />
              {errors.date && <p className="text-xs text-red-600 mt-1">{errors.date.message}</p>}
            </div>
            <div>
              <label className="label">Hours Worked *</label>
              <input type="number" step="0.5" min="0.5" max="24"
                className={`input ${errors.hours ? 'border-red-400' : ''}`}
                placeholder="e.g. 8" {...register('hours')} />
              {errors.hours && <p className="text-xs text-red-600 mt-1">{errors.hours.message}</p>}
            </div>
          </div>

          <div>
            <label className="label">Project *</label>
            <select className={`input ${errors.project_id ? 'border-red-400' : ''}`} {...register('project_id')}>
              <option value="">Select a project</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            {errors.project_id && <p className="text-xs text-red-600 mt-1">{errors.project_id.message}</p>}
          </div>

          {tasks.length > 0 && (
            <div>
              <label className="label">Task (optional)</label>
              <select className="input" {...register('task_id')}>
                <option value="">No specific task</option>
                {tasks.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Start Time (optional)</label>
              <input type="time" className="input" {...register('start_time')} />
            </div>
            <div>
              <label className="label">End Time (optional)</label>
              <input type="time" className="input" {...register('end_time')} />
            </div>
          </div>

          <div>
            <label className="label">Description *</label>
            <textarea rows={3}
              className={`input resize-none ${errors.description ? 'border-red-400' : ''}`}
              placeholder="Describe the work done..."
              {...register('description')} />
            {errors.description && <p className="text-xs text-red-600 mt-1">{errors.description.message}</p>}
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" id="billable" className="rounded" {...register('is_billable')} />
            <label htmlFor="billable" className="text-sm text-gray-700">Billable hours</label>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => navigate('/timesheet')} className="btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
              {isSubmitting ? 'Saving…' : isEdit ? 'Update Timesheet' : 'Save as Draft'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
