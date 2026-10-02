import React from 'react';

import { useNavigate } from 'react-router-dom';
import { Sparkles, TrendingUp, Play } from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { ElementCard } from '@/components/cards';
import { useAppStore } from '@/stores/appStore';
import { Button } from '@/components/ui/button';

export const Santuario: React.FC = () => {
  const navigate = useNavigate();
  const { getElementScores, tasks, startTimer } = useAppStore();

  const elementScores = getElementScores();
  const pendingTasks = tasks.filter(t => !t.isCompleted).slice(0, 4);

  return (
    <AppLayout showAura={true}>
      <div className="space-y-8">
        
        {/* Actions Cards Premium */}
        <div className="grid grid-cols-2 gap-4">
          <button onClick={() => navigate('/invocar')} className="glass-card p-5 text-left group hover:border-mystic-cyan/50 hover:shadow-glow-arcane transition-all overflow-hidden relative">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-mystic-arcane/20 blur-[20px] rounded-full group-hover:bg-mystic-arcane/40 transition-colors" />
            <Sparkles className="w-8 h-8 text-mystic-cyan mb-4" />
            <h3 className="font-mystic font-bold text-lg text-white">Invocar Ritual</h3>
            <p className="text-xs text-white/50 mt-1">Manifeste nova magia</p>
          </button>
          
          <button onClick={() => navigate('/cassino-arcano')} className="glass-card p-5 text-left group hover:border-mystic-gold/50 hover:shadow-glow-gold transition-all overflow-hidden relative">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-mystic-gold/20 blur-[20px] rounded-full group-hover:bg-mystic-gold/40 transition-colors" />
            <TrendingUp className="w-8 h-8 text-mystic-gold mb-4" />
            <h3 className="font-mystic font-bold text-lg text-white">Cassino Arcano</h3>
            <p className="text-xs text-white/50 mt-1">A Roda do Destino</p>
          </button>
        </div>

        {/* Pending Rituais List Minimalista */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-mystic text-xl text-white">Rituais Ativos</h3>
            <Button variant="ghost" className="text-mystic-gold text-xs" onClick={() => navigate('/rituais')}>Ver todos</Button>
          </div>
          
          {pendingTasks.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {pendingTasks.map((task) => (
                <div key={task.id} className="glass-card p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                  <div className="flex-1 min-w-0 pr-4">
                    <p className="text-sm font-bold text-white truncate">{task.title}</p>
                    <p className="text-[10px] text-white/50 uppercase mt-1 tracking-wider">+ XP e Energia</p>
                  </div>
                  <button onClick={() => startTimer(task.id, 'TASK')} className="w-10 h-10 rounded-full bg-mystic-arcane text-white flex items-center justify-center hover:scale-110 transition-transform shadow-glow-arcane shrink-0">
                    <Play className="w-4 h-4 ml-0.5" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="glass-card p-8 text-center border-dashed border-white/20">
              <p className="text-3xl mb-2">✨</p>
              <p className="text-white/60 text-sm">O Santuário está limpo. Invoque um novo Ritual para progredir.</p>
            </div>
          )}
        </div>

        {/* Pilares */}
        <div>
          <h3 className="font-mystic text-xl text-white mb-4">Balanceamento Elemental</h3>
          <div className="grid grid-cols-2 gap-3">
            {elementScores.map((score) => (
              <ElementCard
                key={score.elementId}
                elementId={score.elementId}
                score={score.score}
                percentage={score.percentage}
                onClick={() => navigate('/pilares')}
              />
            ))}
          </div>
        </div>

      </div>
    </AppLayout>
  );
};
