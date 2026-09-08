import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { Project } from '../../types';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import EmptyState from '../../components/common/EmptyState';
import { FolderIcon, PlusIcon, PencilIcon } from '@heroicons/react/24/outline';
import { formatDate } from '../../utils/format';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';

const statusColors: Record<string, any> = { ACTIVE: 'green', COMPLETED: 'blue', ON_HOLD: 'yellow', ARCHIVED: 'gray' };

export default function AdminProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [saving, setSaving] = useState(false);
  const { register, handleSubmit, reset } = useForm();

  const fetch = () => {
    setLoading(true);
    api.get('/projects').then((r) => setProjects(r.data.data || [])).finally(() => setLoading(false));
  };

  useEffect(() => { fetch(); }, []);

  const open = (p?: Project) => {
    setEditProject(p || null);
    reset(p ? { name: p.name, description: p.description || '', client_name: p.client_name || '', start_date: p.start_date || '', end_date: p.end_date || '', status: p.status } : { name: '', description: '', client_name: '', start_date: '', end_date: '', status: 'ACTIVE' });
    setShowModal(true);
  };

  const onSubmit = async (data: any) => {
    setSaving(true);
    try {
      editProject ? await api.put(`/projects/${editProject.id}`, data) : await api.post('/projects', data);
      toast.success(editProject ? 'Project updated' : 'Project created');
      setShowModal(false); fetch();
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="page-title">Projects</h1>
        <button onClick={() => open()} className="btn-primary"><PlusIcon className="h-4 w-4" />New Project</button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? <div className="col-span-3 py-12 flex justify-center"><div className="h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
          : projects.length === 0 ? <div className="col-span-3"><EmptyState icon={<FolderIcon className="h-10 w-10 text-gray-300" />} title="No projects" /></div>
          : projects.map((p) => (
            <div key={p.id} className="card p-5">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <Badge variant={statusColors[p.status]}>{p.status}</Badge>
                  <p className="font-semibold text-gray-900 mt-1">{p.name}</p>
                  <p className="text-xs text-gray-400">{p.project_code}</p>
                </div>
                <button onClick={() => open(p)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded">
                  <PencilIcon className="h-4 w-4" />
                </button>
              </div>
              {p.client_name && <p className="text-sm text-gray-500">Client: {p.client_name}</p>}
              {p.end_date && <p className="text-xs text-gray-400 mt-1">Due: {formatDate(p.end_date)}</p>}
            </div>
          ))}
      </div>
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editProject ? 'Edit Project' : 'New Project'} size="md">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div><label className="label">Project Name *</label><input className="input" {...register('name', { required: true })} /></div>
          <div><label className="label">Client Name</label><input className="input" {...register('client_name')} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Start Date</label><input type="date" className="input" {...register('start_date')} /></div>
            <div><label className="label">End Date</label><input type="date" className="input" {...register('end_date')} /></div>
          </div>
          <div><label className="label">Status</label>
            <select className="input" {...register('status')}>
              <option value="ACTIVE">Active</option><option value="ON_HOLD">On Hold</option>
              <option value="COMPLETED">Completed</option><option value="ARCHIVED">Archived</option>
            </select>
          </div>
          <div><label className="label">Description</label><textarea rows={2} className="input resize-none" {...register('description')} /></div>
          <div className="flex gap-3">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Saving…' : editProject ? 'Update' : 'Create'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
