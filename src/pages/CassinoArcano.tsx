import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dice6, Sparkles, Zap, Trophy, Flame } from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { useAppStore } from '@/stores/appStore';


export const CassinoArcano: React.FC = () => {
  const { tasks, habits, getCompletedTasksToday, addExperience } = useAppStore();
  const tasksToday = getCompletedTasksToday();
  const streak = useAppStore(s => s.user.streak);
  
  // Stamina Session State (Derivada para a sessão)
  const [spentStamina, setSpentStamina] = useState(0);
  const currentStamina = Math.max(0, Math.min(100, 60 + (tasksToday * 8)) - spentStamina);
  const spinCost = 20;

  // Colecionar atividades elegíveis
  const pendingTasks = tasks.filter(t => !t.isCompleted);
  const pendingHabits = habits.filter(h => !h.childHabits?.length && !h.completions.some(c => new Date(c.completionDate).toDateString() === new Date().toDateString()));

  // Roleta Segments (Mínimo de 8 slots para a roda ter visual legal)
  const segments = useMemo(() => {
    const items = [];
    pendingTasks.slice(0, 3).forEach(t => items.push({ id: t.id, type: 'task', title: t.title, color: '#FF6B35', reward: 50, icon: '📜' }));
    pendingHabits.slice(0, 3).forEach(h => items.push({ id: h.id, type: 'habit', title: h.name, color: '#48CAE4', reward: 30, icon: '🔄' }));
    
    // Fill if not enough pending activities
    while(items.length < 8) {
      if (items.length === 7) {
        items.push({ id: 'jackpot', type: 'jackpot', title: 'JACKPOT EXP', color: '#FFD700', reward: 500, icon: '💎' });
      } else {
        items.push({ id: `xp-${items.length}`, type: 'xp', title: '+20 XP', color: '#9D4EDD', reward: 20, icon: '✨' });
      }
    }
    return items;
  }, [pendingTasks, pendingHabits]);

  // Spin State
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState<any>(null);

  const handleSpin = () => {
    if (currentStamina < spinCost || isSpinning) return;
    
    setSpentStamina(prev => prev + spinCost);
    setIsSpinning(true);
    setResult(null);

    const prizeIndex = Math.floor(Math.random() * segments.length);
    const sliceAngle = 360 / segments.length;
    // 5 voltas completas + alinhamento do centro do slice vencedor
    const targetRotation = rotation + (360 * 5) + (360 - (prizeIndex * sliceAngle)) - (sliceAngle / 2);

    setRotation(targetRotation);

    setTimeout(() => {
      setIsSpinning(false);
      const wonItem = segments[prizeIndex];
      setResult(wonItem);
      
      // Concede XP caso tenha caído num slot de bônus
      if (wonItem.type === 'jackpot' || wonItem.type === 'xp') {
        addExperience(wonItem.reward);
      }
    }, 5000);
  };

  return (
    <AppLayout title="Cassino Arcano" hideNav={false}>
      <div className="space-y-8 max-w-2xl mx-auto flex flex-col items-center text-center">
        
        {/* Header Casino */}
        <div className="w-full glass-card p-6 shadow-glow-arcane relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-mystic-gold/10 blur-[40px] rounded-full" />
          <h2 className="font-mystic text-3xl font-bold text-glow-arcane mb-2">A Roda do Destino</h2>
          <p className="text-sm text-white/60 mb-6">Aposte Stamina para sortear sua próxima atividade ou ganhar XP massivo.</p>
          
          <div className="flex justify-center gap-6">
            <div className="text-center">
              <p className="text-2xl font-mono font-bold text-amber-400 flex items-center gap-1 justify-center"><Zap className="w-5 h-5 fill-amber-500" /> {currentStamina}</p>
              <p className="text-[10px] text-white/50 uppercase tracking-widest mt-1">Stamina Restante</p>
            </div>
            <div className="w-px bg-white/10" />
            <div className="text-center">
              <p className="text-2xl font-mono font-bold text-mystic-gold flex items-center gap-1 justify-center"><Flame className="w-5 h-5 text-orange-500" /> {streak}</p>
              <p className="text-[10px] text-white/50 uppercase tracking-widest mt-1">Streak</p>
            </div>
          </div>
        </div>

        {/* Roulette UI */}
        <div className="relative w-[300px] h-[300px] md:w-[400px] md:h-[400px]">
          {/* Ponteiro */}
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20">
            <div className="w-0 h-0 border-l-[12px] border-r-[12px] border-t-[24px] border-l-transparent border-r-transparent border-t-white drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]" />
          </div>

          <motion.div
            className="w-full h-full rounded-full border-8 border-black/80 relative overflow-hidden shadow-glow-arcane"
            animate={{ rotate: rotation }}
            transition={{ duration: 5, ease: [0.2, 0.8, 0.1, 1] }}
          >
            {/* SVG Wheel Generator */}
            <svg viewBox="0 0 100 100" className="w-full h-full rotate-[-90deg]">
              {segments.map((seg, i) => {
                const angle = 360 / segments.length;
                const offset = i * angle;
                return (
                  <g key={seg.id} transform={`rotate(${offset}, 50, 50)`}>
                    <path
                      d={`M 50 50 L 100 50 A 50 50 0 0 1 ${50 + 50 * Math.cos((angle * Math.PI) / 180)} ${50 + 50 * Math.sin((angle * Math.PI) / 180)} Z`}
                      fill={seg.color}
                      opacity={0.8}
                      stroke="#050508"
                      strokeWidth="0.5"
                    />
                    <text
                      x="85"
                      y="52"
                      fill="#FFF"
                      fontSize="5"
                      fontFamily="Inter"
                      fontWeight="bold"
                      transform={`rotate(${angle / 2}, 50, 50)`}
                      textAnchor="end"
                      className="drop-shadow-md"
                    >
                      {seg.icon}
                    </text>
                  </g>
                );
              })}
            </svg>
            <div className="absolute inset-0 bg-gradient-radial-magic opacity-40 pointer-events-none" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-black/90 rounded-full border-4 border-mystic-arcane flex items-center justify-center shadow-lg">
              <Dice6 className="w-8 h-8 text-mystic-gold animate-pulse" />
            </div>
          </motion.div>
        </div>

        <button
          onClick={handleSpin}
          disabled={isSpinning || currentStamina < spinCost}
          className={`px-10 py-4 rounded-full font-bold text-lg transition-all shadow-glass flex items-center gap-2 ${
            isSpinning || currentStamina < spinCost 
            ? 'bg-white/5 text-white/30 cursor-not-allowed border border-white/10' 
            : 'bg-gradient-to-r from-mystic-arcane to-purple-600 text-white hover:scale-105 border border-mystic-cyan/50 shadow-glow-arcane cursor-pointer'
          }`}
        >
          {isSpinning ? <Sparkles className="w-5 h-5 animate-spin" /> : <Trophy className="w-5 h-5" />}
          {isSpinning ? 'Sorteando Destino...' : `Girar Roda (Custo: ${spinCost})`}
        </button>

        {/* Result Reveal */}
        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
            >
              <div className="glass-card max-w-sm w-full p-8 text-center shadow-glow-gold border-mystic-gold/50">
                <p className="text-xs uppercase tracking-widest text-mystic-gold mb-2 font-mono">Destino Revelado</p>
                <div className="text-6xl mb-4">{result.icon}</div>
                <h3 className="font-mystic text-2xl text-white mb-2">{result.title}</h3>
                
                <div className="bg-black/40 rounded-xl p-4 my-6">
                  <p className="text-sm text-white/60 mb-1">Recompensa ao completar:</p>
                  <p className="text-3xl font-bold text-emerald-400">+{result.reward} XP</p>
                </div>
                
                <button
                  onClick={() => setResult(null)}
                  className="w-full py-3 rounded-xl bg-mystic-gold text-black font-bold hover:bg-yellow-400 transition-colors"
                >
                  Aceitar Destino
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </AppLayout>
  );
};
