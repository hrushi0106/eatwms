import { format, formatDistanceToNow, parseISO, differenceInMinutes } from 'date-fns';

export function formatDate(date: string | Date, pattern = 'dd MMM yyyy'): string {
  try {
    const d = typeof date === 'string' ? parseISO(date) : date;
    return format(d, pattern);
  } catch {
    return '—';
  }
}

export function formatDateTime(date: string | Date): string {
  return formatDate(date, 'dd MMM yyyy, hh:mm a');
}

export function formatTime(date: string | Date): string {
  return formatDate(date, 'hh:mm a');
}

export function formatTimeShort(date: string | Date): string {
  return formatDate(date, 'HH:mm');
}

export function formatMinutes(minutes: number): string {
  if (minutes <= 0) return '0m';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function formatHours(hours: number): string {
  return `${hours.toFixed(1)}h`;
}

export function timeAgo(date: string | Date): string {
  try {
    const d = typeof date === 'string' ? parseISO(date) : date;
    return formatDistanceToNow(d, { addSuffix: true });
  } catch {
    return '—';
  }
}

export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function formatEmployeeName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`;
}

export function getLiveWorkDuration(checkInTime: string): string {
  const checkIn = parseISO(checkInTime);
  const now = new Date();
  const mins = differenceInMinutes(now, checkIn);
  return formatMinutes(mins);
}
