import { useState, useEffect, useCallback, useRef } from 'react';

type TimerMode = 'focus' | 'shortBreak' | 'longBreak';

interface ModeConfig {
  label: string;
  defaultMinutes: number;
  color: string;
  bgGradient: string;
  icon: string;
}

interface TodayStats {
  date: string;
  focusSessions: number;
  totalFocusMinutes: number;
}

const MODE_CONFIG: Record<TimerMode, ModeConfig> = {
  focus: {
    label: '專注',
    defaultMinutes: 25,
    color: 'text-rose-600',
    bgGradient: 'from-rose-500 to-orange-500',
    icon: '🎯',
  },
  shortBreak: {
    label: '短休息',
    defaultMinutes: 5,
    color: 'text-emerald-600',
    bgGradient: 'from-emerald-500 to-teal-500',
    icon: '☕',
  },
  longBreak: {
    label: '長休息',
    defaultMinutes: 15,
    color: 'text-blue-600',
    bgGradient: 'from-blue-500 to-indigo-500',
    icon: '🌿',
  },
};

function getTodayKey(): string {
  return new Date().toISOString().split('T')[0];
}

function loadStats(): TodayStats {
  const today = getTodayKey();
  const stored = localStorage.getItem('pomodoro-stats');
  if (stored) {
    const parsed = JSON.parse(stored) as TodayStats;
    if (parsed.date === today) {
      return parsed;
    }
  }
  return { date: today, focusSessions: 0, totalFocusMinutes: 0 };
}

function saveStats(stats: TodayStats) {
  localStorage.setItem('pomodoro-stats', JSON.stringify(stats));
}

function loadCustomDurations(): Record<TimerMode, number> {
  const stored = localStorage.getItem('pomodoro-durations');
  if (stored) {
    return JSON.parse(stored);
  }
  return {
    focus: 25,
    shortBreak: 5,
    longBreak: 15,
  };
}

function saveCustomDurations(durations: Record<TimerMode, number>) {
  localStorage.setItem('pomodoro-durations', JSON.stringify(durations));
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export default function App() {
  const [mode, setMode] = useState<TimerMode>('focus');
  const [customDurations, setCustomDurations] = useState<Record<TimerMode, number>>(loadCustomDurations);
  const [timeLeft, setTimeLeft] = useState(customDurations.focus * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [stats, setStats] = useState<TodayStats>(loadStats);
  const [showSettings, setShowSettings] = useState(false);
  const [tempDurations, setTempDurations] = useState<Record<TimerMode, number>>(customDurations);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const completedRef = useRef(false);

  // Timer logic
  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isRunning) {
      setIsRunning(false);
      completedRef.current = true;
      // If focus session completed, update stats
      if (mode === 'focus') {
        const newStats = {
          ...stats,
          focusSessions: stats.focusSessions + 1,
          totalFocusMinutes: stats.totalFocusMinutes + customDurations.focus,
        };
        setStats(newStats);
        saveStats(newStats);
      }
      // Play notification sound effect (visual flash)
      document.title = `✅ ${MODE_CONFIG[mode].label}完成！ - 番茄專注計時器`;
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, timeLeft, mode, stats, customDurations.focus]);

  // Update document title with timer
  useEffect(() => {
    if (isRunning) {
      document.title = `${formatTime(timeLeft)} - ${MODE_CONFIG[mode].label}中`;
    } else if (!completedRef.current) {
      document.title = '番茄專注計時器';
    }
    completedRef.current = false;
  }, [timeLeft, isRunning, mode]);

  const handleModeChange = useCallback((newMode: TimerMode) => {
    setMode(newMode);
    setTimeLeft(customDurations[newMode] * 60);
    setIsRunning(false);
  }, [customDurations]);

  const handleStart = () => setIsRunning(true);
  const handlePause = () => setIsRunning(false);
  const handleReset = () => {
    setIsRunning(false);
    setTimeLeft(customDurations[mode] * 60);
  };

  const handleSaveSettings = () => {
    setCustomDurations(tempDurations);
    saveCustomDurations(tempDurations);
    setTimeLeft(tempDurations[mode] * 60);
    setIsRunning(false);
    setShowSettings(false);
  };

  const handleOpenSettings = () => {
    setTempDurations(customDurations);
    setShowSettings(true);
  };

  const progress = 1 - timeLeft / (customDurations[mode] * 60);
  const circumference = 2 * Math.PI * 120;
  const strokeDashoffset = circumference * (1 - progress);

  const config = MODE_CONFIG[mode];

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background gradient orbs */}
      <div className={`absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-gradient-to-br ${config.bgGradient} opacity-10 blur-3xl transition-all duration-1000`} />
      <div className={`absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-gradient-to-tl ${config.bgGradient} opacity-10 blur-3xl transition-all duration-1000`} />

      {/* Header */}
      <div className="text-center mb-8 relative z-10">
        <h1 className="text-3xl font-bold mb-2">
          <span className="mr-2">🍅</span>番茄專注計時器
        </h1>
        <p className="text-gray-400 text-sm">保持專注，提升效率</p>
      </div>

      {/* Mode Selector */}
      <div className="flex gap-2 mb-8 relative z-10">
        {(Object.keys(MODE_CONFIG) as TimerMode[]).map((m) => (
          <button
            key={m}
            onClick={() => handleModeChange(m)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
              mode === m
                ? `bg-gradient-to-r ${MODE_CONFIG[m].bgGradient} text-white shadow-lg scale-105`
                : 'bg-gray-800/60 text-gray-300 hover:bg-gray-700/60 hover:text-white'
            }`}
          >
            <span className="mr-1">{MODE_CONFIG[m].icon}</span>
            {MODE_CONFIG[m].label}
          </button>
        ))}
      </div>

      {/* Timer Circle */}
      <div className="relative mb-8 z-10">
        <svg width="280" height="280" className="transform -rotate-90">
          {/* Background circle */}
          <circle
            cx="140"
            cy="140"
            r="120"
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
            className="text-gray-800"
          />
          {/* Progress circle */}
          <circle
            cx="140"
            cy="140"
            r="120"
            fill="none"
            strokeWidth="6"
            strokeLinecap="round"
            className={`transition-all duration-1000 ${
              mode === 'focus' ? 'stroke-rose-500' : mode === 'shortBreak' ? 'stroke-emerald-500' : 'stroke-blue-500'
            }`}
            style={{
              strokeDasharray: circumference,
              strokeDashoffset: strokeDashoffset,
            }}
          />
        </svg>
        {/* Timer display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-6xl font-mono font-bold tracking-wider">
            {formatTime(timeLeft)}
          </span>
          <span className={`text-sm mt-2 font-medium ${config.color} opacity-80`}>
            {config.icon} {config.label}中
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-4 mb-8 relative z-10">
        {!isRunning ? (
          <button
            onClick={handleStart}
            className={`px-8 py-3 rounded-full font-semibold text-white bg-gradient-to-r ${config.bgGradient} shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 active:scale-95`}
          >
            <span className="mr-2">▶</span>開始
          </button>
        ) : (
          <button
            onClick={handlePause}
            className="px-8 py-3 rounded-full font-semibold text-white bg-gradient-to-r from-amber-500 to-orange-500 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 active:scale-95"
          >
            <span className="mr-2">⏸</span>暫停
          </button>
        )}
        <button
          onClick={handleReset}
          className="px-6 py-3 rounded-full font-semibold text-gray-300 bg-gray-800/60 hover:bg-gray-700/60 hover:text-white transition-all duration-300 active:scale-95"
        >
          <span className="mr-2">↺</span>重置
        </button>
        <button
          onClick={handleOpenSettings}
          className="px-6 py-3 rounded-full font-semibold text-gray-300 bg-gray-800/60 hover:bg-gray-700/60 hover:text-white transition-all duration-300 active:scale-95"
        >
          ⚙️
        </button>
      </div>

      {/* Today Stats */}
      <div className="relative z-10 bg-gray-800/40 backdrop-blur-sm rounded-2xl p-6 w-full max-w-sm border border-gray-700/50">
        <h2 className="text-lg font-semibold mb-4 text-center">📊 今日專注統計</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-gray-900/50 rounded-xl">
            <div className="text-3xl font-bold text-rose-400">{stats.focusSessions}</div>
            <div className="text-xs text-gray-400 mt-1">完成次數</div>
          </div>
          <div className="text-center p-3 bg-gray-900/50 rounded-xl">
            <div className="text-3xl font-bold text-orange-400">{stats.totalFocusMinutes}</div>
            <div className="text-xs text-gray-400 mt-1">專注分鐘</div>
          </div>
        </div>
        <div className="mt-4 text-center">
          <div className="text-xs text-gray-500">
            已完成 {stats.focusSessions} 次專注 · 共 {stats.totalFocusMinutes} 分鐘
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowSettings(false)} />
          <div className="relative bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h2 className="text-xl font-bold mb-6 text-center">⚙️ 自訂時長</h2>
            
            {(Object.keys(MODE_CONFIG) as TimerMode[]).map((m) => (
              <div key={m} className="mb-4">
                <label className="block text-sm text-gray-400 mb-2">
                  {MODE_CONFIG[m].icon} {MODE_CONFIG[m].label}（分鐘）
                </label>
                <input
                  type="number"
                  min="1"
                  max="120"
                  value={tempDurations[m]}
                  onChange={(e) =>
                    setTempDurations({
                      ...tempDurations,
                      [m]: Math.max(1, Math.min(120, parseInt(e.target.value) || 1)),
                    })
                  }
                  className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-colors"
                />
              </div>
            ))}

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowSettings(false)}
                className="flex-1 px-4 py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSaveSettings}
                className="flex-1 px-4 py-2 rounded-lg bg-gradient-to-r from-rose-500 to-orange-500 text-white font-semibold hover:shadow-lg transition-all"
              >
                儲存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-8 text-center text-xs text-gray-600 relative z-10">
        保持專注 · 數據自動儲存在本機
      </div>
    </div>
  );
}
