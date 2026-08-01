import { FormEvent, PointerEvent as ReactPointerEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { BrandMark } from '../../shared/ui/BrandMark';
import { VersionBadge } from '../../shared/ui/VersionBadge';
import { RefreshButton } from '../../shared/ui/RefreshButton';
import { useBodyScrollLock } from '../../shared/hooks/useBodyScrollLock';
import { signOut } from '../auth/auth';
import { createRoute, deleteOwnedRoute, listRoutes, type RouteSummary } from './routes';

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
  const [expandedDescriptionId, setExpandedDescriptionId] = useState<string | null>(null);
  const [swipedRouteId, setSwipedRouteId] = useState<string | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<RouteSummary | null>(null);
  const [isDeletingRoute, setIsDeletingRoute] = useState(false);
  const [isDeleteClosing, setIsDeleteClosing] = useState(false);
  const swipeStartXRef = useRef(0);
  const swipeStartOffsetRef = useRef(0);
  const activeSwipeRouteIdRef = useRef<string | null>(null);
  const swipeMovedRef = useRef(false);
  const suppressClickUntilRef = useRef(0);

  const routeNameInputRef = useRef<HTMLInputElement>(null);

  useBodyScrollLock(Boolean(deleteTarget));

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


const DELETE_REVEAL_WIDTH = 96;

function closeSwipe() {
  setSwipedRouteId(null);
  setSwipeOffset(0);
  activeSwipeRouteIdRef.current = null;
}

function handleRoutePointerDown(event: ReactPointerEvent<HTMLElement>, routeId: string) {
  if (event.pointerType === 'mouse' && event.button !== 0) return;
  if (swipedRouteId && swipedRouteId !== routeId) closeSwipe();

  activeSwipeRouteIdRef.current = routeId;
  swipeStartXRef.current = event.clientX;
  swipeStartOffsetRef.current = swipedRouteId === routeId ? swipeOffset : 0;
  swipeMovedRef.current = false;
  event.currentTarget.setPointerCapture(event.pointerId);
}

function handleRoutePointerMove(event: ReactPointerEvent<HTMLElement>, routeId: string) {
  if (activeSwipeRouteIdRef.current !== routeId) return;
  const deltaX = event.clientX - swipeStartXRef.current;
  if (Math.abs(deltaX) > 6) swipeMovedRef.current = true;

  const nextOffset = Math.max(
    -DELETE_REVEAL_WIDTH,
    Math.min(0, swipeStartOffsetRef.current + deltaX),
  );
  setSwipedRouteId(routeId);
  setSwipeOffset(nextOffset);
}

function handleRoutePointerEnd(event: ReactPointerEvent<HTMLElement>, routeId: string) {
  if (activeSwipeRouteIdRef.current !== routeId) return;
  try {
    event.currentTarget.releasePointerCapture(event.pointerId);
  } catch {
    // Pointer capture may already be released by the browser.
  }

  if (swipeMovedRef.current) suppressClickUntilRef.current = Date.now() + 350;
  const shouldOpen = swipeOffset <= -(DELETE_REVEAL_WIDTH * 0.58);
  setSwipedRouteId(shouldOpen ? routeId : null);
  setSwipeOffset(shouldOpen ? -DELETE_REVEAL_WIDTH : 0);
  activeSwipeRouteIdRef.current = null;
}

function shouldSuppressRouteClick() {
  return Date.now() < suppressClickUntilRef.current || swipeOffset < 0;
}

function requestDeleteRoute(route: RouteSummary) {
  closeSwipe();
  setIsDeleteClosing(false);
  setDeleteTarget(route);
}

function closeDeleteConfirmation() {
  if (isDeletingRoute || isDeleteClosing) return;
  setIsDeleteClosing(true);
  window.setTimeout(() => {
    setDeleteTarget(null);
    setIsDeleteClosing(false);
  }, 180);
}

async function handleDeleteRoute() {
  if (!deleteTarget || isDeletingRoute) return;
  setIsDeletingRoute(true);
  try {
    const deletedRoute = deleteTarget;
    await deleteOwnedRoute(deletedRoute.id);
    setRoutes((current) => current.filter((route) => route.id !== deletedRoute.id));
    setExpandedDescriptionId((current) => current === deletedRoute.id ? null : current);
    setToast(`「${deletedRoute.name}」を削除しました。`);
    setIsDeleteClosing(true);
    window.setTimeout(() => {
      setDeleteTarget(null);
      setIsDeleteClosing(false);
    }, 180);
  } catch (error) {
    setToast(getErrorMessage(error, 'Routeを削除できませんでした。リーダー権限を確認してください。'));
  } finally {
    setIsDeletingRoute(false);
  }
}

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
              {recentRoutes.map((route) => {
                const descriptionOpen = expandedDescriptionId === route.id;
                const swipeOpen = swipedRouteId === route.id;
                const currentOffset = swipeOpen ? swipeOffset : 0;

                return (
                  <div className={`home-route-swipe-shell${swipeOpen ? ' is-open' : ''}`} key={route.id}>
                    <button
                      className="home-route-swipe-delete"
                      type="button"
                      onClick={() => requestDeleteRoute(route)}
                      aria-label={`${route.name}を削除`}
                      tabIndex={swipeOpen ? 0 : -1}
                    >
                      <span aria-hidden="true">⌫</span>
                      <strong>削除</strong>
                    </button>

                    <article
                      className={`home-route-card home-route-swipe-panel${descriptionOpen ? ' is-description-open' : ''}`}
                      style={{ transform: `translateX(${currentOffset}px)` }}
                      onPointerDown={(event) => handleRoutePointerDown(event, route.id)}
                      onPointerMove={(event) => handleRoutePointerMove(event, route.id)}
                      onPointerUp={(event) => handleRoutePointerEnd(event, route.id)}
                      onPointerCancel={(event) => handleRoutePointerEnd(event, route.id)}
                    >
                      <Link
                        className="home-route-card-main"
                        to={`/routes/${route.id}`}
                        aria-label={`${route.name}を開く`}
                        onClick={(event) => {
                          if (shouldSuppressRouteClick()) {
                            event.preventDefault();
                            closeSwipe();
                          }
                        }}
                      >
                        <div className="home-route-card-copy">
                          <h3>{route.name}</h3>
                          <p>{formatUpdatedAt(route.updated_at)}</p>
                        </div>
                        <span className="home-route-swipe-hint" aria-hidden="true"><b>≪</b><i>⋯</i></span>
                      </Link>
                      {route.description?.trim() ? (
                        <>
                          <button
                            className="home-route-description-button"
                            type="button"
                            aria-expanded={descriptionOpen}
                            aria-controls={`route-description-${route.id}`}
                            onClick={(event) => {
                              if (shouldSuppressRouteClick()) {
                                event.preventDefault();
                                closeSwipe();
                                return;
                              }
                              setExpandedDescriptionId((current) => current === route.id ? null : route.id);
                            }}
                          >
                            <span>{descriptionOpen ? '説明を閉じる' : '説明を見る'}</span>
                            <span className="home-route-description-chevron" aria-hidden="true">{descriptionOpen ? '⌃' : '⌄'}</span>
                          </button>
                          <div
                            id={`route-description-${route.id}`}
                            className={`home-route-description-blind${descriptionOpen ? ' is-open' : ''}`}
                            aria-hidden={!descriptionOpen}
                          >
                            <div className="home-route-description-inner">
                              <p>{route.description}</p>
                            </div>
                          </div>
                        </>
                      ) : null}
                    </article>
                  </div>
                );
              })}
            </div>

          </section>
        )}
      </section>

      <footer className="home-footer">
        <div className="home-footer-version"><VersionBadge /></div>
        <div className="home-footer-actions">
          <RefreshButton placement="footer" />
          <Link className="home-footer-action" to="/account/profile">アカウント設定</Link>
          <button className="home-footer-action" type="button" onClick={handleSignOut}>サインアウト</button>
        </div>
      </footer>

      {deleteTarget && (
        <div
          className={`modal-backdrop route-list-delete-backdrop${isDeleteClosing ? ' is-closing' : ''}`}
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeDeleteConfirmation();
          }}
        >
          <section className={`route-modal route-list-delete-modal${isDeleteClosing ? ' is-closing' : ''}`} role="dialog" aria-modal="true" aria-labelledby="route-list-delete-title">
            <div className="route-list-delete-icon" aria-hidden="true">!</div>
            <h2 id="route-list-delete-title">本当に削除しますか？</h2>
            <p className="route-list-delete-name">「{deleteTarget.name}」</p>
            <p className="route-list-delete-copy">
              このRouteに含まれるPhase・Destination・Chat・メンバー情報も利用できなくなります。
            </p>
            <div className="modal-actions">
              <button className="secondary-button" type="button" onClick={closeDeleteConfirmation} disabled={isDeletingRoute}>
                キャンセル
              </button>
              <button className="route-list-delete-confirm" type="button" onClick={() => void handleDeleteRoute()} disabled={isDeletingRoute}>
                {isDeletingRoute ? '削除中…' : '削除する'}
              </button>
            </div>
          </section>
        </div>
      )}

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
