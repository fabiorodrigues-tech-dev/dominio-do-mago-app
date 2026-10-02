import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Map, 
  Target, 
  ChevronRight, 
  Trophy, 
  Calendar,
  Clock,
  CheckCircle2,
  Circle,
  Flame,
  Droplets,
  Mountain,
  Wind,
  Route,
  Gift
} from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { useAppStore } from '@/stores/appStore';
import { ELEMENTS, getAreaById } from '@/constants';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Quest, ElementId } from '@/types';

export const Jornadas: React.FC = () => {
  const { quests, addQuest } = useAppStore();
  const [activeTab, setActiveTab] = useState('active');
  const [selectedQuest, setSelectedQuest] = useState<Quest | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showCreateQuest, setShowCreateQuest] = useState(false);
  const [newQuestTitle, setNewQuestTitle] = useState('');

  const activeQuests = quests.filter(q => !q.isCompleted);
  const completedQuests = quests.filter(q => q.isCompleted);

  const filteredQuests = activeTab === 'active' ? activeQuests : completedQuests;

  // Get element icon
  const getElementIcon = (elementId: ElementId) => {
    switch (elementId) {
      case 'terra': return <Mountain className="w-5 h-5" />;
      case 'fogo': return <Flame className="w-5 h-5" />;
      case 'agua': return <Droplets className="w-5 h-5" />;
      case 'ar': return <Wind className="w-5 h-5" />;
    }
  };

  // Open quest detail
  const openQuestDetail = (quest: Quest) => {
    setSelectedQuest(quest);
    setShowDetail(true);
  };

  // Create new quest
  const handleCreateQuest = () => {
    if (!newQuestTitle.trim()) return;
    
    addQuest({ title: newQuestTitle.trim() });
    
    setNewQuestTitle('');
    setShowCreateQuest(false);
  };

  return (
    <AppLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-mystic text-xl">Jornadas</h2>
          <p className="text-sm text-white/50">
            {activeQuests.length} ativas • {completedQuests.length} concluídas
          </p>
        </div>
        <Button 
          onClick={() => setShowCreateQuest(true)}
          className="bg-mystic-arcane hover:bg-mystic-arcane/80"
        >
          <Plus className="w-4 h-4 mr-1" />
          Nova
        </Button>
      </div>

      {/* Map Visualization */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-mystic-purple/60 to-void/90 
                  border border-white/10 p-5 mb-6"
      >
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
              <path d="M 10 0 L 0 0 0 10" fill="none" stroke="currentColor" strokeWidth="0.5"/>
            </pattern>
            <rect width="100" height="100" fill="url(#grid)" />
          </svg>
        </div>
        
        {/* Map route visualization */}
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-4">
            <Route className="w-5 h-5 text-mystic-gold" />
            <h3 className="font-mystic text-sm text-mystic-gold">Mapa de Jornadas</h3>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-mystic-gold/20 flex items-center justify-center mb-1">
                <span className="text-xl">🌟</span>
              </div>
              <p className="text-[10px] text-white/50">Início</p>
            </div>
            
            {/* Path */}
            <div className="flex-1 mx-4 relative">
              <div className="h-1 bg-white/10 rounded-full">
                <div 
                  className="h-full bg-gradient-to-r from-mystic-gold via-mystic-arcane to-mystic-gold rounded-full"
                  style={{ width: `${quests.length > 0 ? (completedQuests.length / quests.length) * 100 : 0}%` }}
                />
              </div>
              
              {/* Waypoints */}
              <div className="flex justify-between mt-2">
                {quests.slice(0, 5).map((quest, i) => (
                  <motion.div
                    key={quest.id}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: i * 0.1 }}
                    className={`w-3 h-3 rounded-full ${
                      quest.isCompleted ? 'bg-mystic-gold' : 'bg-white/30'
                    }`}
                  />
                ))}
              </div>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-mystic-gold/20 flex items-center justify-center mb-1">
                <span className="text-xl">🏆</span>
              </div>
              <p className="text-[10px] text-white/50">Meta</p>
            </div>
          </div>
          
          <div className="mt-4 text-center">
            <p className="text-sm text-white/60">
              {completedQuests.length} de {quests.length} jornadas completadas
            </p>
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-4">
        <TabsList className="grid w-full grid-cols-2 bg-white/5">
          <TabsTrigger value="active" className="data-[state=active]:bg-mystic-arcane">
            <Map className="w-4 h-4 mr-1" />
            Ativas ({activeQuests.length})
          </TabsTrigger>
          <TabsTrigger value="completed" className="data-[state=active]:bg-mystic-arcane">
            <Trophy className="w-4 h-4 mr-1" />
            Concluídas ({completedQuests.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-4">
          <AnimatePresence mode="popLayout">
            {filteredQuests.length > 0 ? (
              <div className="space-y-4">
                {filteredQuests.map((quest, index) => (
                  <QuestCard 
                    key={quest.id} 
                    quest={quest}
                    index={index}
                    onClick={() => openQuestDetail(quest)}
                  />
                ))}
              </div>
            ) : (
              <EmptyState type="active" onCreate={() => setShowCreateQuest(true)} />
            )}
          </AnimatePresence>
        </TabsContent>

        <TabsContent value="completed" className="mt-4">
          <AnimatePresence mode="popLayout">
            {filteredQuests.length > 0 ? (
              <div className="space-y-4">
                {filteredQuests.map((quest, index) => (
                  <QuestCard 
                    key={quest.id} 
                    quest={quest}
                    index={index}
                    completed
                    onClick={() => openQuestDetail(quest)}
                  />
                ))}
              </div>
            ) : (
              <EmptyState type="completed" />
            )}
          </AnimatePresence>
        </TabsContent>
      </Tabs>

      {/* Quest Detail Modal */}
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="bg-mystic-purple border-white/20 max-w-md max-h-[80vh] overflow-y-auto">
          {selectedQuest && (
            <>
              <DialogHeader>
                <div className="text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="text-5xl mb-2"
                  >
                    {ELEMENTS[selectedQuest.elementId].icon}
                  </motion.div>
                  <DialogTitle className="font-mystic text-xl">
                    {selectedQuest.title}
                  </DialogTitle>
                </div>
              </DialogHeader>
              
              <div className="space-y-4 p-4">
                {/* Description */}
                {selectedQuest.description && (
                  <p className="text-sm text-white/70 text-center">
                    {selectedQuest.description}
                  </p>
                )}
                
                {/* Info badges */}
                <div className="flex flex-wrap justify-center gap-2">
                  {selectedQuest.areaId && (
                    <Badge variant="outline" className="bg-white/5">
                      {getAreaById(selectedQuest.areaId)?.name}
                    </Badge>
                  )}
                  <Badge variant="outline" className="bg-white/5">
                    {getElementIcon(selectedQuest.elementId)}
                    <span className="ml-1">{ELEMENTS[selectedQuest.elementId].name}</span>
                  </Badge>
                  {selectedQuest.dueDate && (
                    <Badge variant="outline" className="bg-white/5">
                      <Calendar className="w-3 h-3 mr-1" />
                      Até {new Date(selectedQuest.dueDate).toLocaleDateString('pt-BR')}
                    </Badge>
                  )}
                </div>
                
                {/* Progress */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/50">Progresso</span>
                    <span className="text-mystic-gold">{selectedQuest.progress}%</span>
                  </div>
                  <Progress value={selectedQuest.progress} className="h-2" />
                </div>
                
                {/* Tasks */}
                {selectedQuest.tasks.length > 0 && (
                  <div>
                    <h4 className="font-mystic text-sm mb-2">Rituais</h4>
                    <div className="space-y-2">
                      {selectedQuest.tasks.map((task) => (
                        <div 
                          key={task.id}
                          className={`flex items-center gap-2 p-2 rounded-lg ${
                            task.isCompleted ? 'bg-mystic-gold/10' : 'bg-white/5'
                          }`}
                        >
                          {task.isCompleted ? (
                            <CheckCircle2 className="w-4 h-4 text-mystic-gold" />
                          ) : (
                            <Circle className="w-4 h-4 text-white/30" />
                          )}
                          <span className={`text-sm ${task.isCompleted ? 'line-through text-white/50' : ''}`}>
                            {task.title}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Habits */}
                {selectedQuest.habits.length > 0 && (
                  <div>
                    <h4 className="font-mystic text-sm mb-2">Ciclos</h4>
                    <div className="space-y-2">
                      {selectedQuest.habits.map((habit) => (
                        <div 
                          key={habit.id}
                          className="flex items-center gap-2 p-2 rounded-lg bg-white/5"
                        >
                          <div className="w-4 h-4 rounded-full bg-mystic-arcane/30 flex items-center justify-center">
                            <span className="text-[10px]">{habit.streak}</span>
                          </div>
                          <span className="text-sm">{(habit as any).name || habit.title}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Reward */}
                {selectedQuest.reward && (
                  <div className="p-3 rounded-xl bg-mystic-gold/10 border border-mystic-gold/30">
                    <div className="flex items-center gap-2 mb-1">
                      <Gift className="w-4 h-4 text-mystic-gold" />
                      <span className="text-sm font-medium text-mystic-gold">Recompensa</span>
                    </div>
                    <p className="text-sm text-white/70">{selectedQuest.reward}</p>
                  </div>
                )}
                
                {/* XP Bonus */}
                {selectedQuest.xpBonus > 0 && (
                  <div className="text-center">
                    <Badge className="bg-mystic-arcane/20 text-mystic-arcane">
                      +{selectedQuest.xpBonus} XP ao completar
                    </Badge>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Quest Dialog */}
      <Dialog open={showCreateQuest} onOpenChange={setShowCreateQuest}>
        <DialogContent className="bg-mystic-purple border-white/20 max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-mystic text-center">Nova Jornada</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 p-4">
            <input
              type="text"
              value={newQuestTitle}
              onChange={(e) => setNewQuestTitle(e.target.value)}
              placeholder="Nome da Jornada..."
              className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm focus:outline-none focus:border-mystic-arcane"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateQuest();
                if (e.key === 'Escape') setShowCreateQuest(false);
              }}
            />
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setShowCreateQuest(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleCreateQuest}
                className="flex-1 bg-mystic-arcane hover:bg-mystic-arcane/80"
              >
                Criar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

interface QuestCardProps {
  quest: Quest;
  index: number;
  completed?: boolean;
  onClick?: () => void;
}

const QuestCard: React.FC<QuestCardProps> = ({ quest, index, completed, onClick }) => {
  const element = ELEMENTS[quest.elementId];
  const area = quest.areaId ? getAreaById(quest.areaId) : null;
  const totalItems = quest.tasks.length + quest.habits.length;
  const completedItems = quest.tasks.filter(t => t.isCompleted).length + 
                         quest.habits.filter(h => h.isCompleted).length;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ scale: 1.01 }}
      onClick={onClick}
      className={`relative p-4 rounded-2xl border cursor-pointer transition-all ${
        completed 
          ? 'bg-mystic-gold/5 border-mystic-gold/20' 
          : 'bg-white/5 border-white/10 hover:border-white/20'
      }`}
    >
      {/* Path connector */}
      {!completed && (
        <div className="absolute -left-4 top-1/2 w-4 h-0.5 bg-gradient-to-r from-mystic-gold/50 to-transparent" />
      )}
      
      <div className="flex items-start gap-3">
        {/* Element icon */}
        <div 
          className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${element.color}30` }}
        >
          <span className="text-2xl">{element.icon}</span>
        </div>

        <div className="flex-1 min-w-0">
          {/* Title and status */}
          <div className="flex items-start justify-between">
            <div>
              <h4 className={`font-medium ${completed ? 'line-through text-white/50' : 'text-white'}`}>
                {quest.title}
              </h4>
              {quest.description && (
                <p className="text-xs text-white/40 mt-0.5 line-clamp-1">{quest.description}</p>
              )}
            </div>
            
            {completed && (
              <Trophy className="w-5 h-5 text-mystic-gold" />
            )}
          </div>

          {/* Badges */}
          <div className="flex flex-wrap items-center gap-2 mt-2">
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
              <Target className="w-3 h-3 mr-1" />
              {completedItems}/{totalItems} itens
            </Badge>
            
            {quest.dueDate && (
              <Badge variant="outline" className="bg-white/5 text-[10px]">
                <Clock className="w-3 h-3 mr-1" />
                {new Date(quest.dueDate).toLocaleDateString('pt-BR')}
              </Badge>
            )}
          </div>

          {/* Progress */}
          <div className="mt-3">
            <div className="h-1.5 bg-black/30 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${quest.progress}%` }}
                transition={{ duration: 0.5 }}
                className="h-full rounded-full"
                style={{ 
                  background: `linear-gradient(90deg, ${element.color}, ${element.lightColor})` 
                }}
              />
            </div>
          </div>

          {/* Reward */}
          {quest.reward && (
            <div className="mt-2 flex items-center gap-1 text-xs text-mystic-gold">
              <Gift className="w-3 h-3" />
              {quest.reward}
            </div>
          )}
        </div>

        <ChevronRight className="w-5 h-5 text-white/30" />
      </div>
    </motion.div>
  );
};

interface EmptyStateProps {
  type: 'active' | 'completed';
  onCreate?: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({ type, onCreate }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="glass-card p-8 text-center"
  >
    <div className="text-4xl mb-3">{type === 'active' ? '🗺️' : '🏆'}</div>
    <h3 className="font-mystic text-lg mb-2">
      {type === 'active' ? 'Nenhuma jornada ativa' : 'Nenhuma jornada concluída'}
    </h3>
    <p className="text-white/50 text-sm mb-4">
      {type === 'active' 
        ? 'Comece uma nova jornada para desafiar-se!' 
        : 'Complete jornadas para vê-las aqui.'}
    </p>
    {type === 'active' && onCreate && (
      <Button onClick={onCreate}>
        <Plus className="w-4 h-4 mr-2" />
        Nova Jornada
      </Button>
    )}
  </motion.div>
);
