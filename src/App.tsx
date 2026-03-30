import { useState, useMemo, useEffect } from 'react';
import { dailySchedule, activityTypeConfig, weeks, type DaySchedule, type Activity } from './data/scheduleData';
import ProgressTab from './components/ProgressTab';
import NotificationManager from './components/NotificationManager';

// ─── Colour maps ──────────────────────────────────────────────────────────────
const subjectBadgeColors: Record<string, string> = {
  Maths:              'bg-blue-100 text-blue-700 border-blue-200',
  Accounting:         'bg-emerald-100 text-emerald-700 border-emerald-200',
  Economics:          'bg-amber-100 text-amber-700 border-amber-200',
  'Business Law':     'bg-purple-100 text-purple-700 border-purple-200',
  Statistics:         'bg-rose-100 text-rose-700 border-rose-200',
  'Logical Reasoning':'bg-cyan-100 text-cyan-700 border-cyan-200',
};

const subjectDotColors: Record<string, string> = {
  Maths:              'bg-blue-400',
  Accounting:         'bg-emerald-400',
  Economics:          'bg-amber-400',
  'Business Law':     'bg-purple-400',
  Statistics:         'bg-rose-400',
  'Logical Reasoning':'bg-cyan-400',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
/** Unique key per activity item */
function activityKey(dayNum: number, idx: number) {
  return `studied-${dayNum}-${idx}`;
}

/** Only study / revision activities get a toggle */
function isStudyable(a: Activity) {
  return a.type === 'study' || a.type === 'revision';
}

// ─── useStudied hook (localStorage persistence) ───────────────────────────────
function useStudied() {
  const [studied, setStudied] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem('april-2026-studied');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    localStorage.setItem('april-2026-studied', JSON.stringify(studied));
  }, [studied]);

  const toggle = (key: string) =>
    setStudied(prev => ({ ...prev, [key]: !prev[key] }));

  return { studied, toggle };
}

// ─── Activity row ─────────────────────────────────────────────────────────────
function ActivityRow({
  activity,
  dayNum,
  idx,
  studied,
  onToggle,
}: {
  activity: Activity;
  dayNum: number;
  idx: number;
  studied: Record<string, boolean>;
  onToggle: (key: string) => void;
}) {
  const cfg = activityTypeConfig[activity.type];
  const key = activityKey(dayNum, idx);
  const canToggle = isStudyable(activity);
  const done = canToggle && !!studied[key];

  return (
    <div
      className={`flex gap-3 rounded-xl p-3 border transition-all duration-300 ${
        done
          ? 'bg-green-50 border-green-300 opacity-80'
          : `${cfg.bg} ${cfg.border}`
      }`}
    >
      {/* Emoji */}
      <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 text-xl">
        {done ? '✅' : activity.emoji}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-0.5">
          <span className={`text-xs font-mono font-semibold opacity-70 ${done ? 'text-green-700' : cfg.text}`}>
            {activity.time}
          </span>
          {activity.subject && (
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                done
                  ? 'bg-green-100 text-green-700 border-green-200'
                  : subjectBadgeColors[activity.subject] ?? 'bg-gray-100 text-gray-600 border-gray-200'
              }`}
            >
              {activity.subject}
            </span>
          )}
          {activity.duration && (
            <span className="text-xs text-gray-400 font-medium">{activity.duration}</span>
          )}
        </div>
        <p className={`text-sm font-medium ${done ? 'text-green-800 line-through decoration-green-400' : cfg.text}`}>
          {activity.detail}
        </p>
      </div>

      {/* Toggle button */}
      {canToggle && (
        <button
          onClick={() => onToggle(key)}
          title={done ? 'Mark as not studied' : 'Mark as studied'}
          className={`flex-shrink-0 self-center w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-200 cursor-pointer hover:scale-110 active:scale-95 ${
            done
              ? 'bg-green-500 border-green-500 text-white shadow-md shadow-green-200'
              : 'bg-white border-gray-300 text-gray-300 hover:border-green-400 hover:text-green-400'
          }`}
        >
          {done ? (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>
      )}
    </div>
  );
}

// ─── Progress bar for a single day ───────────────────────────────────────────
function DayProgress({
  schedule,
  studied,
}: {
  schedule: DaySchedule;
  studied: Record<string, boolean>;
}) {
  const studyable = schedule.activities.filter(isStudyable);
  const total = studyable.length;
  const done = studyable.filter((_, i) => {
    const realIdx = schedule.activities.indexOf(studyable[i]);
    return !!studied[activityKey(schedule.dayNum, realIdx)];
  }).length;

  if (total === 0) return null;
  const pct = Math.round((done / total) * 100);

  return (
    <div className="mt-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-white/80">Progress</span>
        <span className="text-xs font-bold text-white">
          {done}/{total} done ({pct}%)
        </span>
      </div>
      <div className="h-2 rounded-full bg-white/20 overflow-hidden">
        <div
          className="h-full rounded-full bg-white transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ─── Overall progress (all days) ──────────────────────────────────────────────
function OverallProgress({ studied }: { studied: Record<string, boolean> }) {
  const { total, done } = useMemo(() => {
    let t = 0, d = 0;
    for (const day of dailySchedule) {
      for (let i = 0; i < day.activities.length; i++) {
        if (isStudyable(day.activities[i])) {
          t++;
          if (studied[activityKey(day.dayNum, i)]) d++;
        }
      }
    }
    return { total: t, done: d };
  }, [studied]);

  const pct = total === 0 ? 0 : Math.round((done / total) * 100);

  return (
    <div className="flex items-center gap-3 text-sm">
      <div className="flex-1 h-2.5 rounded-full bg-white/20 overflow-hidden min-w-[80px]">
        <div
          className="h-full rounded-full bg-white transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-white/90 font-semibold whitespace-nowrap text-xs">
        {done}/{total} topics ({pct}%)
      </span>
    </div>
  );
}

// ─── Stats bar ────────────────────────────────────────────────────────────────
function StatsBar({ schedule }: { schedule: DaySchedule }) {
  const counts = useMemo(() => {
    const c = { study: 0, revision: 0, anime: 0, coding: 0 };
    for (const a of schedule.activities) {
      if (a.type === 'study') c.study++;
      else if (a.type === 'revision') c.revision++;
      else if (a.type === 'anime') c.anime++;
      else if (a.type === 'coding') c.coding++;
    }
    return c;
  }, [schedule]);

  const stats = [
    { label: 'Study', value: counts.study, icon: '📚' },
    { label: 'Revision', value: counts.revision, icon: '🔁' },
    { label: 'Coding', value: counts.coding, icon: '🖥️' },
    { label: 'Anime', value: counts.anime, icon: '🎌' },
  ].filter(s => s.value > 0);

  return (
    <div className="flex flex-wrap gap-2">
      {stats.map(s => (
        <div key={s.label} className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 border border-white/30">
          <span className="text-sm">{s.icon}</span>
          <span className="text-xs font-semibold text-white/90">{s.value} {s.label}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Subject legend ───────────────────────────────────────────────────────────
function SubjectLegend() {
  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {Object.keys(subjectBadgeColors).map(subj => (
        <div
          key={subj}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold ${subjectBadgeColors[subj]}`}
        >
          <div className={`w-2 h-2 rounded-full ${subjectDotColors[subj]}`} />
          {subj}
        </div>
      ))}
    </div>
  );
}

// ─── Calendar day completion ring ─────────────────────────────────────────────
function CalendarDayCompletion({
  schedule,
  studied,
}: {
  schedule: DaySchedule;
  studied: Record<string, boolean>;
}) {
  const studyable = schedule.activities.filter(isStudyable);
  const total = studyable.length;
  if (total === 0) return null;

  const done = studyable.filter((s) => {
    const realIdx = schedule.activities.indexOf(s);
    return !!studied[activityKey(schedule.dayNum, realIdx)];
  }).length;

  const pct = done / total;
  const r = 7;
  const circ = 2 * Math.PI * r;
  const dash = pct * circ;

  if (done === 0) return null;

  return (
    <svg
      className="absolute top-1 right-1"
      width="18"
      height="18"
      viewBox="0 0 18 18"
    >
      <circle cx="9" cy="9" r={r} fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />
      <circle
        cx="9"
        cy="9"
        r={r}
        fill="none"
        stroke={pct === 1 ? '#22c55e' : '#a5f3fc'}
        strokeWidth="2"
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeLinecap="round"
        transform="rotate(-90 9 9)"
      />
    </svg>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
type AppTab = 'schedule' | 'progress' | 'notifications';

export default function App() {
  const today = new Date();
  const todayNum = today.getMonth() === 3 ? today.getDate() : 1;
  const initialDay = dailySchedule.find(d => d.dayNum === todayNum) ?? dailySchedule[0];
  const [selectedDay, setSelectedDay] = useState<DaySchedule>(initialDay);
  const [activeWeek, setActiveWeek] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<AppTab>('schedule');

  const { studied, toggle } = useStudied();

  const filteredDays =
    activeWeek !== null
      ? dailySchedule.filter((_, i) => {
          const ranges = [[0, 4], [5, 11], [12, 18], [19, 24], [25, 29]];
          const [start, end] = ranges[activeWeek];
          return i >= start && i <= end;
        })
      : dailySchedule;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/30">
      {/* ── Header ── */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md shadow-indigo-200 flex-shrink-0">
              <span className="text-lg">📅</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 leading-tight">April 2026 Study Plan</h1>
              <p className="text-xs text-gray-500">30-day structured schedule</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-indigo-400 inline-block" /> Study</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-violet-400 inline-block" /> Revision</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-pink-400 inline-block" /> Anime</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-sky-400 inline-block" /> Coding</span>
          </div>
        </div>

        {/* ── Tab Bar ── */}
        <div className="max-w-6xl mx-auto px-4 pb-0 flex gap-1 border-t border-gray-100">
          {([
            { id: 'schedule',      label: 'Schedule',   emoji: '📆' },
            { id: 'progress',      label: 'Progress',   emoji: '📊' },
            { id: 'notifications', label: 'Reminders',  emoji: '🔔' },
          ] as { id: AppTab; label: string; emoji: string }[]).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all cursor-pointer -mb-px ${
                activeTab === tab.id
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span>{tab.emoji}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">

        {/* ── Notifications Tab ── */}
        {activeTab === 'notifications' && (
          <NotificationManager />
        )}

        {/* ── Progress Tab ── */}
        {activeTab === 'progress' && (
          <ProgressTab studied={studied} />
        )}

        {/* ── Schedule Tab ── */}
        {activeTab === 'schedule' && (<>

        {/* ── Hero Banner ── */}
        <div className="rounded-3xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 p-6 text-white shadow-xl shadow-indigo-200">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-bold mb-1">You've got this! 💪</h2>
              <p className="text-indigo-100 text-sm max-w-md mb-3">
                30 days of focused study across Maths, Accounting, Economics, Business Law, Statistics & Logical Reasoning.
              </p>
              <OverallProgress studied={studied} />
            </div>
            <div className="flex gap-4 text-center flex-shrink-0">
              <div className="bg-white/20 rounded-2xl px-4 py-3">
                <div className="text-2xl font-bold">30</div>
                <div className="text-xs text-indigo-100">Days</div>
              </div>
              <div className="bg-white/20 rounded-2xl px-4 py-3">
                <div className="text-2xl font-bold">6</div>
                <div className="text-xs text-indigo-100">Subjects</div>
              </div>
              <div className="bg-white/20 rounded-2xl px-4 py-3">
                <div className="text-2xl font-bold">🎌</div>
                <div className="text-xs text-indigo-100">Daily Anime</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Daily Time Structure ── */}
        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-5">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span>⏰</span> Daily Time Structure
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {[
              { time: '7:00 – 9:00 AM',  label: 'Morning Free / Get Ready',   emoji: '🌅', color: 'bg-yellow-50 border-yellow-200 text-yellow-700' },
              { time: '9:00 – 2:30 PM',  label: 'Class',                       emoji: '🏫', color: 'bg-blue-50 border-blue-200 text-blue-700' },
              { time: '2:30 – 3:00 PM',  label: 'Lunch Break',                 emoji: '🍽️', color: 'bg-orange-50 border-orange-200 text-orange-700' },
              { time: '3:00 – 5:45 PM',  label: 'Study Session 1',             emoji: '📚', color: 'bg-indigo-50 border-indigo-200 text-indigo-700' },
              { time: '5:45 – 6:30 PM',  label: 'Coding Hour',                 emoji: '🖥️', color: 'bg-sky-50 border-sky-200 text-sky-700' },
              { time: '6:30 – 7:30 PM',  label: 'Study Session 2 / Anime',    emoji: '🎌', color: 'bg-pink-50 border-pink-200 text-pink-700' },
              { time: '7:30 – 8:30 PM',  label: 'Dinner',                      emoji: '🍽️', color: 'bg-orange-50 border-orange-200 text-orange-700' },
              { time: '8:30 – 10:30 PM', label: 'Study Session 3 / Wind Down', emoji: '🌙', color: 'bg-purple-50 border-purple-200 text-purple-700' },
            ].map(item => (
              <div key={item.time} className={`flex items-center gap-2.5 rounded-xl border p-2.5 ${item.color}`}>
                <span className="text-lg flex-shrink-0">{item.emoji}</span>
                <div>
                  <div className="text-xs font-mono font-semibold opacity-80">{item.time}</div>
                  <div className="text-xs font-semibold">{item.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Weekly Overview ── */}
        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-5">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span>📊</span> Weekly Overview
            {activeWeek !== null && (
              <button
                onClick={() => setActiveWeek(null)}
                className="ml-auto text-xs text-indigo-600 hover:underline font-normal"
              >
                Show all days
              </button>
            )}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
            {weeks.map((w, i) => (
              <button
                key={w.label}
                onClick={() => setActiveWeek(activeWeek === i ? null : i)}
                className={`rounded-xl border-2 p-3 text-left transition-all cursor-pointer hover:scale-[1.02] ${
                  activeWeek === i
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-gray-200 bg-gray-50 hover:border-indigo-300'
                }`}
              >
                <div className="font-bold text-indigo-700 text-sm">{w.label}</div>
                <div className="text-xs text-gray-500 font-medium mb-1">{w.range}</div>
                <div className="text-xs text-gray-600 leading-relaxed">{w.focus}</div>
              </button>
            ))}
          </div>
        </div>

        {/* ── Subject Legend ── */}
        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-4">
          <SubjectLegend />
        </div>

        {/* ── Calendar + Day Detail ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6">

          {/* Calendar Grid */}
          <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-5">
            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
              <span>📆</span> April 2026
              {activeWeek !== null && (
                <span className="text-sm font-normal text-indigo-600">– {weeks[activeWeek].label}</span>
              )}
            </h3>
            {/* Day headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => (
                <div key={d} className="text-center text-xs font-semibold text-gray-400 uppercase tracking-wide py-1">{d}</div>
              ))}
            </div>
            {/* Grid cells */}
            <div className="grid grid-cols-7 gap-1">
              {/* 2 empty cells before Wed Apr 1 */}
              <div className="rounded-xl py-3 px-2 opacity-0 pointer-events-none">-</div>
              <div className="rounded-xl py-3 px-2 opacity-0 pointer-events-none">-</div>
              {dailySchedule.map(day => {
                const inFilter = activeWeek === null || filteredDays.includes(day);
                const isSelected = selectedDay.dayNum === day.dayNum;

                // compute completion for ring
                const studyable = day.activities.filter(isStudyable);
                const doneCnt = studyable.filter((s) => {
                  const realIdx = day.activities.indexOf(s);
                  return !!studied[activityKey(day.dayNum, realIdx)];
                }).length;
                const allDone = studyable.length > 0 && doneCnt === studyable.length;

                return (
                  <button
                    key={day.dayNum}
                    onClick={() => setSelectedDay(day)}
                    className={`relative flex flex-col items-center justify-center rounded-xl py-2 px-1 text-sm font-medium transition-all duration-200 cursor-pointer border-2 ${
                      !inFilter ? 'opacity-30' : ''
                    } ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-200 scale-105'
                        : allDone
                        ? 'bg-green-50 text-green-800 border-green-400 hover:scale-105'
                        : day.label?.includes('Free')
                        ? 'bg-green-50 text-green-700 border-green-200 hover:border-green-400 hover:scale-105'
                        : day.label?.includes('Light')
                        ? 'bg-teal-50 text-teal-700 border-teal-200 hover:border-teal-400 hover:scale-105'
                        : day.label?.includes('Final')
                        ? 'bg-amber-50 text-amber-700 border-amber-200 hover:border-amber-400 hover:scale-105'
                        : day.label?.includes('Kickoff')
                        ? 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:border-indigo-300 hover:scale-105'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-indigo-300 hover:scale-105'
                    }`}
                  >
                    {/* Completion ring (svg) */}
                    <CalendarDayCompletion schedule={day} studied={studied} />

                    <span className={`text-xs font-semibold ${isSelected ? 'text-indigo-200' : 'text-gray-400'}`}>
                      {day.dayName}
                    </span>
                    <span className="text-lg font-bold leading-tight">{day.dayNum}</span>
                    {day.label && <span className="text-xs">{day.label.split(' ')[0]}</span>}
                    {/* Subject dots */}
                    <div className="flex gap-0.5 mt-1 flex-wrap justify-center">
                      {Array.from(new Set(day.activities.filter(a => a.subject).map(a => a.subject!))).slice(0, 3).map(subj => (
                        <div
                          key={subj}
                          className={`w-1.5 h-1.5 rounded-full ${subjectDotColors[subj] ?? 'bg-gray-300'} ${isSelected ? 'opacity-80' : ''}`}
                        />
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-gray-100">
              <span className="flex items-center gap-1.5 text-xs text-gray-500"><span className="w-3 h-3 rounded border-2 border-indigo-600 bg-indigo-600 inline-block" /> Selected</span>
              <span className="flex items-center gap-1.5 text-xs text-gray-500"><span className="w-3 h-3 rounded border-2 border-green-400 bg-green-50 inline-block" /> All done ✅</span>
              <span className="flex items-center gap-1.5 text-xs text-gray-500"><span className="w-3 h-3 rounded border-2 border-green-200 bg-green-50 inline-block" /> Free Day</span>
              <span className="flex items-center gap-1.5 text-xs text-gray-500"><span className="w-3 h-3 rounded border-2 border-teal-200 bg-teal-50 inline-block" /> Light Break</span>
              <span className="flex items-center gap-1.5 text-xs text-gray-500"><span className="w-3 h-3 rounded border-2 border-indigo-200 bg-indigo-50 inline-block" /> Kickoff / Final</span>
            </div>
          </div>

          {/* ── Day Detail Panel ── */}
          <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
            {/* Day header */}
            <div
              className={`p-5 ${
                selectedDay.label?.includes('Free')   ? 'bg-gradient-to-r from-green-500 to-teal-500' :
                selectedDay.label?.includes('Light')  ? 'bg-gradient-to-r from-teal-500 to-cyan-500' :
                selectedDay.label?.includes('Final')  ? 'bg-gradient-to-r from-amber-500 to-orange-500' :
                selectedDay.label?.includes('Kickoff')? 'bg-gradient-to-r from-indigo-600 to-purple-600' :
                'bg-gradient-to-r from-indigo-600 to-violet-600'
              } text-white`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-medium opacity-80 mb-0.5">{selectedDay.date}</div>
                  {selectedDay.label ? (
                    <div className="text-lg font-bold">{selectedDay.label}</div>
                  ) : (
                    <div className="text-lg font-bold">Day {selectedDay.dayNum}</div>
                  )}
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => {
                      const idx = dailySchedule.findIndex(d => d.dayNum === selectedDay.dayNum);
                      if (idx > 0) setSelectedDay(dailySchedule[idx - 1]);
                    }}
                    disabled={selectedDay.dayNum === 1}
                    className="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 disabled:opacity-40 flex items-center justify-center text-sm transition-colors"
                  >‹</button>
                  <button
                    onClick={() => {
                      const idx = dailySchedule.findIndex(d => d.dayNum === selectedDay.dayNum);
                      if (idx < dailySchedule.length - 1) setSelectedDay(dailySchedule[idx + 1]);
                    }}
                    disabled={selectedDay.dayNum === 30}
                    className="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 disabled:opacity-40 flex items-center justify-center text-sm transition-colors"
                  >›</button>
                </div>
              </div>

              <div className="mt-3 space-y-2">
                <StatsBar schedule={selectedDay} />
                <DayProgress schedule={selectedDay} studied={studied} />
              </div>
            </div>

            {/* Activities */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 max-h-[600px]">
              {selectedDay.activities.map((activity, i) => (
                <ActivityRow
                  key={i}
                  activity={activity}
                  dayNum={selectedDay.dayNum}
                  idx={i}
                  studied={studied}
                  onToggle={toggle}
                />
              ))}
            </div>

            {/* Mark all / Clear all footer */}
            {selectedDay.activities.some(isStudyable) && (
              <div className="p-3 border-t border-gray-100 flex gap-2">
                <button
                  onClick={() => {
                    selectedDay.activities.forEach((a, i) => {
                      if (isStudyable(a) && !studied[activityKey(selectedDay.dayNum, i)]) {
                        toggle(activityKey(selectedDay.dayNum, i));
                      }
                    });
                  }}
                  className="flex-1 text-xs font-semibold text-white bg-green-500 hover:bg-green-600 active:bg-green-700 rounded-xl py-2 transition-colors cursor-pointer"
                >
                  ✅ Mark All Done
                </button>
                <button
                  onClick={() => {
                    selectedDay.activities.forEach((a, i) => {
                      if (isStudyable(a) && studied[activityKey(selectedDay.dayNum, i)]) {
                        toggle(activityKey(selectedDay.dayNum, i));
                      }
                    });
                  }}
                  className="flex-1 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 rounded-xl py-2 transition-colors cursor-pointer"
                >
                  ↩ Clear Day
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Tips Section ── */}
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-3xl border border-indigo-100 p-5">
          <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2"><span>✅</span> Study Tips</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { icon: '📓', tip: 'Keep a notebook for quick formula notes during learning sessions' },
              { icon: '🎌', tip: "Use the anime time as a real reward — don't skip it, you earned it!" },
              { icon: '💧', tip: 'During breaks, stretch and hydrate' },
              { icon: '📅', tip: 'If you fall behind, use the free days to catch up minimally' },
            ].map(({ icon, tip }) => (
              <div key={tip} className="flex items-start gap-2.5 bg-white rounded-xl p-3 border border-indigo-100 shadow-sm">
                <span className="text-xl flex-shrink-0">{icon}</span>
                <p className="text-sm text-gray-600 leading-relaxed">{tip}</p>
              </div>
            ))}
          </div>
        </div>
        </>)}

        {/* ── Footer ── */}
        <div className="text-center py-4 text-xs text-gray-400">
          April 2026 • 30 Days • 6 Subjects • You've got this! 🚀
        </div>
      </main>
    </div>
  );
}
