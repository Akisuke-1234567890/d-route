import { FormEvent, PointerEvent as ReactPointerEvent, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BrandMark } from '../../shared/ui/BrandMark';
import { RouteWorkspacePage } from '../../shared/ui/RouteWorkspacePage';
import { getSupabaseClient } from '../../shared/api/supabase';
import { MY_MEMBER_COLOR_KEYS, createMyMember, deleteMyMember, listMyMembers, updateMyMember, type MyMember, type MyMemberColorKey } from '../my-members/myMembers';
import { getRoute } from './routes';
import { getOwnRouteMember, inviteRouteMemberByLoginId, listRouteMembers, respondToRouteInvite, setOwnRouteMemberColor, type RouteMember, type RouteMemberStatus } from './members';

const labels: Record<RouteMemberStatus, string> = { participating: '参加', unanswered: '未回答', declined: '不参加' };
type MembersView = 'my' | 'shared';

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function RouteMembersPage() {
  const { routeId = '' } = useParams<{ routeId: string }>();
  const [activeView, setActiveView] = useState<MembersView>('my');

  const [myMembers, setMyMembers] = useState<MyMember[]>([]);
  const [myLoading, setMyLoading] = useState(true);
  const [myError, setMyError] = useState('');
  const [myEditing, setMyEditing] = useState<MyMember | null>(null);
  const [myFormOpen, setMyFormOpen] = useState(false);
  const [myName, setMyName] = useState('');
  const [myColorKey, setMyColorKey] = useState<MyMemberColorKey>('purple');
  const [mySaving, setMySaving] = useState(false);
  const [myFormError, setMyFormError] = useState('');
  const [myDeleteTarget, setMyDeleteTarget] = useState<MyMember | null>(null);
  const [myDeleting, setMyDeleting] = useState(false);
  const [swipedMyMemberId, setSwipedMyMemberId] = useState<string | null>(null);
  const [myMemberSwipeOffset, setMyMemberSwipeOffset] = useState(0);
  const myMemberSwipeStartXRef = useRef(0);
  const myMemberSwipeStartYRef = useRef(0);
  const myMemberSwipeStartOffsetRef = useRef(0);
  const myMemberSwipeAxisRef = useRef<'pending' | 'horizontal' | 'vertical'>('pending');
  const activeMyMemberSwipeIdRef = useRef<string | null>(null);

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
  const [colorSaving, setColorSaving] = useState(false);
  const [colorError, setColorError] = useState('');

  async function loadMyMembers() {
    setMyLoading(true);
    setMyError('');
    try {
      setMyMembers(await listMyMembers());
    } catch (caught) {
      setMyError(getErrorMessage(caught, 'My Membersを読み込めませんでした。'));
    } finally {
      setMyLoading(false);
    }
  }

  useEffect(() => { void loadMyMembers(); }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    const supabase = getSupabaseClient();
    const ownerCheck = supabase
      ? Promise.all([getRoute(routeId), supabase.auth.getUser()]).then(([route, authResult]) => {
          if (authResult.error) throw authResult.error;
          return Boolean(authResult.data.user && route.owner_user_id === authResult.data.user.id);
        })
      : Promise.reject(new Error('Supabaseの環境変数が設定されていません。'));

    void Promise.allSettled([listRouteMembers(routeId), getOwnRouteMember(routeId), ownerCheck])
      .then(([membersResult, ownResult, ownerResult]) => {
        if (!active) return;
        if (membersResult.status === 'fulfilled') setMembers(membersResult.value);
        else {
          setMembers([]);
          setError(getErrorMessage(membersResult.reason, 'Membersを読み込めませんでした。'));
        }
        const own = ownResult.status === 'fulfilled' ? ownResult.value : null;
        const ownerByRoute = ownerResult.status === 'fulfilled' && ownerResult.value;
        setOwnMember(own);
        setIsRouteOwner(own?.role === 'owner' || ownerByRoute);
      })
      .finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
  }, [routeId]);

  function openMyCreate() {
    setMyEditing(null);
    setMyName('');
    setMyColorKey('purple');
    setMyFormError('');
    setMyFormOpen(true);
  }

  function openMyEdit(member: MyMember) {
    setMyEditing(member);
    setMyName(member.name);
    setMyColorKey(member.colorKey);
    setMyFormError('');
    setMyFormOpen(true);
  }

  function closeMyForm() {
    if (mySaving) return;
    setMyEditing(null);
    setMyName('');
    setMyColorKey('purple');
    setMyFormError('');
    setMyFormOpen(false);
  }

  async function saveMyMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mySaving) return;
    setMySaving(true);
    setMyFormError('');
    try {
      const saved = myEditing ? await updateMyMember(myEditing.id, myName, myColorKey) : await createMyMember(myName, myColorKey);
      setMyMembers((current) => myEditing
        ? current.map((item) => item.id === saved.id ? saved : item)
        : [...current, saved]);
      closeMyForm();
    } catch (caught) {
      setMyFormError(getErrorMessage(caught, 'My Memberを保存できませんでした。'));
    } finally {
      setMySaving(false);
    }
  }

  async function removeMyMember() {
    if (!myDeleteTarget || myDeleting) return;
    setMyDeleting(true);
    try {
      await deleteMyMember(myDeleteTarget.id);
      setMyMembers((current) => current.filter((item) => item.id !== myDeleteTarget.id));
      setMyDeleteTarget(null);
    } catch (caught) {
      setMyError(getErrorMessage(caught, 'My Memberを削除できませんでした。'));
    } finally {
      setMyDeleting(false);
    }
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
      setInviteError(getErrorMessage(caught, '招待できませんでした。'));
    } finally {
      setInviteSaving(false);
    }
  }

  async function answerInvite(status: 'participating' | 'declined') {
    if (responseSaving) return;
    setResponseSaving(true);
    setResponseError('');
    try {
      const updated = await respondToRouteInvite(routeId, status);
      setOwnMember(updated);
      setMembers((current) => current.map((member) => member.userId === updated.userId ? updated : member));
    } catch (caught) {
      setResponseError(getErrorMessage(caught, '参加回答を保存できませんでした。'));
    } finally {
      setResponseSaving(false);
    }
  }


  async function changeOwnColor(colorKey: MyMemberColorKey) {
    if (!ownMember || colorSaving || ownMember.colorKey === colorKey) return;
    setColorSaving(true);
    setColorError('');
    try {
      const updated = await setOwnRouteMemberColor(routeId, colorKey);
      setOwnMember(updated);
      setMembers((current) => current.map((member) => member.userId === updated.userId ? updated : member));
    } catch (caught) {
      setColorError(getErrorMessage(caught, '識別色を変更できませんでした。'));
    } finally {
      setColorSaving(false);
    }
  }

  const answered = members.filter((member) => member.status !== 'unanswered').length;


  const MY_MEMBER_DELETE_REVEAL_WIDTH = 88;

  function closeMyMemberSwipe() {
    setSwipedMyMemberId(null);
    setMyMemberSwipeOffset(0);
    activeMyMemberSwipeIdRef.current = null;
    myMemberSwipeAxisRef.current = 'pending';
  }

  function handleMyMemberPointerDown(event: ReactPointerEvent<HTMLButtonElement>, memberId: string) {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    if (swipedMyMemberId && swipedMyMemberId !== memberId) closeMyMemberSwipe();
    activeMyMemberSwipeIdRef.current = memberId;
    myMemberSwipeStartXRef.current = event.clientX;
    myMemberSwipeStartYRef.current = event.clientY;
    myMemberSwipeStartOffsetRef.current = swipedMyMemberId === memberId ? myMemberSwipeOffset : 0;
    myMemberSwipeAxisRef.current = 'pending';
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleMyMemberPointerMove(event: ReactPointerEvent<HTMLButtonElement>, memberId: string) {
    if (activeMyMemberSwipeIdRef.current !== memberId) return;
    const deltaX = event.clientX - myMemberSwipeStartXRef.current;
    const deltaY = event.clientY - myMemberSwipeStartYRef.current;
    if (myMemberSwipeAxisRef.current === 'pending' && (Math.abs(deltaX) > 7 || Math.abs(deltaY) > 7)) {
      myMemberSwipeAxisRef.current = Math.abs(deltaX) > Math.abs(deltaY) * 1.15 ? 'horizontal' : 'vertical';
    }
    if (myMemberSwipeAxisRef.current !== 'horizontal') return;
    event.preventDefault();
    const nextOffset = Math.max(-MY_MEMBER_DELETE_REVEAL_WIDTH, Math.min(0, myMemberSwipeStartOffsetRef.current + deltaX));
    setSwipedMyMemberId(memberId);
    setMyMemberSwipeOffset(nextOffset);
  }

  function handleMyMemberPointerEnd(event: ReactPointerEvent<HTMLButtonElement>, memberId: string) {
    if (activeMyMemberSwipeIdRef.current !== memberId) return;
    try { event.currentTarget.releasePointerCapture(event.pointerId); } catch { /* already released */ }
    const shouldOpen = myMemberSwipeAxisRef.current === 'horizontal' && myMemberSwipeOffset <= -(MY_MEMBER_DELETE_REVEAL_WIDTH * .5);
    setSwipedMyMemberId(shouldOpen ? memberId : null);
    setMyMemberSwipeOffset(shouldOpen ? -MY_MEMBER_DELETE_REVEAL_WIDTH : 0);
    activeMyMemberSwipeIdRef.current = null;
    myMemberSwipeAxisRef.current = 'pending';
  }

  function openMyMemberFromCard(member: MyMember) {
    if (myMemberSwipeAxisRef.current === 'horizontal' || Math.abs(myMemberSwipeOffset) > 4) return;
    closeMyMemberSwipe();
    openMyEdit(member);
  }

  return <RouteWorkspacePage footerLabel={activeView === 'my' ? 'Personal Directory' : 'Shared Members Beta'}>

    <section className="page-content route-tab-content members-hub" aria-labelledby="members-title">
      <div className="members-view-tabs" role="tablist" aria-label="メンバー表示切替">
        <button type="button" role="tab" aria-selected={activeView === 'my'} className={activeView === 'my' ? 'is-active' : ''} onClick={() => setActiveView('my')}>My Members</button>
        <button type="button" role="tab" aria-selected={activeView === 'shared'} className={activeView === 'shared' ? 'is-active' : ''} onClick={() => setActiveView('shared')}>共有メンバー <span>β</span></button>
      </div>

      {activeView === 'my' ? <>
        <div className="route-tab-heading my-members-heading">
          <div><p className="eyebrow">MY MEMBERS</p><h1 id="members-title">同行者</h1><p>招待なしで使える、自分専用の同行者名簿です。</p></div>
          <button className="primary-button route-tab-action" type="button" onClick={openMyCreate}>＋ 追加</button>
        </div>

        {myLoading ? <section className="route-loading"><span className="route-loading-spinner"/><p>読み込んでいます</p></section>
        : myError ? <section className="empty-state" role="alert"><h2>読み込めませんでした</h2><p>{myError}</p><button className="secondary-button" type="button" onClick={() => void loadMyMembers()}>再読み込み</button></section>
        : myMembers.length === 0 ? <section className="empty-state"><div className="empty-orbit"><BrandMark size={58}/></div><h2>まだ登録されていません</h2><p>家族や友人など、よく使う同行者を追加してください。</p><button className="primary-button" type="button" onClick={openMyCreate}>My Memberを追加</button></section>
        : <div className="my-members-list">{myMembers.map((member) => <div className={`my-member-swipe-shell${swipedMyMemberId === member.id ? ' is-open' : ''}`} key={member.id}><button className="my-member-swipe-delete" type="button" onPointerDown={(event) => event.stopPropagation()} onClick={() => { closeMyMemberSwipe(); setMyDeleteTarget(member); }}>削除</button><button className="my-member-card my-member-swipe-panel" type="button" style={{ transform: `translateX(${swipedMyMemberId === member.id ? myMemberSwipeOffset : 0}px)` }} onPointerDown={(event) => handleMyMemberPointerDown(event, member.id)} onPointerMove={(event) => handleMyMemberPointerMove(event, member.id)} onPointerUp={(event) => handleMyMemberPointerEnd(event, member.id)} onPointerCancel={(event) => handleMyMemberPointerEnd(event, member.id)} onClick={() => openMyMemberFromCard(member)}><div className={`my-member-avatar is-color-${member.colorKey}`} aria-hidden="true">👤</div><div className="my-member-copy"><strong>{member.name}</strong><small><span className="my-member-status-dot" aria-hidden="true"/>未連携</small></div><span className="my-member-chevron" aria-hidden="true">›</span></button></div>)}</div>}
      </> : <>
        <div className="route-tab-heading">
          <div><p className="eyebrow">SHARED MEMBERS</p><div className="members-title-line"><h1 id="members-title">共有メンバー</h1><span className="feature-beta-badge">β 改善中</span></div><p>D Routeアカウントを招待し、このRouteの参加状況を共有します。</p></div>
          {isRouteOwner ? <button className="primary-button route-tab-action" type="button" onClick={() => { setInviteError(''); setInviteOpen(true); }}>＋ 招待</button> : null}
        </div>

        {inviteOpen ? <div className="member-invite-panel">
          <div className="member-invite-heading"><div><p className="eyebrow">INVITE</p><h2>ログインIDで招待</h2></div><button className="member-invite-close" type="button" aria-label="閉じる" onClick={() => setInviteOpen(false)}>×</button></div>
          <form className="member-invite-form" onSubmit={submitInvite}><input value={inviteLoginId} onChange={(event) => setInviteLoginId(event.target.value)} placeholder="login_id" autoCapitalize="none" autoCorrect="off" spellCheck={false} maxLength={24}/><button className="primary-button" type="submit" disabled={!inviteLoginId.trim() || inviteSaving}>{inviteSaving ? '招待中' : '招待する'}</button></form>
          <p className="member-invite-help">相手のD RouteログインIDを入力します。</p>{inviteError ? <p className="member-invite-error" role="alert">{inviteError}</p> : null}
        </div> : null}

        {ownMember ? <div className="member-response-panel">
          <div>
            <p className="eyebrow">YOUR COLOR</p>
            <h2>Chatで使う識別色</h2>
            <p>Memberと同じ色で名前を表示します。</p>
          </div>
          <div className="route-member-color-options" aria-label="Chatの識別色">
            {MY_MEMBER_COLOR_KEYS.map((key) => <button key={key} className={`route-member-color-option is-color-${key}${ownMember.colorKey === key ? ' is-selected' : ''}`} type="button" aria-label={`${key}を選択`} aria-pressed={ownMember.colorKey === key} disabled={colorSaving} onClick={() => void changeOwnColor(key)}><span aria-hidden="true"/></button>)}
          </div>
          {colorError ? <p className="member-invite-error" role="alert">{colorError}</p> : null}
          {ownMember.role === 'member' ? <>
            <div className="member-response-divider"/>
            <div><p className="eyebrow">YOUR RESPONSE</p><h2>このRouteに参加しますか？</h2><p>{ownMember.status === 'unanswered' ? '招待への回答を選択してください。' : `現在の回答：${labels[ownMember.status]}`}</p></div>
            <div className="member-response-actions"><button className={`primary-button${ownMember.status === 'participating' ? ' is-selected' : ''}`} type="button" disabled={responseSaving} onClick={() => void answerInvite('participating')}>参加する</button><button className={`secondary-button${ownMember.status === 'declined' ? ' is-selected' : ''}`} type="button" disabled={responseSaving} onClick={() => void answerInvite('declined')}>参加しない</button></div>
            {responseError ? <p className="member-invite-error" role="alert">{responseError}</p> : null}
          </> : null}
        </div> : null}

        {loading ? <p className="route-tab-demo-note">共有メンバーを読み込んでいます。</p> : null}
        {error ? <p className="route-tab-demo-note" role="alert">{error}</p> : null}
        {!loading && !error ? <><div className="members-overview"><strong>{answered}/{members.length}</strong><span>回答済み</span><div><span>参加 {members.filter((member) => member.status === 'participating').length}</span><span>未回答 {members.filter((member) => member.status === 'unanswered').length}</span><span>不参加 {members.filter((member) => member.status === 'declined').length}</span></div></div><div className="members-page-list">{members.map((member) => <article className="member-row member-page-row" key={member.id}><div className={`member-avatar is-color-${member.colorKey}`} aria-hidden="true">{member.displayName.slice(0, 2).toUpperCase()}</div><div className="member-copy"><div className="member-name-line"><h2 className={`is-color-text-${member.colorKey}`}>{member.displayName}</h2><span className="member-role">{member.role === 'owner' ? 'リーダー' : 'メンバー'}</span></div><p className={`member-status member-status-${member.status}`}><span aria-hidden="true"/>{labels[member.status]}</p></div></article>)}</div>{members.length === 0 ? <p className="route-tab-demo-note">共有メンバーはいません。</p> : null}</> : null}
        <p className="route-tab-demo-note">共有・同期機能は現在β版です。名前だけで管理する同行者は「My Members」を使用してください。</p>
      </>}
    </section>


    {myFormOpen && <div className="modal-backdrop is-centered-choice" onMouseDown={(event) => { if (event.target === event.currentTarget) closeMyForm(); }}><form className="route-modal my-member-modal my-member-modal-compact" onSubmit={saveMyMember}><div className="modal-header"><div><p className="eyebrow">MY MEMBER</p><h2>{myEditing ? '名前を編集' : 'My Memberを追加'}</h2></div><button className="modal-close-button" type="button" onClick={closeMyForm}>×</button></div><label className="route-settings-field"><span>名前</span><input value={myName} maxLength={30} autoFocus onChange={(event) => setMyName(event.target.value)} placeholder="例：妻、長男、Aさん"/><small>{myName.length}/30</small></label><fieldset className="my-member-color-field"><legend>識別色</legend><div className="my-member-color-options">{MY_MEMBER_COLOR_KEYS.map((key) => <button key={key} className={`my-member-color-option is-color-${key}${myColorKey === key ? ' is-selected' : ''}`} type="button" aria-label={`${key}を選択`} aria-pressed={myColorKey === key} onClick={() => setMyColorKey(key)}><span aria-hidden="true"/></button>)}</div></fieldset>{myFormError ? <div className="route-inline-error" role="alert">{myFormError}</div> : null}<div className="modal-actions"><button className="secondary-button" type="button" onClick={closeMyForm}>キャンセル</button><button className="primary-button" type="submit" disabled={mySaving || !myName.trim()}>{mySaving ? '保存中…' : '保存'}</button></div></form></div>}

    {myDeleteTarget ? <div className="modal-backdrop is-centered-choice" onMouseDown={(event) => { if (event.target === event.currentTarget && !myDeleting) setMyDeleteTarget(null); }}><section className="route-modal my-member-delete-modal"><h2>削除しますか？</h2><p>「{myDeleteTarget.name}」をMy Membersから削除します。</p><div className="modal-actions"><button className="secondary-button" type="button" onClick={() => setMyDeleteTarget(null)} disabled={myDeleting}>キャンセル</button><button className="route-list-delete-confirm" type="button" onClick={() => void removeMyMember()} disabled={myDeleting}>{myDeleting ? '削除中…' : '削除する'}</button></div></section></div> : null}
  </RouteWorkspacePage>;
}
