import { FormEvent, PointerEvent as ReactPointerEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BrandMark } from '../../shared/ui/BrandMark';
import { RefreshButton } from '../../shared/ui/RefreshButton';
import { VersionBadge } from '../../shared/ui/VersionBadge';
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
  type DestinationTimeType,
} from './destinations';
import { createRoutePhase, deleteRoutePhase, getRoutePhases, updateRoutePhase, type PhaseSummary } from './phases';
import { createAlternateRoute, configureAlternateRoute, deleteAlternateRoute, listRouteBranches, listAlternateRouteDestinations, saveAlternateRouteDestination, deleteAlternateRouteDestination, listRouteBranchAssignments, assignMemberToBranch, clearMemberBranch, type AlternateRouteConnectionType, type RouteBranch, type AlternateRouteDestination, type RouteBranchAssignment } from './branches';
import { listRouteMembers, type RouteMember } from './members';

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

function timeToMinutes(value: string | null | undefined): number | null {
  if (!value) return null;
  const [h, m] = value.slice(0, 5).split(':').map(Number);
  return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : null;
}

function resolvePhaseForTime(phases: PhaseSummary[], startTime: string): PhaseSummary | null {
  const target = timeToMinutes(startTime); if (target === null) return null;
  return phases.filter(p => timeToMinutes(p.startTime) !== null)
    .sort((a,b)=>(timeToMinutes(b.startTime)??-1)-(timeToMinutes(a.startTime)??-1))
    .find(p => (timeToMinutes(p.startTime)??Infinity) <= target) ?? null;
}

function formatDestinationTime(destination: DestinationSummary): string | null {
  if (destination.timeType === 'none' || !destination.startTime) return null;
  const start=destination.startTime.slice(0,5); const end=destination.endTime?.slice(0,5); const range=end?`${start}〜${end}`:start;
  return destination.timeType === 'approx' ? `目安 ${range}` : range;
}

type MainRouteConnection = { route: RouteBranch; kind: 'start' | 'end'; label: string; detail: string };

function mainRouteConnectionLabel(route: RouteBranch, kind: 'start' | 'end'): { label: string; detail: string } {
  if (kind === 'start') {
    if (route.connectionType === 'leave') return { label: '離脱', detail: route.name };
    return { label: '分岐', detail: route.name };
  }
  if (route.connectionType === 'join') return { label: '合流', detail: route.name };
  return { label: '再合流', detail: route.name };
}


function normalizeFiveMinuteTime(value: string): string {
  if (!value) return '';
  const [hourText, minuteText] = value.split(':');
  const hour = Number(hourText);
  const minute = Number(minuteText);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return '';
  const rounded = Math.round(minute / 5) * 5;
  const nextHour = rounded === 60 ? (hour + 1) % 24 : hour;
  const nextMinute = rounded === 60 ? 0 : rounded;
  return `${String(nextHour).padStart(2, '0')}:${String(nextMinute).padStart(2, '0')}`;
}

const TIME_HOURS = Array.from({ length: 24 }, (_, index) => String(index).padStart(2, '0'));
const TIME_MINUTES = Array.from({ length: 12 }, (_, index) => String(index * 5).padStart(2, '0'));

function timePart(value: string, part: 'hour' | 'minute'): string {
  if (!value) return '';
  const [hour = '', minute = ''] = value.split(':');
  return part === 'hour' ? hour : minute;
}

function updateTimePart(current: string, part: 'hour' | 'minute', nextPart: string): string {
  const currentHour = timePart(current, 'hour');
  const currentMinute = timePart(current, 'minute');
  const hour = part === 'hour' ? nextPart : currentHour;
  const minute = part === 'minute' ? nextPart : currentMinute;
  if (!hour && !minute) return '';
  return `${hour || '00'}:${minute || '00'}`;
}


export function RoutePlacesPage() {
  const { routeId = '' } = useParams<{ routeId: string }>();
  const [destinations, setDestinations] = useState<DestinationSummary[]>([]);
  const [activeBranchId, setActiveBranchId] = useState<string | null>(null);
  const [placesRouteDirection, setPlacesRouteDirection] = useState<'next' | 'previous'>('next');
  const [placesRouteMotionId, setPlacesRouteMotionId] = useState(0);
  const [placesRouteDragging, setPlacesRouteDragging] = useState(false);
  const [placesRouteSettling, setPlacesRouteSettling] = useState(false);
  const placesRouteSwipeStartTimeRef = useRef(0);
  const placesRouteCarouselRef = useRef<HTMLElement | null>(null);
  const placesRouteMotionRef = useRef<HTMLDivElement | null>(null);
  const placesRouteContentRef = useRef<HTMLDivElement | null>(null);
  const placesRouteSwitchTokenRef = useRef(0);
  const placesRouteRafRef = useRef<number | null>(null);
  const placesRouteVisualXRef = useRef(0);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const placesSwipeStartXRef = useRef<number | null>(null);
  const placesSwipeStartYRef = useRef<number | null>(null);
  const placesSwipeBlockedRef = useRef(false);
  const placesRouteGestureLockRef = useRef(false);
  const placesRouteSettleTimerRef = useRef<number | null>(null);
  const placesPlanningCacheRef = useRef(new Map<string, { phases: PhaseSummary[]; destinations: DestinationSummary[] }>());
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
  const [swipedDestinationId, setSwipedDestinationId] = useState<string | null>(null);
  const [destinationSwipeOffset, setDestinationSwipeOffset] = useState(0);
  const destinationSwipeStartXRef = useRef(0);
  const destinationSwipeStartYRef = useRef(0);
  const destinationSwipeStartOffsetRef = useRef(0);
  const activeDestinationSwipeIdRef = useRef<string | null>(null);
  const destinationSwipeAxisRef = useRef<'pending' | 'horizontal' | 'vertical'>('pending');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [locationName, setLocationName] = useState('');
  const [description, setDescription] = useState('');
  const [importance, setImportance] = useState<DestinationImportance>('must');
  const [timeType, setTimeType] = useState<DestinationTimeType>('none');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [editing, setEditing] = useState<DestinationSummary | null>(null);
  const [editName, setEditName] = useState('');
  const [editLocationName, setEditLocationName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editImportance, setEditImportance] = useState<DestinationImportance>('must');
  const [editTimeType, setEditTimeType] = useState<DestinationTimeType>('none');
  const [editStartTime, setEditStartTime] = useState('');
  const [editEndTime, setEditEndTime] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [alternateRoutes, setAlternateRoutes] = useState<RouteBranch[]>([]);
  const [alternateRouteOpen, setAlternateRouteOpen] = useState(false);
  const [alternateRouteEditing, setAlternateRouteEditing] = useState<RouteBranch | null>(null);
  const [alternateRouteName, setAlternateRouteName] = useState('');
  const [alternateRouteDescription, setAlternateRouteDescription] = useState('');
  const [alternateRouteType, setAlternateRouteType] = useState<AlternateRouteConnectionType>('split_merge');
  const [alternateRouteStartId, setAlternateRouteStartId] = useState('');
  const [alternateRouteEndId, setAlternateRouteEndId] = useState('');
  const [alternateRouteSaving, setAlternateRouteSaving] = useState(false);
  const [alternateRouteError, setAlternateRouteError] = useState<string | null>(null);
  const [alternateRouteDeleting, setAlternateRouteDeleting] = useState(false);
  const [alternateRouteMembers, setAlternateRouteMembers] = useState<RouteMember[]>([]);
  const [alternateRouteAssignments, setAlternateRouteAssignments] = useState<RouteBranchAssignment[]>([]);
  const [alternateRouteSelectedMemberIds, setAlternateRouteSelectedMemberIds] = useState<string[]>([]);
  const [alternateRouteMembersLoading, setAlternateRouteMembersLoading] = useState(false);
  const [alternateRouteDestinations, setAlternateRouteDestinations] = useState<AlternateRouteDestination[]>([]);
  const [alternateDestinationEditing, setAlternateDestinationEditing] = useState<AlternateRouteDestination | null>(null);
  const [alternateDestinationName, setAlternateDestinationName] = useState('');
  const [alternateDestinationLocation, setAlternateDestinationLocation] = useState('');
  const [alternateDestinationDescription, setAlternateDestinationDescription] = useState('');
  const [alternateDestinationTimeType, setAlternateDestinationTimeType] = useState<'none'|'fixed'|'approx'>('none');
  const [alternateDestinationStart, setAlternateDestinationStart] = useState('');
  const [alternateDestinationEnd, setAlternateDestinationEnd] = useState('');
  const [alternateDestinationSaving, setAlternateDestinationSaving] = useState(false);
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

  useBodyScrollLock(createOpen || Boolean(editing) || Boolean(deleteTarget) || phaseCreateOpen || Boolean(phaseEditing) || alternateRouteOpen || addMenuOpen);

  async function loadPlanning() {
    setLoading(true);
    setError(null);
    try {
      const [nextPhases, nextDestinations, nextAlternateRoutes] = await Promise.all([getRoutePhases(routeId, activeBranchId), getRouteDestinations(routeId, activeBranchId), listRouteBranches(routeId)]);
      setPhases(nextPhases);
      setDestinations(nextDestinations);
      setAlternateRoutes(nextAlternateRoutes);
      placesPlanningCacheRef.current.set(activeBranchId ?? 'main', { phases: nextPhases, destinations: nextDestinations });
    } catch (err) {
      setError(getErrorMessage(err, 'Placesを読み込めませんでした。'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadPlanning(); }, [routeId]);

  const exceptionDestinationIds = useMemo(() => {
    const ids = new Set<string>();
    for (const destination of destinations) {
      if (destination.timeType === 'none' || !destination.startTime) continue;
      const expected = resolvePhaseForTime(phases, destination.startTime);
      if (!expected || expected.id !== destination.phaseId) ids.add(destination.id);
    }
    return ids;
  }, [phases, destinations]);

  const destinationsByPhase = useMemo(() => {
    const map = new Map<string, DestinationSummary[]>();
    for (const phase of phases) map.set(phase.id, []);
    for (const destination of destinations) {
      if (exceptionDestinationIds.has(destination.id)) continue;
      const list = map.get(destination.phaseId) ?? [];
      list.push(destination);
      map.set(destination.phaseId, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.orderValue - b.orderValue);
    }
    return map;
  }, [phases, destinations, exceptionDestinationIds]);

  const mainConnectionsByDestination = useMemo(() => {
    const map = new Map<string, MainRouteConnection[]>();
    if (activeBranchId) return map;
    const push = (destinationId: string | null, route: RouteBranch, kind: 'start' | 'end') => {
      if (!destinationId) return;
      const text = mainRouteConnectionLabel(route, kind);
      const current = map.get(destinationId) ?? [];
      current.push({ route, kind, ...text });
      map.set(destinationId, current);
    };
    alternateRoutes.forEach((route) => {
      push(route.startDestinationId, route, 'start');
      push(route.endDestinationId, route, 'end');
    });
    return map;
  }, [activeBranchId, alternateRoutes]);

  const exceptionDestinations = useMemo(() => destinations
    .filter((destination) => exceptionDestinationIds.has(destination.id))
    .sort((a,b)=>(timeToMinutes(a.startTime)??0)-(timeToMinutes(b.startTime)??0)),
    [destinations, exceptionDestinationIds]
  );


  const timedDestinations = useMemo(() => destinations
    .filter((destination) => destination.timeType !== 'none' && Boolean(destination.startTime))
    .sort((a, b) => (timeToMinutes(a.startTime) ?? 0) - (timeToMinutes(b.startTime) ?? 0)), [destinations]);

  function alternateRouteTypeLabel(type: AlternateRouteConnectionType | null) {
    if (type === 'join') return '途中から合流';
    if (type === 'leave') return '途中離脱';
    if (type === 'split_merge') return '分岐して再合流';
    return '設定途中';
  }

  function destinationLabel(destinationId: string | null) {
    if (!destinationId) return '';
    const destination = destinations.find((item) => item.id === destinationId);
    if (!destination) return '接続先不明';
    const time = destination.startTime?.slice(0, 5);
    return `${time ? `${time} ` : ''}${destination.name}`;
  }

  async function loadAlternateRouteMemberSelection(branchId: string | null) {
    setAlternateRouteMembersLoading(true);
    const [membersResult, assignmentsResult] = await Promise.allSettled([
      listRouteMembers(routeId),
      listRouteBranchAssignments(routeId),
    ]);

    if (membersResult.status === 'fulfilled') {
      setAlternateRouteMembers(membersResult.value.filter((member) => member.status === 'participating'));
    } else {
      setAlternateRouteMembers([]);
      setAlternateRouteError(getErrorMessage(membersResult.reason, '参加メンバーを読み込めませんでした。'));
    }

    if (assignmentsResult.status === 'fulfilled') {
      setAlternateRouteAssignments(assignmentsResult.value);
      setAlternateRouteSelectedMemberIds(branchId
        ? assignmentsResult.value.filter((assignment) => assignment.branchId === branchId).map((assignment) => assignment.memberUserId)
        : []);
    } else {
      setAlternateRouteAssignments([]);
      setAlternateRouteSelectedMemberIds([]);
      setAlternateRouteError((current) => current ?? getErrorMessage(assignmentsResult.reason, '別行動の参加者設定を読み込めませんでした。'));
    }
    setAlternateRouteMembersLoading(false);
  }

  function toggleAlternateRouteMember(userId: string) {
    setAlternateRouteSelectedMemberIds((current) => current.includes(userId)
      ? current.filter((id) => id !== userId)
      : [...current, userId]);
  }

  async function saveAlternateRouteMemberSelection(branchId: string) {
    const selected = new Set(alternateRouteSelectedMemberIds);
    const currentForBranch = alternateRouteAssignments.filter((assignment) => assignment.branchId === branchId);

    for (const assignment of currentForBranch) {
      if (!selected.has(assignment.memberUserId)) {
        await clearMemberBranch(routeId, assignment.memberUserId);
      }
    }

    for (const memberUserId of selected) {
      const current = alternateRouteAssignments.find((assignment) => assignment.memberUserId === memberUserId);
      if (current?.branchId !== branchId) {
        await assignMemberToBranch(routeId, branchId, memberUserId);
      }
    }
  }

  function openAlternateRouteCreate() {
    setAlternateRouteEditing(null);
    setAlternateRouteName('');
    setAlternateRouteDescription('');
    setAlternateRouteType('split_merge');
    setAlternateRouteStartId('');
    setAlternateRouteEndId('');
    setAlternateRouteError(null);
    setAlternateRouteMembers([]);
    setAlternateRouteAssignments([]);
    setAlternateRouteSelectedMemberIds([]);
    void loadAlternateRouteMemberSelection(null);
    setAlternateRouteOpen(true);
  }

  function openAlternateRouteEdit(route: RouteBranch) {
    setAlternateRouteEditing(route);
    setAlternateRouteDestinations([]);
    void listAlternateRouteDestinations(route.id).then(setAlternateRouteDestinations).catch((err)=>setAlternateRouteError(getErrorMessage(err,'別行動の予定を読み込めませんでした。')));
    setAlternateRouteName(route.name);
    setAlternateRouteDescription(route.description);
    setAlternateRouteType(route.connectionType ?? 'split_merge');
    setAlternateRouteStartId(route.startDestinationId ?? '');
    setAlternateRouteEndId(route.endDestinationId ?? '');
    setAlternateRouteError(null);
    void loadAlternateRouteMemberSelection(route.id);
    setAlternateRouteOpen(true);
  }

  function closeAlternateRouteModal() {
    if (!alternateRouteSaving && !alternateRouteDeleting) setAlternateRouteOpen(false);
  }

  function startAlternateDestinationCreate() {
    setAlternateDestinationEditing(null); setAlternateDestinationName(''); setAlternateDestinationLocation('');
    setAlternateDestinationDescription(''); setAlternateDestinationTimeType('none'); setAlternateDestinationStart(''); setAlternateDestinationEnd('');
  }
  function startAlternateDestinationEdit(item: AlternateRouteDestination) {
    setAlternateDestinationEditing(item); setAlternateDestinationName(item.name); setAlternateDestinationLocation(item.locationName);
    setAlternateDestinationDescription(item.description); setAlternateDestinationTimeType(item.timeType);
    setAlternateDestinationStart(item.startTime ?? ''); setAlternateDestinationEnd(item.endTime ?? '');
  }
  async function handleAlternateDestinationSave() {
    if(!alternateRouteEditing || alternateDestinationSaving || !alternateDestinationName.trim()) return;
    setAlternateDestinationSaving(true); setAlternateRouteError(null);
    try {
      const saved=await saveAlternateRouteDestination({routeId,branchId:alternateRouteEditing.id,destinationId:alternateDestinationEditing?.id,
        name:alternateDestinationName,locationName:alternateDestinationLocation,description:alternateDestinationDescription,
        timeType:alternateDestinationTimeType,startTime:alternateDestinationStart,endTime:alternateDestinationEnd});
      setAlternateRouteDestinations(current=>alternateDestinationEditing?current.map(i=>i.id===saved.id?saved:i):[...current,saved].sort((a,b)=>a.orderValue-b.orderValue));
      startAlternateDestinationCreate();
    } catch(err) { setAlternateRouteError(getErrorMessage(err,'別行動の予定を保存できませんでした。')); }
    finally { setAlternateDestinationSaving(false); }
  }
  async function handleAlternateDestinationDelete(item: AlternateRouteDestination) {
    if(!alternateRouteEditing || !window.confirm(`「${item.name}」を削除しますか？`)) return;
    try { await deleteAlternateRouteDestination(routeId,alternateRouteEditing.id,item.id); setAlternateRouteDestinations(c=>c.filter(i=>i.id!==item.id)); }
    catch(err){ setAlternateRouteError(getErrorMessage(err,'別行動の予定を削除できませんでした。')); }
  }

  async function handleAlternateRouteDelete() {
    if (!alternateRouteEditing || alternateRouteDeleting || alternateRouteSaving) return;
    const confirmed = window.confirm(`「${alternateRouteEditing.name}」を削除しますか？\n割り振り情報も解除されます。`);
    if (!confirmed) return;
    setAlternateRouteDeleting(true);
    setAlternateRouteError(null);
    try {
      await deleteAlternateRoute(alternateRouteEditing.id, routeId);
      setAlternateRoutes((current) => current.filter((item) => item.id !== alternateRouteEditing.id));
      setAlternateRouteOpen(false);
      setAlternateRouteEditing(null);
      setToast('別行動を削除しました。');
    } catch (err) {
      setAlternateRouteError(getErrorMessage(err, '別行動を削除できませんでした。'));
    } finally {
      setAlternateRouteDeleting(false);
    }
  }

  async function handleAlternateRouteSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (alternateRouteSaving || alternateRouteDeleting) return;
    if (!alternateRouteName.trim()) { setAlternateRouteError('別Route名を入力してください。'); return; }
    if (alternateRouteType === 'split_merge' && (!alternateRouteStartId || !alternateRouteEndId)) { setAlternateRouteError('分岐地点と合流地点を選択してください。'); return; }
    if (alternateRouteType === 'join' && !alternateRouteEndId) { setAlternateRouteError('合流地点を選択してください。'); return; }
    if (alternateRouteType === 'leave' && !alternateRouteStartId) { setAlternateRouteError('離脱地点を選択してください。'); return; }
    setAlternateRouteSaving(true);
    setAlternateRouteError(null);
    const input = {
      routeId,
      name: alternateRouteName,
      description: alternateRouteDescription,
      connectionType: alternateRouteType,
      startDestinationId: alternateRouteType === 'join' ? null : alternateRouteStartId,
      endDestinationId: alternateRouteType === 'leave' ? null : alternateRouteEndId,
    };
    try {
      const saved = alternateRouteEditing
        ? await configureAlternateRoute(alternateRouteEditing.id, input)
        : await createAlternateRoute(input);
      try {
        await saveAlternateRouteMemberSelection(saved.id);
      } catch (memberError) {
        setAlternateRouteEditing(saved);
        setAlternateRoutes((current) => current.some((item) => item.id === saved.id)
          ? current.map((item) => item.id === saved.id ? saved : item)
          : [...current, saved].sort((a, b) => a.orderValue - b.orderValue));
        throw new Error(`別行動は保存しましたが、参加者設定を保存できませんでした。${getErrorMessage(memberError, '')}`);
      }
      setAlternateRoutes((current) => alternateRouteEditing
        ? current.map((item) => item.id === saved.id ? saved : item)
        : [...current, saved].sort((a, b) => a.orderValue - b.orderValue));
      setAlternateRouteOpen(false);
      setToast(alternateRouteEditing ? '別行動を更新しました。' : '別行動を追加しました。');
    } catch (err) {
      setAlternateRouteError(getErrorMessage(err, '別Routeを保存できませんでした。'));
    } finally {
      setAlternateRouteSaving(false);
    }
  }

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

  function openCreateModal(phaseId?: string) {
    const defaultPhaseId = phases.find((phase) => phase.isDefault)?.id ?? phases[0]?.id ?? '';
    setSelectedPhaseId(phaseId || defaultPhaseId);
    setName('');
    setLocationName('');
    setDescription('');
    setImportance('must');
    setTimeType('none'); setStartTime(''); setEndTime('');
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
      const autoPhase = timeType === 'none' ? null : resolvePhaseForTime(phases, startTime);
      const fallbackPhaseId = selectedPhaseId || phases[0]?.id || '';
      const created = await createRouteDestination(routeId, {
        phaseId: timeType === 'none' ? fallbackPhaseId : (autoPhase?.id ?? fallbackPhaseId), branchId: activeBranchId, name, locationName, description, importance,
        timeType, startTime: timeType === 'none' ? null : startTime, endTime: timeType === 'none' ? null : (endTime || null),
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
    setEditTimeType(destination.timeType); setEditStartTime(destination.startTime?.slice(0,5) ?? ''); setEditEndTime(destination.endTime?.slice(0,5) ?? '');
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
      const autoPhase = editTimeType === 'none' ? null : resolvePhaseForTime(phases, editStartTime);
      const fallbackPhaseId = editPhaseId || editing.phaseId || phases[0]?.id || '';
      const updated = await updateRouteDestination(routeId, editing.id, {
        phaseId: editTimeType === 'none' ? fallbackPhaseId : (autoPhase?.id ?? fallbackPhaseId), branchId: activeBranchId, name: editName, locationName: editLocationName, description: editDescription, importance: editImportance,
        timeType: editTimeType, startTime: editTimeType === 'none' ? null : editStartTime, endTime: editTimeType === 'none' ? null : (editEndTime || null),
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
      const created = await createRoutePhase(routeId, { name: phaseName, description: phaseDescription, startTime: phaseStartTime || null }, activeBranchId);
      setPhases((current) => [...current, created].sort((a, b) => a.orderValue - b.orderValue));
      setPhaseCreateOpen(false);
    } catch (err) {
      setPhaseError(getErrorMessage(err, 'Phaseを追加できませんでした。'));
    } finally { setPhaseSaving(false); }
  }


const DESTINATION_DELETE_REVEAL_WIDTH = 92;

function closeDestinationSwipe() {
  setSwipedDestinationId(null);
  setDestinationSwipeOffset(0);
  activeDestinationSwipeIdRef.current = null;
  destinationSwipeAxisRef.current = 'pending';
}

function handleDestinationPointerDown(event: ReactPointerEvent<HTMLElement>, destinationId: string) {
  if (event.pointerType === 'mouse' && event.button !== 0) return;
  event.stopPropagation();
  placesRouteGestureLockRef.current = true;
  placesSwipeBlockedRef.current = true;
  placesSwipeStartXRef.current = null;
  placesSwipeStartYRef.current = null;
  if (swipedDestinationId && swipedDestinationId !== destinationId) closeDestinationSwipe();
  activeDestinationSwipeIdRef.current = destinationId;
  destinationSwipeStartXRef.current = event.clientX;
  destinationSwipeStartYRef.current = event.clientY;
  destinationSwipeStartOffsetRef.current = swipedDestinationId === destinationId ? destinationSwipeOffset : 0;
  destinationSwipeAxisRef.current = 'pending';
  event.currentTarget.setPointerCapture(event.pointerId);
}

function handleDestinationPointerMove(event: ReactPointerEvent<HTMLElement>, destinationId: string) {
  if (activeDestinationSwipeIdRef.current !== destinationId) return;
  const deltaX = event.clientX - destinationSwipeStartXRef.current;
  const deltaY = event.clientY - destinationSwipeStartYRef.current;
  if (destinationSwipeAxisRef.current === 'pending' && (Math.abs(deltaX) > 8 || Math.abs(deltaY) > 8)) {
    destinationSwipeAxisRef.current = Math.abs(deltaX) > Math.abs(deltaY) * 1.12 ? 'horizontal' : 'vertical';
  }
  if (destinationSwipeAxisRef.current !== 'horizontal') return;
  event.preventDefault();
  event.stopPropagation();
  const nextOffset = Math.max(-DESTINATION_DELETE_REVEAL_WIDTH, Math.min(0, destinationSwipeStartOffsetRef.current + deltaX));
  setSwipedDestinationId(destinationId);
  setDestinationSwipeOffset(nextOffset);
}

function handleDestinationPointerEnd(event: ReactPointerEvent<HTMLElement>, destinationId: string) {
  if (activeDestinationSwipeIdRef.current !== destinationId) return;
  event.stopPropagation();
  try { event.currentTarget.releasePointerCapture(event.pointerId); } catch { /* already released */ }
  const horizontal = destinationSwipeAxisRef.current === 'horizontal';
  const shouldOpen = horizontal && destinationSwipeOffset <= -(DESTINATION_DELETE_REVEAL_WIDTH * 0.52);
  setSwipedDestinationId(shouldOpen ? destinationId : null);
  setDestinationSwipeOffset(shouldOpen ? -DESTINATION_DELETE_REVEAL_WIDTH : 0);
  activeDestinationSwipeIdRef.current = null;
  destinationSwipeAxisRef.current = 'pending';
  window.setTimeout(() => { placesRouteGestureLockRef.current = false; }, 0);
}

function requestDestinationDelete(destination: DestinationSummary) {
  closeDestinationSwipe();
  setDeleteError(null);
  setDeleteTarget(destination);
}

  async function handlePhaseEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!phaseEditing || phaseSaving) return;
    setPhaseSaving(true);
    setPhaseError(null);
    try {
      const updated = await updateRoutePhase(routeId, phaseEditing.id, { name: phaseName, description: phaseDescription, startTime: phaseStartTime || null }, activeBranchId);
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
    window.setTimeout(() => { placesRouteGestureLockRef.current = false; }, 0);
  }

  function beginDestinationDrag(event: React.PointerEvent<HTMLButtonElement>, destinationId: string, phaseId: string) {
    event.preventDefault();
    event.stopPropagation();
    if (dragSessionRef.current || reorderSaving) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;

    placesRouteGestureLockRef.current = true;
    placesSwipeBlockedRef.current = true;
    placesSwipeStartXRef.current = null;
    placesSwipeStartYRef.current = null;
    closeDestinationSwipe();

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
      sourceIndex: (destinationsByPhase.get(phaseId) ?? []).findIndex((item) => item.id === destinationId),
      targetIndex: (destinationsByPhase.get(phaseId) ?? []).findIndex((item) => item.id === destinationId),
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
      const phaseOrder = (destinationsByPhase.get(session.phaseId) ?? []).map((item) => ({ ...item }));
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
    event.stopPropagation();
    const session = dragSessionRef.current;
    if (!session || session.pointerId !== event.pointerId) return;

    if (!session.active) {
      const moved = Math.hypot(event.clientX - session.startX, event.clientY - session.startY);
      if (moved > 10) resetDestinationDrag();
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    setDragOverlay((current) => current ? { ...current, top: event.clientY - session.grabOffsetY } : current);

    // Allow long lists to keep moving while the finger approaches the viewport edge.
    const upperEdge = 118;
    const lowerEdge = window.innerHeight - 138;
    if (event.clientY < upperEdge) window.scrollBy({ top: -14, behavior: 'auto' });
    else if (event.clientY > lowerEdge) window.scrollBy({ top: 14, behavior: 'auto' });

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

  async function finishDestinationDragByPointerId(pointerId: number) {
    const session = dragSessionRef.current;
    if (!session || session.pointerId !== pointerId) return;

    if (!session.active) {
      resetDestinationDrag();
      return;
    }

    const original = dragStartOrderRef.current;
    let currentOrder = original
      ? original.map((item) => ({ ...item }))
      : (destinationsByPhase.get(session.phaseId) ?? []).map((item) => ({ ...item }));

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

  async function finishDestinationDrag(event: React.PointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    await finishDestinationDragByPointerId(event.pointerId);
  }

  function cancelDestinationDrag(event: React.PointerEvent<HTMLButtonElement>) {
    event.stopPropagation();
    const session = dragSessionRef.current;
    if (!session || session.pointerId !== event.pointerId) return;
    resetDestinationDrag({ restoreOrder: session.active });
  }

  function handleLostDestinationPointerCapture(event: React.PointerEvent<HTMLButtonElement>) {
    const session = dragSessionRef.current;
    if (!session || session.pointerId !== event.pointerId) return;
    resetDestinationDrag({ restoreOrder: session.active, releasePointer: false });
  }

  useEffect(() => {
    function finishActiveDrag(event: PointerEvent) {
      const session = dragSessionRef.current;
      if (!session || session.pointerId !== event.pointerId) return;
      void finishDestinationDragByPointerId(event.pointerId);
    }

    function cancelActiveDrag(event: PointerEvent) {
      const session = dragSessionRef.current;
      if (!session || session.pointerId !== event.pointerId) return;
      resetDestinationDrag({ restoreOrder: session.active, releasePointer: false });
    }

    function cancelOnWindowBlur() {
      const session = dragSessionRef.current;
      if (!session) return;
      resetDestinationDrag({ restoreOrder: session.active });
    }

    // iOS Safari can lose the handle's local pointerup after scrolling, DOM updates,
    // or a competing gesture. Window-level listeners guarantee that the floating
    // card and placeholder are always removed when the finger is released.
    window.addEventListener('pointerup', finishActiveDrag, true);
    window.addEventListener('pointercancel', cancelActiveDrag, true);
    window.addEventListener('blur', cancelOnWindowBlur);
    return () => {
      window.removeEventListener('pointerup', finishActiveDrag, true);
      window.removeEventListener('pointercancel', cancelActiveDrag, true);
      window.removeEventListener('blur', cancelOnWindowBlur);
      resetDestinationDrag({ restoreOrder: Boolean(dragSessionRef.current?.active) });
    };
  }, [routeId, activeBranchId]);

  const placesRouteIds = [null, ...alternateRoutes.map((route) => route.id)] as Array<string | null>;
  const activePlacesRouteIndex = Math.max(0, placesRouteIds.findIndex((id) => id === activeBranchId));
  const activePlacesRoute = activeBranchId ? alternateRoutes.find((route) => route.id === activeBranchId) ?? null : null;
  const placesRouteCategory = !activePlacesRoute ? 'メインRoute' : activePlacesRoute.connectionType === 'split_merge' ? '分岐Route' : activePlacesRoute.connectionType === 'join' ? '合流Route' : activePlacesRoute.connectionType === 'leave' ? '離脱Route' : '別行動Route';

  function clearPlacesRouteSettleTimer() {
    if (placesRouteSettleTimerRef.current !== null) {
      window.clearTimeout(placesRouteSettleTimerRef.current);
      placesRouteSettleTimerRef.current = null;
    }
  }

  function applyPlacesRouteVisualOffset(nextX: number, animate: boolean) {
    placesRouteVisualXRef.current = nextX;
    if (placesRouteRafRef.current !== null) window.cancelAnimationFrame(placesRouteRafRef.current);
    placesRouteRafRef.current = window.requestAnimationFrame(() => {
      const element = placesRouteCarouselRef.current;
      if (element) {
        element.style.transition = animate ? 'transform 280ms cubic-bezier(.22,.72,.22,1)' : 'none';
        element.style.transform = `translate3d(${nextX}px,0,0)`;
      }
      placesRouteRafRef.current = null;
    });
  }

  async function getPreparedPlacesPlanning(branchId: string | null) {
    const key = branchId ?? 'main';
    const cached = placesPlanningCacheRef.current.get(key);
    if (cached) return cached;
    const [nextPhases, nextDestinations] = await Promise.all([
      getRoutePhases(routeId, branchId),
      getRouteDestinations(routeId, branchId),
    ]);
    const prepared = { phases: nextPhases, destinations: nextDestinations };
    placesPlanningCacheRef.current.set(key, prepared);
    return prepared;
  }

  async function movePlacesRoute(nextIndex: number) {
    const bounded = Math.max(0, Math.min(placesRouteIds.length - 1, nextIndex));
    if (bounded === activePlacesRouteIndex || placesRouteSettling) return;

    const direction: 'next' | 'previous' = bounded > activePlacesRouteIndex ? 'next' : 'previous';
    const targetBranchId = placesRouteIds[bounded];
    const token = ++placesRouteSwitchTokenRef.current;
    const width = Math.max(placesRouteCarouselRef.current?.clientWidth ?? 0, 280);

    clearPlacesRouteSettleTimer();
    setPlacesRouteDragging(false);
    setPlacesRouteSettling(true);

    try {
      // Route画面と同様、切替先を先に用意してからカードを送り出す。
      const prepared = await getPreparedPlacesPlanning(targetBranchId);
      if (token !== placesRouteSwitchTokenRef.current) return;

      applyPlacesRouteVisualOffset(direction === 'next' ? -width : width, true);
      placesRouteSettleTimerRef.current = window.setTimeout(() => {
        if (token !== placesRouteSwitchTokenRef.current) return;

        setPlacesRouteDirection(direction);
        setPlacesRouteMotionId((current) => current + 1);
        setActiveBranchId(targetBranchId);
        setPhases(prepared.phases);
        setDestinations(prepared.destinations);
        setError(null);
        setLoading(false);

        // 新しい切替枠を反対側の近位置に置き、次フレームで中央へ戻す。
        applyPlacesRouteVisualOffset(direction === 'next' ? width * .22 : -width * .22, false);
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(() => applyPlacesRouteVisualOffset(0, true));
        });

        placesRouteSettleTimerRef.current = window.setTimeout(() => {
          setPlacesRouteSettling(false);
          placesRouteSettleTimerRef.current = null;
        }, 280);
      }, 190);
    } catch (err) {
      if (token === placesRouteSwitchTokenRef.current) {
        setError(getErrorMessage(err, 'Placesを読み込めませんでした。'));
        applyPlacesRouteVisualOffset(0, true);
        setPlacesRouteSettling(false);
      }
    }
  }

  function handlePlacesRouteTouchStart(event: React.TouchEvent<HTMLElement>) {
    if (alternateRouteOpen || createOpen || editing || phaseCreateOpen || phaseEditing || placesRouteSettling) return;
    clearPlacesRouteSettleTimer();
    placesSwipeStartXRef.current = event.touches[0]?.clientX ?? null;
    placesSwipeStartYRef.current = event.touches[0]?.clientY ?? null;
    placesRouteSwipeStartTimeRef.current = performance.now();
    setPlacesRouteDragging(true);
    applyPlacesRouteVisualOffset(0, false);
  }

  function handlePlacesRouteTouchMove(event: React.TouchEvent<HTMLElement>) {
    const startX = placesSwipeStartXRef.current;
    const startY = placesSwipeStartYRef.current;
    const touch = event.touches[0];
    if (startX === null || startY === null || !touch || placesRouteSettling) return;
    const deltaX = touch.clientX - startX;
    const deltaY = touch.clientY - startY;
    if (Math.abs(deltaX) <= Math.abs(deltaY)) return;
    event.preventDefault();
    const atStart = activePlacesRouteIndex === 0 && deltaX > 0;
    const atEnd = activePlacesRouteIndex >= placesRouteIds.length - 1 && deltaX < 0;
    applyPlacesRouteVisualOffset(atStart || atEnd ? deltaX * .24 : deltaX, false);
  }

  function handlePlacesRouteTouchEnd(event: React.TouchEvent<HTMLElement>) {
    const startX = placesSwipeStartXRef.current;
    placesSwipeStartXRef.current = null;
    placesSwipeStartYRef.current = null;
    const endX = event.changedTouches[0]?.clientX;
    if (startX === null || endX === undefined) {
      setPlacesRouteDragging(false);
      applyPlacesRouteVisualOffset(0, true);
      return;
    }

    const delta = endX - startX;
    const elapsed = Math.max(1, performance.now() - placesRouteSwipeStartTimeRef.current);
    const velocity = delta / elapsed;
    const wantsNext = delta < 0 && activePlacesRouteIndex < placesRouteIds.length - 1;
    const wantsPrevious = delta > 0 && activePlacesRouteIndex > 0;
    const shouldChange = Math.abs(delta) >= 72 || Math.abs(velocity) >= .48;
    setPlacesRouteDragging(false);

    if (shouldChange && wantsNext) void movePlacesRoute(activePlacesRouteIndex + 1);
    else if (shouldChange && wantsPrevious) void movePlacesRoute(activePlacesRouteIndex - 1);
    else {
      setPlacesRouteSettling(true);
      applyPlacesRouteVisualOffset(0, true);
      placesRouteSettleTimerRef.current = window.setTimeout(() => {
        setPlacesRouteSettling(false);
        placesRouteSettleTimerRef.current = null;
      }, 260);
    }
  }

  useEffect(() => {
    if (alternateRoutes.length === 0) return;
    let cancelled = false;
    alternateRoutes.forEach((route) => {
      if (placesPlanningCacheRef.current.has(route.id)) return;
      void Promise.all([getRoutePhases(routeId, route.id), getRouteDestinations(routeId, route.id)])
        .then(([nextPhases, nextDestinations]) => {
          if (!cancelled) placesPlanningCacheRef.current.set(route.id, { phases: nextPhases, destinations: nextDestinations });
        })
        .catch(() => { /* 先読み失敗時は切替時に再取得する */ });
    });
    return () => { cancelled = true; };
  }, [routeId, alternateRoutes]);

  useEffect(() => () => {
    clearPlacesRouteSettleTimer();
    if (placesRouteRafRef.current !== null) window.cancelAnimationFrame(placesRouteRafRef.current);
  }, []);

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
        <section ref={placesRouteCarouselRef} className="places-route-carousel" aria-label="編集するRouteを選択" onTouchStart={handlePlacesRouteTouchStart} onTouchMove={handlePlacesRouteTouchMove} onTouchEnd={handlePlacesRouteTouchEnd} onTouchCancel={handlePlacesRouteTouchEnd}>
          <button type="button" className="places-route-arrow" onClick={() => void movePlacesRoute(activePlacesRouteIndex - 1)} disabled={activePlacesRouteIndex === 0} aria-label="前のRouteを見る">‹</button>
          <div className="places-route-carousel-title">
            <small>{placesRouteCategory}</small>
            <strong>{activePlacesRoute?.name ?? 'メインの予定'}</strong>
            <span>{activePlacesRouteIndex + 1} / {placesRouteIds.length}</span>
          </div>
          <button type="button" className="places-route-arrow" onClick={() => void movePlacesRoute(activePlacesRouteIndex + 1)} disabled={activePlacesRouteIndex >= placesRouteIds.length - 1} aria-label="次のRouteを見る">›</button>
          <div className="places-route-dots">{placesRouteIds.map((id,index)=><button type="button" key={id ?? 'main'} className={index===activePlacesRouteIndex?'is-active':''} onClick={()=>void movePlacesRoute(index)} aria-label={`${index+1}ページ目を見る`}/>)}</div>
        </section>
        <div ref={placesRouteContentRef} className="places-route-content-buffer"><div ref={placesRouteMotionRef} className={`places-route-motion is-${placesRouteDirection}`} key={`places-route-${placesRouteMotionId}`}>
        <div className="route-tab-heading places-compact-heading">
          <div>
            <p className="eyebrow">{activeBranchId ? 'SUB ROUTE' : 'PLACES'}</p>
            <h1 id="places-title">{activeBranchId ? (alternateRoutes.find((route) => route.id === activeBranchId)?.name ?? 'サブRoute') : '目的地'}</h1>
          </div>
          <button
            className="primary-button places-add-menu-button"
            type="button"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              closeDestinationSwipe();
              setAddMenuOpen(true);
            }}
          >＋ 追加</button>
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
                    <div className="places-phase-actions"><button className="phase-edit-button" type="button" onPointerDown={(event) => event.stopPropagation()} onClick={() => { closeDestinationSwipe(); openPhaseEdit(phase); }}>編集</button><button className="phase-add-place-button" type="button" onPointerDown={(event) => event.stopPropagation()} onClick={() => { closeDestinationSwipe(); openCreateModal(phase.id); }}>＋ 目的地</button></div>
                  </header>
                  {phaseDestinations.length === 0 ? (
                    <button className="phase-empty-add" type="button" onPointerDown={(event) => event.stopPropagation()} onClick={() => { closeDestinationSwipe(); openCreateModal(phase.id); }}>このPhaseに最初の目的地を追加</button>
                  ) : (
                    <div className="places-list">
                      {phaseDestinations.map((destination, index) => { const dragShift = getDestinationDragShift(index); return (
                        <div data-destination-interaction="true" className={`places-destination-swipe-shell${swipedDestinationId === destination.id ? ' is-open' : ''}`} key={destination.id} style={dragShift !== 0 ? { transform: `translateY(${dragShift}px)` } : undefined} onTouchStart={(event) => event.stopPropagation()} onTouchEnd={(event) => event.stopPropagation()}>
                          <button className="places-destination-swipe-delete" type="button" onPointerDown={(event) => event.stopPropagation()} onClick={() => requestDestinationDelete(destination)}>削除</button>
                          <article className={`place-card places-destination-swipe-panel${reorderingId === destination.id ? ' is-drag-placeholder' : ''}${dragShift !== 0 ? ' is-reorder-shifting' : ''}${reorderingId && reorderOverId === destination.id && reorderingId !== destination.id ? ' is-reorder-over' : ''}`} data-destination-id={destination.id} data-phase-id={phase.id} data-draggable={destination.timeType === 'none' ? 'true' : 'false'} style={{ transform: `translateX(${swipedDestinationId === destination.id ? destinationSwipeOffset : 0}px)` }} onPointerDown={(event) => handleDestinationPointerDown(event, destination.id)} onPointerMove={(event) => handleDestinationPointerMove(event, destination.id)} onPointerUp={(event) => handleDestinationPointerEnd(event, destination.id)} onPointerCancel={(event) => handleDestinationPointerEnd(event, destination.id)}>
                          <div className="place-order" aria-label={`${index + 1}番目`}>{index + 1}</div><div className="place-icon" aria-hidden="true">📍</div>
                          <div className="place-copy">
                            <div className="place-meta">
                              {destination.importance === 'must' ? <span className="place-required-mark" aria-label="必須" title="必須">★</span> : null}
                              {formatDestinationTime(destination) ? <span className={`place-time-badge ${destination.timeType === 'approx' ? 'is-approx' : 'is-fixed'}`}>{formatDestinationTime(destination)}</span> : null}
                            </div>
                            {destination.locationName ? <div className="place-location-line">{destination.locationName}</div> : null}
                            <h2>{destination.name}</h2>
                            <p>{destination.description ?? '説明はまだありません。'}</p>
                            {!activeBranchId && (mainConnectionsByDestination.get(destination.id)?.length ?? 0) > 0 ? (
                              <div className="place-route-connections">
                                {mainConnectionsByDestination.get(destination.id)?.map((connection) => (
                                  <button className={`place-route-connection is-${connection.kind}`} type="button" key={`${connection.route.id}-${connection.kind}`} onPointerDown={(event) => event.stopPropagation()} onClick={() => { const index = placesRouteIds.findIndex((id) => id === connection.route.id); if (index >= 0) void movePlacesRoute(index); }}>
                                    <span className="place-route-connection-mark" aria-hidden="true">{connection.kind === 'start' ? '↗' : '↘'}</span>
                                    <span><strong>{connection.label}</strong><small>{connection.detail}</small></span>
                                    <span className="place-route-connection-arrow" aria-hidden="true">›</span>
                                  </button>
                                ))}
                              </div>
                            ) : null}
                          </div>
                          <div className={`place-card-actions ${destination.timeType !== 'none' ? 'is-timed' : ''}`}><button className="place-edit-button" type="button" onPointerDown={(event) => event.stopPropagation()} onClick={() => { closeDestinationSwipe(); openEditModal(destination); }} disabled={Boolean(reorderingId) || reorderSaving}>編集</button>{destination.timeType === 'none' ? <button data-destination-interaction="true" data-destination-drag-handle="true" className="place-drag-handle" type="button" aria-label={`${destination.name}を長押しして並び替え`} disabled={reorderSaving || (Boolean(reorderingId) && reorderingId !== destination.id)} onPointerDown={(event) => beginDestinationDrag(event, destination.id, phase.id)} onPointerMove={moveDraggedDestination} onPointerUp={(event) => void finishDestinationDrag(event)} onPointerCancel={cancelDestinationDrag} onLostPointerCapture={handleLostDestinationPointerCapture}><span className="drag-dot-grid" aria-hidden="true"><i /><i /><i /><i /><i /><i /></span></button> : null}</div>
                          </article>
                        </div>
                      ); })}
                    </div>
                  )}
                </section>
              );
            })}
            {exceptionDestinations.length > 0 ? (
              <section className="places-phase-section exception-management">
                <header className="places-phase-header">
                  <div className="places-phase-copy">
                    <div className="places-phase-titleline"><h2>例外管理</h2><span className="exception-count">{exceptionDestinations.length}件</span></div>
                    <p>設定時刻とPhaseの時間帯が一致しない予定です。編集すると再判定されます。</p>
                  </div>
                </header>
                <div className="places-list">
                  {exceptionDestinations.map((destination, index) => (
                    <article className="place-card is-exception" key={destination.id}>
                      <div className="place-order">{index + 1}</div>
                      <div className="place-copy"><div className="place-meta">{destination.importance === 'must' ? <span className="place-required-mark" aria-label="必須" title="必須">★</span> : null}{formatDestinationTime(destination) ? <span className="place-time-badge is-exception-time">{formatDestinationTime(destination)}</span> : null}</div><h2>{destination.name}</h2><p>所属：{phases.find((phase) => phase.id === destination.phaseId)?.name || '名前未設定のPhase'}</p></div>
                      <div className="place-card-actions"><button className="place-edit-button" type="button" onPointerDown={(event) => event.stopPropagation()} onClick={() => { closeDestinationSwipe(); openEditModal(destination); }}>編集</button></div>
                    </article>
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        )}
        </div></div>
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

      {addMenuOpen && (
        <div
          className="modal-backdrop places-add-sheet-backdrop"
          role="presentation"
          onPointerDown={(event) => event.stopPropagation()}
          onMouseDown={(event) => { if (event.target === event.currentTarget) setAddMenuOpen(false); }}
        >
          <section className="places-add-sheet" role="dialog" aria-modal="true" aria-label="追加する項目を選択">
            <div className="places-add-sheet-handle" aria-hidden="true" />
            <button type="button" onClick={() => { setAddMenuOpen(false); openCreateModal(); }}>目的地を追加</button>
            <button type="button" onClick={() => { setAddMenuOpen(false); openPhaseCreate(); }}>Phaseを追加</button>
            {!activePlacesRoute ? (
              <button type="button" onClick={() => { setAddMenuOpen(false); openAlternateRouteCreate(); }}>別行動を追加</button>
            ) : (
              <button type="button" onClick={() => { setAddMenuOpen(false); openAlternateRouteEdit(activePlacesRoute); }}>接続設定を開く</button>
            )}
            <button className="is-cancel" type="button" onClick={() => setAddMenuOpen(false)}>キャンセル</button>
          </section>
        </div>
      )}

      {createOpen && (
        <div className="modal-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget) closeCreateModal();
        }}>
          <section className="route-modal place-scroll-modal" role="dialog" aria-modal="true" aria-labelledby="create-destination-title">
            <div className="modal-header">
              <div>
                <p className="eyebrow">NEW PLACE</p>
                <h2 id="create-destination-title">目的地を追加</h2>
              </div>
              <button className="modal-close-button" type="button" onClick={closeCreateModal} aria-label="閉じる" disabled={saving}>×</button>
            </div>

            <form className="route-create-form place-form place-scroll-form" onSubmit={handleCreate}>
              <div className="place-scroll-content">
              <div className="field-group compact-time-type">
                <span className="field-label">時間</span>
                <div className="time-type-segment" role="group" aria-label="時間">
                  <button className={`time-type-option ${timeType === 'none' ? 'is-active' : ''}`} type="button" onClick={() => { setTimeType('none'); setStartTime(''); setEndTime(''); setFormError(null); }} disabled={saving} aria-pressed={timeType === 'none'}>なし</button>
                  <button className={`time-type-option ${timeType === 'fixed' ? 'is-active' : ''}`} type="button" onClick={() => setTimeType('fixed')} disabled={saving} aria-pressed={timeType === 'fixed'}>確定</button>
                  <button className={`time-type-option ${timeType === 'approx' ? 'is-active' : ''}`} type="button" onClick={() => setTimeType('approx')} disabled={saving} aria-pressed={timeType === 'approx'}>目安</button>
                </div>
              </div>

              {timeType !== 'none' ? (
                <>
                  <div className="compact-time-range">
                    <span className="compact-time-label">時刻</span>
                    <div className="compact-time-point">
                      <span className="compact-time-caption">開始</span>
                      <select aria-label="開始時" value={timePart(startTime, 'hour')} onChange={(event) => setStartTime(updateTimePart(startTime, 'hour', event.target.value))} disabled={saving}>
                        <option value="">--</option>
                        {TIME_HOURS.map((hour) => <option value={hour} key={hour}>{hour}</option>)}
                      </select>
                      <span className="time-colon">:</span>
                      <select aria-label="開始分" value={timePart(startTime, 'minute')} onChange={(event) => setStartTime(updateTimePart(startTime, 'minute', event.target.value))} disabled={saving}>
                        <option value="">--</option>
                        {TIME_MINUTES.map((minute) => <option value={minute} key={minute}>{minute}</option>)}
                      </select>
                    </div>
                    <span className="compact-time-separator">〜</span>
                    <div className="compact-time-point">
                      <span className="compact-time-caption">終了</span>
                      <select aria-label="終了時" value={timePart(endTime, 'hour')} onChange={(event) => setEndTime(updateTimePart(endTime, 'hour', event.target.value))} disabled={saving}>
                        <option value="">--</option>
                        {TIME_HOURS.map((hour) => <option value={hour} key={hour}>{hour}</option>)}
                      </select>
                      <span className="time-colon">:</span>
                      <select aria-label="終了分" value={timePart(endTime, 'minute')} onChange={(event) => setEndTime(updateTimePart(endTime, 'minute', event.target.value))} disabled={saving}>
                        <option value="">--</option>
                        {TIME_MINUTES.map((minute) => <option value={minute} key={minute}>{minute}</option>)}
                      </select>
                    </div>
                    {endTime ? <button className="time-clear-mini" type="button" onClick={() => setEndTime('')} disabled={saving} aria-label="終了時刻を解除">×</button> : <span className="compact-time-optional">任意</span>}
                  </div>
                  <div className="auto-phase-preview">{startTime ? (()=>{const p=resolvePhaseForTime(phases,startTime); return p ? <>Phase：<strong>{p.name || '名前未設定のPhase'}</strong>へ自動配置</> : <>該当Phaseなし：<strong>例外管理</strong>に表示されます</>;})() : <>開始時刻を入れるとPhaseを自動判定します</>}</div>
                </>
              ) : <div className="field-group"><label htmlFor="destination-phase">Phase</label><select id="destination-phase" value={selectedPhaseId} onChange={(event) => setSelectedPhaseId(event.target.value)} disabled={saving}>{phases.map((phase) => <option value={phase.id} key={phase.id}>{phase.name || '名前未設定のPhase'}{phase.startTime ? ` (${phase.startTime.slice(0,5)}〜)` : ''}</option>)}</select></div>}

              <label className="required-toggle">
                <input type="checkbox" checked={importance === 'must'} onChange={(event) => setImportance(event.target.checked ? 'must' : 'optional')} disabled={saving} />
                <span className="required-toggle-mark" aria-hidden="true">★</span>
                <span>必須にする</span>
              </label>

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
                <label htmlFor="destination-description">メモ <span className="field-optional">任意</span></label>
                <textarea id="destination-description" value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="例：改札を出て右側に集合" maxLength={200} rows={3} disabled={saving} />
                <p className="field-hint">任意・200文字まで</p>
              </div>

              {formError && <p className="form-error" role="alert">{formError}</p>}

              <div className="modal-actions">
                <button className="secondary-button" type="button" onClick={closeCreateModal} disabled={saving}>キャンセル</button>
                <button className="primary-button" type="submit" disabled={!name.trim() || saving || (timeType !== 'none' && !startTime)}>
                  {saving ? '追加中…' : '追加'}
                </button>
              </div>
              </div>
            </form>
          </section>
        </div>
      )}

      {editing && (
        <div className="modal-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget) closeEditModal();
        }}>
          <section className="route-modal edit-place-modal place-scroll-modal" role="dialog" aria-modal="true" aria-labelledby="edit-destination-title">
            <div className="modal-header">
              <div>
                <p className="eyebrow">EDIT PLACE</p>
                <h2 id="edit-destination-title">目的地を編集</h2>
              </div>
              <button className="modal-close-button" type="button" onClick={closeEditModal} aria-label="閉じる" disabled={editSaving}>×</button>
            </div>

            <form className="route-create-form place-form place-scroll-form" onSubmit={handleEdit}>
              <div className="place-scroll-content">
              <div className="field-group compact-time-type">
                <span className="field-label">時間</span>
                <div className="time-type-segment" role="group" aria-label="時間">
                  <button className={`time-type-option ${editTimeType === 'none' ? 'is-active' : ''}`} type="button" onClick={() => { setEditTimeType('none'); setEditStartTime(''); setEditEndTime(''); setEditError(null); }} disabled={editSaving} aria-pressed={editTimeType === 'none'}>なし</button>
                  <button className={`time-type-option ${editTimeType === 'fixed' ? 'is-active' : ''}`} type="button" onClick={() => setEditTimeType('fixed')} disabled={editSaving} aria-pressed={editTimeType === 'fixed'}>確定</button>
                  <button className={`time-type-option ${editTimeType === 'approx' ? 'is-active' : ''}`} type="button" onClick={() => setEditTimeType('approx')} disabled={editSaving} aria-pressed={editTimeType === 'approx'}>目安</button>
                </div>
              </div>

              {editTimeType !== 'none' ? (
                <>
                  <div className="compact-time-range">
                    <span className="compact-time-label">時刻</span>
                    <div className="compact-time-point">
                      <span className="compact-time-caption">開始</span>
                      <select aria-label="開始時" value={timePart(editStartTime, 'hour')} onChange={(event) => setEditStartTime(updateTimePart(editStartTime, 'hour', event.target.value))} disabled={editSaving}>
                        <option value="">--</option>
                        {TIME_HOURS.map((hour) => <option value={hour} key={hour}>{hour}</option>)}
                      </select>
                      <span className="time-colon">:</span>
                      <select aria-label="開始分" value={timePart(editStartTime, 'minute')} onChange={(event) => setEditStartTime(updateTimePart(editStartTime, 'minute', event.target.value))} disabled={editSaving}>
                        <option value="">--</option>
                        {TIME_MINUTES.map((minute) => <option value={minute} key={minute}>{minute}</option>)}
                      </select>
                    </div>
                    <span className="compact-time-separator">〜</span>
                    <div className="compact-time-point">
                      <span className="compact-time-caption">終了</span>
                      <select aria-label="終了時" value={timePart(editEndTime, 'hour')} onChange={(event) => setEditEndTime(updateTimePart(editEndTime, 'hour', event.target.value))} disabled={editSaving}>
                        <option value="">--</option>
                        {TIME_HOURS.map((hour) => <option value={hour} key={hour}>{hour}</option>)}
                      </select>
                      <span className="time-colon">:</span>
                      <select aria-label="終了分" value={timePart(editEndTime, 'minute')} onChange={(event) => setEditEndTime(updateTimePart(editEndTime, 'minute', event.target.value))} disabled={editSaving}>
                        <option value="">--</option>
                        {TIME_MINUTES.map((minute) => <option value={minute} key={minute}>{minute}</option>)}
                      </select>
                    </div>
                    {editEndTime ? <button className="time-clear-mini" type="button" onClick={() => setEditEndTime('')} disabled={editSaving} aria-label="終了時刻を解除">×</button> : <span className="compact-time-optional">任意</span>}
                  </div>
                  <div className="auto-phase-preview">{editStartTime ? (()=>{const p=resolvePhaseForTime(phases,editStartTime); return p ? <>Phase：<strong>{p.name || '名前未設定のPhase'}</strong>へ自動配置</> : <>該当Phaseなし：<strong>例外管理</strong>に表示されます</>;})() : <>開始時刻を入れるとPhaseを自動判定します</>}</div>
                </>
              ) : <div className="field-group"><label htmlFor="edit-destination-phase">Phase</label><select id="edit-destination-phase" value={editPhaseId} onChange={(event) => setEditPhaseId(event.target.value)} disabled={editSaving}>{phases.map((phase) => <option value={phase.id} key={phase.id}>{phase.name || '名前未設定のPhase'}{phase.startTime ? ` (${phase.startTime.slice(0,5)}〜)` : ''}</option>)}</select></div>}

              <label className="required-toggle">
                <input type="checkbox" checked={editImportance === 'must'} onChange={(event) => setEditImportance(event.target.checked ? 'must' : 'optional')} disabled={editSaving} />
                <span className="required-toggle-mark" aria-hidden="true">★</span>
                <span>必須にする</span>
              </label>

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
                <label htmlFor="edit-destination-description">メモ <span className="field-optional">任意</span></label>
                <textarea id="edit-destination-description" value={editDescription}
                  onChange={(event) => setEditDescription(event.target.value)}
                  maxLength={200} rows={2} disabled={editSaving} />
                <p className="field-hint">任意・200文字まで</p>
              </div>

              {editError && <p className="form-error" role="alert">{editError}</p>}

              <div className="modal-actions edit-place-actions">
                <button className="primary-button" type="submit" disabled={!editName.trim() || editSaving || (editTimeType !== 'none' && !editStartTime)}>
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
              </div>
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

      {alternateRouteOpen && (
        <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) closeAlternateRouteModal(); }}>
          <section className="route-modal alternate-route-modal" role="dialog" aria-modal="true" aria-labelledby="alternate-route-title">
            <div className="modal-header"><div><p className="eyebrow">別行動の設定</p><h2 id="alternate-route-title">{alternateRouteEditing ? '別行動を編集' : '別行動を追加'}</h2></div><button className="modal-close-button" type="button" onClick={closeAlternateRouteModal} disabled={alternateRouteSaving || alternateRouteDeleting}>×</button></div>
            <form className="route-create-form place-form" onSubmit={handleAlternateRouteSave}>
              <div className="field-group"><label htmlFor="alternate-route-name">別行動の名前</label><input id="alternate-route-name" value={alternateRouteName} onChange={(event) => setAlternateRouteName(event.target.value)} placeholder="例：午後から合流組" maxLength={40} disabled={alternateRouteSaving || alternateRouteDeleting} /></div>
              <fieldset className="alternate-route-type-field"><legend>接続方法</legend>
                <label className={alternateRouteType === 'split_merge' ? 'is-selected' : ''}><input type="radio" name="alternate-route-type" value="split_merge" checked={alternateRouteType === 'split_merge'} onChange={() => { setAlternateRouteType('split_merge'); setAlternateRouteError(null); }} /><strong>途中で別れて、あとで合流</strong><small>メインの予定から別行動を始め、あとで戻ります</small></label>
                <label className={alternateRouteType === 'join' ? 'is-selected' : ''}><input type="radio" name="alternate-route-type" value="join" checked={alternateRouteType === 'join'} onChange={() => { setAlternateRouteType('join'); setAlternateRouteStartId(''); setAlternateRouteError(null); }} /><strong>別行動から途中で合流</strong><small>別の場所から行動を始め、途中で合流します</small></label>
                <label className={alternateRouteType === 'leave' ? 'is-selected' : ''}><input type="radio" name="alternate-route-type" value="leave" checked={alternateRouteType === 'leave'} onChange={() => { setAlternateRouteType('leave'); setAlternateRouteEndId(''); setAlternateRouteError(null); }} /><strong>途中で別れて、そのまま終了</strong><small>メインの予定から離れ、その後は合流しません</small></label>
              </fieldset>
              {alternateRouteType !== 'join' ? <div className="field-group"><label htmlFor="alternate-route-start">{alternateRouteType === 'leave' ? '途中で離れる場所' : '別行動を始める場所'}</label><select id="alternate-route-start" value={alternateRouteStartId} onChange={(event) => setAlternateRouteStartId(event.target.value)} disabled={alternateRouteSaving || alternateRouteDeleting}><option value="">メインの予定から選択</option>{timedDestinations.map((destination) => <option key={destination.id} value={destination.id}>{destinationLabel(destination.id)}</option>)}</select></div> : null}
              {alternateRouteType !== 'leave' ? <div className="field-group"><label htmlFor="alternate-route-end">合流する場所</label><select id="alternate-route-end" value={alternateRouteEndId} onChange={(event) => setAlternateRouteEndId(event.target.value)} disabled={alternateRouteSaving || alternateRouteDeleting}><option value="">メインの予定から選択</option>{timedDestinations.map((destination) => <option key={destination.id} value={destination.id}>{destinationLabel(destination.id)}</option>)}</select></div> : null}
              {timedDestinations.length === 0 ? <p className="form-error">接続先に使える予定がありません。先にメインの予定へ時間を設定してください。</p> : null}
              <div className="field-group"><label htmlFor="alternate-route-description">説明 <span className="field-optional">任意</span></label><textarea id="alternate-route-description" value={alternateRouteDescription} onChange={(event) => setAlternateRouteDescription(event.target.value)} maxLength={200} rows={3} disabled={alternateRouteSaving || alternateRouteDeleting} /></div>
              <section className="alternate-route-member-editor" aria-labelledby="alternate-route-members-title">
                <div className="alternate-route-member-heading"><div><strong id="alternate-route-members-title">この別行動に参加する人</strong><small>{alternateRouteSelectedMemberIds.length}人を選択中</small></div></div>
                {alternateRouteMembersLoading ? <p className="route-tab-demo-note">参加メンバーを読み込んでいます。</p> : alternateRouteMembers.length ? (
                  <div className="alternate-route-member-list">{alternateRouteMembers.map((member) => {
                    const selected = alternateRouteSelectedMemberIds.includes(member.userId);
                    const currentAssignment = alternateRouteAssignments.find((assignment) => assignment.memberUserId === member.userId);
                    const assignedElsewhere = currentAssignment && currentAssignment.branchId !== alternateRouteEditing?.id;
                    return <label className={`alternate-route-member-option${selected ? ' is-selected' : ''}`} key={member.id}>
                      <input type="checkbox" checked={selected} onChange={() => toggleAlternateRouteMember(member.userId)} disabled={alternateRouteSaving || alternateRouteDeleting} />
                      <span className="alternate-route-member-avatar" aria-hidden="true">{member.displayName.slice(0, 2).toUpperCase()}</span>
                      <span><strong>{member.displayName}</strong><small>{member.role === 'owner' ? 'リーダー' : assignedElsewhere ? '別の別行動に設定中' : '参加メンバー'}</small></span>
                      <span className="alternate-route-member-check" aria-hidden="true">{selected ? '✓' : ''}</span>
                    </label>;
                  })}</div>
                ) : <p className="route-tab-demo-note">参加中のメンバーはいません。先にMembersから招待・参加登録を行ってください。</p>}
                <p className="field-hint">別の別行動に設定中の人を選ぶと、所属先はこちらへ移ります。メンバーは後から変更できます。</p>
              </section>
              {alternateRouteEditing ? <section className="alternate-destination-editor"><div className="alternate-destination-heading"><div><strong>この別行動の予定</strong><small>{alternateRouteDestinations.length}件</small></div><button type="button" className="secondary-button" onClick={startAlternateDestinationCreate}>＋予定</button></div>
                <div className="alternate-destination-list">{alternateRouteDestinations.map(item=><div className="alternate-destination-row" key={item.id}><button type="button" onClick={()=>startAlternateDestinationEdit(item)}><strong>{item.startTime ? `${item.startTime} ` : ''}{item.name}</strong><small>{item.locationName || '場所未設定'}</small></button><button type="button" className="alternate-destination-delete" onClick={()=>void handleAlternateDestinationDelete(item)}>削除</button></div>)}</div>
                <div className="alternate-destination-form"><input value={alternateDestinationName} onChange={e=>setAlternateDestinationName(e.target.value)} placeholder="予定名" maxLength={40}/><input value={alternateDestinationLocation} onChange={e=>setAlternateDestinationLocation(e.target.value)} placeholder="場所（任意）" maxLength={80}/><select value={alternateDestinationTimeType} onChange={e=>setAlternateDestinationTimeType(e.target.value as 'none'|'fixed'|'approx')}><option value="none">時間なし</option><option value="fixed">時間を指定</option><option value="approx">目安時間</option></select>{alternateDestinationTimeType!=='none'?<div className="alternate-destination-times"><input type="time" step="300" value={alternateDestinationStart} onChange={e=>setAlternateDestinationStart(e.target.value)}/><input type="time" step="300" value={alternateDestinationEnd} onChange={e=>setAlternateDestinationEnd(e.target.value)}/></div>:null}<textarea value={alternateDestinationDescription} onChange={e=>setAlternateDestinationDescription(e.target.value)} placeholder="メモ（任意）" maxLength={200} rows={2}/><button type="button" className="primary-button" disabled={!alternateDestinationName.trim()||alternateDestinationSaving} onClick={()=>void handleAlternateDestinationSave()}>{alternateDestinationSaving?'保存中…':alternateDestinationEditing?'予定を更新':'予定を追加'}</button></div>
              </section> : <p className="route-tab-demo-note">別行動を一度保存すると、その中の予定を追加できます。</p>}
              {alternateRouteError ? <p className="form-error" role="alert">{alternateRouteError}</p> : null}
              <div className="modal-actions"><button className="secondary-button" type="button" onClick={closeAlternateRouteModal} disabled={alternateRouteSaving || alternateRouteDeleting}>キャンセル</button><button className="primary-button" type="submit" disabled={alternateRouteSaving || alternateRouteDeleting || !alternateRouteName.trim() || timedDestinations.length === 0}>{alternateRouteSaving ? '保存中…' : alternateRouteEditing ? '保存' : '追加'}</button></div>
              {alternateRouteEditing ? <button className="alternate-route-delete-button" type="button" onClick={() => void handleAlternateRouteDelete()} disabled={alternateRouteSaving || alternateRouteDeleting}>{alternateRouteDeleting ? '削除中…' : 'この別行動を削除'}</button> : null}
            </form>
          </section>
        </div>
      )}

      {(phaseCreateOpen || phaseEditing) && (
        <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !phaseSaving) { setPhaseCreateOpen(false); setPhaseEditing(null); } }}>
          <section className="route-modal phase-edit-modal phase-centered-modal" role="dialog" aria-modal="true">
            <div className="modal-header"><div><p className="eyebrow">{phaseEditing ? 'EDIT PHASE' : 'NEW PHASE'}</p><h2>{phaseEditing ? 'Phaseを編集' : 'Phaseを追加'}</h2></div><button className="modal-close-button" type="button" disabled={phaseSaving} onClick={() => { setPhaseCreateOpen(false); setPhaseEditing(null); }}>×</button></div>
            <form className="route-create-form place-form" onSubmit={phaseEditing ? handlePhaseEdit : handlePhaseCreate}>
              <div className="field-group"><label htmlFor="phase-name">Phase名 {phaseEditing?.isDefault && <span className="field-optional">空欄可</span>}</label><input id="phase-name" value={phaseName} onChange={(event) => setPhaseName(event.target.value)} placeholder="例：午前" maxLength={40} disabled={phaseSaving} /></div>
              <div className="field-group">
                <label htmlFor="phase-start-time">開始時間 <span className="field-optional">任意</span></label>
                <div className="phase-time-control">
                  <div className="time-select-row">
                  <select aria-label="Phase開始時" value={timePart(phaseStartTime, 'hour')} onChange={(event) => setPhaseStartTime(updateTimePart(phaseStartTime, 'hour', event.target.value))} disabled={phaseSaving}><option value="">時</option>{TIME_HOURS.map((hour) => <option value={hour} key={hour}>{hour}</option>)}</select>
                  <span className="time-colon">:</span>
                  <select aria-label="Phase開始分" value={timePart(phaseStartTime, 'minute')} onChange={(event) => setPhaseStartTime(updateTimePart(phaseStartTime, 'minute', event.target.value))} disabled={phaseSaving}><option value="">分</option>{TIME_MINUTES.map((minute) => <option value={minute} key={minute}>{minute}</option>)}</select>
                </div>
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
