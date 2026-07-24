import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { BrandMark } from '../../shared/ui/BrandMark';
import { VersionBadge } from '../../shared/ui/VersionBadge';
import { signOut } from '../auth/auth';
import { createRoute, listRoutes, type RouteSummary } from './routes';

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function formatUpdatedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '更新日不明';

  return new Intl.DateTimeFormat('ja-JP', {
    month: 'numeric',
    day: 'numeric',
  }).format(date) + ' 更新';
}

export function RouteListPage({ onSignedOut }: { onSignedOut: () => void }) {
  const [routes, setRoutes] = useState<RouteSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [routeName, setRouteName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const routeNameInputRef = useRef<HTMLInputElement>(null);

  const recentRoutes = useMemo(
    () => [...routes].sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at)),
    [routes],
  );

  useEffect(() => {
    let active = true;
    void listRoutes()
      .then((nextRoutes) => { if (active) setRoutes(nextRoutes); })
      .catch((error) => { if (active) setToast(getErrorMessage(error, 'Route一覧を読み込めませんでした。')); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!isCreateOpen) return;
    window.setTimeout(() => routeNameInputRef.current?.focus(), 0);
  }, [isCreateOpen]);

  async function handleSignOut() {
    await signOut();
    onSignedOut();
  }

  function openCreateModal() {
    setRouteName('');
    setIsCreateOpen(true);
  }

  function closeCreateModal() {
    if (isCreating) return;
    setIsCreateOpen(false);
    setRouteName('');
  }

  async function handleCreateRoute(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedName = routeName.trim();
    if (!normalizedName || isCreating) return;

    setIsCreating(true);
    try {
      const newRoute = await createRoute(normalizedName);
      setRoutes((current) => [newRoute, ...current.filter((route) => route.id !== newRoute.id)]);
      setIsCreateOpen(false);
      setRouteName('');
    } catch (error) {
      setToast(getErrorMessage(error, 'Routeを作成できませんでした。'));
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <main className="app-shell home-shell">
      <header className="home-header">
        <div className="home-brand">
          <BrandMark size={36} />
          <div>
            <strong>D Route</strong>
            <p>ルートを選ぶ</p>
          </div>
        </div>
        <button className="home-add-button" type="button" onClick={openCreateModal} aria-label="新しいRouteを作る">＋</button>
      </header>

      <section className="home-content" aria-labelledby="route-list-title">
        <h1 id="route-list-title" className="visually-hidden">Routeを選ぶ</h1>

        {loading ? (
          <section className="route-loading" aria-live="polite">
            <span className="route-loading-spinner" aria-hidden="true" />
            <p>Routeを読み込んでいます</p>
          </section>
        ) : recentRoutes.length === 0 ? (
          <section className="home-empty-state">
            <div className="empty-orbit" aria-hidden="true"><BrandMark size={58} /></div>
            <h2>Routeがまだありません</h2>
            <p>最初のRouteを作って、みんなで目的地と順番を共有しましょう。</p>
            <button className="primary-button" type="button" onClick={openCreateModal}>最初のRouteを作る</button>
          </section>
        ) : (
          <section className="home-route-section" aria-labelledby="recent-routes-title">
            <div className="home-section-heading">
              <h2 id="recent-routes-title">最近使ったRoute</h2>
              <span>{recentRoutes.length}件</span>
            </div>

            <div className="home-route-list">
              {recentRoutes.map((route) => (
                <Link className="home-route-card" key={route.id} to={`/routes/${route.id}`} aria-label={`${route.name}を開く`}>
                  <div className="home-route-card-copy">
                    <h3>{route.name}</h3>
                    <p>{formatUpdatedAt(route.updated_at)}</p>
                  </div>
                  <span className="home-route-chevron" aria-hidden="true">›</span>
                </Link>
              ))}
            </div>

          </section>
        )}
      </section>

      <footer className="home-footer">
        <VersionBadge />
        <button className="home-signout-button" type="button" onClick={handleSignOut}>サインアウト</button>
      </footer>

      {isCreateOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeCreateModal(); }}>
          <section className="route-modal" role="dialog" aria-modal="true" aria-labelledby="create-route-title">
            <div className="modal-header">
              <div>
                <p className="eyebrow">NEW ROUTE</p>
                <h2 id="create-route-title">新しいRouteを作る</h2>
              </div>
              <button className="modal-close-button" type="button" onClick={closeCreateModal} aria-label="閉じる" disabled={isCreating}>×</button>
            </div>
            <form className="route-create-form" onSubmit={handleCreateRoute}>
              <div className="field-group">
                <label htmlFor="route-name">Route名</label>
                <input
                  ref={routeNameInputRef}
                  id="route-name"
                  name="route-name"
                  value={routeName}
                  onChange={(event) => setRouteName(event.target.value)}
                  placeholder="例：家族でディズニーシー"
                  maxLength={20}
                  autoComplete="off"
                  disabled={isCreating}
                  required
                />
                <p className="field-hint">20文字まで。あとから変更できます。</p>
              </div>
              <div className="modal-actions">
                <button className="secondary-button" type="button" onClick={closeCreateModal} disabled={isCreating}>キャンセル</button>
                <button className="primary-button" type="submit" disabled={!routeName.trim() || isCreating}>{isCreating ? '作成中…' : '作成'}</button>
              </div>
            </form>
          </section>
        </div>
      )}

      {toast && <div className="toast" role="alert">{toast}</div>}
    </main>
  );
}
