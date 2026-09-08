import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '../../api/axios';
import { LeaveType, LeaveBalance } from '../../types';
import toast from 'react-hot-toast';
import { differenceInBusinessDays, parseISO } from 'date-fns';

const schema = z.object({
  leave_type_id: z.string().min(1, 'Select a leave type'),
  start_date: z.string().min(1, 'Start date required'),
  end_date: z.string().min(1, 'End date required'),
  reason: z.string().min(10, 'Reason must be at least 10 characters'),
});

type FormData = z.infer<typeof schema>;

export default function LeaveApplicationPage() {
  const navigate = useNavigate();
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const startDate = watch('start_date');
  const endDate = watch('end_date');
  const leaveTypeId = watch('leave_type_id');

  useEffect(() => {
    Promise.all([
      api.get('/leave/types'),
      api.get('/leave/balance'),
    ]).then(([types, bal]) => {
      setLeaveTypes(types.data.data || []);
      setBalances(bal.data.data || []);
    });
  }, []);

  const totalDays = startDate && endDate
    ? Math.max(0, differenceInBusinessDays(parseISO(endDate), parseISO(startDate)) + 1)
    : 0;

  const balance = balances.find((b) => b.leave_type_id === parseInt(leaveTypeId));

  const onSubmit = async (data: FormData) => {
    if (totalDays <= 0) { toast.error('End date must be after start date'); return; }
    setIsSubmitting(true);
    try {
      await api.post('/leave/request', {
        leave_type_id: parseInt(data.leave_type_id),
        start_date: data.start_date,
        end_date: data.end_date,
        total_days: totalDays,
        reason: data.reason,
      });
      toast.success('Leave request submitted successfully');
      navigate('/leave/history');
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to submit leave request');
    } finally { setIsSubmitting(false); }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="card p-8">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Apply for Leave</h2>
        <p className="text-sm text-gray-500 mb-8">Submit a leave request for manager approval.</p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <label className="label">Leave Type *</label>
            <select className={`input ${errors.leave_type_id ? 'border-red-400' : ''}`}
              {...register('leave_type_id')}>
              <option value="">Select leave type</option>
              {leaveTypes.map((t) => {
                const bal = balances.find((b) => b.leave_type_id === t.id);
                return (
                  <option key={t.id} value={t.id}>
                    {t.name} {bal ? `(${bal.remaining_days} days remaining)` : ''}
                  </option>
                );
              })}
            </select>
            {errors.leave_type_id && <p className="text-xs text-red-600 mt-1">{errors.leave_type_id.message}</p>}
          </div>

          {balance && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
              <span className="font-medium text-blue-800">Available Balance: </span>
              <span className="text-blue-700">{balance.remaining_days} / {balance.allocated_days} days</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Start Date *</label>
              <input type="date" className={`input ${errors.start_date ? 'border-red-400' : ''}`}
                {...register('start_date')} />
              {errors.start_date && <p className="text-xs text-red-600 mt-1">{errors.start_date.message}</p>}
            </div>
            <div>
              <label className="label">End Date *</label>
              <input type="date" className={`input ${errors.end_date ? 'border-red-400' : ''}`}
                {...register('end_date')} />
              {errors.end_date && <p className="text-xs text-red-600 mt-1">{errors.end_date.message}</p>}
            </div>
          </div>

          {totalDays > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm">
              <span className="font-medium text-green-800">Total Working Days: </span>
              <span className="text-green-700">{totalDays} day{totalDays !== 1 ? 's' : ''}</span>
              {balance && totalDays > balance.remaining_days && (
                <p className="text-red-600 mt-1">⚠ Insufficient balance ({balance.remaining_days} days available)</p>
              )}
            </div>
          )}

          <div>
            <label className="label">Reason *</label>
            <textarea rows={4} className={`input resize-none ${errors.reason ? 'border-red-400' : ''}`}
              placeholder="Provide a reason for your leave request..."
              {...register('reason')} />
            {errors.reason && <p className="text-xs text-red-600 mt-1">{errors.reason.message}</p>}
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={() => navigate('/leave/history')} className="btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting || (balance != null && totalDays > balance.remaining_days)}
              className="btn-primary flex-1">
              {isSubmitting ? 'Submitting…' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
