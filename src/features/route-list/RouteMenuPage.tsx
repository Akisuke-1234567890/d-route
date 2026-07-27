import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { BrandMark } from '../../shared/ui/BrandMark';
import { RefreshButton } from '../../shared/ui/RefreshButton';
import { VersionBadge } from '../../shared/ui/VersionBadge';
import { getSupabaseClient } from '../../shared/api/supabase';
import { RouteBottomNav } from './RouteBottomNav';
import { deleteOwnedRoute, getRoute, type RouteSummary } from './routes';

const items = [
  { icon:'⚙️', title:'Route設定', description:'名前・説明・基本情報を管理' },
  { icon:'🧩', title:'テンプレート', description:'このRouteを再利用できる形で保存' },
  { icon:'🔗', title:'共有・招待', description:'参加用リンクや招待方法を確認' },
  { icon:'📄', title:'Routeを複製', description:'内容を引き継いだ新しいRouteを作成' },
  { icon:'📦', title:'完了・アーカイブ', description:'終了したRouteを整理' },
] as const;

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function RouteMenuPage() {
  const { routeId = '' } = useParams<{ routeId: string }>();
  const navigate = useNavigate();
  const [route, setRoute] = useState<RouteSummary | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let active = true;

    async function loadRouteOwner() {
      try {
        const nextRoute = await getRoute(routeId);
        const supabase = getSupabaseClient();
        const { data, error } = supabase
          ? await supabase.auth.getUser()
          : { data: { user: null }, error: new Error('Supabaseの環境変数が設定されていません。') };

        if (error) throw error;
        if (!active) return;

        setRoute(nextRoute);
        setIsOwner(Boolean(data.user && data.user.id === nextRoute.owner_user_id));
      } catch (error) {
        if (active) setErrorMessage(getErrorMessage(error, 'Route情報を確認できませんでした。'));
      }
    }

    void loadRouteOwner();
    return () => { active = false; };
  }, [routeId]);

  async function handleDeleteRoute() {
    if (!route || !isOwner || isDeleting) return;

    setIsDeleting(true);
    setErrorMessage('');

    try {
      await deleteOwnedRoute(route.id);
      navigate('/routes', { replace: true });
    } catch (error) {
      setErrorMessage(getErrorMessage(error, 'Routeを削除できませんでした。'));
      setIsDeleting(false);
    }
  }

  return <main className="app-shell route-tab-shell">
    <header className="global-header"><div className="header-brand"><BrandMark size={34} /><strong>D Route</strong></div><div className="header-actions"><Link className="icon-button header-link" to="/routes">一覧へ戻る</Link><RefreshButton placement="header" /></div></header>

    <section className="page-content route-tab-content" aria-labelledby="menu-title">
      <div className="route-tab-heading"><div><p className="eyebrow">MENU</p><h1 id="menu-title">Route管理</h1><p>普段は触らない設定・共有・整理機能をまとめます。</p></div></div>

      <div className="route-menu-list">{items.map((item)=><button type="button" className="route-menu-item" key={item.title}><span className="route-menu-icon" aria-hidden="true">{item.icon}</span><span><strong>{item.title}</strong><small>{item.description}</small></span><span aria-hidden="true">›</span></button>)}</div>

      {isOwner && route && (
        <section className="route-danger-zone" aria-labelledby="route-danger-title">
          <div>
            <p className="eyebrow">DANGER ZONE</p>
            <h2 id="route-danger-title">Routeを削除</h2>
            <p>この操作を行うと、このRouteは一覧やRoute内から利用できなくなります。</p>
          </div>
          <button type="button" className="route-danger-button" onClick={() => setIsDeleteOpen(true)}>Routeを削除</button>
        </section>
      )}

      {errorMessage && <div className="route-inline-error" role="alert">{errorMessage}</div>}
    </section>

    <footer className="app-footer"><VersionBadge/><span>Route Workspace</span></footer>
    <RouteBottomNav routeId={routeId}/>

    {isDeleteOpen && route && (
      <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !isDeleting) setIsDeleteOpen(false); }}>
        <section className="route-modal route-delete-modal" role="dialog" aria-modal="true" aria-labelledby="delete-route-title" aria-describedby="delete-route-description">
          <div className="modal-header">
            <div>
              <p className="eyebrow route-danger-eyebrow">DELETE ROUTE</p>
              <h2 id="delete-route-title">このRouteを削除しますか？</h2>
            </div>
            <button className="modal-close-button" type="button" onClick={() => setIsDeleteOpen(false)} aria-label="閉じる" disabled={isDeleting}>×</button>
          </div>

          <p id="delete-route-description" className="route-delete-description">
            「{route.name}」を削除します。削除後はD Routeから元に戻せません。
          </p>

          <div className="modal-actions">
            <button className="secondary-button" type="button" onClick={() => setIsDeleteOpen(false)} disabled={isDeleting}>キャンセル</button>
            <button className="route-danger-confirm-button" type="button" onClick={() => void handleDeleteRoute()} disabled={isDeleting}>
              {isDeleting ? '削除中…' : 'Routeを削除'}
            </button>
          </div>
        </section>
      </div>
    )}
  </main>;
}
