import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BrandMark } from '../../shared/ui/BrandMark';
import { RefreshButton } from '../../shared/ui/RefreshButton';
import { VersionBadge } from '../../shared/ui/VersionBadge';
import { RouteBottomNav } from './RouteBottomNav';
import './RoutePlacesPage.css';
import { useBodyScrollLock } from '../../shared/hooks/useBodyScrollLock';
import {
  createRouteDestination,
  getRouteDestinations,
  softDeleteRouteDestination,
  saveRouteDestinationOrder,
  updateRouteDestination,
  type DestinationImportance,
  type DestinationSummary,
} from './destinations';
import { createRoutePhase, getRoutePhases, updateRoutePhase, type PhaseSummary } from './phases';

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;

  if (error && typeof error === 'object') {
    const candidate = error as {
      message?: unknown;
      details?: unknown;
      hint?: unknown;
      code?: unknown;
    };

    const parts = [
      typeof candidate.message === 'string' ? candidate.message : '',
      typeof candidate.details === 'string' ? candidate.details : '',
      typeof candidate.hint === 'string' ? candidate.hint : '',
      typeof candidate.code === 'string' ? `code: ${candidate.code}` : '',
    ].filter(Boolean);

    if (parts.length > 0) return parts.join(' / ');
  }

  return fallback;
}

function getImportanceLabel(importance: DestinationSummary['importance']) {
  return importance === 'optional' ? '任意' : '必須';
}

export function RoutePlacesPage() {
  const { routeId = '' } = useParams<{ routeId: string }>();
  const [destinations, setDestinations] = useState<DestinationSummary[]>([]);
  const [phases, setPhases] = useState<PhaseSummary[]>([]);
  const [selectedPhaseId, setSelectedPhaseId] = useState('');
  const [editPhaseId, setEditPhaseId] = useState('');
  const [phaseCreateOpen, setPhaseCreateOpen] = useState(false);
  const [phaseEditing, setPhaseEditing] = useState<PhaseSummary | null>(null);
  const [phaseName, setPhaseName] = useState('');
  const [phaseDescription, setPhaseDescription] = useState('');
  const [phaseStartTime, setPhaseStartTime] = useState('');
  const [phaseSaving, setPhaseSaving] = useState(false);
  const [phaseError, setPhaseError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [locationName, setLocationName] = useState('');
  const [description, setDescription] = useState('');
  const [importance, setImportance] = useState<DestinationImportance>('must');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [editing, setEditing] = useState<DestinationSummary | null>(null);
  const [editName, setEditName] = useState('');
  const [editLocationName, setEditLocationName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editImportance, setEditImportance] = useState<DestinationImportance>('must');
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DestinationSummary | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [reorderingId, setReorderingId] = useState<string | null>(null);
  const [reorderOverId, setReorderOverId] = useState<string | null>(null);
  const [dragTargetIndex, setDragTargetIndex] = useState<number | null>(null);
  const [reorderSaving, setReorderSaving] = useState(false);
  const [dragOverlay, setDragOverlay] = useState<{ destinationId: string; top: number; left: number; width: number; height: number } | null>(null);
  const dragStartOrderRef = useRef<DestinationSummary[] | null>(null);
  const dragCurrentOrderRef = useRef<DestinationSummary[] | null>(null);
  const dragLongPressTimerRef = useRef<number | null>(null);
  const dragSessionRef = useRef<{
    pointerId: number;
    destinationId: string;
    phaseId: string;
    startX: number;
    startY: number;
    grabOffsetY: number;
    target: HTMLButtonElement;
    active: boolean;
    sourceIndex: number;
    targetIndex: number;
  } | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const editNameInputRef = useRef<HTMLInputElement>(null);

  useBodyScrollLock(createOpen || Boolean(editing) || Boolean(deleteTarget) || phaseCreateOpen || Boolean(phaseEditing));

  async function loadPlanning() {
    setLoading(true);
    setError(null);
    try {
      const [nextPhases, nextDestinations] = await Promise.all([getRoutePhases(routeId), getRouteDestinations(routeId)]);
      setPhases(nextPhases);
      setDestinations(nextDestinations);
    } catch (err) {
      setError(getErrorMessage(err, 'Placesを読み込めませんでした。'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadPlanning(); }, [routeId]);

  const destinationsByPhase = useMemo(() => {
    const map = new Map<string, DestinationSummary[]>();
    for (const phase of phases) map.set(phase.id, []);
    for (const destination of destinations) {
      const list = map.get(destination.phaseId ?? '') ?? [];
      list.push(destination);
      map.set(destination.phaseId ?? '', list);
    }
    for (const list of map.values()) list.sort((a, b) => a.orderValue - b.orderValue);
    return map;
  }, [phases, destinations]);

  useEffect(() => {
    if (!createOpen) return;
    const timer = window.setTimeout(() => nameInputRef.current?.focus(), 80);
    return () => window.clearTimeout(timer);
  }, [createOpen]);

  useEffect(() => {
    if (!editing) return;
    const timer = window.setTimeout(() => editNameInputRef.current?.focus(), 80);
    return () => window.clearTimeout(timer);
  }, [editing]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2400);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function openCreateModal(phaseId: string) {
    setSelectedPhaseId(phaseId);
    setName('');
    setLocationName('');
    setDescription('');
    setImportance('must');
    setFormError(null);
    setCreateOpen(true);
  }

  function closeCreateModal() {
    if (!saving) setCreateOpen(false);
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;

    setSaving(true);
    setFormError(null);
    try {
      const created = await createRouteDestination(routeId, {
        phaseId: selectedPhaseId,
        name,
        locationName,
        description,
        importance,
      });
      setDestinations((current) => [...current, created].sort((a, b) => a.orderValue - b.orderValue));
      setCreateOpen(false);
    } catch (err) {
      setFormError(getErrorMessage(err, '目的地を追加できませんでした。'));
    } finally {
      setSaving(false);
    }
  }


  function openEditModal(destination: DestinationSummary) {
    setEditing(destination);
    setEditPhaseId(destination.phaseId ?? '');
    setEditName(destination.name);
    setEditLocationName(destination.locationName ?? '');
    setEditDescription(destination.description ?? '');
    setEditImportance(destination.importance === 'optional' ? 'optional' : 'must');
    setEditError(null);
  }

  function closeEditModal() {
    if (!editSaving) setEditing(null);
  }

  async function handleEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing || editSaving) return;

    setEditSaving(true);
    setEditError(null);
    try {
      const updated = await updateRouteDestination(routeId, editing.id, {
        phaseId: editPhaseId,
        name: editName,
        locationName: editLocationName,
        description: editDescription,
        importance: editImportance,
      });
      setDestinations((current) =>
        current.map((item) => item.id === updated.id ? updated : item)
      );
      setEditing(null);
    } catch (err) {
      setEditError(getErrorMessage(err, '目的地を更新できませんでした。'));
    } finally {
      setEditSaving(false);
    }
  }


  function openPhaseCreate() {
    setPhaseName('');
    setPhaseDescription('');
    setPhaseStartTime('');
    setPhaseError(null);
    setPhaseCreateOpen(true);
  }

  function openPhaseEdit(phase: PhaseSummary) {
    setPhaseEditing(phase);
    setPhaseName(phase.name);
    setPhaseDescription(phase.description ?? '');
    setPhaseStartTime(phase.startTime?.slice(0, 5) ?? '');
    setPhaseError(null);
  }

  async function handlePhaseCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (phaseSaving) return;
    setPhaseSaving(true);
    setPhaseError(null);
    try {
      const created = await createRoutePhase(routeId, { name: phaseName, description: phaseDescription, startTime: phaseStartTime || null });
      setPhases((current) => [...current, created].sort((a, b) => a.orderValue - b.orderValue));
      setPhaseCreateOpen(false);
    } catch (err) {
      setPhaseError(getErrorMessage(err, 'Phaseを追加できませんでした。'));
    } finally { setPhaseSaving(false); }
  }

  async function handlePhaseEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!phaseEditing || phaseSaving) return;
    setPhaseSaving(true);
    setPhaseError(null);
    try {
      const updated = await updateRoutePhase(routeId, phaseEditing.id, { name: phaseName, description: phaseDescription, startTime: phaseStartTime || null });
      setPhases((current) => current.map((phase) => phase.id === updated.id ? updated : phase));
      setPhaseEditing(null);
    } catch (err) {
      setPhaseError(getErrorMessage(err, 'Phaseを更新できませんでした。'));
    } finally { setPhaseSaving(false); }
  }

  function askDeleteDestination() {
    if (!editing || editSaving) return;
    setDeleteError(null);
    setDeleteTarget(editing);
  }

  function closeDeleteDialog() {
    if (!deleting) setDeleteTarget(null);
  }

  function clearDestinationDragTimer() {
    if (dragLongPressTimerRef.current !== null) {
      window.clearTimeout(dragLongPressTimerRef.current);
      dragLongPressTimerRef.current = null;
    }
  }

  function releaseDestinationPointer(session: { pointerId: number; target: HTMLButtonElement } | null) {
    if (!session) return;
    try {
      if (session.target.hasPointerCapture(session.pointerId)) {
        session.target.releasePointerCapture(session.pointerId);
      }
    } catch {
      // The browser may already have released capture.
    }
  }

  function resetDestinationDrag(options?: { restoreOrder?: boolean; releasePointer?: boolean }) {
    clearDestinationDragTimer();
    const session = dragSessionRef.current;

    if (options?.restoreOrder && dragStartOrderRef.current) { const restored = dragStartOrderRef.current; setDestinations((all) => { const byId = new Map(restored.map((item) => [item.id, item])); return all.map((item) => byId.get(item.id) ?? item); }); }

    // Clear the session before releasing capture so lostpointercapture cannot
    // re-enter cleanup with stale drag state.
    dragSessionRef.current = null;
    dragStartOrderRef.current = null;
    dragCurrentOrderRef.current = null;
    if (options?.releasePointer !== false) releaseDestinationPointer(session);
    setDragOverlay(null);
    setReorderOverId(null);
    setDragTargetIndex(null);
    setReorderingId(null);
  }

  function beginDestinationDrag(event: React.PointerEvent<HTMLButtonElement>, destinationId: string, phaseId: string) {
    if (dragSessionRef.current || reorderSaving) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;

    const target = event.currentTarget;
    try {
      // Capture immediately, before the long-press timer. This keeps the same pointer
      // alive even when the card list re-renders while reordering.
      target.setPointerCapture(event.pointerId);
    } catch {
      // Continue even when capture is unavailable; pointercancel/lostcapture will clean up.
    }

    dragSessionRef.current = {
      pointerId: event.pointerId,
      destinationId,
      phaseId,
      startX: event.clientX,
      startY: event.clientY,
      grabOffsetY: 0,
      target,
      active: false,
      sourceIndex: destinations.filter((item) => item.phaseId === phaseId).findIndex((item) => item.id === destinationId),
      targetIndex: destinations.filter((item) => item.phaseId === phaseId).findIndex((item) => item.id === destinationId),
    };

    clearDestinationDragTimer();
    dragLongPressTimerRef.current = window.setTimeout(() => {
      const session = dragSessionRef.current;
      if (!session || session.pointerId !== event.pointerId || session.active) return;

      const card = session.target.closest<HTMLElement>('[data-destination-id]');
      if (!card) {
        resetDestinationDrag();
        return;
      }

      const rect = card.getBoundingClientRect();
      session.active = true;
      session.grabOffsetY = Math.max(0, Math.min(rect.height, session.startY - rect.top));
      const phaseOrder = destinations.filter((item) => item.phaseId === session.phaseId).map((item) => ({ ...item }));
      dragStartOrderRef.current = phaseOrder;
      dragCurrentOrderRef.current = phaseOrder;
      session.sourceIndex = phaseOrder.findIndex((item) => item.id === session.destinationId);
      session.targetIndex = session.sourceIndex;
      setReorderingId(session.destinationId);
      setReorderOverId(session.destinationId);
      setDragTargetIndex(session.sourceIndex);
      setDragOverlay({
        destinationId: session.destinationId,
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      });
      dragLongPressTimerRef.current = null;
    }, 180);
  }

  function moveDraggedDestination(event: React.PointerEvent<HTMLButtonElement>) {
    const session = dragSessionRef.current;
    if (!session || session.pointerId !== event.pointerId) return;

    if (!session.active) {
      const moved = Math.hypot(event.clientX - session.startX, event.clientY - session.startY);
      if (moved > 10) resetDestinationDrag();
      return;
    }

    event.preventDefault();
    setDragOverlay((current) => current ? { ...current, top: event.clientY - session.grabOffsetY } : current);

    // Keep the actual DOM order fixed for the whole gesture. On iOS Safari, moving the
    // captured handle's DOM node while a pointer is down can cause pointer capture to be
    // cancelled. Instead, calculate only the intended insertion index while dragging and
    // apply the real list reorder after pointerup.
    const cards = Array.from(document.querySelectorAll<HTMLElement>(`[data-destination-id][data-phase-id="${session.phaseId}"]`));
    const otherCards = cards.filter((card) => card.dataset.destinationId !== session.destinationId);
    let insertionIndex = otherCards.length;

    for (let index = 0; index < otherCards.length; index += 1) {
      const rect = otherCards[index].getBoundingClientRect();
      if (event.clientY < rect.top + rect.height / 2) {
        insertionIndex = index;
        break;
      }
    }

    session.targetIndex = insertionIndex;
    setDragTargetIndex(insertionIndex);

    const targetCard = otherCards[Math.min(insertionIndex, Math.max(0, otherCards.length - 1))];
    setReorderOverId(targetCard?.dataset.destinationId ?? session.destinationId);
  }

  async function finishDestinationDrag(event: React.PointerEvent<HTMLButtonElement>) {
    const session = dragSessionRef.current;
    if (!session || session.pointerId !== event.pointerId) return;

    if (!session.active) {
      resetDestinationDrag();
      return;
    }

    const original = dragStartOrderRef.current;
    let currentOrder = original ? original.map((item) => ({ ...item })) : destinations.filter((item) => item.phaseId === session.phaseId).map((item) => ({ ...item }));

    if (original) {
      const sourceIndex = currentOrder.findIndex((item) => item.id === session.destinationId);
      const targetIndex = Math.max(0, Math.min(session.targetIndex, currentOrder.length - 1));
      if (sourceIndex >= 0 && sourceIndex !== targetIndex) {
        const [moved] = currentOrder.splice(sourceIndex, 1);
        currentOrder.splice(targetIndex, 0, moved);
      }
    }

    const changed = Boolean(original && currentOrder.some((item, index) => item.id !== original[index]?.id));

    // End all pointer/visual drag state before network I/O. The captured DOM node was never
    // moved during the gesture, so iOS Safari keeps the pointer session stable in both directions.
    resetDestinationDrag();

    if (!changed || !original) return;

    setDestinations((all) => { const byId = new Map(currentOrder.map((item) => [item.id, item])); return all.map((item) => byId.get(item.id) ?? item); });

    setError(null);
    setReorderSaving(true);
    try {
      const saved = await saveRouteDestinationOrder(routeId, currentOrder, original);
      setDestinations((all) => { const byId = new Map(saved.map((item) => [item.id, item])); return all.map((item) => byId.get(item.id) ?? item); });
    } catch (err) {
      setDestinations((all) => { const byId = new Map(original.map((item) => [item.id, item])); return all.map((item) => byId.get(item.id) ?? item); });
      setToast(null);
      setError(getErrorMessage(err, '並び順を保存できませんでした。'));
    } finally {
      setReorderSaving(false);
    }
  }

  function cancelDestinationDrag(event: React.PointerEvent<HTMLButtonElement>) {
    const session = dragSessionRef.current;
    if (!session || session.pointerId !== event.pointerId) return;
    resetDestinationDrag({ restoreOrder: session.active });
  }

  function handleLostDestinationPointerCapture(event: React.PointerEvent<HTMLButtonElement>) {
    const session = dragSessionRef.current;
    if (!session || session.pointerId !== event.pointerId) return;
    resetDestinationDrag({ restoreOrder: session.active, releasePointer: false });
  }

  function getDestinationDragShift(index: number) {
    const session = dragSessionRef.current;
    if (!session?.active || dragTargetIndex === null || !dragOverlay) return 0;

    const sourceIndex = session.sourceIndex;
    const targetIndex = dragTargetIndex;
    const step = dragOverlay.height + 12;

    if (sourceIndex < targetIndex && index > sourceIndex && index <= targetIndex) {
      return -step;
    }

    if (sourceIndex > targetIndex && index >= targetIndex && index < sourceIndex) {
      return step;
    }

    return 0;
  }

  async function handleDeleteDestination() {
    if (!deleteTarget || deleting) return;

    setDeleting(true);
    setDeleteError(null);
    try {
      await softDeleteRouteDestination(routeId, deleteTarget.id);
      setDestinations((current) => current.filter((item) => item.id !== deleteTarget.id));
      setDeleteTarget(null);
      setEditing(null);
      setToast('目的地を削除しました');
    } catch (err) {
      setDeleteError(getErrorMessage(err, '目的地を削除できませんでした。'));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <main className="app-shell route-tab-shell">
      <header className="global-header">
        <div className="header-brand"><BrandMark size={34} /><strong>D Route</strong></div>
        <div className="header-actions">
          <Link className="icon-button header-link" to="/routes">一覧へ戻る</Link>
          <RefreshButton placement="header" />
        </div>
      </header>

      <section className="page-content route-tab-content" aria-labelledby="places-title">
        <div className="route-tab-heading">
          <div>
            <p className="eyebrow">PLACES</p>
            <h1 id="places-title">目的地</h1>
            <p>このRouteで共有する目的地を、使う順番に並べて確認します。</p>
          </div>
          <button className="secondary-button route-tab-action" type="button" onClick={openPhaseCreate}>
            ＋ Phaseを追加
          </button>
        </div>

        {loading ? (
          <section className="route-loading" aria-live="polite"><span className="route-loading-spinner" aria-hidden="true" /><p>Placesを読み込んでいます</p></section>
        ) : error ? (
          <section className="empty-state" role="alert"><div className="empty-orbit" aria-hidden="true"><BrandMark size={58} /></div><h2>Placesを読み込めませんでした</h2><p>{error}</p><button className="secondary-button" type="button" onClick={() => void loadPlanning()}>再読み込み</button></section>
        ) : (
          <div className="phase-planning-list">
            {phases.map((phase) => {
              const phaseDestinations = destinationsByPhase.get(phase.id) ?? [];
              return (
                <section className="places-phase-section" key={phase.id}>
                  <header className="places-phase-header">
                    <div className="places-phase-copy">
                      <div className="places-phase-titleline"><h2>{phase.name || 'Phase'}</h2>{!phase.name && <span className="phase-unnamed-badge">名前未設定</span>}{phase.startTime && <span className="phase-start-badge">{phase.startTime.slice(0, 5)}〜</span>}</div>
                      {phase.description && <p>{phase.description}</p>}
                    </div>
                    <div className="places-phase-actions"><button className="phase-edit-button" type="button" onClick={() => openPhaseEdit(phase)}>編集</button><button className="phase-add-place-button" type="button" onClick={() => openCreateModal(phase.id)}>＋ 目的地</button></div>
                  </header>
                  {phaseDestinations.length === 0 ? (
                    <button className="phase-empty-add" type="button" onClick={() => openCreateModal(phase.id)}>このPhaseに最初の目的地を追加</button>
                  ) : (
                    <div className="places-list">
                      {phaseDestinations.map((destination, index) => { const dragShift = getDestinationDragShift(index); return (
                        <article className={`place-card${reorderingId === destination.id ? ' is-drag-placeholder' : ''}${dragShift !== 0 ? ' is-reorder-shifting' : ''}${reorderingId && reorderOverId === destination.id && reorderingId !== destination.id ? ' is-reorder-over' : ''}`} key={destination.id} data-destination-id={destination.id} data-phase-id={phase.id} style={dragShift !== 0 ? { transform: `translateY(${dragShift}px)` } : undefined}>
                          <div className="place-order" aria-label={`${index + 1}番目`}>{index + 1}</div><div className="place-icon" aria-hidden="true">📍</div>
                          <div className="place-copy"><div className="place-meta">{destination.importance === 'must' ? <span className="place-required-mark" aria-label="必須" title="必須">★</span> : null}{destination.locationName ? <span>{destination.locationName}</span> : null}</div><h2>{destination.name}</h2><p>{destination.description ?? '説明はまだありません。'}</p></div>
                          <div className="place-card-actions"><button className="place-edit-button" type="button" onClick={() => openEditModal(destination)} disabled={Boolean(reorderingId) || reorderSaving}>編集</button><button className="place-drag-handle" type="button" aria-label={`${destination.name}を長押しして並び替え`} disabled={reorderSaving || (Boolean(reorderingId) && reorderingId !== destination.id)} onPointerDown={(event) => beginDestinationDrag(event, destination.id, phase.id)} onPointerMove={moveDraggedDestination} onPointerUp={(event) => void finishDestinationDrag(event)} onPointerCancel={cancelDestinationDrag} onLostPointerCapture={handleLostDestinationPointerCapture}><span className="drag-dot-grid" aria-hidden="true"><i /><i /><i /><i /><i /><i /></span></button></div>
                        </article>
                      ); })}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </section>

      {dragOverlay && (() => {
        const dragged = destinations.find((item) => item.id === dragOverlay.destinationId);
        if (!dragged) return null;
        return (
          <article
            className="place-card place-drag-overlay"
            aria-hidden="true"
            style={{
              top: dragOverlay.top,
              left: dragOverlay.left,
              width: dragOverlay.width,
              height: dragOverlay.height,
            }}
          >
            <div className="place-order">{destinations.findIndex((item) => item.id === dragged.id) + 1}</div>
            <div className="place-icon">📍</div>
            <div className="place-copy">
              <div className="place-meta">
                <span>{getImportanceLabel(dragged.importance)}</span>
                {dragged.locationName ? <span>{dragged.locationName}</span> : null}
              </div>
              <h2>{dragged.name}</h2>
              <p>{dragged.description ?? '説明はまだありません。'}</p>
            </div>
            <div className="place-card-actions">
              <span className="place-edit-button place-edit-button-ghost">編集</span>
              <span className="place-drag-handle is-active">
                <span className="drag-dot-grid"><i /><i /><i /><i /><i /><i /></span>
              </span>
            </div>
          </article>
        );
      })()}

      <footer className="app-footer"><VersionBadge /><span>Planning Core</span></footer>
      <RouteBottomNav routeId={routeId} />

      {createOpen && (
        <div className="modal-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget) closeCreateModal();
        }}>
          <section className="route-modal" role="dialog" aria-modal="true" aria-labelledby="create-destination-title">
            <div className="modal-header">
              <div>
                <p className="eyebrow">NEW PLACE</p>
                <h2 id="create-destination-title">目的地を追加</h2>
              </div>
              <button className="modal-close-button" type="button" onClick={closeCreateModal} aria-label="閉じる" disabled={saving}>×</button>
            </div>

            <form className="route-create-form place-form" onSubmit={handleCreate}>
              <div className="field-group"><label htmlFor="destination-phase">Phase</label><select id="destination-phase" value={selectedPhaseId} onChange={(event) => setSelectedPhaseId(event.target.value)} disabled={saving}>{phases.map((phase) => <option value={phase.id} key={phase.id}>{phase.name || '名前未設定のPhase'}{phase.startTime ? ` (${phase.startTime.slice(0,5)}〜)` : ''}</option>)}</select></div>
              <div className="field-group">
                <label htmlFor="destination-name">目的地名</label>
                <input ref={nameInputRef} id="destination-name" value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="例：大観山展望台" maxLength={40} autoComplete="off" disabled={saving} required />
                <p className="field-hint">必須・40文字まで</p>
              </div>

              <div className="field-group">
                <label htmlFor="destination-location">場所名 <span className="field-optional">任意</span></label>
                <input id="destination-location" value={locationName}
                  onChange={(event) => setLocationName(event.target.value)}
                  placeholder="例：淵野辺駅" maxLength={80} autoComplete="off" disabled={saving} />
              </div>

              <div className="field-group">
                <span className="field-label">重要度</span>
                <div className="importance-segment" role="group" aria-label="重要度">
                  <button
                    className={`importance-option ${importance === 'must' ? 'is-active' : ''}`}
                    type="button"
                    onClick={() => setImportance('must')}
                    disabled={saving}
                    aria-pressed={importance === 'must'}
                  >
                    必須
                  </button>
                  <button
                    className={`importance-option ${importance === 'optional' ? 'is-active' : ''}`}
                    type="button"
                    onClick={() => setImportance('optional')}
                    disabled={saving}
                    aria-pressed={importance === 'optional'}
                  >
                    任意
                  </button>
                </div>
              </div>

              <div className="field-group">
                <label htmlFor="destination-description">メモ <span className="field-optional">任意</span></label>
                <textarea id="destination-description" value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="例：改札を出て右側に集合" maxLength={200} rows={3} disabled={saving} />
                <p className="field-hint">任意・200文字まで</p>
              </div>

              {formError && <p className="form-error" role="alert">{formError}</p>}

              <div className="modal-actions">
                <button className="secondary-button" type="button" onClick={closeCreateModal} disabled={saving}>キャンセル</button>
                <button className="primary-button" type="submit" disabled={!name.trim() || saving}>
                  {saving ? '追加中…' : '追加'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {editing && (
        <div className="modal-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget) closeEditModal();
        }}>
          <section className="route-modal edit-place-modal" role="dialog" aria-modal="true" aria-labelledby="edit-destination-title">
            <div className="modal-header">
              <div>
                <p className="eyebrow">EDIT PLACE</p>
                <h2 id="edit-destination-title">目的地を編集</h2>
              </div>
              <button className="modal-close-button" type="button" onClick={closeEditModal} aria-label="閉じる" disabled={editSaving}>×</button>
            </div>

            <form className="route-create-form place-form" onSubmit={handleEdit}>
              <div className="field-group"><label htmlFor="edit-destination-phase">Phase</label><select id="edit-destination-phase" value={editPhaseId} onChange={(event) => setEditPhaseId(event.target.value)} disabled={editSaving}>{phases.map((phase) => <option value={phase.id} key={phase.id}>{phase.name || '名前未設定のPhase'}{phase.startTime ? ` (${phase.startTime.slice(0,5)}〜)` : ''}</option>)}</select></div>
              <div className="field-group">
                <label htmlFor="edit-destination-name">目的地名</label>
                <input ref={editNameInputRef} id="edit-destination-name" value={editName}
                  onChange={(event) => setEditName(event.target.value)}
                  maxLength={40} autoComplete="off" disabled={editSaving} required />
                <p className="field-hint">必須・40文字まで</p>
              </div>

              <div className="field-group">
                <label htmlFor="edit-destination-location">場所名 <span className="field-optional">任意</span></label>
                <input id="edit-destination-location" value={editLocationName}
                  onChange={(event) => setEditLocationName(event.target.value)}
                  maxLength={80} autoComplete="off" disabled={editSaving} />
              </div>

              <div className="field-group">
                <span className="field-label">重要度</span>
                <div className="importance-segment" role="group" aria-label="重要度">
                  <button
                    className={`importance-option ${editImportance === 'must' ? 'is-active' : ''}`}
                    type="button"
                    onClick={() => setEditImportance('must')}
                    disabled={editSaving}
                    aria-pressed={editImportance === 'must'}
                  >
                    必須
                  </button>
                  <button
                    className={`importance-option ${editImportance === 'optional' ? 'is-active' : ''}`}
                    type="button"
                    onClick={() => setEditImportance('optional')}
                    disabled={editSaving}
                    aria-pressed={editImportance === 'optional'}
                  >
                    任意
                  </button>
                </div>
              </div>

              <div className="field-group">
                <label htmlFor="edit-destination-description">メモ <span className="field-optional">任意</span></label>
                <textarea id="edit-destination-description" value={editDescription}
                  onChange={(event) => setEditDescription(event.target.value)}
                  maxLength={200} rows={2} disabled={editSaving} />
                <p className="field-hint">任意・200文字まで</p>
              </div>

              {editError && <p className="form-error" role="alert">{editError}</p>}

              <div className="modal-actions edit-place-actions">
                <button className="primary-button" type="submit" disabled={!editName.trim() || editSaving}>
                  {editSaving ? '保存中…' : '保存'}
                </button>
                <button className="secondary-button" type="button" onClick={closeEditModal} disabled={editSaving}>
                  キャンセル
                </button>
              </div>

              <button
                className="place-delete-button"
                type="button"
                onClick={askDeleteDestination}
                disabled={editSaving}
              >
                この目的地を削除
              </button>
            </form>
          </section>
        </div>
      )}

      {deleteTarget && (
        <div
          className="modal-backdrop route-delete-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !deleting) closeDeleteDialog();
          }}
        >
          <section
            className="route-modal route-delete-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-destination-title"
            aria-describedby="delete-destination-description"
          >
            <div className="modal-header">
              <div>
                <p className="eyebrow route-danger-eyebrow">DELETE PLACE</p>
                <h2 id="delete-destination-title">この目的地を削除しますか？</h2>
              </div>
              <button
                className="modal-close-button"
                type="button"
                onClick={closeDeleteDialog}
                aria-label="閉じる"
                disabled={deleting}
              >
                ×
              </button>
            </div>

            <p id="delete-destination-description" className="route-delete-description">
              「{deleteTarget.name}」を削除します。削除後はD Routeから元に戻せません。
            </p>

            {deleteError && <div className="route-inline-error" role="alert">{deleteError}</div>}

            <div className="modal-actions">
              <button
                className="secondary-button"
                type="button"
                onClick={closeDeleteDialog}
                disabled={deleting}
              >
                キャンセル
              </button>
              <button
                className="route-danger-confirm-button"
                type="button"
                onClick={() => void handleDeleteDestination()}
                disabled={deleting}
              >
                {deleting ? '削除中…' : '目的地を削除'}
              </button>
            </div>
          </section>
        </div>
      )}

      {(phaseCreateOpen || phaseEditing) && (
        <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !phaseSaving) { setPhaseCreateOpen(false); setPhaseEditing(null); } }}>
          <section className="route-modal phase-edit-modal" role="dialog" aria-modal="true">
            <div className="modal-header"><div><p className="eyebrow">{phaseEditing ? 'EDIT PHASE' : 'NEW PHASE'}</p><h2>{phaseEditing ? 'Phaseを編集' : 'Phaseを追加'}</h2></div><button className="modal-close-button" type="button" disabled={phaseSaving} onClick={() => { setPhaseCreateOpen(false); setPhaseEditing(null); }}>×</button></div>
            <form className="route-create-form place-form" onSubmit={phaseEditing ? handlePhaseEdit : handlePhaseCreate}>
              <div className="field-group"><label htmlFor="phase-name">Phase名 {phaseEditing?.isDefault && <span className="field-optional">空欄可</span>}</label><input id="phase-name" value={phaseName} onChange={(event) => setPhaseName(event.target.value)} placeholder="例：午前" maxLength={40} disabled={phaseSaving} /></div>
              <div className="field-group">
                <label htmlFor="phase-start-time">開始時間 <span className="field-optional">任意</span></label>
                <div className="phase-time-control">
                  <input
                    id="phase-start-time"
                    type="time"
                    value={phaseStartTime}
                    onChange={(event) => setPhaseStartTime(event.target.value)}
                    disabled={phaseSaving}
                  />
                  {phaseStartTime ? (
                    <button
                      className="phase-time-clear"
                      type="button"
                      disabled={phaseSaving}
                      onClick={() => setPhaseStartTime('')}
                    >
                      時刻を解除
                    </button>
                  ) : null}
                </div>
                <p className="field-hint">終了時間は設定しません。Route画面の優先表示に使う開始時刻です。</p>
              </div>
              <div className="field-group"><label htmlFor="phase-description">メモ <span className="field-optional">任意</span></label><textarea id="phase-description" value={phaseDescription} onChange={(event) => setPhaseDescription(event.target.value)} maxLength={200} rows={3} disabled={phaseSaving} /></div>
              {phaseError && <p className="form-error" role="alert">{phaseError}</p>}
              <div className="modal-actions"><button className="secondary-button" type="button" disabled={phaseSaving} onClick={() => { setPhaseCreateOpen(false); setPhaseEditing(null); }}>キャンセル</button><button className="primary-button" type="submit" disabled={phaseSaving || (!phaseEditing?.isDefault && !phaseName.trim())}>{phaseSaving ? '保存中…' : phaseEditing ? '保存' : '追加'}</button></div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}
