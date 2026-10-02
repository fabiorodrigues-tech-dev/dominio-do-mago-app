import React from 'react';
import { motion } from 'framer-motion';
import type { ElementId } from '@/types';
import { ELEMENTS } from '@/constants';

interface ElementCardProps {
  elementId: ElementId;
  score: number;
  percentage: number;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
}

export const ElementCard: React.FC<ElementCardProps> = ({
  elementId,
  score,
  percentage,
  onClick,
  size = 'md',
}) => {
  const element = ELEMENTS[elementId];
  
  const sizeClasses = {
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-5',
  };

  const iconSizes = {
    sm: 'text-2xl',
    md: 'text-3xl',
    lg: 'text-4xl',
  };

  const titleSizes = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`
        relative overflow-hidden rounded-2xl cursor-pointer
        border border-white/10 transition-all duration-300
        ${sizeClasses[size]}
      `}
      style={{
        background: `linear-gradient(135deg, ${element.color}15 0%, rgba(26, 16, 37, 0.9) 100%)`,
      }}
    >
      {/* Glow effect */}
      <motion.div
        animate={{
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{ duration: 3, repeat: Infinity }}
        className="absolute inset-0 rounded-2xl"
        style={{
          boxShadow: `inset 0 0 30px ${element.glow}`,
        }}
      />

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className={iconSizes[size]}>{element.icon}</div>
          <div className="text-right">
            <div className="text-mystic-gold font-bold text-lg">
              {score.toLocaleString()}
            </div>
            <div className="text-white/40 text-xs">pts</div>
          </div>
        </div>

        {/* Title */}
        <h3 className={`font-mystic ${titleSizes[size]} mb-1 text-white`}>
          {element.name}
        </h3>
        <p className="text-xs text-white/50 mb-3">{element.domain}</p>

        {/* Progress bar */}
        <div className="relative">
          <div className="h-1.5 bg-black/30 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${percentage}%` }}
              transition={{ duration: 1, delay: 0.2 }}
              className="h-full rounded-full"
              style={{
                background: `linear-gradient(90deg, ${element.color}, ${element.lightColor})`,
              }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[10px] text-white/40">{percentage}%</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
