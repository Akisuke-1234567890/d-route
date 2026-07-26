import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { getSupabaseClient } from '../shared/api/supabase';
import { getInitialSession } from '../features/auth/auth';
import { SplashScreen } from '../features/auth/SplashScreen';
import { SignInPage } from '../features/auth/SignInPage';
import { AuthPrototypePage } from '../features/auth/AuthPrototypePage';
import { RouteListPage } from '../features/route-list/RouteListPage';
import { RouteDetailPage } from '../features/route-list/RouteDetailPage';
import { RouteChatPage } from '../features/route-list/RouteChatPage';
import { RoutePlacesPage } from '../features/route-list/RoutePlacesPage';
import { RouteMembersPage } from '../features/route-list/RouteMembersPage';
import { RouteMenuPage } from '../features/route-list/RouteMenuPage';

export function App() {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    let active = true;
    void getInitialSession().then((next) => { if (active) setSession(next); }).catch(() => { if (active) setSession(null); }).finally(() => { if (active) setLoading(false); });
    const supabase = getSupabaseClient();
    const subscription = supabase?.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession)).data.subscription;
    return () => { active = false; subscription?.unsubscribe(); };
  }, []);

  if (loading) return <SplashScreen />;

  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route path="/signin" element={session ? <Navigate to="/routes" replace /> : <SignInPage />} />
        <Route path="/auth-preview" element={<AuthPrototypePage />} />
        <Route path="/routes" element={session ? <RouteListPage onSignedOut={() => setSession(null)} /> : <Navigate to="/signin" replace />} />
        <Route path="/routes/:routeId" element={session ? <RouteDetailPage /> : <Navigate to="/signin" replace />} />
        <Route path="/routes/:routeId/places" element={session ? <RoutePlacesPage /> : <Navigate to="/signin" replace />} />
        <Route path="/routes/:routeId/chat" element={session ? <RouteChatPage /> : <Navigate to="/signin" replace />} />
        <Route path="/routes/:routeId/members" element={session ? <RouteMembersPage /> : <Navigate to="/signin" replace />} />
        <Route path="/routes/:routeId/menu" element={session ? <RouteMenuPage /> : <Navigate to="/signin" replace />} />
        <Route path="*" element={<Navigate to={session ? '/routes' : '/signin'} replace />} />
      </Routes>
    </BrowserRouter>
  );
}
