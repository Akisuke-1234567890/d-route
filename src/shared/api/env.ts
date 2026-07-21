export type AppEnvironment = 'development' | 'staging' | 'production';

const url = import.meta.env.VITE_SUPABASE_URL?.trim() ?? '';
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? '';

export const env = {
  appEnvironment: (import.meta.env.VITE_APP_ENV ?? 'development') as AppEnvironment,
  supabaseUrl: url,
  supabaseAnonKey: anonKey,
  hasSupabaseConfig: Boolean(url && anonKey)
} as const;
