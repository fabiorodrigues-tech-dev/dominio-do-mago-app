import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Leaf, Sparkles, ChevronRight, Image } from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { YOGA_POSES, GROUP_ORDER } from '@/constants/yoga-poses';
import {
  getYogaIllustrationThumbSrc,
  getYogaIllustrationFallbackSrc,
} from '@/constants/yoga-image-prompts';

export const Yoga: React.FC = () => {
  const navigate = useNavigate();

  const grouped = GROUP_ORDER.map((group) => ({
    group,
    poses: YOGA_POSES.filter((pose) => pose.family === group),
  })).filter((entry) => entry.poses.length > 0);

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
            <h2 className="font-mystic text-xl">Yoga</h2>
            <p className="text-sm text-white/55">Subárea de Exercício Físico</p>
          </div>
        </div>

        <Badge variant="outline" className="bg-mystic-gold/10 text-mystic-gold border-mystic-gold/40">
          {YOGA_POSES.length} posturas pré-criadas
        </Badge>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="rounded-2xl border border-white/10 bg-white/5 p-4 mb-4"
      >
        <div className="flex items-start gap-3">
          <Leaf className="w-5 h-5 text-mystic-gold mt-0.5" />
          <div>
            <h3 className="font-medium text-white">Representação da prática</h3>
            <p className="text-sm text-white/65 mt-1">
              As posturas abaixo estão organizadas por famílias clássicas de asana para representar melhor a progressão da Yoga:
              base em pé, equilíbrio, flexões, extensões, torções, abertura de quadris e relaxamento final.
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
              {entry.poses.map((pose) => (
                <motion.button
                  key={pose.id}
                  onClick={() => navigate(`/dominios/yoga/${pose.id}`)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left transition-all hover:border-mystic-gold/40 hover:bg-white/8 cursor-pointer group"
                >
                  <div className="mb-2 rounded-lg overflow-hidden border border-white/10 bg-black/30 h-24 relative">
                    <picture>
                      <source srcSet={getYogaIllustrationThumbSrc(pose.id)} type="image/webp" />
                      <img
                        src={getYogaIllustrationFallbackSrc(pose.id)}
                        alt={`Ilustração da postura ${pose.namePt}`}
                        className="w-full h-full object-cover object-[50%_18%]"
                        loading="lazy"
                        decoding="async"
                        onError={(event) => {
                          const img = event.currentTarget;
                          img.style.display = 'none';
                          const fallback = img.parentElement?.nextElementSibling as HTMLDivElement | null;
                          if (fallback) {
                            fallback.style.display = 'flex';
                          }
                        }}
                      />
                    </picture>
                    <div className="hidden absolute inset-0 items-center justify-center bg-gradient-to-br from-mystic-arcane/25 via-mystic-purple/20 to-mystic-gold/10">
                      <div className="text-center px-3">
                        <Image className="w-5 h-5 text-mystic-gold/80 mx-auto mb-1" />
                        <p className="text-[10px] text-white/65">Adicione em public/yoga/poses/thumb/{pose.id}.webp</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-white font-medium group-hover:text-mystic-gold transition-colors">{pose.namePt}</p>
                      <p className="text-xs text-white/50 truncate">{pose.nameSanskrit}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Badge
                        variant="outline"
                        className={pose.level === 'Intermediário'
                          ? 'text-[10px] border-orange-400/40 text-orange-300 bg-orange-500/10'
                          : 'text-[10px] border-emerald-400/40 text-emerald-300 bg-emerald-500/10'}
                      >
                        {pose.level}
                      </Badge>
                      <ChevronRight className="w-4 h-4 text-white/30 group-hover:text-mystic-gold/60 transition-colors" />
                    </div>
                  </div>
                  <p className="text-[11px] text-white/65 mt-2">Foco: {pose.focus}</p>
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
            Sugestão de prática breve: Tadasana {'->'} Virabhadrasana II {'->'} Adho Mukha Svanasana {'->'}  
            {' '}Uttanasana {'->'} Ardha Matsyendrasana {'->'} Balasana {'->'} Savasana.
          </p>
        </div>
      </motion.div>
    </AppLayout>
  );
};
