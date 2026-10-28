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
} from 'lucide-react';

interface TaskAdminDeskProps {
  currentView: 'tasks' | 'vault';
}

export const TaskAdminDesk: React.FC<TaskAdminDeskProps> = ({ currentView }) => {
  const [tasks, setTasks] = useState<EnterpriseTask[]>([]);
  const [roster, setRoster] = useState<UserRosterMetadata[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Omnibar State
  const [omnibarText, setOmnibarText] = useState<string>('');
  const [selectedAssignee, setSelectedAssignee] = useState<string>('');
  const [selectedDueDate, setSelectedDueDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [selectedPriority, setSelectedPriority] = useState<TaskPriority>('normal');
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState<string>('');
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

  // Live KPI Calculations
  const metrics = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === 'completed').length;
    const pending = tasks.filter((t) => t.status === 'pending').length;
    const overdue = tasks.filter((t) => t.status === 'pending' && t.due_date < todayStr).length;

    const onTime = tasks.filter(
      (t) => t.status === 'completed' && t.completed_at && t.completed_at.split('T')[0] <= t.due_date
    ).length;

    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    const onTimeRate = completed > 0 ? Math.round((onTime / completed) * 100) : 100;

    return { total, completed, pending, overdue, completionRate, onTimeRate };
  }, [tasks]);

  // Omnibar Natural Language Sync
  const handleOmnibarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setOmnibarText(val);

    // Auto-parse if contains @ or # or dates
    if (val.includes('@') || val.includes('#') || /tomorrow|today/i.test(val)) {
      const parsed = taskService.parseNaturalLanguageTask(val, roster);
      if (parsed.assigneeUserId) setSelectedAssignee(parsed.assigneeUserId);
      if (parsed.dueDate) setSelectedDueDate(parsed.dueDate);
      if (parsed.priority !== 'normal') setSelectedPriority(parsed.priority);
      if (parsed.tags.length > 0) setActiveTags(Array.from(new Set([...activeTags, ...parsed.tags])));
    }
  };

  const handleAddTag = (tagToAdd: string) => {
    const clean = tagToAdd.replace('#', '').trim();
    if (clean && !activeTags.includes(clean)) {
      setActiveTags([...activeTags, clean]);
    }
    setTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setActiveTags(activeTags.filter((t) => t !== tagToRemove));
  };

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
      tags: activeTags,
    });

    if (!error && data) {
      setOmnibarText('');
      setActiveTags([]);
      await loadData();
    }
    setCreating(false);
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
      
      {/* VIEW 1: TASK OPERATIONS COMMAND */}
      {currentView === 'tasks' ? (
        <div className="flex-1 w-full max-w-7xl mx-auto p-3.5 sm:p-6 space-y-5">
          
          {/* 1. OPERATIONS RADAR (KPI STRIP WITH CYBERNETIC DIALS) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            
            {/* Total Operations */}
            <div className="p-4 rounded-2xl bg-[#0D121F]/90 border border-indigo-500/25 relative overflow-hidden group shadow-lg shadow-indigo-950/30">
              <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-xl group-hover:bg-indigo-500/20 transition-all pointer-events-none" />
              <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                <span>TOTAL OPERATIONS</span>
                <Layers className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black text-white font-mono">{metrics.total}</span>
                <span className="text-[11px] text-slate-400">Tasks logged</span>
              </div>
            </div>

            {/* On-Time Compliance Rate */}
            <div className="p-4 rounded-2xl bg-[#0D121F]/90 border border-emerald-500/25 relative overflow-hidden group shadow-lg shadow-emerald-950/30">
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-xl group-hover:bg-emerald-500/20 transition-all pointer-events-none" />
              <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                <span>ON-TIME COMPLIANCE</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black text-emerald-300 font-mono">{metrics.onTimeRate}%</span>
                <span className="text-[11px] text-emerald-400/80 font-mono">Punctual</span>
              </div>
            </div>

            {/* Pending Today */}
            <div className="p-4 rounded-2xl bg-[#0D121F]/90 border border-cyan-500/25 relative overflow-hidden group shadow-lg shadow-cyan-950/30">
              <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/10 rounded-full blur-xl group-hover:bg-cyan-500/20 transition-all pointer-events-none" />
              <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                <span>PENDING QUEUE</span>
                <Clock className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black text-cyan-300 font-mono">{metrics.pending}</span>
                <span className="text-[11px] text-slate-400">Awaiting checkoff</span>
              </div>
            </div>

            {/* Critical Overdue Alert */}
            <div className={`p-4 rounded-2xl bg-[#0D121F]/90 border relative overflow-hidden group shadow-lg ${
              metrics.overdue > 0
                ? 'border-rose-500/50 shadow-rose-950/40'
                : 'border-slate-800 shadow-slate-950/20'
            }`}>
              <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                <span>OVERDUE ALERT</span>
                <AlertTriangle className={`w-4 h-4 ${metrics.overdue > 0 ? 'text-rose-400 animate-bounce' : 'text-slate-500'}`} />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className={`text-2xl sm:text-3xl font-black font-mono ${metrics.overdue > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                  {metrics.overdue}
                </span>
                <span className="text-[11px] text-slate-400">Requires attention</span>
              </div>
            </div>

          </div>

          {/* 2. SMART OMNIBAR (ULTRA-FAST NATURAL LANGUAGE ASSIGNMENT) */}
          <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-b from-[#0F1424] to-[#0A0D18] border border-indigo-500/30 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-indigo-500/20">
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-300 uppercase tracking-wider">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span>Fast Smart Omnibar (Natural Text / Voice Input)</span>
              </div>
              <span className="text-[11px] font-mono text-slate-400 hidden sm:inline">
                Supports: <code className="text-cyan-400 font-bold">@User1</code> <code className="text-indigo-400 font-bold">#Tag</code> <code className="text-amber-400 font-bold">tomorrow</code>
              </span>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-3.5">
              
              {/* Primary Omnibar Input */}
              <div className="relative">
                <input
                  type="text"
                  value={omnibarText}
                  onChange={handleOmnibarChange}
                  placeholder="e.g. Insurance renewal for AP04 fleet by tomorrow @User1 #Compliance #Fleet"
                  className="w-full py-3.5 pl-4 pr-12 bg-[#06080F] border border-indigo-500/40 rounded-2xl text-white placeholder-slate-500 text-sm sm:text-base font-medium focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 shadow-inner"
                  required
                />
                <button
                  type="submit"
                  disabled={creating || !omnibarText.trim()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-400 text-slate-950 font-black hover:brightness-110 active:scale-95 transition-all disabled:opacity-40 cursor-pointer shadow-md"
                  title="Assign Task"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>

              {/* Dynamic Task Controls Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 text-xs">
                
                {/* Assignee Selector with Custom Aliases */}
                <div className="sm:col-span-1">
                  <label className="block text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Assignee
                  </label>
                  <div className="relative">
                    <select
                      value={selectedAssignee}
                      onChange={(e) => setSelectedAssignee(e.target.value)}
                      className="w-full p-2.5 bg-[#06080F] border border-slate-700/80 rounded-xl text-white font-medium text-xs focus:outline-none focus:border-indigo-500 cursor-pointer appearance-none"
                    >
                      {roster
                        .filter((u) => u.role !== 'admin')
                        .map((u) => (
                          <option key={u.user_id} value={u.user_id}>
                            {u.custom_alias || u.full_name} ({u.full_name})
                          </option>
                        ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* Due Date Selector */}
                <div>
                  <label className="block text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={selectedDueDate}
                    onChange={(e) => setSelectedDueDate(e.target.value)}
                    className="w-full p-2 bg-[#06080F] border border-slate-700/80 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Priority Selector */}
                <div>
                  <label className="block text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Priority
                  </label>
                  <select
                    value={selectedPriority}
                    onChange={(e) => setSelectedPriority(e.target.value as TaskPriority)}
                    className="w-full p-2.5 bg-[#06080F] border border-slate-700/80 rounded-xl text-white font-bold text-xs focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="normal">🟡 Normal</option>
                    <option value="high">🟠 High</option>
                    <option value="critical">🔴 Critical</option>
                    <option value="low">🔵 Low</option>
                  </select>
                </div>

                {/* Custom Quick Tag Input */}
                <div>
                  <label className="block text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Add Tags
                  </label>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddTag(tagInput);
                        }
                      }}
                      placeholder="#Tag + Enter"
                      className="w-full p-2 bg-[#06080F] border border-slate-700/80 rounded-xl text-white text-xs placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddTag(tagInput)}
                      className="px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold text-xs"
                    >
                      +
                    </button>
                  </div>
                </div>

              </div>

              {/* Quick Tag Chips & Presets */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[11px] font-mono text-slate-500 mr-1">Quick Presets:</span>
                {['#Fleet', '#Maintenance', '#Bank', '#Compliance', '#Logistics', '#ClientVisit'].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handleAddTag(preset)}
                    className="px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold bg-indigo-950/40 text-indigo-300 border border-indigo-500/30 hover:border-cyan-400 transition-colors"
                  >
                    {preset}
                  </button>
                ))}

                {activeTags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold bg-cyan-950/50 text-cyan-300 border border-cyan-400/40 flex items-center gap-1"
                  >
                    #{tag}
                    <button type="button" onClick={() => handleRemoveTag(tag)} className="hover:text-rose-400">
                      ×
                    </button>
                  </span>
                ))}
              </div>

            </form>
          </div>

          {/* 3. MASTER OPERATIONS PIPELINE (TASK LIST) */}
          <div className="space-y-3">
            
            {/* Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-2 border-b border-slate-800">
              
              {/* Status Filter Tabs */}
              <div className="flex items-center gap-1 bg-[#0A0E18] border border-slate-800 rounded-xl p-1 text-xs">
                <button
                  type="button"
                  onClick={() => setFilterStatus('all')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all ${
                    filterStatus === 'all' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  All ({tasks.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterStatus('pending')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all ${
                    filterStatus === 'pending' ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Pending ({metrics.pending})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterStatus('overdue')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all ${
                    filterStatus === 'overdue' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Overdue ({metrics.overdue})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterStatus('completed')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all ${
                    filterStatus === 'completed' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Completed ({metrics.completed})
                </button>
              </div>

              {/* Worker & Search Controls */}
              <div className="flex items-center gap-2">
                <select
                  value={filterUser}
                  onChange={(e) => setFilterUser(e.target.value)}
                  className="px-2.5 py-1.5 bg-[#0A0E18] border border-slate-800 rounded-xl text-xs text-slate-300 font-medium"
                >
                  <option value="all">All Frontline Workers</option>
                  {roster
                    .filter((u) => u.role !== 'admin')
                    .map((u) => (
                      <option key={u.user_id} value={u.user_id}>
                        {u.custom_alias || u.full_name}
                      </option>
                    ))}
                </select>

                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search tasks..."
                    className="py-1.5 pl-8 pr-3 bg-[#0A0E18] border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-36 sm:w-48"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>

                <button
                  type="button"
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition-colors"
                  title="Refresh tasks"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-cyan-400' : ''}`} />
                </button>
              </div>

            </div>

            {/* Task Cards Grid */}
            {loading ? (
              <div className="py-16 text-center text-slate-500 font-mono text-xs flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
                <span>Loading operational pipeline...</span>
              </div>
            ) : filteredTasks.length === 0 ? (
              <div className="py-16 text-center rounded-3xl bg-[#090D17]/80 border border-slate-800/80 p-8 space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                <h4 className="text-sm font-bold text-white">All Clear in this View</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  No operational tasks match your selected filters. Use the Omnibar above to assign new tasks.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {filteredTasks.map((t) => {
                  const todayStr = new Date().toISOString().split('T')[0];
                  const isOverdue = t.status === 'pending' && t.due_date < todayStr;
                  const isDone = t.status === 'completed';

                  return (
                    <div
                      key={t.id}
                      className={`p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-3 ${
                        isDone
                          ? 'bg-[#0A101C]/70 border-emerald-500/25'
                          : isOverdue
                          ? 'bg-[#150B10]/80 border-rose-500/40 shadow-lg shadow-rose-950/20'
                          : 'bg-[#0C101C]/90 border-slate-800/90 hover:border-indigo-500/40 shadow-md'
                      }`}
                    >
                      {/* Card Header: Assignee + Priority Badge */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-indigo-950/50 border border-indigo-500/30 text-indigo-300 text-[11px] font-mono font-bold truncate max-w-[65%]">
                          <User className="w-3 h-3 text-cyan-400 shrink-0" />
                          <span className="truncate">{t.assignee_alias || t.assignee_name}</span>
                        </span>

                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider ${
                            t.priority === 'critical'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse'
                              : t.priority === 'high'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              : 'bg-slate-800 text-slate-300 border border-slate-700'
                          }`}
                        >
                          {t.priority}
                        </span>
                      </div>

                      {/* Card Body: Title & Tags */}
                      <div>
                        <h4 className={`text-sm font-bold tracking-tight ${isDone ? 'line-through text-slate-400' : 'text-white'}`}>
                          {t.task_title}
                        </h4>
                        {t.description && (
                          <p className="mt-1 text-xs text-slate-400 line-clamp-2 leading-relaxed">
                            {t.description}
                          </p>
                        )}

                        {t.tags && t.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {t.tags.map((tag) => (
                              <span key={tag} className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-slate-900 border border-slate-800 text-slate-400">
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Card Footer: Due Date / Completed Timestamp & Actions */}
                      <div className="pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs">
                        
                        {/* Status Timestamp */}
                        <div>
                          {isDone ? (
                            <span className="text-emerald-400 font-mono text-[11px] flex items-center gap-1 font-bold">
                              <Check className="w-3 h-3" />
                              <span>Done: {t.completed_at ? t.completed_at.split('T')[0] : 'Completed'}</span>
                            </span>
                          ) : isOverdue ? (
                            <span className="text-rose-400 font-mono text-[11px] font-bold flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span>Overdue ({t.due_date})</span>
                            </span>
                          ) : (
                            <span className="text-slate-400 font-mono text-[11px] flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-indigo-400" />
                              <span>Due: {t.due_date}</span>
                            </span>
                          )}
                        </div>

                        {/* Admin Action Buttons */}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(t)}
                            className="p-1 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-slate-800 transition-colors"
                            title="Edit Task"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteTask(t.id, t.task_title)}
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                            title="Delete Task"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                      </div>

                    </div>
                  );
                })}
              </div>
            )}

          </div>

        </div>
      ) : (
        
        /* VIEW 2: 10-USER CREDENTIAL VAULT & CUSTOM ALIAS MANAGER */
        <div className="flex-1 w-full max-w-5xl mx-auto p-3.5 sm:p-6 space-y-5">
          
          <div className="flex items-center justify-between border-b border-indigo-500/20 pb-4">
            <div>
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <User className="w-5 h-5 text-indigo-400" />
                <span>10-User Credential Vault & Custom Alias Roster</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Admin view of all 10 accounts with visible passwords, 1-tap copy, and inline editable driver/worker names.
              </p>
            </div>
            <button
              type="button"
              onClick={handleRefresh}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-bold flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-cyan-400' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>

          {/* User Vault Table */}
          <div className="border border-indigo-500/20 rounded-2xl overflow-hidden bg-[#0A0E1A]/90 shadow-2xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#050811] border-b border-indigo-500/20 text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="py-3 px-4">System Identity</th>
                  <th className="py-3 px-4">Custom Name / Alias (Editable)</th>
                  <th className="py-3 px-4">Login Email</th>
                  <th className="py-3 px-4">Password</th>
                  <th className="py-3 px-4 text-center">Save Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 font-medium">
                {roster.map((u) => {
                  const isAdmin = u.role === 'admin';
                  const currentAlias = editingAlias[u.user_id] ?? (u.custom_alias || u.full_name);
                  const isVisible = showPasswords[u.user_id];
                  const rawPwd = u.cached_password_hint || '********';

                  return (
                    <tr key={u.user_id} className="hover:bg-slate-800/40 transition-colors">
                      
                      {/* Identity */}
                      <td className="py-3.5 px-4 font-bold text-white whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-lg text-[11px] font-mono ${
                          isAdmin ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                        }`}>
                          {u.full_name}
                        </span>
                      </td>

                      {/* Custom Name / Alias (Inline Editable by Admin) */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 max-w-xs">
                          <input
                            type="text"
                            value={currentAlias}
                            onChange={(e) => setEditingAlias({ ...editingAlias, [u.user_id]: e.target.value })}
                            onBlur={() => handleSaveAlias(u.user_id)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveAlias(u.user_id);
                            }}
                            placeholder="e.g. Ramesh (AP04 Driver)"
                            className="w-full px-2.5 py-1.5 bg-[#06080F] border border-slate-700/80 rounded-lg text-white font-bold text-xs focus:outline-none focus:border-cyan-400"
                          />
                        </div>
                      </td>

                      {/* Email */}
                      <td className="py-3 px-4 font-mono text-slate-300 whitespace-nowrap">
                        {u.email}
                      </td>

                      {/* Password (Visible with Eye Toggle + Copy) */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 bg-[#06080F] px-2.5 py-1 rounded-lg border border-slate-700/80 w-fit">
                          <span className="font-mono text-xs font-bold text-amber-300 min-w-[80px]">
                            {isVisible ? rawPwd : '••••••••••••'}
                          </span>
                          <button
                            type="button"
                            onClick={() => togglePasswordVisibility(u.user_id)}
                            className="p-1 text-slate-400 hover:text-white"
                            title={isVisible ? 'Hide password' : 'Show password'}
                          >
                            {isVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCopyPassword(u.user_id, rawPwd)}
                            className="p-1 text-slate-400 hover:text-cyan-400"
                            title="Copy password"
                          >
                            {copiedUser === u.user_id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Save Status Indicator */}
                      <td className="py-3 px-4 text-center">
                        {savingAlias[u.user_id] ? (
                          <span className="text-[10px] text-cyan-400 font-mono">Saving...</span>
                        ) : aliasSavedSuccess[u.user_id] ? (
                          <span className="text-[10px] text-emerald-400 font-mono font-bold flex items-center justify-center gap-1">
                            <Check className="w-3 h-3" /> Saved
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-500 font-mono">Auto-saved</span>
                        )}
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* EDIT TASK MODAL */}
      {editingTask && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#0D1220] border border-indigo-500/40 p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-indigo-500/20">
              <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
                <Edit2 className="w-4 h-4 text-cyan-400" />
                <span>Edit Operational Task</span>
              </h3>
              <button type="button" onClick={() => setEditingTask(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-bold mb-1">Task Title</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full p-2.5 bg-[#06080F] border border-slate-700 rounded-xl text-white font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">Assignee</label>
                <select
                  value={editAssignee}
                  onChange={(e) => setEditAssignee(e.target.value)}
                  className="w-full p-2.5 bg-[#06080F] border border-slate-700 rounded-xl text-white font-bold"
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
                  <label className="block text-slate-400 font-bold mb-1">Due Date</label>
                  <input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full p-2 bg-[#06080F] border border-slate-700 rounded-xl text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Priority</label>
                  <select
                    value={editPriority}
                    onChange={(e) => setEditPriority(e.target.value as TaskPriority)}
                    className="w-full p-2 bg-[#06080F] border border-slate-700 rounded-xl text-white font-bold"
                  >
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">Remarks / Details</label>
                <textarea
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  rows={2}
                  className="w-full p-2.5 bg-[#06080F] border border-slate-700 rounded-xl text-white"
                  placeholder="Optional details..."
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setEditingTask(null)}
                className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={savingEdit}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-400 text-slate-950 font-bold text-xs"
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
