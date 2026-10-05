import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { Timesheet, PaginationMeta, Project, Task, User } from '../../types';
import { formatDate } from '../../utils/format';
import { TimesheetStatusBadge } from '../../components/common/Badge';
import Pagination from '../../components/common/Pagination';
import EmptyState from '../../components/common/EmptyState';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { ConfirmModal } from '../../components/common/Modal';
import TimesheetFilters, { TimesheetFiltersType, SavedFilter } from './TimesheetFilters';
import { 
  DocumentTextIcon, 
  PlusIcon, 
  TrashIcon, 
  PaperAirplaneIcon, 
  CheckIcon, 
  XMarkIcon,
  ArrowDownTrayIcon,
  BookmarkIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { TimesheetStatusWorkflow } from './TimesheetStatusWorkflow';
import { 
  searchTimesheets, 
  exportSearchResults, 
  saveSearchFilters, 
  getSavedSearchFilters, 
  deleteSavedSearchFilter,
  highlightSearchTerms 
} from '../../utils/timesheetSearch';

const TimesheetListView: React.FC = () => {
  const { user } = useAuth();
  const [rows, setRows] = useState<Timesheet[]>([]);
  const [filteredRows, setFilteredRows] = useState<Timesheet[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);

  // Enhanced filters state
  const [filters, setFilters] = useState<TimesheetFiltersType>({
    search: '',
    dateRange: {
      start: '',
      end: '',
      preset: 'all',
    },
    status: [],
    projects: [],
    tasks: [],
    users: [],
    billable: 'all',
    hoursRange: {
      min: 0,
      max: 24,
    },
    tags: [],
    departments: [],
  });

  const isManagerOrAbove = ['MANAGER', 'TEAM_LEAD', 'ADMIN'].includes(user?.role || '');

  // Load saved filters on component mount
  useEffect(() => {
    const loadSavedFilters = async () => {
      const saved = getSavedSearchFilters();
      setSavedFilters(saved);
    };
    loadSavedFilters();
  }, []);

  // Fetch all required data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch timesheets
      const params: Record<string, string | number> = { page, limit: 20 };
      if (filters.dateRange.start) params.start_date = filters.dateRange.start;
      if (filters.dateRange.end) params.end_date = filters.dateRange.end;
      
      const timesheetRes = await api.get('/timesheets', { params });
      const timesheetData = timesheetRes.data.data || [];
      
      setRows(timesheetData);
      setMeta(timesheetRes.data.meta || null);

      // Fetch projects, tasks, and users for filter options
      const [projectsRes, tasksRes] = await Promise.all([
        api.get('/projects'),
        api.get('/tasks'),
      ]);

      setProjects(projectsRes.data.data || []);
      setTasks(tasksRes.data.data || []);

      // Fetch users if manager
      if (isManagerOrAbove) {
        const usersRes = await api.get('/users/team');
        setUsers(usersRes.data.data || []);
      }
    } catch (error) {
      toast.error('Failed to load timesheets');
    } finally {
      setLoading(false);
    }
  }, [page, filters.dateRange.start, filters.dateRange.end, isManagerOrAbove]);

  useEffect(() => { 
    fetchData(); 
  }, [fetchData]);

  // Apply client-side filtering and search
  useEffect(() => {
    const searchContext = { projects, tasks, users };
    const filtered = searchTimesheets(rows, filters, searchContext);
    setFilteredRows(filtered);
  }, [rows, filters, projects, tasks, users]);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/timesheets/${deleteId}`);
      toast.success('Timesheet deleted');
      setDeleteId(null);
      fetchData();
    } catch { 
      toast.error('Delete failed'); 
    }
  };

  const handleSubmit = async (id: number) => {
    setActionLoading(id);
    try {
      await api.post(`/timesheets/${id}/submit`);
      toast.success('Submitted for approval');
      fetchData();
    } catch (e: any) { 
      toast.error(e?.response?.data?.message || 'Submit failed'); 
    } finally { 
      setActionLoading(null); 
    }
  };

  const handleApprove = async (id: number) => {
    setActionLoading(id);
    try {
      await api.post(`/timesheets/${id}/approve`);
      toast.success('Timesheet approved');
      fetchData();
    } catch { 
      toast.error('Action failed'); 
    } finally { 
      setActionLoading(null); 
    }
  };

  const handleReject = async (id: number) => {
    setActionLoading(id);
    try {
      await api.post(`/timesheets/${id}/reject`, { comment: 'Rejected by manager' });
      toast.success('Timesheet rejected');
      fetchData();
    } catch { 
      toast.error('Action failed'); 
    } finally { 
      setActionLoading(null); 
    }
  };

  // Handle filter save
  const handleSaveFilter = useCallback((name: string, filterData: TimesheetFiltersType) => {
    saveSearchFilters(filterData, name);
    const updated = getSavedSearchFilters();
    setSavedFilters(updated);
    toast.success('Filter saved successfully');
  }, []);

  // Handle filter load
  const handleLoadFilter = useCallback((filterData: TimesheetFiltersType) => {
    setFilters(filterData);
    toast.success('Filter loaded');
  }, []);

  // Handle filter delete
  const handleDeleteFilter = useCallback((id: string) => {
    deleteSavedSearchFilter(id);
    const updated = getSavedSearchFilters();
    setSavedFilters(updated);
    toast.success('Filter deleted');
  }, []);

  // Export search results
  const handleExport = useCallback(() => {
    if (filteredRows.length === 0) {
      toast.error('No data to export');
      return;
    }
    
    try {
      exportSearchResults(filteredRows, `timesheet-export-${new Date().toISOString().split('T')[0]}.csv`);
      toast.success('Export completed');
    } catch (error) {
      toast.error('Export failed');
    }
  }, [filteredRows]);

  const totalHours = useMemo(() => {
    return filteredRows.reduce((sum, ts) => sum + Number(ts.hours), 0);
  }, [filteredRows]);

  const hasActiveFilters = useMemo(() => {
    return (
      filters.search.trim() !== '' ||
      filters.dateRange.preset !== 'all' ||
      filters.status.length > 0 ||
      filters.projects.length > 0 ||
      filters.tasks.length > 0 ||
      filters.users.length > 0 ||
      filters.billable !== 'all' ||
      filters.hoursRange.min > 0 ||
      filters.hoursRange.max < 24 ||
      filters.departments.length > 0
    );
  }, [filters]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">All Timesheets</h2>
          {filteredRows.length > 0 && (
            <p className="text-sm text-gray-600 mt-1">
              Total: {totalHours.toFixed(1)} hours • {filteredRows.length} entries
              {hasActiveFilters && filteredRows.length !== rows.length && (
                <span className="text-blue-600 ml-1">
                  (filtered from {rows.length})
                </span>
              )}
            </p>
          )}
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={handleExport}
            disabled={filteredRows.length === 0}
            className="flex items-center space-x-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ArrowDownTrayIcon className="h-4 w-4" />
            <span>Export</span>
          </button>
          
          <Link to="/timesheet/new" className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <PlusIcon className="h-4 w-4" />
            <span>New Entry</span>
          </Link>
        </div>
      </div>

      {/* Enhanced Filters */}
      <TimesheetFilters
        filters={filters}
        onFiltersChange={setFilters}
        projects={projects}
        tasks={tasks}
        users={users}
        departments={[...new Set(users.map(u => u.department_name).filter(Boolean))]}
        showUserFilter={isManagerOrAbove}
        savedFilters={savedFilters}
        onSaveFilter={handleSaveFilter}
        onLoadFilter={handleLoadFilter}
        onDeleteFilter={handleDeleteFilter}
      />

      {/* Status Workflow */}
      {filteredRows.length > 0 && (
        <TimesheetStatusWorkflow
          timesheets={filteredRows}
          canManageAll={isManagerOrAbove}
          onStatusUpdate={fetchData}
        />
      )}

      {/* Table Container */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {loading ? (
          <div className="py-16 flex justify-center">
            <LoadingSpinner />
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="py-16">
            <EmptyState 
              icon={<DocumentTextIcon className="h-10 w-10 text-gray-300" />}
              title="No timesheets found" 
              description={hasActiveFilters ? "Try adjusting your filters to see more results." : "Start by adding a new timesheet entry."}
              action={
                hasActiveFilters ? (
                  <button 
                    onClick={() => setFilters({
                      search: '',
                      dateRange: { start: '', end: '', preset: 'all' },
                      status: [],
                      projects: [],
                      tasks: [],
                      users: [],
                      billable: 'all',
                      hoursRange: { min: 0, max: 24 },
                      tags: [],
                      departments: [],
                    })}
                    className="btn-secondary"
                  >
                    Clear Filters
                  </button>
                ) : (
                  <Link to="/timesheet/new" className="btn-primary">
                    Add Entry
                  </Link>
                )
              } 
            />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    {isManagerOrAbove && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Employee
                      </th>
                    )}
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Project
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Task
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Hours
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredRows.map((ts) => (
                    <tr key={ts.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {formatDate(ts.date)}
                        </div>
                      </td>
                      {isManagerOrAbove && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {filters.search ? (
                              <span dangerouslySetInnerHTML={{
                                __html: highlightSearchTerms(ts.employee_name || '', filters.search)
                              }} />
                            ) : (
                              ts.employee_name
                            )}
                          </div>
                        </td>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {filters.search ? (
                            <span dangerouslySetInnerHTML={{
                              __html: highlightSearchTerms(ts.project_name || '', filters.search)
                            }} />
                          ) : (
                            ts.project_name
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {ts.task_name ? (
                            filters.search ? (
                              <span dangerouslySetInnerHTML={{
                                __html: highlightSearchTerms(ts.task_name, filters.search)
                              }} />
                            ) : (
                              ts.task_name
                            )
                          ) : '—'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <div className="text-sm font-semibold text-blue-700">
                            {ts.hours}h
                          </div>
                          {ts.is_billable && (
                            <div className="w-2 h-2 bg-green-400 rounded-full" title="Billable" />
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 max-w-xs truncate">
                          {ts.description ? (
                            filters.search ? (
                              <span dangerouslySetInnerHTML={{
                                __html: highlightSearchTerms(ts.description, filters.search)
                              }} />
                            ) : (
                              ts.description
                            )
                          ) : '—'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <TimesheetStatusBadge status={ts.status} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          {ts.status === 'DRAFT' && ts.user_id === user?.id && (
                            <>
                              <Link 
                                to={`/timesheet/${ts.id}/edit`}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors" 
                                title="Edit"
                              >
                                ✏️
                              </Link>
                              <button 
                                onClick={() => handleSubmit(ts.id)}
                                disabled={actionLoading === ts.id}
                                className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors" 
                                title="Submit"
                              >
                                <PaperAirplaneIcon className="h-4 w-4" />
                              </button>
                              <button 
                                onClick={() => setDeleteId(ts.id)}
                                className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors" 
                                title="Delete"
                              >
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            </>
                          )}
                          {ts.status === 'SUBMITTED' && isManagerOrAbove && (
                            <>
                              <button 
                                onClick={() => handleApprove(ts.id)} 
                                disabled={actionLoading === ts.id}
                                className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors" 
                                title="Approve"
                              >
                                <CheckIcon className="h-4 w-4" />
                              </button>
                              <button 
                                onClick={() => handleReject(ts.id)} 
                                disabled={actionLoading === ts.id}
                                className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors" 
                                title="Reject"
                              >
                                <XMarkIcon className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            {meta && <div className="px-6 py-4 border-t border-gray-200"><Pagination meta={meta} onPageChange={setPage} /></div>}
          </>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Timesheet"
        message="Are you sure you want to delete this timesheet entry? This action cannot be undone."
        confirmLabel="Delete"
      />
    </div>
  );
};

export default TimesheetListView;