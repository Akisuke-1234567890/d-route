import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BrandMark } from '../../shared/ui/BrandMark';
import { RefreshButton } from '../../shared/ui/RefreshButton';
import { VersionBadge } from '../../shared/ui/VersionBadge';
import { RouteBottomNav } from './RouteBottomNav';
import { getRouteDestinations, type DestinationSummary } from './destinations';

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function getImportanceLabel(importance: DestinationSummary['importance']) {
  switch (importance) {
    case 'must':
      return '必須';
    case 'optional':
      return '任意';
    case 'information':
      return '情報';
    default:
      return '行きたい';
  }
}

export function RoutePlacesPage() {
  const { routeId = '' } = useParams<{ routeId: string }>();
  const [destinations, setDestinations] = useState<DestinationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const next = await getRouteDestinations(routeId);
        if (active) setDestinations(next);
      } catch (err) {
        if (active) {
          setError(getErrorMessage(err, '目的地を読み込めませんでした。'));
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [routeId]);

  return (
    <main className="app-shell route-tab-shell">
      <header className="global-header">
        <div className="header-brand">
          <BrandMark size={34} />
          <strong>D Route</strong>
        </div>
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
          <button className="primary-button route-tab-action" type="button" disabled>
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
            <div className="empty-orbit" aria-hidden="true">
              <BrandMark size={58} />
            </div>
            <h2>目的地を読み込めませんでした</h2>
            <p>{error}</p>
          </section>
        ) : destinations.length === 0 ? (
          <section className="empty-state">
            <div className="empty-orbit" aria-hidden="true">
              <BrandMark size={58} />
            </div>
            <h2>目的地はまだありません</h2>
            <p>Destination DBとの接続は完了しています。次のPatchで目的地の追加機能を接続します。</p>
          </section>
        ) : (
          <div className="places-list">
            {destinations.map((destination, index) => (
              <article className="place-card" key={destination.id}>
                <div className="place-order" aria-label={`${index + 1}番目`}>
                  {index + 1}
                </div>
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

        <p className="route-tab-demo-note">
          p14では固定サンプル表示を廃止し、Supabaseのdestinationsを読み込むようにしました。
        </p>
      </section>

      <footer className="app-footer">
        <VersionBadge />
        <span>Planning Core</span>
      </footer>

      <RouteBottomNav routeId={routeId} />
    </main>
  );
}
