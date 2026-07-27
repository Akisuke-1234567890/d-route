import { FormEvent, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BrandMark } from '../../shared/ui/BrandMark';
import { RefreshButton } from '../../shared/ui/RefreshButton';
import { VersionBadge } from '../../shared/ui/VersionBadge';
import { RouteBottomNav } from './RouteBottomNav';
import './RoutePlacesPage.css';
import {
  createRouteDestination,
  getRouteDestinations,
  softDeleteRouteDestination,
  updateRouteDestination,
  type DestinationImportance,
  type DestinationSummary,
} from './destinations';

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function getImportanceLabel(importance: DestinationSummary['importance']) {
  return importance === 'optional' ? '任意' : '必須';
}

export function RoutePlacesPage() {
  const { routeId = '' } = useParams<{ routeId: string }>();
  const [destinations, setDestinations] = useState<DestinationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [locationName, setLocationName] = useState('');
  const [description, setDescription] = useState('');
  const [importance, setImportance] = useState<DestinationImportance>('must');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [editing, setEditing] = useState<DestinationSummary | null>(null);
  const [editName, setEditName] = useState('');
  const [editLocationName, setEditLocationName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editImportance, setEditImportance] = useState<DestinationImportance>('must');
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DestinationSummary | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const editNameInputRef = useRef<HTMLInputElement>(null);

  async function loadDestinations() {
    setLoading(true);
    setError(null);
    try {
      setDestinations(await getRouteDestinations(routeId));
    } catch (err) {
      setError(getErrorMessage(err, '目的地を読み込めませんでした。'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadDestinations(); }, [routeId]);

  useEffect(() => {
    if (!createOpen) return;
    const timer = window.setTimeout(() => nameInputRef.current?.focus(), 80);
    return () => window.clearTimeout(timer);
  }, [createOpen]);

  useEffect(() => {
    if (!editing) return;
    const timer = window.setTimeout(() => editNameInputRef.current?.focus(), 80);
    return () => window.clearTimeout(timer);
  }, [editing]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2400);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function openCreateModal() {
    setName('');
    setLocationName('');
    setDescription('');
    setImportance('must');
    setFormError(null);
    setCreateOpen(true);
  }

  function closeCreateModal() {
    if (!saving) setCreateOpen(false);
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;

    setSaving(true);
    setFormError(null);
    try {
      const created = await createRouteDestination(routeId, {
        name,
        locationName,
        description,
        importance,
      });
      setDestinations((current) => [...current, created].sort((a, b) => a.orderValue - b.orderValue));
      setCreateOpen(false);
      setToast('目的地を追加しました');
    } catch (err) {
      setFormError(getErrorMessage(err, '目的地を追加できませんでした。'));
    } finally {
      setSaving(false);
    }
  }


  function openEditModal(destination: DestinationSummary) {
    setEditing(destination);
    setEditName(destination.name);
    setEditLocationName(destination.locationName ?? '');
    setEditDescription(destination.description ?? '');
    setEditImportance(destination.importance === 'optional' ? 'optional' : 'must');
    setEditError(null);
  }

  function closeEditModal() {
    if (!editSaving) setEditing(null);
  }

  async function handleEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing || editSaving) return;

    setEditSaving(true);
    setEditError(null);
    try {
      const updated = await updateRouteDestination(routeId, editing.id, {
        name: editName,
        locationName: editLocationName,
        description: editDescription,
        importance: editImportance,
      });
      setDestinations((current) =>
        current.map((item) => item.id === updated.id ? updated : item)
      );
      setEditing(null);
      setToast('目的地を更新しました');
    } catch (err) {
      setEditError(getErrorMessage(err, '目的地を更新できませんでした。'));
    } finally {
      setEditSaving(false);
    }
  }


  function askDeleteDestination() {
    if (!editing || editSaving) return;
    setDeleteError(null);
    setDeleteTarget(editing);
  }

  function closeDeleteDialog() {
    if (!deleting) setDeleteTarget(null);
  }

  async function handleDeleteDestination() {
    if (!deleteTarget || deleting) return;

    setDeleting(true);
    setDeleteError(null);
    try {
      await softDeleteRouteDestination(routeId, deleteTarget.id);
      setDestinations((current) => current.filter((item) => item.id !== deleteTarget.id));
      setDeleteTarget(null);
      setEditing(null);
      setToast('目的地を削除しました');
    } catch (err) {
      setDeleteError(getErrorMessage(err, '目的地を削除できませんでした。'));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <main className="app-shell route-tab-shell">
      <header className="global-header">
        <div className="header-brand"><BrandMark size={34} /><strong>D Route</strong></div>
        <div className="header-actions">
          <Link className="icon-button header-link" to="/routes">一覧へ戻る</Link>
          <RefreshButton placement="header" />
        </div>
      </header>

      <section className="page-content route-tab-content" aria-labelledby="places-title">
        <div className="route-tab-heading">
          <div>
            <p className="eyebrow">PLACES</p>
            <h1 id="places-title">目的地</h1>
            <p>このRouteで共有する目的地を、登録した順番で確認します。</p>
          </div>
          <button className="primary-button route-tab-action" type="button" onClick={openCreateModal}>
            ＋ 目的地を追加
          </button>
        </div>

        {loading ? (
          <section className="route-loading" aria-live="polite">
            <span className="route-loading-spinner" aria-hidden="true" />
            <p>目的地を読み込んでいます</p>
          </section>
        ) : error ? (
          <section className="empty-state" role="alert">
            <div className="empty-orbit" aria-hidden="true"><BrandMark size={58} /></div>
            <h2>目的地を読み込めませんでした</h2>
            <p>{error}</p>
            <button className="secondary-button" type="button" onClick={() => void loadDestinations()}>再読み込み</button>
          </section>
        ) : destinations.length === 0 ? (
          <section className="empty-state">
            <div className="empty-orbit" aria-hidden="true"><BrandMark size={58} /></div>
            <h2>目的地はまだありません</h2>
            <p>「＋ 目的地を追加」から、このRouteの最初の目的地を登録できます。</p>
          </section>
        ) : (
          <div className="places-list">
            {destinations.map((destination, index) => (
              <article className="place-card" key={destination.id}>
                <div className="place-order" aria-label={`${index + 1}番目`}>{index + 1}</div>
                <div className="place-icon" aria-hidden="true">📍</div>
                <div className="place-copy">
                  <div className="place-meta">
                    <span>{getImportanceLabel(destination.importance)}</span>
                    {destination.locationName ? <span>{destination.locationName}</span> : null}
                    <span className="place-status place-status-planned">予定</span>
                  </div>
                  <h2>{destination.name}</h2>
                  <p>{destination.description ?? '説明はまだありません。'}</p>
                </div>
                <div className="place-card-actions">
                  <button
                    className="place-edit-button"
                    type="button"
                    onClick={() => openEditModal(destination)}
                    aria-label={`${destination.name}を編集`}
                  >
                    編集
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <footer className="app-footer"><VersionBadge /><span>Planning Core</span></footer>
      <RouteBottomNav routeId={routeId} />

      {createOpen && (
        <div className="modal-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget) closeCreateModal();
        }}>
          <section className="route-modal" role="dialog" aria-modal="true" aria-labelledby="create-destination-title">
            <div className="modal-header">
              <div>
                <p className="eyebrow">NEW PLACE</p>
                <h2 id="create-destination-title">目的地を追加</h2>
              </div>
              <button className="modal-close-button" type="button" onClick={closeCreateModal} aria-label="閉じる" disabled={saving}>×</button>
            </div>

            <form className="route-create-form place-form" onSubmit={handleCreate}>
              <div className="field-group">
                <label htmlFor="destination-name">目的地名</label>
                <input ref={nameInputRef} id="destination-name" value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="例：大観山展望台" maxLength={40} autoComplete="off" disabled={saving} required />
                <p className="field-hint">必須・40文字まで</p>
              </div>

              <div className="field-group">
                <label htmlFor="destination-location">場所名 <span className="field-optional">任意</span></label>
                <input id="destination-location" value={locationName}
                  onChange={(event) => setLocationName(event.target.value)}
                  placeholder="例：淵野辺駅" maxLength={80} autoComplete="off" disabled={saving} />
              </div>

              <div className="field-group">
                <span className="field-label">重要度</span>
                <div className="importance-segment" role="group" aria-label="重要度">
                  <button
                    className={`importance-option ${importance === 'must' ? 'is-active' : ''}`}
                    type="button"
                    onClick={() => setImportance('must')}
                    disabled={saving}
                    aria-pressed={importance === 'must'}
                  >
                    必須
                  </button>
                  <button
                    className={`importance-option ${importance === 'optional' ? 'is-active' : ''}`}
                    type="button"
                    onClick={() => setImportance('optional')}
                    disabled={saving}
                    aria-pressed={importance === 'optional'}
                  >
                    任意
                  </button>
                </div>
              </div>

              <div className="field-group">
                <label htmlFor="destination-description">メモ <span className="field-optional">任意</span></label>
                <textarea id="destination-description" value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="例：改札を出て右側に集合" maxLength={200} rows={3} disabled={saving} />
                <p className="field-hint">任意・200文字まで</p>
              </div>

              {formError && <p className="form-error" role="alert">{formError}</p>}

              <div className="modal-actions">
                <button className="secondary-button" type="button" onClick={closeCreateModal} disabled={saving}>キャンセル</button>
                <button className="primary-button" type="submit" disabled={!name.trim() || saving}>
                  {saving ? '追加中…' : '追加'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {editing && (
        <div className="modal-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget) closeEditModal();
        }}>
          <section className="route-modal edit-place-modal" role="dialog" aria-modal="true" aria-labelledby="edit-destination-title">
            <div className="modal-header">
              <div>
                <p className="eyebrow">EDIT PLACE</p>
                <h2 id="edit-destination-title">目的地を編集</h2>
              </div>
              <button className="modal-close-button" type="button" onClick={closeEditModal} aria-label="閉じる" disabled={editSaving}>×</button>
            </div>

            <form className="route-create-form place-form" onSubmit={handleEdit}>
              <div className="field-group">
                <label htmlFor="edit-destination-name">目的地名</label>
                <input ref={editNameInputRef} id="edit-destination-name" value={editName}
                  onChange={(event) => setEditName(event.target.value)}
                  maxLength={40} autoComplete="off" disabled={editSaving} required />
                <p className="field-hint">必須・40文字まで</p>
              </div>

              <div className="field-group">
                <label htmlFor="edit-destination-location">場所名 <span className="field-optional">任意</span></label>
                <input id="edit-destination-location" value={editLocationName}
                  onChange={(event) => setEditLocationName(event.target.value)}
                  maxLength={80} autoComplete="off" disabled={editSaving} />
              </div>

              <div className="field-group">
                <span className="field-label">重要度</span>
                <div className="importance-segment" role="group" aria-label="重要度">
                  <button
                    className={`importance-option ${editImportance === 'must' ? 'is-active' : ''}`}
                    type="button"
                    onClick={() => setEditImportance('must')}
                    disabled={editSaving}
                    aria-pressed={editImportance === 'must'}
                  >
                    必須
                  </button>
                  <button
                    className={`importance-option ${editImportance === 'optional' ? 'is-active' : ''}`}
                    type="button"
                    onClick={() => setEditImportance('optional')}
                    disabled={editSaving}
                    aria-pressed={editImportance === 'optional'}
                  >
                    任意
                  </button>
                </div>
              </div>

              <div className="field-group">
                <label htmlFor="edit-destination-description">メモ <span className="field-optional">任意</span></label>
                <textarea id="edit-destination-description" value={editDescription}
                  onChange={(event) => setEditDescription(event.target.value)}
                  maxLength={200} rows={2} disabled={editSaving} />
                <p className="field-hint">任意・200文字まで</p>
              </div>

              {editError && <p className="form-error" role="alert">{editError}</p>}

              <div className="modal-actions edit-place-actions">
                <button className="primary-button" type="submit" disabled={!editName.trim() || editSaving}>
                  {editSaving ? '保存中…' : '保存'}
                </button>
                <button className="secondary-button" type="button" onClick={closeEditModal} disabled={editSaving}>
                  キャンセル
                </button>
              </div>

              <button
                className="place-delete-button"
                type="button"
                onClick={askDeleteDestination}
                disabled={editSaving}
              >
                この目的地を削除
              </button>
            </form>
          </section>
        </div>
      )}

      {deleteTarget && (
        <div
          className="modal-backdrop route-delete-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !deleting) closeDeleteDialog();
          }}
        >
          <section
            className="route-modal route-delete-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-destination-title"
            aria-describedby="delete-destination-description"
          >
            <div className="modal-header">
              <div>
                <p className="eyebrow route-danger-eyebrow">DELETE PLACE</p>
                <h2 id="delete-destination-title">この目的地を削除しますか？</h2>
              </div>
              <button
                className="modal-close-button"
                type="button"
                onClick={closeDeleteDialog}
                aria-label="閉じる"
                disabled={deleting}
              >
                ×
              </button>
            </div>

            <p id="delete-destination-description" className="route-delete-description">
              「{deleteTarget.name}」を削除します。削除後はD Routeから元に戻せません。
            </p>

            {deleteError && <div className="route-inline-error" role="alert">{deleteError}</div>}

            <div className="modal-actions">
              <button
                className="secondary-button"
                type="button"
                onClick={closeDeleteDialog}
                disabled={deleting}
              >
                キャンセル
              </button>
              <button
                className="route-danger-confirm-button"
                type="button"
                onClick={() => void handleDeleteDestination()}
                disabled={deleting}
              >
                {deleting ? '削除中…' : '目的地を削除'}
              </button>
            </div>
          </section>
        </div>
      )}

      {toast && <div className="toast" role="alert">{toast}</div>}
    </main>
  );
}
