import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://tgfhgyqlbmpjmlnijggf.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRnZmhneXFsYm1wam1sbmlqZ2dmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIzMDQxMzcsImV4cCI6MjEwNzg4MDEzN30.272zMIr9IxrTgBPeq3-zNe-RlAUJHQI_skyrKAZ6d38';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
