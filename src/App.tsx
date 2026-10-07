import { useState, useEffect, useCallback, useRef } from 'react';

import { computeEndTime, computeRemainingSeconds, formatTime, type Durations, type TimerMode } from './lib/timer';
import { createEmptyStats, getTodayKey, incrementFocusSession, type TodayStats } from './lib/stats';
import { loadDurations, loadStats, saveDurations, saveStats } from './lib/storage';

interface ModeConfig {
  label: string;
  defaultMinutes: number;
  color: string;
  bgGradient: string;
  icon: string;
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

export default function App() {
  const [mode, setMode] = useState<TimerMode>('focus');
  const [customDurations, setCustomDurations] = useState<Durations>(loadDurations);
  const [timeLeft, setTimeLeft] = useState(customDurations.focus * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [stats, setStats] = useState<TodayStats>(loadStats);
  const [showSettings, setShowSettings] = useState(false);
  const [tempDurations, setTempDurations] = useState<Durations>(customDurations);
  // Wall-clock deadline (ms epoch) for the running countdown; null when paused.
  const endTimeRef = useRef<number | null>(null);
  const completedRef = useRef(false);

  // Reliable countdown: remaining time is always recomputed from the
  // wall-clock deadline, so background tabs, throttled timers and system
  // sleep cannot make the timer drift.
  useEffect(() => {
    if (!isRunning) {
      return;
    }

    const sync = () => {
      const endTime = endTimeRef.current;
      if (endTime === null) {
        return;
      }
      const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining === 0) {
        endTimeRef.current = null;
        setIsRunning(false);
      }
    };

    sync();
    const intervalId = window.setInterval(sync, 250);
    const resync = () => {
      if (!document.hidden) {
        sync();
      }
    };
    document.addEventListener('visibilitychange', resync);
    window.addEventListener('focus', resync);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', resync);
      window.removeEventListener('focus', resync);
    };
  }, [isRunning]);

  // Persist stats whenever they change (also heals corrupted storage).
  useEffect(() => {
    saveStats(stats);
  }, [stats]);

  // Reset "today" stats when the calendar day changes while the page stays open.
  useEffect(() => {
    const checkDateRollover = () => {
      const today = getTodayKey();
      setStats((prev) => (prev.date === today ? prev : createEmptyStats(today)));
    };

    checkDateRollover();
    const intervalId = window.setInterval(checkDateRollover, 30_000);
    const resync = () => {
      if (!document.hidden) {
        checkDateRollover();
      }
    };
    document.addEventListener('visibilitychange', resync);
    window.addEventListener('focus', resync);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', resync);
      window.removeEventListener('focus', resync);
    };
  }, []);

  // Session completion: fires exactly once when the countdown reaches 00:00.
  useEffect(() => {
    if (timeLeft !== 0) {
      completedRef.current = false;
      return;
    }
    if (completedRef.current) {
      return;
    }
    completedRef.current = true;
    setIsRunning(false);
    endTimeRef.current = null;

    // Focus sessions are counted here; incrementFocusSession rolls over to a
    // fresh record automatically when the day changed during the session.
    if (mode === 'focus') {
      setStats((prev) => incrementFocusSession(prev, customDurations.focus));
    }
  }, [timeLeft, mode, customDurations.focus]);

  // Update document title with timer
  useEffect(() => {
    if (isRunning) {
      document.title = `${formatTime(timeLeft)} - ${MODE_CONFIG[mode].label}中`;
    } else if (timeLeft === 0) {
      document.title = `✅ ${MODE_CONFIG[mode].label}完成！ - 番茄專注計時器`;
    } else {
      document.title = '番茄專注計時器';
    }
  }, [timeLeft, isRunning, mode]);

  const handleModeChange = useCallback((newMode: TimerMode) => {
    endTimeRef.current = null;
    setMode(newMode);
    setTimeLeft(customDurations[newMode] * 60);
    setIsRunning(false);
  }, [customDurations]);

  const handleStart = () => {
    if (timeLeft > 0) {
      endTimeRef.current = Date.now() + timeLeft * 1000;
      setIsRunning(true);
    }
  };
  const handlePause = () => {
    const endTime = endTimeRef.current;
    if (endTime !== null) {
      setTimeLeft(Math.max(0, Math.ceil((endTime - Date.now()) / 1000)));
    }
    endTimeRef.current = null;
    setIsRunning(false);
  };
  const handleReset = () => {
    endTimeRef.current = null;
    completedRef.current = false;
    setIsRunning(false);
    setTimeLeft(customDurations[mode] * 60);
  };

  const handleSaveSettings = () => {
    endTimeRef.current = null;
    setCustomDurations(tempDurations);
    saveDurations(tempDurations);
    setTimeLeft(tempDurations[mode] * 60);
    setIsRunning(false);
    setShowSettings(false);
  };

  const handleOpenSettings = () => {
    setTempDurations(customDurations);
    setShowSettings(true);
  };

  const totalSeconds = customDurations[mode] * 60;
  const progress = totalSeconds > 0
    ? Math.min(1, Math.max(0, 1 - timeLeft / totalSeconds))
    : 0;
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
            disabled={timeLeft === 0}
            className={`px-8 py-3 rounded-full font-semibold text-white bg-gradient-to-r ${config.bgGradient} shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50`}
          >
            {timeLeft > 0 && <span className="mr-2">▶</span>}
            {timeLeft > 0 ? '開始' : '已完成'}
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
