import React, { useState, useEffect, useMemo } from 'react';
import { taskService } from '../../lib/taskService';
import { EnterpriseTask, UserRosterMetadata, TaskPriority, TaskStatus } from '../../types/tasks';
import {
  Sparkles,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Plus,
  Trash2,
  Edit2,
  Copy,
  Eye,
  EyeOff,
  User,
  Check,
  X,
  RefreshCw,
  Send,
  Calendar,
  Layers,
  Activity,
  Sliders,
  ChevronDown,
  Shield,
  Filter,
} from 'lucide-react';

interface TaskAdminDeskProps {
  currentView: 'tasks' | 'vault';
}

export const TaskAdminDesk: React.FC<TaskAdminDeskProps> = ({ currentView }) => {
  const [tasks, setTasks] = useState<EnterpriseTask[]>([]);
  const [roster, setRoster] = useState<UserRosterMetadata[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // New Task Form State (Simple & Human Friendly)
  const [omnibarText, setOmnibarText] = useState<string>('');
  const [selectedAssignee, setSelectedAssignee] = useState<string>('');
  const [selectedDueDate, setSelectedDueDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [selectedPriority, setSelectedPriority] = useState<TaskPriority>('normal');
  const [creating, setCreating] = useState<boolean>(false);

  // Filter State
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'completed' | 'overdue'>('all');
  const [filterUser, setFilterUser] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Editing State
  const [editingTask, setEditingTask] = useState<EnterpriseTask | null>(null);
  const [editTitle, setEditTitle] = useState<string>('');
  const [editDesc, setEditDesc] = useState<string>('');
  const [editAssignee, setEditAssignee] = useState<string>('');
  const [editDate, setEditDate] = useState<string>('');
  const [editPriority, setEditPriority] = useState<TaskPriority>('normal');
  const [savingEdit, setSavingEdit] = useState<boolean>(false);

  // Vault Password & Alias State
  const [showPasswords, setShowPasswords] = useState<{ [userId: string]: boolean }>({});
  const [copiedUser, setCopiedUser] = useState<string | null>(null);
  const [editingAlias, setEditingAlias] = useState<{ [userId: string]: string }>({});
  const [savingAlias, setSavingAlias] = useState<{ [userId: string]: boolean }>({});
  const [aliasSavedSuccess, setAliasSavedSuccess] = useState<{ [userId: string]: boolean }>({});

  const loadData = async () => {
    setLoading(true);
    const [tasksRes, rosterRes] = await Promise.all([
      taskService.getAllTasks(),
      taskService.getUserRoster(),
    ]);

    if (!tasksRes.error) setTasks(tasksRes.data);
    if (!rosterRes.error) {
      setRoster(rosterRes.data);
      // Default assignee to first worker
      const firstWorker = rosterRes.data.find((u) => u.role !== 'admin');
      if (firstWorker && !selectedAssignee) {
        setSelectedAssignee(firstWorker.user_id);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // Metrics
  const metrics = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === 'completed').length;
    const pending = tasks.filter((t) => t.status === 'pending').length;
    const overdue = tasks.filter((t) => t.status === 'pending' && t.due_date < todayStr).length;

    return { total, completed, pending, overdue };
  }, [tasks]);

  // Submit New Task
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!omnibarText.trim() || !selectedAssignee) return;

    setCreating(true);
    const parsed = taskService.parseNaturalLanguageTask(omnibarText, roster);

    const { data, error } = await taskService.createTask({
      task_title: parsed.title,
      assigned_to: selectedAssignee,
      due_date: selectedDueDate,
      priority: selectedPriority,
      tags: parsed.tags || [],
    });

    if (!error && data) {
      setOmnibarText('');
      await loadData();
    }
    setCreating(false);
  };

  // 1-Tap Toggle Task Completion (Admin can check/uncheck right from table row)
  const handleToggleTaskStatus = async (task: EnterpriseTask) => {
    const willComplete = task.status !== 'completed';
    setTasks((prev) =>
      prev.map((t) =>
        t.id === task.id
          ? {
              ...t,
              status: willComplete ? 'completed' : 'pending',
              completed_at: willComplete ? new Date().toISOString() : null,
            }
          : t
      )
    );
    const { error } = await taskService.toggleTaskCompletion(task.id, willComplete);
    if (error) {
      loadData();
    }
  };

  // Save Inline Custom Name / Alias
  const handleSaveAlias = async (userId: string) => {
    const newAlias = editingAlias[userId];
    if (!newAlias || !newAlias.trim()) return;

    setSavingAlias((prev) => ({ ...prev, [userId]: true }));
    const { error } = await taskService.updateUserAlias(userId, newAlias);
    setSavingAlias((prev) => ({ ...prev, [userId]: false }));

    if (!error) {
      setAliasSavedSuccess((prev) => ({ ...prev, [userId]: true }));
      setTimeout(() => setAliasSavedSuccess((prev) => ({ ...prev, [userId]: false })), 2000);
      loadData();
    }
  };

  // Copy Password to Clipboard
  const handleCopyPassword = (userId: string, pwd: string) => {
    navigator.clipboard.writeText(pwd);
    setCopiedUser(userId);
    setTimeout(() => setCopiedUser(null), 2000);
  };

  // Toggle Password Mask
  const togglePasswordVisibility = (userId: string) => {
    setShowPasswords((prev) => ({ ...prev, [userId]: !prev[userId] }));
  };

  // Delete Task
  const handleDeleteTask = async (taskId: string, title: string) => {
    if (!window.confirm(`Are you sure you want to delete task "${title}"?`)) return;
    const { error } = await taskService.deleteTask(taskId);
    if (!error) loadData();
  };

  // Open Edit Task Modal
  const handleStartEdit = (task: EnterpriseTask) => {
    setEditingTask(task);
    setEditTitle(task.task_title);
    setEditDesc(task.description || '');
    setEditAssignee(task.assigned_to);
    setEditDate(task.due_date);
    setEditPriority(task.priority);
  };

  // Save Edit Task
  const handleSaveEdit = async () => {
    if (!editingTask || !editTitle.trim()) return;
    setSavingEdit(true);
    const { error } = await taskService.updateTask(editingTask.id, {
      task_title: editTitle.trim(),
      description: editDesc.trim() || null,
      assigned_to: editAssignee,
      due_date: editDate,
      priority: editPriority,
    });
    setSavingEdit(false);
    if (!error) {
      setEditingTask(null);
      loadData();
    }
  };

  // Filtered Task List
  const filteredTasks = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return tasks.filter((t) => {
      // Status filter
      if (filterStatus === 'pending' && t.status !== 'pending') return false;
      if (filterStatus === 'completed' && t.status !== 'completed') return false;
      if (filterStatus === 'overdue' && !(t.status === 'pending' && t.due_date < todayStr)) return false;

      // User filter
      if (filterUser !== 'all' && t.assigned_to !== filterUser) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = t.task_title.toLowerCase().includes(q);
        const matchesAssignee = (t.assignee_alias || t.assignee_name || '').toLowerCase().includes(q);
        const matchesTags = (t.tags || []).some((tag) => tag.toLowerCase().includes(q));
        if (!matchesTitle && !matchesAssignee && !matchesTags) return false;
      }

      return true;
    });
  }, [tasks, filterStatus, filterUser, searchQuery]);

  return (
    <div className="flex-1 flex flex-col bg-[#07090E] text-slate-100 overflow-y-auto">
      
      {/* VIEW 1: TASK OPERATIONS (SIMPLE & INTUITIVE FOR ANY CLIENT) */}
      {currentView === 'tasks' ? (
        <div className="flex-1 w-full max-w-7xl mx-auto p-3 sm:p-5 space-y-4">
          
          {/* 1. TOP SUMMARY BAR (COMPACT & SIMPLE) */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0C101C] border border-slate-800 rounded-2xl p-3 px-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
              <span className="font-bold text-slate-400 uppercase tracking-wider text-[11px]">Tasks Status:</span>
              
              <span className="px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-white flex items-center gap-1.5">
                <span>Total:</span>
                <strong className="text-cyan-400 font-mono text-sm">{metrics.total}</strong>
              </span>

              <span className="px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs font-bold text-amber-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                <span>Pending:</span>
                <strong className="font-mono text-sm">{metrics.pending}</strong>
              </span>

              <span className="px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Completed:</span>
                <strong className="font-mono text-sm">{metrics.completed}</strong>
              </span>

              {metrics.overdue > 0 && (
                <span className="px-2.5 py-1 rounded-xl bg-rose-500/15 border border-rose-500/30 text-xs font-bold text-rose-400 flex items-center gap-1.5 animate-pulse">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Overdue:</span>
                  <strong className="font-mono text-sm">{metrics.overdue}</strong>
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-1.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-xs font-bold text-slate-300 hover:text-white flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              title="Refresh Task List"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-cyan-400' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>

          {/* 2. SUPER-SIMPLE TASK ASSIGNMENT BAR */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-[#0C101C] via-[#0E1424] to-[#0C101C] border border-indigo-500/30 shadow-md">
            <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Assign New Task</span>
            </h3>

            <form onSubmit={handleCreateTask} className="flex flex-col md:flex-row items-stretch md:items-center gap-2">
              
              {/* Task Title */}
              <div className="flex-1 min-w-[220px]">
                <input
                  type="text"
                  value={omnibarText}
                  onChange={(e) => setOmnibarText(e.target.value)}
                  placeholder="Enter task... (e.g. Renew insurance for AP04 truck, Service vehicle, Collect payment)"
                  className="w-full py-2.5 px-3.5 bg-[#06080F] border border-slate-700 rounded-xl text-white placeholder-slate-500 text-xs sm:text-sm font-medium focus:outline-none focus:border-cyan-400"
                  required
                />
              </div>

              {/* Assignee Dropdown */}
              <div className="w-full md:w-56">
                <select
                  value={selectedAssignee}
                  onChange={(e) => setSelectedAssignee(e.target.value)}
                  className="w-full py-2.5 px-3 bg-[#06080F] border border-slate-700 rounded-xl text-white text-xs font-bold focus:outline-none focus:border-cyan-400 cursor-pointer"
                >
                  <option value="" disabled>Select Staff / User</option>
                  {roster
                    .filter((u) => u.role !== 'admin')
                    .map((u) => (
                      <option key={u.user_id} value={u.user_id}>
                        {u.custom_alias || u.full_name} ({u.full_name})
                      </option>
                    ))}
                </select>
              </div>

              {/* Due Date Picker */}
              <div className="w-full md:w-40">
                <input
                  type="date"
                  value={selectedDueDate}
                  onChange={(e) => setSelectedDueDate(e.target.value)}
                  className="w-full py-2.5 px-3 bg-[#06080F] border border-slate-700 rounded-xl text-white text-xs font-mono font-bold focus:outline-none focus:border-cyan-400 cursor-pointer"
                  title="Due Date"
                />
              </div>

              {/* Priority */}
              <div className="w-full md:w-32">
                <select
                  value={selectedPriority}
                  onChange={(e) => setSelectedPriority(e.target.value as TaskPriority)}
                  className="w-full py-2.5 px-2.5 bg-[#06080F] border border-slate-700 rounded-xl text-white text-xs font-bold focus:outline-none focus:border-cyan-400 cursor-pointer"
                >
                  <option value="normal">🟡 Normal</option>
                  <option value="high">🟠 High</option>
                  <option value="critical">🔴 Urgent</option>
                  <option value="low">🔵 Low</option>
                </select>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={creating || !omnibarText.trim()}
                className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-cyan-400 to-emerald-400 text-slate-950 font-black text-xs hover:brightness-110 active:scale-95 transition-all shadow-md shrink-0 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 min-h-[40px]"
                title="Assign Task"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>+ Assign</span>
              </button>
            </form>
          </div>

          {/* 3. FILTER TABS & SEARCH (CLEAN & SIMPLE) */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
            
            {/* Status Filter Pills */}
            <div className="flex items-center gap-1.5 bg-[#0C101C] border border-slate-800 rounded-xl p-1 overflow-x-auto no-scrollbar">
              <button
                type="button"
                onClick={() => setFilterStatus('all')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all shrink-0 cursor-pointer ${
                  filterStatus === 'all'
                    ? 'bg-gradient-to-r from-indigo-500 to-cyan-500 text-slate-950 font-black shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                All ({metrics.total})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('pending')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all shrink-0 cursor-pointer ${
                  filterStatus === 'pending'
                    ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Pending ({metrics.pending})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('completed')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all shrink-0 cursor-pointer ${
                  filterStatus === 'completed'
                    ? 'bg-emerald-500 text-slate-950 font-black shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Completed ({metrics.completed})
              </button>
              {metrics.overdue > 0 && (
                <button
                  type="button"
                  onClick={() => setFilterStatus('overdue')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all shrink-0 cursor-pointer ${
                    filterStatus === 'overdue'
                      ? 'bg-rose-500 text-white font-black shadow-sm'
                      : 'text-rose-400 hover:text-rose-300'
                  }`}
                >
                  Overdue ({metrics.overdue})
                </button>
              )}
            </div>

            {/* User Filter + Search Box */}
            <div className="flex items-center gap-2">
              <select
                value={filterUser}
                onChange={(e) => setFilterUser(e.target.value)}
                className="py-1.5 px-2.5 bg-[#0C101C] border border-slate-800 rounded-xl text-slate-300 text-xs font-bold focus:outline-none focus:border-cyan-400 cursor-pointer"
              >
                <option value="all">All Staff Members</option>
                {roster
                  .filter((u) => u.role !== 'admin')
                  .map((u) => (
                    <option key={u.user_id} value={u.user_id}>
                      {u.custom_alias || u.full_name}
                    </option>
                  ))}
              </select>

              <div className="relative flex-1 sm:w-52">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search task..."
                  className="w-full py-1.5 pl-8 pr-3 bg-[#0C101C] border border-slate-800 rounded-xl text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>

          </div>

          {/* 4. THE SINGLE-LINE TASK LIST / TABLE (REQUESTED BY USER) */}
          <div className="bg-[#0C101C] border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
            
            {/* Table Header Row (Desktop) */}
            <div className="hidden md:grid md:grid-cols-12 gap-3 px-4 py-2.5 bg-[#080B14] border-b border-slate-800 text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider">
              <div className="col-span-1 flex items-center">Status</div>
              <div className="col-span-5 flex items-center">Task Description</div>
              <div className="col-span-2 flex items-center">Assigned Staff</div>
              <div className="col-span-2 flex items-center">Due Date</div>
              <div className="col-span-2 flex items-center justify-end">Actions</div>
            </div>

            {/* Task Rows */}
            {loading ? (
              <div className="py-16 text-center space-y-2">
                <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <div className="text-xs text-slate-400 font-mono">Loading tasks...</div>
              </div>
            ) : filteredTasks.length === 0 ? (
              <div className="py-16 text-center p-8 space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                <h4 className="text-sm font-bold text-white">No Tasks Found</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  {searchQuery ? 'No tasks matched your search query.' : 'Use the form above to assign a task.'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-800/80">
                {filteredTasks.map((t) => {
                  const todayStr = new Date().toISOString().split('T')[0];
                  const isOverdue = t.status === 'pending' && t.due_date < todayStr;
                  const isDone = t.status === 'completed';
                  const isToday = t.due_date === todayStr;

                  return (
                    <div
                      key={t.id}
                      className={`px-4 py-3 flex flex-col md:grid md:grid-cols-12 gap-2 md:gap-3 items-start md:items-center transition-colors ${
                        isDone
                          ? 'bg-[#090D17]/40 hover:bg-[#0B101D]'
                          : isOverdue
                          ? 'bg-rose-950/15 hover:bg-rose-950/25'
                          : 'hover:bg-slate-900/60'
                      }`}
                    >
                      {/* 1. Status Checkbox (1-Tap Toggle) */}
                      <div className="md:col-span-1 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleToggleTaskStatus(t)}
                          className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                            isDone
                              ? 'bg-emerald-500 text-slate-950 shadow-sm'
                              : 'bg-slate-900 border border-slate-700 text-slate-400 hover:border-cyan-400 hover:text-cyan-400'
                          }`}
                          title={isDone ? 'Click to mark Pending' : 'Click to mark Completed'}
                        >
                          {isDone ? <Check className="w-4 h-4 stroke-[3]" /> : <Clock className="w-3.5 h-3.5" />}
                        </button>
                        <span className={`text-[11px] font-bold md:hidden ${isDone ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {isDone ? 'Completed' : 'Pending'}
                        </span>
                      </div>

                      {/* 2. Task Description (Single Horizontal Line) */}
                      <div className="md:col-span-5 min-w-0 w-full">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-sm font-bold tracking-tight truncate ${
                              isDone ? 'line-through text-slate-400' : 'text-white'
                            }`}
                            title={t.task_title}
                          >
                            {t.task_title}
                          </span>
                          {t.priority === 'critical' && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 shrink-0">
                              Urgent
                            </span>
                          )}
                          {t.priority === 'high' && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 shrink-0">
                              High
                            </span>
                          )}
                        </div>
                        {t.description && (
                          <p className="text-xs text-slate-400 truncate mt-0.5">{t.description}</p>
                        )}
                      </div>

                      {/* 3. Assigned Staff Pill */}
                      <div className="md:col-span-2 flex items-center">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-950/60 border border-indigo-500/30 text-indigo-300 text-xs font-bold truncate max-w-full">
                          <User className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                          <span className="truncate">{t.assignee_alias || t.assignee_name}</span>
                        </span>
                      </div>

                      {/* 4. Due Date / Status */}
                      <div className="md:col-span-2 flex items-center gap-1.5 text-xs font-mono">
                        {isDone ? (
                          <span className="text-emerald-400 font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span>
                              Done {t.completed_at ? new Date(t.completed_at).toLocaleDateString([], { month: 'short', day: 'numeric' }) : ''}
                            </span>
                          </span>
                        ) : isOverdue ? (
                          <span className="px-2 py-0.5 rounded-md bg-rose-500/20 border border-rose-500/40 text-rose-300 font-bold flex items-center gap-1 animate-pulse">
                            <AlertTriangle className="w-3 h-3 text-rose-400 shrink-0" />
                            <span>Overdue ({t.due_date})</span>
                          </span>
                        ) : isToday ? (
                          <span className="px-2 py-0.5 rounded-md bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-bold flex items-center gap-1">
                            <Clock className="w-3 h-3 text-cyan-400 shrink-0" />
                            <span>Due Today</span>
                          </span>
                        ) : (
                          <span className="text-slate-300 flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{t.due_date}</span>
                          </span>
                        )}
                      </div>

                      {/* 5. Actions (Edit & Delete) */}
                      <div className="md:col-span-2 flex items-center justify-end gap-1.5 w-full md:w-auto pt-1 md:pt-0 border-t md:border-0 border-slate-800">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(t)}
                          className="p-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                          title="Edit Task"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-slate-400" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteTask(t.id, t.task_title)}
                          className="p-1.5 px-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 text-xs font-bold flex items-center transition-all cursor-pointer"
                          title="Delete Task"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}

          </div>

        </div>
      ) : (
        /* VIEW 2: 10-USER CREDENTIAL VAULT (REMAINS HIGH-UTILITY & CLEAN) */
        <div className="flex-1 w-full max-w-6xl mx-auto p-3.5 sm:p-6 space-y-4">
          <div className="p-4 sm:p-5 rounded-2xl bg-[#0C101C] border border-indigo-500/30 shadow-md">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                  <Shield className="w-5 h-5 text-cyan-400" />
                  <span>10-User Passwords & Staff Names</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  View worker passwords with 1-tap copy, and edit driver/staff names.
                </p>
              </div>

              <button
                type="button"
                onClick={handleRefresh}
                className="p-2 px-3 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-slate-300 hover:text-white flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>

            {/* Table of 10 Users */}
            <div className="mt-4 border border-slate-800 rounded-xl overflow-hidden bg-[#07090E]">
              <div className="hidden sm:grid sm:grid-cols-12 gap-3 px-4 py-2.5 bg-slate-900/80 border-b border-slate-800 text-[11px] font-mono font-bold text-slate-400 uppercase">
                <div className="col-span-2">Account</div>
                <div className="col-span-4">Custom Staff Name (Editable)</div>
                <div className="col-span-3">Login Email</div>
                <div className="col-span-3">Password</div>
              </div>

              <div className="divide-y divide-slate-800/80">
                {roster.map((u) => {
                  const isPwVisible = showPasswords[u.user_id];
                  const isCopied = copiedUser === u.user_id;
                  const isSaving = savingAlias[u.user_id];
                  const isSaved = aliasSavedSuccess[u.user_id];
                  const currentAliasVal = editingAlias[u.user_id] !== undefined ? editingAlias[u.user_id] : (u.custom_alias || '');

                  return (
                    <div
                      key={u.user_id}
                      className="px-4 py-3 flex flex-col sm:grid sm:grid-cols-12 gap-2 sm:gap-3 items-start sm:items-center hover:bg-slate-900/40 transition-colors text-xs"
                    >
                      {/* Account Tag */}
                      <div className="sm:col-span-2">
                        <span className={`px-2 py-0.5 rounded-md font-mono font-bold text-[11px] ${
                          u.role === 'admin'
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                            : 'bg-indigo-950 text-indigo-300 border border-indigo-500/30'
                        }`}>
                          {u.full_name || u.role}
                        </span>
                      </div>

                      {/* Custom Name / Alias Input */}
                      <div className="sm:col-span-4 w-full">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={currentAliasVal}
                            onChange={(e) => setEditingAlias({ ...editingAlias, [u.user_id]: e.target.value })}
                            onBlur={() => handleSaveAlias(u.user_id)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.currentTarget.blur();
                              }
                            }}
                            placeholder="Assign driver name (e.g. Ramesh)"
                            className="flex-1 py-1 px-2.5 bg-[#06080F] border border-slate-700 rounded-lg text-white font-bold text-xs focus:outline-none focus:border-cyan-400"
                          />
                          {isSaved && <span className="text-[10px] text-emerald-400 font-bold shrink-0">Saved!</span>}
                          {isSaving && <span className="text-[10px] text-cyan-400 animate-spin shrink-0">⏳</span>}
                        </div>
                      </div>

                      {/* Email */}
                      <div className="sm:col-span-3 text-slate-400 font-mono text-[11px]">
                        {u.email}
                      </div>

                      {/* Password with Eye & Copy */}
                      <div className="sm:col-span-3 flex items-center gap-1.5">
                        <span className="font-mono text-amber-300 font-bold bg-[#06080F] px-2 py-1 rounded-lg border border-slate-800 text-xs min-w-[90px] text-center">
                          {isPwVisible ? u.cached_password_hint || 'No hint' : '••••••••••'}
                        </span>

                        <button
                          type="button"
                          onClick={() => togglePasswordVisibility(u.user_id)}
                          className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                          title={isPwVisible ? 'Hide' : 'Show'}
                        >
                          {isPwVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleCopyPassword(u.user_id, u.cached_password_hint || '')}
                          className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                          title="Copy Password"
                        >
                          {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>

                    </div>
                  );
                })}
              </div>

            </div>

          </div>
        </div>
      )}

      {/* EDIT TASK MODAL */}
      {editingTask && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-[#0D1220] border border-indigo-500/40 p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-sm text-cyan-300 flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-cyan-400" />
                <span>Edit Task</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingTask(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Task Title</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full p-2.5 bg-[#06080F] border border-slate-700 rounded-xl text-white text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Assignee</label>
                <select
                  value={editAssignee}
                  onChange={(e) => setEditAssignee(e.target.value)}
                  className="w-full p-2.5 bg-[#06080F] border border-slate-700 rounded-xl text-white text-xs"
                >
                  {roster
                    .filter((u) => u.role !== 'admin')
                    .map((u) => (
                      <option key={u.user_id} value={u.user_id}>
                        {u.custom_alias || u.full_name} ({u.full_name})
                      </option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full p-2.5 bg-[#06080F] border border-slate-700 rounded-xl text-white text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Priority</label>
                  <select
                    value={editPriority}
                    onChange={(e) => setEditPriority(e.target.value as TaskPriority)}
                    className="w-full p-2.5 bg-[#06080F] border border-slate-700 rounded-xl text-white text-xs"
                  >
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="critical">Urgent</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Notes / Instructions</label>
                <textarea
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  rows={2}
                  className="w-full p-2.5 bg-[#06080F] border border-slate-700 rounded-xl text-white text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setEditingTask(null)}
                className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={savingEdit}
                onClick={handleSaveEdit}
                className="px-4 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs disabled:opacity-50"
              >
                {savingEdit ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
