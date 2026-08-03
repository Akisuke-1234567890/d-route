import { FormEvent, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BrandMark } from '../../shared/ui/BrandMark';
import { RefreshButton } from '../../shared/ui/RefreshButton';
import { VersionBadge } from '../../shared/ui/VersionBadge';
import { getSupabaseClient } from '../../shared/api/supabase';
import { getRoute } from './routes';
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
  const [isRouteOwner, setIsRouteOwner] = useState(false);
  const [responseSaving, setResponseSaving] = useState(false);
  const [responseError, setResponseError] = useState('');


  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    // Members本体と自分の権限判定は、Branch情報とは独立して読み込む。
    // BranchテーブルやRLSの取得に失敗しても、Members画面全体を閉じない。
    const supabase = getSupabaseClient();
    const ownerCheck = supabase
      ? Promise.all([getRoute(routeId), supabase.auth.getUser()]).then(([route, authResult]) => {
          if (authResult.error) throw authResult.error;
          return Boolean(authResult.data.user && route.owner_user_id === authResult.data.user.id);
        })
      : Promise.reject(new Error('Supabaseの環境変数が設定されていません。'));

    // Members行が欠けている既存Routeでも、routes.owner_user_idから作成者を判定する。
    void Promise.allSettled([listRouteMembers(routeId), getOwnRouteMember(routeId), ownerCheck])
      .then(([membersResult, ownResult, ownerResult]) => {
        if (!active) return;

        if (membersResult.status === 'fulfilled') {
          setMembers(membersResult.value);
        } else {
          setMembers([]);
          setError(membersResult.reason instanceof Error ? membersResult.reason.message : 'Membersを読み込めませんでした。');
        }

        const own = ownResult.status === 'fulfilled' ? ownResult.value : null;
        const ownerByRoute = ownerResult.status === 'fulfilled' && ownerResult.value;
        setOwnMember(own);
        setIsRouteOwner(own?.role === 'owner' || ownerByRoute);

      })
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
        {isRouteOwner ? <button className="primary-button route-tab-action" type="button" onClick={() => { setInviteError(''); setInviteOpen(true); }}>＋ 招待</button> : null}
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
        <div className="members-page-list">{members.map((member) => <article className="member-row member-page-row" key={member.id}><div className="member-avatar" aria-hidden="true">{member.displayName.slice(0,2).toUpperCase()}</div><div className="member-copy"><div className="member-name-line"><h2>{member.displayName}</h2><span className="member-role">{member.role === 'owner' ? 'リーダー' : 'メンバー'}</span></div><p className={`member-status member-status-${member.status}`}><span aria-hidden="true"/>{labels[member.status]}</p></div></article>)}</div>
        {members.length === 0 ? <p className="route-tab-demo-note">参加メンバーはいません。</p> : null}
      </> : null}
      <p className="route-tab-demo-note">Membersでは招待と参加状況のみを扱います。別行動への割り振りはPlacesの別行動編集から設定します。</p>
    </section>
    <footer className="app-footer"><VersionBadge/><span>Route Workspace</span></footer>
  </main>;
}
