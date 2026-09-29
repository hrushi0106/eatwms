import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { XMarkIcon, TrashIcon } from '@heroicons/react/24/outline';
import api from '../../api/axios';
import { Project, Task, Timesheet } from '../../types';
import { TimesheetStatusBadge } from '../common/Badge';
import toast from 'react-hot-toast';

const schema = z.object({
  project_id: z.string().min(1, 'Project is required'),
  task_id: z.string().optional(),
  hours: z.string().min(1, 'Hours is required'),
  description: z.string().min(1, 'Description is required'),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  is_billable: z.boolean().optional(),
});

type FormData = z.infer<typeof schema>;

interface DailyCardEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  timesheet: Timesheet;
  projects: Project[];
}

const DailyCardEditModal: React.FC<DailyCardEditModalProps> = ({
  isOpen,
  onClose,
  onSave,
  timesheet,
  projects
}) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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
      setShowDeleteConfirm(false);
    }
  }, [isOpen, reset]);

  // Calculate hours when times change
  const startTime = watch('start_time');
  const endTime = watch('end_time');
  
  useEffect(() => {
    if (startTime && endTime) {
      const start = new Date(`2000-01-01T${startTime}`);
      const end = new Date(`2000-01-01T${endTime}`);
      if (end > start) {
        const diffHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        setValue('hours', diffHours.toString());
      }
    }
  }, [startTime, endTime, setValue]);

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      const payload = {
        project_id: parseInt(data.project_id),
        task_id: data.task_id ? parseInt(data.task_id) : undefined,
        hours: parseFloat(data.hours),
        description: data.description,
        start_time: data.start_time || undefined,
        end_time: data.end_time || undefined,
        is_billable: data.is_billable,
      };

      await api.put(`/timesheets/${timesheet.id}`, payload);
      toast.success('Time entry updated successfully');
      onSave();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to update time entry');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await api.delete(`/timesheets/${timesheet.id}`);
      toast.success('Time entry deleted successfully');
      onSave();
    } catch (error) {
      toast.error('Failed to delete time entry');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSubmitForApproval = async () => {
    setIsSubmitting(true);
    try {
      await api.post(`/timesheets/${timesheet.id}/submit`);
      toast.success('Time entry submitted for approval');
      onSave();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to submit for approval');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const canEdit = timesheet.status === 'DRAFT' || timesheet.status === 'REJECTED';
  const canDelete = timesheet.status === 'DRAFT';
  const canSubmit = timesheet.status === 'DRAFT';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />
        
        <div className="relative w-full max-w-lg bg-white rounded-lg shadow-xl">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Edit Time Entry</h2>
              <div className="flex items-center space-x-3 mt-1">
                <p className="text-base font-medium text-gray-700">
                  {new Date(timesheet.date).toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
                <TimesheetStatusBadge status={timesheet.status} />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {canDelete && (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors"
                  title="Delete Entry"
                >
                  <TrashIcon className="h-5 w-5" />
                </button>
              )}
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <XMarkIcon className="h-6 w-6 text-gray-400" />
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
            {/* Project Selection */}
            <div>
              <label className="block text-base font-bold text-gray-900 mb-2">
                Project *
              </label>
              <select
                {...register('project_id')}
                disabled={!canEdit}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  !canEdit ? 'bg-gray-50 cursor-not-allowed' : ''
                } ${errors.project_id ? 'border-red-300' : 'border-gray-300'}`}
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

            {/* Task Selection */}
            {tasks.length > 0 && (
              <div>
                <label className="block text-base font-bold text-gray-900 mb-2">
                  Task (Optional)
                </label>
                <select
                  {...register('task_id')}
                  disabled={!canEdit}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    !canEdit ? 'bg-gray-50 cursor-not-allowed' : ''
                  }`}
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

            {/* Time and Hours */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">
                  Start Time
                </label>
                <input
                  type="time"
                  {...register('start_time')}
                  disabled={!canEdit}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    !canEdit ? 'bg-gray-50 cursor-not-allowed' : ''
                  }`}
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">
                  End Time
                </label>
                <input
                  type="time"
                  {...register('end_time')}
                  disabled={!canEdit}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    !canEdit ? 'bg-gray-50 cursor-not-allowed' : ''
                  }`}
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">
                  Hours *
                </label>
                <input
                  type="number"
                  step="0.25"
                  min="0.25"
                  max="24"
                  {...register('hours')}
                  disabled={!canEdit}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    !canEdit ? 'bg-gray-50 cursor-not-allowed' : ''
                  } ${errors.hours ? 'border-red-300' : 'border-gray-300'}`}
                />
                {errors.hours && (
                  <p className="mt-1 text-sm text-red-600">{errors.hours.message}</p>
                )}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-base font-bold text-gray-900 mb-2">
                Description *
              </label>
              <textarea
                rows={3}
                placeholder="What did you work on?"
                {...register('description')}
                disabled={!canEdit}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none ${
                  !canEdit ? 'bg-gray-50 cursor-not-allowed' : ''
                } ${errors.description ? 'border-red-300' : 'border-gray-300'}`}
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
              )}
            </div>

            {/* Billable */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_billable_edit"
                {...register('is_billable')}
                disabled={!canEdit}
                className={`h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded ${
                  !canEdit ? 'cursor-not-allowed' : ''
                }`}
              />
              <label htmlFor="is_billable_edit" className="ml-2 block text-base font-semibold text-gray-900">
                Billable hours
              </label>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 text-base font-semibold text-gray-700 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Close
              </button>
              
              <div className="flex space-x-3">
                {canSubmit && (
                  <button
                    type="button"
                    onClick={handleSubmitForApproval}
                    disabled={isSubmitting}
                    className="px-6 py-3 text-base font-bold text-white bg-green-600 border border-transparent rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit for Approval'}
                  </button>
                )}
                
                {canEdit && (
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-3 text-base font-bold text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Updating...' : 'Update Entry'}
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-60 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
            <div className="relative bg-white rounded-lg p-6 max-w-sm w-full">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Delete Time Entry</h3>
              <p className="text-base font-medium text-gray-700 mb-6">
                Are you sure you want to delete this time entry? This action cannot be undone.
              </p>
              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-6 py-3 text-base font-semibold text-gray-700 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="px-6 py-3 text-base font-bold text-white bg-red-600 border border-transparent rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DailyCardEditModal;