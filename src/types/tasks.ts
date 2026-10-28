export type TaskPriority = 'low' | 'normal' | 'high' | 'critical';
export type TaskStatus = 'pending' | 'completed' | 'cancelled';

export interface EnterpriseTask {
  id: string;
  task_title: string;
  description: string | null;
  assigned_to: string;
  created_by: string | null;
  due_date: string; // YYYY-MM-DD
  due_time: string | null; // HH:mm
  priority: TaskPriority;
  tags: string[];
  status: TaskStatus;
  completed_at: string | null;
  completed_note: string | null;
  proof_image_url: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  assignee_name?: string;
  assignee_alias?: string;
  assignee_email?: string;
}

export interface UserRosterMetadata {
  user_id: string;
  custom_alias: string | null;
  department: string | null;
  phone_number: string | null;
  assigned_vehicle: string | null;
  cached_password_hint: string | null;
  updated_at: string;
  // Joined from profiles
  full_name?: string;
  email?: string;
  role?: string;
}

export interface OmnibarParsedResult {
  title: string;
  assigneeUserId?: string;
  dueDate: string;
  priority: TaskPriority;
  tags: string[];
}
