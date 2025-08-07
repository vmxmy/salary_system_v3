import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import { createMonitoredSupabase, performanceMonitor } from '@/services/performance-monitor.service';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: window.localStorage,
      debug: process.env.NODE_ENV === 'development', // Enable debug in development
    },
    global: {
      headers: {
        'x-application-name': 'salary-system',
      },
    },
    db: {
      schema: 'public',
    },
  }
);

// Log initialization
console.log('[Supabase] Client initialized with URL:', supabaseUrl);

// Initialize performance monitoring in development mode
// Temporarily disabled to debug authentication issues
// if (process.env.NODE_ENV === 'development') {
//   createMonitoredSupabase();
// }

// Auth helpers
export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  if (error) throw error;
  return data;
};

export const signUp = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  
  if (error) throw error;
  return data;
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  return user;
};

export const getSession = async () => {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) throw error;
  return session;
};

// Real-time subscription helper
export const subscribeToTable = <T>(
  tableName: string,
  callback: (payload: any) => void
) => {
  return supabase
    .channel(`public:${tableName}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: tableName },
      callback
    )
    .subscribe();
};