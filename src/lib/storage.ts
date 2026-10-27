import { TrackerData, Habit } from '@/types/habit';
import { formatYearMonth } from './dates';

export const STORAGE_KEY = 'habit_tracker_pro_v1';

export const DEFAULT_HABITS: Habit[] = [
  {
    id: 'habit-1',
    name: 'Morning Hydration',
    color: 'slate',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'habit-2',
    name: '30-Min Exercise / Walk',
    color: 'slate',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'habit-3',
    name: 'Read 15+ Pages',
    color: 'slate',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'habit-4',
    name: 'Deep Focus Work',
    color: 'slate',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'habit-5',
    name: 'Evening Screen-Free',
    color: 'slate',
    createdAt: new Date().toISOString(),
  },
];

export function getInitialData(): TrackerData {
  const now = new Date();
  const currentKey = formatYearMonth(now.getFullYear(), now.getMonth());

  return {
    habits: DEFAULT_HABITS,
    logs: {
      [currentKey]: {},
    },
    lastModified: new Date().toISOString(),
  };
}

export function loadTrackerData(): TrackerData {
  if (typeof window === 'undefined') {
    return getInitialData();
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = getInitialData();
      saveTrackerData(initial);
      return initial;
    }
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.habits)) {
      return getInitialData();
    }
    return parsed as TrackerData;
  } catch (error) {
    console.error('Failed to parse habits from localStorage:', error);
    return getInitialData();
  }
}

export function saveTrackerData(data: TrackerData): boolean {
  if (typeof window === 'undefined') return false;
  try {
    data.lastModified = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error('Failed to save habits to localStorage:', error);
    return false;
  }
}

export function validateTrackerData(parsed: unknown): { valid: boolean; error?: string } {
  if (!parsed || typeof parsed !== 'object') {
    return { valid: false, error: 'Backup file must contain a valid JSON object.' };
  }
  const obj = parsed as Record<string, unknown>;
  if (!Array.isArray(obj.habits)) {
    return { valid: false, error: 'Backup is missing the "habits" list.' };
  }
  for (const h of obj.habits) {
    if (!h || typeof h !== 'object' || typeof h.id !== 'string' || typeof h.name !== 'string') {
      return { valid: false, error: 'Backup contains corrupted habit records.' };
    }
  }
  if (obj.logs && typeof obj.logs !== 'object') {
    return { valid: false, error: 'Backup logs must be an object.' };
  }
  return { valid: true };
}

export function exportTrackerData(data: TrackerData) {
  const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
    JSON.stringify(data, null, 2)
  )}`;
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', jsonString);
  const dateStr = new Date().toISOString().split('T')[0];
  downloadAnchor.setAttribute('download', `habit-tracker-backup-${dateStr}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

/**
 * Safely merges imported data with current data, preventing duplicate habits
 * and preserving existing logs while incorporating new entries.
 */
export function mergeTrackerData(current: TrackerData, incoming: TrackerData): TrackerData {
  const existingIds = new Set(current.habits.map((h) => h.id));
  const existingNames = new Set(current.habits.map((h) => h.name.trim().toLowerCase()));

  const mergedHabits = [...current.habits];

  // Add habits that don't exist yet by ID or exact name
  for (const h of incoming.habits) {
    const normName = h.name.trim().toLowerCase();
    if (!existingIds.has(h.id) && !existingNames.has(normName)) {
      mergedHabits.push(h);
      existingIds.add(h.id);
      existingNames.add(normName);
    }
  }

  // Merge logs across all months
  const mergedLogs: Record<string, Record<string, Record<number, boolean>>> = {
    ...current.logs,
  };

  if (incoming.logs) {
    for (const [yearMonth, monthData] of Object.entries(incoming.logs)) {
      if (!mergedLogs[yearMonth]) {
        mergedLogs[yearMonth] = {};
      }
      for (const [habitId, dayData] of Object.entries(monthData)) {
        if (!mergedLogs[yearMonth][habitId]) {
          mergedLogs[yearMonth][habitId] = {};
        }
        mergedLogs[yearMonth][habitId] = {
          ...mergedLogs[yearMonth][habitId],
          ...dayData,
        };
      }
    }
  }

  return {
    habits: mergedHabits,
    logs: mergedLogs,
    lastModified: new Date().toISOString(),
  };
}
