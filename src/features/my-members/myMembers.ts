import { getSupabaseClient } from '../../shared/api/supabase';

export type MyMember = { id: string; name: string; createdAt: string; updatedAt: string };
export type RouteBranchMyMemberAssignment = { routeId: string; branchId: string; myMemberId: string; assignedAt: string };
const columns = 'id,name,created_at,updated_at';

function requireSupabase() {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabaseの環境変数が設定されていません。');
  return supabase;
}
function normalizeName(value: string) {
  const name = value.trim();
  if (!name) throw new Error('名前を入力してください。');
  if (name.length > 30) throw new Error('名前は30文字以内で入力してください。');
  return name;
}
function mapMember(row: any): MyMember {
  return { id: row.id, name: row.name, createdAt: row.created_at, updatedAt: row.updated_at };
}
async function getUserId() {
  const { data, error } = await requireSupabase().auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error('ログイン情報を確認できませんでした。');
  return data.user.id;
}
export async function listMyMembers(): Promise<MyMember[]> {
  const { data, error } = await requireSupabase().from('my_members').select(columns).order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapMember);
}
export async function createMyMember(nameInput: string): Promise<MyMember> {
  const ownerUserId = await getUserId();
  const { data, error } = await requireSupabase().from('my_members')
    .insert({ owner_user_id: ownerUserId, name: normalizeName(nameInput) }).select(columns).single();
  if (error) throw error;
  return mapMember(data);
}
export async function updateMyMember(id: string, nameInput: string): Promise<MyMember> {
  const { data, error } = await requireSupabase().from('my_members')
    .update({ name: normalizeName(nameInput), updated_at: new Date().toISOString() }).eq('id', id).select(columns).single();
  if (error) throw error;
  return mapMember(data);
}
export async function deleteMyMember(id: string): Promise<void> {
  const { error } = await requireSupabase().from('my_members').delete().eq('id', id);
  if (error) throw error;
}


const branchAssignmentColumns = 'route_id,branch_id,my_member_id,assigned_at';
function mapBranchAssignment(row: any): RouteBranchMyMemberAssignment {
  return { routeId: row.route_id, branchId: row.branch_id, myMemberId: row.my_member_id, assignedAt: row.assigned_at };
}
export async function listRouteBranchMyMemberAssignments(routeId: string): Promise<RouteBranchMyMemberAssignment[]> {
  const { data, error } = await requireSupabase().from('route_branch_my_members')
    .select(branchAssignmentColumns).eq('route_id', routeId);
  if (error) throw error;
  return (data ?? []).map(mapBranchAssignment);
}
export async function replaceRouteBranchMyMembers(routeId: string, branchId: string, myMemberIds: string[]): Promise<void> {
  const client = requireSupabase();
  const { error: deleteError } = await client.from('route_branch_my_members')
    .delete().eq('route_id', routeId).eq('branch_id', branchId);
  if (deleteError) throw deleteError;
  if (myMemberIds.length === 0) return;
  const { error: insertError } = await client.from('route_branch_my_members').insert(
    myMemberIds.map((myMemberId) => ({ route_id: routeId, branch_id: branchId, my_member_id: myMemberId }))
  );
  if (insertError) throw insertError;
}
