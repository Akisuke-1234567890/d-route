import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BrandMark } from '../../shared/ui/BrandMark';
import { RefreshButton } from '../../shared/ui/RefreshButton';
import { VersionBadge } from '../../shared/ui/VersionBadge';
import { createMyMember, deleteMyMember, listMyMembers, updateMyMember, type MyMember } from './myMembers';

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function MyMembersPage() {
  const [members, setMembers] = useState<MyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<MyMember | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<MyMember | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    setLoading(true); setError('');
    try { setMembers(await listMyMembers()); }
    catch (caught) { setError(getErrorMessage(caught, 'My Membersを読み込めませんでした。')); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  function openCreate() { setEditing(null); setName(''); setFormError(''); setFormOpen(true); }
  function openEdit(member: MyMember) { setEditing(member); setName(member.name); setFormError(''); setFormOpen(true); }
  function closeForm() { if (!saving) { setEditing(null); setName(''); setFormError(''); setFormOpen(false); } }

  async function handleSave(event: FormEvent) {
    event.preventDefault(); if (saving) return;
    setSaving(true); setFormError('');
    try {
      const saved = editing ? await updateMyMember(editing.id, name) : await createMyMember(name);
      setMembers((current) => editing ? current.map((item) => item.id === saved.id ? saved : item) : [...current, saved]);
      setEditing(null); setName(''); setFormError(''); setFormOpen(false);
    } catch (caught) { setFormError(getErrorMessage(caught, 'My Memberを保存できませんでした。')); }
    finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    try { await deleteMyMember(deleteTarget.id); setMembers((current) => current.filter((item) => item.id !== deleteTarget.id)); setDeleteTarget(null); }
    catch (caught) { setError(getErrorMessage(caught, 'My Memberを削除できませんでした。')); }
    finally { setDeleting(false); }
  }


  return <main className="app-shell my-members-shell">
    <header className="global-header">
      <div className="header-brand"><BrandMark size={34} /><strong>D Route</strong></div>
      <div className="header-actions"><Link className="icon-button header-link" to="/routes">Route一覧</Link><RefreshButton placement="header" /></div>
    </header>
    <section className="page-content my-members-content">
      <div className="route-tab-heading my-members-heading"><div><p className="eyebrow">MY MEMBERS</p><h1>My Members</h1><p>よく一緒に行動する人を登録し、今後サブRouteへ割り当てられます。</p></div><button className="primary-button" type="button" onClick={openCreate}>＋ 追加</button></div>
      {loading ? <section className="route-loading"><span className="route-loading-spinner"/><p>読み込んでいます</p></section>
      : error ? <section className="empty-state" role="alert"><h2>読み込めませんでした</h2><p>{error}</p><button className="secondary-button" type="button" onClick={() => void load()}>再読み込み</button></section>
      : members.length === 0 ? <section className="empty-state"><div className="empty-orbit"><BrandMark size={58}/></div><h2>まだ登録されていません</h2><p>家族や友人など、よく使う同行者を追加してください。</p><button className="primary-button" type="button" onClick={openCreate}>My Memberを追加</button></section>
      : <div className="my-members-list">{members.map((member) => <article className="my-member-card" key={member.id}><div className="my-member-avatar" aria-hidden="true">👤</div><div className="my-member-copy"><strong>{member.name}</strong><small>未連携</small></div><button className="secondary-button my-member-edit" type="button" onClick={() => openEdit(member)}>編集</button></article>)}</div>}
    </section>
    <footer className="app-footer"><VersionBadge/><span>Personal Directory</span></footer>

    {formOpen && <div className="modal-backdrop is-centered-choice" onMouseDown={(event) => { if (event.target === event.currentTarget) closeForm(); }}>
      <form className="route-modal my-member-modal" onSubmit={handleSave}>
        <div className="modal-header"><div><p className="eyebrow">MY MEMBER</p><h2>{editing ? '名前を編集' : 'My Memberを追加'}</h2></div><button className="modal-close-button" type="button" onClick={closeForm}>×</button></div>
        <label className="route-settings-field"><span>名前</span><input value={name} maxLength={30} autoFocus onChange={(event) => setName(event.target.value)} placeholder="例：妻、長男、Aさん"/><small>{name.length}/30</small></label>
        {formError && <div className="route-inline-error" role="alert">{formError}</div>}
        <div className="modal-actions"><button className="secondary-button" type="button" onClick={closeForm}>キャンセル</button><button className="primary-button" type="submit" disabled={saving || !name.trim()}>{saving ? '保存中…' : '保存'}</button></div>
        {editing && <button className="my-member-delete-link" type="button" onClick={() => { setDeleteTarget(editing); setEditing(null); setName(''); setFormOpen(false); }}>このMy Memberを削除</button>}
      </form>
    </div>}

    {deleteTarget && <div className="modal-backdrop is-centered-choice" onMouseDown={(event) => { if (event.target === event.currentTarget && !deleting) setDeleteTarget(null); }}><section className="route-modal my-member-delete-modal"><h2>削除しますか？</h2><p>「{deleteTarget.name}」をMy Membersから削除します。</p><div className="modal-actions"><button className="secondary-button" type="button" onClick={() => setDeleteTarget(null)} disabled={deleting}>キャンセル</button><button className="route-list-delete-confirm" type="button" onClick={() => void handleDelete()} disabled={deleting}>{deleting ? '削除中…' : '削除する'}</button></div></section></div>}
  </main>;
}
