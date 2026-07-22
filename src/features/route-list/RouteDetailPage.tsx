import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BrandMark } from '../../shared/ui/BrandMark';
import { VersionBadge } from '../../shared/ui/VersionBadge';
import { getRoute, type RouteSummary } from './routes';

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

const touringToday = {
  currentLocation: '海老名SA',
  destination: '大観山展望台',
  status: '移動中',
  memberCount: 4,
  nextAction: '10:30までに展望台入口へ集合',
} as const;

const placeholderSections = [
  {
    key: 'planning',
    eyebrow: 'PLANNING',
    title: 'Routeを組み立てる',
    description: '目的地、順番、分岐や再合流を計画する画面です。',
  },
  {
    key: 'members',
    eyebrow: 'MEMBERS',
    title: '参加者',
    description: '参加メンバーと役割を確認・管理する画面です。',
  },
] as const;

function TodayCard() {
  return (
    <article className="route-detail-card today-card">
      <div className="route-detail-card-heading">
        <div>
          <p className="eyebrow">TODAY</p>
          <h2>今日のRoute</h2>
        </div>
        <span className="today-status-badge">{touringToday.status}</span>
      </div>

      <div className="today-route-flow" aria-label={`${touringToday.currentLocation}から${touringToday.destination}へ移動中`}>
        <div className="today-place">
          <span className="today-item-icon" aria-hidden="true">📍</span>
          <div>
            <p className="today-item-label">現在地</p>
            <p className="today-place-name">{touringToday.currentLocation}</p>
          </div>
        </div>

        <div className="today-flow-line" aria-hidden="true">
          <span />
          <strong>→</strong>
          <span />
        </div>

        <div className="today-place today-destination">
          <span className="today-item-icon" aria-hidden="true">🎯</span>
          <div>
            <p className="today-item-label">目的地</p>
            <p className="today-place-name">{touringToday.destination}</p>
          </div>
        </div>
      </div>

      <div className="today-information-grid">
        <section className="today-information-item">
          <span className="today-item-icon" aria-hidden="true">👥</span>
          <div>
            <p className="today-item-label">同行</p>
            <p className="today-item-value">{touringToday.memberCount}人</p>
          </div>
        </section>

        <section className="today-information-item today-next-action">
          <span className="today-item-icon" aria-hidden="true">➡️</span>
          <div>
            <p className="today-item-label">次の行動</p>
            <p className="today-item-value">{touringToday.nextAction}</p>
          </div>
        </section>
      </div>

      <p className="today-demo-note">ツーリングを想定した開発用サンプルです。編集と同期は今後の工程で接続します。</p>
    </article>
  );
}

export function RouteDetailPage() {
  const { routeId } = useParams<{ routeId: string }>();
  const [route, setRoute] = useState<RouteSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    if (!routeId) {
      setError('Route IDを確認できませんでした。');
      setLoading(false);
      return () => { active = false; };
    }

    void getRoute(routeId)
      .then((nextRoute) => {
        if (active) setRoute(nextRoute);
      })
      .catch((nextError) => {
        if (active) setError(getErrorMessage(nextError, 'Routeを読み込めませんでした。'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [routeId]);

  return (
    <main className="app-shell">
      <header className="global-header">
        <div className="header-brand"><BrandMark size={34} /><strong>D Route</strong></div>
        <Link className="icon-button header-link" to="/routes">一覧へ戻る</Link>
      </header>

      <section className="page-content route-detail-content" aria-labelledby="route-detail-title">
        {loading ? (
          <section className="route-loading" aria-live="polite">
            <span className="route-loading-spinner" aria-hidden="true" />
            <p>Routeを読み込んでいます</p>
          </section>
        ) : error || !route ? (
          <section className="empty-state" role="alert">
            <div className="empty-orbit" aria-hidden="true"><BrandMark size={60} /></div>
            <h1 id="route-detail-title">Routeを開けませんでした</h1>
            <p>{error ?? 'Routeが見つかりませんでした。'}</p>
            <Link className="primary-button link-button" to="/routes">Route一覧へ戻る</Link>
          </section>
        ) : (
          <>
            <div className="route-detail-hero">
              <div className="route-detail-mark" aria-hidden="true"><BrandMark size={46} /></div>
              <div>
                <p className="eyebrow">ROUTE OVERVIEW</p>
                <h1 id="route-detail-title">{route.name}</h1>
                <p>現在の目的地と行動方針を確認し、グループの動きを共有します。</p>
              </div>
            </div>

            <section className="route-detail-grid" aria-label="Route機能">
              <TodayCard />

              {placeholderSections.map((section) => (
                <article className="route-detail-card" key={section.key}>
                  <div className="route-detail-card-heading">
                    <div>
                      <p className="eyebrow">{section.eyebrow}</p>
                      <h2>{section.title}</h2>
                    </div>
                    <span className="coming-soon-badge">準備中</span>
                  </div>
                  <p>{section.description}</p>
                  <button className="secondary-button" type="button" disabled>
                    次の工程で実装
                  </button>
                </article>
              ))}
            </section>
          </>
        )}
      </section>

      <footer className="app-footer"><VersionBadge /><span>Today Touring Scenario</span></footer>
    </main>
  );
}
