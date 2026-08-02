import { FormEvent, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BrandMark } from '../../shared/ui/BrandMark';
import { RefreshButton } from '../../shared/ui/RefreshButton';
import { VersionBadge } from '../../shared/ui/VersionBadge';
import { RouteBottomNav } from './RouteBottomNav';
import { getOwnRouteMember, inviteRouteMemberByLoginId, listRouteMembers, respondToRouteInvite, type RouteMember, type RouteMemberStatus } from './members';
import { assignMemberToBranch, clearMemberBranch, createRouteBranch, listRouteBranchAssignments, listRouteBranches, type RouteBranch, type RouteBranchAssignment } from './branches';

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
  const [branches, setBranches] = useState<RouteBranch[]>([]);
  const [assignments, setAssignments] = useState<RouteBranchAssignment[]>([]);
  const [branchName, setBranchName] = useState('');
  const [branchSaving, setBranchSaving] = useState(false);
  const [branchError, setBranchError] = useState('');


  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    setBranchError('');

    // Members本体と自分の権限判定は、Branch情報とは独立して読み込む。
    // BranchテーブルやRLSの取得に失敗しても、Members画面全体を閉じない。
    void Promise.allSettled([listRouteMembers(routeId), getOwnRouteMember(routeId)])
      .then(([membersResult, ownResult]) => {
        if (!active) return;

        if (membersResult.status === 'fulfilled') {
          setMembers(membersResult.value);
        } else {
          setError(membersResult.reason instanceof Error ? membersResult.reason.message : 'Membersを読み込めませんでした。');
        }

        if (ownResult.status === 'fulfilled') {
          setOwnMember(ownResult.value);
        } else {
          setOwnMember(null);
          setBranchError('管理権限を確認できませんでした。画面を更新してください。');
        }
      })
      .finally(() => { if (active) setLoading(false); });

    void Promise.allSettled([listRouteBranches(routeId), listRouteBranchAssignments(routeId)])
      .then(([branchesResult, assignmentsResult]) => {
        if (!active) return;

        if (branchesResult.status === 'fulfilled') {
          setBranches(branchesResult.value);
        } else {
          setBranches([]);
          setBranchError(branchesResult.reason instanceof Error ? branchesResult.reason.message : 'Branchを読み込めませんでした。');
        }

        if (assignmentsResult.status === 'fulfilled') {
          setAssignments(assignmentsResult.value);
        } else {
          setAssignments([]);
          setBranchError((current) => current || (assignmentsResult.reason instanceof Error ? assignmentsResult.reason.message : 'Branchの割り振りを読み込めませんでした。'));
        }
      });

    return () => { active = false; };
  }, [routeId]);



async function addBranch(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();
  if (!branchName.trim() || branchSaving) return;
  setBranchSaving(true); setBranchError('');
  try {
    const created = await createRouteBranch(routeId, branchName);
    setBranches((current) => [...current, created]);
    setBranchName('');
  } catch (caught) { setBranchError(caught instanceof Error ? caught.message : 'Branchを作成できませんでした。'); }
  finally { setBranchSaving(false); }
}

async function changeMemberBranch(memberUserId: string, branchId: string) {
  setBranchError('');
  try {
    if (!branchId) {
      await clearMemberBranch(routeId, memberUserId);
      setAssignments((current) => current.filter((item) => item.memberUserId !== memberUserId));
      return;
    }
    const updated = await assignMemberToBranch(routeId, branchId, memberUserId);
    setAssignments((current) => [...current.filter((item) => item.memberUserId !== memberUserId), updated]);
  } catch (caught) { setBranchError(caught instanceof Error ? caught.message : 'Branchへ割り振れませんでした。'); }
}

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
        {ownMember?.role === 'owner' ? <section className="branch-admin-panel">
          <div><p className="eyebrow">BRANCH</p><h2>分岐グループ</h2><p>参加者を一時的な行動グループへ割り振ります。</p></div>
          <form className="branch-create-form" onSubmit={addBranch}><input value={branchName} onChange={(event)=>setBranchName(event.target.value)} placeholder="例：ソアリン組" maxLength={40}/><button className="secondary-button" disabled={!branchName.trim() || branchSaving}>{branchSaving ? '追加中' : '＋ Branch追加'}</button></form>
          {branchError ? <p className="member-invite-error" role="alert">{branchError}</p> : null}
          {branches.length ? <div className="branch-chip-list">{branches.map((branch)=><span key={branch.id}>{branch.name}<small>{assignments.filter((item)=>item.branchId===branch.id).length}人</small></span>)}</div> : <p className="route-tab-demo-note">Branchはまだありません。</p>}
        </section> : null}
        <div className="members-page-list">{members.map((member)=>{ const assignment=assignments.find((item)=>item.memberUserId===member.userId); return <article className="member-row member-page-row" key={member.id}><div className="member-avatar" aria-hidden="true">{member.displayName.slice(0,2).toUpperCase()}</div><div className="member-copy"><div className="member-name-line"><h2>{member.displayName}</h2><span className="member-role">{member.role === 'owner' ? 'リーダー' : 'メンバー'}</span></div><p className={`member-status member-status-${member.status}`}><span aria-hidden="true"/>{labels[member.status]}</p>{ownMember?.role==='owner' && member.status==='participating' ? <label className="member-branch-select"><span>現在のBranch</span><select value={assignment?.branchId ?? ''} onChange={(event)=>void changeMemberBranch(member.userId,event.target.value)}><option value="">全体Route</option>{branches.map((branch)=><option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label> : assignment ? <p className="member-branch-label">{branches.find((branch)=>branch.id===assignment.branchId)?.name ?? 'Branch'}</p> : null}</div></article>})}</div>
        {members.length === 0 ? <p className="route-tab-demo-note">参加メンバーはいません。</p> : null}
      </> : null}
      <p className="route-tab-demo-note">Membersでは参加・未回答・不参加のみを扱います。移動状況や到着連絡はChatで共有します。</p>
    </section>
    <footer className="app-footer"><VersionBadge/><span>Route Workspace</span></footer>
    <RouteBottomNav routeId={routeId}/>
  </main>;
}
