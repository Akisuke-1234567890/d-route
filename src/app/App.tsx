import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { Session } from '@supabase/supabase-js';
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { getSupabaseClient } from '../shared/api/supabase';
import { getInitialSession } from '../features/auth/auth';
import { getOwnProfile, type UserProfile } from '../features/auth/account';
import { SplashScreen } from '../features/auth/SplashScreen';
import { SignInPage } from '../features/auth/SignInPage';
import { StartPage } from '../features/auth/StartPage';
import { RecoveryPage } from '../features/auth/RecoveryPage';
import { ResetPasswordPage } from '../features/auth/ResetPasswordPage';
import { AccountSetupPage } from '../features/auth/AccountSetupPage';
import { AccountProfilePage } from '../features/auth/AccountProfilePage';
import { AuthPrototypePage } from '../features/auth/AuthPrototypePage';
import { RouteListPage } from '../features/route-list/RouteListPage';
import { RouteDetailPage } from '../features/route-list/RouteDetailPage';
import { RouteChatPage } from '../features/route-list/RouteChatPage';
import { RoutePlacesPage } from '../features/route-list/RoutePlacesPage';
import { RouteMembersPage } from '../features/route-list/RouteMembersPage';
import { RouteMenuPage } from '../features/route-list/RouteMenuPage';
import { RefreshButton } from '../shared/ui/RefreshButton';
import { RouteBottomNav } from '../features/route-list/RouteBottomNav';



function getWorkspaceRouteId(pathname: string): string | null {
  const match = pathname.match(/^\/routes\/([^/]+)(?:\/(?:places|chat|members|menu))?\/?$/);
  return match?.[1] ?? null;
}

function getWorkspaceSection(pathname: string): 'route' | 'places' | 'other' {
  if (/^\/routes\/[^/]+\/?$/.test(pathname)) return 'route';
  if (/^\/routes\/[^/]+\/places\/?$/.test(pathname)) return 'places';
  return 'other';
}

function RouteWorkspaceLayout() {
  return (
    <div className="route-workspace-layout">
      <Outlet />
    </div>
  );
}

type FadeRoutesProps = {
  children: ReactNode;
};

function FadeRoutes({ children }: FadeRoutesProps) {
  const location = useLocation();
  const [displayLocation, setDisplayLocation] = useState(location);
  const [phase, setPhase] = useState<'in' | 'out' | 'pre-in'>('in');
  const [transitionWeight, setTransitionWeight] = useState<'light' | 'heavy'>('light');
  const transitionIdRef = useRef(0);
  const contentRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (
      location.pathname === displayLocation.pathname &&
      location.search === displayLocation.search &&
      location.hash === displayLocation.hash
    ) {
      return;
    }

    const nextWorkspaceId = getWorkspaceRouteId(location.pathname);
    const currentWorkspaceId = getWorkspaceRouteId(displayLocation.pathname);
    const nextSection = getWorkspaceSection(location.pathname);
    const sameWorkspace = Boolean(nextWorkspaceId && nextWorkspaceId === currentWorkspaceId);
    const isHeavyWorkspaceTab = sameWorkspace && (nextSection === 'route' || nextSection === 'places');
    const transitionId = transitionIdRef.current + 1;
    transitionIdRef.current = transitionId;
    setTransitionWeight(isHeavyWorkspaceTab ? 'heavy' : 'light');
    setPhase('out');

    const fadeOutMs = isHeavyWorkspaceTab ? 200 : sameWorkspace ? 130 : 250;
    const hiddenHoldMs = isHeavyWorkspaceTab ? 260 : sameWorkspace ? 35 : 0;
    const readinessTimeoutMs = isHeavyWorkspaceTab ? 1400 : 0;

    const swapTimer = window.setTimeout(() => {
      if (transitionIdRef.current !== transitionId) return;

      setDisplayLocation(location);
      setPhase('pre-in');
      const swappedAt = performance.now();

      const reveal = () => {
        if (transitionIdRef.current !== transitionId) return;

        const elapsed = performance.now() - swappedAt;
        const currentContent = contentRef.current;
        const stillLoading = Boolean(
          currentContent?.querySelector('.route-loading, [aria-busy="true"]') ||
          currentContent?.textContent?.includes('読み込んでいます')
        );
        const holdFinished = elapsed >= hiddenHoldMs;
        const timedOut = readinessTimeoutMs > 0 && elapsed >= readinessTimeoutMs;

        if ((!stillLoading && holdFinished) || timedOut || !isHeavyWorkspaceTab) {
          window.requestAnimationFrame(() => {
            window.requestAnimationFrame(() => {
              if (transitionIdRef.current === transitionId) setPhase('in');
            });
          });
          return;
        }

        window.requestAnimationFrame(reveal);
      };

      if (isHeavyWorkspaceTab) {
        window.requestAnimationFrame(reveal);
      } else if (hiddenHoldMs > 0) {
        window.setTimeout(reveal, hiddenHoldMs);
      } else {
        reveal();
      }
    }, fadeOutMs);

    return () => window.clearTimeout(swapTimer);
  }, [
    displayLocation.hash,
    displayLocation.pathname,
    displayLocation.search,
    location,
  ]);

  const persistentRouteId = getWorkspaceRouteId(location.pathname) ?? getWorkspaceRouteId(displayLocation.pathname);

  return (
    <div className="route-transition-shell">
      <div ref={contentRef} className={`route-page-transition is-${phase} is-${transitionWeight}`}>
        <Routes location={displayLocation}>{children}</Routes>
      </div>
      {persistentRouteId ? createPortal(<RouteBottomNav routeId={persistentRouteId} />, document.body) : null}
    </div>
  );
}

export function App() {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileError, setProfileError] = useState('');
  const [showSplash, setShowSplash] = useState(true);
  const [splashPhase, setSplashPhase] = useState<'in' | 'out'>('in');
  const [appEntryPhase, setAppEntryPhase] = useState<'pre-in' | 'in'>('pre-in');

  const refreshProfile = useCallback(async () => {
    if (!session) {
      setProfile(null);
      setProfileError('');
      return;
    }
    setProfileLoading(true);
    setProfileError('');
    try {
      setProfile(await getOwnProfile());
    } catch (caught) {
      setProfile(null);
      setProfileError(caught instanceof Error ? caught.message : 'アカウント情報を確認できませんでした。');
    } finally {
      setProfileLoading(false);
    }
  }, [session]);

  useEffect(() => {
    let active = true;
    void getInitialSession()
      .then((next) => { if (active) setSession(next); })
      .catch(() => { if (active) setSession(null); })
      .finally(() => { if (active) setLoading(false); });

    const supabase = getSupabaseClient();
    const subscription = supabase?.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession)).data.subscription;
    return () => { active = false; subscription?.unsubscribe(); };
  }, []);

  useEffect(() => { void refreshProfile(); }, [refreshProfile]);

  const credentialsReady = Boolean(profile?.login_id && profile?.credentials_ready_at);
  const nicknameReady = Boolean(profile?.display_name?.trim());
  const accountReady = credentialsReady && nicknameReady;
  const flow = useMemo(() => new URLSearchParams(window.location.search).get('flow'), []);
  const mode = useMemo(() => new URLSearchParams(window.location.search).get('mode'), []);
  const signupRequested = flow === 'signup' || mode === 'signup';
  const appLoading = loading || Boolean(session && profileLoading);

  useEffect(() => {
    if (appLoading || !showSplash) return;

    const holdTimer = window.setTimeout(() => {
      setSplashPhase('out');
    }, 1500);

    const finishTimer = window.setTimeout(() => {
      setShowSplash(false);
      setAppEntryPhase('pre-in');

      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => setAppEntryPhase('in'));
      });
    }, 1750);

    return () => {
      window.clearTimeout(holdTimer);
      window.clearTimeout(finishTimer);
    };
  }, [appLoading, showSplash]);

  if (showSplash) {
    return (
      <div className={`app-splash-transition is-${splashPhase}`}>
        <SplashScreen />
      </div>
    );
  }

  const protectedElement = (element: ReactNode) => {
    if (!session) return <Navigate to="/signin" replace />;
    if (profileError) return <Navigate to="/account/setup" replace />;
    if (!credentialsReady) return <Navigate to="/account/setup" replace />;
    if (!nicknameReady) return <Navigate to="/account/profile" replace />;
    return element;
  };

  return (
    <div className={`app-entry-transition is-${appEntryPhase}`}>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <FadeRoutes>
        <Route path="/signin" element={session ? <Navigate to={!credentialsReady ? '/account/setup' : !nicknameReady ? '/account/profile' : '/routes'} replace /> : <SignInPage />} />
        <Route path="/start" element={session ? <Navigate to={!credentialsReady ? '/account/setup' : !nicknameReady ? '/account/profile' : '/routes'} replace /> : <StartPage />} />
        <Route path="/recover" element={session ? <Navigate to={!credentialsReady ? '/account/setup' : !nicknameReady ? '/account/profile' : '/routes'} replace /> : <RecoveryPage />} />
        <Route path="/recover/reset" element={session ? <ResetPasswordPage /> : <Navigate to="/recover" replace />} />
        <Route path="/account/setup" element={session ? (credentialsReady ? <Navigate to={nicknameReady ? '/routes' : '/account/profile'} replace /> : <AccountSetupPage user={session.user} onCompleted={refreshProfile} />) : <Navigate to="/signin" replace />} />
        <Route path="/account/profile" element={session ? <AccountProfilePage user={session.user} required={!nicknameReady} onCompleted={refreshProfile} /> : <Navigate to="/signin" replace />} />
        <Route path="/auth-preview" element={<AuthPrototypePage />} />
        <Route path="/routes" element={protectedElement(<RouteListPage onSignedOut={() => setSession(null)} />)} />
        <Route path="/my-members" element={protectedElement(<Navigate to="/routes" replace />)} />
        <Route path="/routes/:routeId" element={protectedElement(<RouteWorkspaceLayout />)}>
          <Route index element={<RouteDetailPage />} />
          <Route path="places" element={<RoutePlacesPage />} />
          <Route path="chat" element={<RouteChatPage />} />
          <Route path="members" element={<RouteMembersPage />} />
          <Route path="menu" element={<RouteMenuPage />} />
        </Route>
        <Route path="*" element={<Navigate to={flow === 'recovery' && session ? '/recover/reset' : flow === 'setup' && session ? (!credentialsReady ? '/account/setup' : !nicknameReady ? '/account/profile' : '/routes') : signupRequested && !session ? '/start' : session ? (!credentialsReady ? '/account/setup' : !nicknameReady ? '/account/profile' : '/routes') : '/signin'} replace />} />
        </FadeRoutes>
        <RefreshButton />
      </BrowserRouter>
    </div>
  );
}
