import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, Sparkles, ChevronRight } from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CALISTENIA_EXERCISES, CALISTENIA_GROUP_ORDER } from '@/constants/calistenia-exercises';

export const Calistenia: React.FC = () => {
  const navigate = useNavigate();

  const grouped = CALISTENIA_GROUP_ORDER.map((group) => ({
    group,
    exercises: CALISTENIA_EXERCISES.filter((exercise) => exercise.category === group),
  })).filter((entry) => entry.exercises.length > 0);

  return (
    <AppLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-4"
      >
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            className="border-white/20"
            onClick={() => navigate('/dominios/area-saude')}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h2 className="font-mystic text-xl">Calistenia</h2>
            <p className="text-sm text-white/55">Subárea de Exercício Físico</p>
          </div>
        </div>

        <Badge variant="outline" className="bg-mystic-gold/10 text-mystic-gold border-mystic-gold/40">
          {CALISTENIA_EXERCISES.length} exercícios pré-criados
        </Badge>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="rounded-2xl border border-white/10 bg-white/5 p-4 mb-4"
      >
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-mystic-gold mt-0.5" />
          <div>
            <h3 className="font-medium text-white">Estrutura de treino</h3>
            <p className="text-sm text-white/65 mt-1">
              Os exercícios estão organizados por subdivisões funcionais da calistenia: empurrar, puxar, pernas,
              core, isometrias/skills e condicionamento.
            </p>
          </div>
        </div>
      </motion.div>

      <div className="space-y-3">
        {grouped.map((entry, groupIndex) => (
          <motion.section
            key={entry.group}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 + groupIndex * 0.03 }}
            className="rounded-2xl border border-white/10 bg-black/20 p-4"
          >
            <h3 className="font-mystic text-base mb-3">{entry.group}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {entry.exercises.map((exercise) => (
                <motion.button
                  key={exercise.id}
                  onClick={() => navigate(`/dominios/calistenia/${exercise.id}`)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left transition-all hover:border-mystic-gold/40 hover:bg-white/8 cursor-pointer group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-white font-medium group-hover:text-mystic-gold transition-colors">
                        {exercise.namePt}
                      </p>
                      <p className="text-xs text-white/50 truncate">{exercise.category}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Badge
                        variant="outline"
                        className={exercise.level === 'Intermediário'
                          ? 'text-[10px] border-orange-400/40 text-orange-300 bg-orange-500/10'
                          : 'text-[10px] border-emerald-400/40 text-emerald-300 bg-emerald-500/10'}
                      >
                        {exercise.level}
                      </Badge>
                      <ChevronRight className="w-4 h-4 text-white/30 group-hover:text-mystic-gold/60 transition-colors" />
                    </div>
                  </div>
                  <p className="text-[11px] text-white/65 mt-2">Foco: {exercise.focus}</p>
                </motion.button>
              ))}
            </div>
          </motion.section>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="rounded-2xl border border-white/10 bg-white/5 p-4 mt-4"
      >
        <div className="flex items-start gap-2 text-white/70 text-sm">
          <Sparkles className="w-4 h-4 text-mystic-gold mt-0.5" />
          <p>
            Sugestão de sessão: Aquecimento {'->'} Empurrar {'->'} Puxar {'->'} Pernas {'->'} Core {'->'}
            {' '}Isometrias {'->'} Volta à calma.
          </p>
        </div>
      </motion.div>
    </AppLayout>
  );
};
