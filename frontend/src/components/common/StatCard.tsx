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
  blue: 'bg-blue-50 text-blue-600',
  green: 'bg-green-50 text-green-600',
  red: 'bg-red-50 text-red-600',
  yellow: 'bg-yellow-50 text-yellow-600',
  purple: 'bg-purple-50 text-purple-600',
  indigo: 'bg-indigo-50 text-indigo-600',
  gray: 'bg-gray-50 text-gray-600',
  orange: 'bg-orange-50 text-orange-600',
};

const valueClasses: Record<StatCardColor, string> = {
  blue: 'text-blue-700',
  green: 'text-green-700',
  red: 'text-red-700',
  yellow: 'text-yellow-700',
  purple: 'text-purple-700',
  indigo: 'text-indigo-700',
  gray: 'text-gray-700',
  orange: 'text-orange-700',
};

export default function StatCard({ title, value, subtitle, icon, color = 'blue', trend }: StatCardProps) {
  const iconBg = colorClasses[color];
  const valueColor = valueClasses[color];
  return (
    <div className="card p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-500 truncate">{title}</p>
          <p className={`mt-1 text-3xl font-bold ${valueColor}`}>{value}</p>
          {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
          {trend && (
            <p className={`mt-1 text-xs ${trend.value >= 0 ? 'text-green-600' : 'text-red-600'}`}>
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
