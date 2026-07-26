import { Link, useParams } from 'react-router-dom';
import { BrandMark } from '../../shared/ui/BrandMark';
import { RefreshButton } from '../../shared/ui/RefreshButton';
import { VersionBadge } from '../../shared/ui/VersionBadge';
import { RouteBottomNav } from './RouteBottomNav';

const items = [
  { icon:'⚙️', title:'Route設定', description:'名前・説明・基本情報を管理' },
  { icon:'🧩', title:'テンプレート', description:'このRouteを再利用できる形で保存' },
  { icon:'🔗', title:'共有・招待', description:'参加用リンクや招待方法を確認' },
  { icon:'📄', title:'Routeを複製', description:'内容を引き継いだ新しいRouteを作成' },
  { icon:'📦', title:'完了・アーカイブ', description:'終了したRouteを整理' },
] as const;

export function RouteMenuPage() {
  const { routeId = '' } = useParams<{ routeId: string }>();
  return <main className="app-shell route-tab-shell">
    <header className="global-header"><div className="header-brand"><BrandMark size={34} /><strong>D Route</strong></div><div className="header-actions"><Link className="icon-button header-link" to="/routes">一覧へ戻る</Link><RefreshButton placement="header" /></div></header>
    <section className="page-content route-tab-content" aria-labelledby="menu-title">
      <div className="route-tab-heading"><div><p className="eyebrow">MENU</p><h1 id="menu-title">Route管理</h1><p>普段は触らない設定・共有・整理機能をまとめます。</p></div></div>
      <div className="route-menu-list">{items.map((item)=><button type="button" className="route-menu-item" key={item.title}><span className="route-menu-icon" aria-hidden="true">{item.icon}</span><span><strong>{item.title}</strong><small>{item.description}</small></span><span aria-hidden="true">›</span></button>)}</div>
      <button type="button" className="route-danger-button">Routeを削除</button>
      <p className="route-tab-demo-note">p06ではRoute内の情報設計を確立します。各管理機能の処理は後続Patchで接続します。</p>
    </section>
    <footer className="app-footer"><VersionBadge/><span>Route Workspace</span></footer>
    <RouteBottomNav routeId={routeId}/>
  </main>;
}
