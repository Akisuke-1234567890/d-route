import { FormEvent, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BrandMark } from '../../shared/ui/BrandMark';
import { RefreshButton } from '../../shared/ui/RefreshButton';
import { VersionBadge } from '../../shared/ui/VersionBadge';
import { RouteBottomNav } from './RouteBottomNav';
import { getOwnRouteMember, inviteRouteMemberByLoginId, listRouteMembers, respondToRouteInvite, type RouteMember, type RouteMemberStatus } from './members';

const labels: Record<RouteMemberStatus,string> = { participating:'参加', unanswered:'未回答', declined:'不参加' };

export function RouteMembersPage() {
  const { routeId = '' } = useParams<{ routeId: string }>();
  const [members, setMembers] = useState<RouteMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteLoginId, setInviteLoginId] = useState('');
  const [inviteSaving, setInviteSaving] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [ownMember, setOwnMember] = useState<RouteMember | null>(null);
  const [responseSaving, setResponseSaving] = useState(false);
  const [responseError, setResponseError] = useState('');


  useEffect(() => {
    let active = true;
    setLoading(true); setError('');
    void Promise.all([listRouteMembers(routeId), getOwnRouteMember(routeId)])
      .then(([data, own]) => { if (active) { setMembers(data); setOwnMember(own); } })
      .catch((caught) => { if (active) setError(caught instanceof Error ? caught.message : 'Membersを読み込めませんでした。'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [routeId]);


async function submitInvite(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();
  if (inviteSaving) return;
  setInviteSaving(true);
  setInviteError('');
  try {
    const invited = await inviteRouteMemberByLoginId(routeId, inviteLoginId);
    setMembers((current) => {
      const exists = current.some((member) => member.id === invited.id || member.userId === invited.userId);
      return exists ? current.map((member) => member.userId === invited.userId ? invited : member) : [...current, invited];
    });
    setInviteLoginId('');
    setInviteOpen(false);
  } catch (caught) {
    setInviteError(caught instanceof Error ? caught.message : '招待できませんでした。');
  } finally {
    setInviteSaving(false);
  }
}


async function answerInvite(status: 'participating' | 'declined') {
  if (responseSaving) return;
  setResponseSaving(true); setResponseError('');
  try {
    const updated = await respondToRouteInvite(routeId, status);
    setOwnMember(updated);
    setMembers((current) => current.map((member) => member.userId === updated.userId ? updated : member));
  } catch (caught) {
    setResponseError(caught instanceof Error ? caught.message : '参加回答を保存できませんでした。');
  } finally { setResponseSaving(false); }
}

  const answered = members.filter((m) => m.status !== 'unanswered').length;
  return <main className="app-shell route-tab-shell">
    <header className="global-header"><div className="header-brand"><BrandMark size={34} /><strong>D Route</strong></div><div className="header-actions"><Link className="icon-button header-link" to="/routes">一覧へ戻る</Link><RefreshButton placement="header" /></div></header>
    <section className="page-content route-tab-content" aria-labelledby="members-title">
      <div className="route-tab-heading">
        <div><p className="eyebrow">MEMBERS</p><h1 id="members-title">参加メンバー</h1><p>このRouteへの参加可否を確認します。</p></div>
        <button className="primary-button route-tab-action" type="button" onClick={() => { setInviteError(''); setInviteOpen(true); }}>＋ 招待</button>
      </div>
      {inviteOpen ? (
        <div className="member-invite-panel">
          <div className="member-invite-heading">
            <div><p className="eyebrow">INVITE</p><h2>ログインIDで招待</h2></div>
            <button className="member-invite-close" type="button" aria-label="閉じる" onClick={() => setInviteOpen(false)}>×</button>
          </div>
          <form className="member-invite-form" onSubmit={submitInvite}>
            <input
              value={inviteLoginId}
              onChange={(event) => setInviteLoginId(event.target.value)}
              placeholder="login_id"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              maxLength={24}
            />
            <button className="primary-button" type="submit" disabled={!inviteLoginId.trim() || inviteSaving}>
              {inviteSaving ? '招待中' : '招待する'}
            </button>
          </form>
          <p className="member-invite-help">相手のD RouteログインIDを入力します。</p>
          {inviteError ? <p className="member-invite-error" role="alert">{inviteError}</p> : null}
        </div>
      ) : null}
      {ownMember?.role === 'member' ? (
        <div className="member-response-panel">
          <div><p className="eyebrow">YOUR RESPONSE</p><h2>このRouteに参加しますか？</h2>
          <p>{ownMember.status === 'unanswered' ? '招待への回答を選択してください。' : `現在の回答：${labels[ownMember.status]}`}</p></div>
          <div className="member-response-actions">
            <button className={`primary-button${ownMember.status === 'participating' ? ' is-selected' : ''}`} type="button" disabled={responseSaving} onClick={() => void answerInvite('participating')}>参加する</button>
            <button className={`secondary-button${ownMember.status === 'declined' ? ' is-selected' : ''}`} type="button" disabled={responseSaving} onClick={() => void answerInvite('declined')}>参加しない</button>
          </div>
          {responseError ? <p className="member-invite-error" role="alert">{responseError}</p> : null}
        </div>
      ) : null}
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
