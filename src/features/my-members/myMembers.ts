import { getSupabaseClient } from '../../shared/api/supabase';

export type MyMember = { id: string; name: string; createdAt: string; updatedAt: string };
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
