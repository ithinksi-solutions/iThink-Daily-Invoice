import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { taskService } from '../../lib/taskService';
import { EnterpriseTask, TaskPriority } from '../../types/tasks';
import {
  CheckCircle2,
  Circle,
  Clock,
  AlertTriangle,
  Calendar,
  RefreshCw,
  Sparkles,
  Zap,
  Check,
  ChevronDown,
  ChevronUp,
  Tag,
  Flame,
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
      // Revert if error
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

  const getPriorityBadge = (priority: TaskPriority) => {
    switch (priority) {
      case 'critical':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30">
            <Flame className="w-3 h-3 text-rose-400 fill-rose-500/30" /> Critical
          </span>
        );
      case 'high':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
            <Zap className="w-3 h-3 text-amber-400" /> High
          </span>
        );
      case 'normal':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
            Normal
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">
            Low
          </span>
        );
    }
  };

  const getDueDateBadge = (dueDate?: string, isCompleted?: boolean) => {
    if (!dueDate) return null;
    const isToday = dueDate === todayStr;
    const isOverdue = !isCompleted && dueDate < todayStr;

    if (isCompleted) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-400">
          <Calendar className="w-3 h-3" /> {dueDate}
        </span>
      );
    }

    if (isOverdue) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">
          <AlertTriangle className="w-3 h-3 text-rose-400" /> Overdue ({dueDate})
        </span>
      );
    }

    if (isToday) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
          <Clock className="w-3 h-3 text-cyan-400" /> Due Today
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono text-slate-300 bg-slate-800/80 border border-slate-700/80">
        <Calendar className="w-3 h-3 text-indigo-400" /> {dueDate}
      </span>
    );
  };

  return (
    <div className="flex-1 flex flex-col bg-[#07090E] text-slate-100 overflow-hidden font-sans">
      {/* Worker Greeting & Live Progress Radar */}
      <div className="p-4 sm:p-6 bg-gradient-to-b from-[#0D121F] to-[#07090E] border-b border-indigo-500/20 shrink-0">
        <div className="max-w-3xl mx-auto space-y-4">
          
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold tracking-widest text-cyan-400 uppercase">
                  Terminal #{profile?.email ? profile.email.split('@')[0] : 'Operator'}
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-0.5 flex items-center gap-2">
                <span>{profile?.full_name || 'Frontline Specialist'}</span>
              </h1>
            </div>

            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2.5 rounded-xl bg-slate-900 border border-indigo-500/30 text-indigo-300 hover:text-white hover:bg-indigo-950 transition-all flex items-center gap-1.5 text-xs font-bold shadow-md cursor-pointer disabled:opacity-50"
              title="Refresh Task Roster"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-cyan-400' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>

          {/* Progress Micro-Card */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-[#0F172A]/90 to-[#1E1B4B]/50 border border-indigo-500/30 shadow-lg shadow-indigo-950/40">
            <div className="flex items-center justify-between text-xs font-bold mb-2">
              <span className="text-slate-300 flex items-center gap-1.5">
                <CheckSquare className="w-4 h-4 text-cyan-400" />
                <span>Task Completion Radar</span>
              </span>
              <span className="font-mono text-cyan-300 font-black">
                {stats.completed} / {stats.total} ({stats.percent}%)
              </span>
            </div>

            <div className="w-full h-2.5 bg-slate-900/90 rounded-full overflow-hidden border border-indigo-500/20 p-0.5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-cyan-400 to-emerald-400 transition-all duration-500 shadow-sm shadow-cyan-500/50"
                style={{ width: `${stats.percent}%` }}
              ></div>
            </div>

            <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-indigo-500/20 text-center">
              <div>
                <div className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">Pending</div>
                <div className="text-base font-black text-amber-300 font-mono mt-0.5">{stats.pending}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">Done</div>
                <div className="text-base font-black text-emerald-400 font-mono mt-0.5">{stats.completed}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">Overdue</div>
                <div className={`text-base font-black font-mono mt-0.5 ${stats.overdue > 0 ? 'text-rose-400 animate-pulse' : 'text-slate-400'}`}>
                  {stats.overdue}
                </div>
              </div>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-2 pt-1 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setFilter('pending')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                filter === 'pending'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black shadow-lg shadow-amber-500/30'
                  : 'bg-slate-900/80 text-slate-300 border border-slate-800 hover:border-indigo-500/30'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Pending Action ({stats.pending})</span>
            </button>

            <button
              type="button"
              onClick={() => setFilter('completed')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                filter === 'completed'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black shadow-lg shadow-emerald-500/30'
                  : 'bg-slate-900/80 text-slate-300 border border-slate-800 hover:border-indigo-500/30'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Completed ({stats.completed})</span>
            </button>

            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                filter === 'all'
                  ? 'bg-gradient-to-r from-indigo-500 to-cyan-500 text-slate-950 font-black shadow-lg shadow-indigo-500/30'
                  : 'bg-slate-900/80 text-slate-300 border border-slate-800 hover:border-indigo-500/30'
              }`}
            >
              <span>All Tasks ({stats.total})</span>
            </button>
          </div>

        </div>
      </div>

      {/* Task Stack List */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="max-w-3xl mx-auto space-y-3">

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
              <div className="w-10 h-10 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
              <div className="text-slate-400 text-xs font-mono tracking-wider">Syncing frontline assignments...</div>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="p-8 sm:p-12 rounded-3xl bg-[#0D121F]/80 border border-indigo-500/20 text-center space-y-3">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-indigo-500/20 via-cyan-500/20 to-emerald-500/20 flex items-center justify-center border border-cyan-500/30">
                <Sparkles className="w-7 h-7 text-cyan-300" />
              </div>
              <h3 className="text-base sm:text-lg font-black text-white">
                {filter === 'pending'
                  ? 'Zero Pending Tasks!'
                  : filter === 'completed'
                  ? 'No Completed Tasks Yet'
                  : 'No Tasks Assigned Yet'}
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 max-w-sm mx-auto">
                {filter === 'pending'
                  ? 'You are completely caught up! New tasks assigned by management will pop up here in real time.'
                  : 'Tasks will appear once you check them off or when newly scheduled.'}
              </p>
            </div>
          ) : (
            filteredTasks.map((task) => {
              const isToggling = togglingId === task.id;
              const isExpanded = expandedTaskId === task.id;
              const isCompleted = task.status === 'completed';

              return (
                <div
                  key={task.id}
                  className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                    isCompleted
                      ? 'bg-[#0B101D]/70 border-emerald-500/20 opacity-80 hover:opacity-100'
                      : 'bg-gradient-to-br from-[#0F162A] to-[#12182D] border-indigo-500/30 hover:border-cyan-400/50 shadow-md shadow-indigo-950/30'
                  }`}
                >
                  <div className="p-4 sm:p-5 flex items-start gap-3.5">
                    {/* Big Thumb Checkbox for 1-Tap Completion */}
                    <button
                      type="button"
                      disabled={isToggling}
                      onClick={() => handleToggle(task)}
                      className={`mt-0.5 w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                        isCompleted
                          ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/40 ring-2 ring-emerald-400/50'
                          : 'bg-slate-900 border-2 border-indigo-400/40 hover:border-cyan-400 hover:bg-indigo-950 text-transparent hover:text-cyan-400 active:scale-95'
                      }`}
                      title={isCompleted ? 'Mark as Pending' : 'Mark as Completed'}
                    >
                      {isToggling ? (
                        <RefreshCw className="w-4 h-4 animate-spin text-white" />
                      ) : isCompleted ? (
                        <Check className="w-5 h-5 stroke-[3]" />
                      ) : (
                        <Check className="w-4 h-4 stroke-[2.5]" />
                      )}
                    </button>

                    {/* Content Section */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        {getPriorityBadge(task.priority)}
                        {getDueDateBadge(task.due_date, isCompleted)}
                        {task.tags &&
                          task.tags.map((tag) => (
                            <span
                              key={tag}
                              className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-mono bg-indigo-950/60 text-indigo-300 border border-indigo-500/30"
                            >
                              #{tag}
                            </span>
                          ))}
                      </div>

                      <h3
                        className={`text-base font-extrabold tracking-tight transition-all ${
                          isCompleted
                            ? 'text-slate-400 line-through'
                            : 'text-white hover:text-cyan-200'
                        }`}
                      >
                        {task.task_title}
                      </h3>

                      {task.description && (
                        <div className="mt-1.5">
                          {isExpanded ? (
                            <p className="text-xs sm:text-sm text-slate-300 whitespace-pre-wrap bg-slate-900/60 p-2.5 rounded-xl border border-indigo-500/20 leading-relaxed">
                              {task.description}
                            </p>
                          ) : (
                            <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                              {task.description}
                            </p>
                          )}
                          <button
                            type="button"
                            onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}
                            className="mt-1 text-[11px] text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <span>{isExpanded ? 'Show less' : 'View full instructions'}</span>
                            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>
                        </div>
                      )}

                      {/* Completed Timestamp Info */}
                      {isCompleted && task.completed_at && (
                        <div className="mt-2.5 pt-2 border-t border-emerald-500/20 flex items-center gap-1.5 text-[11px] text-emerald-400 font-mono">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>
                            Logged Done: {new Date(task.completed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })},{' '}
                            {new Date(task.completed_at).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}

        </div>
      </div>
    </div>
  );
};
