import React from 'react';
import { motion } from 'framer-motion';
import { Check, Flame, Calendar } from 'lucide-react';
import type { Habit } from '@/types';
import { ELEMENTS, getAreaById } from '@/constants';
import { Badge } from '@/components/ui/badge';

interface HabitCardProps {
  habit: Habit;
  onComplete?: () => void;
  onClick?: () => void;
}

export const HabitCard: React.FC<HabitCardProps> = ({
  habit,
  onComplete,
  onClick,
}) => {
  const element = ELEMENTS[habit.elementId];
  const area = getAreaById(habit.areaId);
  
  const isCompletedToday = habit.lastCompletedAt && 
    new Date(habit.lastCompletedAt).toDateString() === new Date().toDateString();

  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      className="relative p-4 rounded-2xl bg-gradient-to-br from-white/10 to-white/5 
                 border border-white/10 hover:border-white/20 transition-all cursor-pointer"
      style={{
        boxShadow: `inset 0 1px 0 ${element.glow}`,
      }}
    >
      {/* Streak badge */}
      {habit.streak > 0 && (
        <div className="absolute -top-2 -right-2 flex items-center gap-1 px-2 py-1 
                       bg-gradient-to-r from-orange-500 to-red-500 rounded-full text-xs font-bold">
          <Flame className="w-3 h-3" />
          {habit.streak}
        </div>
      )}

      <div className="flex items-start gap-3">
        {/* Completion button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onComplete?.();
          }}
          disabled={!!isCompletedToday}
          className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0
                     transition-all ${
            isCompletedToday
              ? 'bg-mystic-gold text-black'
              : 'bg-white/10 hover:bg-white/20 text-white'
          }`}
        >
          <Check className="w-5 h-5" />
        </button>

        <div className="flex-1 min-w-0">
          {/* Title */}
          <p className="font-medium text-white mb-1">{habit.name}</p>
          
          {/* Description */}
          {habit.description && (
            <p className="text-sm text-white/50 mb-2 line-clamp-1">{habit.description}</p>
          )}

          {/* Badges */}
          <div className="flex flex-wrap items-center gap-2">
            {area && (
              <Badge 
                variant="outline"
                className="text-[10px]"
                style={{ 
                  backgroundColor: `${area.color}15`, 
                  borderColor: `${area.color}40`,
                  color: area.color 
                }}
              >
                {area.name}
              </Badge>
            )}
            
            <Badge variant="outline" className="bg-white/5 text-white/60 text-[10px]">
              <Calendar className="w-3 h-3 mr-1" />
              {habit.recurrenceType === 'DAILY' ? 'Diário' : 
               habit.recurrenceType === 'WEEKLY' ? 'Semanal' : 
               habit.recurrenceType === 'MONTHLY' ? 'Mensal' : 'Anual'}
            </Badge>
            
            <Badge variant="outline" className="bg-mystic-gold/10 text-mystic-gold text-[10px]">
              +{habit.plannedPoints} pts
            </Badge>
            
            <span className="text-lg opacity-60">{element.icon}</span>
          </div>
        </div>
      </div>

      {/* Progress bar for streak */}
      {habit.streak > 0 && (
        <div className="mt-3">
          <div className="h-1 bg-black/30 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(habit.streak * 10, 100)}%` }}
              transition={{ duration: 0.5 }}
              className="h-full rounded-full bg-gradient-to-r from-orange-500 to-red-500"
            />
          </div>
          <p className="text-[10px] text-white/40 mt-1">
            {habit.streak} dia{habit.streak !== 1 ? 's' : ''} consecutivo{habit.streak !== 1 ? 's' : ''}
          </p>
        </div>
      )}
    </motion.div>
  );
};
