import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Check, ArrowRight } from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { useAppStore } from '@/stores/appStore';
import { AREAS, ELEMENTS, EFFORT_LABELS } from '@/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { ElementId } from '@/types';

export const Invocar: React.FC = () => {
  const navigate = useNavigate();
  const { addTask, addHabit, addQuest, addProject, addDraft } = useAppStore();
  
  const [step, setStep] = useState(1);
  const [entityType, setEntityType] = useState<'ACTION' | 'HABIT' | 'QUEST' | 'PROJECT' | 'DRAFT'>('ACTION');
  
  // Common fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedElement, setSelectedElement] = useState<ElementId>('terra');
  const [selectedArea, setSelectedArea] = useState<string>('none');
  
  // Task specific
  const [effortLevel, setEffortLevel] = useState(2);
  const [plannedTime, setPlannedTime] = useState(30);
  
  // Habit specific
  const [recurrence, setRecurrence] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY'>('DAILY');
  
  // Quest/Project specific
  const [dueDate, setDueDate] = useState('');
  const [reward, setReward] = useState('');
  
  const [showSuccess, setShowSuccess] = useState(false);
  const [createdEntity, setCreatedEntity] = useState<{ type: string; title: string } | null>(null);

  const filteredAreas = AREAS.filter(area => area.elementId === selectedElement);

  const handleSubmit = () => {
    if (!title.trim()) return;

    let entity: { type: string; title: string } | null = null;

    switch (entityType) {
      case 'ACTION':
        const task = addTask({
          title: title.trim(),
          description: description.trim(),
          baseValue: 1,
          effortLevel,
          plannedTimeMinutes: plannedTime,
          areaPrimaryId: selectedArea === 'none' ? null : selectedArea,
          elementId: selectedElement,
        });
        entity = { type: 'Ritual', title: task.title };
        break;
        
      case 'HABIT':
        const habit = addHabit({
          name: title.trim(),
          description: description.trim(),
          areaId: selectedArea === 'none' ? AREAS[0].id : selectedArea,
          elementId: selectedElement,
          plannedTimeMinutes: plannedTime,
          plannedPoints: effortLevel * 5,
          recurrenceType: recurrence,
          recurrenceConfig: {},
        });
        entity = { type: 'Ciclo', title: habit.name };
        break;
        
      case 'QUEST':
        const quest = addQuest({
          title: title.trim(),
          description: description.trim(),
          areaId: selectedArea === 'none' ? AREAS[0].id : selectedArea,
          elementId: selectedElement,
          status: 'active',
          dueDate: dueDate ? new Date(dueDate) : null,
          reward: reward || undefined,
          xpBonus: 50,
        });
        entity = { type: 'Jornada', title: quest.title };
        break;
        
      case 'PROJECT':
        const project = addProject({
          title: title.trim(),
          description: description.trim(),
          areaId: selectedArea === 'none' ? AREAS[0].id : selectedArea,
          elementId: selectedElement,
          status: 'active',
          dueDate: dueDate ? new Date(dueDate) : null,
          reward: reward || undefined,
          xpBonus: 100,
        });
        entity = { type: 'Grande Obra', title: project.title };
        break;
        
      case 'DRAFT':
        const draft = addDraft(title.trim(), description.trim());
        entity = { type: 'Rascunho', title: draft.title };
        break;
    }

    if (entity) {
      setCreatedEntity(entity);
      setShowSuccess(true);
      
      setTimeout(() => {
        setShowSuccess(false);
        navigate('/santuario');
      }, 2000);
    }
  };

  const canProceed = () => {
    if (step === 1) return true;
    if (step === 2) return title.trim().length > 0;
    if (step === 3) return true;
    return false;
  };

  return (
    <AppLayout showBackButton title="Invocar">
      {/* Progress Steps */}
      <div className="flex items-center justify-center gap-2 mb-6">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                       transition-colors ${
              s === step 
                ? 'bg-mystic-arcane text-white' 
                : s < step 
                  ? 'bg-mystic-gold text-black' 
                  : 'bg-white/10 text-white/40'
            }`}
          >
            {s < step ? '✓' : s}
          </div>
        ))}
      </div>

      {/* Step 1: Type Selection */}
      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <h3 className="font-mystic text-lg text-center mb-4">
              O que deseja invocar?
            </h3>
            
            <div className="grid grid-cols-2 gap-3">
              <TypeCard
                icon="📜"
                title="Ritual"
                description="Tarefa única"
                points="+1.2 pts"
                selected={entityType === 'ACTION'}
                onClick={() => setEntityType('ACTION')}
              />
              <TypeCard
                icon="🔄"
                title="Ciclo"
                description="Hábito recorrente"
                points="+5 pts/dia"
                selected={entityType === 'HABIT'}
                onClick={() => setEntityType('HABIT')}
              />
              <TypeCard
                icon="🗺️"
                title="Jornada"
                description="Quest com etapas"
                points="Agrega + bônus"
                selected={entityType === 'QUEST'}
                onClick={() => setEntityType('QUEST')}
              />
              <TypeCard
                icon="🏗️"
                title="Grande Obra"
                description="Projeto grande"
                points="Agrega tudo + XP"
                selected={entityType === 'PROJECT'}
                onClick={() => setEntityType('PROJECT')}
              />
              <TypeCard
                icon="📝"
                title="Rascunho"
                description="Salvar para depois"
                points="Sem pontuação"
                selected={entityType === 'DRAFT'}
                onClick={() => setEntityType('DRAFT')}
                className="col-span-2"
              />
            </div>
            
            <Button 
              onClick={() => setStep(2)} 
              className="w-full mt-6 bg-mystic-arcane"
            >
              Continuar
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </motion.div>
        )}

        {/* Step 2: Basic Info */}
        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <h3 className="font-mystic text-lg text-center mb-4">
              Defina o {entityType === 'ACTION' ? 'Ritual' : entityType === 'HABIT' ? 'Ciclo' : entityType === 'QUEST' ? 'Jornada' : entityType === 'PROJECT' ? 'Projeto' : 'Rascunho'}
            </h3>
            
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input
                placeholder="Nome do item..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="bg-white/5 border-white/10"
                autoFocus
              />
            </div>
            
            <div className="space-y-2">
              <Label>Descrição (opcional)</Label>
              <Textarea
                placeholder="Detalhes adicionais..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="bg-white/5 border-white/10 min-h-[80px]"
              />
            </div>
            
            {entityType !== 'DRAFT' && (
              <>
                <div className="space-y-2">
                  <Label>Elemento</Label>
                  <div className="grid grid-cols-4 gap-2">
                    {(Object.keys(ELEMENTS) as ElementId[]).map((id) => (
                      <button
                        key={id}
                        onClick={() => {
                          setSelectedElement(id);
                          setSelectedArea('none');
                        }}
                        className={`p-3 rounded-xl border transition-all ${
                          selectedElement === id
                            ? 'border-mystic-gold bg-mystic-gold/10'
                            : 'border-white/10 bg-white/5 hover:bg-white/10'
                        }`}
                      >
                        <div className="text-2xl mb-1">{ELEMENTS[id].icon}</div>
                        <div className="text-[10px]">{ELEMENTS[id].name}</div>
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Área (opcional)</Label>
                  <Select value={selectedArea} onValueChange={setSelectedArea}>
                    <SelectTrigger className="bg-white/5 border-white/10">
                      <SelectValue placeholder="Selecione uma área" />
                    </SelectTrigger>
                    <SelectContent className="bg-mystic-purple border-white/10">
                      <SelectItem value="none">Sem categoria (+1 pt)</SelectItem>
                      {filteredAreas.map((area) => (
                        <SelectItem key={area.id} value={area.id}>
                          {area.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={() => setStep(1)}
                className="flex-1 border-white/20"
              >
                Voltar
              </Button>
              <Button 
                onClick={() => setStep(3)}
                disabled={!canProceed()}
                className="flex-1 bg-mystic-arcane"
              >
                Continuar
              </Button>
            </div>
          </motion.div>
        )}

        {/* Step 3: Details */}
        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <h3 className="font-mystic text-lg text-center mb-4">
              Detalhes Finais
            </h3>
            
            {/* Effort Level (for tasks and habits) */}
            {(entityType === 'ACTION' || entityType === 'HABIT') && (
              <div className="space-y-2">
                <Label>Nível de Esforço</Label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <button
                      key={level}
                      onClick={() => setEffortLevel(level)}
                      className={`flex-1 p-2 rounded-lg border transition-all ${
                        effortLevel === level
                          ? 'border-mystic-gold bg-mystic-gold/10'
                          : 'border-white/10 bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      <div className="text-lg font-bold">{level}</div>
                      <div className="text-[10px] text-white/50">
                        ×{[1, 1.2, 1.5, 2, 2.8][level - 1]}
                      </div>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-white/50">
                  {EFFORT_LABELS[effortLevel].label}: {EFFORT_LABELS[effortLevel].description}
                </p>
              </div>
            )}
            
            {/* Time */}
            {(entityType === 'ACTION' || entityType === 'HABIT') && (
              <div className="space-y-2">
                <Label>Tempo Estimado</Label>
                <div className="flex items-center gap-4">
                  <Slider
                    value={[plannedTime]}
                    onValueChange={([v]) => setPlannedTime(v)}
                    min={5}
                    max={120}
                    step={5}
                    className="flex-1"
                  />
                  <Badge variant="outline" className="min-w-[70px] text-center">
                    {plannedTime}min
                  </Badge>
                </div>
              </div>
            )}
            
            {/* Recurrence for Habits */}
            {entityType === 'HABIT' && (
              <div className="space-y-2">
                <Label>Recorrência</Label>
                <div className="flex gap-2">
                  {(['DAILY', 'WEEKLY', 'MONTHLY'] as const).map((rec) => (
                    <button
                      key={rec}
                      onClick={() => setRecurrence(rec)}
                      className={`flex-1 p-2 rounded-lg border transition-all ${
                        recurrence === rec
                          ? 'border-mystic-gold bg-mystic-gold/10'
                          : 'border-white/10 bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      {rec === 'DAILY' ? 'Diário' : rec === 'WEEKLY' ? 'Semanal' : 'Mensal'}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {/* Due date for Quests and Projects */}
            {(entityType === 'QUEST' || entityType === 'PROJECT') && (
              <div className="space-y-2">
                <Label>Data Limite (opcional)</Label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="bg-white/5 border-white/10"
                />
              </div>
            )}
            
            {/* Reward for Quests and Projects */}
            {(entityType === 'QUEST' || entityType === 'PROJECT') && (
              <div className="space-y-2">
                <Label>Recompensa (opcional)</Label>
                <Input
                  placeholder="Ex: Um dia de descanso..."
                  value={reward}
                  onChange={(e) => setReward(e.target.value)}
                  className="bg-white/5 border-white/10"
                />
              </div>
            )}
            
            {/* Summary */}
            <div className="glass-card p-4 space-y-2">
              <h4 className="font-mystic text-sm text-mystic-gold">Resumo</h4>
              <div className="text-sm">
                <span className="text-white/50">Tipo:</span>{' '}
                {entityType === 'ACTION' ? 'Ritual' : entityType === 'HABIT' ? 'Ciclo' : entityType === 'QUEST' ? 'Jornada' : entityType === 'PROJECT' ? 'Grande Obra' : 'Rascunho'}
              </div>
              {entityType !== 'DRAFT' && (
                <>
                  <div className="text-sm">
                    <span className="text-white/50">Elemento:</span>{' '}
                    {ELEMENTS[selectedElement].icon} {ELEMENTS[selectedElement].name}
                  </div>
                  <div className="text-sm">
                    <span className="text-white/50">Pontos:</span>{' '}
                    <span className="text-mystic-gold">
                      {entityType === 'ACTION' 
                        ? `+${(1 * [1, 1.2, 1.5, 2, 2.8][effortLevel - 1]).toFixed(1)}`
                        : entityType === 'HABIT'
                          ? `+${effortLevel * 5} por dia`
                          : 'Agrega + bônus XP'}
                    </span>
                  </div>
                </>
              )}
            </div>
            
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={() => setStep(2)}
                className="flex-1 border-white/20"
              >
                Voltar
              </Button>
              <Button 
                onClick={handleSubmit}
                className="flex-1 bg-gradient-to-r from-mystic-gold to-orange-500 text-black font-bold"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Invocar
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success Dialog */}
      <Dialog open={showSuccess}>
        <DialogContent className="bg-mystic-purple border-white/20 text-center">
          <DialogHeader>
            <DialogTitle className="font-mystic text-xl">
              ✨ Invocação Completa! ✨
            </DialogTitle>
          </DialogHeader>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300 }}
            className="py-4"
          >
            <div className="text-5xl mb-4">
              {entityType === 'ACTION' ? '📜' : entityType === 'HABIT' ? '🔄' : entityType === 'QUEST' ? '🗺️' : entityType === 'PROJECT' ? '🏗️' : '📝'}
            </div>
            <p className="text-lg font-medium">{createdEntity?.title}</p>
            <p className="text-white/70">
              {createdEntity?.type} invocado com sucesso!
            </p>
          </motion.div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

interface TypeCardProps {
  icon: string;
  title: string;
  description: string;
  points: string;
  selected: boolean;
  onClick: () => void;
  className?: string;
}

const TypeCard: React.FC<TypeCardProps> = ({ icon, title, description, points, selected, onClick, className }) => (
  <motion.button
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    className={`p-4 rounded-xl border transition-all text-left ${
      selected
        ? 'border-mystic-gold bg-mystic-gold/10'
        : 'border-white/10 bg-white/5 hover:bg-white/10'
    } ${className}`}
  >
    <div className="flex items-start justify-between">
      <div className="text-3xl">{icon}</div>
      {selected && <Check className="w-5 h-5 text-mystic-gold" />}
    </div>
    <div className="font-medium mt-2">{title}</div>
    <div className="text-xs text-white/50">{description}</div>
    <div className="text-xs text-mystic-gold mt-1">{points}</div>
  </motion.button>
);
