import React from 'react';

type BadgeVariant = 'blue' | 'green' | 'red' | 'yellow' | 'gray' | 'purple' | 'orange' | 'indigo';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
  green: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
  red: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300',
  yellow: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300',
  gray: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300',
  purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300',
  orange: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300',
  indigo: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300',
};

export default function Badge({ variant = 'gray', children, className = '' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variantClasses[variant]} ${className}`}>
      {children}
    </span>
  );
}

// Status-specific badge helpers
export function AttendanceStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: BadgeVariant }> = {
    CHECKED_IN: { label: 'Checked In', variant: 'green' },
    CHECKED_OUT: { label: 'Checked Out', variant: 'blue' },
    INCOMPLETE: { label: 'Incomplete', variant: 'yellow' },
    ABSENT: { label: 'Absent', variant: 'red' },
  };
  const config = map[status] || { label: status, variant: 'gray' };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

export function TimesheetStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: BadgeVariant }> = {
    DRAFT: { label: 'Draft', variant: 'gray' },
    SUBMITTED: { label: 'Submitted', variant: 'blue' },
    APPROVED: { label: 'Approved', variant: 'green' },
    REJECTED: { label: 'Rejected', variant: 'red' },
  };
  const config = map[status] || { label: status, variant: 'gray' };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

export function LeaveStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: BadgeVariant }> = {
    PENDING: { label: 'Pending', variant: 'yellow' },
    APPROVED: { label: 'Approved', variant: 'green' },
    REJECTED: { label: 'Rejected', variant: 'red' },
    CANCELLED: { label: 'Cancelled', variant: 'gray' },
  };
  const config = map[status] || { label: status, variant: 'gray' };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

export function TaskStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: BadgeVariant }> = {
    TODO: { label: 'To Do', variant: 'gray' },
    IN_PROGRESS: { label: 'In Progress', variant: 'blue' },
    BLOCKED: { label: 'Blocked', variant: 'red' },
    COMPLETED: { label: 'Completed', variant: 'green' },
    CANCELLED: { label: 'Cancelled', variant: 'gray' },
  };
  const config = map[status] || { label: status, variant: 'gray' };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

export function PriorityBadge({ priority }: { priority: string }) {
  const map: Record<string, { label: string; variant: BadgeVariant }> = {
    LOW: { label: 'Low', variant: 'gray' },
    MEDIUM: { label: 'Medium', variant: 'blue' },
    HIGH: { label: 'High', variant: 'orange' },
    CRITICAL: { label: 'Critical', variant: 'red' },
  };
  const config = map[priority] || { label: priority, variant: 'gray' };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

export function ExceptionSeverityBadge({ severity }: { severity: string }) {
  const map: Record<string, { label: string; variant: BadgeVariant }> = {
    LOW: { label: 'Low', variant: 'yellow' },
    MEDIUM: { label: 'Medium', variant: 'orange' },
    HIGH: { label: 'High', variant: 'red' },
  };
  const config = map[severity] || { label: severity, variant: 'gray' };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

export function WorkModeBadge({ mode }: { mode: string }) {
  const map: Record<string, { label: string; variant: BadgeVariant }> = {
    OFFICE: { label: 'Office', variant: 'indigo' },
    WFH: { label: 'WFH', variant: 'purple' },
    HYBRID: { label: 'Hybrid', variant: 'blue' },
  };
  const config = map[mode] || { label: mode, variant: 'gray' };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
