import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Sparkles, Bot, CheckSquare, Shield, BookOpen, LogOut, Heart, Zap, Flame, Calendar, Dice6, Swords, Globe, Mountain, Library } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAppStore } from '@/stores/appStore';
import { useAuthStore } from '@/stores/authStore';
import { isSupabaseAuthEnabled } from '@/lib/supabase';

const NAV_ITEMS = [
  { id: 'santuario', label: 'Santuário', icon: Sparkles, path: '/santuario' },
  { id: 'rituais', label: 'Rituais', icon: CheckSquare, path: '/rituais' },
  { id: 'ciclos', label: 'Ciclos', icon: Flame, path: '/ciclos' },
  { id: 'jornadas', label: 'Jornadas', icon: Swords, path: '/jornadas' },
  { id: 'grandes-obras', label: 'Grandes Obras', icon: Mountain, path: '/grandes-obras' },
  { id: 'temporal', label: 'Temporal', icon: Calendar, path: '/temporal/semana' },
  { id: 'grimorio', label: 'Grimório', icon: Library, path: '/grimorio' },
  { id: 'dominios', label: 'Domínios', icon: Globe, path: '/dominios' },
  { id: 'astrolabio', label: 'Astrolábio', icon: BookOpen, path: '/astrolabio' },
  { id: 'cassino', label: 'Cassino Arcano', icon: Dice6, path: '/cassino-arcano' },
  { id: 'forja', label: 'Forja', icon: Bot, path: '/forja' },
  { id: 'pilares', label: 'Pilares', icon: Shield, path: '/pilares' },
];

export const Sidebar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, getCompletedTasksToday, getCompletedHabitsToday, getStreak } = useAppStore();
  const { signOut } = useAuthStore();
  
  const tasksToday = getCompletedTasksToday();
  const habitsToday = getCompletedHabitsToday();
  const streak = getStreak();
  
  const hp = Math.min(100, 70 + (habitsToday * 5) + (streak > 0 ? 10 : 0));
  const stamina = Math.min(100, 60 + (tasksToday * 8));

  return (
    <aside className="hidden md:flex fixed top-4 left-4 bottom-4 w-[260px] z-40 flex-col justify-between p-5 glass-card custom-scrollbar overflow-y-auto">
      <div className="space-y-6">
        
        {/* Identidade */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-mystic-arcane to-mystic-purple border border-mystic-arcane/50 flex items-center justify-center shadow-glow-arcane shrink-0">
            <Sparkles className="w-6 h-6 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-sm font-mystic font-bold text-glow-arcane uppercase tracking-wide">Domínio do Mago</h1>
            <p className="text-[10px] text-white/50 tracking-widest uppercase">Elemental Engine</p>
          </div>
        </div>

        {/* HUD RPG Status */}
        <div className="p-4 rounded-2xl bg-black/50 border border-white/5 space-y-3">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs font-bold text-white truncate max-w-[120px]">{user?.name}</span>
            <span className="text-[10px] font-mono text-mystic-gold bg-mystic-gold/10 px-2 py-0.5 rounded-md border border-mystic-gold/20">LVL {user?.level ?? 1}</span>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-[10px] font-mono font-medium">
              <span className="flex items-center gap-1 text-rose-400"><Heart className="w-3 h-3 fill-rose-500"/> HP</span>
              <span className="text-rose-300">{hp}/100</span>
            </div>
            <div className="h-1.5 w-full bg-black/60 rounded-full overflow-hidden">
              <motion.div initial={{ width: 0 }} animate={{ width: `${hp}%` }} className="h-full bg-gradient-to-r from-red-600 to-rose-400" />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-[10px] font-mono font-medium">
              <span className="flex items-center gap-1 text-amber-400"><Zap className="w-3 h-3 fill-amber-500"/> Stamina</span>
              <span className="text-amber-300">{stamina}/100</span>
            </div>
            <div className="h-1.5 w-full bg-black/60 rounded-full overflow-hidden">
              <motion.div initial={{ width: 0 }} animate={{ width: `${stamina}%` }} className="h-full bg-gradient-to-r from-amber-600 to-yellow-400" />
            </div>
          </div>
        </div>

        {/* Navegação */}
        <nav className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-medium transition-all ${
                  isActive ? 'bg-mystic-arcane/20 text-white border border-mystic-arcane/30 shadow-glow-arcane' : 'text-white/60 hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <item.icon className={`w-5 h-5 ${isActive ? 'text-mystic-cyan' : 'text-white/40'}`} />
                  <span>{item.label}</span>
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="pt-4 border-t border-white/10 mt-6 space-y-3">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2 rounded-xl bg-white/5">
            <p className="text-xs font-mono font-bold text-white">{tasksToday}</p>
            <p className="text-[9px] text-white/40 uppercase mt-0.5">Rituais</p>
          </div>
          <div className="p-2 rounded-xl bg-white/5">
            <p className="text-xs font-mono font-bold text-white">{habitsToday}</p>
            <p className="text-[9px] text-white/40 uppercase mt-0.5">Ciclos</p>
          </div>
          <div className="p-2 rounded-xl bg-white/5 border border-mystic-gold/20 shadow-[0_0_10px_rgba(255,215,0,0.1)]">
            <p className="text-xs font-mono font-bold text-mystic-gold">{streak}🔥</p>
            <p className="text-[9px] text-mystic-gold/60 uppercase mt-0.5">Streak</p>
          </div>
        </div>

        {isSupabaseAuthEnabled && (
          <button onClick={async () => { await signOut(); navigate('/auth', { replace: true }); }} className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-xs font-medium text-white/50 hover:text-rose-400 hover:bg-rose-500/10 transition-colors">
            <LogOut className="w-4 h-4" /> Sair do Grimório
          </button>
        )}
      </div>
    </aside>
  );
};
