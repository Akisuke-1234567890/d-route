import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { BrandMark } from '../../shared/ui/BrandMark';
import { VersionBadge } from '../../shared/ui/VersionBadge';
import { sendRegistrationLink } from './account';

export function StartPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle');
  const [error, setError] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setStatus('loading');
    try {
      await sendRegistrationLink(email);
      setStatus('success');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '確認メールを送信できませんでした。');
      setStatus('idle');
    }
  }

  return <main className="auth-page"><section className="auth-card" aria-labelledby="start-title">
    <header className="brand-header"><BrandMark size={54}/><div><div className="brand-wordmark small">D Route</div><p>最初の本人確認を行います。</p></div></header>
    {status === 'success' ? <div className="auth-preview-centered">
      <div className="auth-preview-mail-icon" aria-hidden="true">✉</div>
      <p className="eyebrow">CHECK YOUR MAIL</p><h1 id="start-title">メールを確認してください</h1>
      <p><strong>{email}</strong> に確認リンクを送りました。</p>
      <p className="auth-preview-subcopy">メール内のリンクを開くと、ログインID・パスワードの設定へ進みます。</p>
      <button className="text-button" type="button" onClick={() => setStatus('idle')}>メールアドレスを変更</button>
    </div> : <>
      <div className="auth-copy"><p className="eyebrow">GET STARTED</p><h1 id="start-title">アカウント作成</h1><p>登録・復旧に使うメールアドレスを確認します。普段のログインではメールアドレスを入力しません。</p></div>
      <form onSubmit={handleSubmit} noValidate><label htmlFor="start-email">メールアドレス</label><input id="start-email" type="email" inputMode="email" autoComplete="email" placeholder="name@example.com" value={email} onChange={(event)=>setEmail(event.target.value)} />{error && <p className="field-error" role="alert">{error}</p>}<button className="primary-button" type="submit" disabled={status==='loading'}>{status==='loading'?'送信しています…':'確認メールを送信'}</button></form>
    </>}
    <Link className="text-button auth-link-button auth-centered-link" to="/signin">ログインへ戻る</Link>
    <footer className="auth-footer"><span>Privacy</span><span>Terms</span><VersionBadge/></footer>
  </section></main>;
}
