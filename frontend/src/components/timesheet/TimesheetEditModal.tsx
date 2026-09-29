import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { XMarkIcon } from '@heroicons/react/24/outline';
import api from '../../api/axios';
import { Project, Task, Timesheet } from '../../types';
import toast from 'react-hot-toast';

const schema = z.object({
  date: z.string().min(1, 'Date is required'),
  project_id: z.string().min(1, 'Project is required'),
  task_id: z.string().optional(),
  hours: z.string().min(1, 'Hours is required'),
  description: z.string().min(1, 'Description is required'),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  is_billable: z.boolean().optional(),
});

type FormData = z.infer<typeof schema>;

interface TimesheetEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  timesheet: Timesheet;
  projects: Project[];
}

const TimesheetEditModal: React.FC<TimesheetEditModalProps> = ({
  isOpen,
  onClose,
  onSave,
  timesheet,
  projects
}) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors }
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const selectedProjectId = watch('project_id');

  // Initialize form with timesheet data
  useEffect(() => {
    if (timesheet && isOpen) {
      setValue('date', timesheet.date);
      setValue('project_id', String(timesheet.project_id));
      setValue('task_id', timesheet.task_id ? String(timesheet.task_id) : '');
      setValue('hours', String(timesheet.hours));
      setValue('description', timesheet.description);
      setValue('start_time', timesheet.start_time || '');
      setValue('end_time', timesheet.end_time || '');
      setValue('is_billable', timesheet.is_billable);
    }
  }, [timesheet, isOpen, setValue]);

  // Fetch tasks when project changes
  useEffect(() => {
    if (selectedProjectId) {
      api.get('/tasks', { params: { project_id: selectedProjectId } })
        .then((r) => setTasks(r.data.data || []))
        .catch(() => setTasks([]));
    } else {
      setTasks([]);
    }
  }, [selectedProjectId]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      reset();
      setTasks([]);
    }
  }, [isOpen, reset]);

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

      await api.put(`/timesheets/${timesheet.id}`, payload);
      toast.success('Timesheet updated successfully');
      onSave();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to update timesheet');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />
        
        <div className="relative w-full max-w-2xl bg-white rounded-lg shadow-xl">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Edit Time Entry</h2>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            >
              <XMarkIcon className="h-6 w-6 text-gray-400" />
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date *
                </label>
                <input
                  type="date"
                  {...register('date')}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.date ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {errors.date && (
                  <p className="mt-1 text-sm text-red-600">{errors.date.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Hours *
                </label>
                <input
                  type="number"
                  step="0.25"
                  min="0.25"
                  max="24"
                  placeholder="8.0"
                  {...register('hours')}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.hours ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {errors.hours && (
                  <p className="mt-1 text-sm text-red-600">{errors.hours.message}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Project *
              </label>
              <select
                {...register('project_id')}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.project_id ? 'border-red-300' : 'border-gray-300'
                }`}
              >
                <option value="">Select a project</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name} ({project.project_code})
                  </option>
                ))}
              </select>
              {errors.project_id && (
                <p className="mt-1 text-sm text-red-600">{errors.project_id.message}</p>
              )}
            </div>

            {tasks.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Task (Optional)
                </label>
                <select
                  {...register('task_id')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">No specific task</option>
                  {tasks.map((task) => (
                    <option key={task.id} value={task.id}>
                      {task.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Time (Optional)
                </label>
                <input
                  type="time"
                  {...register('start_time')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Time (Optional)
                </label>
                <input
                  type="time"
                  {...register('end_time')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description *
              </label>
              <textarea
                rows={3}
                placeholder="What did you work on?"
                {...register('description')}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none ${
                  errors.description ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
              )}
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_billable_edit"
                {...register('is_billable')}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="is_billable_edit" className="ml-2 block text-sm text-gray-900">
                Billable hours
              </label>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Updating...' : 'Update Entry'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default TimesheetEditModal;