import { getSupabaseClient } from '../../shared/api/supabase';

export type RouteMemberStatus = 'participating' | 'unanswered' | 'declined';
export type RouteMemberRole = 'owner' | 'member';

export type RouteMember = {
  id: string;
  routeId: string;
  userId: string;
  displayName: string;
  role: RouteMemberRole;
  status: RouteMemberStatus;
  createdAt: string;
};

const columns = 'id,route_id,user_id,display_name,role,status,created_at';

function requireSupabase() {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabaseの環境変数が設定されていません。');
  return supabase;
}

function mapMember(row: any): RouteMember {
  return {
    id: row.id, routeId: row.route_id, userId: row.user_id,
    displayName: row.display_name || 'メンバー',
    role: row.role, status: row.status, createdAt: row.created_at,
  };
}

export async function listRouteMembers(routeId: string): Promise<RouteMember[]> {
  const { data, error } = await requireSupabase()
    .from('route_members').select(columns).eq('route_id', routeId)
    .order('role', { ascending: true }).order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapMember);
}


export async function inviteRouteMemberByLoginId(routeId: string, loginId: string): Promise<RouteMember> {
  const normalizedLoginId = loginId.trim().toLowerCase();
  if (!normalizedLoginId) throw new Error('招待するログインIDを入力してください。');

  const supabase = requireSupabase();
  const { data, error } = await supabase.rpc('invite_route_member_by_login_id', {
    p_route_id: routeId,
    p_login_id: normalizedLoginId,
  });
  if (error) throw error;

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error('招待結果を確認できませんでした。');
  return mapMember(row);
}
