import React from 'react';

type StatCardColor = 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'indigo' | 'gray' | 'orange';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  color?: StatCardColor;
  trend?: { value: number; label: string };
}

const colorClasses: Record<StatCardColor, string> = {
  blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
  green: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400',
  red: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400',
  yellow: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400',
  purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
  indigo: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400',
  gray: 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
  orange: 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400',
};

const valueClasses: Record<StatCardColor, string> = {
  blue: 'text-blue-700 dark:text-blue-300',
  green: 'text-green-700 dark:text-green-300',
  red: 'text-red-700 dark:text-red-300',
  yellow: 'text-yellow-700 dark:text-yellow-300',
  purple: 'text-purple-700 dark:text-purple-300',
  indigo: 'text-indigo-700 dark:text-indigo-300',
  gray: 'text-gray-700 dark:text-gray-300',
  orange: 'text-orange-700 dark:text-orange-300',
};

export default function StatCard({ title, value, subtitle, icon, color = 'blue', trend }: StatCardProps) {
  const iconBg = colorClasses[color];
  const valueColor = valueClasses[color];
  return (
    <div className="card p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">{title}</p>
          <p className={`mt-1 text-3xl font-bold ${valueColor}`}>{value}</p>
          {subtitle && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>}
          {trend && (
            <p className={`mt-1 text-xs ${trend.value >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}% {trend.label}
            </p>
          )}
        </div>
        {icon && (
          <div className={`p-3 rounded-xl ${iconBg} ml-4 flex-shrink-0`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
