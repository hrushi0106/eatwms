import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';
import { User, Department, PaginationMeta } from '../../types';
import { formatDate } from '../../utils/format';
import Badge from '../../components/common/Badge';
import Pagination from '../../components/common/Pagination';
import EmptyState from '../../components/common/EmptyState';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Modal from '../../components/common/Modal';
import { UsersIcon, PlusIcon, PencilIcon, UserMinusIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';

export default function EmployeesPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [deactivateId, setDeactivateId] = useState<number | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, limit: 20 };
      if (search) params.search = search;
      if (roleFilter) params.role = roleFilter;
      const [usersRes, deptRes] = await Promise.all([
        api.get('/users', { params }),
        departments.length === 0 ? api.get('/departments') : Promise.resolve(null),
      ]);
      setUsers(usersRes.data.data || []);
      setMeta(usersRes.data.meta || null);
      if (deptRes) setDepartments(deptRes.data.data || []);
    } finally { setLoading(false); }
  }, [page, search, roleFilter]);

  useEffect(() => { fetch(); }, [fetch]);

  const handleDeactivate = async () => {
    if (!deactivateId) return;
    try {
      await api.patch(`/users/${deactivateId}/deactivate`);
      toast.success('User deactivated');
      setDeactivateId(null);
      fetch();
    } catch { toast.error('Failed to deactivate user'); }
  };

  const roleBadgeVariant = (role: string) => {
    const map: Record<string, any> = { ADMIN: 'purple', MANAGER: 'blue', TEAM_LEAD: 'indigo', EMPLOYEE: 'green' };
    return map[role] || 'gray';
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="page-title">Employees</h1>
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          <PlusIcon className="h-4 w-4" />
          Add Employee
        </button>
      </div>

      <div className="card p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="input pl-9" placeholder="Search by name, email, code…" />
        </div>
        <select value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }} className="input w-40">
          <option value="">All Roles</option>
          <option value="ADMIN">Admin</option>
          <option value="MANAGER">Manager</option>
          <option value="TEAM_LEAD">Team Lead</option>
          <option value="EMPLOYEE">Employee</option>
        </select>
      </div>

      <div className="table-container">
        {loading ? (
          <div className="py-16 flex justify-center"><LoadingSpinner /></div>
        ) : users.length === 0 ? (
          <EmptyState icon={<UsersIcon className="h-10 w-10 text-gray-300" />}
            title="No employees found" description="Try adjusting your search or filters." />
        ) : (
          <>
            <table className="table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Code</th>
                  <th>Role</th>
                  <th>Department</th>
                  <th>Joined</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {u.first_name[0]}{u.last_name[0]}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{u.first_name} {u.last_name}</p>
                          <p className="text-xs text-gray-400">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="text-sm font-mono">{u.employee_code}</td>
                    <td><Badge variant={roleBadgeVariant(u.role)}>{u.role.replace('_', ' ')}</Badge></td>
                    <td className="text-sm">{u.department_name || '—'}</td>
                    <td className="text-sm">{u.joining_date ? formatDate(u.joining_date) : '—'}</td>
                    <td>
                      <Badge variant={u.status === 'ACTIVE' ? 'green' : 'red'}>
                        {u.status}
                      </Badge>
                    </td>
                    <td>
                      <div className="flex gap-1">
                        <button onClick={() => setEditUser(u)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="Edit">
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        {u.status === 'ACTIVE' && (
                          <button onClick={() => setDeactivateId(u.id)}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded" title="Deactivate">
                            <UserMinusIcon className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {meta && <Pagination meta={meta} onPageChange={setPage} />}
          </>
        )}
      </div>

      <EmployeeFormModal
        isOpen={showCreate || !!editUser}
        user={editUser}
        departments={departments}
        onClose={() => { setShowCreate(false); setEditUser(null); }}
        onSaved={() => { setShowCreate(false); setEditUser(null); fetch(); }}
      />

      {deactivateId && (
        <Modal isOpen title="Deactivate Employee" onClose={() => setDeactivateId(null)} size="sm">
          <p className="text-sm text-gray-600 mb-4">Are you sure you want to deactivate this employee? They will not be able to log in.</p>
          <div className="flex gap-3">
            <button onClick={() => setDeactivateId(null)} className="btn-secondary flex-1">Cancel</button>
            <button onClick={handleDeactivate} className="btn-danger flex-1">Deactivate</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function EmployeeFormModal({ isOpen, user, departments, onClose, onSaved }: any) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      reset({
        first_name: user.first_name, last_name: user.last_name,
        email: user.email, phone: user.phone || '',
        department_id: user.department_id ? String(user.department_id) : '',
        joining_date: user.joining_date || '',
      });
    } else {
      reset({ first_name: '', last_name: '', email: '', phone: '', password: '', role_id: '4', department_id: '', joining_date: '' });
    }
  }, [user, isOpen]);

  const onSubmit = async (data: any) => {
    setLoading(true);
    try {
      const payload = {
        ...data,
        role_id: data.role_id ? parseInt(data.role_id) : undefined,
        department_id: data.department_id ? parseInt(data.department_id) : undefined,
      };
      if (user) {
        delete payload.password;
        await api.put(`/users/${user.id}`, payload);
        toast.success('Employee updated');
      } else {
        await api.post('/users', payload);
        toast.success('Employee created');
      }
      onSaved();
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Save failed'); }
    finally { setLoading(false); }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={user ? 'Edit Employee' : 'Add Employee'} size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">First Name *</label>
            <input className="input" {...register('first_name', { required: true })} />
          </div>
          <div>
            <label className="label">Last Name *</label>
            <input className="input" {...register('last_name', { required: true })} />
          </div>
        </div>
        <div>
          <label className="label">Email *</label>
          <input type="email" className="input" {...register('email', { required: true })} disabled={!!user} />
        </div>
        {!user && (
          <div>
            <label className="label">Password *</label>
            <input type="password" className="input" {...register('password', { required: !user })} />
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Role</label>
            <select className="input" {...register('role_id')} disabled={!!user}>
              <option value="4">Employee</option>
              <option value="3">Team Lead</option>
              <option value="2">Manager</option>
              <option value="1">Admin</option>
            </select>
          </div>
          <div>
            <label className="label">Department</label>
            <select className="input" {...register('department_id')}>
              <option value="">Select department</option>
              {departments.map((d: Department) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Phone</label>
            <input className="input" {...register('phone')} />
          </div>
          <div>
            <label className="label">Joining Date</label>
            <input type="date" className="input" {...register('joining_date')} />
          </div>
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button type="submit" disabled={loading} className="btn-primary flex-1">
            {loading ? 'Saving…' : user ? 'Update Employee' : 'Create Employee'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
