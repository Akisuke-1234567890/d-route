import { FormEvent, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BrandMark } from '../../shared/ui/BrandMark';
import { VersionBadge } from '../../shared/ui/VersionBadge';

type PreviewStep = 'login' | 'start' | 'mail-sent' | 'setup' | 'existing' | 'recover' | 'reset';

const STEP_LABELS: Record<PreviewStep, string> = {
  login: 'ログイン',
  start: '初回登録',
  'mail-sent': 'メール送信後',
  setup: 'ID・パスワード設定',
  existing: '既存ユーザー移行',
  recover: 'アカウント復旧',
  reset: '復旧メール後',
};

export function AuthPrototypePage() {
  const requestedStep = useMemo<PreviewStep>(() => {
    const value = new URLSearchParams(window.location.search).get('step');
    return value && value in STEP_LABELS ? (value as PreviewStep) : 'login';
  }, []);
  const [step, setStep] = useState<PreviewStep>(requestedStep);
  const [email, setEmail] = useState('');
  const [loginId, setLoginId] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [message, setMessage] = useState('');

  const title = useMemo(() => STEP_LABELS[step], [step]);

  function preventSubmit(event: FormEvent<HTMLFormElement>, next?: PreviewStep) {
    event.preventDefault();
    setMessage('');
    if (next) setStep(next);
  }

  return (
    <main className="auth-page auth-preview-page">
      <section className="auth-card auth-preview-card" aria-labelledby="auth-preview-title">
        <header className="brand-header auth-preview-brand">
          <BrandMark size={50} />
          <div>
            <div className="brand-wordmark small">D Route</div>
            <p>v2.0 認証フロープレビュー</p>
          </div>
        </header>

        <div className="auth-preview-progress" aria-label={`現在の画面: ${title}`}>
          <span className="is-active">{title}</span>
          <small>UI確認用・認証処理はまだ変更しません</small>
        </div>

        {step === 'login' && (
          <>
            <div className="auth-copy compact">
              <p className="eyebrow">WELCOME BACK</p>
              <h1 id="auth-preview-title">D Routeにログイン</h1>
              <p>一度ログインした端末では、通常この画面を省略してHomeを開きます。</p>
            </div>
            <form onSubmit={(event) => preventSubmit(event)} noValidate>
              <label htmlFor="preview-login-id">ログインID</label>
              <input id="preview-login-id" autoComplete="username" value={loginId} onChange={(event) => setLoginId(event.target.value)} placeholder="route_user" />
              <label htmlFor="preview-password">パスワード</label>
              <input id="preview-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="••••••••" />
              <button className="primary-button" type="submit" onClick={() => setMessage('プレビューではログイン処理を実行しません。')}>ログイン</button>
            </form>
            <div className="auth-preview-links">
              <button className="text-button" type="button" onClick={() => setStep('recover')}>ID・パスワードを忘れた方</button>
              <button className="secondary-button" type="button" onClick={() => setStep('start')}>アカウント作成</button>
            </div>
          </>
        )}

        {step === 'start' && (
          <>
            <div className="auth-copy compact">
              <p className="eyebrow">GET STARTED</p>
              <h1 id="auth-preview-title">アカウント作成</h1>
              <p>LINE公式アカウントなどからこの画面を開き、最初にメールアドレスを確認します。</p>
            </div>
            <form onSubmit={(event) => preventSubmit(event, 'mail-sent')} noValidate>
              <label htmlFor="preview-email">メールアドレス</label>
              <input id="preview-email" type="email" inputMode="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" />
              <button className="primary-button" type="submit">確認メールを送信</button>
            </form>
            <button className="text-button auth-preview-back" type="button" onClick={() => setStep('login')}>ログインへ戻る</button>
          </>
        )}

        {step === 'mail-sent' && (
          <div className="auth-preview-centered">
            <div className="auth-preview-mail-icon" aria-hidden="true">✉</div>
            <p className="eyebrow">CHECK YOUR MAIL</p>
            <h1 id="auth-preview-title">メールを確認してください</h1>
            <p><strong>{email || 'name@example.com'}</strong> に確認リンクを送信する想定です。</p>
            <p className="auth-preview-subcopy">メール内のリンクを開くと、ログインID・パスワード・表示名の設定へ進みます。</p>
            <button className="primary-button" type="button" onClick={() => setStep('setup')}>リンク後の画面を確認</button>
            <button className="text-button" type="button" onClick={() => setStep('start')}>メールアドレスを変更</button>
          </div>
        )}

        {step === 'setup' && (
          <>
            <div className="auth-copy compact">
              <p className="eyebrow">ACCOUNT SETUP</p>
              <h1 id="auth-preview-title">ログイン情報を設定</h1>
              <p>この設定後、普段はログインIDとパスワードで利用できます。</p>
            </div>
            <form onSubmit={(event) => preventSubmit(event)} noValidate>
              <label htmlFor="preview-setup-id">ログインID</label>
              <input id="preview-setup-id" autoComplete="username" value={loginId} onChange={(event) => setLoginId(event.target.value)} placeholder="route_user" />
              <label htmlFor="preview-display-name">表示名</label>
              <input id="preview-display-name" autoComplete="nickname" value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="ニックネームを入力" />
              <label htmlFor="preview-new-password">パスワード</label>
              <input id="preview-new-password" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="••••••••" />
              <label htmlFor="preview-password-confirm">パスワード確認</label>
              <input id="preview-password-confirm" type="password" autoComplete="new-password" value={passwordConfirm} onChange={(event) => setPasswordConfirm(event.target.value)} placeholder="••••••••" />
              <button className="primary-button" type="submit" onClick={() => setMessage('設定完了後はセッションを保持し、Homeへ進む想定です。')}>設定を完了</button>
            </form>
          </>
        )}

        {step === 'existing' && (
          <>
            <div className="auth-copy compact">
              <p className="eyebrow">ACCOUNT UPGRADE</p>
              <h1 id="auth-preview-title">D Route v2のログイン情報を設定</h1>
              <p>現在ログイン中のアカウントをそのまま引き継ぎ、今後使うログインIDとパスワードだけ追加します。</p>
            </div>
            <div className="auth-preview-existing-panel">
              <span>現在のアカウント</span>
              <strong>{email || '登録済みメールアドレス'}</strong>
              <small>既存Route・Admin権限・メンバー情報はそのまま引き継ぎます。</small>
            </div>
            <form onSubmit={(event) => preventSubmit(event)} noValidate>
              <label htmlFor="preview-existing-id">ログインID</label>
              <input id="preview-existing-id" autoComplete="username" value={loginId} onChange={(event) => setLoginId(event.target.value)} placeholder="route_user" />
              <label htmlFor="preview-existing-password">新しいパスワード</label>
              <input id="preview-existing-password" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="••••••••" />
              <label htmlFor="preview-existing-confirm">パスワード確認</label>
              <input id="preview-existing-confirm" type="password" autoComplete="new-password" value={passwordConfirm} onChange={(event) => setPasswordConfirm(event.target.value)} placeholder="••••••••" />
              <button className="primary-button" type="submit" onClick={() => setMessage('設定完了後は現在のアカウントのままHomeへ進む想定です。')}>設定して続ける</button>
            </form>
            <p className="auth-preview-subcopy">メール認証のやり直しや、新しいアカウントの作成は行いません。</p>
          </>
        )}

        {step === 'recover' && (
          <>
            <div className="auth-copy compact">
              <p className="eyebrow">ACCOUNT RECOVERY</p>
              <h1 id="auth-preview-title">アカウントを復旧</h1>
              <p>登録時に確認したメールアドレスを使って本人確認します。</p>
            </div>
            <form onSubmit={(event) => preventSubmit(event, 'reset')} noValidate>
              <label htmlFor="preview-recovery-email">登録メールアドレス</label>
              <input id="preview-recovery-email" type="email" inputMode="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" />
              <button className="primary-button" type="submit">復旧メールを送信</button>
            </form>
            <button className="text-button auth-preview-back" type="button" onClick={() => setStep('login')}>ログインへ戻る</button>
          </>
        )}

        {step === 'reset' && (
          <>
            <div className="auth-copy compact">
              <p className="eyebrow">RECOVERY VERIFIED</p>
              <h1 id="auth-preview-title">ID確認・パスワード再設定</h1>
              <p>メールで本人確認できた後に、この画面を表示する想定です。</p>
            </div>
            <div className="auth-preview-id-panel">
              <span>ログインID</span>
              <strong>{loginId || 'route_user'}</strong>
            </div>
            <form onSubmit={(event) => preventSubmit(event)} noValidate>
              <label htmlFor="preview-reset-password">新しいパスワード</label>
              <input id="preview-reset-password" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="••••••••" />
              <label htmlFor="preview-reset-confirm">パスワード確認</label>
              <input id="preview-reset-confirm" type="password" autoComplete="new-password" value={passwordConfirm} onChange={(event) => setPasswordConfirm(event.target.value)} placeholder="••••••••" />
              <button className="primary-button" type="submit" onClick={() => setMessage('再設定後は新しいパスワードでログインできる想定です。')}>パスワードを再設定</button>
            </form>
          </>
        )}

        {message && <p className="auth-preview-message" role="status">{message}</p>}

        <div className="auth-preview-step-switcher" aria-label="プレビュー画面切替">
          {(Object.keys(STEP_LABELS) as PreviewStep[]).map((key) => (
            <button key={key} type="button" className={key === step ? 'is-active' : ''} onClick={() => { setMessage(''); setStep(key); }}>{STEP_LABELS[key]}</button>
          ))}
        </div>

        <footer className="auth-footer">
          <Link to="/signin">現在の認証画面へ戻る</Link>
          <VersionBadge />
        </footer>
      </section>
    </main>
  );
}
