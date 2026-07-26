import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BrandMark } from '../../shared/ui/BrandMark';
import { VersionBadge } from '../../shared/ui/VersionBadge';
import { getOwnProfile, resetSignedInPassword } from './account';

export function ResetPasswordPage() {
  const navigate=useNavigate(); const [loginId,setLoginId]=useState('確認中…'); const [password,setPassword]=useState(''); const [confirm,setConfirm]=useState(''); const [loading,setLoading]=useState(false); const [error,setError]=useState('');
  useEffect(()=>{void getOwnProfile().then((profile)=>setLoginId(profile?.login_id??'未設定')).catch(()=>setLoginId('確認できませんでした'));},[]);
  async function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();setError('');setLoading(true);try{await resetSignedInPassword(password,confirm);navigate('/routes',{replace:true});}catch(caught){setError(caught instanceof Error?caught.message:'パスワードを再設定できませんでした。');}finally{setLoading(false);}}
  return <main className="auth-page"><section className="auth-card" aria-labelledby="reset-title"><header className="brand-header"><BrandMark size={54}/><div><div className="brand-wordmark small">D Route</div><p>本人確認済み</p></div></header><div className="auth-copy"><p className="eyebrow">RECOVERY VERIFIED</p><h1 id="reset-title">ID確認・パスワード再設定</h1><p>メールで本人確認できました。ログインIDを確認し、新しいパスワードを設定してください。</p></div><div className="auth-preview-id-panel"><span>ログインID</span><strong>{loginId}</strong></div><form onSubmit={submit}><label htmlFor="reset-password">新しいパスワード</label><input id="reset-password" type="password" autoComplete="new-password" value={password} onChange={(event)=>setPassword(event.target.value)} placeholder="8文字以上"/><label htmlFor="reset-confirm">パスワード確認</label><input id="reset-confirm" type="password" autoComplete="new-password" value={confirm} onChange={(event)=>setConfirm(event.target.value)} placeholder="••••••••"/>{error&&<p className="field-error" role="alert">{error}</p>}<button className="primary-button" type="submit" disabled={loading}>{loading?'再設定しています…':'パスワードを再設定'}</button></form><footer className="auth-footer"><span>Recovery</span><VersionBadge/></footer></section></main>;
}
