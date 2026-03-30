import { useMemo } from 'react';
import { dailySchedule, type Activity } from '../data/scheduleData';

// ── Types ──────────────────────────────────────────────────────────────────────
interface TopicEntry {
  dayNum: number;
  actIdx: number;
  date: string;
  type: 'study' | 'revision';
  detail: string;
  duration?: string;
}



// ── Helpers ────────────────────────────────────────────────────────────────────
function activityKey(dayNum: number, idx: number) {
  return `studied-${dayNum}-${idx}`;
}

function isStudyable(a: Activity) {
  return a.type === 'study' || a.type === 'revision';
}

const SUBJECTS = ['Maths', 'Accounting', 'Economics', 'Business Law', 'Statistics', 'Logical Reasoning'];

const subjectConfig: Record<string, {
  gradient: string;
  ring: string;
  badge: string;
  icon: string;
  light: string;
  text: string;
  border: string;
}> = {
  Maths:               { gradient: 'from-blue-500 to-blue-700',       ring: '#3b82f6', badge: 'bg-blue-100 text-blue-700 border-blue-200',       icon: '📐', light: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200' },
  Accounting:          { gradient: 'from-emerald-500 to-emerald-700',  ring: '#10b981', badge: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: '📒', light: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  Economics:           { gradient: 'from-amber-500 to-amber-700',      ring: '#f59e0b', badge: 'bg-amber-100 text-amber-700 border-amber-200',       icon: '📈', light: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200' },
  'Business Law':      { gradient: 'from-purple-500 to-purple-700',    ring: '#8b5cf6', badge: 'bg-purple-100 text-purple-700 border-purple-200',     icon: '⚖️', light: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  Statistics:          { gradient: 'from-rose-500 to-rose-700',        ring: '#f43f5e', badge: 'bg-rose-100 text-rose-700 border-rose-200',           icon: '📊', light: 'bg-rose-50',   text: 'text-rose-700',   border: 'border-rose-200' },
  'Logical Reasoning': { gradient: 'from-cyan-500 to-cyan-700',        ring: '#06b6d4', badge: 'bg-cyan-100 text-cyan-700 border-cyan-200',           icon: '🧠', light: 'bg-cyan-50',   text: 'text-cyan-700',   border: 'border-cyan-200' },
};

// Radial progress SVG
function RadialProgress({ pct, color, size = 80 }: { pct: number; color: string; size?: number }) {
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <svg width={size} height={size} className="rotate-[-90deg]">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e5e7eb" strokeWidth="8" />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none"
        stroke={color}
        strokeWidth="8"
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.6s ease' }}
      />
    </svg>
  );
}



function TopicRow({ topic, cfg }: { topic: TopicEntry & { studied?: boolean }; cfg: typeof subjectConfig[string] }) {
  const done = topic.studied;
  return (
    <div className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 border text-xs transition-all ${
      done
        ? 'bg-green-50 border-green-200'
        : `${cfg.light} ${cfg.border}`
    }`}>
      <div className={`w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center border-2 ${
        done ? 'bg-green-500 border-green-500 text-white' : `border-gray-300 ${cfg.light}`
      }`}>
        {done && (
          <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <span className={`font-medium leading-snug ${done ? 'text-green-800 line-through decoration-green-400' : 'text-gray-700'}`}>
          {topic.detail}
        </span>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {topic.duration && (
          <span className={`text-[10px] ${done ? 'text-green-600' : 'text-gray-400'}`}>{topic.duration}</span>
        )}
        <span className={`text-[10px] font-mono ${done ? 'text-green-600' : 'text-gray-400'}`}>Apr {topic.dayNum}</span>
      </div>
    </div>
  );
}

// ── Main Progress Tab ──────────────────────────────────────────────────────────
export default function ProgressTab({ studied }: { studied: Record<string, boolean> }) {
  // Build per-subject data with studied status
  const subjectData = useMemo<Record<string, { topics: (TopicEntry & { studied: boolean })[]; studiedCount: number; totalCount: number }>>(() => {
    const result: Record<string, { topics: (TopicEntry & { studied: boolean })[]; studiedCount: number; totalCount: number }> = {};
    for (const subj of SUBJECTS) {
      result[subj] = { topics: [], studiedCount: 0, totalCount: 0 };
    }

    for (const day of dailySchedule) {
      for (let i = 0; i < day.activities.length; i++) {
        const act = day.activities[i];
        if (!isStudyable(act) || !act.subject) continue;
        const subj = act.subject;
        if (!result[subj]) continue;
        const key = activityKey(day.dayNum, i);
        const isDone = !!studied[key];
        result[subj].topics.push({
          dayNum: day.dayNum,
          actIdx: i,
          date: day.date,
          type: act.type as 'study' | 'revision',
          detail: act.detail,
          duration: act.duration,
          studied: isDone,
        });
        result[subj].totalCount++;
        if (isDone) result[subj].studiedCount++;
      }
    }
    return result;
  }, [studied]);

  // Overall stats
  const overall = useMemo(() => {
    let total = 0, done = 0;
    for (const d of Object.values(subjectData)) {
      total += d.totalCount;
      done += d.studiedCount;
    }
    return { total, done, pct: total === 0 ? 0 : Math.round((done / total) * 100) };
  }, [subjectData]);

  // Completion streak (consecutive days from Apr 1 with all topics done)
  const streak = useMemo(() => {
    let count = 0;
    for (const day of dailySchedule) {
      const studyable = day.activities.filter(isStudyable);
      if (studyable.length === 0) { count++; continue; }
      const allDone = studyable.every((_, idx) => {
        const realIdx = day.activities.indexOf(studyable[idx]);
        return !!studied[activityKey(day.dayNum, realIdx)];
      });
      if (allDone) count++;
      else break;
    }
    return count;
  }, [studied]);

  return (
    <div className="space-y-6">
      {/* ── Overall Stats ── */}
      <div className="rounded-3xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 p-6 text-white shadow-xl shadow-indigo-200">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">📊 Study Progress Overview</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
          {[
            { label: 'Topics Done', value: `${overall.done}/${overall.total}`, icon: '✅' },
            { label: 'Completion', value: `${overall.pct}%`, icon: '🎯' },
            { label: 'Day Streak', value: streak, icon: '🔥' },
            { label: 'Subjects', value: 6, icon: '📚' },
          ].map(s => (
            <div key={s.label} className="bg-white/20 rounded-2xl p-3 text-center">
              <div className="text-2xl mb-1">{s.icon}</div>
              <div className="text-xl font-bold">{s.value}</div>
              <div className="text-xs text-white/75">{s.label}</div>
            </div>
          ))}
        </div>
        {/* Master progress bar */}
        <div>
          <div className="flex justify-between text-sm mb-1.5">
            <span className="font-medium text-white/90">Overall Progress</span>
            <span className="font-bold">{overall.done} / {overall.total} topics</span>
          </div>
          <div className="h-3 rounded-full bg-white/20 overflow-hidden">
            <div
              className="h-full rounded-full bg-white transition-all duration-700"
              style={{ width: `${overall.pct}%` }}
            />
          </div>
        </div>
      </div>

      {/* ── Subject Summary Row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {SUBJECTS.map(subj => {
          const cfg = subjectConfig[subj];
          const data = subjectData[subj];
          const pct = data.totalCount === 0 ? 0 : Math.round((data.studiedCount / data.totalCount) * 100);
          return (
            <div key={subj} className={`rounded-2xl border ${cfg.border} bg-white p-3 shadow-sm flex flex-col items-center gap-2`}>
              <div className="relative">
                <RadialProgress pct={pct} color={cfg.ring} size={56} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-bold text-gray-700 rotate-[90deg]">{pct}%</span>
                </div>
              </div>
              <div className="text-center">
                <div className="text-lg">{cfg.icon}</div>
                <div className={`text-xs font-bold ${cfg.text} leading-tight`}>{subj}</div>
                <div className="text-[10px] text-gray-400 mt-0.5">{data.studiedCount}/{data.totalCount}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Per-Subject Detail Cards ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {SUBJECTS.map(subj => {
          const cfg = subjectConfig[subj];
          const data = subjectData[subj];
          return (
            <SubjectCardWithData
              key={subj}
              subject={subj}
              data={data}
              cfg={cfg}
            />
          );
        })}
      </div>
    </div>
  );
}

// SubjectCard that receives already-enriched data
function SubjectCardWithData({
  subject,
  data,
  cfg,
}: {
  subject: string;
  data: { topics: (TopicEntry & { studied: boolean })[]; studiedCount: number; totalCount: number };
  cfg: typeof subjectConfig[string];
}) {
  const pct = data.totalCount === 0 ? 0 : Math.round((data.studiedCount / data.totalCount) * 100);
  const studyTopics = data.topics.filter(t => t.type === 'study');
  const revisionTopics = data.topics.filter(t => t.type === 'revision');

  return (
    <div className={`rounded-2xl border ${cfg.border} bg-white shadow-sm overflow-hidden`}>
      {/* Header */}
      <div className={`bg-gradient-to-r ${cfg.gradient} p-4 text-white flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <span className="text-2xl">{cfg.icon}</span>
          <div>
            <div className="font-bold text-base leading-tight">{subject}</div>
            <div className="text-xs opacity-80">{data.studiedCount}/{data.totalCount} topics done</div>
          </div>
        </div>
        <div className="relative flex-shrink-0">
          <RadialProgress pct={pct} color="rgba(255,255,255,0.9)" size={64} />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-sm font-bold text-white" style={{ transform: 'rotate(90deg)' }}>{pct}%</span>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-4 pt-3 pb-1">
        <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
          <div
            className={`h-full rounded-full bg-gradient-to-r ${cfg.gradient} transition-all duration-700`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Topic list — scrollable */}
      <div className="px-4 pb-4 max-h-72 overflow-y-auto space-y-3 mt-2">
        {studyTopics.length > 0 && (
          <div>
            <div className={`text-xs font-bold uppercase tracking-wide ${cfg.text} mb-1.5 flex items-center gap-1`}>
              <span>📚</span> Learning ({studyTopics.length})
            </div>
            <div className="space-y-1">
              {studyTopics.map((t) => (
                <TopicRow key={`${t.dayNum}-${t.actIdx}`} topic={t} cfg={cfg} />
              ))}
            </div>
          </div>
        )}
        {revisionTopics.length > 0 && (
          <div>
            <div className="text-xs font-bold uppercase tracking-wide text-violet-600 mb-1.5 flex items-center gap-1">
              <span>🔁</span> Revision ({revisionTopics.length})
            </div>
            <div className="space-y-1">
              {revisionTopics.map((t) => (
                <TopicRow key={`${t.dayNum}-${t.actIdx}-r`} topic={t} cfg={cfg} />
              ))}
            </div>
          </div>
        )}
        {data.totalCount === 0 && (
          <p className="text-xs text-gray-400 italic text-center py-4">No study sessions found.</p>
        )}
      </div>
    </div>
  );
}
