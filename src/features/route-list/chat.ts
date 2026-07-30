import { getSupabaseClient } from '../../shared/api/supabase';

export type RouteChatMessage = {
  id: string;
  routeId: string;
  authorUserId: string;
  authorName: string;
  body: string;
  isImportant: boolean;
  createdAt: string;
};

const columns = 'id,route_id,author_user_id,author_name,body,is_important,created_at';

function requireSupabase() {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabaseの環境変数が設定されていません。');
  return supabase;
}

function mapMessage(row: any): RouteChatMessage {
  return {
    id: row.id,
    routeId: row.route_id,
    authorUserId: row.author_user_id,
    authorName: row.author_name || 'メンバー',
    body: row.body,
    isImportant: Boolean(row.is_important),
    createdAt: row.created_at,
  };
}

export async function getRouteChatMessages(routeId: string): Promise<RouteChatMessage[]> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('route_chat_messages')
    .select(columns)
    .eq('route_id', routeId)
    .order('created_at', { ascending: true })
    .limit(200);
  if (error) throw error;
  return (data ?? []).map(mapMessage);
}

export async function getLatestRouteChatMessage(routeId: string): Promise<RouteChatMessage | null> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('route_chat_messages')
    .select(columns)
    .eq('route_id', routeId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ? mapMessage(data) : null;
}

export async function sendRouteChatMessage(
  routeId: string,
  body: string,
  isImportant = false
): Promise<RouteChatMessage> {
  const normalizedBody = body.trim();
  if (!normalizedBody) throw new Error('メッセージを入力してください。');
  if (normalizedBody.length > 500) throw new Error('メッセージは500文字以内で入力してください。');

  const supabase = requireSupabase();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  const user = authData.user;
  if (!user) throw new Error('ログイン情報を確認できませんでした。');

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('display_name')
    .eq('user_id', user.id)
    .maybeSingle();

  const authorName =
    profile?.display_name?.trim() ||
    user.user_metadata?.display_name?.trim() ||
    'あなた';

  const { data, error } = await supabase
    .from('route_chat_messages')
    .insert({
      route_id: routeId,
      author_user_id: user.id,
      author_name: authorName,
      body: normalizedBody,
      is_important: isImportant,
    })
    .select(columns)
    .single();

  if (error) throw error;
  return mapMessage(data);
}

export async function getCurrentUserId(): Promise<string | null> {
  const supabase = requireSupabase();
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data.user?.id ?? null;
}

export function formatChatTime(value: string): string {
  return new Intl.DateTimeFormat('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(value));
}
