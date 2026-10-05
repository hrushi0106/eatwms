import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  CalendarDaysIcon,
  ListBulletIcon,
  ChartBarIcon,
  Squares2X2Icon,
} from '@heroicons/react/24/outline';
import ModernTimesheetLayout from '../../components/timesheet/ModernTimesheetLayout';
import WeeklyTimesheetView from '../../components/timesheet/WeeklyTimesheetView';
import TimesheetListView from '../../components/timesheet/TimesheetListView';
import TimesheetReportsView from '../../components/timesheet/TimesheetReportsView';

const TimesheetDashboard: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  console.log('TimesheetDashboard rendering...', { location });
  
  // Parse tab from URL hash or default to 'timesheet-view'
  const getActiveTabFromUrl = () => {
    const hash = location.hash.replace('#', '');
    return hash && ['timesheet-view', 'list-view', 'reports'].includes(hash) ? hash : 'timesheet-view';
  };

  const [activeTab, setActiveTab] = useState<string>(getActiveTabFromUrl());
  
  console.log('Active tab:', activeTab);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    navigate(`#${tab}`, { replace: true });
  };

  const tabs = [
    {
      id: 'timesheet-view',
      name: 'Timesheet',
      icon: CalendarDaysIcon,
      description: 'Modern timesheet with daily, weekly, and monthly views',
    },
    {
      id: 'list-view',
      name: 'List View',
      icon: ListBulletIcon,
      description: 'Traditional table view with advanced filtering',
    },
    {
      id: 'reports',
      name: 'Reports',
      icon: ChartBarIcon,
      description: 'Analytics and detailed timesheet reports',
    },
  ];

  const renderActiveComponent = () => {
    switch (activeTab) {
      case 'timesheet-view':
        return (
          <ModernTimesheetLayout defaultViewMode="weekly">
            <WeeklyTimesheetView />
          </ModernTimesheetLayout>
        );
      case 'list-view':
        return <TimesheetListView />;
      case 'reports':
        return <TimesheetReportsView />;
      default:
        return (
          <ModernTimesheetLayout defaultViewMode="weekly">
            <WeeklyTimesheetView />
          </ModernTimesheetLayout>
        );
    }
  };

  // For the modern timesheet view, we don't need the container as ModernTimesheetLayout handles it
  if (activeTab === 'timesheet-view') {
    console.log('Rendering timesheet-view...');
    return (
      <React.Suspense fallback={<div className="p-8 text-center">Loading timesheet...</div>}>
        {renderActiveComponent()}
      </React.Suspense>
    );
  }

  // For other views, keep the traditional container
  console.log('Rendering other view:', activeTab);
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Timesheet</h1>
          <p className="text-sm text-gray-600 mt-1">Track your time and manage work hours efficiently</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 bg-white rounded-t-lg">
        <nav className="-mb-px flex space-x-8 px-6">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon
                  className={`mr-2 h-5 w-5 transition-colors ${
                    activeTab === tab.id ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'
                  }`}
                />
                <div className="flex flex-col items-start">
                  <span>{tab.name}</span>
                  <span className="text-xs font-normal text-gray-400 mt-0.5">
                    {tab.description}
                  </span>
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Content */}
      <div className="bg-white rounded-b-lg shadow-sm">
        {renderActiveComponent()}
      </div>
    </div>
  );
};

export default TimesheetDashboard;