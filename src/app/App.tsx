import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
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
import { RoutePhasesPage } from '../features/route-list/RoutePhasesPage';
import { RouteMembersPage } from '../features/route-list/RouteMembersPage';
import { RouteMenuPage } from '../features/route-list/RouteMenuPage';
import { RefreshButton } from '../shared/ui/RefreshButton';

type FadeRoutesProps = {
  children: ReactNode;
};

function FadeRoutes({ children }: FadeRoutesProps) {
  const location = useLocation();
  const [displayLocation, setDisplayLocation] = useState(location);
  const [phase, setPhase] = useState<'in' | 'out' | 'pre-in'>('in');
  const transitionIdRef = useRef(0);

  useEffect(() => {
    if (
      location.pathname === displayLocation.pathname &&
      location.search === displayLocation.search &&
      location.hash === displayLocation.hash
    ) {
      return;
    }

    const transitionId = transitionIdRef.current + 1;
    transitionIdRef.current = transitionId;
    setPhase('out');

    const swapTimer = window.setTimeout(() => {
      if (transitionIdRef.current !== transitionId) return;

      setDisplayLocation(location);
      setPhase('pre-in');

      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          if (transitionIdRef.current === transitionId) {
            setPhase('in');
          }
        });
      });
    }, 250);

    return () => window.clearTimeout(swapTimer);
  }, [
    displayLocation.hash,
    displayLocation.pathname,
    displayLocation.search,
    location,
  ]);

  return (
    <div className={`route-page-transition is-${phase}`}>
      <Routes location={displayLocation}>{children}</Routes>
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
        <Route path="/routes/:routeId" element={protectedElement(<RouteDetailPage />)} />
        <Route path="/routes/:routeId/places" element={protectedElement(<RoutePlacesPage />)} />
        <Route path="/routes/:routeId/phases" element={protectedElement(<RoutePhasesPage />)} />
        <Route path="/routes/:routeId/chat" element={protectedElement(<RouteChatPage />)} />
        <Route path="/routes/:routeId/members" element={protectedElement(<RouteMembersPage />)} />
        <Route path="/routes/:routeId/menu" element={protectedElement(<RouteMenuPage />)} />
        <Route path="*" element={<Navigate to={flow === 'recovery' && session ? '/recover/reset' : flow === 'setup' && session ? (!credentialsReady ? '/account/setup' : !nicknameReady ? '/account/profile' : '/routes') : signupRequested && !session ? '/start' : session ? (!credentialsReady ? '/account/setup' : !nicknameReady ? '/account/profile' : '/routes') : '/signin'} replace />} />
        </FadeRoutes>
        <RefreshButton />
      </BrowserRouter>
    </div>
  );
}
