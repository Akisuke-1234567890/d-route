import { getSupabaseClient } from '../../shared/api/supabase';

export type RouteBranch = {
  id: string;
  routeId: string;
  name: string;
  colorKey: string;
  status: 'active' | 'merged' | 'archived';
  orderValue: number;
};

export type RouteBranchAssignment = {
  routeId: string;
  branchId: string;
  memberUserId: string;
  assignedAt: string;
};

const branchColumns = 'id,route_id,name,color_key,status,order_value';
const assignmentColumns = 'route_id,branch_id,member_user_id,assigned_at';

function requireSupabase() {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabaseの環境変数が設定されていません。');
  return supabase;
}

function mapBranch(row: any): RouteBranch {
  return { id: row.id, routeId: row.route_id, name: row.name, colorKey: row.color_key, status: row.status, orderValue: Number(row.order_value) };
}

function mapAssignment(row: any): RouteBranchAssignment {
  return { routeId: row.route_id, branchId: row.branch_id, memberUserId: row.member_user_id, assignedAt: row.assigned_at };
}

export async function listRouteBranches(routeId: string): Promise<RouteBranch[]> {
  const { data, error } = await requireSupabase().from('route_branches').select(branchColumns)
    .eq('route_id', routeId).eq('status', 'active').order('order_value', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapBranch);
}

export async function listRouteBranchAssignments(routeId: string): Promise<RouteBranchAssignment[]> {
  const { data, error } = await requireSupabase().from('route_branch_members').select(assignmentColumns).eq('route_id', routeId);
  if (error) throw error;
  return (data ?? []).map(mapAssignment);
}

export async function createRouteBranch(routeId: string, name: string): Promise<RouteBranch> {
  const { data, error } = await requireSupabase().rpc('create_route_branch', { p_route_id: routeId, p_name: name.trim() });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error('Branch作成結果を確認できませんでした。');
  return mapBranch(row);
}

export async function assignMemberToBranch(routeId: string, branchId: string, memberUserId: string): Promise<RouteBranchAssignment> {
  const { data, error } = await requireSupabase().rpc('assign_route_member_to_branch', {
    p_route_id: routeId, p_branch_id: branchId, p_member_user_id: memberUserId,
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error('Branch割り振り結果を確認できませんでした。');
  return mapAssignment(row);
}

export async function clearMemberBranch(routeId: string, memberUserId: string): Promise<void> {
  const { error } = await requireSupabase().rpc('clear_route_member_branch', { p_route_id: routeId, p_member_user_id: memberUserId });
  if (error) throw error;
}
