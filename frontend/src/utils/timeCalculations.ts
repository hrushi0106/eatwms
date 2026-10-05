import { parse, differenceInMinutes, addMinutes, format, isValid, parseISO, startOfDay, endOfDay, differenceInHours } from 'date-fns';

export interface TimeCalculation {
  totalMinutes: number;
  totalHours: number;
  regularHours: number;
  overtimeHours: number;
  breakMinutes: number;
  workingMinutes: number;
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface WorkingHoursConfig {
  standardHours: number;
  maxHoursPerDay: number;
  maxBreakMinutes: number;
  overtimeThreshold: number;
  doubleOvertimeThreshold?: number;
  roundingPrecision: number;
  allowNegativeHours: boolean;
}

export interface RealTimeStats {
  currentWorkingHours: number;
  remainingHours: number;
  projectedEndTime: string;
  efficiencyRate: number;
  breakTimeUsed: number;
  overtimeStatus: 'none' | 'approaching' | 'active';
}

export interface TimesheetAnalytics {
  dailyAverage: number;
  weeklyTotal: number;
  monthlyTotal: number;
  yearlyTotal: number;
  productivity: number;
  consistency: number;
  overtimeFrequency: number;
  peakHours: { start: string; end: string };
}

const DEFAULT_CONFIG: WorkingHoursConfig = {
  standardHours: 8,
  maxHoursPerDay: 24,
  maxBreakMinutes: 8 * 60, // 8 hours max break
  overtimeThreshold: 8,
  doubleOvertimeThreshold: 12,
  roundingPrecision: 2,
  allowNegativeHours: false,
};

/**
 * Enhanced time calculation with improved accuracy and warnings
 */
export function calculateTimeFromRange(
  startTime: string,
  endTime: string,
  breakMinutes: number = 0,
  config: WorkingHoursConfig = DEFAULT_CONFIG
): TimeCalculation {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  if (!startTime || !endTime) {
    return {
      totalMinutes: 0,
      totalHours: 0,
      regularHours: 0,
      overtimeHours: 0,
      breakMinutes,
      workingMinutes: 0,
      isValid: true,
      errors: [],
      warnings: [],
    };
  }

  try {
    // Parse times with better validation
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
      errors.push('Invalid time format. Use HH:MM (24-hour format)');
    }

    const baseDate = new Date();
    const startDate = parse(startTime, 'HH:mm', baseDate);
    let endDate = parse(endTime, 'HH:mm', baseDate);
    
    if (!isValid(startDate) || !isValid(endDate)) {
      errors.push('Invalid time values');
      return createErrorResult(breakMinutes, errors, warnings);
    }
    
    // Handle overnight shifts (end time is next day)
    if (endDate <= startDate) {
      endDate = addMinutes(endDate, 24 * 60); // Add 24 hours
      warnings.push('Overnight shift detected');
    }

    const totalMinutes = differenceInMinutes(endDate, startDate);
    const effectiveBreakMinutes = Math.min(breakMinutes, totalMinutes);
    const workingMinutes = Math.max(0, totalMinutes - effectiveBreakMinutes);
    const totalHours = workingMinutes / 60;

    // Enhanced validation checks
    if (totalMinutes <= 0) {
      errors.push('End time must be after start time');
    }
    
    if (totalMinutes > config.maxHoursPerDay * 60) {
      errors.push(`Total time cannot exceed ${config.maxHoursPerDay} hours`);
    }

    if (breakMinutes < 0 && !config.allowNegativeHours) {
      errors.push('Break duration cannot be negative');
    }

    if (breakMinutes >= totalMinutes && totalMinutes > 0) {
      errors.push('Break duration cannot exceed total work time');
    }

    if (breakMinutes > config.maxBreakMinutes) {
      errors.push(`Break duration cannot exceed ${Math.floor(config.maxBreakMinutes / 60)} hours`);
    }

    // Warnings for unusual scenarios
    if (totalHours > 12) {
      warnings.push('Long shift detected (over 12 hours)');
    }
    
    if (breakMinutes > 4 * 60) {
      warnings.push('Extended break duration (over 4 hours)');
    }

    if (totalHours < 2 && totalHours > 0) {
      warnings.push('Very short shift (under 2 hours)');
    }

    // Calculate regular, overtime, and double overtime hours
    const regularHours = Math.min(totalHours, config.overtimeThreshold);
    let overtimeHours = Math.max(0, totalHours - config.overtimeThreshold);
    
    if (config.doubleOvertimeThreshold && totalHours > config.doubleOvertimeThreshold) {
      const doubleOvertimeHours = totalHours - config.doubleOvertimeThreshold;
      overtimeHours = config.doubleOvertimeThreshold - config.overtimeThreshold;
      warnings.push(`Double overtime: ${doubleOvertimeHours.toFixed(2)} hours`);
    }

    return {
      totalMinutes,
      totalHours: roundToPrecision(totalHours, config.roundingPrecision),
      regularHours: roundToPrecision(regularHours, config.roundingPrecision),
      overtimeHours: roundToPrecision(overtimeHours, config.roundingPrecision),
      breakMinutes: effectiveBreakMinutes,
      workingMinutes,
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  } catch (error) {
    return createErrorResult(breakMinutes, ['Invalid time format. Please use HH:MM format.'], warnings);
  }
}

/**
 * Real-time time tracking calculations
 */
export function calculateRealTimeStats(
  startTime: string,
  currentTime: Date = new Date(),
  breakMinutes: number = 0,
  targetHours: number = 8,
  config: WorkingHoursConfig = DEFAULT_CONFIG
): RealTimeStats {
  try {
    const todayStart = parse(startTime, 'HH:mm', startOfDay(currentTime));
    const workedMinutes = differenceInMinutes(currentTime, todayStart) - breakMinutes;
    const currentWorkingHours = Math.max(0, workedMinutes / 60);
    
    const remainingHours = Math.max(0, targetHours - currentWorkingHours);
    const projectedEndMinutes = remainingHours * 60 + breakMinutes;
    const projectedEndTime = format(addMinutes(currentTime, projectedEndMinutes), 'HH:mm');
    
    const efficiencyRate = targetHours > 0 ? (currentWorkingHours / targetHours) * 100 : 0;
    const breakTimeUsed = breakMinutes;
    
    let overtimeStatus: 'none' | 'approaching' | 'active' = 'none';
    if (currentWorkingHours >= config.overtimeThreshold) {
      overtimeStatus = 'active';
    } else if (currentWorkingHours >= config.overtimeThreshold - 1) {
      overtimeStatus = 'approaching';
    }

    return {
      currentWorkingHours: roundToPrecision(currentWorkingHours, config.roundingPrecision),
      remainingHours: roundToPrecision(remainingHours, config.roundingPrecision),
      projectedEndTime,
      efficiencyRate: roundToPrecision(efficiencyRate, 1),
      breakTimeUsed,
      overtimeStatus,
    };
  } catch (error) {
    return {
      currentWorkingHours: 0,
      remainingHours: 0,
      projectedEndTime: '--:--',
      efficiencyRate: 0,
      breakTimeUsed: 0,
      overtimeStatus: 'none',
    };
  }
}

/**
 * Advanced timesheet analytics
 */
export function calculateTimesheetAnalytics(
  timesheets: Array<{
    date: string;
    hours: number;
    start_time?: string;
    end_time?: string;
    overtime_hours?: number;
  }>,
  config: WorkingHoursConfig = DEFAULT_CONFIG
): TimesheetAnalytics {
  if (timesheets.length === 0) {
    return {
      dailyAverage: 0,
      weeklyTotal: 0,
      monthlyTotal: 0,
      yearlyTotal: 0,
      productivity: 0,
      consistency: 0,
      overtimeFrequency: 0,
      peakHours: { start: '09:00', end: '17:00' },
    };
  }

  const totalHours = timesheets.reduce((sum, ts) => sum + ts.hours, 0);
  const dailyAverage = totalHours / timesheets.length;
  
  // Calculate time period totals
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const weekStart = startOfDay(now);
  weekStart.setDate(now.getDate() - now.getDay());
  
  const weeklyTotal = timesheets
    .filter(ts => {
      const tsDate = parseISO(ts.date);
      return tsDate >= weekStart;
    })
    .reduce((sum, ts) => sum + ts.hours, 0);
    
  const monthlyTotal = timesheets
    .filter(ts => {
      const tsDate = parseISO(ts.date);
      return tsDate.getFullYear() === currentYear && tsDate.getMonth() === currentMonth;
    })
    .reduce((sum, ts) => sum + ts.hours, 0);
    
  const yearlyTotal = timesheets
    .filter(ts => {
      const tsDate = parseISO(ts.date);
      return tsDate.getFullYear() === currentYear;
    })
    .reduce((sum, ts) => sum + ts.hours, 0);

  // Calculate productivity (actual vs expected hours)
  const expectedDailyHours = config.standardHours;
  const productivity = expectedDailyHours > 0 ? (dailyAverage / expectedDailyHours) * 100 : 0;
  
  // Calculate consistency (variance in daily hours)
  const variance = timesheets.reduce((sum, ts) => {
    return sum + Math.pow(ts.hours - dailyAverage, 2);
  }, 0) / timesheets.length;
  const standardDeviation = Math.sqrt(variance);
  const consistency = Math.max(0, 100 - (standardDeviation / dailyAverage) * 100);
  
  // Calculate overtime frequency
  const overtimeEntries = timesheets.filter(ts => 
    (ts.overtime_hours || 0) > 0 || ts.hours > config.overtimeThreshold
  );
  const overtimeFrequency = (overtimeEntries.length / timesheets.length) * 100;
  
  // Calculate peak working hours
  const hourCounts: Record<string, number> = {};
  timesheets.forEach(ts => {
    if (ts.start_time && ts.end_time) {
      try {
        const start = parse(ts.start_time, 'HH:mm', new Date());
        const end = parse(ts.end_time, 'HH:mm', new Date());
        const duration = differenceInHours(end, start);
        
        for (let i = 0; i < duration; i++) {
          const hour = addMinutes(start, i * 60);
          const hourKey = format(hour, 'HH:00');
          hourCounts[hourKey] = (hourCounts[hourKey] || 0) + 1;
        }
      } catch (error) {
        // Skip invalid time entries
      }
    }
  });
  
  const peakHour = Object.entries(hourCounts)
    .sort(([, a], [, b]) => b - a)[0]?.[0] || '09:00';
    
  const peakStart = peakHour;
  const peakEnd = format(addMinutes(parse(peakHour, 'HH:mm', new Date()), 8 * 60), 'HH:mm');

  return {
    dailyAverage: roundToPrecision(dailyAverage, config.roundingPrecision),
    weeklyTotal: roundToPrecision(weeklyTotal, config.roundingPrecision),
    monthlyTotal: roundToPrecision(monthlyTotal, config.roundingPrecision),
    yearlyTotal: roundToPrecision(yearlyTotal, config.roundingPrecision),
    productivity: roundToPrecision(productivity, 1),
    consistency: roundToPrecision(consistency, 1),
    overtimeFrequency: roundToPrecision(overtimeFrequency, 1),
    peakHours: { start: peakStart, end: peakEnd },
  };
}

/**
 * Helper function to create error result
 */
function createErrorResult(
  breakMinutes: number, 
  errors: string[], 
  warnings: string[]
): TimeCalculation {
  return {
    totalMinutes: 0,
    totalHours: 0,
    regularHours: 0,
    overtimeHours: 0,
    breakMinutes,
    workingMinutes: 0,
    isValid: false,
    errors,
    warnings,
  };
}

/**
 * Round number to specified precision
 */
function roundToPrecision(num: number, precision: number): number {
  const factor = Math.pow(10, precision);
  return Math.round(num * factor) / factor;
}

/**
 * Enhanced overtime calculation with multiple tiers
 */
export function calculateOvertimeHours(
  totalHours: number,
  config: WorkingHoursConfig = DEFAULT_CONFIG
): { 
  regularHours: number; 
  overtimeHours: number; 
  doubleOvertimeHours: number;
  breakdown: Array<{ type: string; hours: number; rate: string }>;
} {
  const regularHours = Math.min(totalHours, config.overtimeThreshold);
  let overtimeHours = 0;
  let doubleOvertimeHours = 0;
  const breakdown: Array<{ type: string; hours: number; rate: string }> = [];
  
  if (totalHours > config.overtimeThreshold) {
    if (config.doubleOvertimeThreshold && totalHours > config.doubleOvertimeThreshold) {
      overtimeHours = config.doubleOvertimeThreshold - config.overtimeThreshold;
      doubleOvertimeHours = totalHours - config.doubleOvertimeThreshold;
      
      breakdown.push(
        { type: 'Regular', hours: regularHours, rate: '1.0x' },
        { type: 'Overtime', hours: overtimeHours, rate: '1.5x' },
        { type: 'Double Overtime', hours: doubleOvertimeHours, rate: '2.0x' }
      );
    } else {
      overtimeHours = totalHours - config.overtimeThreshold;
      breakdown.push(
        { type: 'Regular', hours: regularHours, rate: '1.0x' },
        { type: 'Overtime', hours: overtimeHours, rate: '1.5x' }
      );
    }
  } else {
    breakdown.push({ type: 'Regular', hours: regularHours, rate: '1.0x' });
  }
  
  return {
    regularHours: roundToPrecision(regularHours, config.roundingPrecision),
    overtimeHours: roundToPrecision(overtimeHours, config.roundingPrecision),
    doubleOvertimeHours: roundToPrecision(doubleOvertimeHours, config.roundingPrecision),
    breakdown: breakdown.map(item => ({
      ...item,
      hours: roundToPrecision(item.hours, config.roundingPrecision)
    })),
  };
}

/**
 * Enhanced hours validation with detailed feedback
 */
export function validateHours(
  hours: number,
  config: WorkingHoursConfig = DEFAULT_CONFIG
): { isValid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  if (isNaN(hours)) {
    errors.push('Hours must be a valid number');
    return { isValid: false, errors, warnings };
  }
  
  if (hours <= 0 && !config.allowNegativeHours) {
    errors.push('Hours must be greater than 0');
  }
  
  if (hours > config.maxHoursPerDay) {
    errors.push(`Hours cannot exceed ${config.maxHoursPerDay} per day`);
  }
  
  // Warnings for unusual values
  if (hours > config.overtimeThreshold && hours <= config.maxHoursPerDay) {
    warnings.push(`Overtime hours detected (${(hours - config.overtimeThreshold).toFixed(2)} hours)`);
  }
  
  if (hours > 12) {
    warnings.push('Very long shift (over 12 hours)');
  }
  
  if (hours < 1 && hours > 0) {
    warnings.push('Very short entry (under 1 hour)');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Time input parser with intelligent parsing
 */
export function parseTimeInput(input: string): { isValid: boolean; time: string; errors: string[] } {
  const errors: string[] = [];
  
  if (!input || typeof input !== 'string') {
    return { isValid: false, time: '', errors: ['Time input is required'] };
  }
  
  // Remove whitespace
  input = input.trim();
  
  // Handle various input formats
  let parsedTime = '';
  
  // Format: HH:MM (24-hour)
  if (/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(input)) {
    parsedTime = input;
  }
  // Format: H:MM (24-hour)
  else if (/^([0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/.test(input)) {
    const parts = input.split(':');
    parsedTime = `${parts[0].padStart(2, '0')}:${parts[1]}`;
  }
  // Format: HHMM (24-hour)
  else if (/^([01]?[0-9]|2[0-3])([0-5][0-9])$/.test(input)) {
    if (input.length === 3) {
      parsedTime = `0${input[0]}:${input.slice(1)}`;
    } else {
      parsedTime = `${input.slice(0, 2)}:${input.slice(2)}`;
    }
  }
  // Format: H AM/PM or HH AM/PM
  else if (/^(1?[0-9]|2[0-1])\s*(am|pm)$/i.test(input)) {
    const match = input.match(/^(\d+)\s*(am|pm)$/i);
    if (match) {
      let hour = parseInt(match[1]);
      const period = match[2].toLowerCase();
      
      if (period === 'pm' && hour !== 12) hour += 12;
      if (period === 'am' && hour === 12) hour = 0;
      
      parsedTime = `${hour.toString().padStart(2, '0')}:00`;
    }
  }
  // Format: H:MM AM/PM or HH:MM AM/PM
  else if (/^(1?[0-9]|2[0-1]):[0-5][0-9]\s*(am|pm)$/i.test(input)) {
    const match = input.match(/^(\d+):(\d+)\s*(am|pm)$/i);
    if (match) {
      let hour = parseInt(match[1]);
      const minute = match[2];
      const period = match[3].toLowerCase();
      
      if (period === 'pm' && hour !== 12) hour += 12;
      if (period === 'am' && hour === 12) hour = 0;
      
      parsedTime = `${hour.toString().padStart(2, '0')}:${minute}`;
    }
  }
  
  if (!parsedTime) {
    errors.push('Invalid time format. Use HH:MM (24-hour) or H:MM AM/PM');
    return { isValid: false, time: '', errors };
  }
  
  // Validate the parsed time
  try {
    const testDate = parse(parsedTime, 'HH:mm', new Date());
    if (!isValid(testDate)) {
      errors.push('Invalid time value');
      return { isValid: false, time: '', errors };
    }
  } catch (error) {
    errors.push('Invalid time value');
    return { isValid: false, time: '', errors };
  }
  
  return { isValid: true, time: parsedTime, errors: [] };
}

/**
 * Smart time suggestions based on common patterns
 */
export function getTimeSuggestions(
  currentInput: string,
  context: 'start' | 'end' | 'break' = 'start'
): string[] {
  const suggestions: string[] = [];
  
  // Common start times
  const commonStartTimes = ['08:00', '08:30', '09:00', '09:30', '10:00'];
  
  // Common end times (8-hour workday)
  const commonEndTimes = ['16:00', '16:30', '17:00', '17:30', '18:00'];
  
  // Common break durations (in minutes, converted to time format for display)
  const commonBreakTimes = ['12:00', '12:30', '13:00', '13:30'];
  
  let baseTimes: string[] = [];
  
  switch (context) {
    case 'start':
      baseTimes = commonStartTimes;
      break;
    case 'end':
      baseTimes = commonEndTimes;
      break;
    case 'break':
      baseTimes = commonBreakTimes;
      break;
  }
  
  if (!currentInput.trim()) {
    return baseTimes.slice(0, 3);
  }
  
  // Filter suggestions based on input
  const filtered = baseTimes.filter(time => 
    time.toLowerCase().includes(currentInput.toLowerCase())
  );
  
  if (filtered.length > 0) {
    suggestions.push(...filtered);
  }
  
  // Add nearby times if input is partial
  if (currentInput.length >= 1 && currentInput.length <= 2) {
    const hour = parseInt(currentInput);
    if (!isNaN(hour) && hour >= 0 && hour <= 23) {
      suggestions.push(`${hour.toString().padStart(2, '0')}:00`);
      suggestions.push(`${hour.toString().padStart(2, '0')}:30`);
    }
  }
  
  return [...new Set(suggestions)].slice(0, 5);
}

/**
 * Calculate break time recommendations
 */
export function calculateBreakRecommendations(
  totalWorkHours: number,
  jurisdiction: 'US' | 'EU' | 'UK' | 'custom' = 'US'
): Array<{ duration: number; description: string; required: boolean }> {
  const recommendations: Array<{ duration: number; description: string; required: boolean }> = [];
  
  switch (jurisdiction) {
    case 'US':
      if (totalWorkHours >= 4) {
        recommendations.push({ duration: 15, description: '15-minute break', required: false });
      }
      if (totalWorkHours >= 6) {
        recommendations.push({ duration: 30, description: '30-minute lunch break', required: false });
      }
      if (totalWorkHours >= 8) {
        recommendations.push({ duration: 15, description: 'Additional 15-minute break', required: false });
      }
      break;
      
    case 'EU':
      if (totalWorkHours >= 6) {
        recommendations.push({ duration: 15, description: '15-minute mandatory break', required: true });
      }
      if (totalWorkHours >= 9) {
        recommendations.push({ duration: 30, description: '30-minute mandatory break', required: true });
      }
      break;
      
    case 'UK':
      if (totalWorkHours > 6) {
        recommendations.push({ duration: 20, description: '20-minute mandatory break', required: true });
      }
      break;
      
    default:
      if (totalWorkHours >= 4) {
        recommendations.push({ duration: 15, description: '15-minute break', required: false });
      }
      if (totalWorkHours >= 8) {
        recommendations.push({ duration: 30, description: '30-minute lunch break', required: false });
      }
      break;
  }
  
  return recommendations;
}

/**
 * Performance optimized time aggregation with caching
 */
const aggregationCache = new Map<string, any>();

export function aggregateTimeEntriesOptimized(
  entries: Array<{
    hours: number;
    overtime_hours?: number;
    is_billable?: boolean;
    date?: string;
  }>,
  cacheKey?: string,
  config: WorkingHoursConfig = DEFAULT_CONFIG
): {
  totalHours: number;
  regularHours: number;
  overtimeHours: number;
  doubleOvertimeHours: number;
  billableHours: number;
  nonBillableHours: number;
  dailyBreakdown?: Record<string, number>;
} {
  // Check cache if key provided
  if (cacheKey && aggregationCache.has(cacheKey)) {
    const cached = aggregationCache.get(cacheKey);
    if (cached.timestamp > Date.now() - 60000) { // 1-minute cache
      return cached.data;
    }
  }
  
  const dailyBreakdown: Record<string, number> = {};
  
  const totals = entries.reduce((acc, entry) => {
    const hours = entry.hours || 0;
    const overtime = entry.overtime_hours || 0;
    const regular = hours - overtime;
    
    // Calculate double overtime if configured
    let doubleOvertime = 0;
    if (config.doubleOvertimeThreshold && hours > config.doubleOvertimeThreshold) {
      doubleOvertime = hours - config.doubleOvertimeThreshold;
    }
    
    // Daily breakdown
    if (entry.date) {
      dailyBreakdown[entry.date] = (dailyBreakdown[entry.date] || 0) + hours;
    }
    
    return {
      totalHours: acc.totalHours + hours,
      regularHours: acc.regularHours + regular,
      overtimeHours: acc.overtimeHours + overtime,
      doubleOvertimeHours: acc.doubleOvertimeHours + doubleOvertime,
      billableHours: acc.billableHours + (entry.is_billable ? hours : 0),
      nonBillableHours: acc.nonBillableHours + (!entry.is_billable ? hours : 0),
    };
  }, {
    totalHours: 0,
    regularHours: 0,
    overtimeHours: 0,
    doubleOvertimeHours: 0,
    billableHours: 0,
    nonBillableHours: 0,
  });

  // Round all values to configured precision
  const roundedTotals = {
    ...Object.keys(totals).reduce((acc, key) => {
      acc[key as keyof typeof totals] = roundToPrecision(
        totals[key as keyof typeof totals], 
        config.roundingPrecision
      );
      return acc;
    }, {} as typeof totals),
    dailyBreakdown,
  };

  // Cache result if key provided
  if (cacheKey) {
    aggregationCache.set(cacheKey, {
      data: roundedTotals,
      timestamp: Date.now(),
    });
  }

  return roundedTotals;
}

/**
 * Clear aggregation cache
 */
export function clearAggregationCache(pattern?: string): void {
  if (pattern) {
    for (const key of aggregationCache.keys()) {
      if (key.includes(pattern)) {
        aggregationCache.delete(key);
      }
    }
  } else {
    aggregationCache.clear();
  }
}

/**
 * Format duration in minutes to human readable format
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  
  return `${hours}h ${remainingMinutes}m`;
}

/**
 * Convert decimal hours to hours and minutes
 */
export function hoursToHoursMinutes(decimalHours: number): { hours: number; minutes: number } {
  const hours = Math.floor(decimalHours);
  const minutes = Math.round((decimalHours - hours) * 60);
  
  return { hours, minutes };
}

/**
 * Convert hours and minutes to decimal hours
 */
export function hoursMinutesToDecimal(hours: number, minutes: number): number {
  return hours + (minutes / 60);
}

/**
 * Generate suggested time ranges based on total hours
 */
export function generateTimeRanges(
  totalHours: number,
  breakMinutes: number = 60
): Array<{ startTime: string; endTime: string; description: string }> {
  const ranges = [];
  
  // Standard working hours ranges
  const workingMinutes = totalHours * 60;
  const totalMinutesWithBreak = workingMinutes + breakMinutes;
  
  // Morning start options
  const startTimes = ['08:00', '08:30', '09:00', '09:30', '10:00'];
  
  startTimes.forEach(startTime => {
    try {
      const startDate = parse(startTime, 'HH:mm', new Date());
      const endDate = addMinutes(startDate, totalMinutesWithBreak);
      const endTime = format(endDate, 'HH:mm');
      
      // Only include reasonable end times (before 10 PM)
      if (endDate.getHours() < 22) {
        ranges.push({
          startTime,
          endTime,
          description: `${startTime} - ${endTime} (${formatDuration(breakMinutes)} break)`,
        });
      }
    } catch (error) {
      // Skip invalid ranges
    }
  });
  
  return ranges.slice(0, 5); // Limit to 5 suggestions
}

/**
 * Check if two time ranges overlap
 */
export function timeRangesOverlap(
  start1: string,
  end1: string,
  start2: string,
  end2: string,
  date1: string = '2000-01-01',
  date2: string = '2000-01-01'
): boolean {
  try {
    const startDate1 = parse(`${date1} ${start1}`, 'yyyy-MM-dd HH:mm', new Date());
    const endDate1 = parse(`${date1} ${end1}`, 'yyyy-MM-dd HH:mm', new Date());
    const startDate2 = parse(`${date2} ${start2}`, 'yyyy-MM-dd HH:mm', new Date());
    const endDate2 = parse(`${date2} ${end2}`, 'yyyy-MM-dd HH:mm', new Date());
    
    return startDate1 < endDate2 && endDate1 > startDate2;
  } catch (error) {
    return false;
  }
}

/**
 * Aggregate multiple timesheet entries for daily/weekly totals
 */
export function aggregateTimeEntries(entries: Array<{
  hours: number;
  overtime_hours?: number;
  is_billable?: boolean;
}>): {
  totalHours: number;
  regularHours: number;
  overtimeHours: number;
  billableHours: number;
  nonBillableHours: number;
} {
  const totals = entries.reduce((acc, entry) => {
    const hours = entry.hours || 0;
    const overtime = entry.overtime_hours || 0;
    const regular = hours - overtime;
    
    return {
      totalHours: acc.totalHours + hours,
      regularHours: acc.regularHours + regular,
      overtimeHours: acc.overtimeHours + overtime,
      billableHours: acc.billableHours + (entry.is_billable ? hours : 0),
      nonBillableHours: acc.nonBillableHours + (!entry.is_billable ? hours : 0),
    };
  }, {
    totalHours: 0,
    regularHours: 0,
    overtimeHours: 0,
    billableHours: 0,
    nonBillableHours: 0,
  });

  // Round all values to 2 decimal places
  Object.keys(totals).forEach(key => {
    totals[key as keyof typeof totals] = Math.round(totals[key as keyof typeof totals] * 100) / 100;
  });

  return totals;
}

// Real-time tracking and live updates
export const liveTimeTracking = {
  // Track current session time
  getCurrentSessionTime: (startTime: string): number => {
    const start = parseISO(startTime);
    const now = new Date();
    return differenceInMinutes(now, start);
  },

  // Get live time display
  getLiveTimeDisplay: (startTime: string): string => {
    const minutes = liveTimeTracking.getCurrentSessionTime(startTime);
    return formatDuration(minutes);
  },

  // Calculate expected vs actual progress
  getProgressMetrics: (
    startTime: string,
    expectedDuration: number,
    currentBreakTime: number = 0
  ): {
    expectedMinutes: number;
    actualMinutes: number;
    effectiveMinutes: number;
    progressPercentage: number;
    isAhead: boolean;
    timeVariance: number;
  } => {
    const totalMinutes = liveTimeTracking.getCurrentSessionTime(startTime);
    const effectiveMinutes = Math.max(0, totalMinutes - currentBreakTime);
    const progressPercentage = (effectiveMinutes / expectedDuration) * 100;
    const timeVariance = effectiveMinutes - expectedDuration;

    return {
      expectedMinutes: expectedDuration,
      actualMinutes: totalMinutes,
      effectiveMinutes,
      progressPercentage: Math.min(progressPercentage, 100),
      isAhead: timeVariance > 0,
      timeVariance: Math.abs(timeVariance)
    };
  },

  // Auto-pause detection for inactive periods
  detectAutoPause: (
    lastActivityTime: string,
    inactivityThreshold: number = 15 // minutes
  ): {
    shouldPause: boolean;
    inactiveMinutes: number;
    suggestedBreakTime: number;
  } => {
    const lastActivity = parseISO(lastActivityTime);
    const now = new Date();
    const inactiveMinutes = differenceInMinutes(now, lastActivity);
    const shouldPause = inactiveMinutes >= inactivityThreshold;

    return {
      shouldPause,
      inactiveMinutes,
      suggestedBreakTime: shouldPause ? Math.min(inactiveMinutes, 60) : 0
    };
  },

  // Smart break suggestions
  getBreakSuggestions: (
    workingMinutes: number,
    lastBreakTime?: string
  ): {
    suggestBreak: boolean;
    breakType: 'short' | 'long' | 'meal';
    message: string;
    minutesUntilNextBreak: number;
  } => {
    const timeSinceLastBreak = lastBreakTime 
      ? differenceInMinutes(new Date(), parseISO(lastBreakTime))
      : workingMinutes;

    // Break suggestions based on working time patterns
    if (workingMinutes >= 240 && timeSinceLastBreak >= 240) { // 4+ hours
      return {
        suggestBreak: true,
        breakType: 'meal',
        message: 'Time for a meal break! You\'ve been working for 4+ hours.',
        minutesUntilNextBreak: 0
      };
    } else if (workingMinutes >= 120 && timeSinceLastBreak >= 120) { // 2+ hours
      return {
        suggestBreak: true,
        breakType: 'long',
        message: 'Consider taking a 15-minute break to recharge.',
        minutesUntilNextBreak: 0
      };
    } else if (workingMinutes >= 60 && timeSinceLastBreak >= 60) { // 1+ hour
      return {
        suggestBreak: true,
        breakType: 'short',
        message: 'A quick 5-minute break might help maintain focus.',
        minutesUntilNextBreak: 0
      };
    }

    // Calculate time until next suggested break
    const nextBreakTime = Math.max(
      60 - timeSinceLastBreak,
      120 - timeSinceLastBreak,
      240 - timeSinceLastBreak
    );

    return {
      suggestBreak: false,
      breakType: 'short',
      message: `Next break suggestion in ${formatDuration(nextBreakTime)}.`,
      minutesUntilNextBreak: nextBreakTime
    };
  }
};

// Advanced analytics and insights
export const timesheetAnalytics = {
  // Calculate productivity metrics
  getProductivityMetrics: (timesheets: any[]): {
    averageHoursPerDay: number;
    mostProductiveDay: string;
    leastProductiveDay: string;
    consistencyScore: number;
    overtimePattern: { day: string; hours: number }[];
    productivityTrend: 'improving' | 'declining' | 'stable';
  } => {
    if (!timesheets.length) {
      return {
        averageHoursPerDay: 0,
        mostProductiveDay: 'N/A',
        leastProductiveDay: 'N/A',
        consistencyScore: 0,
        overtimePattern: [],
        productivityTrend: 'stable'
      };
    }

    // Group by day and calculate hours
    const dailyHours: Record<string, number> = {};
    const dailyOvertime: Record<string, number> = {};

    timesheets.forEach(timesheet => {
      const day = format(parseISO(timesheet.date), 'EEEE');
      const hours = timesheet.hours || 0;
      const overtime = timesheet.overtime_hours || 0;

      dailyHours[day] = (dailyHours[day] || 0) + hours;
      dailyOvertime[day] = (dailyOvertime[day] || 0) + overtime;
    });

    const averageHours = Object.values(dailyHours);
    const averageHoursPerDay = averageHours.reduce((a, b) => a + b, 0) / averageHours.length;

    // Find most and least productive days
    const mostProductiveDay = Object.entries(dailyHours)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || 'N/A';
    const leastProductiveDay = Object.entries(dailyHours)
      .sort(([, a], [, b]) => a - b)[0]?.[0] || 'N/A';

    // Calculate consistency score (lower variance = higher consistency)
    const variance = averageHours.reduce((acc, hours) => 
      acc + Math.pow(hours - averageHoursPerDay, 2), 0) / averageHours.length;
    const consistencyScore = Math.max(0, 100 - (variance * 10));

    // Overtime pattern
    const overtimePattern = Object.entries(dailyOvertime)
      .map(([day, hours]) => ({ day, hours }))
      .sort((a, b) => b.hours - a.hours);

    // Productivity trend (simplified - based on first vs last half comparison)
    const midPoint = Math.floor(timesheets.length / 2);
    const firstHalfAvg = timesheets.slice(0, midPoint)
      .reduce((acc, ts) => acc + (ts.hours || 0), 0) / midPoint;
    const secondHalfAvg = timesheets.slice(midPoint)
      .reduce((acc, ts) => acc + (ts.hours || 0), 0) / (timesheets.length - midPoint);

    let productivityTrend: 'improving' | 'declining' | 'stable' = 'stable';
    if (secondHalfAvg > firstHalfAvg * 1.05) productivityTrend = 'improving';
    else if (secondHalfAvg < firstHalfAvg * 0.95) productivityTrend = 'declining';

    return {
      averageHoursPerDay: roundToPrecision(averageHoursPerDay, 2),
      mostProductiveDay,
      leastProductiveDay,
      consistencyScore: roundToPrecision(consistencyScore, 1),
      overtimePattern,
      productivityTrend
    };
  },

  // Generate work pattern insights
  getWorkPatternInsights: (timesheets: any[]): {
    earlyBird: boolean;
    nightOwl: boolean;
    weekendWorker: boolean;
    averageStartTime: string;
    averageEndTime: string;
    preferredWorkingHours: number;
    workLifeBalance: 'excellent' | 'good' | 'poor';
  } => {
    if (!timesheets.length) {
      return {
        earlyBird: false,
        nightOwl: false,
        weekendWorker: false,
        averageStartTime: '09:00',
        averageEndTime: '17:00',
        preferredWorkingHours: 8,
        workLifeBalance: 'excellent'
      };
    }

    // Analyze start and end times
    const startTimes = timesheets
      .filter(ts => ts.start_time)
      .map(ts => parseISO(`2000-01-01T${ts.start_time}`));
    const endTimes = timesheets
      .filter(ts => ts.end_time)
      .map(ts => parseISO(`2000-01-01T${ts.end_time}`));
    const weekendEntries = timesheets.filter(ts => {
      const day = parseISO(ts.date).getDay();
      return day === 0 || day === 6; // Sunday or Saturday
    });

    if (!startTimes.length || !endTimes.length) {
      return {
        earlyBird: false,
        nightOwl: false,
        weekendWorker: false,
        averageStartTime: '09:00',
        averageEndTime: '17:00',
        preferredWorkingHours: 8,
        workLifeBalance: 'excellent'
      };
    }

    // Calculate averages
    const avgStartMinutes = startTimes.reduce((acc, time) => 
      acc + time.getHours() * 60 + time.getMinutes(), 0) / startTimes.length;
    const avgEndMinutes = endTimes.reduce((acc, time) => 
      acc + time.getHours() * 60 + time.getMinutes(), 0) / endTimes.length;

    const averageStartTime = format(
      addMinutes(startOfDay(new Date()), avgStartMinutes),
      'HH:mm'
    );
    const averageEndTime = format(
      addMinutes(startOfDay(new Date()), avgEndMinutes),
      'HH:mm'
    );
    const preferredWorkingHours = (avgEndMinutes - avgStartMinutes) / 60;

    // Determine patterns
    const earlyBird = avgStartMinutes < 8 * 60; // Before 8 AM
    const nightOwl = avgEndMinutes > 19 * 60; // After 7 PM
    const weekendWorker = weekendEntries.length > timesheets.length * 0.1; // More than 10% weekend work

    // Work-life balance assessment
    let workLifeBalance: 'excellent' | 'good' | 'poor' = 'excellent';
    if (preferredWorkingHours > 10 || weekendWorker) workLifeBalance = 'poor';
    else if (preferredWorkingHours > 8.5) workLifeBalance = 'good';

    return {
      earlyBird,
      nightOwl,
      weekendWorker,
      averageStartTime,
      averageEndTime,
      preferredWorkingHours: roundToPrecision(preferredWorkingHours, 1),
      workLifeBalance
    };
  },

  // Time utilization efficiency
  getEfficiencyMetrics: (timesheets: any[]): {
    billableRatio: number;
    overtimeRatio: number;
    averageUtilization: number;
    peakPerformanceDays: string[];
    improvementSuggestions: string[];
  } => {
    if (!timesheets.length) {
      return {
        billableRatio: 0,
        overtimeRatio: 0,
        averageUtilization: 0,
        peakPerformanceDays: [],
        improvementSuggestions: []
      };
    }

    const totals = timesheets.reduce((acc, ts) => {
      const hours = ts.hours || 0;
      const overtime = ts.overtime_hours || 0;
      const billable = ts.is_billable ? hours : 0;

      return {
        totalHours: acc.totalHours + hours,
        billableHours: acc.billableHours + billable,
        overtimeHours: acc.overtimeHours + overtime
      };
    }, { totalHours: 0, billableHours: 0, overtimeHours: 0 });

    const billableRatio = totals.totalHours > 0 ? 
      (totals.billableHours / totals.totalHours) * 100 : 0;
    const overtimeRatio = totals.totalHours > 0 ? 
      (totals.overtimeHours / totals.totalHours) * 100 : 0;
    const averageUtilization = totals.totalHours / timesheets.length;

    // Find peak performance days (top 25% by hours)
    const sortedDays = timesheets
      .sort((a, b) => (b.hours || 0) - (a.hours || 0))
      .slice(0, Math.max(1, Math.ceil(timesheets.length * 0.25)))
      .map(ts => format(parseISO(ts.date), 'EEEE'));

    const peakPerformanceDays = [...new Set(sortedDays)];

    // Generate improvement suggestions
    const improvementSuggestions: string[] = [];
    if (billableRatio < 60) {
      improvementSuggestions.push('Focus on increasing billable hour ratio');
    }
    if (overtimeRatio > 20) {
      improvementSuggestions.push('Consider workload distribution to reduce overtime');
    }
    if (averageUtilization < 6) {
      improvementSuggestions.push('Look for opportunities to increase daily productive hours');
    }

    return {
      billableRatio: roundToPrecision(billableRatio, 1),
      overtimeRatio: roundToPrecision(overtimeRatio, 1),
      averageUtilization: roundToPrecision(averageUtilization, 1),
      peakPerformanceDays,
      improvementSuggestions
    };
  }
};

// Time format utilities
export function formatMinutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

export function parseTimeToMinutes(timeString: string): number {
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
}

export function calculateTotalMinutes(startTime: string, endTime: string, breakMinutes: number = 0): number {
  const startMinutes = parseTimeToMinutes(startTime);
  let endMinutes = parseTimeToMinutes(endTime);
  
  // Handle overnight shifts
  if (endMinutes < startMinutes) {
    endMinutes += 24 * 60; // Add 24 hours in minutes
  }
  
  return Math.max(0, endMinutes - startMinutes - breakMinutes);
}