import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { BrandMark } from '../../shared/ui/BrandMark';
import { RefreshButton } from '../../shared/ui/RefreshButton';
import { VersionBadge } from '../../shared/ui/VersionBadge';
import { env } from '../../shared/api/env';
import { signInWithLoginId } from './account';

function routesUrl() {
  return new URL('routes', new URL(import.meta.env.BASE_URL, window.location.origin)).toString();
}

export function SignInPage() {
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setError('');
    if (!navigator.onLine) { setError('ログインには通信が必要です。'); return; }
    setLoading(true);
    try {
      await signInWithLoginId(loginId, password);
      window.location.replace(routesUrl());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'ログインできませんでした。');
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="signin-title">
        <header className="brand-header">
          <BrandMark size={54} />
          <div><div className="brand-wordmark small">D Route</div><p>目的地とRouteを、みんなで共有。</p></div>
        </header>
        <div className="auth-copy">
          <p className="eyebrow">WELCOME BACK</p>
          <h1 id="signin-title">D Routeにログイン</h1>
          <p>一度ログインすると、次回からはそのままD Routeを利用できます。</p>
        </div>
        <form onSubmit={handleSubmit} noValidate>
          <label htmlFor="login-id">ログインID</label>
          <input id="login-id" name="username" autoComplete="username" autoCapitalize="none" spellCheck={false} placeholder="route_user" value={loginId} onChange={(event) => { setLoginId(event.target.value); if (error) setError(''); }} disabled={loading} />
          <label htmlFor="password">パスワード</label>
          <input id="password" name="password" type="password" autoComplete="current-password" placeholder="••••••••" value={password} onChange={(event) => { setPassword(event.target.value); if (error) setError(''); }} aria-describedby={error ? 'signin-error' : undefined} disabled={loading} />
          {error && <p id="signin-error" className="field-error" role="alert">{error}</p>}
          <button className="primary-button" type="submit" disabled={loading}>{loading ? 'ログインしています…' : 'ログイン'}</button>
        </form>
        <div className="auth-entry-actions">
          <Link className="text-button auth-link-button" to="/recover">ID・パスワードを忘れた方</Link>
          <Link className="secondary-button auth-link-button auth-secondary-action" to="/start">アカウント作成</Link>
        </div>
        {!env.hasSupabaseConfig && <p className="dev-notice">開発設定：`.env` にSupabase情報を設定すると認証が有効になります。</p>}
        <Link className="auth-preview-entry" to="/auth-preview">v2.0 認証フローを確認 ›</Link>
        <footer className="auth-footer"><span>Privacy</span><span>Terms</span><RefreshButton /><VersionBadge /></footer>
      </section>
    </main>
  );
}
