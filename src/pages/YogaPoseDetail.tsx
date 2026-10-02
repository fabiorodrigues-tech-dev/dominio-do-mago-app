import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, AlertCircle, Lightbulb, Zap, Wind, Clock, Copy, Check, Image } from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getPoseById } from '@/constants/yoga-poses';
import {
  getYogaIllustrationPrompts,
  getYogaIllustrationFullSrc,
  getYogaIllustrationFallbackSrc,
} from '@/constants/yoga-image-prompts';

export const YogaPoseDetail: React.FC = () => {
  const navigate = useNavigate();
  const { poseId } = useParams<{ poseId: string }>();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [poseId]);

  const pose = useMemo(() => {
    return poseId ? getPoseById(poseId) : undefined;
  }, [poseId]);

  const prompts = useMemo(() => {
    return poseId ? getYogaIllustrationPrompts(poseId) : undefined;
  }, [poseId]);

  const handleCopyPrompt = async () => {
    if (!prompts) {
      return;
    }

    const content = `${prompts.prompt}\n\nnegative prompt: ${prompts.negativePrompt}`;

    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  if (!pose) {
    return (
      <AppLayout>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center min-h-96"
        >
          <AlertCircle className="w-12 h-12 text-mystic-gold mb-4" />
          <h2 className="text-xl font-mystic mb-2">Postura não encontrada</h2>
          <Button
            variant="outline"
            onClick={() => navigate('/dominios/yoga')}
          >
            Voltar para Yoga
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
          onClick={() => navigate('/dominios/yoga')}
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>

        <div className="mb-4">
          <h1 className="font-mystic text-3xl mb-1">{pose.namePt}</h1>
          <p className="text-lg text-mystic-gold font-serif italic">{pose.nameSanskrit}</p>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          <Badge variant="outline" className="bg-mystic-purple/10 text-mystic-purple border-mystic-purple/40">
            {pose.family}
          </Badge>
          <Badge
            variant="outline"
            className={
              pose.level === 'Intermediário'
                ? 'bg-orange-500/10 text-orange-300 border-orange-400/40'
                : 'bg-emerald-500/10 text-emerald-300 border-emerald-400/40'
            }
          >
            {pose.level}
          </Badge>
          {pose.duration && (
            <Badge variant="outline" className="bg-white/5 text-white/70 border-white/20 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {pose.duration}
            </Badge>
          )}
        </div>

        <div className="rounded-2xl overflow-hidden border border-white/10 bg-black/30 h-56 sm:h-64 relative">
          <picture>
            <source srcSet={getYogaIllustrationFullSrc(pose.id)} type="image/webp" />
            <img
              src={getYogaIllustrationFallbackSrc(pose.id)}
              alt={`Ilustração da postura ${pose.namePt}`}
              className="w-full h-full object-cover"
              loading="eager"
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
          <div className="hidden absolute inset-0 items-center justify-center bg-gradient-to-br from-mystic-arcane/30 via-mystic-purple/20 to-mystic-gold/10 px-4">
            <div className="text-center">
              <Image className="w-8 h-8 text-mystic-gold/85 mx-auto mb-2" />
              <p className="text-sm text-white/70">Ilustração ainda não adicionada</p>
              <p className="text-xs text-white/55 mt-1">Use: public/yoga/poses/full/{pose.id}.webp</p>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="space-y-4">
        {prompts && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.03 }}
            className="rounded-2xl border border-mystic-gold/25 bg-mystic-gold/5 p-4"
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <h3 className="font-mystic text-lg">Prompt da Ilustração</h3>
              <Button type="button" variant="outline" size="sm" className="border-mystic-gold/40" onClick={handleCopyPrompt}>
                {copied ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
                {copied ? 'Copiado' : 'Copiar prompt'}
              </Button>
            </div>
            <p className="text-xs text-white/70 line-clamp-4">{prompts.prompt}</p>
          </motion.section>
        )}

        {/* Benefícios */}
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
            {pose.benefits.map((benefit, idx) => (
              <li key={idx} className="flex gap-2 text-white/80">
                <span className="text-mystic-gold mt-1">•</span>
                <span>{benefit}</span>
              </li>
            ))}
          </ul>
        </motion.section>

        {/* Alinhamento */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="rounded-2xl border border-white/10 bg-black/20 p-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-5 h-5 text-mystic-gold" />
            <h3 className="font-mystic text-lg">Alinhamento</h3>
          </div>
          <ul className="space-y-2">
            {pose.alignment.map((point, idx) => (
              <li key={idx} className="flex gap-2 text-white/80">
                <span className="text-mystic-gold mt-1">•</span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </motion.section>

        {/* Respiração */}
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
          <p className="text-white/80">{pose.breathing}</p>
        </motion.section>

        {/* Contraindicações */}
        {pose.contraindications && pose.contraindications.length > 0 && (
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
              {pose.contraindications.map((contraindication, idx) => (
                <li key={idx} className="flex gap-2 text-orange-200/80">
                  <span className="text-orange-400 mt-1">⚠</span>
                  <span>{contraindication}</span>
                </li>
              ))}
            </ul>
          </motion.section>
        )}

        {/* Variações */}
        {pose.variations && pose.variations.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.17 }}
            className="rounded-2xl border border-white/10 bg-black/20 p-4"
          >
            <h3 className="font-mystic text-lg mb-3">Variações</h3>
            <div className="space-y-2">
              {pose.variations.map((variation, idx) => (
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

        {/* Sugestão de Integração */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl border border-mystic-purple/20 bg-mystic-purple/5 p-4"
        >
          <h3 className="font-mystic text-lg mb-2">Integração na Prática</h3>
          <p className="text-white/80 text-sm">
            Pratique esta postura em sequências temáticas que trabalhem a mesma família de asanas.
            {' '}
            <span className="text-mystic-gold">
              {pose.family === 'Recuperação' || pose.family === 'Encerramento'
                ? 'Ideal para o encerramento de uma sessão completa.'
                : 'Combine com outras posturas da mesma família para benefícios aprofundados.'}
            </span>
          </p>
        </motion.section>
      </div>

      <div className="mt-6 pb-4">
        <Button
          className="w-full"
          onClick={() => navigate('/dominios/yoga')}
        >
          Voltar à Galeria de Posturas
        </Button>
      </div>
    </AppLayout>
  );
};
