import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BrandMark } from '../../shared/ui/BrandMark';
import { RefreshButton } from '../../shared/ui/RefreshButton';
import { VersionBadge } from '../../shared/ui/VersionBadge';
import { RouteBottomNav } from './RouteBottomNav';
import { listRouteMembers, type RouteMember, type RouteMemberStatus } from './members';

const labels: Record<RouteMemberStatus,string> = { participating:'参加', unanswered:'未回答', declined:'不参加' };

export function RouteMembersPage() {
  const { routeId = '' } = useParams<{ routeId: string }>();
  const [members, setMembers] = useState<RouteMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true); setError('');
    void listRouteMembers(routeId)
      .then((data) => { if (active) setMembers(data); })
      .catch((caught) => { if (active) setError(caught instanceof Error ? caught.message : 'Membersを読み込めませんでした。'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [routeId]);

  const answered = members.filter((m) => m.status !== 'unanswered').length;
  return <main className="app-shell route-tab-shell">
    <header className="global-header"><div className="header-brand"><BrandMark size={34} /><strong>D Route</strong></div><div className="header-actions"><Link className="icon-button header-link" to="/routes">一覧へ戻る</Link><RefreshButton placement="header" /></div></header>
    <section className="page-content route-tab-content" aria-labelledby="members-title">
      <div className="route-tab-heading"><div><p className="eyebrow">MEMBERS</p><h1 id="members-title">参加メンバー</h1><p>このRouteへの参加可否を確認します。</p></div><button className="primary-button route-tab-action" type="button" disabled title="招待機能は次工程で追加">＋ 招待</button></div>
      {loading ? <p className="route-tab-demo-note">Membersを読み込んでいます。</p> : null}
      {error ? <p className="route-tab-demo-note" role="alert">{error}</p> : null}
      {!loading && !error ? <>
        <div className="members-overview"><strong>{answered}/{members.length}</strong><span>回答済み</span><div><span>参加 {members.filter(m=>m.status==='participating').length}</span><span>未回答 {members.filter(m=>m.status==='unanswered').length}</span><span>不参加 {members.filter(m=>m.status==='declined').length}</span></div></div>
        <div className="members-page-list">{members.map((member)=><article className="member-row member-page-row" key={member.id}><div className="member-avatar" aria-hidden="true">{member.displayName.slice(0,2).toUpperCase()}</div><div className="member-copy"><div className="member-name-line"><h2>{member.displayName}</h2><span className="member-role">{member.role === 'owner' ? 'リーダー' : 'メンバー'}</span></div><p className={`member-status member-status-${member.status}`}><span aria-hidden="true"/>{labels[member.status]}</p></div></article>)}</div>
        {members.length === 0 ? <p className="route-tab-demo-note">参加メンバーはいません。</p> : null}
      </> : null}
      <p className="route-tab-demo-note">Membersでは参加・未回答・不参加のみを扱います。移動状況や到着連絡はChatで共有します。</p>
    </section>
    <footer className="app-footer"><VersionBadge/><span>Route Workspace</span></footer>
    <RouteBottomNav routeId={routeId}/>
  </main>;
}
