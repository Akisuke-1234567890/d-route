import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BrandMark } from '../../shared/ui/BrandMark';
import { RefreshButton } from '../../shared/ui/RefreshButton';
import { VersionBadge } from '../../shared/ui/VersionBadge';
import { useBodyScrollLock } from '../../shared/hooks/useBodyScrollLock';
import { RouteBottomNav } from './RouteBottomNav';
import { getRouteDestinations, type DestinationSummary } from './destinations';
import { createRoutePhase, getRoutePhases, type PhaseSummary } from './phases';
import './RoutePhasesPage.css';

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function RoutePhasesPage() {
  const { routeId = '' } = useParams<{ routeId: string }>();
  const [phases, setPhases] = useState<PhaseSummary[]>([]);
  const [destinations, setDestinations] = useState<DestinationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useBodyScrollLock(createOpen);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [nextPhases, nextDestinations] = await Promise.all([
        getRoutePhases(routeId),
        getRouteDestinations(routeId),
      ]);
      setPhases(nextPhases);
      setDestinations(nextDestinations);
    } catch (caught) {
      setError(getErrorMessage(caught, 'Phaseを読み込めませんでした。'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [routeId]);

  const destinationCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const destination of destinations) {
      if (!destination.phaseId) continue;
      counts.set(destination.phaseId, (counts.get(destination.phaseId) ?? 0) + 1);
    }
    return counts;
  }, [destinations]);

  const unassignedCount = useMemo(
    () => destinations.filter((destination) => !destination.phaseId).length,
    [destinations]
  );

  function openCreate() {
    setName('');
    setDescription('');
    setFormError(null);
    setCreateOpen(true);
  }

  function closeCreate() {
    if (saving) return;
    setCreateOpen(false);
    setFormError(null);
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;

    setSaving(true);
    setFormError(null);
    try {
      const created = await createRoutePhase(routeId, { name, description });
      setPhases((current) => [...current, created].sort((a, b) => a.orderValue - b.orderValue));
      setCreateOpen(false);
      setName('');
      setDescription('');
    } catch (caught) {
      setFormError(getErrorMessage(caught, 'Phaseを追加できませんでした。'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="app-shell route-tab-shell">
      <header className="global-header">
        <div className="header-brand"><BrandMark size={34} /><strong>D Route</strong></div>
        <div className="header-actions">
          <Link className="icon-button header-link" to={`/routes/${routeId}`}>Routeへ戻る</Link>
          <RefreshButton placement="header" />
        </div>
      </header>

      <section className="page-content route-tab-content phase-page-content" aria-labelledby="phases-title">
        <div className="route-tab-heading phase-heading">
          <div>
            <p className="eyebrow">PLANNING / PHASE</p>
            <h1 id="phases-title">Phase</h1>
            <p>午前・昼・帰路など、Routeを動きやすいまとまりに分けます。Phaseを使わない目的地があっても問題ありません。</p>
          </div>
          <button className="primary-button route-tab-action" type="button" onClick={openCreate}>
            ＋ Phaseを追加
          </button>
        </div>

        {loading ? (
          <section className="route-loading" aria-live="polite">
            <span className="route-loading-spinner" aria-hidden="true" />
            <p>Phaseを読み込んでいます</p>
          </section>
        ) : error ? (
          <section className="empty-state" role="alert">
            <div className="empty-orbit" aria-hidden="true"><BrandMark size={58} /></div>
            <h2>Phaseを読み込めませんでした</h2>
            <p>{error}</p>
            <button className="secondary-button" type="button" onClick={() => void load()}>再読み込み</button>
          </section>
        ) : (
          <>
            {phases.length === 0 ? (
              <section className="empty-state phase-empty-state">
                <div className="empty-orbit" aria-hidden="true"><BrandMark size={58} /></div>
                <h2>Phaseはまだありません</h2>
                <p>Phaseを追加してRouteを区切れます。Phaseを作らず、目的地をRoute直下で使うこともできます。</p>
                <button className="primary-button" type="button" onClick={openCreate}>Phaseを追加</button>
              </section>
            ) : (
              <div className="phase-list">
                {phases.map((phase, index) => (
                  <article className="phase-card" key={phase.id}>
                    <div className="phase-order" aria-label={`${index + 1}番目`}>{index + 1}</div>
                    <div className="phase-card-copy">
                      <div className="phase-card-topline">
                        <h2>{phase.name}</h2>
                        <span className="phase-destination-count">{destinationCounts.get(phase.id) ?? 0}件</span>
                      </div>
                      <p>{phase.description || 'メモはまだありません。'}</p>
                    </div>
                    <span className="phase-card-status">予定</span>
                  </article>
                ))}
              </div>
            )}

            {unassignedCount > 0 ? (
              <aside className="phase-unassigned-notice">
                <div>
                  <strong>Phase未設定の目的地</strong>
                  <p>{unassignedCount}件あります。Phaseへの移動は後続Patchで追加します。</p>
                </div>
                <Link to={`/routes/${routeId}/places`}>Placesを見る ›</Link>
              </aside>
            ) : null}
          </>
        )}
      </section>

      <footer className="app-footer"><VersionBadge /><span>Planning Core / Phase</span></footer>
      <RouteBottomNav routeId={routeId} />

      {createOpen && (
        <div className="modal-backdrop phase-modal-backdrop" role="presentation">
          <section className="route-modal phase-modal" role="dialog" aria-modal="true" aria-labelledby="create-phase-title">
            <div className="modal-header">
              <div>
                <p className="eyebrow">ADD PHASE</p>
                <h2 id="create-phase-title">Phaseを追加</h2>
              </div>
              <button className="modal-close-button" type="button" onClick={closeCreate} aria-label="閉じる" disabled={saving}>×</button>
            </div>

            <form className="phase-form" onSubmit={(event) => void handleCreate(event)}>
              <div className="field-group">
                <label htmlFor="phase-name">Phase名</label>
                <input
                  id="phase-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="例：午前"
                  maxLength={40}
                  autoFocus
                  disabled={saving}
                />
              </div>

              <div className="field-group">
                <label htmlFor="phase-description">メモ <span className="field-optional">任意</span></label>
                <textarea
                  id="phase-description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="このPhaseの目的や目安など"
                  rows={3}
                  disabled={saving}
                />
              </div>

              {formError ? <div className="route-inline-error" role="alert">{formError}</div> : null}

              <div className="modal-actions phase-modal-actions">
                <button className="primary-button" type="submit" disabled={saving || !name.trim()}>
                  {saving ? '追加中…' : '追加'}
                </button>
                <button className="secondary-button" type="button" onClick={closeCreate} disabled={saving}>キャンセル</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}
