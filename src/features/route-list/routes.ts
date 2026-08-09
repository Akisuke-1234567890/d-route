import { getSupabaseClient } from '../../shared/api/supabase';

export type RouteSummary = {
  id: string;
  owner_user_id: string;
  name: string;
  description: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

const routeSummaryColumns = 'id,owner_user_id,name,description,status,created_at,updated_at';

export async function listRoutes(status: 'active' | 'archived' = 'active'): Promise<RouteSummary[]> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabaseの環境変数が設定されていません。');

  const { data, error } = await supabase.rpc('list_my_routes', {
    p_status: status,
  });

  if (error) throw error;
  return (data ?? []) as RouteSummary[];
}


export async function getRoute(id: string): Promise<RouteSummary> {
  const normalizedId = id.trim();
  if (!normalizedId) throw new Error('Route IDを確認できませんでした。');

  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabaseの環境変数が設定されていません。');

  const { data, error } = await supabase
    .from('routes')
    .select(routeSummaryColumns)
    .eq('id', normalizedId)
    .is('deleted_at', null)
    .single();

  if (error) throw error;
  return data as RouteSummary;
}

export async function createRoute(name: string, description = ''): Promise<RouteSummary> {
  const normalizedName = name.trim();
  const normalizedDescription = description.trim();

  if (!normalizedName) throw new Error('Route名を入力してください。');
  if (normalizedName.length > 60) throw new Error('Route名は60文字以内で入力してください。');
  if (normalizedDescription.length > 200) throw new Error('説明は200文字以内で入力してください。');

  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabaseの環境変数が設定されていません。');

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!authData.user) throw new Error('ログイン情報を確認できませんでした。再度ログインしてください。');

  const { data, error } = await supabase
    .from('routes')
    .insert({
      owner_user_id: authData.user.id,
      name: normalizedName,
      description: normalizedDescription || null,
    })
    .select(routeSummaryColumns)
    .single();

  if (error) throw error;
  return data as RouteSummary;
}


export async function deleteOwnedRoute(routeId: string): Promise<void> {
  const normalizedId = routeId.trim();
  if (!normalizedId) throw new Error('Route IDを確認できませんでした。');

  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabaseの環境変数が設定されていません。');

  const { error } = await supabase.rpc('delete_owned_route', {
    p_route_id: normalizedId,
  });

  if (error) throw error;
}


export async function updateOwnedRouteSettings(
  routeId: string,
  input: { name: string; description: string }
): Promise<RouteSummary> {
  const normalizedId = routeId.trim();
  const normalizedName = input.name.trim();
  const normalizedDescription = input.description.trim();

  if (!normalizedId) throw new Error('Route IDを確認できませんでした。');
  if (!normalizedName) throw new Error('Route名を入力してください。');
  if (normalizedName.length > 60) throw new Error('Route名は60文字以内で入力してください。');
  if (normalizedDescription.length > 200) throw new Error('説明は200文字以内で入力してください。');

  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabaseの環境変数が設定されていません。');

  const { data, error } = await supabase.rpc('update_owned_route_settings', {
    p_route_id: normalizedId,
    p_name: normalizedName,
    p_description: normalizedDescription || null,
  });

  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error('Route設定の保存結果を確認できませんでした。');
  return row as RouteSummary;
}


export async function duplicateOwnedRoute(routeId: string, name: string): Promise<RouteSummary> {
  const normalizedId = routeId.trim();
  const normalizedName = name.trim();

  if (!normalizedId) throw new Error('Route IDを確認できませんでした。');
  if (!normalizedName) throw new Error('複製後のRoute名を入力してください。');
  if (normalizedName.length > 60) throw new Error('Route名は60文字以内で入力してください。');

  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabaseの環境変数が設定されていません。');

  const { data, error } = await supabase.rpc('duplicate_owned_route', {
    p_route_id: normalizedId,
    p_name: normalizedName,
  });

  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error('複製したRouteを確認できませんでした。');
  return row as RouteSummary;
}

export type BuiltInTemplateKey = 'touring' | 'day_drive' | 'day_trip' | 'event';

export async function createRouteFromBuiltInTemplate(
  templateKey: BuiltInTemplateKey,
  name: string,
  description = ''
): Promise<RouteSummary> {
  const normalizedName = name.trim();
  const normalizedDescription = description.trim();

  if (!normalizedName) throw new Error('新しいRoute名を入力してください。');
  if (normalizedName.length > 60) throw new Error('Route名は60文字以内で入力してください。');
  if (normalizedDescription.length > 200) throw new Error('説明は200文字以内で入力してください。');

  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabaseの環境変数が設定されていません。');

  const { data, error } = await supabase.rpc('create_route_from_builtin_template', {
    p_template_key: templateKey,
    p_name: normalizedName,
    p_description: normalizedDescription || null,
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error('作成したRouteを確認できませんでした。');
  return row as RouteSummary;
}


export async function setOwnedRouteArchived(routeId: string, archived: boolean): Promise<RouteSummary> {
  const normalizedId = routeId.trim();
  if (!normalizedId) throw new Error('Route IDを確認できませんでした。');

  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabaseの環境変数が設定されていません。');

  const { data, error } = await supabase.rpc('set_owned_route_archived', {
    p_route_id: normalizedId,
    p_archived: archived,
  });

  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error('Routeの状態を確認できませんでした。');
  return row as RouteSummary;
}
