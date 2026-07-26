import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
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
import { RouteMembersPage } from '../features/route-list/RouteMembersPage';
import { RouteMenuPage } from '../features/route-list/RouteMenuPage';
import { RefreshButton } from '../shared/ui/RefreshButton';

type FadeRoutesProps = {
  children: ReactNode;
};

function FadeRoutes({ children }: FadeRoutesProps) {
  const location = useLocation();
  const [displayLocation, setDisplayLocation] = useState(location);
  const [phase, setPhase] = useState<'in' | 'out'>('in');

  useEffect(() => {
    if (location.key === displayLocation.key) return;

    setPhase('out');
    const timer = window.setTimeout(() => {
      setDisplayLocation(location);
      setPhase('in');
    }, 140);

    return () => window.clearTimeout(timer);
  }, [displayLocation.key, location]);

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

  if (loading || (session && profileLoading)) return <SplashScreen />;

  const protectedElement = (element: ReactNode) => {
    if (!session) return <Navigate to="/signin" replace />;
    if (profileError) return <Navigate to="/account/setup" replace />;
    if (!credentialsReady) return <Navigate to="/account/setup" replace />;
    if (!nicknameReady) return <Navigate to="/account/profile" replace />;
    return element;
  };

  return (
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
        <Route path="/routes/:routeId/chat" element={protectedElement(<RouteChatPage />)} />
        <Route path="/routes/:routeId/members" element={protectedElement(<RouteMembersPage />)} />
        <Route path="/routes/:routeId/menu" element={protectedElement(<RouteMenuPage />)} />
        <Route path="*" element={<Navigate to={flow === 'recovery' && session ? '/recover/reset' : flow === 'setup' && session ? (!credentialsReady ? '/account/setup' : !nicknameReady ? '/account/profile' : '/routes') : session ? (!credentialsReady ? '/account/setup' : !nicknameReady ? '/account/profile' : '/routes') : '/signin'} replace />} />
      </FadeRoutes>
      <RefreshButton />
    </BrowserRouter>
  );
}
