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

type MemberStatus = 'joined' | 'on-the-way' | 'unconfirmed';

type RouteMember = {
  id: string;
  name: string;
  initials: string;
  role: 'リーダー' | 'メンバー';
  status: MemberStatus;
};

const sampleMembers: RouteMember[] = [
  { id: 'member-self', name: 'あなた', initials: 'YOU', role: 'リーダー', status: 'joined' },
  { id: 'member-a', name: 'メンバーA', initials: 'A', role: 'メンバー', status: 'joined' },
  { id: 'member-b', name: 'メンバーB', initials: 'B', role: 'メンバー', status: 'on-the-way' },
  { id: 'member-c', name: 'メンバーC', initials: 'C', role: 'メンバー', status: 'unconfirmed' },
];

const memberStatusLabel: Record<MemberStatus, string> = {
  joined: '参加予定',
  'on-the-way': '向かっています',
  unconfirmed: '未確認',
};

type PlanningStop = {
  kind: 'event' | 'mobility';
  icon: string;
  name: string;
  time: string;
  purpose: string;
  locationStatus: string;
};

type PlanningLeg = {
  mode: '車' | '徒歩';
  icon: string;
  duration: string;
  distance: string;
  road: string;
  mapsUrl: string;
};

const planningStops: PlanningStop[] = [
  {
    kind: 'event',
    icon: '🤝',
    name: '海老名SA',
    time: '08:30',
    purpose: '集合・出発確認',
    locationStatus: '検索地点を登録済み',
  },
  {
    kind: 'mobility',
    icon: '🅿️',
    name: '大観山駐車場',
    time: '09:45ごろ',
    purpose: '駐車・徒歩へ切り替え',
    locationStatus: '駐車場の地点を登録済み',
  },
  {
    kind: 'event',
    icon: '🏔️',
    name: '大観山展望台',
    time: '10:00',
    purpose: '景色を見る・全員で休憩',
    locationStatus: '目的地を登録済み',
  },
];

const planningLegs: PlanningLeg[] = [
  {
    mode: '車',
    icon: '🚗',
    duration: '約1時間15分',
    distance: '約72 km',
    road: '高速道路・有料道路を使用',
    mapsUrl: 'https://www.google.com/maps/dir/?api=1&origin=%E6%B5%B7%E8%80%81%E5%90%8DSA&destination=%E5%A4%A7%E8%A6%B3%E5%B1%B1%E9%A7%90%E8%BB%8A%E5%A0%B4&travelmode=driving',
  },
  {
    mode: '徒歩',
    icon: '🚶',
    duration: '約10分',
    distance: '約600 m',
    road: '徒歩ルート',
    mapsUrl: 'https://www.google.com/maps/dir/?api=1&origin=%E5%A4%A7%E8%A6%B3%E5%B1%B1%E9%A7%90%E8%BB%8A%E5%A0%B4&destination=%E5%A4%A7%E8%A6%B3%E5%B1%B1%E5%B1%95%E6%9C%9B%E5%8F%B0&travelmode=walking',
  },
];

function PlanningStopCard({ stop }: { stop: PlanningStop }) {
  const kindLabel = stop.kind === 'event' ? '目的・イベント' : '移動地点';

  return (
    <article className={`planning-stop planning-stop-${stop.kind}`}>
      <div className="planning-stop-icon" aria-hidden="true">{stop.icon}</div>
      <div className="planning-stop-copy">
        <div className="planning-stop-meta">
          <span className={`planning-kind-badge planning-kind-${stop.kind}`}>{kindLabel}</span>
          <time>{stop.time}</time>
        </div>
        <h3>{stop.name}</h3>
        <p className="planning-purpose">{stop.purpose}</p>
        <p className="planning-location-status"><span aria-hidden="true">◎</span>{stop.locationStatus}</p>
      </div>
    </article>
  );
}

function PlanningLegCard({ leg }: { leg: PlanningLeg }) {
  return (
    <div className="planning-leg">
      <div className="planning-leg-rail" aria-hidden="true"><span /><strong>↓</strong><span /></div>
      <div className="planning-leg-panel">
        <div className="planning-leg-heading">
          <span className="planning-mode-badge">{leg.icon} {leg.mode}</span>
          <strong>{leg.duration}</strong>
        </div>
        <p>{leg.distance} ・ {leg.road}</p>
        <a className="planning-map-link" href={leg.mapsUrl} target="_blank" rel="noreferrer">
          この区間を外部地図で見る
        </a>
      </div>
    </div>
  );
}

function PlanningCard() {
  return (
    <article className="route-detail-card planning-card">
      <div className="route-detail-card-heading">
        <div>
          <p className="eyebrow">PLANNING</p>
          <h2>目的と移動を分けて組み立てる</h2>
        </div>
        <span className="planning-status-badge">設計サンプル</span>
      </div>

      <div className="planning-route-settings" aria-label="ルートの基本設定">
        <span>基本：🚗 車</span>
        <span>開始 08:30</span>
        <span>高速 使用</span>
        <span>有料 使用</span>
      </div>

      <div className="planning-timeline">
        {planningStops.map((stop, index) => (
          <div key={`${stop.name}-${stop.time}`}>
            <PlanningStopCard stop={stop} />
            {planningLegs[index] ? <PlanningLegCard leg={planningLegs[index]} /> : null}
          </div>
        ))}
      </div>

      <div className="planning-location-note">
        <strong>場所の登録方法</strong>
        <p>地点検索を基本にし、地図で調整・現在地登録・住所入力を補助として使う想定です。</p>
      </div>

      <p className="planning-demo-note">時刻・距離は開発用サンプルです。自動取得と手動補正は今後の工程で接続します。</p>
    </article>
  );
}

const mergePoint = {
  location: '大観山展望台 入口',
  scheduledTime: '10:30',
  participantCount: 4,
} as const;

function MergePointCard() {
  return (
    <article className="route-detail-card merge-point-card">
      <div className="route-detail-card-heading">
        <div>
          <p className="eyebrow">MERGE POINT</p>
          <h2>合流ポイント</h2>
        </div>
        <span className="merge-point-badge">集合予定</span>
      </div>

      <div className="merge-point-location">
        <span className="merge-point-icon" aria-hidden="true">🤝</span>
        <div>
          <p className="merge-point-label">集合場所</p>
          <p className="merge-point-place">{mergePoint.location}</p>
        </div>
      </div>

      <div className="merge-point-details">
        <section className="merge-point-detail">
          <span aria-hidden="true">🕒</span>
          <div>
            <p className="merge-point-label">集合予定時刻</p>
            <time className="merge-point-value">{mergePoint.scheduledTime}</time>
          </div>
        </section>
        <section className="merge-point-detail">
          <span aria-hidden="true">👥</span>
          <div>
            <p className="merge-point-label">参加人数</p>
            <p className="merge-point-value">{mergePoint.participantCount}人</p>
          </div>
        </section>
      </div>

      <p className="merge-point-demo-note">表示専用の開発サンプルです。通信・保存・編集処理はまだ接続していません。</p>
    </article>
  );
}

function MembersCard() {
  const confirmedCount = sampleMembers.filter((member) => member.status !== 'unconfirmed').length;

  return (
    <article className="route-detail-card members-card">
      <div className="route-detail-card-heading">
        <div>
          <p className="eyebrow">MEMBERS</p>
          <h2>参加メンバー</h2>
        </div>
        <span className="members-count-badge">{confirmedCount}/{sampleMembers.length} 確認</span>
      </div>

      <div className="members-summary" aria-label="参加状況">
        <span>参加予定 {sampleMembers.filter((member) => member.status === 'joined').length}人</span>
        <span>移動中 {sampleMembers.filter((member) => member.status === 'on-the-way').length}人</span>
        <span>未確認 {sampleMembers.filter((member) => member.status === 'unconfirmed').length}人</span>
      </div>

      <div className="members-list">
        {sampleMembers.map((member) => (
          <section className="member-row" key={member.id}>
            <div className="member-avatar" aria-hidden="true">{member.initials}</div>
            <div className="member-copy">
              <div className="member-name-line">
                <h3>{member.name}</h3>
                <span className="member-role">{member.role}</span>
              </div>
              <p className={`member-status member-status-${member.status}`}>
                <span aria-hidden="true" />
                {memberStatusLabel[member.status]}
              </p>
            </div>
          </section>
        ))}
      </div>

      <p className="members-demo-note">表示専用の開発サンプルです。招待・参加回答・到着共有は今後の工程で接続します。</p>
    </article>
  );
}

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
              <MergePointCard />
              <PlanningCard />
              <MembersCard />
            </section>
          </>
        )}
      </section>

      <footer className="app-footer"><VersionBadge /><span>Members UI</span></footer>
    </main>
  );
}
