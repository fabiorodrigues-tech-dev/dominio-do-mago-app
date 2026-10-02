import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';

const GOOGLE_AUTH_BASE = 'https://accounts.google.com/o/oauth2/v2/auth';
const DEFAULT_SCOPE = 'https://www.googleapis.com/auth/calendar.readonly';

const getUserClient = (authHeader: string) => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
  });
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'GET' && request.method !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' });
  }

  const authHeader = request.headers.get('Authorization');
  if (!authHeader) {
    return jsonResponse(401, { error: 'Missing Authorization header' });
  }

  const clientId = Deno.env.get('GOOGLE_OAUTH_CLIENT_ID');
  const redirectUri = Deno.env.get('GOOGLE_OAUTH_REDIRECT_URI');
  const scope = Deno.env.get('GOOGLE_OAUTH_SCOPE') ?? DEFAULT_SCOPE;

  if (!clientId || !redirectUri) {
    return jsonResponse(500, {
      error: 'Missing GOOGLE_OAUTH_CLIENT_ID or GOOGLE_OAUTH_REDIRECT_URI env vars',
    });
  }

  const supabase = getUserClient(authHeader);
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return jsonResponse(401, { error: 'Unauthorized user session' });
  }

  const statePayload = {
    userId: user.id,
    nonce: crypto.randomUUID(),
    issuedAt: Date.now(),
  };
  const state = btoa(JSON.stringify(statePayload));

  const url = new URL(GOOGLE_AUTH_BASE);
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('access_type', 'offline');
  url.searchParams.set('include_granted_scopes', 'true');
  url.searchParams.set('prompt', 'consent');
  url.searchParams.set('scope', scope);
  url.searchParams.set('state', state);

  return jsonResponse(200, {
    authUrl: url.toString(),
    note: 'Use this URL to start Google OAuth consent flow.',
  });
});
