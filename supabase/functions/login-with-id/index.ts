import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'invalid_request' }, 405);

  try {
    const { loginId, password } = await request.json();
    const normalizedId = typeof loginId === 'string' ? loginId.trim().toLowerCase() : '';
    const rawPassword = typeof password === 'string' ? password : '';

    if (!/^[a-z0-9._-]{4,24}$/.test(normalizedId) || !rawPassword) {
      return json({ error: 'invalid_credentials' }, 401);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    if (!supabaseUrl || !serviceRoleKey || !anonKey) return json({ error: 'server_configuration' }, 500);

    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: profile, error: profileError } = await admin
      .from('user_profiles')
      .select('user_id')
      .eq('login_id', normalizedId)
      .not('credentials_ready_at', 'is', null)
      .maybeSingle();

    if (profileError || !profile?.user_id) return json({ error: 'invalid_credentials' }, 401);

    const { data: userData, error: userError } = await admin.auth.admin.getUserById(profile.user_id);
    const email = userData.user?.email;
    if (userError || !email) return json({ error: 'invalid_credentials' }, 401);

    const publicClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: signInData, error: signInError } = await publicClient.auth.signInWithPassword({ email, password: rawPassword });
    if (signInError || !signInData.session) return json({ error: 'invalid_credentials' }, 401);

    return json({
      access_token: signInData.session.access_token,
      refresh_token: signInData.session.refresh_token,
      expires_in: signInData.session.expires_in,
      token_type: signInData.session.token_type,
    });
  } catch {
    return json({ error: 'invalid_credentials' }, 401);
  }
});
