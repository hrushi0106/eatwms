import React, { useState, useEffect } from 'react';
import {
  ChartBarIcon,
  ClockIcon,
  CurrencyDollarIcon,
  CalendarDaysIcon,
  DocumentArrowDownIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline';
import LoadingSpinner from '../common/LoadingSpinner';

const TimesheetReportsView: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [reportType, setReportType] = useState<'summary' | 'detailed' | 'project' | 'employee'>('summary');
  const [dateRange, setDateRange] = useState({
    start: '',
    end: '',
  });

  // Mock data for demonstration
  const mockSummaryData = {
    totalHours: 168.5,
    billableHours: 142.0,
    nonBillableHours: 26.5,
    overtimeHours: 8.5,
    projects: 5,
    avgDailyHours: 8.2,
  };

  const mockProjectData = [
    { project: 'Website Redesign', hours: 64.5, percentage: 38 },
    { project: 'Mobile App', hours: 48.0, percentage: 28 },
    { project: 'API Development', hours: 32.5, percentage: 19 },
    { project: 'Bug Fixes', hours: 23.5, percentage: 15 },
  ];

  const reportTypes = [
    { id: 'summary', name: 'Summary Report', icon: ChartBarIcon, description: 'Overview of hours and productivity' },
    { id: 'detailed', name: 'Detailed Report', icon: ClockIcon, description: 'Day-by-day breakdown' },
    { id: 'project', name: 'Project Report', icon: CurrencyDollarIcon, description: 'Hours by project' },
    { id: 'employee', name: 'Team Report', icon: CalendarDaysIcon, description: 'Team member comparison' },
  ];

  const handleExport = (format: 'pdf' | 'excel' | 'csv') => {
    // Mock export functionality
    alert(`Exporting ${reportType} report as ${format.toUpperCase()}...`);
  };

  const renderSummaryReport = () => (
    <div className="space-y-6">
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Total Hours</h3>
              <div className="text-3xl font-bold text-blue-600 mt-2">
                {mockSummaryData.totalHours}h
              </div>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <ClockIcon className="h-8 w-8 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Billable Hours</h3>
              <div className="text-3xl font-bold text-green-600 mt-2">
                {mockSummaryData.billableHours}h
              </div>
              <div className="text-sm text-gray-500">
                {((mockSummaryData.billableHours / mockSummaryData.totalHours) * 100).toFixed(0)}% of total
              </div>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <CurrencyDollarIcon className="h-8 w-8 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Avg Daily Hours</h3>
              <div className="text-3xl font-bold text-purple-600 mt-2">
                {mockSummaryData.avgDailyHours}h
              </div>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg">
              <CalendarDaysIcon className="h-8 w-8 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Project Breakdown */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Hours by Project</h3>
        <div className="space-y-4">
          {mockProjectData.map((project, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-900">{project.project}</span>
                  <span className="text-sm text-gray-600">{project.hours}h</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${project.percentage}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderPlaceholder = (title: string, description: string) => (
    <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
      <ChartBarIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-500 mb-6">{description}</p>
      <div className="flex justify-center space-x-3">
        <button 
          onClick={() => handleExport('pdf')}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Export PDF
        </button>
        <button 
          onClick={() => handleExport('excel')}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          Export Excel
        </button>
      </div>
    </div>
  );

  const renderActiveReport = () => {
    switch (reportType) {
      case 'summary':
        return renderSummaryReport();
      case 'detailed':
        return renderPlaceholder(
          'Detailed Timesheet Report',
          'Day-by-day breakdown of time entries with project details and status information.'
        );
      case 'project':
        return renderPlaceholder(
          'Project Hours Report',
          'Comprehensive analysis of time allocation across different projects and tasks.'
        );
      case 'employee':
        return renderPlaceholder(
          'Team Performance Report',
          'Compare team member productivity and hours across the selected time period.'
        );
      default:
        return renderSummaryReport();
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Timesheet Reports & Analytics</h2>
          <p className="text-sm text-gray-600 mt-1">Generate insights from your timesheet data</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <FunnelIcon className="h-4 w-4" />
            <span>Filters</span>
          </button>
          
          <button 
            onClick={() => handleExport('pdf')}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <DocumentArrowDownIcon className="h-4 w-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Report Type Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {reportTypes.map((type) => {
          const Icon = type.icon;
          return (
            <button
              key={type.id}
              onClick={() => setReportType(type.id as any)}
              className={`p-4 text-left border rounded-lg transition-colors ${
                reportType === type.id
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 bg-white hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center space-x-3 mb-2">
                <Icon className={`h-5 w-5 ${
                  reportType === type.id ? 'text-blue-600' : 'text-gray-400'
                }`} />
                <span className="font-medium">{type.name}</span>
              </div>
              <p className="text-sm text-gray-600">{type.description}</p>
            </button>
          );
        })}
      </div>

      {/* Date Range Filter */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-900">Report Period</h3>
            <p className="text-xs text-gray-600">Select date range for the report</p>
          </div>
          
          <div className="flex items-center space-x-3">
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <span className="text-gray-500">to</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              Update
            </button>
          </div>
        </div>
      </div>

      {/* Report Content */}
      {loading ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner />
        </div>
      ) : (
        renderActiveReport()
      )}
    </div>
  );
};

export default TimesheetReportsView;