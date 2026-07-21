import { FormEvent, useState } from 'react';
import { BrandMark } from '../../shared/ui/BrandMark';
import { VersionBadge } from '../../shared/ui/VersionBadge';
import { env } from '../../shared/api/env';
import { sendMagicLink } from './auth';

export function SignInPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle');
  const [error, setError] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    if (!navigator.onLine) { setError('ログインには通信が必要です。'); return; }
    if (!email.trim()) { setError('メールアドレスを入力してください。'); return; }
    setStatus('loading');
    try {
      await sendMagicLink(email.trim());
      setStatus('success');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'ログインリンクを送信できませんでした。');
      setStatus('idle');
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
          <p className="eyebrow">WELCOME</p>
          <h1 id="signin-title">D Routeにサインイン</h1>
          <p>メールに届くリンクから、安全にサインインできます。</p>
        </div>
        {status === 'success' ? (
          <div className="success-panel" role="status">
            <strong>メールを確認してください</strong>
            <p>{email} にログインリンクを送りました。</p>
            <button className="text-button" onClick={() => setStatus('idle')}>別のメールアドレスを使う</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <label htmlFor="email">メールアドレス</label>
            <input id="email" name="email" type="email" inputMode="email" autoComplete="email" placeholder="name@example.com" value={email} onChange={(e) => setEmail(e.target.value)} aria-describedby={error ? 'signin-error' : undefined} />
            {error && <p id="signin-error" className="field-error" role="alert">{error}</p>}
            <button className="primary-button" type="submit" disabled={status === 'loading'}>{status === 'loading' ? '送信しています…' : 'ログインリンクを送る'}</button>
          </form>
        )}
        {!env.hasSupabaseConfig && <p className="dev-notice">開発設定：`.env` にSupabase情報を設定すると認証が有効になります。</p>}
        <p className="guest-note">共有リンクから参加する場合は、招待リンクを開いてください。</p>
        <footer className="auth-footer"><span>Privacy</span><span>Terms</span><VersionBadge /></footer>
      </section>
    </main>
  );
}
