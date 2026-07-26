import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { BrandMark } from '../../shared/ui/BrandMark';
import { RefreshButton } from '../../shared/ui/RefreshButton';
import { VersionBadge } from '../../shared/ui/VersionBadge';
import { requestAccountRecovery } from './account';

export function RecoveryPage() {
  const [email,setEmail]=useState(''); const [loading,setLoading]=useState(false); const [sent,setSent]=useState(false); const [error,setError]=useState('');
  async function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();setError('');setLoading(true);try{await requestAccountRecovery(email);setSent(true);}catch(caught){setError(caught instanceof Error?caught.message:'復旧メールを送信できませんでした。');}finally{setLoading(false);}}
  return <main className="auth-page"><section className="auth-card" aria-labelledby="recovery-title"><header className="brand-header"><BrandMark size={54}/><div><div className="brand-wordmark small">D Route</div><p>アカウント復旧</p></div></header>{sent?<div className="auth-preview-centered"><div className="auth-preview-mail-icon" aria-hidden="true">✉</div><p className="eyebrow">RECOVERY MAIL</p><h1 id="recovery-title">メールを確認してください</h1><p>登録情報が確認できる場合、復旧リンクを送信します。</p><p className="auth-preview-subcopy">リンク後にログインIDを確認し、新しいパスワードを設定できます。</p></div>:<><div className="auth-copy"><p className="eyebrow">ACCOUNT RECOVERY</p><h1 id="recovery-title">ID・パスワードを忘れた方</h1><p>登録時に確認したメールアドレスで本人確認します。</p></div><form onSubmit={submit}><label htmlFor="recovery-email">登録メールアドレス</label><input id="recovery-email" type="email" inputMode="email" autoComplete="email" value={email} onChange={(event)=>setEmail(event.target.value)} placeholder="name@example.com"/>{error&&<p className="field-error" role="alert">{error}</p>}<button className="primary-button" type="submit" disabled={loading}>{loading?'送信しています…':'復旧メールを送信'}</button></form></>}<Link className="text-button auth-link-button auth-centered-link" to="/signin">ログインへ戻る</Link><footer className="auth-footer"><span>Recovery</span><RefreshButton/><VersionBadge/></footer></section></main>;
}
