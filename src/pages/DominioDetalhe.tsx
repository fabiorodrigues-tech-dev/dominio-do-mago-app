import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { useAppStore } from '@/stores/appStore';
import { AREAS, ELEMENTS } from '@/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export const DominioDetalhe: React.FC = () => {
  const navigate = useNavigate();
  const { areaId } = useParams<{ areaId: string }>();
  const {
    tasks,
    habits,
    customAreas,
    customSubareas,
    linkedSubareasByAreaId,
    addCustomSubarea,
    linkSubarea,
    unlinkSubarea,
    removeCustomSubarea,
  } = useAppStore();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [listMode, setListMode] = useState<'active' | 'inactive'>('active');
  const [newSubareaName, setNewSubareaName] = useState('');
  const [formError, setFormError] = useState('');

  const allAreas = useMemo(() => [...AREAS, ...customAreas], [customAreas]);
  const area = allAreas.find((item) => item.id === areaId);

  const subareas = useMemo(() => {
    if (!area) return [];

    const builtInSubareas = allAreas
      .flatMap((rootArea) => rootArea.subareas || [])
      .filter((subarea) => subarea.parentId === area.id);

    const inlineSubareas = (area.subareas || []).filter(
      (subarea) => subarea.parentId === area.id
    );

    const persistedCustomSubareas = customSubareas[area.id] || [];

    // Evita duplicidade quando a mesma subarea aparece em mais de uma fonte.
    const mergedSubareas = [
      ...builtInSubareas,
      ...inlineSubareas,
      ...persistedCustomSubareas,
    ];

    const uniqueById = new Map(mergedSubareas.map((subarea) => [subarea.id, subarea]));
    return Array.from(uniqueById.values());
  }, [allAreas, area, customSubareas]);

  const activeSubareaSet = useMemo(() => {
    if (!area) return new Set<string>();
    const explicitLinked = linkedSubareasByAreaId[area.id];

    // Backward compatibility: if user has never managed subareas for this area,
    // treat all visible subareas as active.
    if (!explicitLinked) {
      return new Set(subareas.map((subarea) => subarea.id));
    }

    return new Set(explicitLinked);
  }, [area, linkedSubareasByAreaId, subareas]);

  const visibleSubareas = subareas.filter((subarea) =>
    listMode === 'active' ? activeSubareaSet.has(subarea.id) : !activeSubareaSet.has(subarea.id)
  );

  const resetCreateForm = () => {
    setNewSubareaName('');
    setFormError('');
  };

  const handleCreateSubarea = () => {
    if (!area) return;

    const trimmedName = newSubareaName.trim();
    if (!trimmedName) {
      setFormError('Informe o nome da subarea.');
      return;
    }

    const alreadyExists = subareas.some(
      (subarea) => subarea.name.toLowerCase() === trimmedName.toLowerCase()
    );

    if (alreadyExists) {
      setFormError('Ja existe uma subarea com esse nome.');
      return;
    }

    addCustomSubarea(area.id, trimmedName, area.elementId, area.color);
    resetCreateForm();
    setShowCreateModal(false);
  };

  if (!area) {
    return (
      <AppLayout>
        <div className="glass-card p-8 text-center mt-4">
          <h3 className="font-mystic text-lg mb-2">Area nao encontrada</h3>
          <p className="text-white/50 text-sm mb-4">
            Essa area nao existe ou foi removida.
          </p>
          <Button onClick={() => navigate('/dominios')}>Voltar para Dominios</Button>
        </div>
      </AppLayout>
    );
  }

  const element = ELEMENTS[area.elementId];
  const areaTaskCount = tasks.filter((task) => task.areaPrimaryId === area.id).length;
  const areaHabitCount = habits.filter((habit) => habit.areaId === area.id).length;

  const handleToggleSubarea = (subareaId: string) => {
    if (activeSubareaSet.has(subareaId)) {
      unlinkSubarea(area.id, subareaId);
      return;
    }

    linkSubarea(area.id, subareaId);
  };

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
            onClick={() => navigate('/dominios')}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>

          <div>
            <h2 className="font-mystic text-xl">{area.name}</h2>
            <p className="text-sm text-white/50">
              {element.icon} {element.name} • {subareas.length} subareas
            </p>
          </div>
        </div>

        <Button
          onClick={() => {
            resetCreateForm();
            setShowCreateModal(true);
          }}
          className="bg-mystic-arcane hover:bg-mystic-arcane/80"
        >
          <Plus className="w-4 h-4 mr-1" />
          Subarea
        </Button>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card p-4 mb-4"
      >
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <p className="text-white/50">Rituais na area</p>
            <p className="text-xl font-semibold text-white">{areaTaskCount}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <p className="text-white/50">Ciclos na area</p>
            <p className="text-xl font-semibold text-white">{areaHabitCount}</p>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h3 className="font-mystic text-lg mb-3">Subareas</h3>

        <div className="mb-3 flex gap-2">
          <button
            onClick={() => setListMode('active')}
            className={`px-4 py-2 rounded-xl text-sm transition-all ${
              listMode === 'active'
                ? 'bg-mystic-gold text-black'
                : 'bg-white/5 text-white/60 hover:bg-white/10'
            }`}
          >
            Ativas ({subareas.filter((subarea) => activeSubareaSet.has(subarea.id)).length})
          </button>
          <button
            onClick={() => setListMode('inactive')}
            className={`px-4 py-2 rounded-xl text-sm transition-all ${
              listMode === 'inactive'
                ? 'bg-mystic-gold text-black'
                : 'bg-white/5 text-white/60 hover:bg-white/10'
            }`}
          >
            Desativadas ({subareas.filter((subarea) => !activeSubareaSet.has(subarea.id)).length})
          </button>
        </div>

        {visibleSubareas.length === 0 ? (
          <div className="glass-card p-8 text-center">
            <div className="text-4xl mb-3">🧩</div>
            <h4 className="font-mystic text-base mb-2">
              {listMode === 'active' ? 'Nenhuma subarea ativa' : 'Nenhuma subarea desativada'}
            </h4>
            <p className="text-white/50 text-sm">
              {listMode === 'active'
                ? 'Vincule subareas para que aparecam aqui.'
                : 'Todas as subareas deste dominio ja estao ativas.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {visibleSubareas.map((subarea) => {
              const isYogaSubarea = subarea.id === 'sub-saude-yoga';
              const isCalisteniaSubarea = subarea.id === 'sub-saude-calistenia';
              const dedicatedPath = isYogaSubarea
                ? '/dominios/yoga'
                : isCalisteniaSubarea
                  ? '/dominios/calistenia'
                  : null;
              const linkedTaskCount = tasks.filter((task) =>
                task.subareaPrimaryId === subarea.id ||
                task.subareaSecondaryId1 === subarea.id ||
                task.subareaSecondaryId2 === subarea.id
              ).length;

              const linkedHabitCount = habits.filter(
                (habit) => habit.subareaId === subarea.id
              ).length;

              return (
                <div
                  key={subarea.id}
                  className={`rounded-2xl border border-white/10 bg-white/5 p-4 ${
                    dedicatedPath ? 'cursor-pointer hover:border-mystic-gold/40 hover:bg-mystic-gold/5 transition-colors' : ''
                  }`}
                  onClick={() => {
                    if (!dedicatedPath) return;
                    navigate(dedicatedPath);
                  }}
                  onKeyDown={(event) => {
                    if (!dedicatedPath) return;
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      navigate(dedicatedPath);
                    }
                  }}
                  role={dedicatedPath ? 'button' : undefined}
                  tabIndex={dedicatedPath ? 0 : undefined}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h4 className="font-medium text-white">{subarea.name}</h4>
                      <p className="text-xs text-white/50">
                        {linkedTaskCount} rituais • {linkedHabitCount} ciclos
                      </p>
                      {isYogaSubarea && (
                        <p className="text-[11px] text-mystic-gold mt-1">
                          Toque para abrir a página dedicada de Yoga
                        </p>
                      )}
                      {isCalisteniaSubarea && (
                        <p className="text-[11px] text-mystic-gold mt-1">
                          Toque para abrir a página dedicada de Calistenia
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {subarea.isCustom && (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            removeCustomSubarea(area.id, subarea.id);
                          }}
                          className="p-2 rounded-lg border border-red-400/30 text-red-200 hover:bg-red-500/10"
                          title="Remover subarea personalizada"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleToggleSubarea(subarea.id);
                        }}
                        className="px-3 py-1.5 rounded-lg border border-white/20 text-xs text-white/80 hover:bg-white/10"
                      >
                        {activeSubareaSet.has(subarea.id) ? 'Desvincular' : 'Vincular'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>

      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="bg-mystic-purple border-white/20 max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-mystic text-xl">Nova subarea</DialogTitle>
            <DialogDescription className="text-white/50">
              Crie uma subarea dentro de {area.name}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm text-white/70 mb-2 block">Nome da subarea</label>
              <Input
                placeholder="Ex: Leitura tecnica"
                value={newSubareaName}
                onChange={(e) => {
                  setNewSubareaName(e.target.value);
                  if (formError) setFormError('');
                }}
                className="bg-white/5 border-white/10"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateSubarea();
                }}
              />
            </div>

            {formError && <p className="text-sm text-red-300">{formError}</p>}

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowCreateModal(false)}
                className="flex-1 border-white/20"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleCreateSubarea}
                className="flex-1 bg-mystic-arcane hover:bg-mystic-arcane/80"
              >
                Criar subarea
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};
