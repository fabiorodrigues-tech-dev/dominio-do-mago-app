import React from 'react';
import { motion } from 'framer-motion';
import type { Area } from '@/types';
import { ELEMENTS } from '@/constants';

interface AreaCardProps {
  area: Area;
  score?: number;
  taskCount?: number;
  onClick?: () => void;
  compact?: boolean;
}

export const AreaCard: React.FC<AreaCardProps> = ({
  area,
  score = 0,
  taskCount = 0,
  onClick,
  compact = false,
}) => {
  const element = ELEMENTS[area.elementId];

  if (compact) {
    return (
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onClick}
        className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 
                   hover:border-white/20 transition-colors cursor-pointer"
      >
        <div 
          className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
          style={{ backgroundColor: `${area.color}20` }}
        >
          {element.icon}
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">{area.name}</p>
          <p className="text-xs text-white/40">{element.name}</p>
        </div>
        
        <div className="text-right">
          <p className="text-sm font-bold text-mystic-gold">{score}</p>
          <p className="text-[10px] text-white/40">pts</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      whileHover={{ scale: 1.01, y: -2 }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      className="relative p-4 rounded-2xl overflow-hidden cursor-pointer
                 border border-white/10 hover:border-white/20 transition-all"
      style={{
        background: `linear-gradient(135deg, ${area.color}10 0%, rgba(26, 16, 37, 0.9) 100%)`,
      }}
    >
      {/* Glow effect */}
      <div 
        className="absolute inset-0 opacity-20"
        style={{
          boxShadow: `inset 0 0 40px ${element.glow}`,
        }}
      />

      <div className="relative z-10">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
              style={{ backgroundColor: `${area.color}30` }}
            >
              {element.icon}
            </div>
            
            <div>
              <h3 className="font-medium text-white">{area.name}</h3>
              <p className="text-xs text-white/50">{element.name}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-4">
            <div>
              <p className="text-2xl font-bold text-mystic-gold">{score}</p>
              <p className="text-[10px] text-white/40">pontos</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{taskCount}</p>
              <p className="text-[10px] text-white/40">rituais</p>
            </div>
          </div>
          
          <div 
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: area.color }}
          />
        </div>
      </div>
    </motion.div>
  );
};
