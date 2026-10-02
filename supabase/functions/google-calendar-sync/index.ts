import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';

type ConnectionRow = {
  id: string;
  selected_calendar_id: string | null;
  selected_calendar_name: string | null;
  metadata: Record<string, unknown> | null;
};

type GoogleCalendarEvent = {
  id: string;
  status?: string;
  summary?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
};

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

const normalizeEventDate = (value: string | undefined): string | null => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' });
  }

  const authHeader = request.headers.get('Authorization');
  if (!authHeader) {
    return jsonResponse(401, { error: 'Missing Authorization header' });
  }

  const supabase = getUserClient(authHeader);
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return jsonResponse(401, { error: 'Unauthorized user session' });
  }

  const { data: connection, error: connectionError } = await supabase
    .from('google_calendar_connections')
    .select('id, selected_calendar_id, selected_calendar_name, metadata')
    .eq('user_id', user.id)
    .eq('provider', 'google')
    .eq('is_active', true)
    .maybeSingle<ConnectionRow>();

  if (connectionError) {
    return jsonResponse(500, { error: `Failed to load connection: ${connectionError.message}` });
  }

  if (!connection) {
    return jsonResponse(404, { error: 'No active Google Calendar connection found' });
  }

  const selectedCalendarId = connection.selected_calendar_id ?? 'primary';
  const metadata = connection.metadata ?? {};
  const accessToken = typeof metadata.access_token === 'string' ? metadata.access_token : null;

  if (!accessToken) {
    return jsonResponse(400, {
      error: 'Missing Google access token in secure storage. Complete OAuth callback/token persistence first.',
      hint: 'Store access token securely server-side and update sync function to retrieve it.',
    });
  }

  const now = new Date();
  const timeMin = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const timeMax = new Date(now.getFullYear(), now.getMonth() + 2, 1).toISOString();

  const googleEventsUrl = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(selectedCalendarId)}/events`);
  googleEventsUrl.searchParams.set('singleEvents', 'true');
  googleEventsUrl.searchParams.set('orderBy', 'startTime');
  googleEventsUrl.searchParams.set('timeMin', timeMin);
  googleEventsUrl.searchParams.set('timeMax', timeMax);

  const googleResponse = await fetch(googleEventsUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  if (!googleResponse.ok) {
    const body = await googleResponse.text();
    return jsonResponse(googleResponse.status, {
      error: 'Google Calendar API request failed',
      body,
    });
  }

  const payload = await googleResponse.json();
  const items = Array.isArray(payload.items) ? (payload.items as GoogleCalendarEvent[]) : [];

  const upsertRows = items
    .map((item) => {
      const startsAt = normalizeEventDate(item.start?.dateTime ?? item.start?.date);
      const endsAt = normalizeEventDate(item.end?.dateTime ?? item.end?.date);
      if (!item.id || !startsAt) return null;

      return {
        user_id: user.id,
        connection_id: connection.id,
        google_event_id: item.id,
        google_calendar_id: selectedCalendarId,
        title: item.summary ?? null,
        starts_at: startsAt,
        ends_at: endsAt,
        is_all_day: Boolean(item.start?.date && !item.start?.dateTime),
        status: item.status ?? null,
        payload: item,
        last_seen_at: new Date().toISOString(),
      };
    })
    .filter((row): row is NonNullable<typeof row> => row != null);

  if (upsertRows.length > 0) {
    const { error: upsertError } = await supabase
      .from('google_calendar_events_cache')
      .upsert(upsertRows, { onConflict: 'user_id,google_calendar_id,google_event_id' });

    if (upsertError) {
      return jsonResponse(500, { error: `Failed to upsert cache events: ${upsertError.message}` });
    }
  }

  const { error: touchError } = await supabase
    .from('google_calendar_connections')
    .update({
      last_sync_at: new Date().toISOString(),
      selected_calendar_id: selectedCalendarId,
      selected_calendar_name: connection.selected_calendar_name ?? 'Primary',
    })
    .eq('id', connection.id)
    .eq('user_id', user.id);

  if (touchError) {
    return jsonResponse(500, { error: `Failed to update connection sync status: ${touchError.message}` });
  }

  return jsonResponse(200, {
    syncedCount: upsertRows.length,
    selectedCalendarId,
    timeMin,
    timeMax,
  });
});
