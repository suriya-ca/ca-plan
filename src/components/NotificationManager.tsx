import { useState, useEffect, useCallback, useRef } from 'react';

// ── Types ──────────────────────────────────────────────────────────────────────
interface ReminderConfig {
  id: string;
  label: string;
  time: string; // HH:MM (24h)
  enabled: boolean;
  emoji: string;
  message: string;
}

const DEFAULT_REMINDERS: ReminderConfig[] = [
  { id: 'study1',  label: 'Study Session 1',   time: '15:00', enabled: true,  emoji: '📚', message: "Time to start Study Session 1! Let's go 💪" },
  { id: 'coding',  label: 'Coding Hour',        time: '17:45', enabled: true,  emoji: '🖥️', message: 'Coding Hour time! Open your editor 🖥️' },
  { id: 'study2',  label: 'Study Session 2',    time: '18:30', enabled: true,  emoji: '📖', message: "Study Session 2 — you're doing great! 📖" },
  { id: 'dinner',  label: 'Dinner Break',       time: '19:30', enabled: false, emoji: '🍽️', message: 'Dinner time! Rest and recharge 🍽️' },
  { id: 'study3',  label: 'Study Session 3',    time: '20:30', enabled: true,  emoji: '🌙', message: 'Final study block of the day! Finish strong 🌙' },
  { id: 'winddown',label: 'Wind Down / Anime',  time: '22:00', enabled: false, emoji: '🎌', message: "Anime time! You've earned it 🎌" },
];

const STORAGE_KEY = 'april-2026-reminders';

function loadReminders(): ReminderConfig[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_REMINDERS;
    const parsed = JSON.parse(raw) as ReminderConfig[];
    // Merge any new defaults that might not be in storage
    const ids = new Set(parsed.map(r => r.id));
    const merged = [...parsed];
    for (const def of DEFAULT_REMINDERS) {
      if (!ids.has(def.id)) merged.push(def);
    }
    return merged;
  } catch {
    return DEFAULT_REMINDERS;
  }
}

function saveReminders(reminders: ReminderConfig[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reminders));
}

// ── Permission Banner ─────────────────────────────────────────────────────────
function PermissionBanner({ onRequest }: { onRequest: () => void }) {
  return (
    <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 flex items-start gap-3">
      <span className="text-2xl flex-shrink-0">🔔</span>
      <div className="flex-1">
        <p className="font-semibold text-amber-800 text-sm">Enable Browser Notifications</p>
        <p className="text-xs text-amber-600 mt-0.5 leading-relaxed">
          Allow notifications so the app can remind you when each study session starts — even when you're on a different tab.
        </p>
      </div>
      <button
        onClick={onRequest}
        className="flex-shrink-0 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
      >
        Allow
      </button>
    </div>
  );
}

function DeniedBanner() {
  return (
    <div className="rounded-2xl bg-red-50 border border-red-200 p-4 flex items-start gap-3">
      <span className="text-2xl flex-shrink-0">🚫</span>
      <div>
        <p className="font-semibold text-red-800 text-sm">Notifications Blocked</p>
        <p className="text-xs text-red-600 mt-0.5 leading-relaxed">
          Notifications are blocked for this site. To enable them, click the lock icon in your browser's address bar and allow notifications, then reload.
        </p>
      </div>
    </div>
  );
}

// ── Reminder Row ──────────────────────────────────────────────────────────────
function ReminderRow({
  reminder,
  onChange,
  onTest,
  notifGranted,
}: {
  reminder: ReminderConfig;
  onChange: (updated: ReminderConfig) => void;
  onTest: (r: ReminderConfig) => void;
  notifGranted: boolean;
}) {
  return (
    <div className={`flex items-center gap-3 rounded-xl border p-3 transition-all ${
      reminder.enabled ? 'bg-indigo-50 border-indigo-200' : 'bg-gray-50 border-gray-200'
    }`}>
      <span className="text-xl flex-shrink-0">{reminder.emoji}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-sm font-semibold ${reminder.enabled ? 'text-indigo-800' : 'text-gray-500'}`}>
            {reminder.label}
          </span>
          {reminder.enabled && (
            <span className="text-[10px] bg-green-100 text-green-700 border border-green-200 rounded-full px-2 py-0.5 font-semibold">
              Active
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-0.5 truncate">{reminder.message}</p>
      </div>

      {/* Time picker */}
      <input
        type="time"
        value={reminder.time}
        onChange={(e) => onChange({ ...reminder, time: e.target.value })}
        className="text-xs border border-gray-300 rounded-lg px-2 py-1 text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300 w-24 flex-shrink-0"
      />

      {/* Test button */}
      {notifGranted && (
        <button
          onClick={() => onTest(reminder)}
          title="Send a test notification now"
          className="flex-shrink-0 text-xs px-2 py-1 rounded-lg bg-white border border-gray-300 hover:border-indigo-400 text-gray-600 hover:text-indigo-600 transition-colors cursor-pointer"
        >
          Test
        </button>
      )}

      {/* Toggle */}
      <button
        onClick={() => onChange({ ...reminder, enabled: !reminder.enabled })}
        className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 cursor-pointer ${
          reminder.enabled ? 'bg-indigo-500' : 'bg-gray-300'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
            reminder.enabled ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}

// ── In-app Toast Notification ─────────────────────────────────────────────────
interface Toast {
  id: number;
  emoji: string;
  label: string;
  message: string;
}

function ToastNotification({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 6000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div className="fixed bottom-4 right-4 z-[9999] max-w-xs w-full animate-slide-up">
      <div className="bg-white rounded-2xl shadow-2xl border border-indigo-100 p-4 flex items-start gap-3">
        <span className="text-2xl flex-shrink-0">{toast.emoji}</span>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-900 text-sm">{toast.label}</p>
          <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">{toast.message}</p>
        </div>
        <button
          onClick={onDismiss}
          className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer text-lg leading-none mt-0.5"
        >
          ×
        </button>
      </div>
    </div>
  );
}

// ── Main NotificationManager ──────────────────────────────────────────────────
export default function NotificationManager() {
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  const [reminders, setReminders] = useState<ReminderConfig[]>(loadReminders);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [saved, setSaved] = useState(false);
  const firedToday = useRef<Set<string>>(new Set());
  const toastIdRef = useRef(0);

  // Persist reminders
  useEffect(() => {
    saveReminders(reminders);
  }, [reminders]);

  // Request permission
  const requestPermission = useCallback(async () => {
    if (typeof Notification === 'undefined') return;
    const result = await Notification.requestPermission();
    setPermission(result);
  }, []);

  // Fire a native + in-app toast notification
  const fireNotification = useCallback((r: ReminderConfig) => {
    // In-app toast
    const id = ++toastIdRef.current;
    setToasts(prev => [...prev, { id, emoji: r.emoji, label: r.label, message: r.message }]);

    // Native notification
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      const showFallback = () => {
        try {
          new Notification(`${r.emoji} ${r.label}`, {
            body: r.message,
            icon: '/pwa-192x192.svg',
            tag: r.id,
          });
        } catch {
          // silently fail (e.g. in sandboxed env)
        }
      };

      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then((registration) => {
          registration.showNotification(`${r.emoji} ${r.label}`, {
            body: r.message,
            icon: '/pwa-192x192.svg',
            tag: r.id,
          }).catch(() => showFallback());
        }).catch(() => showFallback());
      } else {
        showFallback();
      }
    }
  }, []);

  // Ticker — check every 30 seconds if a reminder should fire
  useEffect(() => {
    const check = () => {
      const now = new Date();
      const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const todayKey = now.toDateString();

      for (const r of reminders) {
        if (!r.enabled) continue;
        const fireKey = `${todayKey}-${r.id}`;
        if (r.time === hhmm && !firedToday.current.has(fireKey)) {
          firedToday.current.add(fireKey);
          fireNotification(r);
        }
      }
    };

    check(); // run immediately
    const interval = setInterval(check, 30_000);
    return () => clearInterval(interval);
  }, [reminders, fireNotification]);

  // Save handler
  const handleSave = () => {
    saveReminders(reminders);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleTest = (r: ReminderConfig) => fireNotification(r);

  const updateReminder = (updated: ReminderConfig) => {
    setReminders(prev => prev.map(r => r.id === updated.id ? updated : r));
  };

  const notifGranted = permission === 'granted';
  const notifDefault = permission === 'default';
  const notifDenied = permission === 'denied';

  return (
    <>
      {/* Toasts */}
      {toasts.map(t => (
        <ToastNotification
          key={t.id}
          toast={t}
          onDismiss={() => setToasts(prev => prev.filter(x => x.id !== t.id))}
        />
      ))}

      <div className="space-y-5">
        {/* Header card */}
        <div className="rounded-3xl bg-gradient-to-r from-violet-600 to-indigo-600 p-6 text-white shadow-xl shadow-violet-200">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">🔔</span>
            <div>
              <h2 className="text-xl font-bold">Study Reminders</h2>
              <p className="text-violet-200 text-sm">Get notified when each session starts</p>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-4 flex-wrap">
            <div className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
              notifGranted
                ? 'bg-green-400/20 border-green-400/40 text-green-100'
                : notifDenied
                ? 'bg-red-400/20 border-red-400/40 text-red-100'
                : 'bg-white/20 border-white/30 text-white/80'
            }`}>
              {notifGranted ? '✅ Notifications Enabled' : notifDenied ? '🚫 Notifications Blocked' : '⏳ Permission Not Set'}
            </div>
            <div className="px-3 py-1.5 rounded-full text-xs font-semibold bg-white/20 border border-white/30 text-white/80">
              {reminders.filter(r => r.enabled).length} reminders active
            </div>
          </div>
        </div>

        {/* Permission banners */}
        {notifDefault && <PermissionBanner onRequest={requestPermission} />}
        {notifDenied && <DeniedBanner />}

        {/* How it works */}
        <div className="rounded-2xl bg-blue-50 border border-blue-100 p-4">
          <h3 className="font-bold text-blue-800 text-sm mb-2 flex items-center gap-2">
            <span>💡</span> How it works
          </h3>
          <ul className="space-y-1 text-xs text-blue-700 leading-relaxed">
            <li>• Reminders fire daily at the times you set below</li>
            <li>• <strong>Browser notifications</strong> appear even when you switch tabs (requires permission)</li>
            <li>• <strong>In-app toasts</strong> appear in the bottom-right corner whenever the page is open</li>
            <li>• Each reminder fires once per day to avoid duplicate alerts</li>
            <li>• Click <em>Test</em> to preview a notification immediately</li>
          </ul>
        </div>

        {/* Reminder rows */}
        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-800 flex items-center gap-2">
              <span>⏰</span> Daily Reminders
            </h3>
            <button
              onClick={handleSave}
              className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                saved
                  ? 'bg-green-500 text-white'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white'
              }`}
            >
              {saved ? '✅ Saved!' : 'Save Changes'}
            </button>
          </div>

          <div className="space-y-2">
            {reminders.map(r => (
              <ReminderRow
                key={r.id}
                reminder={r}
                onChange={updateReminder}
                onTest={handleTest}
                notifGranted={notifGranted}
              />
            ))}
          </div>
        </div>

        {/* Custom reminder note */}
        <div className="rounded-2xl bg-purple-50 border border-purple-100 p-4 flex items-start gap-3">
          <span className="text-xl flex-shrink-0">🎌</span>
          <div>
            <p className="font-semibold text-purple-800 text-sm">Keep this tab open for in-app reminders!</p>
            <p className="text-xs text-purple-600 mt-0.5 leading-relaxed">
              In-app toasts only show when this page is open. Enable browser notifications above for reminders in the background. The app checks every 30 seconds — reminders fire within 30 seconds of your set time.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
