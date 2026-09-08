import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';
import { AttendanceException, PaginationMeta } from '../../types';
import { formatDate, timeAgo } from '../../utils/format';
import { ExceptionSeverityBadge } from '../../components/common/Badge';
import Badge from '../../components/common/Badge';
import Pagination from '../../components/common/Pagination';
import EmptyState from '../../components/common/EmptyState';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Modal from '../../components/common/Modal';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const statusColors: Record<string, 'green' | 'blue' | 'gray' | 'yellow'> = {
  OPEN: 'yellow',
  UNDER_REVIEW: 'blue',
  RESOLVED: 'green',
  DISMISSED: 'gray',
};

const typeLabels: Record<string, string> = {
  LATE_CHECKIN: 'Late Check-In',
  EARLY_CHECKOUT: 'Early Checkout',
  MISSING_CHECKOUT: 'Missing Checkout',
  MISSING_CHECKIN: 'Missing Check-In',
  LONG_IDLE: 'Long Idle',
  MISSING_SELFIE: 'Missing Selfie',
  TIMESHEET_MISMATCH: 'Timesheet Mismatch',
  MISSING_TIMESHEET: 'Missing Timesheet',
};

export default function ExceptionsPage() {
  const [rows, setRows] = useState<AttendanceException[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ status: 'OPEN', severity: '', type: '', start_date: '', end_date: '' });
  const [reviewModal, setReviewModal] = useState<AttendanceException | null>(null);
  const [reviewStatus, setReviewStatus] = useState('RESOLVED');
  const [reviewComment, setReviewComment] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, limit: 20 };
      if (filters.status) params.status = filters.status;
      if (filters.severity) params.severity = filters.severity;
      if (filters.type) params.type = filters.type;
      if (filters.start_date) params.start_date = filters.start_date;
      if (filters.end_date) params.end_date = filters.end_date;
      const res = await api.get('/exceptions', { params });
      setRows(res.data.data || []);
      setMeta(res.data.meta || null);
    } finally { setLoading(false); }
  }, [page, filters]);

  useEffect(() => { fetch(); }, [fetch]);

  const handleReview = async () => {
    if (!reviewModal) return;
    setReviewLoading(true);
    try {
      await api.post(`/exceptions/${reviewModal.id}/review`, { status: reviewStatus, comment: reviewComment });
      toast.success('Exception reviewed');
      setReviewModal(null);
      setReviewComment('');
      fetch();
    } catch { toast.error('Review failed'); }
    finally { setReviewLoading(false); }
  };

  return (
    <div className="space-y-5">
      <h1 className="page-title">Attendance Exceptions</h1>

      <div className="card p-4 flex flex-wrap gap-3">
        <select value={filters.status}
          onChange={(e) => { setFilters(f => ({ ...f, status: e.target.value })); setPage(1); }}
          className="input w-44">
          <option value="">All Statuses</option>
          <option value="OPEN">Open</option>
          <option value="UNDER_REVIEW">Under Review</option>
          <option value="RESOLVED">Resolved</option>
          <option value="DISMISSED">Dismissed</option>
        </select>
        <select value={filters.severity}
          onChange={(e) => { setFilters(f => ({ ...f, severity: e.target.value })); setPage(1); }}
          className="input w-36">
          <option value="">All Severities</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>
        <select value={filters.type}
          onChange={(e) => { setFilters(f => ({ ...f, type: e.target.value })); setPage(1); }}
          className="input w-52">
          <option value="">All Types</option>
          {Object.entries(typeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <input type="date" value={filters.start_date}
          onChange={(e) => { setFilters(f => ({ ...f, start_date: e.target.value })); setPage(1); }}
          className="input w-40" />
        <input type="date" value={filters.end_date}
          onChange={(e) => { setFilters(f => ({ ...f, end_date: e.target.value })); setPage(1); }}
          className="input w-40" />
        <button onClick={() => { setFilters({ status: 'OPEN', severity: '', type: '', start_date: '', end_date: '' }); setPage(1); }}
          className="btn-secondary text-sm">Reset</button>
      </div>

      <div className="table-container">
        {loading ? (
          <div className="py-16 flex justify-center"><LoadingSpinner /></div>
        ) : rows.length === 0 ? (
          <EmptyState icon={<ExclamationTriangleIcon className="h-10 w-10 text-gray-300" />}
            title="No exceptions found" description="No attendance exceptions match the filters." />
        ) : (
          <>
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Employee</th>
                  <th>Type</th>
                  <th>Severity</th>
                  <th>Description</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((exc) => (
                  <tr key={exc.id}>
                    <td className="text-sm font-medium">{formatDate(exc.exception_date)}</td>
                    <td className="text-sm">{exc.employee_name}</td>
                    <td><span className="text-xs font-medium text-gray-700">{typeLabels[exc.exception_type] || exc.exception_type}</span></td>
                    <td><ExceptionSeverityBadge severity={exc.severity} /></td>
                    <td className="text-xs text-gray-600 max-w-[200px] truncate">{exc.description}</td>
                    <td>
                      <Badge variant={statusColors[exc.status] || 'gray'}>{exc.status.replace('_', ' ')}</Badge>
                    </td>
                    <td>
                      {['OPEN', 'UNDER_REVIEW'].includes(exc.status) && (
                        <button onClick={() => { setReviewModal(exc); setReviewStatus('RESOLVED'); setReviewComment(''); }}
                          className="text-xs text-blue-600 hover:text-blue-700 font-medium">
                          Review
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {meta && <Pagination meta={meta} onPageChange={setPage} />}
          </>
        )}
      </div>

      <Modal isOpen={!!reviewModal} onClose={() => setReviewModal(null)} title="Review Exception" size="md">
        {reviewModal && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm font-medium">{reviewModal.employee_name}</p>
              <p className="text-sm text-gray-600 mt-1">{reviewModal.description}</p>
              <p className="text-xs text-gray-400 mt-1">{formatDate(reviewModal.exception_date)}</p>
            </div>
            <div>
              <label className="label">Resolution Status</label>
              <select value={reviewStatus} onChange={(e) => setReviewStatus(e.target.value)} className="input">
                <option value="RESOLVED">Resolved</option>
                <option value="DISMISSED">Dismissed</option>
                <option value="UNDER_REVIEW">Under Review</option>
              </select>
            </div>
            <div>
              <label className="label">Comment (optional)</label>
              <textarea rows={3} className="input resize-none" placeholder="Add a review comment..."
                value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setReviewModal(null)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={handleReview} disabled={reviewLoading} className="btn-primary flex-1">
                {reviewLoading ? 'Saving…' : 'Save Review'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
