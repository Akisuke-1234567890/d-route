import { FormEvent, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { Link, useNavigate } from 'react-router-dom';
import { BrandMark } from '../../shared/ui/BrandMark';
import { RefreshButton } from '../../shared/ui/RefreshButton';
import { VersionBadge } from '../../shared/ui/VersionBadge';
import { getOwnProfile, updateDisplayName, type UserProfile } from './account';

export function AccountProfilePage({
  user,
  required = false,
  onCompleted,
}: {
  user: User;
  required?: boolean;
  onCompleted: () => Promise<void>;
}) {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    void getOwnProfile()
      .then((value) => {
        if (!active) return;
        setProfile(value);
        setDisplayName(value?.display_name ?? String(user.user_metadata?.display_name ?? ''));
      })
      .catch((caught) => {
        if (!active) return;
        setError(caught instanceof Error ? caught.message : 'アカウント情報を読み込めませんでした。');
      })
      .finally(() => {
        if (active) setPageLoading(false);
      });
    return () => { active = false; };
  }, [user]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setError('');
    setLoading(true);
    try {
      await updateDisplayName(displayName);
      await onCompleted();
      navigate('/routes', { replace: true });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'ニックネームを保存できませんでした。');
      setLoading(false);
    }
  }

  return (
    <main className="auth-page auth-preview-page">
      <section className="auth-card auth-preview-card" aria-labelledby="profile-title">
        <header className="brand-header auth-preview-brand">
          <BrandMark size={50} />
          <div>
            <div className="brand-wordmark small">D Route</div>
            <p>{required ? '表示名を設定' : 'アカウント設定'}</p>
          </div>
        </header>

        <div className="auth-copy compact">
          <p className="eyebrow">PROFILE</p>
          <h1 id="profile-title">{required ? 'ニックネームを設定' : 'ニックネーム変更'}</h1>
          <p>Route内でほかのメンバーに表示される名前です。ログインIDとは別に、あとから変更できます。</p>
        </div>

        <div className="auth-preview-existing-panel">
          <span>ログインID</span>
          <strong>{profile?.login_id ?? '設定済み'}</strong>
          <small>{user.email ?? '認証済みメールアドレス'}</small>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <label htmlFor="profile-display-name">ニックネーム</label>
          <input
            id="profile-display-name"
            autoComplete="nickname"
            maxLength={30}
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder="例：たけだ"
            disabled={pageLoading || loading}
          />
          {error && <p className="field-error" role="alert">{error}</p>}
          <button className="primary-button" type="submit" disabled={pageLoading || loading || !displayName.trim()}>
            {loading ? '保存しています…' : required ? '設定して続ける' : '保存'}
          </button>
        </form>

        {!required && <Link className="text-button auth-link-button auth-centered-link" to="/routes">Route一覧へ戻る</Link>}

        <footer className="auth-footer">
          <RefreshButton />
          <VersionBadge />
        </footer>
      </section>
    </main>
  );
}
