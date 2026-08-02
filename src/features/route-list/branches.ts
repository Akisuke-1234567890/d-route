import { getSupabaseClient } from '../../shared/api/supabase';

export type AlternateRouteConnectionType = 'split_merge' | 'join' | 'leave';

export type RouteBranch = {
  id: string;
  routeId: string;
  name: string;
  colorKey: string;
  status: 'active' | 'merged' | 'archived';
  orderValue: number;
  connectionType: AlternateRouteConnectionType | null;
  startDestinationId: string | null;
  endDestinationId: string | null;
  description: string;
};

export type RouteBranchAssignment = {
  routeId: string;
  branchId: string;
  memberUserId: string;
  assignedAt: string;
};

export type AlternateRouteInput = {
  routeId: string;
  name: string;
  connectionType: AlternateRouteConnectionType;
  startDestinationId?: string | null;
  endDestinationId?: string | null;
  description?: string;
};

const branchColumns = [
  'id', 'route_id', 'name', 'color_key', 'status', 'order_value',
  'connection_type', 'start_destination_id', 'end_destination_id', 'description',
].join(',');
const assignmentColumns = 'route_id,branch_id,member_user_id,assigned_at';

function requireSupabase() {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabaseの環境変数が設定されていません。');
  return supabase;
}

function mapBranch(row: any): RouteBranch {
  return {
    id: row.id,
    routeId: row.route_id,
    name: row.name,
    colorKey: row.color_key,
    status: row.status,
    orderValue: Number(row.order_value),
    connectionType: row.connection_type ?? null,
    startDestinationId: row.start_destination_id ?? null,
    endDestinationId: row.end_destination_id ?? null,
    description: row.description ?? '',
  };
}

function mapAssignment(row: any): RouteBranchAssignment {
  return { routeId: row.route_id, branchId: row.branch_id, memberUserId: row.member_user_id, assignedAt: row.assigned_at };
}

function rpcInput(input: AlternateRouteInput) {
  return {
    p_route_id: input.routeId,
    p_name: input.name.trim(),
    p_connection_type: input.connectionType,
    p_start_destination_id: input.startDestinationId ?? null,
    p_end_destination_id: input.endDestinationId ?? null,
    p_description: input.description?.trim() ?? '',
  };
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

// Kept for p68 compatibility. This creates an unconfigured draft Branch.
export async function createRouteBranch(routeId: string, name: string): Promise<RouteBranch> {
  const { data, error } = await requireSupabase().rpc('create_route_branch', { p_route_id: routeId, p_name: name.trim() });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error('Branch作成結果を確認できませんでした。');
  return mapBranch(row);
}

export async function createAlternateRoute(input: AlternateRouteInput): Promise<RouteBranch> {
  const { data, error } = await requireSupabase().rpc('create_alternate_route', rpcInput(input));
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error('別Route作成結果を確認できませんでした。');
  return mapBranch(row);
}

export async function configureAlternateRoute(branchId: string, input: AlternateRouteInput): Promise<RouteBranch> {
  const { data, error } = await requireSupabase().rpc('configure_route_branch', {
    p_branch_id: branchId,
    ...rpcInput(input),
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error('別Route更新結果を確認できませんでした。');
  return mapBranch(row);
}


export async function deleteAlternateRoute(branchId: string, routeId: string): Promise<void> {
  const { error } = await requireSupabase().rpc('delete_alternate_route', {
    p_branch_id: branchId,
    p_route_id: routeId,
  });
  if (error) throw error;
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
