import { supabase } from './supabase';
import { EnterpriseTask, UserRosterMetadata, OmnibarParsedResult, TaskPriority } from '../types/tasks';

export const taskService = {
  // 1. Fetch all tasks with assignee aliases for Admin
  async getAllTasks(): Promise<{ data: EnterpriseTask[]; error: any }> {
    try {
      const { data: tasks, error } = await supabase
        .from('enterprise_tasks')
        .select('*')
        .order('due_date', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch profiles & aliases for joining
      const { data: profiles } = await supabase.from('profiles').select('id, full_name, email');
      const { data: metadata } = await supabase.from('user_roster_metadata').select('user_id, custom_alias');

      const profileMap = new Map((profiles || []).map((p) => [p.id, p]));
      const aliasMap = new Map((metadata || []).map((m) => [m.user_id, m.custom_alias]));

      const enriched: EnterpriseTask[] = (tasks || []).map((t) => {
        const p = profileMap.get(t.assigned_to);
        return {
          ...t,
          assignee_name: p?.full_name || 'Unassigned',
          assignee_email: p?.email || '',
          assignee_alias: aliasMap.get(t.assigned_to) || p?.full_name || 'Worker',
        };
      });

      return { data: enriched, error: null };
    } catch (err: any) {
      console.error('Failed to get all tasks:', err);
      return { data: [], error: err };
    }
  },

  // 2. Fetch isolated personal tasks for Frontline Worker
  async getMyTasks(userId: string): Promise<{ data: EnterpriseTask[]; error: any }> {
    try {
      const { data, error } = await supabase
        .from('enterprise_tasks')
        .select('*')
        .eq('assigned_to', userId)
        .order('due_date', { ascending: true })
        .order('status', { ascending: false });

      if (error) throw error;
      return { data: (data as EnterpriseTask[]) || [], error: null };
    } catch (err: any) {
      console.error('Failed to get my tasks:', err);
      return { data: [], error: err };
    }
  },

  // 3. Create Task (Admin only)
  async createTask(params: {
    task_title: string;
    description?: string;
    assigned_to: string;
    due_date: string;
    due_time?: string;
    priority?: TaskPriority;
    tags?: string[];
  }): Promise<{ data: EnterpriseTask | null; error: any }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('enterprise_tasks')
        .insert({
          task_title: params.task_title.trim(),
          description: params.description?.trim() || null,
          assigned_to: params.assigned_to,
          created_by: user?.id || null,
          due_date: params.due_date,
          due_time: params.due_time || '18:00',
          priority: params.priority || 'normal',
          tags: params.tags || [],
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (err: any) {
      return { data: null, error: err };
    }
  },

  // 4. Toggle Task Completion (Worker or Admin)
  async toggleTaskCompletion(taskId: string, isCompleted: boolean, note?: string): Promise<{ error: any }> {
    try {
      const { error } = await supabase
        .from('enterprise_tasks')
        .update({
          status: isCompleted ? 'completed' : 'pending',
          completed_at: isCompleted ? new Date().toISOString() : null,
          completed_note: note?.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', taskId);

      if (error) throw error;
      return { error: null };
    } catch (err: any) {
      return { error: err };
    }
  },

  // 5. Update Task Details (Admin)
  async updateTask(taskId: string, updates: Partial<EnterpriseTask>): Promise<{ error: any }> {
    try {
      const { error } = await supabase
        .from('enterprise_tasks')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', taskId);

      if (error) throw error;
      return { error: null };
    } catch (err: any) {
      return { error: err };
    }
  },

  // 6. Delete Task (Admin)
  async deleteTask(taskId: string): Promise<{ error: any }> {
    try {
      const { error } = await supabase
        .from('enterprise_tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;
      return { error: null };
    } catch (err: any) {
      return { error: err };
    }
  },

  // 7. Fetch full 10-User Roster & Password Cache for Admin
  async getUserRoster(): Promise<{ data: UserRosterMetadata[]; error: any }> {
    try {
      const { data: profiles, error: pError } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name', { ascending: true });

      if (pError) throw pError;

      const { data: meta, error: mError } = await supabase
        .from('user_roster_metadata')
        .select('*');

      if (mError) throw mError;

      const metaMap = new Map((meta || []).map((m) => [m.user_id, m]));

      const combined: UserRosterMetadata[] = (profiles || []).map((p) => {
        const m = metaMap.get(p.id);
        return {
          user_id: p.id,
          full_name: p.full_name,
          email: p.email,
          role: p.role,
          custom_alias: m?.custom_alias || p.full_name,
          department: m?.department || null,
          phone_number: m?.phone_number || null,
          assigned_vehicle: m?.assigned_vehicle || null,
          cached_password_hint: m?.cached_password_hint || '********',
          updated_at: m?.updated_at || p.updated_at,
        };
      });

      return { data: combined, error: null };
    } catch (err: any) {
      console.error('Failed to get user roster:', err);
      return { data: [], error: err };
    }
  },

  // 8. Update User Custom Alias (Admin inline edit)
  async updateUserAlias(userId: string, alias: string): Promise<{ error: any }> {
    try {
      const { error } = await supabase
        .from('user_roster_metadata')
        .upsert({
          user_id: userId,
          custom_alias: alias.trim(),
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;
      return { error: null };
    } catch (err: any) {
      return { error: err };
    }
  },

  // 9. Smart Omnibar Parser (Natural Language detection)
  parseNaturalLanguageTask(input: string, roster: UserRosterMetadata[]): OmnibarParsedResult {
    let cleanText = input;
    let priority: TaskPriority = 'normal';
    const tags: string[] = [];
    let assigneeUserId: string | undefined = undefined;

    // Detect priority: #urgent, #critical, #high, #low
    if (/#(critical|urgent)/i.test(cleanText)) {
      priority = 'critical';
      cleanText = cleanText.replace(/#(critical|urgent)/gi, '');
    } else if (/#high/i.test(cleanText)) {
      priority = 'high';
      cleanText = cleanText.replace(/#high/gi, '');
    } else if (/#low/i.test(cleanText)) {
      priority = 'low';
      cleanText = cleanText.replace(/#low/gi, '');
    }

    // Extract hashtags: #Fleet, #Bank, #Audit, etc.
    const hashMatches = cleanText.match(/#([a-zA-Z0-9_-]+)/g);
    if (hashMatches) {
      hashMatches.forEach((h) => tags.push(h.replace('#', '')));
      cleanText = cleanText.replace(/#[a-zA-Z0-9_-]+/g, '');
    }

    // Detect Assignee: @User1, @User2, or by alias
    const atMatch = cleanText.match(/@([a-zA-Z0-9_-]+)/i);
    if (atMatch) {
      const handle = atMatch[1].toLowerCase();
      cleanText = cleanText.replace(atMatch[0], '');
      const found = roster.find(
        (u) =>
          u.full_name?.toLowerCase().includes(handle) ||
          u.custom_alias?.toLowerCase().includes(handle) ||
          u.email?.toLowerCase().includes(handle)
      );
      if (found) assigneeUserId = found.user_id;
    }

    // Detect Due Date: "today", "tomorrow"
    const today = new Date();
    let targetDate = today.toISOString().split('T')[0];

    if (/\btomorrow\b/i.test(cleanText)) {
      const tmrw = new Date();
      tmrw.setDate(tmrw.getDate() + 1);
      targetDate = tmrw.toISOString().split('T')[0];
      cleanText = cleanText.replace(/\btomorrow\b/gi, '');
    } else if (/\btoday\b/i.test(cleanText)) {
      cleanText = cleanText.replace(/\btoday\b/gi, '');
    }

    // Clean remaining punctuation & extra spaces
    cleanText = cleanText.trim().replace(/^[-–—:,.\s]+|[-–—:,.\s]+$/g, '');

    return {
      title: cleanText || input.trim(),
      assigneeUserId,
      dueDate: targetDate,
      priority,
      tags,
    };
  },
};
