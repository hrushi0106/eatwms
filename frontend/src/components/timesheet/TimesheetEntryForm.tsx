import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, parse, differenceInMinutes, addMinutes } from 'date-fns';
import {
  XMarkIcon,
  ClockIcon,
  CalculatorIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import api from '../../api/axios';
import { Project, Task, Timesheet } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

// Time entry validation schema
const timesheetSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  project_id: z.string().min(1, 'Project is required'),
  task_id: z.string().optional(),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  hours: z.string().min(1, 'Hours is required'),
  overtime_hours: z.string().optional(),
  description: z.string().min(1, 'Description is required').max(500, 'Description must be less than 500 characters'),
  is_billable: z.boolean().optional(),
  break_duration: z.string().optional(),
});

type TimesheetFormData = z.infer<typeof timesheetSchema>;

interface TimesheetEntryFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  selectedDate?: string | null;
  projects: Project[];
  tasks: Task[];
  editingTimesheet?: Timesheet | null;
  mode: 'create' | 'edit';
}

interface TimeCalculation {
  totalMinutes: number;
  totalHours: number;
  regularHours: number;
  overtimeHours: number;
  breakMinutes: number;
  workingMinutes: number;
  isValid: boolean;
  errors: string[];
}

const TimesheetEntryForm: React.FC<TimesheetEntryFormProps> = ({
  isOpen,
  onClose,
  onSave,
  selectedDate,
  projects,
  tasks,
  editingTimesheet,
  mode,
}) => {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [timeCalculation, setTimeCalculation] = useState<TimeCalculation>({
    totalMinutes: 0,
    totalHours: 0,
    regularHours: 0,
    overtimeHours: 0,
    breakMinutes: 0,
    workingMinutes: 0,
    isValid: true,
    errors: [],
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<TimesheetFormData>({
    resolver: zodResolver(timesheetSchema),
    defaultValues: {
      date: selectedDate || format(new Date(), 'yyyy-MM-dd'),
      is_billable: true,
      break_duration: '60', // Default 60 minutes break
    },
  });

  // Watch form values for real-time calculations
  const watchedValues = watch();
  const selectedProjectId = watch('project_id');
  const startTime = watch('start_time');
  const endTime = watch('end_time');
  const breakDuration = watch('break_duration');
  const manualHours = watch('hours');

  // Standard working hours configuration
  const STANDARD_WORK_HOURS = 8;
  const MINUTES_IN_HOUR = 60;

  // Filter tasks based on selected project
  useEffect(() => {
    if (selectedProjectId) {
      const projectTasks = tasks.filter(task => task.project_id === parseInt(selectedProjectId));
      setFilteredTasks(projectTasks);
    } else {
      setFilteredTasks([]);
    }
  }, [selectedProjectId, tasks]);

  // Calculate time automatically when start/end times change
  const calculateTimeFromRange = useCallback((start: string, end: string, breakMin: number = 0): TimeCalculation => {
    const errors: string[] = [];
    
    if (!start || !end) {
      return {
        totalMinutes: 0,
        totalHours: 0,
        regularHours: 0,
        overtimeHours: 0,
        breakMinutes: breakMin,
        workingMinutes: 0,
        isValid: true,
        errors: [],
      };
    }

    try {
      // Parse times (assuming same day)
      const startDate = parse(start, 'HH:mm', new Date());
      const endDate = parse(end, 'HH:mm', new Date());
      
      // Handle overnight shifts
      let adjustedEndDate = endDate;
      if (endDate <= startDate) {
        adjustedEndDate = addMinutes(endDate, 24 * 60); // Add 24 hours
      }

      const totalMinutes = differenceInMinutes(adjustedEndDate, startDate);
      const workingMinutes = Math.max(0, totalMinutes - breakMin);
      const totalHours = workingMinutes / MINUTES_IN_HOUR;

      // Validation checks
      if (totalMinutes <= 0) {
        errors.push('End time must be after start time');
      }
      
      if (totalMinutes > 24 * 60) {
        errors.push('Total time cannot exceed 24 hours');
      }

      if (breakMin >= totalMinutes) {
        errors.push('Break duration cannot exceed total work time');
      }

      // Calculate regular and overtime hours
      const regularHours = Math.min(totalHours, STANDARD_WORK_HOURS);
      const overtimeHours = Math.max(0, totalHours - STANDARD_WORK_HOURS);

      return {
        totalMinutes,
        totalHours,
        regularHours,
        overtimeHours,
        breakMinutes: breakMin,
        workingMinutes,
        isValid: errors.length === 0,
        errors,
      };
    } catch (error) {
      return {
        totalMinutes: 0,
        totalHours: 0,
        regularHours: 0,
        overtimeHours: 0,
        breakMinutes: breakMin,
        workingMinutes: 0,
        isValid: false,
        errors: ['Invalid time format'],
      };
    }
  }, []);

  // Update calculations when time values change
  useEffect(() => {
    if (startTime && endTime) {
      const breakMin = parseInt(breakDuration || '0') || 0;
      const calculation = calculateTimeFromRange(startTime, endTime, breakMin);
      setTimeCalculation(calculation);
      
      // Auto-update hours field
      if (calculation.isValid) {
        setValue('hours', calculation.totalHours.toFixed(2));
        setValue('overtime_hours', calculation.overtimeHours.toFixed(2));
      }
    } else if (manualHours) {
      // Manual hours entry mode
      const hours = parseFloat(manualHours) || 0;
      const regularHours = Math.min(hours, STANDARD_WORK_HOURS);
      const overtimeHours = Math.max(0, hours - STANDARD_WORK_HOURS);
      
      setTimeCalculation({
        totalMinutes: hours * MINUTES_IN_HOUR,
        totalHours: hours,
        regularHours,
        overtimeHours,
        breakMinutes: parseInt(breakDuration || '0') || 0,
        workingMinutes: hours * MINUTES_IN_HOUR,
        isValid: hours > 0 && hours <= 24,
        errors: hours > 24 ? ['Hours cannot exceed 24'] : hours <= 0 ? ['Hours must be greater than 0'] : [],
      });
    }
  }, [startTime, endTime, breakDuration, manualHours, calculateTimeFromRange, setValue]);

  // Initialize form with editing data
  useEffect(() => {
    if (mode === 'edit' && editingTimesheet) {
      reset({
        date: editingTimesheet.date,
        project_id: editingTimesheet.project_id.toString(),
        task_id: editingTimesheet.task_id?.toString() || '',
        start_time: editingTimesheet.start_time || '',
        end_time: editingTimesheet.end_time || '',
        hours: editingTimesheet.hours.toString(),
        overtime_hours: editingTimesheet.overtime_hours?.toString() || '0',
        description: editingTimesheet.description,
        is_billable: editingTimesheet.is_billable,
        break_duration: '60', // Default break, could be enhanced
      });
    } else if (mode === 'create') {
      reset({
        date: selectedDate || format(new Date(), 'yyyy-MM-dd'),
        is_billable: true,
        break_duration: '60',
      });
    }
  }, [mode, editingTimesheet, selectedDate, reset]);

  const onSubmit = async (data: TimesheetFormData) => {
    if (!timeCalculation.isValid) {
      toast.error('Please fix time calculation errors');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        date: data.date,
        project_id: parseInt(data.project_id),
        task_id: data.task_id ? parseInt(data.task_id) : undefined,
        start_time: data.start_time || undefined,
        end_time: data.end_time || undefined,
        hours: parseFloat(data.hours),
        overtime_hours: parseFloat(data.overtime_hours || '0'),
        description: data.description,
        is_billable: data.is_billable || false,
      };

      if (mode === 'edit' && editingTimesheet) {
        await api.put(`/timesheets/${editingTimesheet.id}`, payload);
        toast.success('Timesheet entry updated successfully');
      } else {
        await api.post('/timesheets', payload);
        toast.success('Timesheet entry created successfully');
      }

      onSave();
      onClose();
    } catch (error: any) {
      console.error('API Error:', error);
      toast.error(error?.response?.data?.message || 'Failed to save timesheet entry');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickTimeEntry = (hours: number) => {
    setValue('hours', hours.toString());
    setValue('start_time', '09:00');
    setValue('end_time', hours === 8 ? '18:00' : hours === 4 ? '14:00' : '17:00');
    setValue('break_duration', '60');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />
        
        <div className="relative w-full max-w-2xl bg-white rounded-lg shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {mode === 'edit' ? 'Edit Time Entry' : 'Add Time Entry'}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
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

          <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
            {/* Date and Project Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">
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
                <label className="block text-sm font-bold text-gray-900 mb-2">
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
            </div>

            {/* Task Selection */}
            {filteredTasks.length > 0 && (
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">
                  Task (Optional)
                </label>
                <select
                  {...register('task_id')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">No specific task</option>
                  {filteredTasks.map((task) => (
                    <option key={task.id} value={task.id}>
                      {task.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Quick Time Entry Buttons */}
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">
                Quick Entry
              </label>
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => handleQuickTimeEntry(8)}
                  className="px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                >
                  Full Day (8h)
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickTimeEntry(4)}
                  className="px-3 py-2 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                >
                  Half Day (4h)
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickTimeEntry(6)}
                  className="px-3 py-2 text-sm bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors"
                >
                  6 Hours
                </button>
              </div>
            </div>

            {/* Time Entry Section */}
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center">
                <ClockIcon className="h-4 w-4 mr-2" />
                Time Details
              </h3>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Time
                  </label>
                  <input
                    type="time"
                    {...register('start_time')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Time
                  </label>
                  <input
                    type="time"
                    {...register('end_time')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Break (minutes)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="480"
                    {...register('break_duration')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
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
                    <p className="mt-1 text-xs text-red-600">{errors.hours.message}</p>
                  )}
                </div>
              </div>

              {/* Time Calculation Display */}
              <div className={`p-3 rounded-lg ${
                timeCalculation.isValid ? 'bg-blue-50 border border-blue-200' : 'bg-red-50 border border-red-200'
              }`}>
                <div className="flex items-center space-x-2 mb-2">
                  <CalculatorIcon className={`h-4 w-4 ${timeCalculation.isValid ? 'text-blue-600' : 'text-red-600'}`} />
                  <span className={`text-sm font-medium ${timeCalculation.isValid ? 'text-blue-900' : 'text-red-900'}`}>
                    Time Calculation
                  </span>
                </div>
                
                {timeCalculation.isValid ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Total: </span>
                      <span className="font-semibold text-blue-600">{timeCalculation.totalHours.toFixed(2)}h</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Regular: </span>
                      <span className="font-semibold text-green-600">{timeCalculation.regularHours.toFixed(2)}h</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Overtime: </span>
                      <span className="font-semibold text-orange-600">{timeCalculation.overtimeHours.toFixed(2)}h</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Break: </span>
                      <span className="font-semibold text-gray-600">{Math.floor(timeCalculation.breakMinutes / 60)}h {timeCalculation.breakMinutes % 60}m</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-red-700">
                    {timeCalculation.errors.map((error, index) => (
                      <div key={index} className="flex items-center space-x-1">
                        <ExclamationTriangleIcon className="h-4 w-4" />
                        <span>{error}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">
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
              <p className="mt-1 text-xs text-gray-500">
                {watchedValues.description?.length || 0}/500 characters
              </p>
            </div>

            {/* Billable Checkbox */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_billable"
                {...register('is_billable')}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="is_billable" className="ml-2 block text-sm font-semibold text-gray-900">
                Billable hours
              </label>
              <div className="ml-2">
                <InformationCircleIcon className="h-4 w-4 text-gray-400" title="Mark if this time should be billed to the client" />
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-6 py-3 text-sm font-semibold text-gray-700 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !timeCalculation.isValid}
                className="flex items-center space-x-2 px-6 py-3 text-sm font-bold text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                <span>{isSubmitting ? 'Saving...' : mode === 'edit' ? 'Update Entry' : 'Add Entry'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default TimesheetEntryForm;