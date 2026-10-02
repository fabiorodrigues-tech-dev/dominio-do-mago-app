import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Sparkles, CheckSquare, Plus, Library, LayoutGrid, Flame, Swords, Mountain, Calendar, Globe, Dice6 } from 'lucide-react';

export const MobileBottomNav: React.FC = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [moreOpen, setMoreOpen] = useState(false);

  const isActive = (path: string) => pathname.startsWith(path);

  return (
    <>
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-black/70 backdrop-blur-xl border-t border-white/5 pb-[env(safe-area-inset-bottom)] shadow-[0_-10px_40px_rgba(0,0,0,0.5)] rounded-t-3xl">
        <div className="grid grid-cols-5 h-16 items-center justify-items-center">
          
          <button onClick={() => navigate('/santuario')} className={`flex flex-col items-center gap-1 ${isActive('/santuario') ? 'text-mystic-cyan' : 'text-white/40'}`}>
            <Sparkles className="w-6 h-6" />
          </button>
          
          <button onClick={() => navigate('/rituais')} className={`flex flex-col items-center gap-1 ${isActive('/rituais') ? 'text-mystic-cyan' : 'text-white/40'}`}>
            <CheckSquare className="w-6 h-6" />
          </button>

          {/* Botão Central INVOCAÇÃO */}
          <div className="relative -top-6">
            <button onClick={() => navigate('/invocar')} className="w-16 h-16 rounded-full bg-gradient-to-br from-mystic-arcane to-mystic-purple border-2 border-mystic-cyan/50 shadow-glow-arcane flex items-center justify-center text-white hover:scale-105 active:scale-95 transition-transform">
              <Plus className="w-8 h-8" />
            </button>
          </div>

          <button onClick={() => navigate('/grimorio')} className={`flex flex-col items-center gap-1 ${isActive('/grimorio') ? 'text-mystic-cyan' : 'text-white/40'}`}>
            <Library className="w-6 h-6" />
          </button>

          <button onClick={() => setMoreOpen(true)} className="flex flex-col items-center gap-1 text-white/40">
            <LayoutGrid className="w-6 h-6" />
          </button>

        </div>
      </nav>

      {/* Menu "Mais" Drawer */}
      <AnimatePresence>
        {moreOpen && (
          <div className="md:hidden fixed inset-0 z-[60]">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMoreOpen(false)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 300 }} className="absolute bottom-0 w-full glass-card rounded-b-none p-6 pb-12">
              <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-6" />
              <div className="grid grid-cols-3 gap-4">
                {[
                  { id: 'ciclos', label: 'Ciclos', icon: Flame, path: '/ciclos' },
                  { id: 'jornadas', label: 'Jornadas', icon: Swords, path: '/jornadas' },
                  { id: 'grandes-obras', label: 'Obras', icon: Mountain, path: '/grandes-obras' },
                  { id: 'temporal', label: 'Temporal', icon: Calendar, path: '/temporal/semana' },
                  { id: 'cassino', label: 'Cassino', icon: Dice6, path: '/cassino-arcano' },
                  { id: 'dominios', label: 'Domínios', icon: Globe, path: '/dominios' }
                ].map(item => (
                  <button key={item.id} onClick={() => { setMoreOpen(false); navigate(item.path); }} className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 text-white/80">
                    <item.icon className="w-6 h-6 text-mystic-gold" />
                    <span className="text-[11px] font-bold">{item.label}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
