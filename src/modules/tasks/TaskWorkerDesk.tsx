import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { taskService } from '../../lib/taskService';
import { EnterpriseTask, TaskPriority } from '../../types/tasks';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  Calendar,
  RefreshCw,
  Sparkles,
  Check,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  CheckSquare,
} from 'lucide-react';

export const TaskWorkerDesk: React.FC = () => {
  const { profile } = useAuth();
  const [tasks, setTasks] = useState<EnterpriseTask[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('pending');
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const loadWorkerTasks = async () => {
    if (!profile?.id) return;
    setLoading(true);
    const res = await taskService.getMyTasks(profile.id);
    if (!res.error) {
      setTasks(res.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadWorkerTasks();
  }, [profile?.id]);

  const handleRefresh = async () => {
    if (!profile?.id) return;
    setRefreshing(true);
    const res = await taskService.getMyTasks(profile.id);
    if (!res.error) {
      setTasks(res.data);
    }
    setRefreshing(false);
  };

  const handleToggle = async (task: EnterpriseTask) => {
    setTogglingId(task.id);
    const willComplete = task.status !== 'completed';
    const nowIso = new Date().toISOString();

    // Optimistic UI update
    setTasks((prev) =>
      prev.map((t) =>
        t.id === task.id
          ? {
              ...t,
              status: willComplete ? 'completed' : 'pending',
              completed_at: willComplete ? nowIso : null,
            }
          : t
      )
    );

    const res = await taskService.toggleTaskCompletion(task.id, willComplete);
    if (res.error) {
      await loadWorkerTasks();
    }
    setTogglingId(null);
  };

  // Metrics
  const todayStr = new Date().toISOString().split('T')[0];

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (filter === 'pending') return t.status === 'pending';
      if (filter === 'completed') return t.status === 'completed';
      return true;
    });
  }, [tasks, filter]);

  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === 'completed').length;
    const pending = tasks.filter((t) => t.status === 'pending').length;
    const overdue = tasks.filter((t) => t.status === 'pending' && t.due_date && t.due_date < todayStr).length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, pending, overdue, percent };
  }, [tasks, todayStr]);

  return (
    <div className="flex-1 flex flex-col bg-[#07090E] text-slate-100 overflow-hidden font-sans">
      
      {/* Top Header & Simple Progress */}
      <div className="p-3 sm:p-5 bg-gradient-to-b from-[#0D121F] to-[#07090E] border-b border-indigo-500/20 shrink-0">
        <div className="max-w-4xl mx-auto space-y-3">
          
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-cyan-400">
                <span>Staff: {profile?.full_name || 'Frontline User'}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              </div>
              <h1 className="text-lg sm:text-xl font-black text-white mt-0.5">
                My Assigned Tasks
              </h1>
            </div>

            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 px-3 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-slate-300 hover:text-white flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-cyan-400' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>

          {/* Simple Progress Strip */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 px-3.5 rounded-xl bg-[#0F172A]/90 border border-slate-800 text-xs font-bold">
            <span className="text-slate-300 flex items-center gap-1.5">
              <CheckSquare className="w-4 h-4 text-cyan-400" />
              <span>Completed: <strong className="text-cyan-300 font-mono">{stats.completed} of {stats.total}</strong> ({stats.percent}%)</span>
            </span>

            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
                Pending: {stats.pending}
              </span>
              {stats.overdue > 0 && (
                <span className="px-2 py-0.5 rounded bg-rose-500/15 text-rose-400 border border-rose-500/30 animate-pulse">
                  Overdue: {stats.overdue}
                </span>
              )}
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 pt-0.5 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setFilter('pending')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                filter === 'pending'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              Pending ({stats.pending})
            </button>

            <button
              type="button"
              onClick={() => setFilter('completed')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                filter === 'completed'
                  ? 'bg-emerald-500 text-slate-950 font-black shadow-sm'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              Completed ({stats.completed})
            </button>

            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                filter === 'all'
                  ? 'bg-indigo-500 text-slate-950 font-black shadow-sm'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              All ({stats.total})
            </button>
          </div>

        </div>
      </div>

      {/* SINGLE-LINE TASK LIST FOR WORKERS */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-5">
        <div className="max-w-4xl mx-auto bg-[#0C101C] border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
          
          {loading ? (
            <div className="py-16 text-center space-y-2">
              <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <div className="text-slate-400 text-xs font-mono">Loading your tasks...</div>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="py-16 text-center p-8 space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
              <h3 className="text-base font-bold text-white">
                {filter === 'pending' ? 'Zero Pending Tasks!' : 'No tasks in this view'}
              </h3>
              <p className="text-xs text-slate-400">
                {filter === 'pending'
                  ? 'You are all caught up! New tasks will appear here when assigned.'
                  : 'Tasks will appear once you check them off.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800/80">
              {filteredTasks.map((task) => {
                const isToggling = togglingId === task.id;
                const isCompleted = task.status === 'completed';
                const isOverdue = !isCompleted && task.due_date && task.due_date < todayStr;
                const isToday = task.due_date === todayStr;
                const isExpanded = expandedTaskId === task.id;

                return (
                  <div
                    key={task.id}
                    className={`transition-colors ${
                      isCompleted
                        ? 'bg-[#090D17]/40 hover:bg-[#0B101D]'
                        : isOverdue
                        ? 'bg-rose-950/15 hover:bg-rose-950/25'
                        : 'hover:bg-slate-900/60'
                    }`}
                  >
                    {/* Single Row Item */}
                    <div className="p-3.5 flex items-center gap-3">
                      
                      {/* Big 1-Tap Thumb Checkbox */}
                      <button
                        type="button"
                        disabled={isToggling}
                        onClick={() => handleToggle(task)}
                        className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                          isCompleted
                            ? 'bg-emerald-500 text-slate-950 shadow-sm ring-2 ring-emerald-400/50'
                            : 'bg-slate-900 border-2 border-slate-600 hover:border-cyan-400 text-slate-500 hover:text-cyan-400 active:scale-90'
                        }`}
                        title={isCompleted ? 'Mark as Not Done' : 'Mark as Done'}
                      >
                        {isToggling ? (
                          <RefreshCw className="w-4 h-4 animate-spin text-white" />
                        ) : isCompleted ? (
                          <Check className="w-5 h-5 stroke-[3]" />
                        ) : (
                          <div className="w-2.5 h-2.5 rounded-sm border border-slate-500"></div>
                        )}
                      </button>

                      {/* Task Title & Details (Single Line) */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            onClick={() => handleToggle(task)}
                            className={`text-sm font-extrabold tracking-tight cursor-pointer truncate ${
                              isCompleted
                                ? 'text-slate-400 line-through'
                                : 'text-white hover:text-cyan-200'
                            }`}
                          >
                            {task.task_title}
                          </span>

                          {task.priority === 'critical' && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 shrink-0">
                              Urgent
                            </span>
                          )}
                        </div>

                        {/* Due Date & Done status info */}
                        <div className="flex items-center gap-2 mt-0.5 text-xs">
                          {isCompleted ? (
                            <span className="text-emerald-400 font-bold flex items-center gap-1 font-mono text-[11px]">
                              <ShieldCheck className="w-3.5 h-3.5" />
                              <span>Done {task.completed_at ? new Date(task.completed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                            </span>
                          ) : isOverdue ? (
                            <span className="text-rose-400 font-bold flex items-center gap-1 text-[11px]">
                              <AlertTriangle className="w-3 h-3" />
                              <span>Overdue ({task.due_date})</span>
                            </span>
                          ) : isToday ? (
                            <span className="text-cyan-400 font-bold flex items-center gap-1 text-[11px]">
                              <Clock className="w-3 h-3" />
                              <span>Due Today</span>
                            </span>
                          ) : (
                            <span className="text-slate-400 flex items-center gap-1 text-[11px] font-mono">
                              <Calendar className="w-3 h-3 text-slate-500" />
                              <span>Due {task.due_date}</span>
                            </span>
                          )}

                          {task.description && (
                            <button
                              type="button"
                              onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}
                              className="text-[11px] text-cyan-400 hover:underline ml-1 cursor-pointer"
                            >
                              {isExpanded ? 'Hide info' : 'View info'}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Status Pill on Right */}
                      <div className="shrink-0">
                        {isCompleted ? (
                          <span className="px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30">
                            Done
                          </span>
                        ) : (
                          <span className="px-2 py-1 rounded-lg bg-amber-500/10 text-amber-400 text-xs font-bold border border-amber-500/30">
                            Pending
                          </span>
                        )}
                      </div>

                    </div>

                    {/* Expandable Description if available */}
                    {isExpanded && task.description && (
                      <div className="px-4 pb-3 pt-1 text-xs text-slate-300 bg-slate-900/50 border-t border-slate-800">
                        <p className="whitespace-pre-wrap leading-relaxed">{task.description}</p>
                      </div>
                    )}

                  </div>
                );
              })}
            </div>
          )}

        </div>
      </div>

    </div>
  );
};
