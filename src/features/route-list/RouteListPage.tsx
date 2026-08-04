import { FormEvent, PointerEvent as ReactPointerEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { BrandMark } from '../../shared/ui/BrandMark';
import { VersionBadge } from '../../shared/ui/VersionBadge';
import { RefreshButton } from '../../shared/ui/RefreshButton';
import { useBodyScrollLock } from '../../shared/hooks/useBodyScrollLock';
import { signOut } from '../auth/auth';
import { createRoute, createRouteFromBuiltInTemplate, deleteOwnedRoute, listRoutes, setOwnedRouteArchived, type BuiltInTemplateKey, type RouteSummary } from './routes';

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

const builtInTemplates: Array<{
  key: BuiltInTemplateKey;
  icon: string;
  name: string;
  description: string;
}> = [
  { key:'touring', icon:'🏍️', name:'ツーリング', description:'集合・休憩・食事・給油・立ち寄り・帰路' },
  { key:'day_drive', icon:'🚗', name:'日帰りドライブ', description:'出発・立ち寄り・昼食・観光・帰宅' },
  { key:'day_trip', icon:'🧳', name:'旅行・お出かけ', description:'集合・午前・昼食・午後・宿泊または帰宅' },
  { key:'event', icon:'🎫', name:'イベント参加', description:'集合・入場・メイン予定・食事・解散' },
];

type CreateMode = 'blank' | 'template';

export function RouteListPage({ onSignedOut }: { onSignedOut: () => void }) {
  const [routes, setRoutes] = useState<RouteSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [routeName, setRouteName] = useState('');
  const [routeDescription, setRouteDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createMode, setCreateMode] = useState<CreateMode>('blank');
  const [selectedTemplateKey, setSelectedTemplateKey] = useState<BuiltInTemplateKey>('touring');

  const [toast, setToast] = useState<string | null>(null);
  const [expandedDescriptionId, setExpandedDescriptionId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [swipedRouteId, setSwipedRouteId] = useState<string | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<RouteSummary | null>(null);
  const [isDeletingRoute, setIsDeletingRoute] = useState(false);
  const [isDeleteClosing, setIsDeleteClosing] = useState(false);
  const [archiveActionTarget, setArchiveActionTarget] = useState<RouteSummary | null>(null);
  const [archiveActionSaving, setArchiveActionSaving] = useState(false);
  const [archiveActionError, setArchiveActionError] = useState('');
  const swipeStartXRef = useRef(0);
  const swipeStartOffsetRef = useRef(0);
  const activeSwipeRouteIdRef = useRef<string | null>(null);
  const swipeMovedRef = useRef(false);
  const suppressClickUntilRef = useRef(0);

  const routeNameInputRef = useRef<HTMLInputElement>(null);

  useBodyScrollLock(Boolean(deleteTarget || archiveActionTarget || isCreateOpen));

  const recentRoutes = useMemo(
    () => [...routes].sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at)),
    [routes],
  );

  useEffect(() => {
    let active = true;
    setLoading(true);
    void listRoutes(showArchived ? 'archived' : 'active')
      .then((nextRoutes) => { if (active) setRoutes(nextRoutes); })
      .catch((error) => { if (active) setToast(getErrorMessage(error, 'Route一覧を読み込めませんでした。')); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [showArchived]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!isCreateOpen) return;
    window.setTimeout(() => routeNameInputRef.current?.focus(), 0);
  }, [isCreateOpen]);


const DELETE_REVEAL_WIDTH = 188;

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

function requestArchiveAction(route: RouteSummary) {
  closeSwipe();
  setArchiveActionError('');
  setArchiveActionTarget(route);
}

function closeArchiveAction() {
  if (archiveActionSaving) return;
  setArchiveActionTarget(null);
  setArchiveActionError('');
}

async function handleArchiveAction() {
  if (!archiveActionTarget || archiveActionSaving) return;
  setArchiveActionSaving(true);
  setArchiveActionError('');
  try {
    const shouldArchive = archiveActionTarget.status !== 'archived';
    await setOwnedRouteArchived(archiveActionTarget.id, shouldArchive);
    setRoutes((current) => current.filter((route) => route.id !== archiveActionTarget.id));
    setExpandedDescriptionId((current) => current === archiveActionTarget.id ? null : current);
    setToast(shouldArchive ? `「${archiveActionTarget.name}」をアーカイブしました。` : `「${archiveActionTarget.name}」を一覧へ戻しました。`);
    setArchiveActionTarget(null);
  } catch (error) {
    setArchiveActionError(getErrorMessage(error, archiveActionTarget.status === 'archived' ? 'Routeを復元できませんでした。' : 'Routeをアーカイブできませんでした。'));
  } finally {
    setArchiveActionSaving(false);
  }
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
    setRouteDescription('');
    setCreateMode('blank');
    setSelectedTemplateKey('touring');
    setIsCreateOpen(true);
  }

  function closeCreateModal() {
    if (isCreating) return;
    setIsCreateOpen(false);
    setRouteName('');
    setRouteDescription('');
    setCreateMode('blank');
    setSelectedTemplateKey('touring');
  }

  function chooseCreateMode(mode: CreateMode) {
    setCreateMode(mode);
    if (mode === 'template') {
      const selected = builtInTemplates.find((template) => template.key === selectedTemplateKey) ?? builtInTemplates[0];
      setRouteName((current) => current.trim() ? current : selected.name);
    }
  }

  function chooseCreateTemplate(templateKey: BuiltInTemplateKey) {
    const template = builtInTemplates.find((item) => item.key === templateKey);
    if (!template) return;
    setSelectedTemplateKey(templateKey);
    setRouteName(template.name);
  }

  async function handleCreateRoute(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedName = routeName.trim();
    if (!normalizedName || isCreating) return;

    setIsCreating(true);
    try {
      const newRoute = createMode === 'template'
        ? await createRouteFromBuiltInTemplate(selectedTemplateKey, normalizedName, routeDescription)
        : await createRoute(normalizedName, routeDescription);
      setRoutes((current) => [newRoute, ...current.filter((route) => route.id !== newRoute.id)]);
      setIsCreateOpen(false);
      setRouteName('');
      setRouteDescription('');
      setCreateMode('blank');
      setSelectedTemplateKey('touring');
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
            <h2>{showArchived ? 'アーカイブはありません' : 'Routeがまだありません'}</h2>
            <p>{showArchived ? '終了したRouteをアーカイブすると、ここに表示されます。' : '最初のRouteを作って、予定と順番を整理しましょう。'}</p>
            {showArchived ? (
              <button className="secondary-button" type="button" onClick={() => setShowArchived(false)}>使用中のRouteへ戻る</button>
            ) : (
              <button className="primary-button" type="button" onClick={openCreateModal}>最初のRouteを作る</button>
            )}
          </section>
        ) : (
          <section className="home-route-section" aria-labelledby="recent-routes-title">
            <div className="home-section-heading">
              <div>
                <h2 id="recent-routes-title">{showArchived ? 'アーカイブ' : '最近使ったRoute'}</h2>
                <span>{recentRoutes.length}件</span>
              </div>
              <button
                className={`home-archive-toggle${showArchived ? ' is-active' : ''}`}
                type="button"
                onClick={() => {
                  closeSwipe();
                  setExpandedDescriptionId(null);
                  setShowArchived((current) => !current);
                }}
              >
                {showArchived ? '使用中を見る' : 'アーカイブを見る'}
              </button>
            </div>

            <div className="home-route-list">
              {recentRoutes.map((route) => {
                const descriptionOpen = expandedDescriptionId === route.id;
                const swipeOpen = swipedRouteId === route.id;
                const currentOffset = swipeOpen ? swipeOffset : 0;

                return (
                  <div className={`home-route-swipe-shell${swipeOpen ? ' is-open' : ''}`} key={route.id}>
                    <div className="home-route-swipe-actions" aria-hidden={!swipeOpen}>
                      <button
                        className={`home-route-swipe-archive${showArchived ? ' is-restore' : ''}`}
                        type="button"
                        onClick={() => requestArchiveAction(route)}
                        aria-label={showArchived ? `${route.name}を一覧へ戻す` : `${route.name}をアーカイブ`}
                        tabIndex={swipeOpen ? 0 : -1}
                      >
                        <span aria-hidden="true">{showArchived ? '↩' : '▣'}</span>
                        <strong>{showArchived ? '復元' : 'アーカイブ'}</strong>
                      </button>
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
                    </div>

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

      {archiveActionTarget && (
        <div className="modal-backdrop route-list-archive-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeArchiveAction(); }}>
          <section className="route-modal route-list-archive-modal" role="dialog" aria-modal="true" aria-labelledby="route-list-archive-title">
            <div className="route-list-archive-icon" aria-hidden="true">{archiveActionTarget.status === 'archived' ? '↩' : '▣'}</div>
            <h2 id="route-list-archive-title">{archiveActionTarget.status === 'archived' ? '一覧へ戻しますか？' : 'アーカイブしますか？'}</h2>
            <p className="route-list-delete-name">「{archiveActionTarget.name}」</p>
            <p className="route-list-delete-copy">
              {archiveActionTarget.status === 'archived'
                ? '通常のRoute一覧へ戻します。内容や進行状態はそのまま維持されます。'
                : '通常の一覧から隠します。削除ではないため、あとから復元できます。'}
            </p>
            {archiveActionError && <div className="route-inline-error" role="alert">{archiveActionError}</div>}
            <div className="modal-actions">
              <button className="secondary-button" type="button" onClick={closeArchiveAction} disabled={archiveActionSaving}>キャンセル</button>
              <button className="primary-button" type="button" onClick={() => void handleArchiveAction()} disabled={archiveActionSaving}>
                {archiveActionSaving ? '処理中…' : archiveActionTarget.status === 'archived' ? '一覧へ戻す' : 'アーカイブする'}
              </button>
            </div>
          </section>
        </div>
      )}

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
              このRouteに含まれるPhase・予定・Chat・メンバー情報も利用できなくなります。
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
        <div className="modal-backdrop route-create-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeCreateModal(); }}>
          <section className="route-modal route-create-modal" role="dialog" aria-modal="true" aria-labelledby="create-route-title">
            <div className="modal-header">
              <div>
                <p className="eyebrow">NEW ROUTE</p>
                <h2 id="create-route-title">新しいRouteを作る</h2>
              </div>
              <button className="modal-close-button" type="button" onClick={closeCreateModal} aria-label="閉じる" disabled={isCreating}>×</button>
            </div>
            <form className="route-create-form" onSubmit={handleCreateRoute}>
              <div className="route-create-methods" role="radiogroup" aria-label="Routeの作り方">
                <button
                  className={`route-create-method${createMode === 'blank' ? ' is-selected' : ''}`}
                  type="button"
                  role="radio"
                  aria-checked={createMode === 'blank'}
                  onClick={() => chooseCreateMode('blank')}
                  disabled={isCreating}
                >
                  <span aria-hidden="true">＋</span>
                  <strong>空のRoute</strong>
                  <small>Phaseや予定を一から作る</small>
                </button>
                <button
                  className={`route-create-method${createMode === 'template' ? ' is-selected' : ''}`}
                  type="button"
                  role="radio"
                  aria-checked={createMode === 'template'}
                  onClick={() => chooseCreateMode('template')}
                  disabled={isCreating}
                >
                  <span aria-hidden="true">▦</span>
                  <strong>テンプレートから</strong>
                  <small>一般的な流れを入れて作る</small>
                </button>
              </div>

              {createMode === 'template' && (
                <div className="route-create-template-list" role="list" aria-label="テンプレートを選ぶ">
                  {builtInTemplates.map((template) => (
                    <button
                      className={`route-create-template${selectedTemplateKey === template.key ? ' is-selected' : ''}`}
                      type="button"
                      role="listitem"
                      key={template.key}
                      onClick={() => chooseCreateTemplate(template.key)}
                      disabled={isCreating}
                    >
                      <span aria-hidden="true">{template.icon}</span>
                      <span>
                        <strong>{template.name}</strong>
                        <small>{template.description}</small>
                      </span>
                    </button>
                  ))}
                </div>
              )}

              <div className="field-group">
                <label htmlFor="route-name">Route名</label>
                <input
                  ref={routeNameInputRef}
                  id="route-name"
                  name="route-name"
                  value={routeName}
                  onChange={(event) => setRouteName(event.target.value)}
                  placeholder={createMode === 'template' ? 'テンプレート名を変更できます' : '例：家族でディズニーシー'}
                  maxLength={60}
                  autoComplete="off"
                  disabled={isCreating}
                  required
                />
                <p className="field-hint">60文字まで。あとから変更できます。</p>
              </div>
              <div className="field-group">
                <label htmlFor="route-description">説明 <span className="route-create-optional">任意</span></label>
                <textarea
                  id="route-description"
                  name="route-description"
                  value={routeDescription}
                  onChange={(event) => setRouteDescription(event.target.value)}
                  placeholder="例：途中から合流あり／帰りは自由解散"
                  maxLength={200}
                  rows={4}
                  disabled={isCreating}
                />
                <p className="field-hint">{routeDescription.length}/200文字。あとからRoute設定で変更できます。</p>
              </div>
              <div className="modal-actions">
                <button className="secondary-button" type="button" onClick={closeCreateModal} disabled={isCreating}>キャンセル</button>
                <button className="primary-button" type="submit" disabled={!routeName.trim() || isCreating}>
                  {isCreating ? '作成中…' : createMode === 'template' ? 'テンプレートで作成' : '空のRouteを作成'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {toast && <div className="toast" role="alert">{toast}</div>}
    </main>
  );
}
