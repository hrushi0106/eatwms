import React, { useState } from 'react';
import { CalendarIcon, TableCellsIcon, ChartBarIcon } from '@heroicons/react/24/outline';
import DailyCardTimesheetView from '../../components/timesheet/DailyCardTimesheetView';
import TimesheetListPage from './TimesheetListPage';

type TimesheetView = 'weekly' | 'list' | 'reports';

interface TabItem {
  id: TimesheetView;
  name: string;
  icon: React.ElementType;
  description: string;
}

const tabs: TabItem[] = [
  {
    id: 'weekly',
    name: 'Daily Cards',
    icon: CalendarIcon,
    description: 'Track time with daily card layout'
  },
  {
    id: 'list',
    name: 'List View',
    icon: TableCellsIcon,
    description: 'View timesheets in table format'
  },
  {
    id: 'reports',
    name: 'Reports',
    icon: ChartBarIcon,
    description: 'View timesheet reports and analytics'
  }
];

const TimesheetDashboard: React.FC = () => {
  const [activeView, setActiveView] = useState<TimesheetView>('weekly');

  const renderActiveView = () => {
    switch (activeView) {
      case 'weekly':
        return <DailyCardTimesheetView />;
      case 'list':
        return <TimesheetListPage />;
      case 'reports':
        return (
          <div className="text-center py-16">
            <ChartBarIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Reports Coming Soon</h3>
            <p className="text-gray-500">Timesheet reports and analytics will be available in a future update.</p>
          </div>
        );
      default:
        return <DailyCardTimesheetView />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeView === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveView(tab.id)}
                className={`group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  isActive
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon
                  className={`-ml-0.5 mr-2 h-5 w-5 transition-colors ${
                    isActive ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'
                  }`}
                />
                <span>{tab.name}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Active View Content */}
      <div className="min-h-[600px]">
        {renderActiveView()}
      </div>
    </div>
  );
};

export default TimesheetDashboard;