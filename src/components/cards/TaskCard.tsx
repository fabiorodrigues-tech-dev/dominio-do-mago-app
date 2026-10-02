import React from 'react';
import { motion } from 'framer-motion';
import { Play, Check, Clock, ChevronRight, MoreVertical } from 'lucide-react';
import type { Task } from '@/types';
import { ELEMENTS, getAreaById } from '@/constants';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface TaskCardProps {
  task: Task;
  onStart?: () => void;
  onComplete?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onClick?: () => void;
  compact?: boolean;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onStart,
  onComplete,
  onEdit,
  onDelete,
  onClick,
  compact = false,
}) => {
  const element = ELEMENTS[task.elementId];
  const area = task.areaPrimaryId ? getAreaById(task.areaPrimaryId) : null;
  const effortLevel = task.effortLevel || 1;

  const baseValue = task.baseValue || 1;
  const effortMultiplier = [1, 1.2, 1.5, 2, 2.8][effortLevel - 1];
  const totalPoints = Math.round(baseValue * effortMultiplier);

  if (compact) {
    return (
      <motion.div
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        onClick={onClick}
        className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 
                   hover:border-white/20 transition-colors cursor-pointer"
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            onComplete?.();
          }}
          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center
                     transition-colors ${
            task.isCompleted
              ? 'bg-mystic-gold border-mystic-gold'
              : 'border-white/30 hover:border-white/50'
          }`}
        >
          {task.isCompleted && <Check className="w-3 h-3 text-black" />}
        </button>
        
        <div className="flex-1 min-w-0">
          <p className={`text-sm truncate ${task.isCompleted ? 'line-through text-white/40' : 'text-white'}`}>
            {task.title}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            {area && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full" 
                    style={{ backgroundColor: `${area.color}30`, color: area.color }}>
                {area.name}
              </span>
            )}
            <span className="text-[10px] text-mystic-gold">+{totalPoints}</span>
          </div>
        </div>
        
        <span className="text-lg opacity-60">{element.icon}</span>
      </motion.div>
    );
  }

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
      {/* Header with badges */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex flex-wrap gap-2">
          {/* Points badge */}
          <Badge 
            variant="outline" 
            className="bg-mystic-gold/10 border-mystic-gold/30 text-mystic-gold text-xs"
          >
            +{totalPoints}
          </Badge>
          
          {/* Area badge */}
          {area && (
            <Badge 
              variant="outline"
              className="text-xs"
              style={{ 
                backgroundColor: `${area.color}15`, 
                borderColor: `${area.color}40`,
                color: area.color 
              }}
            >
              {area.name}
            </Badge>
          )}
          
          {/* Time badge */}
          {task.plannedTimeMinutes && (
            <Badge variant="outline" className="bg-white/5 text-white/60 text-xs">
              <Clock className="w-3 h-3 mr-1" />
              {task.plannedTimeMinutes}min
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-1">
          <span className="text-lg opacity-60">{element.icon}</span>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-mystic-purple border-white/10">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit?.(); }}>
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete?.(); }}
                               className="text-red-400">
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Title */}
      <p className={`font-medium mb-1 ${task.isCompleted ? 'line-through text-white/40' : 'text-white'}`}>
        {task.title}
      </p>
      
      {/* Description */}
      {task.description && (
        <p className="text-sm text-white/50 mb-3 line-clamp-2">{task.description}</p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-4">
        <div className="flex items-center gap-3">
          {/* Effort indicator */}
          <span className="text-xs text-white/40">
            Esforço: <span className="text-white/60">{effortLevel}/5</span>
          </span>
          
          {/* Subtasks count */}
          {task.childItems && task.childItems.length > 0 && (
            <span className="text-xs text-white/40">
              {task.childItems.filter(c => c.isCompleted).length}/{task.childItems.length} itens
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {!task.isCompleted && onStart && (
            <Button
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onStart();
              }}
              className="bg-mystic-arcane hover:bg-mystic-arcane/80 text-white"
            >
              <Play className="w-4 h-4 mr-1" />
              Iniciar
            </Button>
          )}
          
          {!task.isCompleted && onComplete && (
            <Button
              size="icon"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                onComplete();
              }}
              className="border-white/20 hover:bg-white/10"
            >
              <Check className="w-4 h-4" />
            </Button>
          )}
          
          <ChevronRight className="w-5 h-5 text-white/30" />
        </div>
      </div>

      {/* Progress indicator for in-progress tasks */}
      {task.isInProgress && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute top-0 left-0 right-0 h-0.5 bg-mystic-arcane/30"
        >
          <motion.div
            animate={{ x: ['-100%', '100%'] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
            className="h-full w-1/3 bg-mystic-arcane"
          />
        </motion.div>
      )}
    </motion.div>
  );
};
