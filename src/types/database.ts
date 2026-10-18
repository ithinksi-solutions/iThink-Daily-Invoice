export type UserRole = 'admin' | 'collector';
export type LanguagePreference = 'en' | 'te';
export type BusinessName = 'STAR' | 'ARBO PLAST';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  language_preference: LanguagePreference;
  created_at: string;
  updated_at: string;
}

export interface DailySheet {
  id: string;
  sheet_date: string;
  collector_id: string;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Entry {
  id: string;
  sheet_id: string;
  collector_id: string;
  dealer_name: string;
  cash_amount: number;
  phonepe_amount: number;
  total_collected: number;
  balance_owed: number | null;
  note: string | null;
  image_url: string | null;
  business_name: BusinessName;
  status: 'approved' | 'draft' | 'submitted';
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  updated_by?: string | null;
  deleted_at?: string | null;
  deleted_by?: string | null;
  collector_name?: string;
}

export interface EntryAuditLog {
  id: string;
  entry_id: string;
  action: 'UPDATE' | 'DELETE';
  changed_by: string;
  changed_at: string;
  old_values: Partial<Entry>;
  new_values: Partial<Entry> | null;
  reason: string | null;
  changer_name?: string;
}

export interface CollectorDailySummary {
  collector_id: string;
  collector_name: string;
  sheet_id: string;
  total_cash: number;
  total_phonepe: number;
  grand_total: number;
  entry_count: number;
  entries: Entry[];
}
