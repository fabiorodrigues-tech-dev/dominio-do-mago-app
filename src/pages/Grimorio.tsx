import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Edit2, Trophy, Flame, Target, TrendingUp, Calendar, Award } from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { useAppStore } from '@/stores/appStore';
import { ELEMENTS, AVATARS, type ElementId } from '@/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from 'recharts';

export const Grimorio: React.FC = () => {
  const { user, updateUser, getElementScores, tasks, habits } = useAppStore();
  const [editName, setEditName] = useState(false);
  const [newName, setNewName] = useState(user.name);
  const [showAvatarDialog, setShowAvatarDialog] = useState(false);

  const elementScores = getElementScores();
  const completedTasks = tasks.filter(t => t.isCompleted).length;
  const totalTasks = tasks.length;
  const activeHabits = habits.length;
  const totalHabitCompletions = habits.reduce((acc, h) => acc + h.completions.length, 0);

  // Prepare radar chart data
  const radarData = elementScores.map(score => ({
    element: ELEMENTS[score.elementId].name,
    score: score.score,
    fullMark: Math.max(...elementScores.map(s => s.score), 100),
  }));

  const handleNameSave = () => {
    if (newName.trim()) {
      updateUser({ name: newName.trim() });
      setEditName(false);
    }
  };

  const handleAvatarSelect = (avatar: string) => {
    updateUser({ avatar });
    setShowAvatarDialog(false);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <AppLayout>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-6"
      >
        {/* Profile Header */}
        <motion.div variants={itemVariants} className="text-center">
          <motion.div
            whileHover={{ scale: 1.05 }}
            onClick={() => setShowAvatarDialog(true)}
            className="relative inline-block cursor-pointer"
          >
            <div className="text-7xl mb-2">{user.avatar}</div>
            <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-mystic-arcane 
                          flex items-center justify-center">
              <Edit2 className="w-4 h-4" />
            </div>
          </motion.div>
          
          {editName ? (
            <div className="flex items-center justify-center gap-2 mt-2">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-48 bg-white/5 border-white/10 text-center"
                autoFocus
              />
              <Button size="sm" onClick={handleNameSave}>✓</Button>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 mt-2">
              <h2 className="font-mystic text-2xl">{user.name}</h2>
              <button 
                onClick={() => setEditName(true)}
                className="text-white/40 hover:text-white"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            </div>
          )}
          
          <div className="flex items-center justify-center gap-2 mt-1">
            <Badge variant="outline" className="bg-mystic-gold/10 text-mystic-gold border-mystic-gold/30">
              <Trophy className="w-3 h-3 mr-1" />
              Nível {user.level}
            </Badge>
            <Badge variant="outline" className="bg-white/5">
              <Flame className="w-3 h-3 mr-1 text-orange-400" />
              Streak {user.streak}
            </Badge>
          </div>
        </motion.div>

        {/* XP Progress */}
        <motion.div variants={itemVariants} className="glass-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-white/60">Experiência</span>
            <span className="text-sm text-mystic-gold">
              {user.experience} / {user.experienceToNextLevel} XP
            </span>
          </div>
          <Progress 
            value={(user.experience / user.experienceToNextLevel) * 100}
            className="h-2 bg-white/10"
          />
          <p className="text-xs text-white/40 mt-2 text-center">
            Faltam {user.experienceToNextLevel - user.experience} XP para o nível {user.level + 1}
          </p>
        </motion.div>

        {/* Stats Grid */}
        <motion.div variants={itemVariants}>
          <h3 className="font-mystic text-lg mb-3">Estatísticas</h3>
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              icon={<Target className="w-5 h-5" />}
              label="Rituais"
              value={`${completedTasks}/${totalTasks}`}
              sublabel="concluídos"
            />
            <StatCard
              icon={<TrendingUp className="w-5 h-5" />}
              label="Ciclos"
              value={activeHabits.toString()}
              sublabel="ativos"
            />
            <StatCard
              icon={<Award className="w-5 h-5" />}
              label="Total"
              value={user.totalScore.toLocaleString()}
              sublabel="pontos"
            />
            <StatCard
              icon={<Calendar className="w-5 h-5" />}
              label="Completou"
              value={totalHabitCompletions.toString()}
              sublabel="hábitos"
            />
          </div>
        </motion.div>

        {/* Element Radar */}
        {radarData.some(d => d.score > 0) && (
          <motion.div variants={itemVariants}>
            <h3 className="font-mystic text-lg mb-3">Equilíbrio Elemental</h3>
            <div className="glass-card p-4">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="rgba(255,255,255,0.1)" />
                    <PolarAngleAxis 
                      dataKey="element" 
                      tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12 }}
                    />
                    <PolarRadiusAxis 
                      angle={90} 
                      domain={[0, 'auto']}
                      tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }}
                    />
                    <Radar
                      name="Pontuação"
                      dataKey="score"
                      stroke="#9D4EDD"
                      fill="#9D4EDD"
                      fillOpacity={0.3}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </motion.div>
        )}

        {/* Element Scores */}
        <motion.div variants={itemVariants}>
          <h3 className="font-mystic text-lg mb-3">Pontuação por Elemento</h3>
          <div className="space-y-2">
            {elementScores.map((score) => (
              <ElementScoreRow key={score.elementId} score={score} />
            ))}
          </div>
        </motion.div>

        {/* Join Date */}
        <motion.div variants={itemVariants} className="text-center">
          <p className="text-xs text-white/30">
            Membro desde {new Date(user.joinedAt).toLocaleDateString('pt-BR')}
          </p>
        </motion.div>
      </motion.div>

      {/* Avatar Selection Dialog */}
      <Dialog open={showAvatarDialog} onOpenChange={setShowAvatarDialog}>
        <DialogContent className="bg-mystic-purple border-white/20 max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-mystic text-center">
              Escolha seu Avatar
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-4 gap-3 p-4">
            {AVATARS.map((avatar) => (
              <motion.button
                key={avatar}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleAvatarSelect(avatar)}
                className={`text-3xl p-2 rounded-xl transition-all ${
                  user.avatar === avatar
                    ? 'bg-mystic-gold/20 border border-mystic-gold'
                    : 'hover:bg-white/10'
                }`}
              >
                {avatar}
              </motion.button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  sublabel: string;
}

const StatCard: React.FC<StatCardProps> = ({ icon, label, value, sublabel }) => (
  <div className="glass-card p-4 text-center">
    <div className="flex items-center justify-center gap-2 text-white/60 mb-2">
      {icon}
      <span className="text-sm">{label}</span>
    </div>
    <div className="text-2xl font-bold text-mystic-gold">{value}</div>
    <div className="text-xs text-white/40">{sublabel}</div>
  </div>
);

interface ElementScoreRowProps {
  score: { elementId: ElementId; score: number; percentage: number };
}

const ElementScoreRow: React.FC<ElementScoreRowProps> = ({ score }) => {
  const element = ELEMENTS[score.elementId];
  
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
      <div className="text-2xl">{element.icon}</div>
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm">{element.name}</span>
          <span className="text-sm font-bold" style={{ color: element.color }}>
            {score.score}
          </span>
        </div>
        <div className="h-1.5 bg-black/30 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${score.percentage}%` }}
            transition={{ duration: 0.5 }}
            className="h-full rounded-full"
            style={{ backgroundColor: element.color }}
          />
        </div>
      </div>
    </div>
  );
};
