import { useEffect, useMemo, useRef, useState, type TouchEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BrandMark } from '../../shared/ui/BrandMark';
import { RefreshButton } from '../../shared/ui/RefreshButton';
import { VersionBadge } from '../../shared/ui/VersionBadge';
import { getRoute, type RouteSummary } from './routes';
import { getRoutePhases, type PhaseSummary } from './phases';
import { getRouteDestinations, setRouteDestinationCompleted, type DestinationSummary } from './destinations';
import { getSupabaseClient } from '../../shared/api/supabase';
import { RouteBottomNav } from './RouteBottomNav';
import { formatChatTime, getLatestRouteChatMessages, type RouteChatMessage } from './chat';
import { getOwnRouteMember, type RouteMember } from './members';
import {
  listRouteBranches,
  listAlternateRouteDestinations,
  type RouteBranch,
  type AlternateRouteDestination,
} from './branches';

function timeToMinutes(value: string | null | undefined): number | null {
  if (!value) return null;
  const [hours, minutes] = value.slice(0, 5).split(':').map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return hours * 60 + minutes;
}

function getCurrentPhase(phases: PhaseSummary[], currentMinutes: number): PhaseSummary | null {
  if (!phases.length) return null;

  const timedPhases = phases
    .filter((phase) => timeToMinutes(phase.startTime) !== null)
    .slice()
    .sort((a, b) => {
      const byTime = (timeToMinutes(a.startTime) ?? 0) - (timeToMinutes(b.startTime) ?? 0);
      return byTime !== 0 ? byTime : a.orderValue - b.orderValue;
    });

  const orderedPhases = phases.slice().sort((a, b) => a.orderValue - b.orderValue);
  if (!timedPhases.length) return orderedPhases[0] ?? null;

  const started = timedPhases.filter((phase) => (timeToMinutes(phase.startTime) ?? 0) <= currentMinutes);
  return started[started.length - 1] ?? orderedPhases[0] ?? timedPhases[0];
}

function formatDestinationTime(destination: DestinationSummary): string | null {
  if (destination.timeType === 'none' || !destination.startTime) return null;
  const start = destination.startTime.slice(0, 5);
  const end = destination.endTime?.slice(0, 5);
  const range = end ? `${start}〜${end}` : start;
  return destination.timeType === 'approx' ? `目安 ${range}` : range;
}

function getDestinationTimeStatus(destination: DestinationSummary, currentMinutes: number) {
  if (destination.completedAt || destination.timeType === 'none' || !destination.startTime) return null;
  const startMinutes = timeToMinutes(destination.startTime);
  if (startMinutes === null) return null;
  if (startMinutes > currentMinutes) return { key: 'upcoming', label: '予定前' } as const;
  if (startMinutes === currentMinutes) return { key: 'now', label: '今の予定' } as const;
  return { key: 'overdue', label: '予定超過' } as const;
}

function getDestinationNote(destination: DestinationSummary): string | null {
  if (destination.description) return destination.description;
  if (destination.locationName) return destination.locationName;
  return null;
}

function getDestinationMapUrl(destination: DestinationSummary): string | null {
  if (destination.mapUrl) return destination.mapUrl;
  const query = destination.locationName?.trim();
  if (!query) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function getDestinationDirectionsUrl(
  destination: DestinationSummary,
  travelMode: 'driving' | 'walking' | 'transit'
): string | null {
  const destinationQuery = destination.locationName?.trim();
  if (!destinationQuery) return null;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destinationQuery)}&travelmode=${travelMode}`;
}


function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function PhaseDashboard({ routeId, participantView }: { routeId: string; participantView: boolean }) {
  const [phases, setPhases] = useState<PhaseSummary[]>([]);
  const [destinations, setDestinations] = useState<DestinationSummary[]>([]);
  const [planningLoading, setPlanningLoading] = useState(true);
  const [planningError, setPlanningError] = useState<string | null>(null);
  const [currentMinutes, setCurrentMinutes] = useState(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  });
  const [activeIndex, setActiveIndex] = useState(0);
  const [progressSavingId, setProgressSavingId] = useState<string | null>(null);
  const [travelMode, setTravelMode] = useState<'driving' | 'walking' | 'transit'>('walking');
  const [progressError, setProgressError] = useState<string | null>(null);
  const [viewPhaseId, setViewPhaseId] = useState<string | null>(null);
  const [latestChats, setLatestChats] = useState<RouteChatMessage[]>([]);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [alternateRoutes, setAlternateRoutes] = useState<RouteBranch[]>([]);
  const [alternateDestinations, setAlternateDestinations] = useState<Record<string, AlternateRouteDestination[]>>({});
  const [alternateLoading, setAlternateLoading] = useState(true);
  const [alternateError, setAlternateError] = useState<string | null>(null);
  const [routePageIndex, setRoutePageIndex] = useState(0);
  const [routePageDirection, setRoutePageDirection] = useState<'next' | 'previous'>('next');
  const [routePageAnimationId, setRoutePageAnimationId] = useState(0);
  const [routeDragX, setRouteDragX] = useState(0);
  const [routeDragging, setRouteDragging] = useState(false);
  const [routeSettling, setRouteSettling] = useState(false);
  const routeSwipeStartX = useRef<number | null>(null);
  const routeSwipeStartY = useRef<number | null>(null);
  const routeSwipeStartTime = useRef(0);
  const routeSwipeTimer = useRef<number | null>(null);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    const channel = supabase
      .channel(`route-destination-progress:${routeId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'destinations', filter: `route_id=eq.${routeId}` },
        (payload) => {
          const row = payload.new as { id?: string; completed_at?: string | null; completed_by?: string | null };
          if (!row.id) return;
          setDestinations((current) => current.map((item) => item.id === row.id
            ? { ...item, completedAt: row.completed_at ?? null, completedBy: row.completed_by ?? null }
            : item));
        }
      )
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [routeId]);

  useEffect(() => {
    let active = true;
    setPlanningLoading(true);
    setPlanningError(null);

    void Promise.all([getRoutePhases(routeId), getRouteDestinations(routeId)])
      .then(([nextPhases, nextDestinations]) => {
        if (!active) return;
        setPhases(nextPhases);
        setDestinations(nextDestinations);
      })
      .catch((error) => {
        if (active) setPlanningError(getErrorMessage(error, 'Planningを読み込めませんでした。'));
      })
      .finally(() => {
        if (active) setPlanningLoading(false);
      });

    return () => { active = false; };
  }, [routeId]);

  useEffect(() => {
    let active = true;
    void getLatestRouteChatMessages(routeId, 3)
      .then((messages) => { if (active) setLatestChats(messages); })
      .catch(() => { if (active) setLatestChats([]); });
    return () => { active = false; };
  }, [routeId]);

  useEffect(() => {
    let active = true;
    setAlternateLoading(true);
    setAlternateError(null);
    void listRouteBranches(routeId)
      .then(async (routes) => {
        const configured = routes.filter((item) => item.connectionType);
        const pairs = await Promise.all(configured.map(async (item) => [
          item.id,
          await listAlternateRouteDestinations(item.id),
        ] as const));
        if (!active) return;
        setAlternateRoutes(configured);
        setAlternateDestinations(Object.fromEntries(pairs));
        setRoutePageIndex((current) => Math.min(current, configured.length));
      })
      .catch((error) => {
        if (!active) return;
        setAlternateRoutes([]);
        setAlternateDestinations({});
        setAlternateError(getErrorMessage(error, '別行動を読み込めませんでした。'));
      })
      .finally(() => {
        if (active) setAlternateLoading(false);
      });
    return () => { active = false; };
  }, [routeId]);

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentMinutes(now.getHours() * 60 + now.getMinutes());
    };
    const timer = window.setInterval(updateClock, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const autoCurrentPhase = useMemo(
    () => getCurrentPhase(phases, currentMinutes),
    [phases, currentMinutes]
  );

  const currentPhase = useMemo(
    () => viewPhaseId ? phases.find((phase) => phase.id === viewPhaseId) ?? autoCurrentPhase : autoCurrentPhase,
    [autoCurrentPhase, phases, viewPhaseId]
  );

  const currentPhaseIndex = currentPhase ? phases.findIndex((phase) => phase.id === currentPhase.id) : -1;
  const isManualPhase = Boolean(viewPhaseId && currentPhase?.id !== autoCurrentPhase?.id);
  const showPreviousPhase = () => {
    if (currentPhaseIndex > 0) setViewPhaseId(phases[currentPhaseIndex - 1].id);
  };
  const showNextPhase = () => {
    if (currentPhaseIndex >= 0 && currentPhaseIndex < phases.length - 1) setViewPhaseId(phases[currentPhaseIndex + 1].id);
  };

  const currentDestinations = useMemo(
    () => currentPhase
      ? destinations
          .filter((destination) => destination.phaseId === currentPhase.id)
          .slice()
          .sort((a, b) => a.orderValue - b.orderValue)
      : [],
    [currentPhase, destinations]
  );

const completedCount = useMemo(
  () => currentDestinations.filter((destination) => Boolean(destination.completedAt)).length,
  [currentDestinations]
);

  const priorityDestination = useMemo(() => {
    const incomplete = currentDestinations.filter((destination) => !destination.completedAt);
    if (!incomplete.length) return null;

    const timed = incomplete
      .filter((destination) => destination.timeType !== 'none' && destination.startTime)
      .slice()
      .sort((a, b) => {
        const aMinutes = timeToMinutes(a.startTime) ?? Number.POSITIVE_INFINITY;
        const bMinutes = timeToMinutes(b.startTime) ?? Number.POSITIVE_INFINITY;
        return aMinutes - bMinutes || a.orderValue - b.orderValue;
      });

    if (timed.length) {
      const due = timed.filter(
        (destination) => (timeToMinutes(destination.startTime) ?? Number.POSITIVE_INFINITY) <= currentMinutes
      );
      return due[0] ?? timed[0];
    }

    return incomplete.slice().sort((a, b) => a.orderValue - b.orderValue)[0] ?? null;
  }, [currentDestinations, currentMinutes]);

  const todayModel = useMemo(() => {
    const incomplete = currentDestinations.filter((d) => !d.completedAt);
    const nextTimed = destinations.filter((d) => !d.completedAt && d.timeType !== 'none' && d.startTime).map((destination) => ({ destination, minutes: timeToMinutes(destination.startTime) })).filter((item): item is { destination: DestinationSummary; minutes: number } => item.minutes !== null && item.minutes >= currentMinutes).sort((a,b) => a.minutes-b.minutes || a.destination.orderValue-b.destination.orderValue)[0]?.destination ?? null;
    const exceptionTasks = destinations.filter((d) => {
      if (d.completedAt || d.timeType === 'none' || !d.startTime) return false;
      const task=timeToMinutes(d.startTime), phase=phases.find((p)=>p.id===d.phaseId), start=timeToMinutes(phase?.startTime);
      if (task===null || start===null) return false;
      const next=phases.filter((p)=>p.id!==phase?.id).map((p)=>timeToMinutes(p.startTime)).filter((v): v is number => v!==null && v>start).sort((a,b)=>a-b)[0];
      return task<start || (next!==undefined && task>=next);
    }).sort((a,b)=>(timeToMinutes(a.startTime)??9999)-(timeToMinutes(b.startTime)??9999));
    const overdueTasks = destinations
      .filter((destination) => getDestinationTimeStatus(destination, currentMinutes)?.key === 'overdue')
      .sort((a,b)=>(timeToMinutes(a.startTime)??9999)-(timeToMinutes(b.startTime)??9999));
    return { incomplete, nextTimed, exceptionTasks, overdueTasks };
  }, [currentDestinations, currentMinutes, destinations, phases]);

  const participantSteps = useMemo(() => {
    const phaseOrder = new Map(phases.map((phase, index) => [phase.id, index]));
    const ordered = destinations
      .filter((destination) => !destination.completedAt)
      .slice()
      .sort((a, b) => {
        const phaseDiff = (phaseOrder.get(a.phaseId) ?? Number.MAX_SAFE_INTEGER) - (phaseOrder.get(b.phaseId) ?? Number.MAX_SAFE_INTEGER);
        if (phaseDiff !== 0) return phaseDiff;
        const aTime = timeToMinutes(a.startTime) ?? Number.MAX_SAFE_INTEGER;
        const bTime = timeToMinutes(b.startTime) ?? Number.MAX_SAFE_INTEGER;
        return aTime - bTime || a.orderValue - b.orderValue;
      });

    const currentIndex = priorityDestination ? Math.max(0, ordered.findIndex((item) => item.id === priorityDestination.id)) : 0;
    const startIndex = currentIndex >= 0 ? currentIndex : 0;
    return ordered.slice(startIndex, startIndex + 3);
  }, [destinations, phases, priorityDestination]);

  const participantStepLabels = ['現在', '次', 'その次'] as const;

const toggleDestinationCompleted = async (destination: DestinationSummary) => {
  if (progressSavingId) return;

  const nextCompleted = !destination.completedAt;
  setProgressSavingId(destination.id);
  setProgressError(null);

  setDestinations((current) =>
    current.map((item) =>
      item.id === destination.id
        ? { ...item, completedAt: nextCompleted ? new Date().toISOString() : null, completedBy: null }
        : item
    )
  );

  try {
    const saved = await setRouteDestinationCompleted(routeId, destination.id, nextCompleted);
    setDestinations((current) =>
      current.map((item) => item.id === saved.id ? saved : item)
    );
  } catch (error) {
    setDestinations((current) =>
      current.map((item) => item.id === destination.id ? destination : item)
    );
    setProgressError(getErrorMessage(error, '完了状態を保存できませんでした。'));
  } finally {
    setProgressSavingId(null);
  }
};


  useEffect(() => {
    const priorityIndex = priorityDestination
      ? currentDestinations.findIndex((destination) => destination.id === priorityDestination.id)
      : 0;
    const nextIndex = Math.max(0, priorityIndex);

    setActiveIndex(nextIndex);

    window.requestAnimationFrame(() => {
      const scroller = scrollerRef.current;
      if (!scroller) return;
      const card = scroller.querySelector<HTMLElement>(`[data-destination-index="${nextIndex}"]`);
      if (card) card.scrollIntoView({ behavior: 'auto', block: 'nearest', inline: 'center' });
      else scroller.scrollTo({ left: 0, behavior: 'auto' });
    });
  }, [currentPhase?.id, priorityDestination?.id]);

  const scrollToIndex = (nextIndex: number) => {
    if (!currentDestinations.length) return;
    const bounded = Math.max(0, Math.min(nextIndex, currentDestinations.length - 1));
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const card = scroller.querySelector<HTMLElement>(`[data-destination-index="${bounded}"]`);
    card?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  };

  const onScroll = () => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const cards = Array.from(scroller.querySelectorAll<HTMLElement>('[data-destination-index]'));
    const center = scroller.scrollLeft + scroller.clientWidth / 2;
    let nearest = 0;
    let nearestDistance = Number.POSITIVE_INFINITY;
    cards.forEach((card, index) => {
      const cardCenter = card.offsetLeft + card.offsetWidth / 2;
      const distance = Math.abs(cardCenter - center);
      if (distance < nearestDistance) {
        nearest = index;
        nearestDistance = distance;
      }
    });
    setActiveIndex(nearest);
  };

  if (planningLoading) {
    return (
      <article className="v2-phase-panel v2-phase-state" aria-live="polite">
        <p className="eyebrow">CURRENT PHASE</p>
        <h2>Planningを読み込んでいます</h2>
      </article>
    );
  }

  if (planningError) {
    return (
      <article className="v2-phase-panel v2-phase-state" role="alert">
        <p className="eyebrow">CURRENT PHASE</p>
        <h2>Phaseを表示できませんでした</h2>
        <p>{planningError}</p>
        <Link className="v2-text-link" to={`/routes/${routeId}/places`}>Placesを確認 ›</Link>
      </article>
    );
  }

  const routePageCount = alternateRoutes.length + 1;
  const activeAlternateRoute = routePageIndex > 0 ? alternateRoutes[routePageIndex - 1] ?? null : null;
  const activeAlternateDestinations = activeAlternateRoute
    ? alternateDestinations[activeAlternateRoute.id] ?? []
    : [];

  const destinationLabelById = (destinationId: string | null) => {
    if (!destinationId) return null;
    const destination = destinations.find((item) => item.id === destinationId);
    if (!destination) return null;
    const time = destination.startTime?.slice(0, 5);
    return `${time ? `${time} ` : ''}${destination.name}`;
  };

  const alternateTypeLabel = (type: RouteBranch['connectionType']) => {
    if (type === 'split_merge') return '途中で別れて、あとで合流';
    if (type === 'join') return '別行動から途中で合流';
    if (type === 'leave') return '途中で別れて、そのまま終了';
    return '別行動';
  };
  const alternateRouteCategory = (type: RouteBranch['connectionType']) => {
    if (type === 'split_merge') return '分岐Route';
    if (type === 'join') return '合流Route';
    if (type === 'leave') return '離脱Route';
    return '別行動Route';
  };

  const moveToRoutePage = (nextIndex: number) => {
    const boundedIndex = Math.max(0, Math.min(routePageCount - 1, nextIndex));
    if (boundedIndex === routePageIndex || routeSettling) return;
    setRoutePageDirection(boundedIndex > routePageIndex ? 'next' : 'previous');
    setRoutePageIndex(boundedIndex);
    setRoutePageAnimationId((current) => current + 1);
  };
  const showNextRoutePage = () => moveToRoutePage(routePageIndex + 1);
  const showPreviousRoutePage = () => moveToRoutePage(routePageIndex - 1);

  const clearRouteSwipeTimer = () => {
    if (routeSwipeTimer.current !== null) {
      window.clearTimeout(routeSwipeTimer.current);
      routeSwipeTimer.current = null;
    }
  };

  const settleRoutePage = (targetIndex: number, direction: 'next' | 'previous') => {
    clearRouteSwipeTimer();
    const width = Math.max(window.innerWidth, 320);
    setRouteDragging(false);
    setRouteSettling(true);
    setRoutePageDirection(direction);
    setRouteDragX(direction === 'next' ? -width : width);
    routeSwipeTimer.current = window.setTimeout(() => {
      setRoutePageIndex(targetIndex);
      setRoutePageAnimationId((current) => current + 1);
      setRouteSettling(false);
      setRouteDragX(direction === 'next' ? width * 0.22 : -width * 0.22);
      requestAnimationFrame(() => requestAnimationFrame(() => setRouteDragX(0)));
      routeSwipeTimer.current = window.setTimeout(() => {
        setRouteSettling(false);
        routeSwipeTimer.current = null;
      }, 280);
    }, 190);
  };

  const onRouteSwipeStart = (event: TouchEvent<HTMLElement>) => {
    if (routeSettling) return;
    clearRouteSwipeTimer();
    routeSwipeStartX.current = event.touches[0]?.clientX ?? null;
    routeSwipeStartY.current = event.touches[0]?.clientY ?? null;
    routeSwipeStartTime.current = performance.now();
    setRouteDragging(true);
    setRouteDragX(0);
  };
  const onRouteSwipeMove = (event: TouchEvent<HTMLElement>) => {
    const startX = routeSwipeStartX.current;
    const startY = routeSwipeStartY.current;
    const touch = event.touches[0];
    if (startX === null || startY === null || !touch || routeSettling) return;
    const deltaX = touch.clientX - startX;
    const deltaY = touch.clientY - startY;
    if (Math.abs(deltaX) <= Math.abs(deltaY)) return;
    event.preventDefault();
    const atFirst = routePageIndex === 0 && deltaX > 0;
    const atLast = routePageIndex === routePageCount - 1 && deltaX < 0;
    const resisted = atFirst || atLast ? deltaX * 0.24 : deltaX;
    setRouteDragX(resisted);
  };
  const onRouteSwipeEnd = (event: TouchEvent<HTMLElement>) => {
    const startX = routeSwipeStartX.current;
    routeSwipeStartX.current = null;
    routeSwipeStartY.current = null;
    const endX = event.changedTouches[0]?.clientX;
    if (startX === null || endX === undefined) {
      setRouteDragging(false);
      setRouteDragX(0);
      return;
    }
    const delta = endX - startX;
    const elapsed = Math.max(1, performance.now() - routeSwipeStartTime.current);
    const velocity = delta / elapsed;
    const wantsNext = delta < 0 && routePageIndex < routePageCount - 1;
    const wantsPrevious = delta > 0 && routePageIndex > 0;
    const shouldChange = Math.abs(delta) >= 72 || Math.abs(velocity) >= 0.48;
    if (shouldChange && wantsNext) settleRoutePage(routePageIndex + 1, 'next');
    else if (shouldChange && wantsPrevious) settleRoutePage(routePageIndex - 1, 'previous');
    else {
      setRouteDragging(false);
      setRouteSettling(true);
      setRouteDragX(0);
      routeSwipeTimer.current = window.setTimeout(() => {
        setRouteSettling(false);
        routeSwipeTimer.current = null;
      }, 260);
    }
  };
  const routeDragStyle = {
    transform: `translate3d(${routeDragX}px, 0, 0)`,
    transition: routeDragging ? 'none' : 'transform 280ms cubic-bezier(.22,.72,.22,1)',
  };

  const routeSwitcher = routePageCount > 1 ? (
    <section
      className={`v2-route-page-switcher v2-route-page-motion is-${routePageDirection}`} key={`switcher-${routePageAnimationId}`}
      aria-label="メインRouteと別行動の切り替え"
      onTouchStart={onRouteSwipeStart}
      onTouchMove={onRouteSwipeMove}
      onTouchEnd={onRouteSwipeEnd}
      onTouchCancel={onRouteSwipeEnd}
      style={routeDragStyle}
    >
      <button type="button" onClick={showPreviousRoutePage} disabled={routePageIndex === 0} aria-label="前のRouteを見る">‹</button>
      <div className="v2-route-page-title">
        <small>{routePageIndex === 0 ? 'メインRoute' : activeAlternateRoute ? alternateRouteCategory(activeAlternateRoute.connectionType) : '別行動Route'}</small>
        <strong>{routePageIndex === 0 ? 'メインの予定' : activeAlternateRoute?.name ?? '別行動'}</strong>
        <span>{routePageIndex + 1} / {routePageCount}</span>
      </div>
      <button type="button" onClick={showNextRoutePage} disabled={routePageIndex >= routePageCount - 1} aria-label="次のRouteを見る">›</button>
      <p>{routePageIndex === 0 ? '左へスワイプして別Routeを見る' : routePageIndex >= routePageCount - 1 ? '右へスワイプして前のRouteへ戻る' : '左右にスワイプしてRouteを切り替える'}</p>
      <div className="v2-route-page-dots">
        {Array.from({ length: routePageCount }, (_, index) => (
          <button key={index} type="button" className={index === routePageIndex ? 'is-active' : ''} onClick={() => moveToRoutePage(index)} aria-label={`${index + 1}ページ目を見る`} />
        ))}
      </div>
    </section>
  ) : null;

  if (activeAlternateRoute) {
    const startLabel = destinationLabelById(activeAlternateRoute.startDestinationId);
    const endLabel = destinationLabelById(activeAlternateRoute.endDestinationId);
    return (
      <>
        {routeSwitcher}
        <article className={`v2-alternate-route-panel v2-route-page-motion is-${routePageDirection}`} key={`alternate-${routePageAnimationId}`} onTouchStart={onRouteSwipeStart} onTouchMove={onRouteSwipeMove} onTouchEnd={onRouteSwipeEnd} onTouchCancel={onRouteSwipeEnd} style={routeDragStyle}>
          <div className="v2-section-heading">
            <div>
              <p className="eyebrow">{alternateRouteCategory(activeAlternateRoute.connectionType)}</p>
              <h2>{activeAlternateRoute.name}</h2>
            </div>
            <span className="v2-alternate-route-badge">{alternateTypeLabel(activeAlternateRoute.connectionType)}</span>
          </div>

          {(startLabel || endLabel) ? (
            <div className="v2-alternate-connection-summary">
              {startLabel ? <div><span>{activeAlternateRoute.connectionType === 'leave' ? '途中で離れる場所' : '別行動を始める場所'}</span><strong>{startLabel}</strong></div> : null}
              {endLabel ? <div><span>合流する場所</span><strong>{endLabel}</strong></div> : null}
            </div>
          ) : null}

          {activeAlternateRoute.description ? <p className="v2-alternate-route-description">{activeAlternateRoute.description}</p> : null}

          {activeAlternateDestinations.length ? (
            <div className="v2-alternate-route-timeline">
              {activeAlternateDestinations.map((item, index) => (
                <article key={item.id} className="v2-alternate-route-step">
                  <span className="v2-alternate-route-step-index">{index + 1}</span>
                  <div>
                    {item.startTime ? <time>{item.timeType === 'approx' ? '目安 ' : ''}{item.startTime.slice(0, 5)}{item.endTime ? `〜${item.endTime.slice(0, 5)}` : ''}</time> : null}
                    <h3>{item.name}</h3>
                    {item.locationName ? <p>{item.locationName}</p> : item.description ? <p>{item.description}</p> : null}
                    {item.locationName ? <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.locationName)}`} target="_blank" rel="noreferrer">地図で確認 ›</a> : null}
                  </div>
                </article>
              ))}
              {endLabel ? <article className="v2-alternate-route-step is-connection"><span className="v2-alternate-route-step-index">✓</span><div><small>{activeAlternateRoute.connectionType === 'leave' ? '別行動終了' : 'メインRouteへ合流'}</small><h3>{endLabel}</h3></div></article> : null}
            </div>
          ) : (
            <div className="v2-phase-empty"><p>この別行動には予定がまだありません。</p>{!participantView ? <Link className="v2-text-link" to={`/routes/${routeId}/places`}>Placesで追加する ›</Link> : null}</div>
          )}

          {alternateLoading ? <p className="v2-alternate-route-error">別行動を読み込んでいます。</p> : null}
          {alternateError ? <p className="v2-alternate-route-error" role="alert">{alternateError}</p> : null}
        </article>

        <article className="v2-chat-summary">
          <div className="v2-section-heading"><div><p className="eyebrow">CHAT</p><h2>連絡</h2></div><Link className="v2-text-link" to={`/routes/${routeId}/chat`}>Chatを見る ›</Link></div>
          {latestChats.length ? <div className="v2-route-chat-preview">{latestChats.map((message) => <div className={`v2-route-chat-line${message.isImportant ? ' is-priority' : ''}`} key={message.id}><div className="v2-route-chat-meta">{message.isImportant ? <span className="v2-route-chat-important">重要</span> : null}<strong>{message.authorName}</strong><time>{formatChatTime(message.createdAt)}</time></div><p>{message.body}</p></div>)}</div> : <div className="v2-latest-message is-empty"><div className="v2-empty-message-copy"><strong>まだ連絡はありません。</strong><p>必要な連絡があればChatで共有できます。</p></div></div>}
        </article>
      </>
    );
  }

  if (participantView) {
    return (
      <>
        {routeSwitcher}
        <article className={`v2-participant-route v2-route-page-motion is-${routePageDirection}`} key={`participant-${routePageAnimationId}`} aria-labelledby="participant-route-title" onTouchStart={onRouteSwipeStart} onTouchMove={onRouteSwipeMove} onTouchEnd={onRouteSwipeEnd} onTouchCancel={onRouteSwipeEnd} style={routeDragStyle}>
          <div className="v2-section-heading">
            <div>
              <p className="eyebrow">YOUR ROUTE</p>
              <h2 id="participant-route-title">いま必要な流れ</h2>
            </div>
            <span className="v2-participant-view-badge">参加者表示</span>
          </div>

          {participantSteps.length ? (
            <div className="v2-participant-step-list">
              {participantSteps.map((destination, index) => {
                const phase = phases.find((item) => item.id === destination.phaseId);
                const timeLabel = formatDestinationTime(destination);
                return (
                  <article className={`v2-participant-step is-${index === 0 ? 'current' : index === 1 ? 'next' : 'later'}`} key={destination.id}>
                    <div className="v2-participant-step-label">
                      <span>{participantStepLabels[index]}</span>
                      {phase?.name ? <small>{phase.name}</small> : null}
                    </div>
                    <div className="v2-participant-step-content">
                      {timeLabel ? <time>{timeLabel}</time> : null}
                      <h3>{destination.name}</h3>
                      {getDestinationNote(destination) ? <p>{getDestinationNote(destination)}</p> : null}
                      {getDestinationDirectionsUrl(destination, 'walking') ? (
                        <a href={getDestinationDirectionsUrl(destination, 'walking') ?? undefined} target="_blank" rel="noreferrer">地図で確認 ›</a>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="v2-phase-empty"><p>現在案内する予定はありません。</p></div>
          )}

          <p className="v2-participant-route-note">分岐構造は内部で管理し、参加者には必要な順番だけを表示します。</p>
        </article>

        <article className="v2-chat-summary">
          <div className="v2-section-heading">
            <div><p className="eyebrow">CHAT</p><h2>連絡</h2></div>
            <Link className="v2-text-link" to={`/routes/${routeId}/chat`}>Chatを見る ›</Link>
          </div>
          {latestChats.length ? (
            <div className="v2-route-chat-preview">
              {latestChats.map((message) => (
                <div className={`v2-route-chat-line${message.isImportant ? ' is-priority' : ''}`} key={message.id}>
                  <div className="v2-route-chat-meta">{message.isImportant ? <span className="v2-route-chat-important">重要</span> : null}<strong>{message.authorName}</strong><time>{formatChatTime(message.createdAt)}</time></div>
                  <p>{message.body}</p>
                </div>
              ))}
            </div>
          ) : <div className="v2-latest-message is-empty"><div className="v2-empty-message-copy"><strong>まだ連絡はありません。</strong><p>必要な連絡があればChatで共有できます。</p></div></div>}
        </article>
      </>
    );
  }

  return (
    <>
      {routeSwitcher}
      <article className={`v2-phase-panel v2-route-page-motion is-${routePageDirection}`} key={`main-${routePageAnimationId}`} aria-labelledby="v2-phase-title" onTouchStart={onRouteSwipeStart} onTouchMove={onRouteSwipeMove} onTouchEnd={onRouteSwipeEnd} onTouchCancel={onRouteSwipeEnd} style={routeDragStyle}>
        <div className="v2-phase-heading">
          <div>
            <p className="eyebrow">{isManualPhase ? 'VIEWING PHASE' : 'CURRENT PHASE'}</p>
            <div className="v2-phase-title-row">
              <button className="v2-phase-nav-button" type="button" aria-label="前のPhase" disabled={currentPhaseIndex <= 0} onClick={showPreviousPhase}>‹</button>
              <h2 id="v2-phase-title">{currentPhase?.name || 'Phase'}</h2>
              <button className="v2-phase-nav-button" type="button" aria-label="次のPhase" disabled={currentPhaseIndex < 0 || currentPhaseIndex >= phases.length - 1} onClick={showNextPhase}>›</button>
            </div>
            {isManualPhase ? <button className="v2-phase-current-button" type="button" onClick={() => setViewPhaseId(null)}>現在Phaseへ戻る</button> : null}
          </div>
          {currentPhase ? (
            <div className="v2-phase-progress-wrap">
              {currentPhase.startTime ? <span className="v2-phase-time">{currentPhase.startTime.slice(0, 5)}〜</span> : null}
              {currentDestinations.length > 0 ? (
                <span className={`v2-phase-progress${completedCount === currentDestinations.length ? ' is-complete' : ''}`}>
                  {completedCount} / {currentDestinations.length} 完了
                </span>
              ) : null}
            </div>
          ) : null}
        </div>

        {!currentPhase ? (
          <div className="v2-phase-empty">
            <p>Phaseがまだありません。</p>
            <Link className="v2-text-link" to={`/routes/${routeId}/places`}>PlacesでPlanningする ›</Link>
          </div>
        ) : currentDestinations.length === 0 ? (
          <div className="v2-phase-empty">
            <p>このPhaseには目的地がまだありません。</p>
            <Link className="v2-text-link" to={`/routes/${routeId}/places`}>Placesで追加する ›</Link>
          </div>
        ) : (
          <>
            <div className="v2-destination-stage">
              <button
                className="v2-carousel-button v2-carousel-prev"
                type="button"
                aria-label="前の予定を見る"
                disabled={activeIndex === 0}
                onClick={() => scrollToIndex(activeIndex - 1)}
              >
                ‹
              </button>

              <div className="v2-destination-scroller" ref={scrollerRef} onScroll={onScroll}>
                {currentDestinations.map((destination, index) => {
                  const timeLabel = formatDestinationTime(destination);
                  const note = getDestinationNote(destination);
                  return (
                    <article
                      className={`v2-destination-card${destination.importance === 'must' ? ' is-attention' : ''}${destination.completedAt ? ' is-completed' : ''}${priorityDestination?.id === destination.id ? ' is-priority-focus' : ''}`}
                      data-destination-index={index}
                      key={destination.id}
                      aria-label={`${index + 1}/${currentDestinations.length} ${destination.name}`}
                    >
                      <div className="v2-card-topline">
                        <button
                          className={`v2-destination-check${destination.completedAt ? ' is-completed' : ''}`}
                          type="button"
                          aria-label={`${destination.name}を${destination.completedAt ? '未完了に戻す' : '完了にする'}`}
                          aria-pressed={Boolean(destination.completedAt)}
                          disabled={progressSavingId === destination.id}
                          onClick={() => void toggleDestinationCompleted(destination)}
                        >
                          <span aria-hidden="true">{destination.completedAt ? '✓' : ''}</span>
                        </button>
                        <div className="v2-card-meta"><span className="v2-card-count">{index + 1} / {currentDestinations.length}</span>{destination.importance === 'must' ? <span className="v2-attention-badge">★ 必須</span> : null}</div>
                        <span className={`v2-completion-label${destination.completedAt ? ' is-completed' : ''}`} aria-live="polite">
                          {progressSavingId === destination.id ? '保存中' : destination.completedAt ? '完了' : '未完了'}
                        </span>
                      </div>

                      <div className="v2-card-main">
                        {timeLabel ? (
                          <div className="v2-card-time-row">
                            <time className="v2-card-time">{timeLabel}</time>
                            {getDestinationTimeStatus(destination, currentMinutes) ? (
                              <span className={`v2-time-status is-${getDestinationTimeStatus(destination, currentMinutes)?.key}`}>
                                {getDestinationTimeStatus(destination, currentMinutes)?.label}
                              </span>
                            ) : null}
                          </div>
                        ) : <span className="v2-card-time is-empty">PHASE TASK</span>}
                        <h3>{destination.name}</h3>
                        {note ? <p className="v2-card-note">{note}</p> : <p className="v2-card-note is-empty">このPhase内で行う予定</p>}
                      </div>

                      <div className="v2-destination-actions">
                        {getDestinationDirectionsUrl(destination, travelMode) ? (
                          <div className="v2-travel-mode" aria-label="移動手段">
                            <button type="button" className={travelMode === 'walking' ? 'is-active' : ''} onClick={() => setTravelMode('walking')}>徒歩</button>
                            <button type="button" className={travelMode === 'transit' ? 'is-active' : ''} onClick={() => setTravelMode('transit')}>公共交通</button>
                            <button type="button" className={travelMode === 'driving' ? 'is-active' : ''} onClick={() => setTravelMode('driving')}>車</button>
                          </div>
                        ) : null}
                        <div className="v2-route-actions is-single">
                          {getDestinationDirectionsUrl(destination, travelMode) ? (
                            <a
                              className="v2-map-button is-primary"
                              href={getDestinationDirectionsUrl(destination, travelMode) ?? undefined}
                              target="_blank"
                              rel="noreferrer"
                              aria-label={`現在地から${destination.name}までのルートを確認する`}
                            >
                              <span aria-hidden="true">➜</span>
                              ルートを見る
                            </a>
                          ) : null}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>

              <button
                className="v2-carousel-button v2-carousel-next"
                type="button"
                aria-label="次の予定を見る"
                disabled={activeIndex === currentDestinations.length - 1}
                onClick={() => scrollToIndex(activeIndex + 1)}
              >
                ›
              </button>
            </div>

            <div className="v2-carousel-dots" aria-label={`全${currentDestinations.length}件中${activeIndex + 1}件目`}>
              {currentDestinations.map((destination, index) => (
                <button
                  key={destination.id}
                  type="button"
                  className={index === activeIndex ? 'is-active' : ''}
                  aria-label={`${index + 1}件目を見る`}
                  onClick={() => scrollToIndex(index)}
                />
              ))}
            </div>
              </>
        )}

        <div className="v2-phase-source-note">
          <span>現在時刻からPhaseを自動表示</span>
          <Link className="v2-text-link" to={`/routes/${routeId}/places`}>Placesを見る ›</Link>
        </div>
      </article>

      {(todayModel.overdueTasks.length > 0 || todayModel.exceptionTasks.length > 0) ? (
        <section className="v2-route-alerts" aria-label="注意事項">
          {todayModel.overdueTasks.length > 0 ? <div className="v2-today-warning-row is-overdue"><span>予定超過</span><strong>{todayModel.overdueTasks.length}件</strong></div> : null}
          {todayModel.exceptionTasks.length > 0 ? <div className="v2-today-warning-row is-attention"><span>例外・要確認</span><strong>{todayModel.exceptionTasks.length}件</strong></div> : null}
          <Link className="v2-route-alerts-link" to={`/routes/${routeId}/places`}>Placesで確認 ›</Link>
        </section>
      ) : null}

      <article className="v2-chat-summary">
        <div className="v2-section-heading">
          <div>
            <p className="eyebrow">CHAT</p>
            <h2>連絡</h2>
          </div>
          <Link className="v2-text-link" to={`/routes/${routeId}/chat`}>Chatを見る ›</Link>
        </div>
        {latestChats.length ? (
          <div className="v2-route-chat-preview">
            {latestChats.map((message) => (
              <div className={`v2-route-chat-line${message.isImportant ? ' is-priority' : ''}`} key={message.id}>
                <div className="v2-route-chat-meta">
                  {message.isImportant ? <span className="v2-route-chat-important">重要</span> : null}
                  <strong>{message.authorName}</strong><time>{formatChatTime(message.createdAt)}</time>
                </div>
                <p>{message.body}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="v2-latest-message is-empty"><div className="v2-empty-message-copy"><strong>まだ連絡はありません。</strong><p>必要な連絡があればChatで共有できます。</p></div></div>
        )}
      </article>
    </>
  );
}

export function RouteDetailPage() {
  const { routeId } = useParams<{ routeId: string }>();
  const [route, setRoute] = useState<RouteSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ownMember, setOwnMember] = useState<RouteMember | null>(null);

  useEffect(() => {
    let active = true;

    if (!routeId) {
      setError('Route IDを確認できませんでした。');
      setLoading(false);
      return () => { active = false; };
    }

    void getRoute(routeId)
      .then((nextRoute) => {
        if (!active) return;
        setRoute(nextRoute);
      })
      .catch((nextError) => {
        if (active) setError(getErrorMessage(nextError, 'Routeを読み込めませんでした。'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    void getOwnRouteMember(routeId)
      .then((member) => {
        if (active) setOwnMember(member);
      })
      .catch(() => {
        // 参加者判定に失敗してもRoute本体の表示は継続する。
        if (active) setOwnMember(null);
      });

    return () => { active = false; };
  }, [routeId]);

  return (
    <main className="app-shell v2-dashboard-shell">
      <header className="global-header"><div className="header-brand"><BrandMark size={34} /><strong>D Route</strong></div><div className="header-actions"><Link className="icon-button header-link" to="/routes">一覧へ戻る</Link><RefreshButton placement="header" /></div></header>

      <section className="page-content route-detail-content v2-dashboard-content" aria-labelledby="route-detail-title">
        {loading ? (
          <section className="route-loading" aria-live="polite">
            <span className="route-loading-spinner" aria-hidden="true" />
            <p>Routeを読み込んでいます</p>
          </section>
        ) : error || !route ? (
          <section className="empty-state" role="alert">
            <div className="empty-orbit" aria-hidden="true"><BrandMark size={60} /></div>
            <h1 id="route-detail-title">Routeを開けませんでした</h1>
            <p>{error ?? 'Routeが見つかりませんでした。'}</p>
            <Link className="primary-button link-button" to="/routes">Route一覧へ戻る</Link>
          </section>
        ) : (
          <>
            <section className="v2-route-hero">
              <div className="v2-route-brand" aria-hidden="true"><BrandMark size={48} /></div>
              <div className="v2-route-hero-copy">
                <p className="eyebrow">ROUTE DASHBOARD / ALPHA.3</p>
                <h1 id="route-detail-title">{route.name}</h1>
                <p><span>現在Phaseを時刻から自動表示</span><span>・</span><span>Planning接続</span></p>
              </div>
            </section>

            <PhaseDashboard routeId={routeId ?? route.id} participantView={ownMember?.role === 'member'} />

            {ownMember?.role !== 'member' ? <section className="v2-admin-zone" aria-label="Route管理">
              <p>Routeの管理</p>
              <button type="button" className="v2-complete-button">Routeを完了する</button>
              <small>プロトタイプのため、このボタンはまだ動作しません。</small>
            </section> : null}
          </>
        )}
      </section>

      <footer className="app-footer"><VersionBadge /><span>Route / Current Phase</span></footer>
      {routeId ? <RouteBottomNav routeId={routeId} /> : null}
    </main>
  );
}
