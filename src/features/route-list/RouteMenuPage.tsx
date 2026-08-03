import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { BrandMark } from '../../shared/ui/BrandMark';
import { RefreshButton } from '../../shared/ui/RefreshButton';
import { VersionBadge } from '../../shared/ui/VersionBadge';
import { getSupabaseClient } from '../../shared/api/supabase';
import { duplicateOwnedRoute, getRoute, updateOwnedRouteSettings, type RouteSummary } from './routes';
import { useBodyScrollLock } from '../../shared/hooks/useBodyScrollLock';

const items = [
  { key:'settings', icon:'⚙️', title:'Route設定', description:'名前と説明を変更' },
  { key:'duplicate', icon:'📄', title:'Routeを複製', description:'内容を引き継いだ新しいRouteを作成' },
] as const;


function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function RouteMenuPage() {
  const { routeId = '' } = useParams<{ routeId: string }>();
  const navigate = useNavigate();
  const [route, setRoute] = useState<RouteSummary | null>(null);
  const [isOwner, setIsOwner] = useState(false);
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





  useBodyScrollLock(settingsOpen || duplicateOpen);

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



  return <main className="app-shell route-tab-shell">
    <header className="global-header"><div className="header-brand"><BrandMark size={34} /><strong>D Route</strong></div><div className="header-actions"><Link className="icon-button header-link" to="/routes">一覧へ戻る</Link><RefreshButton placement="header" /></div></header>

    <section className="page-content route-tab-content" aria-labelledby="menu-title">
      <div className="route-tab-heading"><div><p className="eyebrow">ROUTE SETTINGS</p><h1 id="menu-title">Route設定</h1><p>現在のRouteの名前・説明・複製を管理します。</p></div></div>

      <div className="route-menu-list">{items.map((item) => {
        const isSettings = item.key === 'settings';
        return <button
          type="button"
          className="route-menu-item"
          key={item.key}
          onClick={() => {
            if (isSettings) openRouteSettings();
            else openDuplicateRoute();
          }}
          disabled={!isOwner}
          title={!isOwner ? 'この操作はリーダーのみ利用できます。' : undefined}
        ><span className="route-menu-icon" aria-hidden="true">{item.icon}</span><span><strong>{item.title}</strong><small>{item.description}</small></span><span aria-hidden="true">›</span></button>;
      })}</div>

      {errorMessage && <div className="route-inline-error" role="alert">{errorMessage}</div>}
    </section>

    <footer className="app-footer"><VersionBadge/><span>Route Workspace</span></footer>

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


  </main>;
}
