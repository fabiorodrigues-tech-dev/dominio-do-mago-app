import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, isSupabaseAuthEnabled } from '@/lib/supabase';
import {
  getCloudSyncFingerprint,
  hydrateAppStoreFromCloud,
  persistAppStoreToCloud,
  recoverDomainDataFromLocalBackup,
} from '@/services/supabaseCloudSync';
import { useAppStore } from '@/stores/appStore';

interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isInitialized: boolean;
  isMigratingLocalData: boolean;
  errorMessage: string | null;
  noticeMessage: string | null;
  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  resendConfirmationEmail: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  migrateLocalData: (force?: boolean) => Promise<void>;
  restoreFromLocalBackupToCloud: () => Promise<void>;
  clearError: () => void;
  clearNotice: () => void;
}

let unsubscribeAuthListener: (() => void) | null = null;
let unsubscribeAppStoreListener: (() => void) | null = null;
let cloudSyncTimer: ReturnType<typeof setTimeout> | null = null;
let currentFingerprint = '';
let isHydratingCloudSnapshot = false;
let isRefreshingFromCloud = false;
let onVisibilityChangeHandler: (() => void) | null = null;
let onWindowFocusHandler: (() => void) | null = null;
const shouldForceBootstrapCloudSync =
  (import.meta.env.VITE_FORCE_BOOTSTRAP_CLOUD_SYNC as string | undefined) === 'true';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const runBootstrapCloudSync = async (
  userId: string,
  set: (partial: Partial<AuthState>) => void
) => {
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await persistAppStoreToCloud(userId);
      set({
        noticeMessage: null,
      });
      return;
    } catch (error) {
      lastError = error;
      if (attempt < 3) {
        await sleep(350 * attempt);
      }
    }
  }

  set({
    noticeMessage:
      lastError instanceof Error
        ? `Falha ao sincronizar com a nuvem: ${lastError.message}`
        : 'Falha ao sincronizar com a nuvem.',
  });
};

const shouldResetForFreshCloudUser = (
  authUserId: string,
  localUserIdBeforeHydration: string | null | undefined
): boolean => {
  return localUserIdBeforeHydration !== `user-${authUserId}`;
};

const resetAppStoreForFreshCloudUser = (authUserId: string) => {
  useAppStore.setState((state) => ({
    user: {
      ...state.user,
      id: `user-${authUserId}`,
    },
    onboarding: {
      step: 0,
      selectedAreas: [],
      avatar: state.user.avatar,
      isComplete: false,
    },
    customAreas: [],
    customSubareas: {},
    linkedSubareasByAreaId: {},
    tasks: [],
    habits: [],
    cycleSequences: [],
    sequenceMemberships: [],
    projects: [],
    quests: [],
    drafts: [],
  }));
};

const toFriendlyAuthError = (
  error: { message?: string; status?: number } | null,
  action: 'signIn' | 'signUp' | 'resend'
): string | null => {
  if (!error) return null;

  const status = error.status;
  const message = (error.message || '').toLowerCase();

  if (status === 429 || message.includes('rate limit') || message.includes('too many')) {
    return 'Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.';
  }

  if (action === 'signIn') {
    if (message.includes('invalid login credentials')) {
      return 'E-mail ou senha inválidos, ou conta ainda não confirmada. Confirme o e-mail e tente de novo.';
    }
  }

  if (action === 'signUp') {
    if (message.includes('user already registered')) {
      return 'Este e-mail já está cadastrado. Tente entrar ou reenviar o e-mail de confirmação.';
    }
  }

  if (action === 'resend') {
    if (message.includes('email') && message.includes('not found')) {
      return 'Não encontramos cadastro com este e-mail. Crie a conta primeiro.';
    }
  }

  return error.message || 'Não foi possível concluir a operação de autenticação.';
};

const stopCloudAutoSync = () => {
  if (unsubscribeAppStoreListener) {
    unsubscribeAppStoreListener();
    unsubscribeAppStoreListener = null;
  }

  if (cloudSyncTimer) {
    clearTimeout(cloudSyncTimer);
    cloudSyncTimer = null;
  }

  if (onVisibilityChangeHandler) {
    document.removeEventListener('visibilitychange', onVisibilityChangeHandler);
    onVisibilityChangeHandler = null;
  }

  if (onWindowFocusHandler) {
    window.removeEventListener('focus', onWindowFocusHandler);
    onWindowFocusHandler = null;
  }

  currentFingerprint = '';
};

const startCloudAutoSync = (
  userId: string
) => {
  stopCloudAutoSync();
  currentFingerprint = getCloudSyncFingerprint();

  const flushPendingChanges = async () => {
    if (isHydratingCloudSnapshot || isRefreshingFromCloud) return;

    const nextFingerprint = getCloudSyncFingerprint();
    if (nextFingerprint === currentFingerprint) return;

    if (cloudSyncTimer) {
      clearTimeout(cloudSyncTimer);
      cloudSyncTimer = null;
    }

    currentFingerprint = nextFingerprint;
    await persistAppStoreToCloud(userId);
  };

  const refreshFromCloudIfIdle = async () => {
    if (isHydratingCloudSnapshot || isRefreshingFromCloud) return;
    if (cloudSyncTimer) return;

    try {
      isRefreshingFromCloud = true;
      isHydratingCloudSnapshot = true;
      await hydrateAppStoreFromCloud(userId);
      currentFingerprint = getCloudSyncFingerprint();
    } catch (error) {
      if (error instanceof Error) {
        console.error(error.message);
      } else {
        console.error('Falha ao atualizar snapshot da nuvem.');
      }
    } finally {
      isHydratingCloudSnapshot = false;
      isRefreshingFromCloud = false;
    }
  };

  unsubscribeAppStoreListener = useAppStore.subscribe(() => {
    if (isHydratingCloudSnapshot) return;

    const nextFingerprint = getCloudSyncFingerprint();
    if (nextFingerprint === currentFingerprint) return;

    currentFingerprint = nextFingerprint;

    if (cloudSyncTimer) {
      clearTimeout(cloudSyncTimer);
    }

    cloudSyncTimer = setTimeout(async () => {
      try {
        await persistAppStoreToCloud(userId);
      } catch (error) {
        const errorText = error instanceof Error ? error.message : '';
        // Cloud sync error - could be logged but no user-facing message
        if (errorText.toLowerCase().includes('schema cloud')) {
          console.error('Schema Supabase ainda não aplicado. Rode a migration SQL antes de usar cloud-first.');
        } else if (error instanceof Error) {
          console.error(error.message);
        } else {
          console.error('Falha ao sincronizar com a nuvem.');
        }
      }
    }, 900);
  });

  onVisibilityChangeHandler = () => {
    if (document.visibilityState === 'hidden') {
      void flushPendingChanges();
      return;
    }

    if (document.visibilityState === 'visible') {
      void refreshFromCloudIfIdle();
    }
  };

  onWindowFocusHandler = () => {
    void refreshFromCloudIfIdle();
  };

  document.addEventListener('visibilitychange', onVisibilityChangeHandler);
  window.addEventListener('focus', onWindowFocusHandler);
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  isLoading: false,
  isInitialized: false,
  isMigratingLocalData: false,
  errorMessage: null,
  noticeMessage: null,

  initialize: async () => {
    if (get().isInitialized) return;

    if (!isSupabaseAuthEnabled || !supabase) {
      set({ isInitialized: true });
      return;
    }

    set({ isLoading: true, errorMessage: null });

    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      set({
        isLoading: false,
        isInitialized: true,
        errorMessage: error.message,
      });
      return;
    }

    set({
      session,
      user: session?.user ?? null,
      isLoading: false,
      isInitialized: true,
    });

    if (session?.user?.id) {
      const shouldRunForcedBootstrap = false;
      const localUserIdBeforeHydration = useAppStore.getState().user.id;

      try {
        isHydratingCloudSnapshot = true;
        const hydration = await hydrateAppStoreFromCloud(session.user.id);

        if (!hydration.hadCloudData && !hydration.hasProfile) {
          if (shouldResetForFreshCloudUser(session.user.id, localUserIdBeforeHydration)) {
            resetAppStoreForFreshCloudUser(session.user.id);
          }
        }
      } catch (error) {
        const errorText = error instanceof Error ? error.message : '';
        set({
          errorMessage:
            errorText.toLowerCase().includes('schema cloud')
              ? 'Schema Supabase ainda não aplicado. Rode a migration SQL para habilitar cloud-first.'
              : error instanceof Error
              ? error.message
              : 'Falha ao carregar dados da nuvem.',
        });
      } finally {
        isHydratingCloudSnapshot = false;
      }

      startCloudAutoSync(session.user.id);

      if (shouldForceBootstrapCloudSync && shouldRunForcedBootstrap) {
        await runBootstrapCloudSync(session.user.id, set);
      }
    } else {
      stopCloudAutoSync();
    }

    if (!unsubscribeAuthListener) {
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((event, nextSession) => {
        set({
          session: nextSession,
          user: nextSession?.user ?? null,
        });

        if (nextSession?.user?.id) {
          const shouldHydrateFromCloud = event === 'SIGNED_IN' || event === 'USER_UPDATED';

          if (!shouldHydrateFromCloud) {
            // Ignore TOKEN_REFRESHED / INITIAL_SESSION to avoid pulling stale cloud snapshot
            // over newer in-memory local state right after a user action.
            startCloudAutoSync(nextSession.user.id);
            return;
          }

          void (async () => {
            const shouldRunForcedBootstrap = false;
            const localUserIdBeforeHydration = useAppStore.getState().user.id;

            try {
              isHydratingCloudSnapshot = true;
              const hydration = await hydrateAppStoreFromCloud(nextSession.user.id);

              if (!hydration.hadCloudData && !hydration.hasProfile) {
                if (shouldResetForFreshCloudUser(nextSession.user.id, localUserIdBeforeHydration)) {
                  resetAppStoreForFreshCloudUser(nextSession.user.id);
                }
              }
            } catch (error) {
              const errorText = error instanceof Error ? error.message : '';
              set({
                errorMessage:
                  errorText.toLowerCase().includes('schema cloud')
                    ? 'Schema Supabase ainda não aplicado. Rode a migration SQL para habilitar cloud-first.'
                    : error instanceof Error
                    ? error.message
                    : 'Falha ao carregar dados da nuvem.',
              });
            } finally {
              isHydratingCloudSnapshot = false;
            }

            startCloudAutoSync(nextSession.user.id);

            if (shouldForceBootstrapCloudSync && shouldRunForcedBootstrap) {
              await runBootstrapCloudSync(nextSession.user.id, set);
            }
          })();
        } else {
          stopCloudAutoSync();
        }
      });

      unsubscribeAuthListener = () => subscription.unsubscribe();
    }
  },

  signIn: async (email, password) => {
    if (!isSupabaseAuthEnabled || !supabase) {
      set({ errorMessage: 'Supabase auth não está habilitado no ambiente.' });
      return;
    }

    set({ isLoading: true, errorMessage: null, noticeMessage: null });

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    set({
      isLoading: false,
      errorMessage: toFriendlyAuthError(error, 'signIn'),
      noticeMessage: error
        ? null
        : 'Login realizado com sucesso.',
    });
  },

  signUp: async (email, password) => {
    if (!isSupabaseAuthEnabled || !supabase) {
      set({ errorMessage: 'Supabase auth não está habilitado no ambiente.' });
      return;
    }

    set({ isLoading: true, errorMessage: null, noticeMessage: null });

    const { error } = await supabase.auth.signUp({ email, password });

    set({
      isLoading: false,
      errorMessage: toFriendlyAuthError(error, 'signUp'),
      noticeMessage: error
        ? null
        : 'Conta criada. Verifique seu e-mail para confirmar a conta antes de entrar.',
    });
  },

  signOut: async () => {
    if (!isSupabaseAuthEnabled || !supabase) {
      return;
    }

    set({ isLoading: true, errorMessage: null });

    const { error } = await supabase.auth.signOut();

    if (!error) {
      stopCloudAutoSync();
    }

    set({
      isLoading: false,
      errorMessage: error?.message ?? null,
      session: error ? get().session : null,
      user: error ? get().user : null,
      noticeMessage: error ? null : 'Sessao encerrada com sucesso.',
    });
  },

  resendConfirmationEmail: async (email) => {
    if (!isSupabaseAuthEnabled || !supabase) {
      set({ errorMessage: 'Supabase auth não está habilitado no ambiente.' });
      return;
    }

    set({ isLoading: true, errorMessage: null, noticeMessage: null });

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
    });

    set({
      isLoading: false,
      errorMessage: toFriendlyAuthError(error, 'resend'),
      noticeMessage: error
        ? null
        : 'E-mail de confirmação reenviado. Verifique sua caixa de entrada.',
    });
  },

  migrateLocalData: async () => {
    // Disabled: local import no longer supported
  },

  restoreFromLocalBackupToCloud: async () => {
    const currentUser = get().user;
    if (!currentUser?.id) {
      console.warn('Nao e possivel restaurar backup: usuario nao autenticado');
      return;
    }

    set({ isMigratingLocalData: true });

    try {
      const recovered = recoverDomainDataFromLocalBackup();
      if (!recovered) {
        console.info('Nenhum backup local encontrado neste navegador.');
        set({ isMigratingLocalData: false });
        return;
      }

      await persistAppStoreToCloud(currentUser.id);
      set({ isMigratingLocalData: false });
    } catch (error) {
      console.error('Falha ao restaurar backup local para nuvem:', error);
      set({ isMigratingLocalData: false });
    }
  },

  clearError: () => set({ errorMessage: null }),
  clearNotice: () => set({ noticeMessage: null }),
}));
