import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BrandMark } from '../../shared/ui/BrandMark';
import { VersionBadge } from '../../shared/ui/VersionBadge';
import { getRoute, type RouteSummary } from './routes';
import { RouteBottomNav } from './RouteBottomNav';

type DestinationCard = {
  id: string;
  title: string;
  time?: string;
  note?: string;
  attention?: boolean;
  checked?: boolean;
};

const prototypePhase = {
  name: '午後',
  startTime: '12:00',
  destinations: [
    { id: 'd1', title: 'センター・オブ・ジ・アース', time: '12:30', checked: true },
    { id: 'd2', title: 'お土産を見る', time: '13:00', checked: true },
    {
      id: 'd3',
      title: 'レストラン',
      time: '13:30',
      note: '予約済み・時間厳守',
      attention: true,
      checked: false,
    },
    { id: 'd4', title: 'タワー・オブ・テラー', checked: false },
    { id: 'd5', title: '写真を撮る', checked: false },
  ] satisfies DestinationCard[],
} as const;

const prototypeChat = {
  author: '佐藤',
  body: '集合場所変更します',
  time: '16:02',
  priority: true,
} as const;

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function PhaseDashboard({ routeId }: { routeId: string }) {
  const [checkedIds, setCheckedIds] = useState<Set<string>>(() => new Set(prototypePhase.destinations.filter((item) => item.checked).map((item) => item.id)));
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  const destinations = useMemo<readonly DestinationCard[]>(() => prototypePhase.destinations, []);

  const scrollToIndex = (nextIndex: number) => {
    const bounded = Math.max(0, Math.min(nextIndex, destinations.length - 1));
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const card = scroller.querySelector<HTMLElement>(`[data-destination-index="${bounded}"]`);
    card?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  };

  const onScroll = () => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const cards = Array.from(scroller.querySelectorAll<HTMLElement>('[data-destination-index]'));
    const center = scroller.scrollLeft + scroller.clientWidth / 2;
    let nearest = 0;
    let nearestDistance = Number.POSITIVE_INFINITY;
    cards.forEach((card, index) => {
      const cardCenter = card.offsetLeft + card.offsetWidth / 2;
      const distance = Math.abs(cardCenter - center);
      if (distance < nearestDistance) {
        nearest = index;
        nearestDistance = distance;
      }
    });
    setActiveIndex(nearest);
  };

  const toggleCheck = (id: string) => {
    setCheckedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <>
      <article className="v2-phase-panel" aria-labelledby="v2-phase-title">
        <div className="v2-phase-heading">
          <div>
            <p className="eyebrow">CURRENT PHASE</p>
            <h2 id="v2-phase-title">{prototypePhase.name}</h2>
          </div>
          <span className="v2-phase-time">{prototypePhase.startTime}〜</span>
        </div>

        <div className="v2-destination-stage">
          <button
            className="v2-carousel-button v2-carousel-prev"
            type="button"
            aria-label="前の予定を見る"
            disabled={activeIndex === 0}
            onClick={() => scrollToIndex(activeIndex - 1)}
          >
            ‹
          </button>

          <div className="v2-destination-scroller" ref={scrollerRef} onScroll={onScroll}>
            {destinations.map((destination, index) => {
              const checked = checkedIds.has(destination.id);
              return (
                <article
                  className={`v2-destination-card${destination.attention ? ' is-attention' : ''}`}
                  data-destination-index={index}
                  key={destination.id}
                  aria-label={`${index + 1}/${destinations.length} ${destination.title}`}
                >
                  <div className="v2-card-topline">
                    <span className="v2-card-count">{index + 1} / {destinations.length}</span>
                    {destination.attention ? <span className="v2-attention-badge" title="注目する予定">✦ 注目</span> : <span />}
                  </div>

                  <div className="v2-card-main">
                    {destination.time ? <time className="v2-card-time">{destination.time}</time> : <span className="v2-card-time is-empty">PHASE TASK</span>}
                    <h3>{destination.title}</h3>
                    {destination.note ? <p className="v2-card-note">{destination.note}</p> : <p className="v2-card-note is-empty">このPhase内で確認する予定</p>}
                  </div>

                  <button
                    className={`v2-check-button${checked ? ' is-checked' : ''}`}
                    type="button"
                    aria-pressed={checked}
                    aria-label={`${destination.title}の確認チェック${checked ? 'を外す' : 'を付ける'}`}
                    onClick={() => toggleCheck(destination.id)}
                  >
                    <span aria-hidden="true">{checked ? '✓' : ''}</span>
                  </button>
                </article>
              );
            })}
          </div>

          <button
            className="v2-carousel-button v2-carousel-next"
            type="button"
            aria-label="次の予定を見る"
            disabled={activeIndex === destinations.length - 1}
            onClick={() => scrollToIndex(activeIndex + 1)}
          >
            ›
          </button>
        </div>

        <div className="v2-carousel-dots" aria-label={`全${destinations.length}件中${activeIndex + 1}件目`}>
          {destinations.map((destination, index) => (
            <button
              key={destination.id}
              type="button"
              className={index === activeIndex ? 'is-active' : ''}
              aria-label={`${index + 1}件目を見る`}
              onClick={() => scrollToIndex(index)}
            />
          ))}
        </div>

        <button className="v2-branch-summary" type="button">
          <span><strong>※ 別行動あり</strong><small>タップして班の概要を確認</small></span>
          <span aria-hidden="true">›</span>
        </button>
      </article>

      <article className="v2-chat-summary">
        <div className="v2-section-heading">
          <div>
            <p className="eyebrow">CHAT</p>
            <h2>連絡</h2>
          </div>
          <Link className="v2-text-link" to={`/routes/${routeId}/chat`}>Chatを見る ›</Link>
        </div>
        <div className={`v2-latest-message${prototypeChat.priority ? ' is-priority' : ''}`}>
          <span className="v2-priority-mark" aria-hidden="true">!</span>
          <div>
            <div className="v2-message-meta"><strong>{prototypeChat.author}</strong><time>{prototypeChat.time}</time></div>
            <p>{prototypeChat.body}</p>
          </div>
        </div>
      </article>
    </>
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
    <main className="app-shell v2-dashboard-shell">
      <header className="global-header">
        <div className="header-brand"><BrandMark size={34} /><strong>D Route</strong></div>
        <Link className="icon-button header-link" to="/routes">一覧へ戻る</Link>
      </header>

      <section className="page-content route-detail-content v2-dashboard-content" aria-labelledby="route-detail-title">
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
            <section className="v2-route-hero">
              <div className="v2-route-brand" aria-hidden="true"><BrandMark size={48} /></div>
              <div className="v2-route-hero-copy">
                <p className="eyebrow">ROUTE DASHBOARD / PROTOTYPE</p>
                <h1 id="route-detail-title">{route.name}</h1>
                <p><time>8月10日 9:00〜</time><span>・</span><span>今日のRoute</span></p>
              </div>
            </section>

            <PhaseDashboard routeId={routeId ?? route.id} />

            <section className="v2-admin-zone" aria-label="Route管理">
              <p>Routeの管理</p>
              <button type="button" className="v2-complete-button">Routeを完了する</button>
              <small>プロトタイプのため、このボタンはまだ動作しません。</small>
            </section>
          </>
        )}
      </section>

      <footer className="app-footer"><VersionBadge /><span>Dashboard Prototype</span></footer>
      {routeId ? <RouteBottomNav routeId={routeId} /> : null}
    </main>
  );
}
