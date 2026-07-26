import { Link, useParams } from 'react-router-dom';
import { BrandMark } from '../../shared/ui/BrandMark';
import { RefreshButton } from '../../shared/ui/RefreshButton';
import { VersionBadge } from '../../shared/ui/VersionBadge';
import { RouteBottomNav } from './RouteBottomNav';

type Status = 'participating' | 'unanswered' | 'declined';
const members: {id:string;name:string;initials:string;role:string;status:Status}[] = [
  { id:'self', name:'あなた', initials:'YOU', role:'リーダー', status:'participating' },
  { id:'a', name:'メンバーA', initials:'A', role:'メンバー', status:'participating' },
  { id:'b', name:'メンバーB', initials:'B', role:'メンバー', status:'unanswered' },
  { id:'c', name:'メンバーC', initials:'C', role:'メンバー', status:'declined' },
];
const labels: Record<Status,string> = { participating:'参加', unanswered:'未回答', declined:'不参加' };

export function RouteMembersPage() {
  const { routeId = '' } = useParams<{ routeId: string }>();
  const answered = members.filter((m) => m.status !== 'unanswered').length;
  return <main className="app-shell route-tab-shell">
    <header className="global-header"><div className="header-brand"><BrandMark size={34} /><strong>D Route</strong></div><div className="header-actions"><Link className="icon-button header-link" to="/routes">一覧へ戻る</Link><RefreshButton placement="header" /></div></header>
    <section className="page-content route-tab-content" aria-labelledby="members-title">
      <div className="route-tab-heading"><div><p className="eyebrow">MEMBERS</p><h1 id="members-title">参加メンバー</h1><p>このRouteへの参加可否だけを、シンプルに確認します。</p></div><button className="primary-button route-tab-action" type="button">＋ 招待</button></div>
      <div className="members-overview"><strong>{answered}/{members.length}</strong><span>回答済み</span><div><span>参加 {members.filter(m=>m.status==='participating').length}</span><span>未回答 {members.filter(m=>m.status==='unanswered').length}</span><span>不参加 {members.filter(m=>m.status==='declined').length}</span></div></div>
      <div className="members-page-list">{members.map((member)=><article className="member-row member-page-row" key={member.id}><div className="member-avatar" aria-hidden="true">{member.initials}</div><div className="member-copy"><div className="member-name-line"><h2>{member.name}</h2><span className="member-role">{member.role}</span></div><p className={`member-status member-status-${member.status}`}><span aria-hidden="true"/>{labels[member.status]}</p></div></article>)}</div>
      <p className="route-tab-demo-note">Membersでは参加・未回答・不参加のみを扱います。移動状況や到着連絡はChatで共有します。</p>
    </section>
    <footer className="app-footer"><VersionBadge/><span>Route Workspace</span></footer>
    <RouteBottomNav routeId={routeId}/>
  </main>;
}
