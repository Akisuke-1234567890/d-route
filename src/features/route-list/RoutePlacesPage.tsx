import { FormEvent, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BrandMark } from '../../shared/ui/BrandMark';
import { RefreshButton } from '../../shared/ui/RefreshButton';
import { VersionBadge } from '../../shared/ui/VersionBadge';
import { RouteBottomNav } from './RouteBottomNav';
import {
  createRouteDestination,
  getRouteDestinations,
  updateRouteDestination,
  type DestinationImportance,
  type DestinationSummary,
} from './destinations';

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function getImportanceLabel(importance: DestinationSummary['importance']) {
  switch (importance) {
    case 'must': return '必須';
    case 'optional': return '任意';
    case 'information': return '情報';
    default: return '行きたい';
  }
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
  const [importance, setImportance] = useState<DestinationImportance>('want');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [editing, setEditing] = useState<DestinationSummary | null>(null);
  const [editName, setEditName] = useState('');
  const [editLocationName, setEditLocationName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editImportance, setEditImportance] = useState<DestinationImportance>('want');
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
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
    setImportance('want');
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
    setEditImportance(destination.importance);
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
                  </div>
                  <h2>{destination.name}</h2>
                  <p>{destination.description ?? '説明はまだありません。'}</p>
                </div>
                <div className="place-card-actions">
                  <span className="place-status place-status-planned">予定</span>
                  <button
                    className="secondary-button"
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

            <form className="route-create-form" onSubmit={handleCreate}>
              <div className="field-group">
                <label htmlFor="destination-name">目的地名</label>
                <input ref={nameInputRef} id="destination-name" value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="例：大観山展望台" maxLength={40} autoComplete="off" disabled={saving} required />
                <p className="field-hint">必須・40文字まで</p>
              </div>

              <div className="field-group">
                <label htmlFor="destination-location">場所名</label>
                <input id="destination-location" value={locationName}
                  onChange={(event) => setLocationName(event.target.value)}
                  placeholder="例：箱根町" maxLength={80} autoComplete="off" disabled={saving} />
              </div>

              <div className="field-group">
                <label htmlFor="destination-importance">重要度</label>
                <select id="destination-importance" value={importance}
                  onChange={(event) => setImportance(event.target.value as DestinationImportance)}
                  disabled={saving}>
                  <option value="must">必須</option>
                  <option value="want">行きたい</option>
                  <option value="optional">任意</option>
                  <option value="information">情報</option>
                </select>
              </div>

              <div className="field-group">
                <label htmlFor="destination-description">メモ</label>
                <textarea id="destination-description" value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="集合場所や補足など" maxLength={200} rows={3} disabled={saving} />
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
          <section className="route-modal" role="dialog" aria-modal="true" aria-labelledby="edit-destination-title">
            <div className="modal-header">
              <div>
                <p className="eyebrow">EDIT PLACE</p>
                <h2 id="edit-destination-title">目的地を編集</h2>
              </div>
              <button className="modal-close-button" type="button" onClick={closeEditModal} aria-label="閉じる" disabled={editSaving}>×</button>
            </div>

            <form className="route-create-form" onSubmit={handleEdit}>
              <div className="field-group">
                <label htmlFor="edit-destination-name">目的地名</label>
                <input ref={editNameInputRef} id="edit-destination-name" value={editName}
                  onChange={(event) => setEditName(event.target.value)}
                  maxLength={40} autoComplete="off" disabled={editSaving} required />
                <p className="field-hint">必須・40文字まで</p>
              </div>

              <div className="field-group">
                <label htmlFor="edit-destination-location">場所名</label>
                <input id="edit-destination-location" value={editLocationName}
                  onChange={(event) => setEditLocationName(event.target.value)}
                  maxLength={80} autoComplete="off" disabled={editSaving} />
              </div>

              <div className="field-group">
                <label htmlFor="edit-destination-importance">重要度</label>
                <select id="edit-destination-importance" value={editImportance}
                  onChange={(event) => setEditImportance(event.target.value as DestinationImportance)}
                  disabled={editSaving}>
                  <option value="must">必須</option>
                  <option value="want">行きたい</option>
                  <option value="optional">任意</option>
                  <option value="information">情報</option>
                </select>
              </div>

              <div className="field-group">
                <label htmlFor="edit-destination-description">メモ</label>
                <textarea id="edit-destination-description" value={editDescription}
                  onChange={(event) => setEditDescription(event.target.value)}
                  maxLength={200} rows={3} disabled={editSaving} />
                <p className="field-hint">任意・200文字まで</p>
              </div>

              {editError && <p className="form-error" role="alert">{editError}</p>}

              <div className="modal-actions">
                <button className="secondary-button" type="button" onClick={closeEditModal} disabled={editSaving}>キャンセル</button>
                <button className="primary-button" type="submit" disabled={!editName.trim() || editSaving}>
                  {editSaving ? '保存中…' : '保存'}
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
