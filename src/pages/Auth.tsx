import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/stores/authStore';

export function Auth() {
  const {
    signIn,
    signUp,
    resendConfirmationEmail,
    isLoading,
    errorMessage,
    noticeMessage,
    clearError,
    clearNotice,
  } = useAuthStore();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const canSubmit = email.trim().length > 3 && password.length >= 6 && !isLoading;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;

    if (mode === 'login') {
      void signIn(email.trim(), password);
    } else {
      void signUp(email.trim(), password);
    }
  };

  return (
    <div className="min-h-screen bg-void text-white grid place-items-center px-4">
      <Card className="w-full max-w-md border-white/20 bg-void/90 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="text-xl">Conselho Elemental</CardTitle>
          <CardDescription>
            {mode === 'login' ? 'Entre para acessar seus dados.' : 'Crie sua conta para salvar seus registros.'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="auth-email">Email</Label>
            <Input
              id="auth-email"
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                if (errorMessage) clearError();
                if (noticeMessage) clearNotice();
              }}
              placeholder="seu@email.com"
              className="border-white/20 bg-white/5"
              autoComplete="email"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="auth-password">Senha</Label>
            <Input
              id="auth-password"
              type="password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                if (errorMessage) clearError();
                if (noticeMessage) clearNotice();
              }}
              placeholder="No minimo 6 caracteres"
              className="border-white/20 bg-white/5"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </div>

          {errorMessage && <p className="rounded-md border border-red-400/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">{errorMessage}</p>}
          {noticeMessage && <p className="rounded-md border border-emerald-400/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">{noticeMessage}</p>}
          {mode === 'register' && (
            <p className="text-xs text-white/60">
              Se o email não chegar, confira spam/lixo e aguarde alguns minutos antes de reenviar para evitar bloqueio temporário.
            </p>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={!canSubmit}
          >
            {isLoading ? 'Aguarde...' : mode === 'login' ? 'Entrar' : 'Criar conta'}
          </Button>

          {mode === 'register' && (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={isLoading || email.trim().length < 4}
              onClick={() => {
                void resendConfirmationEmail(email.trim());
              }}
            >
              Reenviar email de confirmação
            </Button>
          )}

          <Button
            type="button"
            variant="ghost"
            className="w-full text-white/80"
            onClick={() => {
              setMode((previous) => (previous === 'login' ? 'register' : 'login'));
              clearError();
              clearNotice();
            }}
          >
            {mode === 'login' ? 'Não tem conta? Criar agora' : 'Já tem conta? Fazer login'}
          </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
