import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { Project } from '../../types';
import Badge from '../../components/common/Badge';
import EmptyState from '../../components/common/EmptyState';
import { FolderIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import { formatDate } from '../../utils/format';

const statusColors: Record<string, any> = { ACTIVE: 'green', COMPLETED: 'blue', ON_HOLD: 'yellow', ARCHIVED: 'gray' };

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/projects').then((r) => setProjects(r.data.data || [])).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="py-16 flex justify-center"><div className="h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-5">
      <h1 className="page-title">Projects</h1>
      {projects.length === 0 ? (
        <EmptyState icon={<FolderIcon className="h-10 w-10 text-gray-300" />} title="No projects" description="No projects assigned to you yet." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((p) => (
            <div key={p.id} className="card p-5 hover:shadow-card-hover transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <Badge variant={statusColors[p.status]}>{p.status}</Badge>
                <span className="text-xs text-gray-400 font-mono">{p.project_code}</span>
              </div>
              <h3 className="font-bold text-gray-900 mb-1">{p.name}</h3>
              {p.client_name && <p className="text-sm text-gray-500 mb-2">Client: {p.client_name}</p>}
              {p.description && <p className="text-sm text-gray-400 mb-3 line-clamp-2">{p.description}</p>}
              {p.end_date && <p className="text-xs text-gray-400">Due: {formatDate(p.end_date)}</p>}
              <Link to={`/tasks?project_id=${p.id}`}
                className="flex items-center gap-1 text-blue-600 text-sm font-medium mt-3 hover:text-blue-700">
                View Tasks <ArrowRightIcon className="h-3 w-3" />
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
