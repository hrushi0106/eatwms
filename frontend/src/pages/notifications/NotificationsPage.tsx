import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { Notification } from '../../types';
import { timeAgo } from '../../utils/format';
import EmptyState from '../../components/common/EmptyState';
import { BellIcon, BellSlashIcon, CheckIcon } from '@heroicons/react/24/outline';
import { useNotificationStore } from '../../stores/notificationStore';
import toast from 'react-hot-toast';

const typeIcons: Record<string, string> = {
  CHECKIN_REMINDER: '⏰', CHECKOUT_REMINDER: '⏰', TIMESHEET_REMINDER: '📄',
  LEAVE_STATUS: '📅', TASK_ASSIGNED: '✅', TASK_DUE: '⚠️',
  ATTENDANCE_EXCEPTION: '🚨', LEAVE_REQUEST: '📅', TIMESHEET_SUBMITTED: '📄',
  MISSING_CHECKOUT: '❌', LONG_IDLE: '💤',
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const { markRead, markAllRead } = useNotificationStore();

  const fetch = async () => {
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data.data?.notifications || []);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, []);

  const handleMarkRead = async (id: number) => {
    try {
      await api.post(`/notifications/${id}/read`);
      markRead(id);
      setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n));
    } catch {}
  };

  const handleMarkAllRead = async () => {
    try {
      await api.post('/notifications/read-all');
      markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      toast.success('All notifications marked as read');
    } catch {}
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/notifications/${id}`);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch {}
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Notifications</h1>
          {unreadCount > 0 && <p className="text-sm text-gray-500 mt-0.5">{unreadCount} unread</p>}
        </div>
        {unreadCount > 0 && (
          <button onClick={handleMarkAllRead} className="btn-secondary text-sm flex items-center gap-2">
            <CheckIcon className="h-4 w-4" />
            Mark all read
          </button>
        )}
      </div>

      {loading ? (
        <div className="py-16 flex justify-center"><div className="h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : notifications.length === 0 ? (
        <EmptyState icon={<BellSlashIcon className="h-10 w-10 text-gray-300" />}
          title="No notifications" description="You're all caught up!" />
      ) : (
        <div className="card divide-y divide-gray-100">
          {notifications.map((n) => (
            <div key={n.id} className={`flex gap-4 px-5 py-4 ${!n.is_read ? 'bg-blue-50/50' : 'hover:bg-gray-50'} transition-colors`}>
              <div className="flex-shrink-0 mt-0.5 text-xl">{typeIcons[n.type] || '🔔'}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <p className={`text-sm ${!n.is_read ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                    {n.title}
                  </p>
                  <span className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0">{timeAgo(n.created_at)}</span>
                </div>
                <p className="text-sm text-gray-600 mt-0.5">{n.message}</p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {!n.is_read && (
                  <button onClick={() => handleMarkRead(n.id)}
                    className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" title="Mark as read" />
                )}
                <button onClick={() => handleDelete(n.id)}
                  className="p-1 text-gray-300 hover:text-gray-500 text-xs" title="Delete">✕</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
