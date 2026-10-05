import { Timesheet, Project, Task, User } from '../types';
import { TimesheetFiltersType } from '../components/timesheet/TimesheetFilters';
import { format, parseISO, isWithinInterval } from 'date-fns';

export interface SearchContext {
  projects: Project[];
  tasks: Task[];
  users: User[];
}

export interface SearchableTimesheet extends Timesheet {
  // Additional computed fields for search
  project_name?: string;
  task_name?: string;
  employee_name?: string;
  department_name?: string;
  search_text?: string;
}

/**
 * Advanced search function for timesheets with multiple criteria
 */
export function searchTimesheets(
  timesheets: SearchableTimesheet[],
  filters: TimesheetFiltersType,
  context: SearchContext = { projects: [], tasks: [], users: [] }
): SearchableTimesheet[] {
  return timesheets.filter(timesheet => {
    // Text search
    if (filters.search.trim()) {
      const searchTerm = filters.search.toLowerCase().trim();
      const searchableFields = [
        timesheet.description || '',
        timesheet.project_name || '',
        timesheet.task_name || '',
        timesheet.employee_name || '',
        timesheet.department_name || '',
        timesheet.search_text || '',
      ].join(' ').toLowerCase();

      // Support for exact phrase search with quotes
      if (searchTerm.startsWith('"') && searchTerm.endsWith('"')) {
        const exactPhrase = searchTerm.slice(1, -1);
        if (!searchableFields.includes(exactPhrase)) {
          return false;
        }
      } else {
        // Support for multiple search terms (AND logic)
        const searchTerms = searchTerm.split(/\s+/);
        if (!searchTerms.every(term => searchableFields.includes(term))) {
          return false;
        }
      }
    }

    // Date range filter
    if (filters.dateRange.start || filters.dateRange.end) {
      const entryDate = parseISO(timesheet.date);
      
      if (filters.dateRange.start && filters.dateRange.end) {
        const startDate = parseISO(filters.dateRange.start);
        const endDate = parseISO(filters.dateRange.end + 'T23:59:59');
        
        if (!isWithinInterval(entryDate, { start: startDate, end: endDate })) {
          return false;
        }
      } else if (filters.dateRange.start) {
        const startDate = parseISO(filters.dateRange.start);
        if (entryDate < startDate) {
          return false;
        }
      } else if (filters.dateRange.end) {
        const endDate = parseISO(filters.dateRange.end + 'T23:59:59');
        if (entryDate > endDate) {
          return false;
        }
      }
    }

    // Status filter
    if (filters.status.length > 0) {
      if (!filters.status.includes(timesheet.status)) {
        return false;
      }
    }

    // Project filter
    if (filters.projects.length > 0) {
      if (!filters.projects.includes(timesheet.project_id)) {
        return false;
      }
    }

    // Task filter
    if (filters.tasks.length > 0) {
      if (!timesheet.task_id || !filters.tasks.includes(timesheet.task_id)) {
        return false;
      }
    }

    // User filter (for managers)
    if (filters.users.length > 0) {
      if (!filters.users.includes(timesheet.user_id)) {
        return false;
      }
    }

    // Billable filter
    if (filters.billable !== 'all') {
      const isBillable = filters.billable === 'billable';
      if (timesheet.is_billable !== isBillable) {
        return false;
      }
    }

    // Hours range filter
    if (filters.hoursRange.min > 0 || filters.hoursRange.max < 24) {
      if (timesheet.hours < filters.hoursRange.min || timesheet.hours > filters.hoursRange.max) {
        return false;
      }
    }

    // Department filter (for managers)
    if (filters.departments.length > 0) {
      if (!timesheet.department_name || !filters.departments.includes(timesheet.department_name)) {
        return false;
      }
    }

    // Tags filter (if implemented)
    if (filters.tags.length > 0) {
      // This would require tags to be implemented in the timesheet model
      // For now, we'll skip this filter
    }

    return true;
  });
}

/**
 * Enhanced search with fuzzy matching and relevance scoring
 */
export function fuzzySearchTimesheets(
  timesheets: SearchableTimesheet[],
  searchTerm: string,
  options: {
    threshold?: number;
    includeScore?: boolean;
    keys?: string[];
  } = {}
): SearchableTimesheet[] | Array<{ item: SearchableTimesheet; score: number }> {
  const {
    threshold = 0.6,
    includeScore = false,
    keys = ['description', 'project_name', 'task_name', 'employee_name']
  } = options;

  if (!searchTerm.trim()) {
    return includeScore ? timesheets.map(item => ({ item, score: 1 })) : timesheets;
  }

  const results = timesheets.map(timesheet => {
    let bestScore = 0;
    
    for (const key of keys) {
      const value = (timesheet as any)[key];
      if (value) {
        const score = calculateSimilarity(searchTerm.toLowerCase(), value.toLowerCase());
        bestScore = Math.max(bestScore, score);
      }
    }

    return { item: timesheet, score: bestScore };
  });

  const filtered = results
    .filter(result => result.score >= threshold)
    .sort((a, b) => b.score - a.score);

  return includeScore ? filtered : filtered.map(result => result.item);
}

/**
 * Calculate similarity between two strings using Levenshtein distance
 */
function calculateSimilarity(a: string, b: string): number {
  const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));

  for (let i = 0; i <= a.length; i++) {
    matrix[0][i] = i;
  }

  for (let j = 0; j <= b.length; j++) {
    matrix[j][0] = j;
  }

  for (let j = 1; j <= b.length; j++) {
    for (let i = 1; i <= a.length; i++) {
      const substitutionCost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1, // insertion
        matrix[j - 1][i] + 1, // deletion
        matrix[j - 1][i - 1] + substitutionCost // substitution
      );
    }
  }

  const distance = matrix[b.length][a.length];
  const maxLength = Math.max(a.length, b.length);
  return maxLength === 0 ? 1 : (maxLength - distance) / maxLength;
}

/**
 * Generate search suggestions based on input
 */
export function getSearchSuggestions(
  timesheets: SearchableTimesheet[],
  searchTerm: string,
  context: SearchContext,
  limit: number = 5
): string[] {
  if (!searchTerm.trim()) return [];

  const suggestions = new Set<string>();
  const term = searchTerm.toLowerCase();

  // Get suggestions from projects
  context.projects.forEach(project => {
    if (project.name.toLowerCase().includes(term)) {
      suggestions.add(project.name);
    }
  });

  // Get suggestions from tasks
  context.tasks.forEach(task => {
    if (task.title.toLowerCase().includes(term)) {
      suggestions.add(task.title);
    }
  });

  // Get suggestions from descriptions
  timesheets.forEach(timesheet => {
    if (timesheet.description) {
      const words = timesheet.description.toLowerCase().split(/\s+/);
      words.forEach(word => {
        if (word.includes(term) && word.length > 2) {
          suggestions.add(word);
        }
      });
    }
  });

  // Get suggestions from employee names (for managers)
  timesheets.forEach(timesheet => {
    if (timesheet.employee_name && timesheet.employee_name.toLowerCase().includes(term)) {
      suggestions.add(timesheet.employee_name);
    }
  });

  return Array.from(suggestions).slice(0, limit);
}

/**
 * Highlight search terms in text
 */
export function highlightSearchTerms(text: string, searchTerm: string): string {
  if (!searchTerm.trim()) return text;

  const terms = searchTerm.toLowerCase().split(/\s+/);
  let highlightedText = text;

  terms.forEach(term => {
    const regex = new RegExp(`(${term})`, 'gi');
    highlightedText = highlightedText.replace(regex, '<mark class="bg-yellow-200">$1</mark>');
  });

  return highlightedText;
}

/**
 * Build search index for faster searching
 */
export function buildSearchIndex(timesheets: SearchableTimesheet[]): Map<string, Set<number>> {
  const index = new Map<string, Set<number>>();

  timesheets.forEach((timesheet, idx) => {
    const searchableText = [
      timesheet.description || '',
      timesheet.project_name || '',
      timesheet.task_name || '',
      timesheet.employee_name || '',
      timesheet.department_name || '',
    ].join(' ').toLowerCase();

    const words = searchableText.split(/\s+/);
    words.forEach(word => {
      const cleanWord = word.replace(/[^\w]/g, '');
      if (cleanWord.length > 2) {
        if (!index.has(cleanWord)) {
          index.set(cleanWord, new Set());
        }
        index.get(cleanWord)!.add(idx);
      }
    });
  });

  return index;
}

/**
 * Search using pre-built index for better performance
 */
export function searchWithIndex(
  timesheets: SearchableTimesheet[],
  searchTerm: string,
  index: Map<string, Set<number>>
): SearchableTimesheet[] {
  if (!searchTerm.trim()) return timesheets;

  const terms = searchTerm.toLowerCase().split(/\s+/);
  let matchingIndices: Set<number> | null = null;

  terms.forEach(term => {
    const cleanTerm = term.replace(/[^\w]/g, '');
    if (cleanTerm.length > 2 && index.has(cleanTerm)) {
      const termIndices = index.get(cleanTerm)!;
      if (matchingIndices === null) {
        matchingIndices = new Set(termIndices);
      } else {
        // Intersection for AND logic
        matchingIndices = new Set([...matchingIndices].filter(x => termIndices.has(x)));
      }
    }
  });

  if (matchingIndices === null || matchingIndices.size === 0) {
    return [];
  }

  return Array.from(matchingIndices).map(idx => timesheets[idx]);
}

/**
 * Export search results to CSV
 */
export function exportSearchResults(
  timesheets: SearchableTimesheet[],
  filename: string = 'timesheet-search-results.csv'
): void {
  const headers = [
    'Date',
    'Employee',
    'Project',
    'Task',
    'Hours',
    'Status',
    'Billable',
    'Description',
  ];

  const csvContent = [
    headers.join(','),
    ...timesheets.map(timesheet => [
      timesheet.date,
      timesheet.employee_name || '',
      timesheet.project_name || '',
      timesheet.task_name || '',
      timesheet.hours,
      timesheet.status,
      timesheet.is_billable ? 'Yes' : 'No',
      `"${(timesheet.description || '').replace(/"/g, '""')}"`,
    ].join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Save search filters to localStorage
 */
export function saveSearchFilters(filters: TimesheetFiltersType, name: string): void {
  const savedFilters = getSavedSearchFilters();
  const newFilter = {
    id: Date.now().toString(),
    name,
    filters,
    createdAt: new Date().toISOString(),
  };
  
  savedFilters.push(newFilter);
  localStorage.setItem('timesheet-saved-filters', JSON.stringify(savedFilters));
}

/**
 * Get saved search filters from localStorage
 */
export function getSavedSearchFilters(): Array<{
  id: string;
  name: string;
  filters: TimesheetFiltersType;
  createdAt: string;
}> {
  try {
    const saved = localStorage.getItem('timesheet-saved-filters');
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

/**
 * Delete saved search filter
 */
export function deleteSavedSearchFilter(id: string): void {
  const savedFilters = getSavedSearchFilters();
  const filtered = savedFilters.filter(filter => filter.id !== id);
  localStorage.setItem('timesheet-saved-filters', JSON.stringify(filtered));
}