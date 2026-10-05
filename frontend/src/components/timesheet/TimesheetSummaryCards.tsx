import React from 'react';
import {
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  CurrencyDollarIcon,
  CalendarDaysIcon,
  PauseCircleIcon,
} from '@heroicons/react/24/outline';
import { ViewMode } from './ModernTimesheetLayout';

interface TimesheetSummaryStats {
  totalHours: number;
  regularHours: number;
  overtimeHours: number;
  billableHours: number;
  leaveHours: number;
  missingHours: number;
  workingDays: number;
  submittedEntries: number;
  approvedEntries: number;
  pendingEntries: number;
}

interface TimesheetSummaryCardsProps {
  stats: TimesheetSummaryStats;
  loading: boolean;
  viewMode: ViewMode;
}

interface SummaryCard {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  color: 'blue' | 'green' | 'orange' | 'red' | 'purple' | 'gray';
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

const TimesheetSummaryCards: React.FC<TimesheetSummaryCardsProps> = ({
  stats,
  loading,
  viewMode,
}) => {
  const getViewModeText = () => {
    switch (viewMode) {
      case 'daily':
        return 'Today';
      case 'weekly':
        return 'This Week';
      case 'monthly':
        return 'This Month';
      default:
        return '';
    }
  };

  const formatHours = (hours: number) => {
    return `${hours.toFixed(1)}h`;
  };

  const getColorClasses = (color: string, type: 'bg' | 'text' | 'border' | 'ring') => {
    const colorMap = {
      blue: {
        bg: 'bg-blue-50',
        text: 'text-blue-600',
        border: 'border-blue-200',
        ring: 'ring-blue-100',
      },
      green: {
        bg: 'bg-green-50',
        text: 'text-green-600',
        border: 'border-green-200',
        ring: 'ring-green-100',
      },
      orange: {
        bg: 'bg-orange-50',
        text: 'text-orange-600',
        border: 'border-orange-200',
        ring: 'ring-orange-100',
      },
      red: {
        bg: 'bg-red-50',
        text: 'text-red-600',
        border: 'border-red-200',
        ring: 'ring-red-100',
      },
      purple: {
        bg: 'bg-purple-50',
        text: 'text-purple-600',
        border: 'border-purple-200',
        ring: 'ring-purple-100',
      },
      gray: {
        bg: 'bg-gray-50',
        text: 'text-gray-600',
        border: 'border-gray-200',
        ring: 'ring-gray-100',
      },
    };
    return colorMap[color as keyof typeof colorMap][type] || '';
  };

  const cards: SummaryCard[] = [
    {
      title: 'Total Working Hours',
      value: formatHours(stats.totalHours),
      subtitle: `${stats.workingDays} working days`,
      icon: ClockIcon,
      color: 'blue',
    },
    {
      title: 'Regular Hours',
      value: formatHours(stats.regularHours),
      subtitle: 'Standard work time',
      icon: CheckCircleIcon,
      color: 'green',
    },
    {
      title: 'Overtime Hours',
      value: formatHours(stats.overtimeHours),
      subtitle: stats.overtimeHours > 0 ? 'Extra hours logged' : 'No overtime',
      icon: ExclamationTriangleIcon,
      color: stats.overtimeHours > 0 ? 'orange' : 'gray',
    },
    {
      title: 'Billable Hours',
      value: formatHours(stats.billableHours),
      subtitle: `${((stats.billableHours / Math.max(stats.totalHours, 1)) * 100).toFixed(0)}% of total`,
      icon: CurrencyDollarIcon,
      color: 'purple',
    },
    {
      title: 'Leave Hours',
      value: formatHours(stats.leaveHours),
      subtitle: stats.leaveHours > 0 ? 'Time off taken' : 'No leave',
      icon: PauseCircleIcon,
      color: stats.leaveHours > 0 ? 'blue' : 'gray',
    },
    {
      title: 'Missing Hours',
      value: formatHours(stats.missingHours),
      subtitle: stats.missingHours > 0 ? 'Hours to complete' : 'All hours logged',
      icon: ExclamationTriangleIcon,
      color: stats.missingHours > 0 ? 'red' : 'green',
    },
  ];

  if (loading) {
    return (
      <div className="mb-4 sm:mb-6 md:mb-8">
        {/* Loading state with responsive grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4 animate-pulse"
            >
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <div className="h-3 sm:h-4 bg-gray-200 rounded w-16 sm:w-20"></div>
                <div className="h-6 sm:h-8 w-6 sm:w-8 bg-gray-200 rounded-lg"></div>
              </div>
              <div className="h-6 sm:h-8 bg-gray-200 rounded w-12 sm:w-16 mb-1 sm:mb-2"></div>
              <div className="h-2 sm:h-3 bg-gray-200 rounded w-16 sm:w-24"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mb-4 sm:mb-6 md:mb-8">
      {/* Period Header with responsive design */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 sm:mb-4 space-y-2 sm:space-y-0">
        <h2 className="text-base sm:text-lg font-semibold text-gray-900">
          {getViewModeText()} Summary
        </h2>
        
        {/* Entry Status Pills - responsive flex layout */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {stats.pendingEntries > 0 && (
            <div className="flex items-center bg-yellow-50 border border-yellow-200 rounded-full px-2 sm:px-3 py-1">
              <div className="w-1.5 sm:w-2 h-1.5 sm:h-2 bg-yellow-400 rounded-full mr-1 sm:mr-2"></div>
              <span className="text-xs font-medium text-yellow-700">
                {stats.pendingEntries} Draft
              </span>
            </div>
          )}
          {stats.submittedEntries > 0 && (
            <div className="flex items-center bg-blue-50 border border-blue-200 rounded-full px-2 sm:px-3 py-1">
              <div className="w-1.5 sm:w-2 h-1.5 sm:h-2 bg-blue-400 rounded-full mr-1 sm:mr-2"></div>
              <span className="text-xs font-medium text-blue-700">
                {stats.submittedEntries} Submitted
              </span>
            </div>
          )}
          {stats.approvedEntries > 0 && (
            <div className="flex items-center bg-green-50 border border-green-200 rounded-full px-2 sm:px-3 py-1">
              <div className="w-1.5 sm:w-2 h-1.5 sm:h-2 bg-green-400 rounded-full mr-1 sm:mr-2"></div>
              <span className="text-xs font-medium text-green-700">
                {stats.approvedEntries} Approved
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Summary Cards Grid - Mobile-first responsive grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {cards.map((card, index) => {
          const Icon = card.icon;
          
          return (
            <div
              key={index}
              className={`bg-white rounded-lg border ${getColorClasses(card.color, 'border')} 
                         p-3 sm:p-4 hover:shadow-sm transition-shadow duration-200
                         hover:border-opacity-60 min-h-[100px] sm:min-h-[120px]`}
            >
              {/* Header - responsive layout */}
              <div className="flex items-start justify-between mb-2 sm:mb-3">
                <h3 className="text-xs sm:text-sm font-medium text-gray-700 leading-tight pr-2 flex-1">
                  {card.title}
                </h3>
                <div className={`${getColorClasses(card.color, 'bg')} p-1.5 sm:p-2 rounded-lg flex-shrink-0`}>
                  <Icon className={`h-3 sm:h-4 w-3 sm:w-4 ${getColorClasses(card.color, 'text')}`} />
                </div>
              </div>

              {/* Value - responsive text size */}
              <div className="mb-1 sm:mb-2">
                <div className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 leading-tight">
                  {card.value}
                </div>
              </div>

              {/* Subtitle - responsive text */}
              <div className="text-xs text-gray-600 leading-tight">
                {card.subtitle}
              </div>

              {/* Trend (if available) - responsive spacing */}
              {card.trend && (
                <div className="mt-1 sm:mt-2 flex items-center">
                  <span
                    className={`text-xs font-medium ${
                      card.trend.isPositive ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {card.trend.isPositive ? '+' : ''}
                    {card.trend.value.toFixed(1)}%
                  </span>
                  <span className="text-xs text-gray-500 ml-1 hidden sm:inline">vs last period</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Additional Insights - responsive layout */}
      {(stats.missingHours > 0 || stats.overtimeHours > 0) && (
        <div className="mt-3 sm:mt-4 flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3">
          {stats.missingHours > 0 && (
            <div className="flex items-center bg-red-50 border border-red-200 rounded-lg px-3 sm:px-4 py-2">
              <ExclamationTriangleIcon className="h-3 sm:h-4 w-3 sm:w-4 text-red-600 mr-2 flex-shrink-0" />
              <span className="text-xs sm:text-sm text-red-700">
                <strong>{formatHours(stats.missingHours)}</strong> 
                <span className="hidden sm:inline"> remaining to reach expected hours</span>
                <span className="sm:hidden"> remaining</span>
              </span>
            </div>
          )}
          {stats.overtimeHours > 0 && (
            <div className="flex items-center bg-orange-50 border border-orange-200 rounded-lg px-3 sm:px-4 py-2">
              <ClockIcon className="h-3 sm:h-4 w-3 sm:w-4 text-orange-600 mr-2 flex-shrink-0" />
              <span className="text-xs sm:text-sm text-orange-700">
                <strong>{formatHours(stats.overtimeHours)}</strong> 
                <span className="hidden sm:inline"> overtime hours logged</span>
                <span className="sm:hidden"> overtime</span>
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TimesheetSummaryCards;