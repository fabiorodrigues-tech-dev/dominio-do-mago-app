import React, { Suspense, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { TopBar } from './TopBar';
import { MobileBottomNav } from './MobileBottomNav';
import { Sidebar } from './Sidebar';
import { useAppStore } from '@/stores/appStore';
import { Heart, Zap, Star } from 'lucide-react';

const AuraAvatar3D = React.lazy(() => import('@/components/3d/AuraAvatar3D'));
const AURA_ROUTES = ['/santuario', '/grimorio'];
const MAX_DAILY_SCORE = 500;

interface AppLayoutProps {
  children: React.ReactNode;
  title?: string;
  showBackButton?: boolean;
  rightAction?: React.ReactNode;
  hideNav?: boolean;
  showAura?: boolean;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  title,
  showBackButton = false,
  rightAction,
  hideNav = false,
  showAura,
}) => {
  const location = useLocation();
  const { timer, tickTimer, user, getCompletedTasksToday, getCompletedHabitsToday, getStreak } = useAppStore();
  const totalScore = useAppStore((s) => s.getTotalScore());

  const tasksToday = getCompletedTasksToday();
  const habitsToday = getCompletedHabitsToday();
  const streak = getStreak();
  
  const hp = Math.min(100, 70 + (habitsToday * 5) + (streak > 0 ? 10 : 0));
  const stamina = Math.min(100, 60 + (tasksToday * 8));
  const xpPercent = Math.min(100, Math.round(((user?.experience || 0) / (user?.experienceToNextLevel || 100)) * 100));

  const pranaLevel = Math.min(100, Math.round((totalScore / MAX_DAILY_SCORE) * 100));
  const renderAura = showAura ?? AURA_ROUTES.includes(location.pathname);

  useEffect(() => {
    if (!timer.isRunning) return;
    const interval = setInterval(tickTimer, 1000);
    return () => clearInterval(interval);
  }, [timer.isRunning, tickTimer]);

  return (
    <div className="min-h-screen text-fg-primary bg-void overflow-x-hidden selection:bg-mystic-arcane/40">
      {/* Background Arcane Elegante */}
      <div aria-hidden className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-0 inset-x-0 h-[50vh] bg-gradient-radial-magic" />
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-mystic-arcane/10 blur-[100px] animate-pulse-magic" />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full bg-mystic-cyan/5 blur-[100px] animate-pulse-magic" style={{ animationDelay: '2s' }} />
      </div>

      <Sidebar />
      <TopBar title={title} showBackButton={showBackButton} rightAction={rightAction} />

      <main id="main-content" className={`relative z-10 px-4 pt-4 md:ml-72 md:px-8 md:pt-6 ${hideNav ? 'pb-8' : 'pb-[calc(7rem+env(safe-area-inset-bottom))]'}`}>
        <div className="mx-auto w-full max-w-5xl space-y-6">
          
          <div className={`glass-card flex-col items-center px-4 py-8 shadow-glow-arcane relative ${renderAura ? 'flex' : 'hidden'}`}>
            <Suspense fallback={<div className="w-[200px] h-[200px] rounded-full bg-white/5 animate-pulse" />}>
              <AuraAvatar3D pranaLevel={pranaLevel} className="max-w-[240px] md:max-w-[300px] -mb-8" />
            </Suspense>
            
            {/* HUD RPG Status */}
            <div className="w-full max-w-md mt-6 space-y-4 z-10 px-4 bg-black/40 p-5 rounded-3xl border border-white/5 backdrop-blur-md">
              {/* Nível e Nome */}
              <div className="flex justify-between items-end mb-2">
                <div>
                  <p className="text-xl font-mystic text-glow-arcane font-bold text-white leading-none">{user?.name || 'Mago Iniciante'}</p>
                  <p className="text-xs text-mystic-gold uppercase tracking-widest font-mono mt-1">Nível {user?.level ?? 1}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-white/50 uppercase tracking-widest">Prana</p>
                  <p className="text-lg font-mono text-mystic-cyan font-bold leading-none">{pranaLevel}%</p>
                </div>
              </div>

              {/* Status Bars */}
              <div className="space-y-3">
                {/* HP */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-mono font-medium">
                    <span className="flex items-center gap-1 text-rose-400 uppercase tracking-wider"><Heart className="w-3 h-3 fill-rose-500" /> HP</span>
                    <span className="text-rose-300">{hp}/100</span>
                  </div>
                  <div className="h-2 w-full bg-black/60 rounded-full overflow-hidden border border-rose-900/30">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${hp}%` }} className="h-full bg-gradient-to-r from-red-600 to-rose-400" />
                  </div>
                </div>

                {/* Stamina */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-mono font-medium">
                    <span className="flex items-center gap-1 text-amber-400 uppercase tracking-wider"><Zap className="w-3 h-3 fill-amber-500" /> Stamina</span>
                    <span className="text-amber-300">{stamina}/100</span>
                  </div>
                  <div className="h-2 w-full bg-black/60 rounded-full overflow-hidden border border-amber-900/30">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${stamina}%` }} className="h-full bg-gradient-to-r from-amber-600 to-yellow-400" />
                  </div>
                </div>

                {/* XP */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-mono font-medium">
                    <span className="flex items-center gap-1 text-mystic-gold uppercase tracking-wider"><Star className="w-3 h-3 fill-mystic-gold" /> Experiência</span>
                    <span className="text-mystic-gold/80">{user?.experience || 0} / {user?.experienceToNextLevel || 100}</span>
                  </div>
                  <div className="h-1.5 w-full bg-black/60 rounded-full overflow-hidden border border-mystic-gold/20">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${xpPercent}%` }} className="h-full bg-gradient-to-r from-mystic-gold/50 to-mystic-gold" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {!hideNav && <MobileBottomNav />}
    </div>
  );
};
