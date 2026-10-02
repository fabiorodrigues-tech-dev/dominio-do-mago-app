import React from 'react';
import { ChevronLeft, Bell, Sparkles } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAppStore } from '@/stores/appStore';
import { useAuthStore } from '@/stores/authStore';
import { isSupabaseAuthEnabled } from '@/lib/supabase';
import { useWeekStartsOnPreference } from '@/lib/temporal';
import {
  getGoogleCalendarConnectUrl,
  getGoogleCalendarConnection,
  getGoogleCalendarSyncUrl,
  isGoogleCalendarIntegrationEnabled,
} from '@/services/googleCalendarIntegration';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface TopBarProps {
  title?: string;
  showBackButton?: boolean;
  rightAction?: React.ReactNode;
}

export const TopBar: React.FC<TopBarProps> = ({
  title,
  showBackButton = false,
  rightAction,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, accounts, currentAccountId, createAccount, switchAccount } = useAppStore();
  const {
    user: authUser,
    session,
    signOut,
    restoreFromLocalBackupToCloud,
    isMigratingLocalData,
  } = useAuthStore();
  const [isAccountModalOpen, setIsAccountModalOpen] = React.useState(false);
  const [newAccountName, setNewAccountName] = React.useState('');
  const [googleStatus, setGoogleStatus] = React.useState<
    'idle' | 'loading' | 'connected' | 'disconnected' | 'unavailable' | 'error'
  >('idle');
  const [isGoogleSyncing, setIsGoogleSyncing] = React.useState(false);
  const [isGoogleConnecting, setIsGoogleConnecting] = React.useState(false);
  const [googleEmail, setGoogleEmail] = React.useState<string | null>(null);
  const [googleStatusMessage, setGoogleStatusMessage] = React.useState<string>('');
  const { weekStartsOn, setWeekStartsOn } = useWeekStartsOnPreference();
  const googleConnectUrl = React.useMemo(() => getGoogleCalendarConnectUrl(), []);
  const googleSyncUrl = React.useMemo(() => getGoogleCalendarSyncUrl(), []);

  const activeAccount = React.useMemo(
    () => accounts.find((account) => account.id === currentAccountId) || null,
    [accounts, currentAccountId]
  );

  const getPageTitle = () => {
    if (title) return title;
    
    const path = location.pathname;
    const titles: Record<string, string> = {
      '/santuario': 'Santuário',
      '/rituais': 'Rituais',
      '/ciclos': 'Ciclos',
      '/jornadas': 'Jornadas',
      '/grandes-obras': 'Grandes Obras',
      '/forja': 'Forja',
      '/astrolabio': 'Astrolábio',
      '/grimorio': 'Grimório',
      '/invocar': 'Invocar',
      '/dominios': 'Domínios',
      '/pilares': 'Pilares Elementais',
      '/temporal/semana': 'Temporal - Semana',
      '/temporal/mes': 'Temporal - Mês',
      '/temporal/ano': 'Temporal - Ano',
      '/temporal/calendario': 'Temporal - Calendário',
    };
    
    return titles[path] || 'Conselho Elemental';
  };

  React.useEffect(() => {
    if (!isAccountModalOpen) return;

    const loadGoogleConnection = async () => {
      if (!isGoogleCalendarIntegrationEnabled()) {
        setGoogleStatus('unavailable');
        setGoogleStatusMessage('Habilite Supabase Auth para conectar Google Agenda.');
        setGoogleEmail(null);
        return;
      }

      setGoogleStatus('loading');
      setGoogleStatusMessage('');

      try {
        const connection = await getGoogleCalendarConnection();
        if (connection?.is_active) {
          setGoogleStatus('connected');
          setGoogleEmail(connection.google_email ?? null);
          setGoogleStatusMessage('Conexao ativa.');
          return;
        }

        setGoogleStatus('disconnected');
        setGoogleEmail(null);
        setGoogleStatusMessage('Nenhuma conexao ativa encontrada.');
      } catch (error) {
        setGoogleStatus('error');
        setGoogleEmail(null);
        setGoogleStatusMessage(
          error instanceof Error ? error.message : 'Erro ao verificar conexao Google Agenda.'
        );
      }
    };

    void loadGoogleConnection();
  }, [isAccountModalOpen]);

  const handleGoogleConnect = React.useCallback(async () => {
    if (!googleConnectUrl || !session?.access_token) return;

    setIsGoogleConnecting(true);
    setGoogleStatusMessage('Iniciando OAuth Google...');

    try {
      const response = await fetch(googleConnectUrl, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const payload = (await response.json()) as { authUrl?: string; error?: string };
      if (!response.ok || !payload.authUrl) {
        throw new Error(payload.error || 'Falha ao iniciar conexão Google');
      }

      window.open(payload.authUrl, '_blank', 'noopener,noreferrer');
      setGoogleStatusMessage('Consentimento aberto em nova aba. Complete o login e depois sincronize.');
    } catch (error) {
      setGoogleStatusMessage(error instanceof Error ? error.message : 'Erro ao iniciar conexão Google');
      setGoogleStatus('error');
    } finally {
      setIsGoogleConnecting(false);
    }
  }, [googleConnectUrl, session?.access_token]);

  const handleGoogleSync = React.useCallback(async () => {
    if (!googleSyncUrl || !session?.access_token) return;

    setIsGoogleSyncing(true);
    setGoogleStatusMessage('Sincronizando Google Agenda...');

    try {
      const response = await fetch(googleSyncUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      const payload = (await response.json()) as { syncedCount?: number; error?: string };
      if (!response.ok) {
        throw new Error(payload.error || 'Falha na sincronização Google Agenda');
      }

      setGoogleStatus('connected');
      setGoogleStatusMessage(`Sincronização concluída. ${payload.syncedCount ?? 0} eventos atualizados.`);
    } catch (error) {
      setGoogleStatusMessage(error instanceof Error ? error.message : 'Erro na sincronização Google Agenda');
      setGoogleStatus('error');
    } finally {
      setIsGoogleSyncing(false);
    }
  }, [googleSyncUrl, session?.access_token]);

  return (
    <>
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="sticky top-0 z-50 bg-black/40 backdrop-blur-md border-b border-white/10 pt-[env(safe-area-inset-top)] md:ml-72"
      >
        <div className="flex items-center justify-between h-14 px-4 max-w-lg mx-auto md:max-w-none md:px-6">
          <div className="flex items-center gap-3">
            {showBackButton && (
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate(-1)}
                className="p-2 rounded-full hover:bg-white/10 transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </motion.button>
            )}

            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-mystic-gold" />
              <h1 className="font-mystic text-lg tracking-wide bg-gradient-to-r from-mystic-gold to-mystic-arcane bg-clip-text text-transparent">
                {getPageTitle()}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {rightAction || (
              <>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  className="p-2 rounded-full hover:bg-white/10 transition-colors relative"
                  aria-label="Notificações"
                >
                  <Bell className="w-5 h-5 text-white/70" />
                  <span className="absolute top-1 right-1 w-2 h-2 bg-mystic-gold rounded-full animate-pulse" />
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsAccountModalOpen(true)}
                  className="p-2 rounded-full hover:bg-white/10 transition-colors"
                  aria-label="Conta"
                >
                  <span className="text-xl">{user.avatar}</span>
                </motion.button>
              </>
            )}
          </div>
        </div>

      </motion.header>

      <Dialog open={isAccountModalOpen} onOpenChange={setIsAccountModalOpen}>
        <DialogContent className="max-w-md border-white/20 bg-void/95 text-white backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle>Conta ativa</DialogTitle>
            <DialogDescription>
              {activeAccount ? `Atual: ${activeAccount.name}` : 'Modo local sem conta ativa'}
            </DialogDescription>
          </DialogHeader>

          {isSupabaseAuthEnabled && (
            <div className="space-y-2 rounded-lg border border-white/15 p-3">
              <p className="text-sm font-medium text-white">Sessao Supabase</p>
              <p className="text-xs text-white/70">
                {authUser?.email || 'Usuario autenticado sem email visivel'}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  disabled={isMigratingLocalData}
                  onClick={() => {
                    void restoreFromLocalBackupToCloud();
                  }}
                >
                  {isMigratingLocalData ? 'Restaurando...' : 'Restaurar backup local'}
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => {
                    void (async () => {
                      await signOut();
                      setIsAccountModalOpen(false);
                      navigate('/auth', { replace: true });
                    })();
                  }}
                >
                  Sair
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {accounts.length === 0 ? (
              <p className="text-sm text-white/70">Nenhuma conta criada ainda.</p>
            ) : (
              accounts.map((account) => (
                <button
                  key={account.id}
                  type="button"
                  onClick={() => switchAccount(account.id)}
                  className={`w-full rounded-lg border px-3 py-2 text-left transition-colors ${
                    account.id === currentAccountId
                      ? 'border-mystic-gold bg-mystic-gold/10'
                      : 'border-white/15 hover:border-white/30 hover:bg-white/5'
                  }`}
                >
                  <span className="mr-2">{account.avatar}</span>
                  <span className="font-medium">{account.name}</span>
                </button>
              ))
            )}
          </div>

          <div className="space-y-3 rounded-lg border border-white/15 p-3">
            <p className="text-sm font-medium text-white">Início da semana</p>
            <div className="inline-flex rounded-lg border border-white/20 bg-white/5 p-1 text-xs">
              <button
                type="button"
                onClick={() => setWeekStartsOn(0)}
                className={`rounded-md px-2 py-1 ${weekStartsOn === 0 ? 'bg-mystic-gold/20 text-mystic-gold' : 'text-white/70'}`}
              >
                Domingo
              </button>
              <button
                type="button"
                onClick={() => setWeekStartsOn(1)}
                className={`rounded-md px-2 py-1 ${weekStartsOn === 1 ? 'bg-mystic-gold/20 text-mystic-gold' : 'text-white/70'}`}
              >
                Segunda
              </button>
            </div>
          </div>

          <div className="space-y-3 rounded-lg border border-white/15 p-3">
            <p className="text-sm font-medium text-white">Google Agenda (beta)</p>
            <p className="text-xs text-white/70">
              {googleStatus === 'loading' && 'Verificando conexao...'}
              {googleStatus === 'connected' && (googleEmail ? `Conectado: ${googleEmail}` : 'Conectado')}
              {googleStatus === 'disconnected' && 'Desconectado'}
              {googleStatus === 'unavailable' && 'Indisponivel neste ambiente'}
              {googleStatus === 'error' && 'Falha ao carregar status'}
              {googleStatus === 'idle' && 'Aguardando verificacao'}
            </p>
            {googleStatusMessage ? <p className="text-[11px] text-white/55">{googleStatusMessage}</p> : null}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={!googleConnectUrl || !session?.access_token || isGoogleConnecting}
                onClick={() => {
                  void handleGoogleConnect();
                }}
              >
                {isGoogleConnecting ? 'Conectando...' : 'Conectar Google'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={!googleSyncUrl || !session?.access_token || googleStatus !== 'connected' || isGoogleSyncing}
                onClick={() => {
                  void handleGoogleSync();
                }}
              >
                {isGoogleSyncing ? 'Sincronizando...' : 'Sincronizar agora'}
              </Button>
            </div>
            {!googleConnectUrl ? (
              <p className="text-[11px] text-white/55">
                Defina VITE_GOOGLE_CALENDAR_CONNECT_URL para ativar o botao de conexao.
              </p>
            ) : null}
          </div>

          <div className="space-y-3 rounded-lg border border-white/15 p-3">
            <Label htmlFor="new-account-name">Nova conta</Label>
            <Input
              id="new-account-name"
              value={newAccountName}
              onChange={(event) => setNewAccountName(event.target.value)}
              placeholder="Nome da conta"
              className="border-white/20 bg-white/5"
            />
            <Button
              type="button"
              className="w-full"
              onClick={() => {
                if (!newAccountName.trim()) return;
                createAccount(newAccountName, false);
                setNewAccountName('');
              }}
            >
              Criar e ativar conta
            </Button>
          </div>

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => navigate('/grimorio')}>
              Abrir Grimorio
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
