import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { getSupabaseClient } from '../shared/api/supabase';
import { getInitialSession } from '../features/auth/auth';
import { SplashScreen } from '../features/auth/SplashScreen';
import { SignInPage } from '../features/auth/SignInPage';
import { RouteListPage } from '../features/route-list/RouteListPage';

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
        <Route path="/routes" element={session ? <RouteListPage onSignedOut={() => setSession(null)} /> : <Navigate to="/signin" replace />} />
        <Route path="*" element={<Navigate to={session ? '/routes' : '/signin'} replace />} />
      </Routes>
    </BrowserRouter>
  );
}
