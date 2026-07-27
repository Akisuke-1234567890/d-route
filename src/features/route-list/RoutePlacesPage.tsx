import { FormEvent, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BrandMark } from '../../shared/ui/BrandMark';
import { RefreshButton } from '../../shared/ui/RefreshButton';
import { VersionBadge } from '../../shared/ui/VersionBadge';
import { RouteBottomNav } from './RouteBottomNav';
import {
  createRouteDestination,
  getRouteDestinations,
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
  const nameInputRef = useRef<HTMLInputElement>(null);

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
                <span className="place-status place-status-planned">予定</span>
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

      {toast && <div className="toast" role="alert">{toast}</div>}
    </main>
  );
}
