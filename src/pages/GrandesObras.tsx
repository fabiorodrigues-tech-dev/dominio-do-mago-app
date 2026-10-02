import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Building2, 
  CheckCircle2, 
  Layers, 
  ChevronRight, 
  Calendar,
  Flame,
  Droplets,
  Mountain,
  Wind,
  Gift,
  FolderOpen,
  Flag
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
import type { Project, ElementId } from '@/types';

export const GrandesObras: React.FC = () => {
  const { projects, addProject, addMissionToProject } = useAppStore();
  const [activeTab, setActiveTab] = useState('active');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showAddMission, setShowAddMission] = useState(false);
  const [newMissionTitle, setNewMissionTitle] = useState('');
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [newProjectTitle, setNewProjectTitle] = useState('');

  const activeProjects = projects.filter(p => p.status === 'active');
  const completedProjects = projects.filter(p => p.status === 'completed');
  const archivedProjects = projects.filter(p => p.status === 'archived');

  // Get element icon
  const getElementIcon = (elementId: ElementId) => {
    switch (elementId) {
      case 'terra': return <Mountain className="w-5 h-5" />;
      case 'fogo': return <Flame className="w-5 h-5" />;
      case 'agua': return <Droplets className="w-5 h-5" />;
      case 'ar': return <Wind className="w-5 h-5" />;
    }
  };

  // Open project detail
  const openProjectDetail = (project: Project) => {
    setSelectedProject(project);
    setShowDetail(true);
  };

  // Add mission to project
  const handleAddMission = () => {
    if (!selectedProject || !newMissionTitle.trim()) return;
    
    addMissionToProject(selectedProject.id, {
      title: newMissionTitle.trim(),
      elementId: selectedProject.elementId,
      areaId: selectedProject.areaId,
    });
    
    setNewMissionTitle('');
    setShowAddMission(false);
    
    // Refresh project data
    const updatedProject = projects.find(p => p.id === selectedProject.id);
    if (updatedProject) {
      setSelectedProject(updatedProject);
    }
  };

  // Create new project
  const handleCreateProject = () => {
    if (!newProjectTitle.trim()) return;
    
    addProject({ title: newProjectTitle.trim() });
    
    setNewProjectTitle('');
    setShowCreateProject(false);
  };

  return (
    <AppLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-mystic text-xl">Grandes Obras</h2>
          <p className="text-sm text-white/50">
            {activeProjects.length} ativas • {completedProjects.length} concluídas
          </p>
        </div>
        <Button 
          onClick={() => setShowCreateProject(true)}
          className="bg-mystic-arcane hover:bg-mystic-arcane/80"
        >
          <Plus className="w-4 h-4 mr-1" />
          Nova
        </Button>
      </div>

      {/* Stats Overview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-3 gap-3 mb-6"
      >
        <div className="glass-card p-3 text-center">
          <div className="text-2xl font-bold text-mystic-gold">{projects.length}</div>
          <div className="text-[10px] text-white/50">Total</div>
        </div>
        <div className="glass-card p-3 text-center">
          <div className="text-2xl font-bold text-green-400">{activeProjects.length}</div>
          <div className="text-[10px] text-white/50">Ativas</div>
        </div>
        <div className="glass-card p-3 text-center">
          <div className="text-2xl font-bold text-mystic-arcane">
            {projects.reduce((acc, p) => acc + p.progress, 0) / (projects.length || 1)}%
          </div>
          <div className="text-[10px] text-white/50">Média</div>
        </div>
      </motion.div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-4">
        <TabsList className="grid w-full grid-cols-3 bg-white/5">
          <TabsTrigger value="active" className="data-[state=active]:bg-mystic-arcane">
            <Building2 className="w-4 h-4 mr-1" />
            Ativas
          </TabsTrigger>
          <TabsTrigger value="completed" className="data-[state=active]:bg-mystic-arcane">
            <CheckCircle2 className="w-4 h-4 mr-1" />
            Concluídas
          </TabsTrigger>
          <TabsTrigger value="archived" className="data-[state=active]:bg-mystic-arcane">
            <Layers className="w-4 h-4 mr-1" />
            Arquivadas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-4">
          <ProjectList 
            projects={activeProjects} 
            onSelect={openProjectDetail}
          />
        </TabsContent>

        <TabsContent value="completed" className="mt-4">
          <ProjectList 
            projects={completedProjects} 
            completed
            onSelect={openProjectDetail}
          />
        </TabsContent>

        <TabsContent value="archived" className="mt-4">
          <ProjectList 
            projects={archivedProjects} 
            archived
            onSelect={openProjectDetail}
          />
        </TabsContent>
      </Tabs>

      {/* Project Detail Modal */}
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="bg-mystic-purple border-white/20 max-w-md max-h-[80vh] overflow-y-auto">
          {selectedProject && (
            <>
              <DialogHeader>
                <div className="text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="text-5xl mb-2"
                  >
                    {ELEMENTS[selectedProject.elementId].icon}
                  </motion.div>
                  <DialogTitle className="font-mystic text-xl">
                    {selectedProject.title}
                  </DialogTitle>
                </div>
              </DialogHeader>
              
              <div className="space-y-4 p-4">
                {/* Description */}
                {selectedProject.description && (
                  <p className="text-sm text-white/70 text-center">
                    {selectedProject.description}
                  </p>
                )}
                
                {/* Info badges */}
                <div className="flex flex-wrap justify-center gap-2">
                  {selectedProject.areaId && (
                    <Badge variant="outline" className="bg-white/5">
                      {getAreaById(selectedProject.areaId)?.name}
                    </Badge>
                  )}
                  <Badge variant="outline" className="bg-white/5">
                    {getElementIcon(selectedProject.elementId)}
                    <span className="ml-1">{ELEMENTS[selectedProject.elementId].name}</span>
                  </Badge>
                  {selectedProject.dueDate && (
                    <Badge variant="outline" className="bg-white/5">
                      <Calendar className="w-3 h-3 mr-1" />
                      Até {new Date(selectedProject.dueDate).toLocaleDateString('pt-BR')}
                    </Badge>
                  )}
                </div>
                
                {/* Progress */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/50">Progresso Geral</span>
                    <span className="text-mystic-gold">{selectedProject.progress}%</span>
                  </div>
                  <Progress value={selectedProject.progress} className="h-2" />
                </div>
                
                {/* Stats */}
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="p-2 rounded-lg bg-white/5">
                    <div className="text-lg font-bold">{selectedProject.missions.length}</div>
                    <div className="text-[10px] text-white/50">Campanhas</div>
                  </div>
                  <div className="p-2 rounded-lg bg-white/5">
                    <div className="text-lg font-bold">{selectedProject.quests.length}</div>
                    <div className="text-[10px] text-white/50">Jornadas</div>
                  </div>
                  <div className="p-2 rounded-lg bg-white/5">
                    <div className="text-lg font-bold">{selectedProject.tasks.length}</div>
                    <div className="text-[10px] text-white/50">Rituais</div>
                  </div>
                  <div className="p-2 rounded-lg bg-white/5">
                    <div className="text-lg font-bold">{selectedProject.habits.length}</div>
                    <div className="text-[10px] text-white/50">Ciclos</div>
                  </div>
                </div>
                
                {/* Missions */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-mystic text-sm">Campanhas</h4>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="h-6 text-[10px]"
                      onClick={() => setShowAddMission(true)}
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Adicionar
                    </Button>
                  </div>
                  
                  {showAddMission && (
                    <div className="flex items-center gap-2 mb-2">
                      <input
                        type="text"
                        value={newMissionTitle}
                        onChange={(e) => setNewMissionTitle(e.target.value)}
                        placeholder="Nome da campanha..."
                        className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAddMission();
                          if (e.key === 'Escape') setShowAddMission(false);
                        }}
                      />
                      <Button size="sm" className="h-8" onClick={handleAddMission}>
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    {selectedProject.missions.map((mission) => (
                      <div 
                        key={mission.id}
                        className={`flex items-center gap-2 p-2 rounded-lg ${
                          mission.isCompleted ? 'bg-mystic-gold/10' : 'bg-white/5'
                        }`}
                      >
                        <Flag className={`w-4 h-4 ${mission.isCompleted ? 'text-mystic-gold' : 'text-white/30'}`} />
                        <span className={`text-sm flex-1 ${mission.isCompleted ? 'line-through text-white/50' : ''}`}>
                          {mission.title}
                        </span>
                        <div className="h-1.5 w-16 bg-black/30 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-mystic-arcane rounded-full"
                            style={{ width: `${mission.progress}%` }}
                          />
                        </div>
                      </div>
                    ))}
                    {selectedProject.missions.length === 0 && (
                      <p className="text-xs text-white/30 text-center py-2">
                        Nenhuma campanha ainda
                      </p>
                    )}
                  </div>
                </div>
                
                {/* Reward */}
                {selectedProject.reward && (
                  <div className="p-3 rounded-xl bg-mystic-gold/10 border border-mystic-gold/30">
                    <div className="flex items-center gap-2 mb-1">
                      <Gift className="w-4 h-4 text-mystic-gold" />
                      <span className="text-sm font-medium text-mystic-gold">Recompensa</span>
                    </div>
                    <p className="text-sm text-white/70">{selectedProject.reward}</p>
                  </div>
                )}
                
                {/* XP Bonus */}
                {selectedProject.xpBonus > 0 && (
                  <div className="text-center">
                    <Badge className="bg-mystic-arcane/20 text-mystic-arcane">
                      +{selectedProject.xpBonus} XP ao completar
                    </Badge>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Project Dialog */}
      <Dialog open={showCreateProject} onOpenChange={setShowCreateProject}>
        <DialogContent className="bg-mystic-purple border-white/20 max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-mystic text-center">Nova Grande Obra</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 p-4">
            <input
              type="text"
              value={newProjectTitle}
              onChange={(e) => setNewProjectTitle(e.target.value)}
              placeholder="Nome da Grande Obra..."
              className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm focus:outline-none focus:border-mystic-arcane"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateProject();
                if (e.key === 'Escape') setShowCreateProject(false);
              }}
            />
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setShowCreateProject(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleCreateProject}
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

interface ProjectListProps {
  projects: Project[];
  completed?: boolean;
  archived?: boolean;
  onSelect: (project: Project) => void;
}

const ProjectList: React.FC<ProjectListProps> = ({ projects, completed, archived, onSelect }) => {
  if (projects.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="glass-card p-8 text-center"
      >
        <div className="text-4xl mb-3">{archived ? '📦' : completed ? '✅' : '🏗️'}</div>
        <h3 className="font-mystic text-lg mb-2">
          {archived ? 'Nenhuma obra arquivada' : completed ? 'Nenhuma obra concluída' : 'Nenhuma obra ativa'}
        </h3>
        <p className="text-white/50 text-sm">
          {archived 
            ? 'Projetos arquivados aparecerão aqui.' 
            : completed 
              ? 'Complete projetos para vê-los aqui.'
              : 'Comece um novo projeto para organizar suas metas!'}
        </p>
      </motion.div>
    );
  }

  return (
    <AnimatePresence mode="popLayout">
      <div className="space-y-4">
        {projects.map((project, index) => (
          <ProjectCard 
            key={project.id} 
            project={project}
            index={index}
            completed={completed}
            archived={archived}
            onClick={() => onSelect(project)}
          />
        ))}
      </div>
    </AnimatePresence>
  );
};

interface ProjectCardProps {
  project: Project;
  index: number;
  completed?: boolean;
  archived?: boolean;
  onClick?: () => void;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project, index, completed, archived, onClick }) => {
  const element = ELEMENTS[project.elementId];
  const area = project.areaId ? getAreaById(project.areaId) : null;
  const totalItems = project.missions.length + project.quests.length + 
                     project.tasks.length + project.habits.length;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ scale: 1.01 }}
      onClick={onClick}
      className={`relative p-4 rounded-2xl border cursor-pointer transition-all ${
        completed 
          ? 'bg-mystic-gold/5 border-mystic-gold/20' 
          : archived
            ? 'bg-white/5 border-white/5 opacity-60'
            : 'bg-white/5 border-white/10 hover:border-white/20'
      }`}
    >
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
                {project.title}
              </h4>
              {project.description && (
                <p className="text-xs text-white/40 mt-0.5 line-clamp-1">{project.description}</p>
              )}
            </div>
            
            {completed && (
              <CheckCircle2 className="w-5 h-5 text-mystic-gold" />
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
              <FolderOpen className="w-3 h-3 mr-1" />
              {totalItems} itens
            </Badge>
            
            {project.missions.length > 0 && (
              <Badge variant="outline" className="bg-white/5 text-[10px]">
                <Flag className="w-3 h-3 mr-1" />
                {project.missions.length} campanhas
              </Badge>
            )}
          </div>

          {/* Progress */}
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-white/50">Progresso</span>
              <span className="text-mystic-gold">{project.progress}%</span>
            </div>
            <div className="h-1.5 bg-black/30 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${project.progress}%` }}
                transition={{ duration: 0.5 }}
                className="h-full rounded-full"
                style={{ 
                  background: `linear-gradient(90deg, ${element.color}, ${element.lightColor})` 
                }}
              />
            </div>
          </div>

          {/* Reward */}
          {project.reward && (
            <div className="mt-2 flex items-center gap-1 text-xs text-mystic-gold">
              <Gift className="w-3 h-3" />
              {project.reward}
            </div>
          )}
        </div>

        <ChevronRight className="w-5 h-5 text-white/30" />
      </div>
    </motion.div>
  );
};
