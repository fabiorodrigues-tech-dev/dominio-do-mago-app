import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Info } from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { ElementCard, AreaCard } from '@/components/cards';
import { useAppStore } from '@/stores/appStore';
import { ELEMENTS, getAreasByElement, type ElementId } from '@/constants';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export const Pilares: React.FC = () => {
  const { getElementScores, getAreaScores } = useAppStore();
  const [selectedElement, setSelectedElement] = useState<ElementId | null>(null);

  const elementScores = getElementScores();
  const areaScores = getAreaScores();

  const selectedElementData = selectedElement ? ELEMENTS[selectedElement] : null;
  const selectedAreas = selectedElement ? getAreasByElement(selectedElement) : [];

  return (
    <AppLayout>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-6"
      >
        <div className="text-4xl mb-2">⚡</div>
        <h2 className="font-mystic text-xl mb-1">Pilares Elementais</h2>
        <p className="text-sm text-white/50">
          Os quatro elementos que governam sua jornada
        </p>
      </motion.div>

      {/* Elements Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 gap-3 mb-6"
      >
        {elementScores.map((score) => (
          <ElementCard
            key={score.elementId}
            elementId={score.elementId}
            score={score.score}
            percentage={score.percentage}
            onClick={() => setSelectedElement(score.elementId)}
            size="lg"
          />
        ))}
      </motion.div>

      {/* Element Details */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h3 className="font-mystic text-lg mb-3">Detalhes dos Elementos</h3>
        <div className="space-y-3">
          {(Object.keys(ELEMENTS) as ElementId[]).map((elementId) => {
            const element = ELEMENTS[elementId];
            const score = elementScores.find(s => s.elementId === elementId);
            const areas = getAreasByElement(elementId);
            
            return (
              <motion.div
                key={elementId}
                whileHover={{ scale: 1.01 }}
                onClick={() => setSelectedElement(elementId)}
                className="p-4 rounded-2xl border border-white/10 hover:border-white/20 
                          transition-all cursor-pointer"
                style={{
                  background: `linear-gradient(135deg, ${element.color}10 0%, rgba(26, 16, 37, 0.9) 100%)`,
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                      style={{ backgroundColor: `${element.color}30` }}
                    >
                      {element.icon}
                    </div>
                    <div>
                      <h4 className="font-medium">{element.name}</h4>
                      <p className="text-xs text-white/50">{element.domain}</p>
                      <p className="text-[10px] text-white/30 mt-0.5">
                        {areas.length} áreas • {score?.score || 0} pontos
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* Element Detail Dialog */}
      <Dialog open={!!selectedElement} onOpenChange={() => setSelectedElement(null)}>
        <DialogContent className="bg-mystic-purple border-white/20 max-w-sm max-h-[80vh] overflow-y-auto">
          {selectedElementData && (
            <>
              <DialogHeader>
                <div className="text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 300 }}
                    className="text-6xl mb-2"
                  >
                    {selectedElementData.icon}
                  </motion.div>
                  <DialogTitle className="font-mystic text-2xl">
                    {selectedElementData.name}
                  </DialogTitle>
                  <p className="text-sm text-white/50">{selectedElementData.domain}</p>
                </div>
              </DialogHeader>
              
              <div className="space-y-4 p-4">
                {/* Description */}
                <div className="glass-card p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Info className="w-4 h-4 text-mystic-gold" />
                    <span className="text-sm font-medium">Sobre</span>
                  </div>
                  <p className="text-sm text-white/70">
                    {selectedElementData.description}
                  </p>
                </div>

                {/* Score */}
                {(() => {
                  const score = elementScores.find(s => s.elementId === selectedElement);
                  return score ? (
                    <div className="glass-card p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-white/60">Pontuação</span>
                        <span className="text-xl font-bold" style={{ color: selectedElementData.color }}>
                          {score.score}
                        </span>
                      </div>
                      <div className="h-2 bg-black/30 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${score.percentage}%` }}
                          className="h-full rounded-full"
                          style={{ backgroundColor: selectedElementData.color }}
                        />
                      </div>
                      <p className="text-xs text-white/40 mt-1 text-right">
                        {score.percentage}% do total
                      </p>
                    </div>
                  ) : null;
                })()}

                {/* Areas */}
                <div>
                  <h4 className="font-mystic text-sm mb-3">Áreas do Elemento</h4>
                  <div className="space-y-2">
                    {selectedAreas.map((area) => {
                      const areaScore = areaScores.find(s => s.areaId === area.id);
                      return (
                        <AreaCard
                          key={area.id}
                          area={area}
                          score={areaScore?.score || 0}
                          taskCount={areaScore?.taskCount || 0}
                          compact
                        />
                      );
                    })}
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};
