import { getSupabaseClient } from '../../shared/api/supabase';

export type RouteSummary = {
  id: string;
  name: string;
  status: string;
  created_at: string;
  updated_at: string;
};

const routeSummaryColumns = 'id,name,status,created_at,updated_at';

export async function listRoutes(): Promise<RouteSummary[]> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabaseの環境変数が設定されていません。');

  const { data, error } = await supabase
    .from('routes')
    .select(routeSummaryColumns)
    .is('deleted_at', null)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as RouteSummary[];
}

export async function createRoute(name: string): Promise<RouteSummary> {
  const normalizedName = name.trim();
  if (!normalizedName) throw new Error('Route名を入力してください。');

  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabaseの環境変数が設定されていません。');

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!authData.user) throw new Error('ログイン情報を確認できませんでした。再度ログインしてください。');

  const { data, error } = await supabase
    .from('routes')
    .insert({
      owner_user_id: authData.user.id,
      name: normalizedName
    })
    .select(routeSummaryColumns)
    .single();

  if (error) throw error;
  return data as RouteSummary;
}
