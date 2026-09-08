import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';
import { LeaveRequest } from '../../types';
import { formatDate, timeAgo } from '../../utils/format';
import { LeaveStatusBadge } from '../../components/common/Badge';
import EmptyState from '../../components/common/EmptyState';
import Modal from '../../components/common/Modal';
import { CalendarDaysIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export default function LeaveApprovalsPage() {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('PENDING');
  const [reviewModal, setReviewModal] = useState<{ id: number; action: 'approve' | 'reject' } | null>(null);
  const [comment, setComment] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/leave/team', { params: { status: filter || undefined } });
      setRequests(res.data.data || []);
    } finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { fetch(); }, [fetch]);

  const handleAction = async () => {
    if (!reviewModal) return;
    setActionLoading(true);
    try {
      const endpoint = reviewModal.action === 'approve' ? 'approve' : 'reject';
      await api.post(`/leave/${reviewModal.id}/${endpoint}`, { comment });
      toast.success(`Leave request ${reviewModal.action === 'approve' ? 'approved' : 'rejected'}`);
      setReviewModal(null);
      setComment('');
      fetch();
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Action failed'); }
    finally { setActionLoading(false); }
  };

  return (
    <div className="space-y-5">
      <h1 className="page-title">Leave Approvals</h1>

      <div className="flex gap-2">
        {['PENDING', 'APPROVED', 'REJECTED', ''].map((s) => (
          <button key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === s ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}>
            {s || 'All'}
          </button>
        ))}
      </div>

      <div className="card">
        {loading ? (
          <div className="py-12 flex justify-center"><div className="h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : requests.length === 0 ? (
          <EmptyState icon={<CalendarDaysIcon className="h-10 w-10 text-gray-300" />}
            title="No leave requests" description="No leave requests match the selected filter." />
        ) : (
          <div className="divide-y divide-gray-100">
            {requests.map((req) => (
              <div key={req.id} className="px-6 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-bold text-gray-900">{req.employee_name}</span>
                      <LeaveStatusBadge status={req.status} />
                    </div>
                    <p className="text-sm text-gray-700 font-medium">{req.leave_type_name}</p>
                    <p className="text-sm text-gray-600">{formatDate(req.start_date)} → {formatDate(req.end_date)}
                      <span className="text-gray-400 ml-2">({req.total_days} day{req.total_days !== 1 ? 's' : ''})</span>
                    </p>
                    <p className="text-sm text-gray-500 mt-1">"{req.reason}"</p>
                    <p className="text-xs text-gray-400 mt-0.5">Applied {timeAgo(req.created_at)}</p>
                  </div>
                  {req.status === 'PENDING' && (
                    <div className="flex gap-2 flex-shrink-0">
                      <button onClick={() => { setReviewModal({ id: req.id, action: 'approve' }); setComment(''); }}
                        className="flex items-center gap-1 px-3 py-1.5 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg text-sm font-medium">
                        <CheckIcon className="h-4 w-4" />
                        Approve
                      </button>
                      <button onClick={() => { setReviewModal({ id: req.id, action: 'reject' }); setComment(''); }}
                        className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-sm font-medium">
                        <XMarkIcon className="h-4 w-4" />
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal
        isOpen={!!reviewModal}
        onClose={() => setReviewModal(null)}
        title={reviewModal?.action === 'approve' ? 'Approve Leave Request' : 'Reject Leave Request'}
        size="sm"
      >
        <p className="text-sm text-gray-600 mb-4">
          {reviewModal?.action === 'approve'
            ? 'Add an optional comment for the employee.'
            : 'Provide a reason for rejecting this leave request.'}
        </p>
        <textarea
          rows={3}
          className="input resize-none w-full mb-4"
          placeholder="Comment (optional)"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
        <div className="flex gap-3">
          <button onClick={() => setReviewModal(null)} className="btn-secondary flex-1">Cancel</button>
          <button onClick={handleAction} disabled={actionLoading}
            className={reviewModal?.action === 'approve' ? 'btn-success flex-1' : 'btn-danger flex-1'}>
            {actionLoading ? 'Processing…' : reviewModal?.action === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
