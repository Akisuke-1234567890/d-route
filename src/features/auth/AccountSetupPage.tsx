import { FormEvent, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom';
import { BrandMark } from '../../shared/ui/BrandMark';
import { RefreshButton } from '../../shared/ui/RefreshButton';
import { VersionBadge } from '../../shared/ui/VersionBadge';
import { completeAccountSetup, getOwnProfile, type UserProfile } from './account';

export function AccountSetupPage({ user, onCompleted }: { user: User; onCompleted: () => Promise<void> }) {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loginId, setLoginId] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    void getOwnProfile().then((value) => {
      if (!active) return;
      setProfile(value);
      setDisplayName(value?.display_name ?? String(user.user_metadata?.display_name ?? ''));
    }).catch((caught) => { if (active) setError(caught instanceof Error ? caught.message : 'アカウント情報を読み込めませんでした。'); });
    return () => { active = false; };
  }, [user]);

  const legacy = profile?.account_origin === 'legacy';

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      await completeAccountSetup({ loginId, password, passwordConfirm, displayName });
      await onCompleted();
      navigate('/routes', { replace: true });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'ログイン情報を設定できませんでした。');
    } finally { setLoading(false); }
  }

  return <main className="auth-page auth-preview-page"><section className="auth-card auth-preview-card" aria-labelledby="setup-title">
    <header className="brand-header auth-preview-brand"><BrandMark size={50}/><div><div className="brand-wordmark small">D Route</div><p>{legacy ? '既存アカウントをv2へ移行' : 'アカウント設定'}</p></div></header>
    <div className="auth-copy compact"><p className="eyebrow">{legacy ? 'ACCOUNT UPGRADE' : 'ACCOUNT SETUP'}</p><h1 id="setup-title">{legacy ? 'D Route v2のログイン情報を設定' : 'ログイン情報を設定'}</h1><p>{legacy ? '現在のアカウントをそのまま引き継ぎ、今後使うログインIDとパスワードだけ追加します。' : 'この設定後は、普段ログインIDとパスワードで利用できます。'}</p></div>
    <div className="auth-preview-existing-panel"><span>確認済みメール</span><strong>{user.email ?? 'メールアドレス確認済み'}</strong><small>{legacy ? '既存Route・Admin権限・メンバー情報はそのまま引き継ぎます。' : 'このメールアドレスは本人確認とアカウント復旧に使用します。'}</small></div>
    <form onSubmit={handleSubmit} noValidate>
      <label htmlFor="setup-login-id">ログインID</label><input id="setup-login-id" autoComplete="username" autoCapitalize="none" spellCheck={false} value={loginId} onChange={(event)=>setLoginId(event.target.value)} placeholder="route_user" />
      <label htmlFor="setup-display-name">ニックネーム</label><input id="setup-display-name" autoComplete="nickname" maxLength={30} value={displayName} onChange={(event)=>setDisplayName(event.target.value)} placeholder="例：たけだ" />
      <label htmlFor="setup-password">新しいパスワード</label><input id="setup-password" type="password" autoComplete="new-password" value={password} onChange={(event)=>setPassword(event.target.value)} placeholder="8文字以上" />
      <label htmlFor="setup-password-confirm">パスワード確認</label><input id="setup-password-confirm" type="password" autoComplete="new-password" value={passwordConfirm} onChange={(event)=>setPasswordConfirm(event.target.value)} placeholder="••••••••" />
      {error && <p className="field-error" role="alert">{error}</p>}
      <button className="primary-button" type="submit" disabled={loading}>{loading?'設定しています…':legacy?'設定して続ける':'設定を完了'}</button>
    </form>
    <p className="auth-preview-subcopy">ログイン後のセッションは端末に保持され、通常は次回からこの入力を省略します。</p>
    <footer className="auth-footer"><span>Account setup</span><RefreshButton/><VersionBadge/></footer>
  </section></main>;
}
