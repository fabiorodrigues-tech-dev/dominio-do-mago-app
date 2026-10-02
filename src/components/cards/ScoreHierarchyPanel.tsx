import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, Sparkles } from 'lucide-react';
import type { Area, ElementId, Habit, Task } from '@/types';
import { AREAS, ELEMENTS, calculateTaskScore } from '@/constants';

interface ScoreHierarchyPanelProps {
  tasks: Task[];
  habits: Habit[];
  customAreas?: Area[];
  customSubareas?: Record<string, Area[]>;
}

type AreaWithSubareas = Area & { mergedSubareas: Area[] };

const ELEMENT_ORDER: ElementId[] = ['terra', 'fogo', 'agua', 'ar'];

const getTaskPoints = (task: Task): number => {
  if (!task.isCompleted) return 0;

  if (typeof task.completedScore === 'number') {
    return Math.max(0, Math.round(task.completedScore));
  }

  const score = calculateTaskScore(
    task.baseValue || 1,
    task.effortLevel || 1,
    task.actualTimeMinutes ?? 0,
    !!task.areaPrimaryId
  );
  return Math.max(0, Math.round(score));
};

const toDayStamp = (date: Date | string | number | null | undefined): number | null => {
  if (date == null) return null;
  const parsed = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()).getTime();
};

const isHabitCompletedOnDate = (habit: Habit, completionDate: Date | string | number): boolean => {
  const targetDay = toDayStamp(completionDate);
  if (targetDay == null) return false;

  return habit.completions.some((completion) => toDayStamp(completion.completionDate) === targetDay);
};

const sanitizeNonNegativeNumber = (value: unknown): number | null => {
  if (typeof value === 'number') {
    if (Number.isNaN(value)) return null;
    return Math.max(0, value);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;

    const parsed = Number(trimmed);
    if (Number.isNaN(parsed)) return null;

    return Math.max(0, parsed);
  }

  return null;
};

const getHabitBasePoints = (habit: Habit): number => {
  const semanticType = habit.semanticType ?? 'valuable';
  if (semanticType !== 'valuable') return 0;

  if (habit.childHabits.length > 0) {
    // Aggregators never contribute direct base points.
    return 0;
  }

  const livePlannedPoints = sanitizeNonNegativeNumber(habit.plannedPoints);
  if (livePlannedPoints != null) return livePlannedPoints;

  const backupPlannedPoints = sanitizeNonNegativeNumber(habit.semanticValueBackup?.plannedPoints);
  if (backupPlannedPoints != null) return backupPlannedPoints;

  return 0;
};

export const ScoreHierarchyPanel: React.FC<ScoreHierarchyPanelProps> = ({
  tasks,
  habits,
  customAreas = [],
  customSubareas = {},
}) => {
  const [selectedElement, setSelectedElement] = useState<ElementId | null>(null);
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);

  const mergedAreas = useMemo<AreaWithSubareas[]>(() => {
    const allTopAreas = [...AREAS, ...customAreas];

    return allTopAreas.map((area) => {
      const builtInSubareas = (area.subareas || []).filter((sub) => sub.parentId === area.id);
      const persistedCustomSubareas = customSubareas[area.id] || [];
      const uniqueSubareas = Array.from(
        new Map([...builtInSubareas, ...persistedCustomSubareas].map((sub) => [sub.id, sub])).values()
      );

      return {
        ...area,
        mergedSubareas: uniqueSubareas,
      };
    });
  }, [customAreas, customSubareas]);

  const areaById = useMemo(() => {
    const map = new Map<string, Area>();

    mergedAreas.forEach((area) => {
      map.set(area.id, area);
      area.mergedSubareas.forEach((subarea) => map.set(subarea.id, subarea));
    });

    return map;
  }, [mergedAreas]);

  const scoreData = useMemo(() => {
    const habitElementMap: Record<ElementId, number> = {
      terra: 0,
      fogo: 0,
      agua: 0,
      ar: 0,
    };
    const habitAreaScores = new Map<string, number>();
    const habitSubareaScores = new Map<string, number>();

    const accumulateCompletedHabitContributionsForDate = (
      habit: Habit,
      completionDate: Date | string | number
    ) => {
      const ownPoints = isHabitCompletedOnDate(habit, completionDate) ? getHabitBasePoints(habit) : 0;
      if (ownPoints > 0) {
        const resolvedElementId = areaById.get(habit.areaId)?.elementId || habit.elementId;
        habitElementMap[resolvedElementId] += ownPoints;

        if (habit.areaId) {
          habitAreaScores.set(habit.areaId, (habitAreaScores.get(habit.areaId) || 0) + ownPoints);
        }

        if (habit.subareaId) {
          habitSubareaScores.set(habit.subareaId, (habitSubareaScores.get(habit.subareaId) || 0) + ownPoints);
        }
      }

      habit.childHabits.forEach((child) => {
        accumulateCompletedHabitContributionsForDate(child, completionDate);
      });
    };

    habits.forEach((rootHabit) => {
      rootHabit.completions.forEach((completion) => {
        accumulateCompletedHabitContributionsForDate(rootHabit, completion.completionDate);
      });
    });

    const map: Record<ElementId, number> = {
      terra: 0,
      fogo: 0,
      agua: 0,
      ar: 0,
    };

    tasks.forEach((task) => {
      const resolvedElementId = task.areaPrimaryId
        ? areaById.get(task.areaPrimaryId)?.elementId || task.elementId
        : task.elementId;
      map[resolvedElementId] += getTaskPoints(task);
    });

    ELEMENT_ORDER.forEach((elementId) => {
      map[elementId] += habitElementMap[elementId];
    });

    const areaScores = new Map<string, number>();
    tasks.forEach((task) => {
      if (!task.areaPrimaryId) return;
      areaScores.set(task.areaPrimaryId, (areaScores.get(task.areaPrimaryId) || 0) + getTaskPoints(task));
    });
    habitAreaScores.forEach((score, areaId) => {
      areaScores.set(areaId, (areaScores.get(areaId) || 0) + score);
    });

    const subareaScores = new Map<string, number>();
    tasks.forEach((task) => {
      if (!task.subareaPrimaryId) return;
      subareaScores.set(task.subareaPrimaryId, (subareaScores.get(task.subareaPrimaryId) || 0) + getTaskPoints(task));
    });
    habitSubareaScores.forEach((score, subareaId) => {
      subareaScores.set(subareaId, (subareaScores.get(subareaId) || 0) + score);
    });

    return {
      elementScores: ELEMENT_ORDER.map((elementId) => ({
        elementId,
        score: map[elementId],
      })),
      areaScoresById: areaScores,
      subareaScoresById: subareaScores,
    };
  }, [tasks, habits, areaById]);

  const elementScores = scoreData.elementScores;
  const areaScoresById = scoreData.areaScoresById;
  const subareaScoresById = scoreData.subareaScoresById;

  const areasForElement = useMemo(() => {
    if (!selectedElement) return [];
    return mergedAreas.filter((area) => area.elementId === selectedElement);
  }, [mergedAreas, selectedElement]);

  const selectedArea = useMemo(() => {
    if (!selectedAreaId) return null;
    return areasForElement.find((area) => area.id === selectedAreaId) || null;
  }, [areasForElement, selectedAreaId]);

  const maxElementScore = Math.max(1, ...elementScores.map((item) => item.score));
  const maxAreaScore = Math.max(
    1,
    ...areasForElement.map((area) => areaScoresById.get(area.id) || 0)
  );
  const maxSubareaScore = Math.max(
    1,
    ...(selectedArea?.mergedSubareas || []).map((subarea) => subareaScoresById.get(subarea.id) || 0)
  );

  const handleSelectElement = (elementId: ElementId) => {
    setSelectedElement((current) => {
      if (current === elementId) {
        setSelectedAreaId(null);
        return null;
      }
      return elementId;
    });
    setSelectedAreaId(null);
  };

  const breadcrumb = [
    selectedElement ? ELEMENTS[selectedElement].name : null,
    selectedArea?.name || null,
  ].filter(Boolean).join(' > ');

  return (
    <div className="mb-4 space-y-3">
      <div className="glass-card p-3">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs uppercase tracking-wider text-white/50">Pontuacao por elemento</p>
          <div className="flex items-center gap-1 text-mystic-gold text-xs">
            <Sparkles className="w-3 h-3" />
            <span>Total {elementScores.reduce((acc, item) => acc + item.score, 0)} pts</span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {elementScores.map((item) => {
            const element = ELEMENTS[item.elementId];
            const isActive = selectedElement === item.elementId;

            return (
              <button
                key={item.elementId}
                onClick={() => handleSelectElement(item.elementId)}
                className={`relative aspect-square rounded-xl border p-3 transition-colors ${
                  isActive
                    ? 'border-white/30 bg-white/10'
                    : 'border-white/10 bg-white/5 hover:bg-white/10'
                }`}
              >
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <span className="text-sm">{element.icon} {element.name}</span>
                  <span className="mt-1 text-2xl font-semibold text-mystic-gold">{item.score}</span>
                </div>

                <div className="absolute left-2 right-2 bottom-2 h-1.5 rounded-full bg-black/30 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(item.score / maxElementScore) * 100}%` }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: element.lightColor }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {selectedElement && (
        <div className="glass-card p-3">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs uppercase tracking-wider text-white/50">Areas de {ELEMENTS[selectedElement].name}</p>
            {breadcrumb && <p className="text-xs text-white/50">{breadcrumb}</p>}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {areasForElement.map((area) => {
              const score = areaScoresById.get(area.id) || 0;
              const isActive = selectedAreaId === area.id;

              return (
                <button
                  key={area.id}
                  onClick={() => setSelectedAreaId((current) => (current === area.id ? null : area.id))}
                  className={`relative rounded-xl border p-2.5 transition-colors ${
                    isActive
                      ? 'border-white/30'
                      : 'border-white/10 hover:border-white/20'
                  }`}
                  style={{ backgroundColor: `${area.color}${isActive ? '33' : '1A'}` }}
                >
                  <div className="flex min-h-[72px] flex-col items-center justify-center text-center">
                    <span className="text-xs font-medium leading-tight">{area.name}</span>
                    <span className="mt-1 text-lg font-semibold text-mystic-gold">{score}</span>
                  </div>

                  <div className="absolute left-2 right-2 bottom-2 flex items-center gap-1">
                    <div className="h-1.5 flex-1 rounded-full bg-black/30 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(score / maxAreaScore) * 100}%` }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: area.color }}
                      />
                    </div>
                    {area.mergedSubareas.length > 0 && <ChevronRight className="w-3.5 h-3.5 text-white/60" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {selectedArea && selectedArea.mergedSubareas.length > 0 && (
        <div className="glass-card p-3">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs uppercase tracking-wider text-white/50">Subareas de {selectedArea.name}</p>
            <p className="text-xs text-white/50">{selectedArea.mergedSubareas.length} itens</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {selectedArea.mergedSubareas.map((subarea) => {
              const score = subareaScoresById.get(subarea.id) || 0;
              return (
                <div
                  key={subarea.id}
                  className="relative rounded-xl border border-white/10 p-2.5"
                  style={{ backgroundColor: `${selectedArea.color}1A` }}
                >
                  <div className="flex min-h-[68px] flex-col items-center justify-center text-center">
                    <span className="text-xs font-medium leading-tight">{subarea.name}</span>
                    <span className="mt-1 text-lg font-semibold text-mystic-gold">{score}</span>
                  </div>

                  <div className="absolute left-2 right-2 bottom-2 h-1.5 rounded-full bg-black/30 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(score / maxSubareaScore) * 100}%` }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: selectedArea.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
