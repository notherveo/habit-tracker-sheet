export type HabitColor =
  | 'emerald'
  | 'indigo'
  | 'rose'
  | 'amber'
  | 'sky'
  | 'violet'
  | 'teal'
  | 'slate';

export interface Habit {
  id: string;
  name: string;
  color: HabitColor;
  targetDaysPerWeek?: number;
  category?: string;
  createdAt: string;
}

export interface DayLog {
  [day: number]: boolean;
}

export interface MonthLogs {
  [habitId: string]: DayLog;
}

export interface TrackerData {
  habits: Habit[];
  logs: {
    [yearMonth: string]: MonthLogs;
  };
  lastModified?: string;
}

/* Refined jewel-tone palette — less neon, more tasteful */
export const COLOR_MAP: Record<HabitColor, { bg: string; dot: string; label: string }> = {
  emerald: { bg: 'bg-emerald-500/90',  dot: 'bg-emerald-400', label: 'Emerald' },
  indigo:  { bg: 'bg-indigo-500/90',   dot: 'bg-indigo-400',  label: 'Indigo' },
  rose:    { bg: 'bg-rose-500/90',      dot: 'bg-rose-400',    label: 'Rose' },
  amber:   { bg: 'bg-amber-500/90',     dot: 'bg-amber-400',   label: 'Amber' },
  sky:     { bg: 'bg-sky-500/90',       dot: 'bg-sky-400',     label: 'Sky' },
  violet:  { bg: 'bg-violet-500/90',    dot: 'bg-violet-400',  label: 'Violet' },
  teal:    { bg: 'bg-teal-500/90',      dot: 'bg-teal-400',    label: 'Teal' },
  slate:   { bg: 'bg-slate-400/90',     dot: 'bg-slate-400',   label: 'Slate' },
};

/* Keep old export for compat but we won't use it in the new page */
export const COLOR_VARIANTS = Object.fromEntries(
  Object.entries(COLOR_MAP).map(([k, v]) => [
    k,
    {
      name: v.label,
      bg: '',
      border: '',
      text: '',
      activeBg: v.bg,
      activeText: 'text-white',
      ring: '',
      glow: '',
    },
  ])
) as Record<HabitColor, { name: string; bg: string; border: string; text: string; activeBg: string; activeText: string; ring: string; glow: string }>;
