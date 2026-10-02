import React, { useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, AlertCircle, Lightbulb, Zap, Wind, Clock } from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getCalisteniaExerciseById } from '@/constants/calistenia-exercises';

export const CalisteniaExerciseDetail: React.FC = () => {
  const navigate = useNavigate();
  const { exerciseId } = useParams<{ exerciseId: string }>();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [exerciseId]);

  const exercise = useMemo(() => {
    return exerciseId ? getCalisteniaExerciseById(exerciseId) : undefined;
  }, [exerciseId]);

  if (!exercise) {
    return (
      <AppLayout>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center min-h-96"
        >
          <AlertCircle className="w-12 h-12 text-mystic-gold mb-4" />
          <h2 className="text-xl font-mystic mb-2">Exercício não encontrado</h2>
          <Button
            variant="outline"
            onClick={() => navigate('/dominios/calistenia')}
          >
            Voltar para Calistenia
          </Button>
        </motion.div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <Button
          variant="outline"
          size="icon"
          className="border-white/20 mb-4"
          onClick={() => navigate('/dominios/calistenia')}
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>

        <div className="mb-4">
          <h1 className="font-mystic text-3xl mb-1">{exercise.namePt}</h1>
          <p className="text-lg text-mystic-gold">{exercise.category}</p>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          <Badge variant="outline" className="bg-mystic-purple/10 text-mystic-purple border-mystic-purple/40">
            {exercise.category}
          </Badge>
          <Badge
            variant="outline"
            className={
              exercise.level === 'Intermediário'
                ? 'bg-orange-500/10 text-orange-300 border-orange-400/40'
                : 'bg-emerald-500/10 text-emerald-300 border-emerald-400/40'
            }
          >
            {exercise.level}
          </Badge>
          {exercise.duration && (
            <Badge variant="outline" className="bg-white/5 text-white/70 border-white/20 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {exercise.duration}
            </Badge>
          )}
        </div>
      </motion.div>

      <div className="space-y-4">
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-2xl border border-white/10 bg-black/20 p-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="w-5 h-5 text-mystic-gold" />
            <h3 className="font-mystic text-lg">Benefícios</h3>
          </div>
          <ul className="space-y-2">
            {exercise.benefits.map((benefit, idx) => (
              <li key={idx} className="flex gap-2 text-white/80">
                <span className="text-mystic-gold mt-1">•</span>
                <span>{benefit}</span>
              </li>
            ))}
          </ul>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="rounded-2xl border border-white/10 bg-black/20 p-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-5 h-5 text-mystic-gold" />
            <h3 className="font-mystic text-lg">Execução Técnica</h3>
          </div>
          <ul className="space-y-2">
            {exercise.technique.map((point, idx) => (
              <li key={idx} className="flex gap-2 text-white/80">
                <span className="text-mystic-gold mt-1">•</span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.11 }}
          className="rounded-2xl border border-white/10 bg-black/20 p-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <Wind className="w-5 h-5 text-mystic-gold" />
            <h3 className="font-mystic text-lg">Respiração</h3>
          </div>
          <p className="text-white/80">{exercise.breathing}</p>
        </motion.section>

        {exercise.contraindications && exercise.contraindications.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.14 }}
            className="rounded-2xl border border-orange-500/20 bg-orange-500/5 p-4"
          >
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="w-5 h-5 text-orange-400" />
              <h3 className="font-mystic text-lg text-orange-300">Contraindicações</h3>
            </div>
            <ul className="space-y-2">
              {exercise.contraindications.map((contraindication, idx) => (
                <li key={idx} className="flex gap-2 text-orange-200/80">
                  <span className="text-orange-400 mt-1">⚠</span>
                  <span>{contraindication}</span>
                </li>
              ))}
            </ul>
          </motion.section>
        )}

        {exercise.variations && exercise.variations.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.17 }}
            className="rounded-2xl border border-white/10 bg-black/20 p-4"
          >
            <h3 className="font-mystic text-lg mb-3">Progressões / Variações</h3>
            <div className="space-y-2">
              {exercise.variations.map((variation, idx) => (
                <div key={idx} className="flex gap-2 items-start">
                  <Badge variant="outline" className="text-[10px] bg-mystic-gold/20 text-mystic-gold border-mystic-gold/40 shrink-0 mt-0.5">
                    {idx + 1}
                  </Badge>
                  <span className="text-white/80">{variation}</span>
                </div>
              ))}
            </div>
          </motion.section>
        )}
      </div>

      <div className="mt-6 pb-4">
        <Button
          className="w-full"
          onClick={() => navigate('/dominios/calistenia')}
        >
          Voltar à Biblioteca de Exercícios
        </Button>
      </div>
    </AppLayout>
  );
};
