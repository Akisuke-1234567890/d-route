import { getSupabaseClient } from '../../shared/api/supabase';

export type UserProfile = {
  user_id: string;
  login_id: string | null;
  display_name: string | null;
  account_origin: 'legacy' | 'new';
  credentials_ready_at: string | null;
  created_at: string;
  updated_at: string;
};


function userFacingAuthError(error: unknown, fallback: string): Error {
  const message = error instanceof Error ? error.message : String(error ?? '');
  const normalized = message.toLowerCase();

  if (
    normalized.includes('email rate limit exceeded') ||
    normalized.includes('rate limit') ||
    normalized.includes('too many requests')
  ) {
    return new Error('メールの送信回数が上限に達しました。しばらく時間をおいてから、もう一度お試しください。');
  }

  if (normalized.includes('invalid login credentials')) {
    return new Error('ログインIDまたはパスワードが正しくありません。');
  }

  if (normalized.includes('email not confirmed')) {
    return new Error('メールアドレスの確認が完了していません。確認メールをご確認ください。');
  }

  if (normalized.includes('user already registered')) {
    return new Error('このメールアドレスはすでに登録されています。ログインまたはアカウント復旧をお試しください。');
  }

  if (normalized.includes('password should be at least')) {
    return new Error('パスワードは8文字以上で入力してください。');
  }

  return new Error(fallback);
}

function requireClient() {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabaseの環境変数が設定されていません。');
  return supabase;
}

export function normalizeLoginId(value: string): string {
  return value.trim().toLowerCase();
}

export function validateLoginId(value: string): string | null {
  const normalized = normalizeLoginId(value);
  if (normalized.length < 4 || normalized.length > 24) return 'ログインIDは4〜24文字で入力してください。';
  if (!/^[a-z0-9._-]+$/.test(normalized)) return 'ログインIDは半角英数字と . _ - のみ使用できます。';
  return null;
}

export function validatePassword(password: string): string | null {
  if (password.length < 8) return 'パスワードは8文字以上で入力してください。';
  return null;
}

export async function getOwnProfile(): Promise<UserProfile | null> {
  const supabase = requireClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!authData.user) return null;

  const { data, error } = await supabase
    .from('user_profiles')
    .select('user_id,login_id,display_name,account_origin,credentials_ready_at,created_at,updated_at')
    .eq('user_id', authData.user.id)
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as UserProfile | null;
}

export async function signInWithLoginId(loginId: string, password: string): Promise<void> {
  const supabase = requireClient();
  const validation = validateLoginId(loginId);
  if (validation) throw new Error(validation);
  if (!password) throw new Error('パスワードを入力してください。');

  const { data, error } = await supabase.functions.invoke('login-with-id', {
    body: { loginId: normalizeLoginId(loginId), password },
  });

  if (error) throw new Error('ログインできませんでした。IDとパスワードを確認してください。');
  const accessToken = typeof data?.access_token === 'string' ? data.access_token : '';
  const refreshToken = typeof data?.refresh_token === 'string' ? data.refresh_token : '';
  if (!accessToken || !refreshToken) throw new Error('ログインできませんでした。IDとパスワードを確認してください。');

  const { error: sessionError } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
  if (sessionError) throw sessionError;
}

export async function sendRegistrationLink(email: string): Promise<void> {
  const supabase = requireClient();
  const normalizedEmail = email.trim();
  if (!normalizedEmail) throw new Error('メールアドレスを入力してください。');
  const redirectTo = `${new URL(import.meta.env.BASE_URL, window.location.origin).toString()}?flow=setup`;
  const { error } = await supabase.auth.signInWithOtp({
    email: normalizedEmail,
    options: { emailRedirectTo: redirectTo, shouldCreateUser: true },
  });
  if (error) throw userFacingAuthError(error, '確認メールを送信できませんでした。しばらくしてからもう一度お試しください。');
}

export async function requestAccountRecovery(email: string): Promise<void> {
  const supabase = requireClient();
  const normalizedEmail = email.trim();
  if (!normalizedEmail) throw new Error('登録メールアドレスを入力してください。');
  const redirectTo = `${new URL(import.meta.env.BASE_URL, window.location.origin).toString()}?flow=recovery`;
  const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, { redirectTo });
  if (error) throw userFacingAuthError(error, '復旧メールを送信できませんでした。しばらくしてからもう一度お試しください。');
}

export async function completeAccountSetup(params: {
  loginId: string;
  password: string;
  passwordConfirm: string;
  displayName?: string;
}): Promise<UserProfile> {
  const supabase = requireClient();
  const loginIdError = validateLoginId(params.loginId);
  if (loginIdError) throw new Error(loginIdError);
  const passwordError = validatePassword(params.password);
  if (passwordError) throw new Error(passwordError);
  if (params.password !== params.passwordConfirm) throw new Error('パスワード確認が一致しません。');

  const { error: passwordUpdateError } = await supabase.auth.updateUser({ password: params.password });
  if (passwordUpdateError) throw userFacingAuthError(passwordUpdateError, 'パスワードを設定できませんでした。もう一度お試しください。');

  const { data, error } = await supabase.rpc('complete_v2_account_setup', {
    p_login_id: normalizeLoginId(params.loginId),
    p_display_name: params.displayName?.trim() || null,
  });

  if (error) {
    if (error.code === '23505' || error.message.toLowerCase().includes('login id already exists')) {
      throw new Error('このログインIDはすでに使用されています。別のIDを入力してください。');
    }
    throw error;
  }

  return data as UserProfile;
}

export async function resetSignedInPassword(password: string, passwordConfirm: string): Promise<void> {
  const supabase = requireClient();
  const passwordError = validatePassword(password);
  if (passwordError) throw new Error(passwordError);
  if (password !== passwordConfirm) throw new Error('パスワード確認が一致しません。');
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw userFacingAuthError(error, 'パスワードを変更できませんでした。もう一度お試しください。');
}
