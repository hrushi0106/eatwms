import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { Department } from '../../types';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import EmptyState from '../../components/common/EmptyState';
import { BuildingOfficeIcon, PlusIcon, PencilIcon } from '@heroicons/react/24/outline';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editDept, setEditDept] = useState<Department | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { register, handleSubmit, reset } = useForm();

  const fetch = async () => {
    setLoading(true);
    api.get('/departments').then((r) => setDepartments(r.data.data || [])).finally(() => setLoading(false));
  };

  useEffect(() => { fetch(); }, []);

  const openEdit = (d: Department) => {
    setEditDept(d);
    reset({ name: d.name, description: d.description || '' });
    setShowModal(true);
  };

  const openCreate = () => {
    setEditDept(null);
    reset({ name: '', description: '' });
    setShowModal(true);
  };

  const onSubmit = async (data: any) => {
    setSaving(true);
    try {
      if (editDept) {
        await api.put(`/departments/${editDept.id}`, data);
        toast.success('Department updated');
      } else {
        await api.post('/departments', data);
        toast.success('Department created');
      }
      setShowModal(false);
      fetch();
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="page-title">Departments</h1>
        <button onClick={openCreate} className="btn-primary">
          <PlusIcon className="h-4 w-4" />
          Add Department
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-3 py-12 flex justify-center"><div className="h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : departments.length === 0 ? (
          <div className="col-span-3"><EmptyState icon={<BuildingOfficeIcon className="h-10 w-10 text-gray-300" />} title="No departments" /></div>
        ) : (
          departments.map((d) => (
            <div key={d.id} className="card p-5 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-semibold text-gray-900">{d.name}</p>
                  <Badge variant={d.status === 'ACTIVE' ? 'green' : 'gray'}>{d.status}</Badge>
                </div>
                {d.description && <p className="text-sm text-gray-500">{d.description}</p>}
              </div>
              <button onClick={() => openEdit(d)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded">
                <PencilIcon className="h-4 w-4" />
              </button>
            </div>
          ))
        )}
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editDept ? 'Edit Department' : 'New Department'} size="sm">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="label">Name *</label>
            <input className="input" {...register('name', { required: true })} placeholder="Department name" />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea rows={2} className="input resize-none" {...register('description')} placeholder="Optional description" />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'Saving…' : editDept ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
