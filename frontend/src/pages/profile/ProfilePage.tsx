import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import api from '../../api/axios';
import { useAuth } from '../../contexts/AuthContext';
import Badge from '../../components/common/Badge';
import { formatDate } from '../../utils/format';
import toast from 'react-hot-toast';

export default function ProfilePage() {
  const { user, isAdmin } = useAuth();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const { register, handleSubmit } = useForm({
    defaultValues: { first_name: user?.first_name, last_name: user?.last_name, phone: '' },
  });

  const roleBadge = (role: string) => {
    const map: Record<string, any> = { ADMIN: 'purple', MANAGER: 'blue', TEAM_LEAD: 'indigo', EMPLOYEE: 'green' };
    return map[role] || 'gray';
  };

  const onSave = async (data: any) => {
    setSaving(true);
    try {
      await api.put('/users/me/profile', data);
      toast.success('Profile updated');
      setEditing(false);
    } catch { toast.error('Failed to update profile'); }
    finally { setSaving(false); }
  };

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="page-title">My Profile</h1>

      <div className="card p-6">
        <div className="flex items-center gap-5 mb-6">
          <div className="w-16 h-16 rounded-full bg-blue-600 text-white flex items-center justify-center text-2xl font-bold">
            {user.first_name[0]}{user.last_name[0]}
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">{user.first_name} {user.last_name}</h2>
            <p className="text-gray-500 text-sm">{user.email}</p>
            <div className="mt-1">
              <Badge variant={roleBadge(user.role)}>{user.role.replace('_', ' ')}</Badge>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
          <div><p className="text-gray-400 text-xs">Employee Code</p><p className="font-mono font-medium">{user.employee_code}</p></div>
          <div><p className="text-gray-400 text-xs">Status</p><Badge variant={user.status === 'ACTIVE' ? 'green' : 'red'}>{user.status}</Badge></div>
        </div>

        {editing ? (
          <form onSubmit={handleSubmit(onSave)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><label className="label">First Name</label><input className="input" {...register('first_name')} /></div>
              <div><label className="label">Last Name</label><input className="input" {...register('last_name')} /></div>
            </div>
            <div><label className="label">Phone</label><input className="input" {...register('phone')} /></div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setEditing(false)} className="btn-secondary flex-1">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Saving…' : 'Save Changes'}</button>
            </div>
          </form>
        ) : (
          <button onClick={() => setEditing(true)} className="btn-secondary text-sm">Edit Profile</button>
        )}
      </div>

      {/* Security note */}
      <div className="card p-5 bg-blue-50 border-blue-200">
        <p className="text-sm font-semibold text-blue-800 mb-1">Security</p>
        <p className="text-sm text-blue-700">To change your password, use the Forgot Password link on the login page.</p>
      </div>
    </div>
  );
}
