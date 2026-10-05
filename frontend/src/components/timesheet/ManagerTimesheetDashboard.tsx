import React, { useState, useEffect, useMemo } from 'react';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks } from 'date-fns';
import {
  UserGroupIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CalendarIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import { Timesheet, Project, Task, User } from '../../types';
import { api } from '../../services/api';
import toast from 'react-hot-toast';
import LoadingSpinner from '../common/LoadingSpinner';
import TimesheetManagerView from './TimesheetManagerView';

const ManagerTimesheetDashboard: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'weekly' | 'monthly'>('weekly');
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [teamMembers, setTeamMembers] = useState<User[]>([]);

  // Check if user is manager or above
  const isManagerOrAbove = ['MANAGER', 'TEAM_LEAD', 'ADMIN'].includes(user?.role || '');

  // Calculate date range based on view mode
  const dateRange = useMemo(() => {
    if (viewMode === 'weekly') {
      return {
        start: startOfWeek(currentDate, { weekStartsOn: 1 }),
        end: endOfWeek(currentDate, { weekStartsOn: 1 }),
      };
    } else {
      return {
        start: new Date(currentDate.getFullYear(), currentDate.getMonth(), 1),
        end: new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0),
      };
    }
  }, [currentDate, viewMode]);

  // Fetch team data
  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch team members
      const teamResponse = await api.get('/users/team');
      setTeamMembers(teamResponse.data.data || []);

      // Fetch team timesheets for the current period
      const params = {
        start_date: format(dateRange.start, 'yyyy-MM-dd'),
        end_date: format(dateRange.end, 'yyyy-MM-dd'),
      };
      
      const timesheetResponse = await api.get('/timesheets/team', { params });
      setTimesheets(timesheetResponse.data.data || []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to load team timesheet data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isManagerOrAbove) {
      toast.error('You do not have permission to view this page');
      return;
    }
    fetchData();
  }, [dateRange, isManagerOrAbove]);

  // Navigation handlers
  const handlePreviousPeriod = () => {
    if (viewMode === 'weekly') {
      setCurrentDate(prev => subWeeks(prev, 1));
    } else {
      setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    }
  };

  const handleNextPeriod = () => {
    if (viewMode === 'weekly') {
      setCurrentDate(prev => addWeeks(prev, 1));
    } else {
      setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    }
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Calculate period label
  const periodLabel = useMemo(() => {
    if (viewMode === 'weekly') {
      return `${format(dateRange.start, 'MMM dd')} - ${format(dateRange.end, 'MMM dd, yyyy')}`;
    } else {
      return format(currentDate, 'MMMM yyyy');
    }
  }, [dateRange, currentDate, viewMode]);

  if (!isManagerOrAbove) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <DocumentTextIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You do not have permission to view the manager dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <UserGroupIcon className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Manager Dashboard</h1>
                <p className="text-sm text-gray-600">Team Timesheet Management</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* View Mode Toggle */}
              <div className="flex items-center bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('weekly')}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'weekly'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Weekly
                </button>
                <button
                  onClick={() => setViewMode('monthly')}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'monthly'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Monthly
                </button>
              </div>

              {/* Date Navigation */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={handlePreviousPeriod}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                >
                  <ChevronLeftIcon className="h-5 w-5" />
                </button>
                
                <div className="flex items-center space-x-2 px-3 py-1 bg-gray-100 rounded-lg">
                  <CalendarIcon className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">
                    {periodLabel}
                  </span>
                </div>
                
                <button
                  onClick={handleNextPeriod}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                >
                  <ChevronRightIcon className="h-5 w-5" />
                </button>
                
                <button
                  onClick={handleToday}
                  className="px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100"
                >
                  Today
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto">
        {loading ? (
          <div className="flex justify-center py-16">
            <LoadingSpinner />
          </div>
        ) : (
          <TimesheetManagerView
            dateRange={dateRange}
            onDataRefresh={fetchData}
          />
        )}
      </div>
    </div>
  );
};

export default ManagerTimesheetDashboard;