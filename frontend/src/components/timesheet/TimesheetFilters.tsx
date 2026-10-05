import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { format, subDays, subWeeks, subMonths, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import {
  FunnelIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
  CalendarIcon,
  ClockIcon,
  UserIcon,
  FolderIcon,
  CheckCircleIcon,
  BookmarkIcon,
  PlusIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline';
import { Timesheet, Project, Task, User } from '../../types';
import { useAuth } from '../../contexts/AuthContext';

export interface TimesheetFilters {
  search: string;
  dateRange: {
    start: string;
    end: string;
    preset?: string;
  };
  status: string[];
  projects: number[];
  tasks: number[];
  users: number[];
  billable: string; // 'all' | 'billable' | 'non-billable'
  hoursRange: {
    min: number;
    max: number;
  };
  tags: string[];
  departments: string[];
}

interface TimesheetFiltersProps {
  filters: TimesheetFilters;
  onFiltersChange: (filters: TimesheetFilters) => void;
  projects?: Project[];
  tasks?: Task[];
  users?: User[];
  departments?: string[];
  showUserFilter?: boolean;
  savedFilters?: SavedFilter[];
  onSaveFilter?: (name: string, filters: TimesheetFilters) => void;
  onLoadFilter?: (filters: TimesheetFilters) => void;
  onDeleteFilter?: (id: string) => void;
}

interface SavedFilter {
  id: string;
  name: string;
  filters: TimesheetFilters;
  createdAt: string;
}

const DEFAULT_FILTERS: TimesheetFilters = {
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
};

const DATE_PRESETS = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'this-week', label: 'This Week' },
  { value: 'last-week', label: 'Last Week' },
  { value: 'this-month', label: 'This Month' },
  { value: 'last-month', label: 'Last Month' },
  { value: 'last-7-days', label: 'Last 7 Days' },
  { value: 'last-30-days', label: 'Last 30 Days' },
  { value: 'custom', label: 'Custom Range' },
  { value: 'all', label: 'All Time' },
];

const STATUS_OPTIONS = [
  { value: 'DRAFT', label: 'Draft', color: 'bg-gray-100 text-gray-700' },
  { value: 'SUBMITTED', label: 'Submitted', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'APPROVED', label: 'Approved', color: 'bg-green-100 text-green-700' },
  { value: 'REJECTED', label: 'Rejected', color: 'bg-red-100 text-red-700' },
];

const TimesheetFilters: React.FC<TimesheetFiltersProps> = ({
  filters,
  onFiltersChange,
  projects = [],
  tasks = [],
  users = [],
  departments = [],
  showUserFilter = false,
  savedFilters = [],
  onSaveFilter,
  onLoadFilter,
  onDeleteFilter,
}) => {
  const { user } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveFilterName, setSaveFilterName] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);

  // Calculate date range based on preset
  const getDateRangeFromPreset = useCallback((preset: string) => {
    const today = new Date();
    let start = '';
    let end = '';

    switch (preset) {
      case 'today':
        start = end = format(today, 'yyyy-MM-dd');
        break;
      case 'yesterday':
        const yesterday = subDays(today, 1);
        start = end = format(yesterday, 'yyyy-MM-dd');
        break;
      case 'this-week':
        start = format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd');
        end = format(endOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd');
        break;
      case 'last-week':
        const lastWeekStart = startOfWeek(subWeeks(today, 1), { weekStartsOn: 1 });
        const lastWeekEnd = endOfWeek(subWeeks(today, 1), { weekStartsOn: 1 });
        start = format(lastWeekStart, 'yyyy-MM-dd');
        end = format(lastWeekEnd, 'yyyy-MM-dd');
        break;
      case 'this-month':
        start = format(startOfMonth(today), 'yyyy-MM-dd');
        end = format(endOfMonth(today), 'yyyy-MM-dd');
        break;
      case 'last-month':
        const lastMonth = subMonths(today, 1);
        start = format(startOfMonth(lastMonth), 'yyyy-MM-dd');
        end = format(endOfMonth(lastMonth), 'yyyy-MM-dd');
        break;
      case 'last-7-days':
        start = format(subDays(today, 7), 'yyyy-MM-dd');
        end = format(today, 'yyyy-MM-dd');
        break;
      case 'last-30-days':
        start = format(subDays(today, 30), 'yyyy-MM-dd');
        end = format(today, 'yyyy-MM-dd');
        break;
      case 'all':
      default:
        start = end = '';
        break;
    }

    return { start, end };
  }, []);

  // Update filters
  const updateFilters = useCallback((updates: Partial<TimesheetFilters>) => {
    onFiltersChange({ ...filters, ...updates });
  }, [filters, onFiltersChange]);

  // Handle date preset change
  const handleDatePresetChange = useCallback((preset: string) => {
    const range = getDateRangeFromPreset(preset);
    updateFilters({
      dateRange: {
        ...range,
        preset,
      },
    });
  }, [getDateRangeFromPreset, updateFilters]);

  // Check if filters are active
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
      filters.tags.length > 0 ||
      filters.departments.length > 0
    );
  }, [filters]);

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.search.trim()) count++;
    if (filters.dateRange.preset !== 'all') count++;
    if (filters.status.length > 0) count++;
    if (filters.projects.length > 0) count++;
    if (filters.tasks.length > 0) count++;
    if (filters.users.length > 0) count++;
    if (filters.billable !== 'all') count++;
    if (filters.hoursRange.min > 0 || filters.hoursRange.max < 24) count++;
    if (filters.tags.length > 0) count++;
    if (filters.departments.length > 0) count++;
    return count;
  }, [filters]);

  // Clear all filters
  const clearFilters = useCallback(() => {
    onFiltersChange(DEFAULT_FILTERS);
    setIsExpanded(false);
  }, [onFiltersChange]);

  // Save filter
  const handleSaveFilter = useCallback(() => {
    if (saveFilterName.trim() && onSaveFilter) {
      onSaveFilter(saveFilterName.trim(), filters);
      setSaveFilterName('');
      setShowSaveModal(false);
    }
  }, [saveFilterName, filters, onSaveFilter]);

  // Get filtered tasks based on selected projects
  const availableTasks = useMemo(() => {
    if (filters.projects.length === 0) return tasks;
    return tasks.filter(task => filters.projects.includes(task.project_id));
  }, [tasks, filters.projects]);

  return (
    <div className="space-y-4">
      {/* Search Bar and Quick Filters */}
      <div className="flex items-center space-x-4">
        {/* Search */}
        <div className="flex-1 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search projects, tasks, descriptions..."
            value={filters.search}
            onChange={(e) => updateFilters({ search: e.target.value })}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            className={`block w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${
              searchFocused ? 'border-blue-500 shadow-md' : 'border-gray-300'
            }`}
          />
          {filters.search && (
            <button
              onClick={() => updateFilters({ search: '' })}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
            >
              <XMarkIcon className="h-4 w-4 text-gray-400 hover:text-gray-600" />
            </button>
          )}
        </div>

        {/* Advanced Filters Toggle */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`flex items-center space-x-2 px-4 py-2 border rounded-lg transition-colors ${
            hasActiveFilters || isExpanded
              ? 'bg-blue-50 border-blue-200 text-blue-700'
              : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          <FunnelIcon className="h-4 w-4" />
          <span>Filters</span>
          {activeFilterCount > 0 && (
            <span className="ml-1 px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full">
              {activeFilterCount}
            </span>
          )}
          <ChevronDownIcon className={`h-4 w-4 transform transition-transform ${
            isExpanded ? 'rotate-180' : ''
          }`} />
        </button>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Expanded Filters */}
      {isExpanded && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 space-y-6">
          {/* Saved Filters */}
          {savedFilters.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Saved Filters
              </label>
              <div className="flex flex-wrap gap-2">
                {savedFilters.map((savedFilter) => (
                  <div
                    key={savedFilter.id}
                    className="flex items-center space-x-2 bg-white border border-gray-300 rounded-lg px-3 py-2"
                  >
                    <BookmarkIcon className="h-4 w-4 text-blue-500" />
                    <button
                      onClick={() => onLoadFilter?.(savedFilter.filters)}
                      className="text-sm text-gray-700 hover:text-blue-600"
                    >
                      {savedFilter.name}
                    </button>
                    <button
                      onClick={() => onDeleteFilter?.(savedFilter.id)}
                      className="text-gray-400 hover:text-red-600"
                    >
                      <XMarkIcon className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => setShowSaveModal(true)}
                  className="flex items-center space-x-1 text-blue-600 hover:text-blue-800 text-sm"
                >
                  <PlusIcon className="h-4 w-4" />
                  <span>Save Current</span>
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Date Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date Range
              </label>
              <select
                value={filters.dateRange.preset || 'all'}
                onChange={(e) => handleDatePresetChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {DATE_PRESETS.map((preset) => (
                  <option key={preset.value} value={preset.value}>
                    {preset.label}
                  </option>
                ))}
              </select>

              {filters.dateRange.preset === 'custom' && (
                <div className="mt-2 space-y-2">
                  <input
                    type="date"
                    value={filters.dateRange.start}
                    onChange={(e) => updateFilters({
                      dateRange: { ...filters.dateRange, start: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <input
                    type="date"
                    value={filters.dateRange.end}
                    onChange={(e) => updateFilters({
                      dateRange: { ...filters.dateRange, end: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              )}
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <div className="space-y-2">
                {STATUS_OPTIONS.map((status) => (
                  <label key={status.value} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={filters.status.includes(status.value)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          updateFilters({ status: [...filters.status, status.value] });
                        } else {
                          updateFilters({ 
                            status: filters.status.filter(s => s !== status.value) 
                          });
                        }
                      }}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className={`text-sm px-2 py-1 rounded-full ${status.color}`}>
                      {status.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Projects */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Projects
              </label>
              <div className="max-h-40 overflow-y-auto space-y-2 border border-gray-200 rounded-lg p-2">
                {projects.map((project) => (
                  <label key={project.id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={filters.projects.includes(project.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          updateFilters({ projects: [...filters.projects, project.id] });
                        } else {
                          updateFilters({ 
                            projects: filters.projects.filter(p => p !== project.id) 
                          });
                        }
                      }}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 truncate">{project.name}</span>
                  </label>
                ))}
                {projects.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-2">No projects available</p>
                )}
              </div>
            </div>

            {/* Tasks */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tasks
              </label>
              <div className="max-h-40 overflow-y-auto space-y-2 border border-gray-200 rounded-lg p-2">
                {availableTasks.map((task) => (
                  <label key={task.id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={filters.tasks.includes(task.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          updateFilters({ tasks: [...filters.tasks, task.id] });
                        } else {
                          updateFilters({ 
                            tasks: filters.tasks.filter(t => t !== task.id) 
                          });
                        }
                      }}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 truncate">{task.title}</span>
                  </label>
                ))}
                {availableTasks.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-2">
                    {filters.projects.length > 0 ? 'No tasks for selected projects' : 'No tasks available'}
                  </p>
                )}
              </div>
            </div>

            {/* Billable */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Billing Type
              </label>
              <select
                value={filters.billable}
                onChange={(e) => updateFilters({ billable: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All</option>
                <option value="billable">Billable Only</option>
                <option value="non-billable">Non-billable Only</option>
              </select>
            </div>

            {/* Hours Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hours Range
              </label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    min="0"
                    max="24"
                    step="0.5"
                    value={filters.hoursRange.min}
                    onChange={(e) => updateFilters({
                      hoursRange: { ...filters.hoursRange, min: Number(e.target.value) }
                    })}
                    className="w-20 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <span className="text-sm text-gray-500">to</span>
                  <input
                    type="number"
                    min="0"
                    max="24"
                    step="0.5"
                    value={filters.hoursRange.max}
                    onChange={(e) => updateFilters({
                      hoursRange: { ...filters.hoursRange, max: Number(e.target.value) }
                    })}
                    className="w-20 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <span className="text-sm text-gray-500">hours</span>
                </div>
              </div>
            </div>

            {/* Users (for managers) */}
            {showUserFilter && users.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Team Members
                </label>
                <div className="max-h-40 overflow-y-auto space-y-2 border border-gray-200 rounded-lg p-2">
                  {users.map((user) => (
                    <label key={user.id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={filters.users.includes(user.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            updateFilters({ users: [...filters.users, user.id] });
                          } else {
                            updateFilters({ 
                              users: filters.users.filter(u => u !== user.id) 
                            });
                          }
                        }}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700 truncate">
                        {user.first_name} {user.last_name}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Departments (for managers) */}
            {showUserFilter && departments.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Departments
                </label>
                <div className="space-y-2">
                  {departments.map((department) => (
                    <label key={department} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={filters.departments.includes(department)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            updateFilters({ departments: [...filters.departments, department] });
                          } else {
                            updateFilters({ 
                              departments: filters.departments.filter(d => d !== department) 
                            });
                          }
                        }}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{department}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Filter Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <div className="text-sm text-gray-600">
              {activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''} applied
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={clearFilters}
                className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Clear All
              </button>
              {onSaveFilter && (
                <button
                  onClick={() => setShowSaveModal(true)}
                  className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Save Filter
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Save Filter Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowSaveModal(false)} />
            
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Save Filter</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Filter Name
                    </label>
                    <input
                      type="text"
                      value={saveFilterName}
                      onChange={(e) => setSaveFilterName(e.target.value)}
                      placeholder="Enter a name for this filter..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div className="text-sm text-gray-600">
                    This will save your current filter settings for quick access later.
                  </div>
                </div>

                <div className="flex items-center justify-end space-x-3 mt-6">
                  <button
                    onClick={() => setShowSaveModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveFilter}
                    disabled={!saveFilterName.trim()}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Save Filter
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimesheetFilters;
export type { TimesheetFilters as TimesheetFiltersType, SavedFilter };