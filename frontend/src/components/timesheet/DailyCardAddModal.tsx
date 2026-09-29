import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { XMarkIcon, ClockIcon, MapPinIcon, BuildingOfficeIcon } from '@heroicons/react/24/outline';
import api from '../../api/axios';
import { Project, Task } from '../../types';
import toast from 'react-hot-toast';

const schema = z.object({
  project_id: z.string().min(1, 'Project is required'),
  task_id: z.string().optional(),
  hours: z.string().min(1, 'Hours is required'),
  description: z.string().min(1, 'Description is required'),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  is_billable: z.boolean().optional(),
  work_location: z.string().optional(),
  work_type: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface DailyCardAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  selectedDate?: string | null;
  projects: Project[];
}

const WORK_LOCATIONS = [
  { id: 'office', name: 'Office', icon: BuildingOfficeIcon },
  { id: 'home', name: 'Work From Home', icon: MapPinIcon },
  { id: 'travel', name: 'Business Travel', icon: MapPinIcon },
  { id: 'conference', name: 'External Conference/Meeting/Training', icon: MapPinIcon },
];

const WORK_TYPES = [
  { id: 'full_day', name: 'Full Day' },
  { id: 'half_day', name: 'Half Day' },
  { id: 'wfh', name: 'Work From Home' },
  { id: 'leave', name: 'Leave' },
  { id: 'holiday', name: 'Holiday' },
];

const DailyCardAddModal: React.FC<DailyCardAddModalProps> = ({
  isOpen,
  onClose,
  onSave,
  selectedDate,
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
    defaultValues: {
      is_billable: true,
      work_location: 'office',
      work_type: 'full_day',
    },
  });

  const selectedProjectId = watch('project_id');

  useEffect(() => {
    if (selectedDate && isOpen) {
      // Set default times based on work type
      const now = new Date();
      const startTime = '09:00';
      const endTime = '18:00';
      setValue('start_time', startTime);
      setValue('end_time', endTime);
      
      // Calculate hours between start and end time
      const start = new Date(`2000-01-01T${startTime}`);
      const end = new Date(`2000-01-01T${endTime}`);
      const diffHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      setValue('hours', diffHours.toString());
    }
  }, [selectedDate, isOpen, setValue]);

  useEffect(() => {
    if (selectedProjectId) {
      api.get('/tasks', { params: { project_id: selectedProjectId } })
        .then((r) => setTasks(r.data.data || []))
        .catch(() => setTasks([]));
    } else {
      setTasks([]);
    }
  }, [selectedProjectId]);

  useEffect(() => {
    if (!isOpen) {
      reset();
      setTasks([]);
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
    if (!selectedDate) return;
    
    console.log('Submitting timesheet data:', { selectedDate, data });
    setIsSubmitting(true);
    try {
      const payload = {
        date: selectedDate,
        project_id: parseInt(data.project_id),
        task_id: data.task_id ? parseInt(data.task_id) : undefined,
        hours: parseFloat(data.hours),
        description: data.description,
        start_time: data.start_time || undefined,
        end_time: data.end_time || undefined,
        is_billable: data.is_billable,
      };

      console.log('Sending payload:', payload);
      const response = await api.post('/timesheets', payload);
      console.log('API Response:', response.data);
      toast.success('Time entry added successfully');
      onSave();
    } catch (e: any) {
      console.error('API Error:', e);
      toast.error(e?.response?.data?.message || 'Failed to add time entry');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />
        
        <div className="relative w-full max-w-lg bg-white rounded-lg shadow-xl">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Add Time Entry</h2>
              <p className="text-base font-medium text-gray-700 mt-1">
                {selectedDate && new Date(selectedDate).toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            >
              <XMarkIcon className="h-6 w-6 text-gray-400" />
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
            {/* Project Selection */}
            <div>
              <label className="block text-base font-bold text-gray-900 mb-2">
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

            {/* Task Selection */}
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

            {/* Time and Hours */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">
                  Start Time
                </label>
                <input
                  type="time"
                  {...register('start_time')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">
                  End Time
                </label>
                <input
                  type="time"
                  {...register('end_time')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.hours ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {errors.hours && (
                  <p className="mt-1 text-sm text-red-600">{errors.hours.message}</p>
                )}
              </div>
            </div>

            {/* Work Location */}
            <div>
              <label className="block text-base font-bold text-gray-900 mb-2">
                Work Location
              </label>
              <select
                {...register('work_location')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {WORK_LOCATIONS.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Work Type */}
            <div>
              <label className="block text-base font-bold text-gray-900 mb-2">
                Work Type
              </label>
              <select
                {...register('work_type')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {WORK_TYPES.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
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
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none ${
                  errors.description ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
              )}
            </div>

            {/* Billable */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_billable"
                {...register('is_billable')}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="is_billable" className="ml-2 block text-base font-semibold text-gray-900">
                Billable hours
              </label>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 text-base font-semibold text-gray-700 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-3 text-base font-bold text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Adding...' : 'Add Entry'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default DailyCardAddModal;