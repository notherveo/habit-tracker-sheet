'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  TrackerData,
  Habit,
} from '@/types/habit';
import {
  loadTrackerData,
  saveTrackerData,
  exportTrackerData,
  validateTrackerData,
  mergeTrackerData,
  getInitialData,
} from '@/lib/storage';
import {
  getDaysInMonth,
  getDayOfWeek,
  formatYearMonth,
  MONTH_NAMES,
} from '@/lib/dates';
import {
  ChevronLeft,
  ChevronRight,
  Printer,
  Download,
  Upload,
  RotateCcw,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Check,
  CheckCheck,
  Calendar,
  FileText,
} from 'lucide-react';

type MarkStyle = 'check' | 'cross' | 'fill';

const DAY_CHARS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export default function HabitTrackerPage() {
  const [data, setData] = useState<TrackerData | null>(null);
  const [currentYear, setCurrentYear] = useState<number>(2026);
  const [currentMonthIndex, setCurrentMonthIndex] = useState<number>(9); // 0-indexed
  const [todayInfo, setTodayInfo] = useState<{
    year: number;
    monthIndex: number;
    day: number;
  }>({
    year: 2026,
    monthIndex: 9,
    day: 1,
  });

  // Mark style preference: checkmark, cross, or filled block
  const [markStyle, setMarkStyle] = useState<MarkStyle>('check');

  // Print blank mode flag
  const [printBlank, setPrintBlank] = useState<boolean>(false);

  // Show daily tally row toggle
  const [showTally, setShowTally] = useState<boolean>(true);

  // Habit editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState<string>('');
  const editInputRef = useRef<HTMLInputElement>(null);

  // New habit inline input state
  const [newHabitName, setNewHabitName] = useState<string>('');
  const newHabitInputRef = useRef<HTMLInputElement>(null);

  // File import ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Status message
  const [statusNotice, setStatusNotice] = useState<string>('Saved locally');

  // Load saved data and real date on client mount
  useEffect(() => {
    const loaded = loadTrackerData();
    setData(loaded);

    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const d = now.getDate();

    setCurrentYear(y);
    setCurrentMonthIndex(m);
    setTodayInfo({ year: y, monthIndex: m, day: d });

    // Load mark style preference
    const savedStyle = localStorage.getItem('habit_mark_style') as MarkStyle;
    if (savedStyle && ['check', 'cross', 'fill'].includes(savedStyle)) {
      setMarkStyle(savedStyle);
    }
  }, []);

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
    }
  }, [editingId]);

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#faf8f5]">
        <div className="text-sm text-neutral-500 font-mono">Loading habit tracker...</div>
      </div>
    );
  }

  const activeMonthKey = formatYearMonth(currentYear, currentMonthIndex);
  const activeMonthLogs = data.logs[activeMonthKey] || {};
  const daysInActiveMonth = getDaysInMonth(currentYear, currentMonthIndex);
  const currentMonthName = MONTH_NAMES[currentMonthIndex];
  const isViewingCurrentMonth =
    todayInfo.year === currentYear && todayInfo.monthIndex === currentMonthIndex;

  // Persist helper
  const updateData = (updater: (prev: TrackerData) => TrackerData, notice = 'Saved') => {
    setData((prev) => {
      if (!prev) return prev;
      const next = updater(prev);
      saveTrackerData(next);
      return next;
    });
    setStatusNotice(notice);
    setTimeout(() => {
      setStatusNotice('Saved locally');
    }, 2000);
  };

  // Toggle cell checkmark
  const handleToggleDay = (habitId: string, day: number) => {
    updateData((prev) => {
      const monthLogs = { ...(prev.logs[activeMonthKey] || {}) };
      const habitLogs = { ...(monthLogs[habitId] || {}) };
      habitLogs[day] = !habitLogs[day];
      monthLogs[habitId] = habitLogs;

      return {
        ...prev,
        logs: {
          ...prev.logs,
          [activeMonthKey]: monthLogs,
        },
      };
    });
  };

  // Check all habits for today
  const handleCheckAllToday = () => {
    const targetDay = isViewingCurrentMonth ? todayInfo.day : 1;
    updateData((prev) => {
      const monthLogs = { ...(prev.logs[activeMonthKey] || {}) };
      prev.habits.forEach((h) => {
        const habitLogs = { ...(monthLogs[h.id] || {}) };
        habitLogs[targetDay] = true;
        monthLogs[h.id] = habitLogs;
      });

      return {
        ...prev,
        logs: {
          ...prev.logs,
          [activeMonthKey]: monthLogs,
        },
      };
    }, `Checked all for day ${targetDay}`);
  };

  // Add new habit
  const handleAddHabit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newHabitName.trim();
    if (!trimmed) return;

    const newHabit: Habit = {
      id: `habit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: trimmed,
      color: 'slate',
      createdAt: new Date().toISOString(),
    };

    updateData((prev) => ({
      ...prev,
      habits: [...prev.habits, newHabit],
    }), 'Habit added');
    setNewHabitName('');
    newHabitInputRef.current?.focus();
  };

  // Save inline edit
  const handleCommitEdit = () => {
    if (!editingId) return;
    const trimmed = editingText.trim();
    if (trimmed) {
      updateData((prev) => ({
        ...prev,
        habits: prev.habits.map((h) => (h.id === editingId ? { ...h, name: trimmed } : h)),
      }), 'Habit renamed');
    }
    setEditingId(null);
  };

  // Move habit up/down
  const handleMoveHabit = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= data.habits.length) return;

    updateData((prev) => {
      const updated = [...prev.habits];
      const temp = updated[index];
      updated[index] = updated[targetIndex];
      updated[targetIndex] = temp;
      return { ...prev, habits: updated };
    });
  };

  // Delete habit with confirmation
  const handleDeleteHabit = (habitId: string, name: string) => {
    if (window.confirm(`Delete "${name}" and its completion history?`)) {
      updateData((prev) => ({
        ...prev,
        habits: prev.habits.filter((h) => h.id !== habitId),
      }), 'Habit deleted');
    }
  };

  // Change mark style
  const handleChangeMarkStyle = (style: MarkStyle) => {
    setMarkStyle(style);
    localStorage.setItem('habit_mark_style', style);
  };

  // Month navigation
  const handlePrevMonth = () => {
    if (currentMonthIndex === 0) {
      setCurrentYear((y) => y - 1);
      setCurrentMonthIndex(11);
    } else {
      setCurrentMonthIndex((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonthIndex === 11) {
      setCurrentYear((y) => y + 1);
      setCurrentMonthIndex(0);
    } else {
      setCurrentMonthIndex((m) => m + 1);
    }
  };

  const handleJumpToToday = () => {
    setCurrentYear(todayInfo.year);
    setCurrentMonthIndex(todayInfo.monthIndex);
  };

  // Print normal
  const handlePrint = () => {
    setPrintBlank(false);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  // Print blank printable template
  const handlePrintBlank = () => {
    setPrintBlank(true);
    setTimeout(() => {
      window.print();
      setPrintBlank(false);
    }, 100);
  };

  // Export JSON backup
  const handleExport = () => {
    exportTrackerData(data);
    setStatusNotice('Backup downloaded');
    setTimeout(() => setStatusNotice('Saved locally'), 2500);
  };

  // Import JSON backup with duplicate handling and confirmation
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);

        const validation = validateTrackerData(parsed);
        if (!validation.valid) {
          alert(`Import failed: ${validation.error || 'Invalid file format.'}`);
          return;
        }

        const incoming = parsed as TrackerData;
        const incomingHabitCount = incoming.habits.length;

        const choice = window.confirm(
          `Backup file verified (${incomingHabitCount} habits found).\n\n` +
          `• Click "OK" to MERGE with your current habits (preserves your existing records and adds new ones).\n` +
          `• Click "Cancel" to abort.`
        );

        if (choice) {
          const merged = mergeTrackerData(data, incoming);
          setData(merged);
          saveTrackerData(merged);
          setStatusNotice('Imported & merged successfully');
          setTimeout(() => setStatusNotice('Saved locally'), 3000);
        }
      } catch {
        alert('Failed to parse backup JSON file. Please ensure it is a valid tracker export.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Reset to default
  const handleReset = () => {
    const confirmed = window.confirm(
      'Are you sure you want to reset all habits to default?\nThis will clear current progress. You can export a backup first.'
    );
    if (confirmed) {
      const initial = getInitialData();
      setData(initial);
      saveTrackerData(initial);
      setStatusNotice('Reset to defaults');
      setTimeout(() => setStatusNotice('Saved locally'), 2500);
    }
  };

  // Calculate daily totals for tally row
  const dailyTotals: Record<number, number> = {};
  for (let d = 1; d <= daysInActiveMonth; d++) {
    let count = 0;
    if (!printBlank) {
      data.habits.forEach((h) => {
        if (activeMonthLogs[h.id]?.[d]) count++;
      });
    }
    dailyTotals[d] = count;
  }

  // Minimum rows so the grid fills out the printable page like the reference image
  const totalDisplayRows = Math.max(12, data.habits.length + 1);
  const emptyRowsCount = Math.max(0, totalDisplayRows - (data.habits.length + 1));

  // Render check mark based on user preference
  const renderMark = () => {
    if (markStyle === 'cross') {
      return <span className="font-bold text-sm sm:text-base leading-none text-black">✕</span>;
    }
    if (markStyle === 'fill') {
      return <span className="w-3.5 h-3.5 sm:w-4 sm:h-4 bg-black rounded-xs block" />;
    }
    return <Check className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-black stroke-[3]" />;
  };

  return (
    <main className="min-h-screen py-6 px-3 sm:px-8 max-w-[1360px] mx-auto text-[#1a1a1a]">
      {/* Top minimal controls bar (Hidden on Print) */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-neutral-600 mb-6 pb-2 border-b border-neutral-300 no-print">
        {/* Save status badge */}
        <div className="flex items-center gap-2 font-mono text-[11px]">
          <span className="w-2 h-2 rounded-full bg-neutral-800" />
          <span>{statusNotice}</span>
          <span className="text-neutral-300">|</span>
          <button
            onClick={handleCheckAllToday}
            title="Mark all habits completed for today"
            className="text-neutral-700 hover:text-black hover:underline cursor-pointer flex items-center gap-1 font-sans"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span>Check Today</span>
          </button>
        </div>

        {/* Small, unobtrusive action buttons */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          {/* Mark Style Selector */}
          <div className="flex items-center gap-1 bg-neutral-100 px-2 py-0.5 rounded text-[11px]">
            <span className="text-neutral-500 mr-1">Pen:</span>
            <button
              onClick={() => handleChangeMarkStyle('check')}
              className={`px-1.5 py-0.5 rounded cursor-pointer font-bold ${
                markStyle === 'check' ? 'bg-white shadow-2xs text-black' : 'text-neutral-500 hover:text-black'
              }`}
              title="Checkmark style"
            >
              ✓
            </button>
            <button
              onClick={() => handleChangeMarkStyle('fill')}
              className={`px-1.5 py-0.5 rounded cursor-pointer font-bold ${
                markStyle === 'fill' ? 'bg-white shadow-2xs text-black' : 'text-neutral-500 hover:text-black'
              }`}
              title="Solid block style"
            >
              ■
            </button>
            <button
              onClick={() => handleChangeMarkStyle('cross')}
              className={`px-1.5 py-0.5 rounded cursor-pointer font-bold ${
                markStyle === 'cross' ? 'bg-white shadow-2xs text-black' : 'text-neutral-500 hover:text-black'
              }`}
              title="Cross style"
            >
              ✕
            </button>
          </div>

          <button
            onClick={handlePrint}
            title="Print or Save current tracker as PDF"
            className="flex items-center gap-1 hover:text-black cursor-pointer font-medium"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print</span>
          </button>

          <button
            onClick={handlePrintBlank}
            title="Print a fresh blank paper sheet to fill by hand"
            className="flex items-center gap-1 hover:text-black cursor-pointer font-medium"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Print Blank</span>
          </button>

          <button
            onClick={handleExport}
            title="Download JSON backup file"
            className="flex items-center gap-1 hover:text-black cursor-pointer font-medium"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Backup</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            title="Restore habits from JSON backup"
            className="flex items-center gap-1 hover:text-black cursor-pointer font-medium"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Restore</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleFileUpload}
            className="hidden"
          />

          <button
            onClick={handleReset}
            title="Reset to initial default template"
            className="flex items-center gap-1 hover:text-red-700 cursor-pointer font-medium"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Printable Paper Container */}
      <div className="paper-sheet p-5 sm:p-10 rounded-sm">
        {/* Title Header - Replicating reference image cursive calligraphy font & flourishment */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center gap-3">
            <span className="font-script text-3xl sm:text-4xl text-neutral-400 select-none">~</span>
            <h1 className="font-script text-5xl sm:text-6xl md:text-7xl font-bold tracking-wide text-black select-none">
              habit tracker
            </h1>
            <span className="font-script text-3xl sm:text-4xl text-neutral-400 select-none">~</span>
          </div>

          {/* MONTH: ____________ Line */}
          <div className="mt-3 flex items-center justify-center gap-2">
            <span className="text-sm sm:text-base font-bold tracking-widest uppercase text-black">
              MONTH:
            </span>

            <div className="relative inline-flex items-center border-b-2 border-black pb-0.5 min-w-[200px] sm:min-w-[300px] justify-between">
              <button
                onClick={handlePrevMonth}
                title="Previous month"
                className="p-1 hover:bg-neutral-100 rounded text-black transition-colors cursor-pointer no-print"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="px-4 text-sm sm:text-base font-bold tracking-wider text-black text-center font-mono">
                {currentMonthName.toUpperCase()} {currentYear}
              </span>

              <button
                onClick={handleNextMonth}
                title="Next month"
                className="p-1 hover:bg-neutral-100 rounded text-black transition-colors cursor-pointer no-print"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={handleJumpToToday}
              title="Jump to current month"
              className="p-1 text-xs text-neutral-600 hover:text-black hover:bg-neutral-100 rounded transition-colors cursor-pointer no-print ml-1"
            >
              <Calendar className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* The Habit Tracker Grid (Columns 1..31) */}
        <div className="overflow-x-auto paper-scroll">
          <table className="paper-table text-xs select-none">
            {/* Header: HABIT | 1 2 3 ... 31 */}
            <thead>
              <tr className="bg-white">
                <th className="px-3 py-2 text-left font-bold tracking-wider uppercase text-black text-xs sm:text-sm w-48 sm:w-64 min-w-[200px]">
                  HABIT
                </th>
                {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => {
                  const isDayInMonth = day <= daysInActiveMonth;
                  const dayOfWeek = isDayInMonth ? getDayOfWeek(currentYear, currentMonthIndex, day) : -1;
                  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                  const isToday = isViewingCurrentMonth && day === todayInfo.day;

                  return (
                    <th
                      key={day}
                      className={`p-0.5 sm:p-1 text-center font-bold text-black min-w-[26px] sm:min-w-[30px] font-mono ${
                        !isDayInMonth
                          ? 'bg-neutral-100 text-neutral-300 font-normal'
                          : isToday
                          ? 'bg-neutral-200'
                          : isWeekend
                          ? 'bg-neutral-50'
                          : ''
                      }`}
                      title={isToday ? 'Today' : undefined}
                    >
                      <div className="flex flex-col items-center">
                        <span className="text-[9px] font-normal text-neutral-500 uppercase leading-none mb-0.5">
                          {isDayInMonth ? DAY_CHARS[dayOfWeek] : '-'}
                        </span>
                        <span className="text-xs sm:text-sm leading-tight">{day}</span>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>

            {/* Habit Rows */}
            <tbody>
              {data.habits.map((habit, index) => {
                const habitLogs = activeMonthLogs[habit.id] || {};
                const isEditing = editingId === habit.id;

                return (
                  <tr key={habit.id} className="group hover:bg-neutral-50/70 transition-colors">
                    {/* Habit Name Cell with inline edit, reorder, and unobtrusive delete */}
                    <td className="px-2.5 py-1 text-left text-xs sm:text-sm font-medium text-black align-middle">
                      <div className="flex items-center justify-between gap-1">
                        {isEditing ? (
                          <input
                            ref={editInputRef}
                            type="text"
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            onBlur={handleCommitEdit}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleCommitEdit();
                              if (e.key === 'Escape') setEditingId(null);
                            }}
                            className="w-full text-xs sm:text-sm font-medium px-1 py-0.5 border border-black focus:outline-none bg-white text-black"
                          />
                        ) : (
                          <span
                            onClick={() => {
                              setEditingId(habit.id);
                              setEditingText(habit.name);
                            }}
                            title="Click to rename"
                            className="cursor-pointer hover:underline truncate flex-1"
                          >
                            {habit.name}
                          </span>
                        )}

                        {/* Unobtrusive row controls on hover: reorder & delete */}
                        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity no-print shrink-0">
                          {index > 0 && (
                            <button
                              onClick={() => handleMoveHabit(index, 'up')}
                              title="Move up"
                              className="p-0.5 text-neutral-400 hover:text-black cursor-pointer"
                            >
                              <ChevronUp className="w-3 h-3" />
                            </button>
                          )}
                          {index < data.habits.length - 1 && (
                            <button
                              onClick={() => handleMoveHabit(index, 'down')}
                              title="Move down"
                              className="p-0.5 text-neutral-400 hover:text-black cursor-pointer"
                            >
                              <ChevronDown className="w-3 h-3" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteHabit(habit.id, habit.name)}
                            title="Delete habit"
                            className="p-0.5 text-neutral-400 hover:text-red-700 cursor-pointer ml-0.5"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </td>

                    {/* Day Cells 1..31 */}
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => {
                      const isDayInMonth = day <= daysInActiveMonth;
                      const isChecked = !printBlank && (habitLogs[day] || false);
                      const isToday = isViewingCurrentMonth && day === todayInfo.day;
                      const dayOfWeek = isDayInMonth ? getDayOfWeek(currentYear, currentMonthIndex, day) : -1;
                      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

                      if (!isDayInMonth) {
                        return (
                          <td
                            key={day}
                            className="p-0 text-center bg-neutral-100 text-neutral-300 select-none cursor-not-allowed"
                          >
                            <span className="text-[10px]">-</span>
                          </td>
                        );
                      }

                      return (
                        <td
                          key={day}
                          onClick={() => handleToggleDay(habit.id, day)}
                          className={`p-0 text-center cursor-pointer transition-colors ${
                            isToday && !isChecked ? 'bg-neutral-100/60' : isWeekend && !isChecked ? 'bg-neutral-50/50' : ''
                          } hover:bg-neutral-200/50`}
                          title={`Day ${day}: ${isChecked ? 'Completed' : 'Click to check'}`}
                        >
                          <div className="w-6 h-7 sm:w-7 sm:h-8 mx-auto flex items-center justify-center">
                            {isChecked && renderMark()}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}

              {/* Inline "+ Add Habit" Row (Hidden on Print) */}
              <tr className="bg-white no-print">
                <td className="px-3 py-1.5 border-r border-black">
                  <form onSubmit={handleAddHabit} className="flex items-center gap-1.5">
                    <input
                      ref={newHabitInputRef}
                      type="text"
                      placeholder="+ Add habit and press Enter..."
                      value={newHabitName}
                      onChange={(e) => setNewHabitName(e.target.value)}
                      className="w-full text-xs sm:text-sm font-medium px-1 py-1 focus:outline-none placeholder-neutral-400 text-black bg-transparent"
                    />
                    {newHabitName.trim() && (
                      <button
                        type="submit"
                        className="px-2 py-0.5 text-xs bg-black text-white hover:bg-neutral-800 rounded font-medium cursor-pointer shrink-0"
                      >
                        <Plus className="w-3 h-3 inline mr-0.5" />
                        Add
                      </button>
                    )}
                  </form>
                </td>
                {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                  <td key={day} className="p-0 bg-neutral-50/20">
                    <div className="w-6 h-7 sm:w-7 sm:h-8 mx-auto" />
                  </td>
                ))}
              </tr>

              {/* Empty placeholder rows to replicate full paper planner look */}
              {Array.from({ length: emptyRowsCount }).map((_, rIndex) => (
                <tr key={`empty-${rIndex}`} className="bg-white">
                  <td className="px-3 py-1.5 border-r border-black">
                    <span className="text-xs text-transparent select-none">&nbsp;</span>
                  </td>
                  {Array.from({ length: 31 }, (_, cIndex) => cIndex + 1).map((day) => (
                    <td key={day} className="p-0">
                      <div className="w-6 h-7 sm:w-7 sm:h-8 mx-auto" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>

            {/* Daily Score Tally Row (Paper bullet-journal style) */}
            {showTally && (
              <tfoot>
                <tr className="bg-neutral-50 font-mono text-xs border-t-2 border-black">
                  <td className="px-3 py-1.5 text-left font-bold tracking-wider uppercase text-black border-r-2 border-black">
                    <div className="flex items-center justify-between">
                      <span>DAILY TOTAL</span>
                      <button
                        onClick={() => setShowTally(false)}
                        className="text-[10px] text-neutral-400 hover:text-neutral-700 cursor-pointer no-print font-normal"
                        title="Hide tally row"
                      >
                        hide
                      </button>
                    </div>
                  </td>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => {
                    const isDayInMonth = day <= daysInActiveMonth;
                    const total = dailyTotals[day] || 0;
                    const isToday = isViewingCurrentMonth && day === todayInfo.day;

                    if (!isDayInMonth) {
                      return (
                        <td key={day} className="p-1 text-center bg-neutral-100 text-neutral-300 select-none">
                          -
                        </td>
                      );
                    }

                    return (
                      <td
                        key={day}
                        className={`p-1 text-center font-bold ${
                          isToday ? 'bg-neutral-200' : ''
                        }`}
                      >
                        <span className={total > 0 ? 'text-black' : 'text-neutral-300'}>
                          {printBlank ? '' : total > 0 ? total : ''}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Paper bottom note */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-[11px] text-neutral-500 select-none">
          <span>Click any cell to mark • Click habit name to rename</span>
          {!showTally && (
            <button
              onClick={() => setShowTally(true)}
              className="text-neutral-500 hover:text-black hover:underline cursor-pointer no-print"
            >
              Show daily total
            </button>
          )}
          <span className="font-mono text-[10px] text-neutral-400">printabulls</span>
        </div>
      </div>
    </main>
  );
}
