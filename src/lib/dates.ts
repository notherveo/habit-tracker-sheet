export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export const DAY_LETTERS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export function getDaysInMonth(year: number, monthIndex: number): number {
  // monthIndex 0-11. Month + 1, day 0 gives last day of target month
  return new Date(year, monthIndex + 1, 0).getDate();
}

export function getDayOfWeek(year: number, monthIndex: number, day: number): number {
  return new Date(year, monthIndex, day).getDay();
}

export function formatYearMonth(year: number, monthIndex: number): string {
  const m = String(monthIndex + 1).padStart(2, '0');
  return `${year}-${m}`;
}

export function parseYearMonth(yearMonth: string): { year: number; monthIndex: number } {
  const [yearStr, monthStr] = yearMonth.split('-');
  return {
    year: parseInt(yearStr, 10),
    monthIndex: parseInt(monthStr, 10) - 1,
  };
}

export function isCurrentDate(year: number, monthIndex: number, day: number): boolean {
  const today = new Date();
  return (
    today.getFullYear() === year &&
    today.getMonth() === monthIndex &&
    today.getDate() === day
  );
}

export function getMonthStreak(logs: Record<number, boolean>, maxDays: number): number {
  let streak = 0;
  // Calculate consecutive completed days up to current day
  const today = new Date();
  const currentDay = today.getDate();
  const checkDay = Math.min(currentDay, maxDays);

  for (let d = checkDay; d >= 1; d--) {
    if (logs[d]) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}
