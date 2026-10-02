import { isSupabaseAuthEnabled, supabase } from '@/lib/supabase';

const isGoogleCalendarFeatureEnabled =
  (import.meta.env.VITE_ENABLE_GOOGLE_CALENDAR as string | undefined) === 'true';

export interface GoogleCalendarConnection {
  id: string;
  user_id: string;
  provider: 'google';
  google_subject: string | null;
  google_email: string | null;
  scope: string | null;
  is_active: boolean;
  selected_calendar_id: string | null;
  selected_calendar_name: string | null;
  sync_cursor: string | null;
  oauth_connected_at: string | null;
  last_sync_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface GoogleCalendarEventCache {
  id: string;
  user_id: string;
  connection_id: string;
  google_event_id: string;
  google_calendar_id: string;
  title: string | null;
  starts_at: string | null;
  ends_at: string | null;
  is_all_day: boolean;
  status: string | null;
  payload: Record<string, unknown>;
  last_seen_at: string;
  created_at: string;
  updated_at: string;
}

const isMissingTableError = (error: { message?: string; details?: string } | null, table: string): boolean => {
  if (!error) return false;
  const text = `${error.message ?? ''} ${error.details ?? ''}`.toLowerCase();
  return text.includes(table.toLowerCase()) && (text.includes('not found') || text.includes('does not exist') || text.includes('relation'));
};

export const isGoogleCalendarIntegrationEnabled = (): boolean => {
  return isGoogleCalendarFeatureEnabled && isSupabaseAuthEnabled && Boolean(supabase);
};

export const getGoogleCalendarConnection = async (): Promise<GoogleCalendarConnection | null> => {
  if (!supabase || !isSupabaseAuthEnabled) return null;

  const { data, error } = await supabase
    .from('google_calendar_connections')
    .select('*')
    .eq('provider', 'google')
    .maybeSingle();

  if (error) {
    if (isMissingTableError(error, 'google_calendar_connections')) return null;
    throw new Error(`Falha ao carregar conexao Google Agenda: ${error.message}`);
  }

  return (data as GoogleCalendarConnection | null) ?? null;
};

export const listGoogleCalendarEventsCache = async (params: {
  startIso: string;
  endIso: string;
}): Promise<GoogleCalendarEventCache[]> => {
  if (!supabase || !isSupabaseAuthEnabled) return [];

  const { data, error } = await supabase
    .from('google_calendar_events_cache')
    .select('*')
    .gte('starts_at', params.startIso)
    .lte('starts_at', params.endIso)
    .order('starts_at', { ascending: true })
    .limit(1000);

  if (error) {
    if (isMissingTableError(error, 'google_calendar_events_cache')) return [];
    throw new Error(`Falha ao carregar eventos cache do Google Agenda: ${error.message}`);
  }

  return (data as GoogleCalendarEventCache[]) ?? [];
};

export const getGoogleCalendarConnectUrl = (): string | null => {
  const url = (import.meta.env.VITE_GOOGLE_CALENDAR_CONNECT_URL as string | undefined)?.trim();
  return url ? url : null;
};

export const getGoogleCalendarSyncUrl = (): string | null => {
  const url = (import.meta.env.VITE_GOOGLE_CALENDAR_SYNC_URL as string | undefined)?.trim();
  return url ? url : null;
};
