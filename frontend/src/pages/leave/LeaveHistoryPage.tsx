import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { LeaveRequest, LeaveBalance } from '../../types';
import { formatDate, timeAgo } from '../../utils/format';
import { LeaveStatusBadge } from '../../components/common/Badge';
import EmptyState from '../../components/common/EmptyState';
import { CalendarDaysIcon, PlusIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export default function LeaveHistoryPage() {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = async () => {
    try {
      const [reqRes, balRes] = await Promise.all([
        api.get('/leave/my'),
        api.get('/leave/balance'),
      ]);
      setRequests(reqRes.data.data || []);
      setBalances(balRes.data.data || []);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, []);

  const handleCancel = async (id: number) => {
    if (!confirm('Cancel this leave request?')) return;
    try {
      await api.post(`/leave/${id}/cancel`);
      toast.success('Leave request cancelled');
      fetch();
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Failed to cancel'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="page-title">My Leave</h1>
        <Link to="/leave/apply" className="btn-primary">
          <PlusIcon className="h-4 w-4" />
          Apply for Leave
        </Link>
      </div>

      {/* Leave Balances */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {balances.slice(0, 4).map((b) => (
          <div key={b.id} className="card p-4">
            <p className="text-xs text-gray-500 mb-1 truncate">{b.leave_type_name}</p>
            <p className="text-2xl font-bold text-gray-900">{b.remaining_days}<span className="text-sm text-gray-400">/{b.allocated_days}</span></p>
            <p className="text-xs text-gray-400 mt-1">days remaining</p>
            <div className="mt-2 bg-gray-200 rounded-full h-1.5">
              <div className="bg-blue-500 h-1.5 rounded-full"
                style={{ width: `${Math.max(0, (b.remaining_days / b.allocated_days) * 100)}%` }} />
            </div>
          </div>
        ))}
      </div>

      {/* Leave Requests */}
      <div className="card">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="section-title">Leave Requests</h2>
        </div>
        {loading ? (
          <div className="py-12 flex justify-center"><div className="h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : requests.length === 0 ? (
          <EmptyState icon={<CalendarDaysIcon className="h-10 w-10 text-gray-300" />}
            title="No leave requests" description="You haven't applied for any leave yet."
            action={<Link to="/leave/apply" className="btn-primary">Apply for Leave</Link>} />
        ) : (
          <div className="divide-y divide-gray-100">
            {requests.map((req) => (
              <div key={req.id} className="px-6 py-4 flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-gray-900">{req.leave_type_name}</span>
                    <LeaveStatusBadge status={req.status} />
                  </div>
                  <p className="text-sm text-gray-600">{formatDate(req.start_date)} → {formatDate(req.end_date)} ({req.total_days} day{req.total_days !== 1 ? 's' : ''})</p>
                  <p className="text-xs text-gray-400 mt-0.5">{timeAgo(req.created_at)}</p>
                  {req.review_comment && (
                    <p className="text-xs text-gray-500 mt-1 italic">"{req.review_comment}"</p>
                  )}
                </div>
                {req.status === 'PENDING' && (
                  <button onClick={() => handleCancel(req.id)}
                    className="text-xs text-red-600 hover:text-red-700 font-medium flex-shrink-0">
                    Cancel
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
