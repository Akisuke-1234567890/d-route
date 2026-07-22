import { FormEvent, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { BrandMark } from '../../shared/ui/BrandMark';
import { VersionBadge } from '../../shared/ui/VersionBadge';
import { signOut } from '../auth/auth';
import { createRoute, listRoutes, type RouteSummary } from './routes';

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function RouteListPage({ onSignedOut }: { onSignedOut: () => void }) {
  const [routes, setRoutes] = useState<RouteSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [routeName, setRouteName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const routeNameInputRef = useRef<HTMLInputElement>(null);

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
    <main className="app-shell">
      <header className="global-header">
        <div className="header-brand"><BrandMark size={34} /><strong>D Route</strong></div>
        <button className="icon-button" onClick={handleSignOut} aria-label="サインアウト">退出</button>
      </header>

      <section className="page-content" aria-labelledby="route-list-title">
        <div className="page-heading">
          <p className="eyebrow">MY ROUTES</p>
          <h1 id="route-list-title">Route一覧</h1>
          <p>参加中のRouteがここに表示されます。</p>
        </div>

        {loading ? (
          <section className="route-loading" aria-live="polite">
            <span className="route-loading-spinner" aria-hidden="true" />
            <p>Routeを読み込んでいます</p>
          </section>
        ) : routes.length === 0 ? (
          <section className="empty-state">
            <div className="empty-orbit" aria-hidden="true"><BrandMark size={60} /></div>
            <h2>Routeがまだありません</h2>
            <p>目的地と行動方針を共有する、最初のRouteを作成しましょう。</p>
            <button className="primary-button" type="button" onClick={openCreateModal}>最初のRouteを作る</button>
            <button className="secondary-button" type="button" disabled>Templateから作る</button>
          </section>
        ) : (
          <section className="route-list" aria-label="Route一覧">
            <div className="route-list-toolbar">
              <p>{routes.length}件のRoute</p>
              <button className="compact-primary-button" type="button" onClick={openCreateModal}>＋ Routeを作る</button>
            </div>
            <div className="route-card-grid">
              {routes.map((route) => (
                <Link className="route-card route-card-link" key={route.id} to={`/routes/${route.id}`} aria-label={`${route.name}を開く`}>
                  <div className="route-card-mark" aria-hidden="true"><BrandMark size={32} /></div>
                  <div className="route-card-copy">
                    <p className="route-status">{route.status === 'draft' ? '下書き' : route.status}</p>
                    <h2>{route.name}</h2>
                    <p>Routeの詳細を開く</p>
                  </div>
                  <span className="route-card-chevron" aria-hidden="true">›</span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </section>

      <footer className="app-footer"><VersionBadge /><span>Route List & Detail</span></footer>

      {isCreateOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeCreateModal(); }}>
          <section className="route-modal" role="dialog" aria-modal="true" aria-labelledby="create-route-title">
            <div className="modal-header">
              <div>
                <p className="eyebrow">NEW ROUTE</p>
                <h2 id="create-route-title">Routeを作る</h2>
              </div>
              <button className="modal-close-button" type="button" onClick={closeCreateModal} aria-label="閉じる" disabled={isCreating}>×</button>
            </div>
            <form className="route-create-form" onSubmit={handleCreateRoute}>
              <div className="field-group">
                <label htmlFor="route-name">Route名 <span aria-hidden="true">*</span></label>
                <input
                  ref={routeNameInputRef}
                  id="route-name"
                  name="route-name"
                  value={routeName}
                  onChange={(event) => setRouteName(event.target.value)}
                  placeholder="例：家族でディズニーシー"
                  maxLength={100}
                  autoComplete="off"
                  disabled={isCreating}
                  required
                />
                <p className="field-hint">あとから変更できます。</p>
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
