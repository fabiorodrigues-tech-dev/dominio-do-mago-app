import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Plus, Mountain, Flame, Droplets, Wind } from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { AreaCard } from '@/components/cards';
import { useAppStore } from '@/stores/appStore';
import { AREAS, ELEMENTS, type ElementId } from '@/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export const Dominios: React.FC = () => {
  const navigate = useNavigate();
  const {
    getAreaScores,
    customAreas,
    onboarding,
    addCustomArea,
    selectArea,
    deselectArea,
  } = useAppStore();
  const [selectedElement, setSelectedElement] = useState<ElementId | null>(null);
  const [listMode, setListMode] = useState<'active' | 'inactive'>('active');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newAreaName, setNewAreaName] = useState('');
  const [newAreaElement, setNewAreaElement] = useState<ElementId>('terra');
  const [formError, setFormError] = useState('');

  const areaScores = getAreaScores();
  const allAreas = [...AREAS, ...customAreas];
  const activeAreaSet = new Set(onboarding.selectedAreas);
  const elementOrder: ElementId[] = ['terra', 'fogo', 'agua', 'ar'];

  const getElementIcon = (id: ElementId) => {
    switch (id) {
      case 'terra': return <Mountain className="w-4 h-4" />;
      case 'fogo': return <Flame className="w-4 h-4" />;
      case 'agua': return <Droplets className="w-4 h-4" />;
      case 'ar': return <Wind className="w-4 h-4" />;
    }
  };

  const getOrderedAreasForElement = (elementId: ElementId) => {
    const builtInAreas = AREAS.filter((area) => area.elementId === elementId);
    const customAreasForElement = customAreas.filter((area) => area.elementId === elementId);
    return [...builtInAreas, ...customAreasForElement];
  };

  const filteredAreas = selectedElement
    ? getOrderedAreasForElement(selectedElement)
    : elementOrder.flatMap((elementId) => getOrderedAreasForElement(elementId));

  const resetCreateForm = () => {
    setNewAreaName('');
    setNewAreaElement('terra');
    setFormError('');
  };

  const handleCreateArea = () => {
    const trimmedName = newAreaName.trim();
    if (!trimmedName) {
      setFormError('Informe o nome da area.');
      return;
    }

    const alreadyExists = allAreas.some(
      (area) => area.name.toLowerCase() === trimmedName.toLowerCase()
    );

    if (alreadyExists) {
      setFormError('Ja existe uma area com esse nome.');
      return;
    }

    const createdArea = addCustomArea(trimmedName, newAreaElement);
    selectArea(createdArea.id);
    resetCreateForm();
    setShowCreateModal(false);
    setSelectedElement(newAreaElement);
    setListMode('active');
  };

  const toggleAreaLink = (areaId: string) => {
    if (activeAreaSet.has(areaId)) {
      deselectArea(areaId);
      return;
    }

    selectArea(areaId);
  };

  const visibleAreas = filteredAreas.filter((area) =>
    listMode === 'active' ? activeAreaSet.has(area.id) : !activeAreaSet.has(area.id)
  );

  return (
    <AppLayout>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-4"
      >
        <div>
          <h2 className="font-mystic text-xl">Domínios</h2>
          <p className="text-sm text-white/50">
            {allAreas.length} areas de vida organizadas
          </p>
        </div>
        <Button 
          onClick={() => {
            resetCreateForm();
            setShowCreateModal(true);
          }}
          className="bg-mystic-arcane hover:bg-mystic-arcane/80"
        >
          <Plus className="w-4 h-4 mr-1" />
          Nova
        </Button>
      </motion.div>

      {/* Element Filter */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-4"
      >
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <button
            onClick={() => setSelectedElement(null)}
            className={`px-4 py-2 rounded-xl text-sm whitespace-nowrap transition-all ${
              selectedElement === null
                ? 'bg-mystic-arcane text-white'
                : 'bg-white/5 text-white/60 hover:bg-white/10'
            }`}
          >
            Todos
          </button>
          {(Object.keys(ELEMENTS) as ElementId[]).map((id) => (
            <button
              key={id}
              onClick={() => setSelectedElement(id)}
              className={`px-4 py-2 rounded-xl text-sm whitespace-nowrap transition-all flex items-center gap-2 ${
                selectedElement === id
                  ? 'bg-mystic-arcane text-white'
                  : 'bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              {getElementIcon(id)}
              {ELEMENTS[id].name}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Areas List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="mb-3 flex gap-2">
          <button
            onClick={() => setListMode('active')}
            className={`px-4 py-2 rounded-xl text-sm transition-all ${
              listMode === 'active'
                ? 'bg-mystic-gold text-black'
                : 'bg-white/5 text-white/60 hover:bg-white/10'
            }`}
          >
            Ativas ({filteredAreas.filter((area) => activeAreaSet.has(area.id)).length})
          </button>
          <button
            onClick={() => setListMode('inactive')}
            className={`px-4 py-2 rounded-xl text-sm transition-all ${
              listMode === 'inactive'
                ? 'bg-mystic-gold text-black'
                : 'bg-white/5 text-white/60 hover:bg-white/10'
            }`}
          >
            Desativadas ({filteredAreas.filter((area) => !activeAreaSet.has(area.id)).length})
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {visibleAreas.map((area) => {
            const score = areaScores.find(s => s.areaId === area.id);
            return (
              <div key={area.id} className="space-y-2">
                <AreaCard
                  area={area}
                  score={score?.score || 0}
                  taskCount={score?.taskCount || 0}
                  onClick={() => navigate(`/dominios/${area.id}`)}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-white/20"
                  onClick={() => toggleAreaLink(area.id)}
                >
                  {activeAreaSet.has(area.id) ? 'Desvincular área' : 'Vincular área'}
                </Button>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Empty State */}
      {visibleAreas.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass-card p-8 text-center mt-4"
        >
          <div className="text-4xl mb-3">🌿</div>
          <h3 className="font-mystic text-lg mb-2">
            {listMode === 'active' ? 'Nenhuma área ativa' : 'Nenhuma área desativada'}
          </h3>
          <p className="text-white/50 text-sm">
            {listMode === 'active'
              ? 'Vincule áreas para que apareçam aqui.'
              : 'Todas as áreas deste filtro já estão ativas.'}
          </p>
        </motion.div>
      )}

      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="bg-mystic-purple border-white/20 max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-mystic text-xl">Nova area</DialogTitle>
            <DialogDescription className="text-white/50">
              Escolha o nome e o elemento para criar uma area personalizada.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm text-white/70 mb-2 block">Nome da area</label>
              <Input
                placeholder="Ex: Estudo profundo"
                value={newAreaName}
                onChange={(e) => {
                  setNewAreaName(e.target.value);
                  if (formError) setFormError('');
                }}
                className="bg-white/5 border-white/10"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateArea();
                }}
              />
            </div>

            <div>
              <label className="text-sm text-white/70 mb-2 block">Elemento</label>
              <Select
                value={newAreaElement}
                onValueChange={(value) => {
                  setNewAreaElement(value as ElementId);
                  if (formError) setFormError('');
                }}
              >
                <SelectTrigger className="w-full bg-white/5 border-white/10">
                  <SelectValue placeholder="Selecione o elemento" />
                </SelectTrigger>
                <SelectContent className="bg-mystic-purple border-white/10">
                  {(Object.keys(ELEMENTS) as ElementId[]).map((elementId) => (
                    <SelectItem key={elementId} value={elementId}>
                      {ELEMENTS[elementId].icon} {ELEMENTS[elementId].name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                onClick={handleCreateArea}
                className="flex-1 bg-mystic-arcane hover:bg-mystic-arcane/80"
              >
                Criar area
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};
