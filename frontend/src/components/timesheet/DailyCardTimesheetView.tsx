import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, eachDayOfInterval, isToday, isSameDay } from 'date-fns';
import { 
  ChevronLeftIcon, 
  ChevronRightIcon, 
  PlusIcon, 
  ClockIcon,
  CalendarDaysIcon,
  MapPinIcon,
  BuildingOfficeIcon
} from '@heroicons/react/24/outline';
import api from '../../api/axios';
import { Timesheet, Project, Task } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import LoadingSpinner from '../common/LoadingSpinner';
import DailyCardAddModal from './DailyCardAddModal';
import DailyCardEditModal from './DailyCardEditModal';

interface DailyCardTimesheetViewProps {
  selectedDate?: Date;
}

const WORK_LOCATIONS = [
  { id: 'office', name: 'Office', icon: BuildingOfficeIcon },
  { id: 'home', name: 'Work From Home', icon: MapPinIcon },
  { id: 'travel', name: 'Business Travel', icon: MapPinIcon },
  { id: 'conference', name: 'External Conference/Meeting/Training', icon: MapPinIcon },
];

const WORK_TYPES = [
  { id: 'full_day', name: 'Full Day', hours: 8 },
  { id: 'half_day', name: 'Half Day', hours: 4 },
  { id: 'wfh', name: 'Work From Home', hours: 8 },
  { id: 'leave', name: 'Leave', hours: 0 },
  { id: 'holiday', name: 'Holiday', hours: 0 },
];

const DailyCardTimesheetView: React.FC<DailyCardTimesheetViewProps> = ({ 
  selectedDate = new Date() 
}) => {
  const { user } = useAuth();
  const [currentWeek, setCurrentWeek] = useState(selectedDate);
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDayDate, setSelectedDayDate] = useState<string | null>(null);
  const [editTimesheet, setEditTimesheet] = useState<Timesheet | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const isManagerOrAbove = ['MANAGER', 'TEAM_LEAD', 'ADMIN'].includes(user?.role || '');

  // Calculate week boundaries
  const weekStart = useMemo(() => startOfWeek(currentWeek, { weekStartsOn: 1 }), [currentWeek]);
  const weekEnd = useMemo(() => endOfWeek(currentWeek, { weekStartsOn: 1 }), [currentWeek]);
  const weekDays = useMemo(() => eachDayOfInterval({ start: weekStart, end: weekEnd }), [weekStart, weekEnd]);

  const fetchData = useCallback(async () => {
    console.log('Fetching timesheet data for week:', { weekStart: format(weekStart, 'yyyy-MM-dd'), weekEnd: format(weekEnd, 'yyyy-MM-dd') });
    setLoading(true);
    try {
      const [timesheetsRes, projectsRes] = await Promise.all([
        api.get('/timesheets', {
          params: {
            start_date: format(weekStart, 'yyyy-MM-dd'),
            end_date: format(weekEnd, 'yyyy-MM-dd'),
            limit: 100
          }
        }),
        api.get('/projects')
      ]);

      console.log('Received timesheets:', timesheetsRes.data.data);
      console.log('Received projects:', projectsRes.data.data?.length || 0, 'projects');
      console.log('Projects details:', projectsRes.data.data);
      
      setTimesheets(timesheetsRes.data.data || []);
      setProjects(projectsRes.data.data || []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to load timesheet data');
    } finally {
      setLoading(false);
    }
  }, [weekStart, weekEnd]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Group timesheets by date
  const timesheetsByDate = useMemo(() => {
    console.log('🔍 Grouping timesheets by date:', timesheets);
    const grouped: Record<string, Timesheet[]> = {};
    timesheets.forEach(ts => {
      const dateKey = ts.date;
      console.log(`📅 Processing timesheet: date=${dateKey}, hours=${ts.hours}, project=${ts.project_name}`);
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(ts);
    });
    console.log('📊 Final grouped data:', grouped);
    return grouped;
  }, [timesheets]);

  // Calculate totals
  const weeklyTotals = useMemo(() => {
    const totals = { total: 0, billable: 0, nonBillable: 0, timeOff: 0 };
    timesheets.forEach(ts => {
      totals.total += ts.hours;
      if (ts.is_billable) {
        totals.billable += ts.hours;
      } else {
        totals.nonBillable += ts.hours;
      }
    });
    return totals;
  }, [timesheets]);

  const getDayData = (date: Date) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    console.log(`🗓️ Getting day data for: ${dateKey}`);
    const dayTimesheets = timesheetsByDate[dateKey] || [];
    console.log(`📋 Found ${dayTimesheets.length} timesheets for ${dateKey}:`, dayTimesheets);
    const totalHours = dayTimesheets.reduce((sum, ts) => sum + ts.hours, 0);
    const billableHours = dayTimesheets.filter(ts => ts.is_billable).reduce((sum, ts) => sum + ts.hours, 0);
    const nonBillableHours = totalHours - billableHours;
    
    // Get start and end times from timesheets
    const startTimes = dayTimesheets.filter(ts => ts.start_time).map(ts => ts.start_time!);
    const endTimes = dayTimesheets.filter(ts => ts.end_time).map(ts => ts.end_time!);
    
    const startTime = startTimes.length > 0 ? startTimes.sort()[0] : null;
    const endTime = endTimes.length > 0 ? endTimes.sort().reverse()[0] : null;

    const dayData = {
      timesheets: dayTimesheets,
      totalHours,
      billableHours,
      nonBillableHours,
      startTime,
      endTime
    };
    
    console.log(`📊 Day data for ${dateKey}:`, dayData);
    return dayData;
  };

  const handlePreviousWeek = () => {
    setCurrentWeek(prev => subWeeks(prev, 1));
  };

  const handleNextWeek = () => {
    setCurrentWeek(prev => addWeeks(prev, 1));
  };

  const handleAddTimeEntry = (date: Date) => {
    console.log('Adding time entry for date:', date);
    if (projects.length === 0) {
      toast.error('No projects available. Please contact your administrator to add projects first.');
      return;
    }
    setSelectedDayDate(format(date, 'yyyy-MM-dd'));
    setShowAddModal(true);
  };

  const handleEditTimesheet = (timesheet: Timesheet) => {
    setEditTimesheet(timesheet);
  };

  const handleSubmitWeekly = async () => {
    setActionLoading(-1);
    try {
      // Submit all draft timesheets for the week
      const draftTimesheets = timesheets.filter(ts => ts.status === 'DRAFT' && ts.user_id === user?.id);
      await Promise.all(draftTimesheets.map(ts => api.post(`/timesheets/${ts.id}/submit`)));
      toast.success('Weekly timesheet submitted for approval');
      fetchData();
    } catch (error) {
      toast.error('Failed to submit weekly timesheet');
    } finally {
      setActionLoading(null);
    }
  };

  const onTimesheetSaved = () => {
    console.log('✅ Timesheet saved callback triggered, refreshing data...');
    console.log('Current timesheets before refresh:', timesheets.length);
    fetchData().then(() => {
      console.log('✅ Data refreshed after timesheet save');
    });
    setShowAddModal(false);
    setEditTimesheet(null);
    setSelectedDayDate(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold text-gray-900">Timesheet</h1>
          <div className="flex items-center space-x-2 bg-gray-50 rounded-lg p-1">
            <button
              onClick={handlePreviousWeek}
              className="p-2 hover:bg-white rounded-md transition-colors"
            >
              <ChevronLeftIcon className="h-5 w-5 text-gray-600" />
            </button>
            <span className="px-4 py-2 text-sm font-medium text-gray-900 min-w-[200px] text-center">
              {format(weekStart, 'dd MMM')} - {format(weekEnd, 'dd MMM yyyy')}
            </span>
            <button
              onClick={handleNextWeek}
              className="p-2 hover:bg-white rounded-md transition-colors"
            >
              <ChevronRightIcon className="h-5 w-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Weekly Summary */}
        <div className="flex items-center space-x-8">
          <div className="text-center">
            <div className="text-3xl font-black text-gray-900">{weeklyTotals.total.toFixed(1)}</div>
            <div className="text-sm font-semibold text-gray-700">Weekly Total</div>
            <div className="text-xs text-gray-400">({timesheets.length} entries)</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-green-600">{weeklyTotals.billable.toFixed(1)}</div>
            <div className="text-sm font-semibold text-gray-700">Billable Hours</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-blue-600">{weeklyTotals.nonBillable.toFixed(1)}</div>
            <div className="text-sm font-semibold text-gray-700">Non-Billable</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-orange-600">{weeklyTotals.timeOff.toFixed(1)}</div>
            <div className="text-sm font-semibold text-gray-700">Time Off</div>
          </div>
        </div>
      </div>

      {/* Daily Cards */}
      <div className="grid grid-cols-7 gap-4">
        {/* Debug info */}
        {projects.length === 0 && (
          <div className="col-span-7 bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <div className="text-sm text-yellow-800">
              ⚠️ Debug: No projects loaded. Cannot add timesheet entries without projects.
            </div>
          </div>
        )}
        
        {/* Enhanced Debug Info */}
        <div className="col-span-7 bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <div className="text-sm space-y-2">
            <div className="font-bold text-blue-800">🐛 Debug Information:</div>
            <div>Total timesheets loaded: <span className="font-semibold">{timesheets.length}</span></div>
            <div>Projects loaded: <span className="font-semibold">{projects.length}</span></div>
            <div>Week range: <span className="font-semibold">{format(weekStart, 'yyyy-MM-dd')} to {format(weekEnd, 'yyyy-MM-dd')}</span></div>
            <div>Loading state: <span className="font-semibold">{loading ? 'Loading...' : 'Loaded'}</span></div>
            {timesheets.length > 0 && (
              <div>
                <div className="font-medium">Recent timesheets:</div>
                <div className="ml-4 space-y-1">
                  {timesheets.slice(0, 3).map(ts => (
                    <div key={ts.id} className="text-xs">
                      📅 {ts.date} - {ts.project_name} - {ts.hours}h ({ts.status})
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        
        {weekDays.map((day) => {
          const dayData = getDayData(day);
          const isCurrentDay = isToday(day);
          
          return (
            <DailyCard
              key={day.toISOString()}
              date={day}
              dayData={dayData}
              isToday={isCurrentDay}
              onAddTimeEntry={() => handleAddTimeEntry(day)}
              onEditTimesheet={handleEditTimesheet}
              projects={projects}
            />
          );
        })}
      </div>

      {/* Action Buttons */}
      <div className="flex justify-center space-x-6 pt-8">
        <button
          onClick={fetchData}
          className="px-8 py-3 text-base font-bold text-gray-700 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
        >
          Refresh
        </button>
        <button
          onClick={handleSubmitWeekly}
          disabled={actionLoading === -1}
          className="px-8 py-3 text-base font-bold text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {actionLoading === -1 ? 'Submitting...' : 'Submit Weekly Timesheet'}
        </button>
      </div>

      {/* Modals */}
      {showAddModal && (
        <DailyCardAddModal
          isOpen={showAddModal}
          onClose={() => {
            setShowAddModal(false);
            setSelectedDayDate(null);
          }}
          onSave={onTimesheetSaved}
          selectedDate={selectedDayDate}
          projects={projects}
        />
      )}

      {editTimesheet && (
        <DailyCardEditModal
          isOpen={!!editTimesheet}
          onClose={() => setEditTimesheet(null)}
          onSave={onTimesheetSaved}
          timesheet={editTimesheet}
          projects={projects}
        />
      )}
    </div>
  );
};

// Daily Card Component
interface DailyCardProps {
  date: Date;
  dayData: {
    timesheets: Timesheet[];
    totalHours: number;
    billableHours: number;
    nonBillableHours: number;
    startTime: string | null;
    endTime: string | null;
  };
  isToday: boolean;
  onAddTimeEntry: () => void;
  onEditTimesheet: (timesheet: Timesheet) => void;
  projects: Project[];
}

const DailyCard: React.FC<DailyCardProps> = ({ 
  date, 
  dayData, 
  isToday, 
  onAddTimeEntry, 
  onEditTimesheet,
  projects 
}) => {
  const [showAddDropdown, setShowAddDropdown] = useState(false);
  const [workLocation, setWorkLocation] = useState('office');
  const [workType, setWorkType] = useState('full_day');

  const { timesheets, totalHours, billableHours, nonBillableHours, startTime, endTime } = dayData;
  const dayName = format(date, 'EEE').toUpperCase();
  const dayDate = format(date, 'dd MMM yyyy');
  
  // Sort timesheets by time for timeline display
  const sortedTimesheets = [...timesheets].sort((a, b) => {
    const timeA = a.start_time || '00:00';
    const timeB = b.start_time || '00:00';
    return timeA.localeCompare(timeB);
  });

  const selectedLocation = WORK_LOCATIONS.find(loc => loc.id === workLocation);
  const selectedWorkType = WORK_TYPES.find(type => type.id === workType);

  return (
    <div className={`bg-white rounded-lg border-2 p-4 shadow-sm hover:shadow-md transition-shadow relative ${
      isToday ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
    }`}>
      {/* Header */}
      <div className="text-center mb-4">
        <div className={`text-lg font-bold tracking-wide ${isToday ? 'text-blue-600' : 'text-gray-900'}`}>
          {dayName}
        </div>
        <div className="text-sm font-medium text-gray-700 mt-1">
          {dayDate}
        </div>
        {startTime && endTime && (
          <div className="text-sm font-semibold text-gray-800 mt-2">
            {startTime} - {endTime}
          </div>
        )}
      </div>

      {/* Timeline Dots */}
      <div className="space-y-2 mb-4 min-h-[120px]">
        {sortedTimesheets.length > 0 ? (
          <div className="relative">
            {/* Vertical line */}
            {sortedTimesheets.length > 1 && (
              <div className="absolute left-2 top-6 bottom-6 w-0.5 bg-gray-200" />
            )}
            
            {sortedTimesheets.map((ts, index) => (
              <div
                key={ts.id}
                className="relative flex items-start space-x-3 cursor-pointer hover:bg-gray-50 rounded p-1 -m-1"
                onClick={() => onEditTimesheet(ts)}
              >
                {/* Dot */}
                <div className={`w-5 h-5 rounded-full flex-shrink-0 mt-0.5 border-2 border-white shadow-lg ${
                  ts.is_billable ? 'bg-green-500' : 'bg-blue-500'
                }`} />
                
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-gray-900">
                    {ts.start_time || format(new Date(), 'HH:mm')}
                  </div>
                  <div className="text-sm font-medium text-gray-700 truncate">
                    {ts.hours}h - {projects.find(p => p.id === ts.project_id)?.name || 'Project'}
                  </div>
                  {ts.task_name && (
                    <div className="text-xs font-medium text-gray-600 truncate">
                      {ts.task_name}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400">
            <ClockIcon className="h-8 w-8 mx-auto mb-2" />
            <div className="text-sm font-medium">No time entries</div>
            <div className="text-xs text-gray-500 mt-1">
              Debug: {timesheets.length} total timesheets loaded
            </div>
          </div>
        )}
      </div>

      {/* Hours Summary */}
      <div className="space-y-2 mb-4 text-sm">
        <div className="flex justify-between">
          <span className="font-medium text-gray-700">Billable:</span>
          <span className="text-green-600 font-bold">{billableHours.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="font-medium text-gray-700">Non-billable:</span>
          <span className="text-blue-600 font-bold">{nonBillableHours.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="font-medium text-gray-700">Time off:</span>
          <span className="text-orange-600 font-bold">0.00</span>
        </div>
      </div>

      {/* Work Type and Location */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-gray-900">{selectedWorkType?.name}</span>
          <div className="relative">
            <button
              onClick={() => setShowAddDropdown(!showAddDropdown)}
              className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
            >
              <PlusIcon className="h-5 w-5 text-gray-600" />
            </button>
            
            {/* Add Dropdown */}
            {showAddDropdown && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-10">
                <div className="py-1">
                  <button
                    onClick={() => {
                      onAddTimeEntry();
                      setShowAddDropdown(false);
                    }}
                    className="block px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-100 w-full text-left"
                  >
                    Add Time Entry
                  </button>
                  <button
                    onClick={() => setShowAddDropdown(false)}
                    className="block px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-100 w-full text-left"
                  >
                    Add Work Location
                  </button>
                  <button
                    onClick={() => setShowAddDropdown(false)}
                    className="block px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-100 w-full text-left"
                  >
                    Add Work Type
                  </button>
                  <button
                    onClick={() => setShowAddDropdown(false)}
                    className="block px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-100 w-full text-left"
                  >
                    Add Task
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="text-sm font-medium text-gray-700 flex items-center">
          {selectedLocation && <selectedLocation.icon className="h-4 w-4 mr-1" />}
          {selectedLocation?.name}
        </div>
      </div>

      {/* Daily Total */}
      <div className="border-t border-gray-300 pt-3">
        <div className="flex justify-between items-center">
          <span className="text-sm font-bold text-gray-900">Total</span>
          <span className="text-lg font-black text-gray-900">{totalHours.toFixed(2)} hrs</span>
        </div>
      </div>

      {/* Click outside handler for dropdown */}
      {showAddDropdown && (
        <div
          className="fixed inset-0 z-5"
          onClick={() => setShowAddDropdown(false)}
        />
      )}
    </div>
  );
};

export default DailyCardTimesheetView;