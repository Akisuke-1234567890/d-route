import { Link, useParams } from 'react-router-dom';
import { BrandMark } from '../../shared/ui/BrandMark';
import { VersionBadge } from '../../shared/ui/VersionBadge';
import { RouteBottomNav } from './RouteBottomNav';

const places = [
  { id: 'ebina', icon: '🤝', name: '海老名SA', time: '08:30', purpose: '集合・出発確認', status: '完了', type: '集合地点' },
  { id: 'parking', icon: '🅿️', name: '大観山駐車場', time: '09:45ごろ', purpose: '駐車・徒歩へ切り替え', status: '次', type: '移動地点' },
  { id: 'view', icon: '🏔️', name: '大観山展望台', time: '10:00', purpose: '景色を見る・全員で休憩', status: '予定', type: '目的地' },
] as const;

export function RoutePlacesPage() {
  const { routeId = '' } = useParams<{ routeId: string }>();
  return <main className="app-shell route-tab-shell">
    <header className="global-header"><div className="header-brand"><BrandMark size={34}/><strong>D Route</strong></div><Link className="icon-button header-link" to="/routes">一覧へ戻る</Link></header>
    <section className="page-content route-tab-content" aria-labelledby="places-title">
      <div className="route-tab-heading"><div><p className="eyebrow">PLACES</p><h1 id="places-title">目的地</h1><p>グループが辿る場所と、その場所で行うことを確認します。</p></div><button className="primary-button route-tab-action" type="button">＋ 目的地を追加</button></div>
      <div className="places-list">
        {places.map((place, index) => <article className={`place-card${place.status === '次' ? ' is-next' : ''}`} key={place.id}>
          <div className="place-order" aria-label={`${index + 1}番目`}>{index + 1}</div>
          <div className="place-icon" aria-hidden="true">{place.icon}</div>
          <div className="place-copy"><div className="place-meta"><span>{place.type}</span><time>{place.time}</time></div><h2>{place.name}</h2><p>{place.purpose}</p></div>
          <span className={`place-status place-status-${place.status === '完了' ? 'done' : place.status === '次' ? 'next' : 'planned'}`}>{place.status}</span>
        </article>)}
      </div>
      <p className="route-tab-demo-note">表示・追加ボタンはp06の画面構成確認用です。保存・編集・並び替えは次工程で接続します。</p>
    </section>
    <footer className="app-footer"><VersionBadge/><span>Route Workspace</span></footer>
    <RouteBottomNav routeId={routeId}/>
  </main>;
}
