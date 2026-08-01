import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { BrandMark } from '../../shared/ui/BrandMark';
import { RefreshButton } from '../../shared/ui/RefreshButton';
import { VersionBadge } from '../../shared/ui/VersionBadge';
import { getSupabaseClient } from '../../shared/api/supabase';
import { RouteBottomNav } from './RouteBottomNav';
import { createRouteFromBuiltInTemplate, deleteOwnedRoute, duplicateOwnedRoute, getRoute, updateOwnedRouteSettings, type BuiltInTemplateKey, type RouteSummary } from './routes';
import { useBodyScrollLock } from '../../shared/hooks/useBodyScrollLock';

const items = [
  { key:'settings', icon:'⚙️', title:'Route設定', description:'名前・説明・基本情報を管理' },
  { key:'template', icon:'🧩', title:'テンプレート', description:'このRouteを再利用できる形で保存' },
  { key:'duplicate', icon:'📄', title:'Routeを複製', description:'内容を引き継いだ新しいRouteを作成' },
  { key:'archive', icon:'📦', title:'完了・アーカイブ', description:'終了したRouteを整理' },
] as const;

const builtInTemplates: Array<{ key: BuiltInTemplateKey; icon: string; name: string; description: string }> = [
  { key:'touring', icon:'🏍️', name:'ツーリング', description:'集合・休憩・食事・給油・目的地・帰路' },
  { key:'day_drive', icon:'🚗', name:'日帰りドライブ', description:'出発・立ち寄り・昼食・観光・帰宅' },
  { key:'day_trip', icon:'🧳', name:'旅行・お出かけ', description:'集合・午前・昼食・午後・宿泊または帰宅' },
  { key:'event', icon:'🎫', name:'イベント参加', description:'集合・入場・メイン予定・食事・解散' },
];


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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsName, setSettingsName] = useState('');
  const [settingsDescription, setSettingsDescription] = useState('');
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsError, setSettingsError] = useState('');
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [duplicateName, setDuplicateName] = useState('');
  const [duplicateSaving, setDuplicateSaving] = useState(false);
  const [duplicateError, setDuplicateError] = useState('');
  const [templateOpen, setTemplateOpen] = useState(false);
  const [selectedTemplateKey, setSelectedTemplateKey] = useState<BuiltInTemplateKey>('touring');
  const [templateRouteName, setTemplateRouteName] = useState('ツーリング');
  const [templateSaving, setTemplateSaving] = useState(false);
  const [templateError, setTemplateError] = useState('');




  useBodyScrollLock(isDeleteOpen || settingsOpen || duplicateOpen || templateOpen);

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


function openRouteSettings() {
  if (!route || !isOwner) return;
  setSettingsName(route.name);
  setSettingsDescription(route.description ?? '');
  setSettingsError('');
  setSettingsOpen(true);
}

async function handleSaveSettings() {
  if (!route || !isOwner || settingsSaving) return;
  setSettingsSaving(true);
  setSettingsError('');
  try {
    const updated = await updateOwnedRouteSettings(route.id, {
      name: settingsName,
      description: settingsDescription,
    });
    setRoute(updated);
    setSettingsOpen(false);
  } catch (error) {
    setSettingsError(getErrorMessage(error, 'Route設定を保存できませんでした。'));
  } finally {
    setSettingsSaving(false);
  }
}


function openBuiltInTemplates() {
  if (!isOwner) return;
  setSelectedTemplateKey('touring');
  setTemplateRouteName('ツーリング');
  setTemplateError('');
  setTemplateOpen(true);
}

function chooseBuiltInTemplate(key: BuiltInTemplateKey) {
  const template = builtInTemplates.find((item) => item.key === key);
  if (!template) return;
  setSelectedTemplateKey(key);
  setTemplateRouteName(template.name);
  setTemplateError('');
}

async function handleCreateFromTemplate() {
  if (!isOwner || templateSaving) return;
  setTemplateSaving(true);
  setTemplateError('');
  try {
    const created = await createRouteFromBuiltInTemplate(selectedTemplateKey, templateRouteName);
    setTemplateOpen(false);
    navigate(`/routes/${created.id}`);
  } catch (error) {
    setTemplateError(getErrorMessage(error, 'テンプレートからRouteを作成できませんでした。'));
  } finally {
    setTemplateSaving(false);
  }
}

function openDuplicateRoute() {
  if (!route || !isOwner) return;
  const suffix = '（コピー）';
  const baseName = route.name.endsWith(suffix) ? route.name : `${route.name}${suffix}`;
  setDuplicateName(baseName.slice(0, 60));
  setDuplicateError('');
  setDuplicateOpen(true);
}

async function handleDuplicateRoute() {
  if (!route || !isOwner || duplicateSaving) return;
  setDuplicateSaving(true);
  setDuplicateError('');
  try {
    const duplicated = await duplicateOwnedRoute(route.id, duplicateName);
    setDuplicateOpen(false);
    navigate(`/routes/${duplicated.id}`);
  } catch (error) {
    setDuplicateError(getErrorMessage(error, 'Routeを複製できませんでした。'));
  } finally {
    setDuplicateSaving(false);
  }
}

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

      <div className="route-menu-list">{items.map((item) => {
        const isSettings = item.key === 'settings';
        const isTemplate = item.key === 'template';
        const isDuplicate = item.key === 'duplicate';
        const isAvailable = isSettings || isTemplate || isDuplicate;
        return <button type="button" className="route-menu-item" key={item.key}
          onClick={() => {
            if (isSettings) openRouteSettings();
            if (isTemplate) openBuiltInTemplates();
            if (isDuplicate) openDuplicateRoute();
          }}
          disabled={isAvailable ? !isOwner : true}
          title={isAvailable && !isOwner ? 'この操作はリーダーのみ利用できます。' : !isAvailable ? 'この機能は今後追加予定です。' : undefined}
        ><span className="route-menu-icon" aria-hidden="true">{item.icon}</span><span><strong>{item.title}</strong><small>{item.description}</small></span><span aria-hidden="true">›</span></button>;
      })}</div>

      {isOwner && route && (
        <section className="route-danger-zone" aria-labelledby="route-danger-title">
          <div>
            <p className="eyebrow">DANGER ZONE</p>
            <h2 id="route-danger-title">Routeを削除</h2>
            <p>この操作を行うと、このRouteは一覧やRoute内から利用できなくなります。</p>
          </div>
          <button type="button" className="route-danger-button" aria-haspopup="dialog" onClick={() => setIsDeleteOpen(true)}>Routeを削除</button>
        </section>
      )}

      {errorMessage && <div className="route-inline-error" role="alert">{errorMessage}</div>}
    </section>

    <footer className="app-footer"><VersionBadge/><span>Route Workspace</span></footer>
    <RouteBottomNav routeId={routeId}/>

    {settingsOpen && route && isOwner && (
      <div className="modal-backdrop" role="presentation">
        <section className="route-modal route-settings-modal" role="dialog" aria-modal="true" aria-labelledby="route-settings-title">
          <div className="modal-header">
            <div>
              <p className="eyebrow">ROUTE SETTINGS</p>
              <h2 id="route-settings-title">Route設定</h2>
            </div>
            <button className="modal-close-button" type="button" onClick={() => setSettingsOpen(false)} aria-label="閉じる" disabled={settingsSaving}>×</button>
          </div>

          <label className="route-settings-field">
            <span>Route名</span>
            <input value={settingsName} maxLength={60} onChange={(event) => setSettingsName(event.target.value)} />
            <small>{settingsName.length}/60</small>
          </label>

          <label className="route-settings-field">
            <span>説明</span>
            <textarea value={settingsDescription} maxLength={200} rows={4} onChange={(event) => setSettingsDescription(event.target.value)} placeholder="このRouteの目的や共有したい情報" />
            <small>{settingsDescription.length}/200</small>
          </label>

          {settingsError && <div className="route-inline-error" role="alert">{settingsError}</div>}

          <div className="modal-actions">
            <button className="secondary-button" type="button" onClick={() => setSettingsOpen(false)} disabled={settingsSaving}>キャンセル</button>
            <button className="primary-button" type="button" onClick={() => void handleSaveSettings()} disabled={settingsSaving || !settingsName.trim()}>
              {settingsSaving ? '保存中…' : '保存'}
            </button>
          </div>
        </section>
      </div>
    )}

    {templateOpen && isOwner && (
      <div className="modal-backdrop" role="presentation">
        <section className="route-modal route-template-modal" role="dialog" aria-modal="true" aria-labelledby="route-template-title">
          <div className="modal-header">
            <div><p className="eyebrow">BUILT-IN TEMPLATES</p><h2 id="route-template-title">テンプレートから作成</h2></div>
            <button className="modal-close-button" type="button" onClick={() => setTemplateOpen(false)} aria-label="閉じる" disabled={templateSaving}>×</button>
          </div>
          <p className="route-template-description">現在のPhase・Destination機能だけで使える一般向けテンプレートです。場所や時間は作成後に編集します。</p>
          <div className="route-template-grid" role="list">
            {builtInTemplates.map((template) => (
              <button type="button" role="listitem" key={template.key}
                className={`route-template-card${selectedTemplateKey === template.key ? ' is-selected' : ''}`}
                onClick={() => chooseBuiltInTemplate(template.key)} disabled={templateSaving}>
                <span className="route-template-icon" aria-hidden="true">{template.icon}</span>
                <span><strong>{template.name}</strong><small>{template.description}</small></span>
              </button>
            ))}
          </div>
          <label className="route-settings-field">
            <span>新しいRoute名</span>
            <input value={templateRouteName} maxLength={60} onChange={(event) => setTemplateRouteName(event.target.value)} />
            <small>{templateRouteName.length}/60</small>
          </label>
          {templateError && <div className="route-inline-error" role="alert">{templateError}</div>}
          <div className="modal-actions">
            <button className="secondary-button" type="button" onClick={() => setTemplateOpen(false)} disabled={templateSaving}>キャンセル</button>
            <button className="primary-button" type="button" onClick={() => void handleCreateFromTemplate()} disabled={templateSaving || !templateRouteName.trim()}>
              {templateSaving ? '作成中…' : 'このテンプレートで作成'}
            </button>
          </div>
        </section>
      </div>
    )}

    {duplicateOpen && route && isOwner && (
      <div className="modal-backdrop" role="presentation">
        <section className="route-modal route-duplicate-modal" role="dialog" aria-modal="true" aria-labelledby="duplicate-route-title">
          <div className="modal-header">
            <div>
              <p className="eyebrow">DUPLICATE ROUTE</p>
              <h2 id="duplicate-route-title">Routeを複製</h2>
            </div>
            <button className="modal-close-button" type="button" onClick={() => setDuplicateOpen(false)} aria-label="閉じる" disabled={duplicateSaving}>×</button>
          </div>

          <p className="route-duplicate-description">
            PhaseとDestinationを新しいRouteへコピーします。完了状態・Chat・Membersは引き継ぎません。
          </p>

          <label className="route-settings-field">
            <span>新しいRoute名</span>
            <input value={duplicateName} maxLength={60} onChange={(event) => setDuplicateName(event.target.value)} />
            <small>{duplicateName.length}/60</small>
          </label>

          {duplicateError && <div className="route-inline-error" role="alert">{duplicateError}</div>}

          <div className="modal-actions">
            <button className="secondary-button" type="button" onClick={() => setDuplicateOpen(false)} disabled={duplicateSaving}>キャンセル</button>
            <button className="primary-button" type="button" onClick={() => void handleDuplicateRoute()} disabled={duplicateSaving || !duplicateName.trim()}>
              {duplicateSaving ? '複製中…' : '複製する'}
            </button>
          </div>
        </section>
      </div>
    )}

    {isDeleteOpen && route && (
      <div className="modal-backdrop route-delete-backdrop" role="presentation">
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
