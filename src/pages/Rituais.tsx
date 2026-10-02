import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  Filter,
  Play, 
  Pause, 
  Check,
  Clock,
  ChevronDown,
  ChevronUp,
  MoreVertical,
  Edit2,
  Trash2,
  ListTodo,
  PlusCircle,
  X,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { ScoreHierarchyPanel } from '@/components/cards';
import { useAppStore } from '@/stores/appStore';
import { 
  getAreaById, 
  formatDuration, 
  formatTime,
  ELEMENTS,
  EFFORT_LABELS,
  AREAS,
} from '@/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Task, TaskItem, ElementId, Area } from '@/types';

export const Rituais: React.FC = () => {
  const navigate = useNavigate();
  const { 
    tasks, 
    habits,
    customAreas,
    customSubareas,
    completeTask, 
    uncompleteTask,
    deleteTask,
    addTask,
    addTaskItem,
    deleteTaskItem,
    completeTaskItem,
    uncompleteTaskItem,
    toggleTaskItemExpansion,
    moveTaskItemUp,
    moveTaskItemDown,
    startTimer,
    stopTimer,
    timer,
    toggleTaskExpansion,
    moveTaskUp,
    moveTaskDown,
    reorderTasks,
    duplicateTask,
    createHabitFromTask,
  } = useAppStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterElement, setFilterElement] = useState<ElementId | null>(null);
  const [activeTab, setActiveTab] = useState('pending');
  const [activeTask, setActiveTask] = useState<string | null>(null);
  const [showTimer, setShowTimer] = useState(false);
  const [completedTaskId, setCompletedTaskId] = useState<string | null>(null);
  const [earnedPoints, setEarnedPoints] = useState(0);
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemValue, setNewItemValue] = useState(1);
  const [newItemMinutes, setNewItemMinutes] = useState('');
  const [activeAddItemTarget, setActiveAddItemTarget] = useState<{
    taskId: string;
    parentItemId: string | null;
  } | null>(null);
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const [quickCreateName, setQuickCreateName] = useState('');
  const [showQuickEdit, setShowQuickEdit] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null); // 🎯 ID do TaskItem sendo editado
  const [editingItemTaskId, setEditingItemTaskId] = useState<string | null>(null); // 🎯 TaskId do pai do item
  const [editName, setEditName] = useState('');
  const [editArea, setEditArea] = useState<string>('none');
  const [editSubarea, setEditSubarea] = useState<string>('none');
  const [editAreaSecondary, setEditAreaSecondary] = useState<string>('none');
  const [editSubareaSecondary, setEditSubareaSecondary] = useState<string>('none');
  const [editAreaTertiary, setEditAreaTertiary] = useState<string>('none');
  const [editSubareaTertiary, setEditSubareaTertiary] = useState<string>('none');
  const [enableSecondary, setEnableSecondary] = useState(false);
  const [enableTertiary, setEnableTertiary] = useState(false);
  const [editPoints, setEditPoints] = useState(1);
  const [editTimeMinutes, setEditTimeMinutes] = useState<number>(0);
  const [editTimeSeconds, setEditTimeSeconds] = useState<number>(0);
  const [hasTime, setHasTime] = useState(false);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverTaskId, setDragOverTaskId] = useState<string | null>(null);



  // Filter tasks
  const filteredTasks = tasks.filter((task) => {
    // Filter by status
    if (activeTab === 'pending' && task.isCompleted) return false;
    if (activeTab === 'completed' && !task.isCompleted) return false;
    
    // Filter by search
    if (searchQuery && !task.title.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    
    // Filter by element
    if (filterElement) {
      if (!task.areaPrimaryId) return false;
      if (task.elementId !== filterElement) return false;
    }
    
    return true;
  }).sort((a, b) => a.displayOrder - b.displayOrder); // Ordenação manual! 🎯

  // Stats
  const pendingCount = tasks.filter(t => !t.isCompleted).length;
  const completedCount = tasks.filter(t => t.isCompleted).length;

  // Start task timer
  const handleStartTask = (taskId: string) => {
    setActiveTask(taskId);
    startTimer(taskId, 'TASK');
    setShowTimer(true);
  };

  // Stop and complete task
  const handleStopAndComplete = () => {
    if (!activeTask) return;
    
    const elapsedSeconds = stopTimer();
    const timeSpentMinutes = elapsedSeconds / 60;
    
    const points = completeTask(activeTask, timeSpentMinutes);
    setEarnedPoints(points);
    setCompletedTaskId(activeTask);
    setShowTimer(false);
    setActiveTask(null);
    
    setTimeout(() => {
      setCompletedTaskId(null);
      setEarnedPoints(0);
    }, 3000);
  };

  // Add item to task
  const handleAddItem = (taskId: string, parentItemId: string | null) => {
    if (!newItemTitle.trim()) return;

    const parsedMinutes = newItemMinutes.trim() ? Number(newItemMinutes) : null;

    addTaskItem(
      taskId,
      {
        title: newItemTitle.trim(),
        semanticType: 'valuable',
        baseValue: newItemValue > 0 ? newItemValue : 1,
        plannedTimeMinutes: parsedMinutes && parsedMinutes > 0 ? parsedMinutes : null,
      },
      parentItemId
    );
    
    setNewItemTitle('');
    setNewItemValue(1);
    setNewItemMinutes('');
    setActiveAddItemTarget(null);
  };

  const handleTaskDragStart = (taskId: string) => {
    setDraggedTaskId(taskId);
  };

  const handleTaskDragOver = (taskId: string) => {
    if (taskId !== draggedTaskId) {
      setDragOverTaskId(taskId);
    }
  };

  const handleTaskDrop = (targetTaskId: string) => {
    if (!draggedTaskId || draggedTaskId === targetTaskId) {
      setDraggedTaskId(null);
      setDragOverTaskId(null);
      return;
    }

    const orderedTasks = [...tasks].sort((a, b) => a.displayOrder - b.displayOrder);
    const fromIndex = orderedTasks.findIndex((task) => task.id === draggedTaskId);
    const toIndex = orderedTasks.findIndex((task) => task.id === targetTaskId);

    if (fromIndex < 0 || toIndex < 0) {
      setDraggedTaskId(null);
      setDragOverTaskId(null);
      return;
    }

    const [movedTask] = orderedTasks.splice(fromIndex, 1);
    orderedTasks.splice(toIndex, 0, movedTask);

    reorderTasks(orderedTasks.map((task) => task.id));

    setDraggedTaskId(null);
    setDragOverTaskId(null);
  };

  const handleTaskDragEnd = () => {
    setDraggedTaskId(null);
    setDragOverTaskId(null);
  };

  // Quick create ritual
  const handleQuickCreate = () => {
    if (!quickCreateName.trim()) return;
    
    addTask({
      title: quickCreateName.trim(),
      areaPrimaryId: null,
      baseValue: 1,
      elementId: filterElement || 'terra',
      plannedTimeMinutes: null, // Sem tempo por padrão
    });
    
    setQuickCreateName('');
    setShowQuickCreate(false);
  };

  // Duplicate task
  const handleDuplicate = (taskId: string) => {
    duplicateTask(taskId);
  };

  // Convert task to habit/cycle and navigate to Ciclos page
  const handleConvertToCycle = (taskId: string) => {
    createHabitFromTask(taskId, new Date());
    navigate('/ciclos');
  };

  // Save edit
  const handleSaveEdit = () => {
    if (!editingTaskId && !editingItemId) return;

    const useSecondary = enableSecondary;
    const useTertiary = enableSecondary && enableTertiary && editAreaSecondary !== 'none';
    
    // Editando um Task (pai)
    if (editingTaskId) {
      const { updateTask } = useAppStore.getState();
      const task = tasks.find(t => t.id === editingTaskId);
      const hasChildren = Boolean(task && task.childItems.length > 0);

      const nextAreaPrimaryId = hasChildren
        ? (task?.areaPrimaryId ?? null)
        : (editArea === 'none' ? null : editArea || null);
      const nextSubareaPrimaryId = hasChildren
        ? (task?.subareaPrimaryId ?? null)
        : (editSubarea === 'none' ? null : editSubarea || null);
      const nextAreaSecondaryId1 = hasChildren
        ? (task?.areaSecondaryId1 ?? null)
        : (useSecondary ? (editAreaSecondary === 'none' ? null : editAreaSecondary || null) : null);
      const nextAreaSecondaryId2 = hasChildren
        ? (task?.areaSecondaryId2 ?? null)
        : (useTertiary ? (editAreaTertiary === 'none' ? null : editAreaTertiary || null) : null);
      const nextSubareaSecondaryId1 = hasChildren
        ? (task?.subareaSecondaryId1 ?? null)
        : (useSecondary ? (editSubareaSecondary === 'none' ? null : editSubareaSecondary || null) : null);
      const nextSubareaSecondaryId2 = hasChildren
        ? (task?.subareaSecondaryId2 ?? null)
        : (useTertiary ? (editSubareaTertiary === 'none' ? null : editSubareaTertiary || null) : null);
      const nextPlannedTimeMinutes = hasChildren
        ? (task?.plannedTimeMinutes ?? null)
        : (hasTime && (editTimeMinutes > 0 || editTimeSeconds > 0) 
            ? editTimeMinutes + (editTimeSeconds / 60) 
            : null);
      
      updateTask(editingTaskId, {
        title: editName.trim(),
        areaPrimaryId: nextAreaPrimaryId,
        subareaPrimaryId: nextSubareaPrimaryId,
        areaSecondaryId1: nextAreaSecondaryId1,
        areaSecondaryId2: nextAreaSecondaryId2,
        subareaSecondaryId1: nextSubareaSecondaryId1,
        subareaSecondaryId2: nextSubareaSecondaryId2,
        // Se tem filhos, não permite editar baseValue (agregador puro)
        baseValue: hasChildren ? 0 : editPoints,
        plannedTimeMinutes: nextPlannedTimeMinutes,
      });
    }
    // Editando um TaskItem (filho/neto)
    else if (editingItemId && editingItemTaskId) {
      const { updateTaskItem } = useAppStore.getState();
      
      // Buscar o item para verificar se tem filhos (é agregador)
      const findItemById = (items: TaskItem[], id: string): TaskItem | null => {
        for (const item of items) {
          if (item.id === id) return item;
          if (item.childItems.length > 0) {
            const found = findItemById(item.childItems, id);
            if (found) return found;
          }
        }
        return null;
      };
      
      const task = tasks.find(t => t.id === editingItemTaskId);
      const item = task ? findItemById(task.childItems, editingItemId) : null;
      const hasChildren = Boolean(item && item.childItems.length > 0);
      
      const nextAreaPrimaryId = hasChildren
        ? (item?.areaPrimaryId ?? null)
        : (editArea === 'none' ? null : editArea || null);
      const nextSubareaPrimaryId = hasChildren
        ? (item?.subareaPrimaryId ?? null)
        : (editSubarea === 'none' ? null : editSubarea || null);
      const nextAreaSecondaryId1 = hasChildren
        ? (item?.areaSecondaryId1 ?? null)
        : (useSecondary ? (editAreaSecondary === 'none' ? null : editAreaSecondary || null) : null);
      const nextAreaSecondaryId2 = hasChildren
        ? (item?.areaSecondaryId2 ?? null)
        : (useTertiary ? (editAreaTertiary === 'none' ? null : editAreaTertiary || null) : null);
      const nextSubareaSecondaryId1 = hasChildren
        ? (item?.subareaSecondaryId1 ?? null)
        : (useSecondary ? (editSubareaSecondary === 'none' ? null : editSubareaSecondary || null) : null);
      const nextSubareaSecondaryId2 = hasChildren
        ? (item?.subareaSecondaryId2 ?? null)
        : (useTertiary ? (editSubareaTertiary === 'none' ? null : editSubareaTertiary || null) : null);
      const nextPlannedTimeMinutes = hasChildren
        ? (item?.plannedTimeMinutes ?? null)
        : (hasTime && (editTimeMinutes > 0 || editTimeSeconds > 0) 
            ? editTimeMinutes + (editTimeSeconds / 60) 
            : null);
      
      updateTaskItem(editingItemTaskId, editingItemId, {
        title: editName.trim(),
        areaPrimaryId: nextAreaPrimaryId,
        subareaPrimaryId: nextSubareaPrimaryId,
        areaSecondaryId1: nextAreaSecondaryId1,
        areaSecondaryId2: nextAreaSecondaryId2,
        subareaSecondaryId1: nextSubareaSecondaryId1,
        subareaSecondaryId2: nextSubareaSecondaryId2,
        baseValue: hasChildren ? 0 : editPoints,
        plannedTimeMinutes: nextPlannedTimeMinutes,
      });
    }
    
    setShowQuickEdit(false);
    setEditingTaskId(null);
    setEditingItemId(null);
    setEditingItemTaskId(null);
    setEditName('');
    setEditArea('none');
    setEditSubarea('none');
    setEditAreaSecondary('none');
    setEditSubareaSecondary('none');
    setEditAreaTertiary('none');
    setEditSubareaTertiary('none');
    setEnableSecondary(false);
    setEnableTertiary(false);
    setEditPoints(1);
    setEditTimeMinutes(0);
    setHasTime(false);
  };

  // Open edit for existing task
  const handleOpenEdit = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    setEditingTaskId(taskId);
    setEditingItemId(null);
    setEditingItemTaskId(null);
    setEditName(task.title);
    setEditArea(task.areaPrimaryId || 'none');
    setEditSubarea(task.subareaPrimaryId || 'none');
    const hasSecondary = Boolean(task.areaSecondaryId1);
    const hasTertiary = Boolean(task.areaSecondaryId2);
    setEditAreaSecondary(task.areaSecondaryId1 || 'none');
    setEditSubareaSecondary(task.subareaSecondaryId1 || 'none');
    setEditAreaTertiary(task.areaSecondaryId2 || 'none');
    setEditSubareaTertiary(task.subareaSecondaryId2 || 'none');
    setEnableSecondary(hasSecondary || hasTertiary);
    setEnableTertiary(hasTertiary);
    setEditPoints(task.baseValue || 1);
    const totalMinutes = task.plannedTimeMinutes || 0;
    setEditTimeMinutes(Math.floor(totalMinutes));
    setEditTimeSeconds(Math.round((totalMinutes % 1) * 60));
    setHasTime(totalMinutes > 0);
    setShowQuickEdit(true);
  };

  // Open edit for existing TaskItem (filho/neto)
  const handleOpenEditItem = (taskId: string, itemId: string) => {
    // Buscar o item recursivamente
    const findItemById = (items: TaskItem[], id: string): TaskItem | null => {
      for (const item of items) {
        if (item.id === id) return item;
        if (item.childItems.length > 0) {
          const found = findItemById(item.childItems, id);
          if (found) return found;
        }
      }
      return null;
    };
    
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    const item = findItemById(task.childItems, itemId);
    if (!item) return;
    
    setEditingTaskId(null);
    setEditingItemId(itemId);
    setEditingItemTaskId(taskId);
    setEditName(item.title);
    setEditArea(item.areaPrimaryId || 'none');
    setEditSubarea(item.subareaPrimaryId || 'none');
    const hasSecondary = Boolean(item.areaSecondaryId1);
    const hasTertiary = Boolean(item.areaSecondaryId2);
    setEditAreaSecondary(item.areaSecondaryId1 || 'none');
    setEditSubareaSecondary(item.subareaSecondaryId1 || 'none');
    setEditAreaTertiary(item.areaSecondaryId2 || 'none');
    setEditSubareaTertiary(item.subareaSecondaryId2 || 'none');
    setEnableSecondary(hasSecondary || hasTertiary);
    setEnableTertiary(hasTertiary);
    setEditPoints(item.baseValue || 1);
    const totalMinutes = item.plannedTimeMinutes || 0;
    setEditTimeMinutes(Math.floor(totalMinutes));
    setEditTimeSeconds(Math.round((totalMinutes % 1) * 60));
    setHasTime(totalMinutes > 0);
    setShowQuickEdit(true);
  };

  // Get active task data
  const activeTaskData = activeTask ? tasks.find((t) => t.id === activeTask) : null;
  
  // 🎯 Detectar se está editando um agregador (pai com filhos OU filho com netos)
  const editingTask = editingTaskId ? tasks.find(t => t.id === editingTaskId) : null;
  
  // Helper para buscar TaskItem recursivamente
  const findTaskItemById = (items: TaskItem[], id: string): TaskItem | null => {
    for (const item of items) {
      if (item.id === id) return item;
      if (item.childItems.length > 0) {
        const found = findTaskItemById(item.childItems, id);
        if (found) return found;
      }
    }
    return null;
  };
  
  const editingItem = editingItemId && editingItemTaskId
    ? (() => {
        const task = tasks.find(t => t.id === editingItemTaskId);
        return task ? findTaskItemById(task.childItems, editingItemId) : null;
      })()
    : null;
  
  const isEditingTaskAggregator = Boolean(editingTask && editingTask.childItems.length > 0);
  const isEditingItemAggregator = Boolean(editingItem && editingItem.childItems.length > 0);
  const isEditingParentTask = Boolean(editingTaskId && !editingItemId);
  const isAggregatorLocked = !!((isEditingParentTask && isEditingTaskAggregator) || (editingItemId && isEditingItemAggregator));

  const allAreasForEdit = useMemo(() => {
    const mergedAreas = [...AREAS, ...customAreas];
    const originalIndex = new Map(mergedAreas.map((area, index) => [area.id, index]));
    const elementOrder: Record<ElementId, number> = {
      terra: 0,
      fogo: 1,
      agua: 2,
      ar: 3,
    };

    return [...mergedAreas].sort((a, b) => {
      const elementDiff = elementOrder[a.elementId] - elementOrder[b.elementId];
      if (elementDiff !== 0) return elementDiff;

      const customDiff = Number(Boolean(a.isCustom)) - Number(Boolean(b.isCustom));
      if (customDiff !== 0) return customDiff;

      return (originalIndex.get(a.id) ?? 0) - (originalIndex.get(b.id) ?? 0);
    });
  }, [customAreas]);

  const getMergedSubareasForArea = (areaId: string) => {
    const selectedArea = allAreasForEdit.find((area) => area.id === areaId);
    const builtInSubareas = allAreasForEdit
      .flatMap((rootArea) => rootArea.subareas || [])
      .filter((subarea) => subarea.parentId === areaId);

    const inlineSubareas = (selectedArea?.subareas || []).filter(
      (subarea) => subarea.parentId === areaId
    );

    const persistedCustomSubareas = customSubareas[areaId] || [];
    const uniqueById = new Map(
      [...builtInSubareas, ...inlineSubareas, ...persistedCustomSubareas].map((subarea) => [
        subarea.id,
        subarea,
      ])
    );

    return Array.from(uniqueById.values());
  };
  
  const selectedAreaForEdit = editArea !== 'none' ? allAreasForEdit.find((area) => area.id === editArea) : null;
  const dynamicSubareasForEdit = selectedAreaForEdit ? getMergedSubareasForArea(selectedAreaForEdit.id) : [];
  const selectedAreaSecondaryForEdit = editAreaSecondary !== 'none'
    ? allAreasForEdit.find((area) => area.id === editAreaSecondary)
    : null;
  const dynamicSubareasSecondaryForEdit = selectedAreaSecondaryForEdit
    ? getMergedSubareasForArea(selectedAreaSecondaryForEdit.id)
    : [];
  const selectedAreaTertiaryForEdit = editAreaTertiary !== 'none'
    ? allAreasForEdit.find((area) => area.id === editAreaTertiary)
    : null;
  const dynamicSubareasTertiaryForEdit = selectedAreaTertiaryForEdit
    ? getMergedSubareasForArea(selectedAreaTertiaryForEdit.id)
    : [];

  return (
    <AppLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-mystic text-xl">Rituais</h2>
          <p className="text-sm text-white/50">
            {pendingCount} pendentes • {completedCount} concluídos
          </p>
        </div>
        <Button 
          onClick={() => setShowQuickCreate(true)}
          className="bg-mystic-arcane hover:bg-mystic-arcane/80"
        >
          <Plus className="w-4 h-4 mr-1" />
          Novo
        </Button>
      </div>

      <ScoreHierarchyPanel
        tasks={tasks}
        habits={habits}
        customAreas={customAreas}
        customSubareas={customSubareas}
      />

      {/* Search and Filter */}
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/40" />
          <Input
            placeholder="Buscar ritual..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-white/5 border-white/10"
          />
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="border-white/20">
              <Filter className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-mystic-purple border-white/10">
            <DropdownMenuItem onClick={() => setFilterElement(null)}>
              Todos os elementos
            </DropdownMenuItem>
            {Object.values(ELEMENTS).map((element) => (
              <DropdownMenuItem 
                key={element.id} 
                onClick={() => setFilterElement(element.id)}
              >
                <span className="mr-2">{element.icon}</span>
                {element.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Active Filter */}
      <AnimatePresence>
        {filterElement && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-4"
          >
            <Badge 
              variant="outline" 
              className="cursor-pointer bg-white/5"
              onClick={() => setFilterElement(null)}
            >
              {ELEMENTS[filterElement].icon} {ELEMENTS[filterElement].name} ✕
            </Badge>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-4">
        <TabsList className="grid w-full grid-cols-2 bg-white/5">
          <TabsTrigger value="pending" className="data-[state=active]:bg-mystic-arcane">
            <ListTodo className="w-4 h-4 mr-1" />
            Pendentes ({pendingCount})
          </TabsTrigger>
          <TabsTrigger value="completed" className="data-[state=active]:bg-mystic-arcane">
            <Check className="w-4 h-4 mr-1" />
            Concluídos ({completedCount})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4">
          <AnimatePresence mode="popLayout">
            {filteredTasks.length > 0 ? (
              <div className="space-y-3">
                {filteredTasks.map((task) => (
                  <TaskCard 
                    key={task.id} 
                    task={task}
                    customAreas={customAreas}
                    customSubareas={customSubareas}
                    onStart={() => handleStartTask(task.id)}
                    onComplete={() => {
                      const points = completeTask(task.id);
                      setEarnedPoints(points);
                      setCompletedTaskId(task.id);
                      setTimeout(() => {
                        setCompletedTaskId(null);
                        setEarnedPoints(0);
                      }, 3000);
                    }}
                    onDelete={() => deleteTask(task.id)}
                                        onDuplicate={() => handleDuplicate(task.id)}
                                        onConvertToCycle={() => handleConvertToCycle(task.id)}
                    onToggleExpand={() => toggleTaskExpansion(task.id)}
                    onStartAddItem={(parentItemId) => {
                      // Toggle: se já está aberto para este item, fecha; senão abre
                      if (activeAddItemTarget?.taskId === task.id && activeAddItemTarget?.parentItemId === parentItemId) {
                        setActiveAddItemTarget(null);
                      } else {
                        setActiveAddItemTarget({ taskId: task.id, parentItemId });
                      }
                    }}
                    onCancelAddItem={() => setActiveAddItemTarget(null)}
                    onSubmitItem={(parentItemId) => handleAddItem(task.id, parentItemId)}
                    addItemTarget={
                      activeAddItemTarget?.taskId === task.id ? activeAddItemTarget : null
                    }
                    newItemTitle={newItemTitle}
                    setNewItemTitle={setNewItemTitle}
                    newItemValue={newItemValue}
                    setNewItemValue={setNewItemValue}
                    newItemMinutes={newItemMinutes}
                    setNewItemMinutes={setNewItemMinutes}
                    onCompleteItem={(itemId) => completeTaskItem(task.id, itemId)}
                    onUncompleteItem={(itemId) => uncompleteTaskItem(task.id, itemId)}
                    onDeleteItem={(itemId) => deleteTaskItem(task.id, itemId)}
                    onToggleItemExpand={(itemId) => toggleTaskItemExpansion(task.id, itemId)}
                    onMoveItemUp={(itemId) => moveTaskItemUp(task.id, itemId)}
                    onMoveItemDown={(itemId) => moveTaskItemDown(task.id, itemId)}
                    onOpenEdit={() => handleOpenEdit(task.id)}
                    onOpenEditItem={handleOpenEditItem}
                    onMoveUp={() => moveTaskUp(task.id)}
                    onMoveDown={() => moveTaskDown(task.id)}
                    draggable={!task.isCompleted}
                    isDragOver={dragOverTaskId === task.id}
                    onDragStart={() => handleTaskDragStart(task.id)}
                    onDragOver={() => handleTaskDragOver(task.id)}
                    onDrop={() => handleTaskDrop(task.id)}
                    onDragEnd={handleTaskDragEnd}
                  />
                ))}
              </div>
            ) : (
              <EmptyState type="pending" onCreate={() => navigate('/invocar')} />
            )}
          </AnimatePresence>
        </TabsContent>

        <TabsContent value="completed" className="mt-4">
          <AnimatePresence mode="popLayout">
            {filteredTasks.length > 0 ? (
              <div className="space-y-3">
                {filteredTasks.map((task) => (
                  <TaskCard 
                    key={task.id} 
                    task={task}
                    customAreas={customAreas}
                    customSubareas={customSubareas}
                    completed
                    onUncomplete={() => uncompleteTask(task.id)}
                  />
                ))}
              </div>
            ) : (
              <EmptyState type="completed" />
            )}
          </AnimatePresence>
        </TabsContent>
      </Tabs>

      {/* Timer Modal */}
      <Dialog open={showTimer} onOpenChange={setShowTimer}>
        <DialogContent className="bg-mystic-purple border-white/20 max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-mystic text-center text-xl">
              Ritual em Andamento
            </DialogTitle>
            <DialogDescription className="sr-only">
              Acompanhe o tempo do seu ritual
            </DialogDescription>
          </DialogHeader>
          
          {activeTaskData && (
            <div className="text-center py-6">
              <div className="text-5xl mb-4">{ELEMENTS[activeTaskData.elementId].icon}</div>
              <h3 className="font-mystic text-lg mb-1">{activeTaskData.title}</h3>
              <p className="text-sm text-white/50 mb-2">
                Meta: {formatDuration(activeTaskData.plannedTimeMinutes || 30)}
              </p>
              <Badge variant="outline" className="bg-white/5 mb-6">
                Esforço: {EFFORT_LABELS[activeTaskData.effortLevel || 2].label}
              </Badge>
              
              {/* Timer Display */}
              <div className="text-6xl font-mono font-bold text-mystic-gold mb-6">
                {formatTime(timer.elapsedSeconds)}
              </div>
              
              {/* Controls */}
              <div className="flex justify-center gap-4">
                {timer.isRunning ? (
                  <Button
                    onClick={() => useAppStore.getState().pauseTimer()}
                    variant="outline"
                    className="w-16 h-16 rounded-full border-white/20"
                  >
                    <Pause className="w-6 h-6" />
                  </Button>
                ) : (
                  <Button
                    onClick={() => useAppStore.getState().resumeTimer()}
                    variant="outline"
                    className="w-16 h-16 rounded-full border-mystic-gold/50 bg-mystic-gold/10"
                  >
                    <Play className="w-6 h-6" />
                  </Button>
                )}
                
                <Button
                  onClick={handleStopAndComplete}
                  className="w-16 h-16 rounded-full bg-mystic-gold text-black hover:bg-mystic-gold/90"
                >
                  <Check className="w-6 h-6" />
                </Button>
              </div>
              
              <p className="text-xs text-white/40 mt-4">
                Toque em ✓ para completar
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Completion Feedback */}
      <AnimatePresence>
        {completedTaskId && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-24 left-4 right-4 z-50"
          >
            <div className="bg-gradient-to-r from-mystic-gold to-orange-400 text-black rounded-2xl p-4 
                          shadow-lg shadow-mystic-gold/30 text-center">
              <p className="font-mystic text-lg">✨ Ritual Completado! ✨</p>
              <p className="text-sm font-medium">+{earnedPoints} pontos ganhos</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick Create Modal */}
      <Dialog open={showQuickCreate} onOpenChange={setShowQuickCreate}>
        <DialogContent className="bg-mystic-purple border-white/20 max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-mystic text-xl">
              Novo Ritual
            </DialogTitle>
            <DialogDescription className="text-white/50">
              Crie um novo ritual rapidamente
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm text-white/70 mb-2 block">Nome do Ritual</label>
              <Input
                placeholder="Digite o nome..."
                value={quickCreateName}
                onChange={(e) => setQuickCreateName(e.target.value)}
                className="bg-white/5 border-white/10"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleQuickCreate();
                  if (e.key === 'Escape') setShowQuickCreate(false);
                }}
              />
            </div>

            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={() => setShowQuickCreate(false)}
                className="flex-1 border-white/20"
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleQuickCreate}
                disabled={!quickCreateName.trim()}
                className="flex-1 bg-mystic-arcane hover:bg-mystic-arcane/80"
              >
                Criar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={showQuickEdit} onOpenChange={setShowQuickEdit}>
        <DialogContent className="bg-mystic-purple border-white/20 max-w-md">
          <DialogHeader>
            <DialogTitle className="font-mystic text-xl">
              {editingItemId ? 'Editar Subitem' : 'Editar Ritual'}
            </DialogTitle>
            <DialogDescription className="text-white/50">
              {editingItemId ? 'Atualize as informações do subitem' : 'Atualize as informações do ritual'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto">
            {isAggregatorLocked && (
              <div className="rounded-md border border-yellow-400/30 bg-yellow-400/10 px-3 py-2 text-xs text-yellow-300">
                Este ritual é agregador (tem filhos). Áreas, tempo e pontuação base são herdados/somados dos subitens e não podem ser alterados aqui.
              </div>
            )}

            {/* Nome */}
            <div>
              <label className="text-sm text-white/70 mb-2 block">Nome</label>
              <Input
                placeholder="Nome do ritual..."
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && editName.trim()) {
                    e.preventDefault();
                    handleSaveEdit();
                  }
                }}
                className="bg-white/5 border-white/10"
              />
            </div>

            {/* Área Primária e Subárea Primária */}
            <div className="grid grid-cols-2 gap-3 pb-4 border-b border-white/10">
              <div>
                <label className="text-sm text-white/70 mb-2 block">Área Primária</label>
                <Select 
                  value={editArea} 
                  onValueChange={(value) => {
                    setEditArea(value);
                    if (value === 'none') setEditSubarea('none');
                  }}
                  disabled={isAggregatorLocked}
                >
                  <SelectTrigger
                    className="bg-white/5 border-white/10"
                    style={selectedAreaForEdit ? { borderColor: `${selectedAreaForEdit.color}80` } : undefined}
                  >
                    <SelectValue placeholder="Sem categoria" />
                  </SelectTrigger>
                  <SelectContent className="bg-mystic-purple border-white/10">
                    <SelectItem value="none">Sem categoria (+1 pt)</SelectItem>
                    {allAreasForEdit.map((area) => (
                      <SelectItem key={area.id} value={area.id}>
                        <span className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: area.color }} />
                          <span style={{ color: area.color }}>{area.name}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm text-white/70 mb-2 block">Subárea Primária</label>
                <Select
                  value={editSubarea}
                  onValueChange={setEditSubarea}
                  disabled={isAggregatorLocked || !editArea || editArea === 'none'}
                >
                  <SelectTrigger
                    className="bg-white/5 border-white/10"
                    style={selectedAreaForEdit ? { borderColor: `${selectedAreaForEdit.color}60` } : undefined}
                  >
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent className="bg-mystic-purple border-white/10">
                    <SelectItem value="none">Nenhuma</SelectItem>
                    {dynamicSubareasForEdit.map((subarea) => (
                      <SelectItem key={subarea.id} value={subarea.id}>
                        <span className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full opacity-70"
                            style={{ backgroundColor: selectedAreaForEdit?.color || '#FFFFFF' }}
                          />
                          <span style={{ color: selectedAreaForEdit?.color || '#FFFFFF' }}>{subarea.name}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Área Secundária e Subárea Secundária */}
            <div className="space-y-3 py-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="enableSecondary"
                  checked={enableSecondary}
                  onChange={(e) => {
                    const isEnabled = e.target.checked;
                    setEnableSecondary(isEnabled);
                    if (!isEnabled) {
                      setEditAreaSecondary('none');
                      setEditSubareaSecondary('none');
                      setEnableTertiary(false);
                      setEditAreaTertiary('none');
                      setEditSubareaTertiary('none');
                    }
                  }}
                  disabled={isAggregatorLocked}
                  className="w-4 h-4 rounded cursor-pointer"
                />
                <label htmlFor="enableSecondary" className={`text-sm cursor-pointer ${isAggregatorLocked ? 'text-white/40' : 'text-white/70'}`}>
                  Ativar área secundária
                </label>
              </div>

              {enableSecondary && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm text-white/70 mb-2 block">Área Secundária</label>
                    <Select 
                      value={editAreaSecondary} 
                      onValueChange={(value) => {
                        setEditAreaSecondary(value);
                        if (value === 'none') {
                          setEditSubareaSecondary('none');
                          setEnableTertiary(false);
                          setEditAreaTertiary('none');
                          setEditSubareaTertiary('none');
                        }
                      }}
                      disabled={isAggregatorLocked}
                    >
                      <SelectTrigger
                        className="bg-white/5 border-white/10"
                        style={selectedAreaSecondaryForEdit ? { borderColor: `${selectedAreaSecondaryForEdit.color}80` } : undefined}
                      >
                        <SelectValue placeholder="Nenhuma" />
                      </SelectTrigger>
                      <SelectContent className="bg-mystic-purple border-white/10">
                        <SelectItem value="none">Nenhuma</SelectItem>
                        {allAreasForEdit.map((area) => (
                          <SelectItem key={area.id} value={area.id}>
                            <span className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: area.color }} />
                              <span style={{ color: area.color }}>{area.name}</span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm text-white/70 mb-2 block">Subárea Secundária</label>
                    <Select
                      value={editSubareaSecondary}
                      onValueChange={setEditSubareaSecondary}
                      disabled={isAggregatorLocked || !editAreaSecondary || editAreaSecondary === 'none'}
                    >
                      <SelectTrigger
                        className="bg-white/5 border-white/10"
                        style={selectedAreaSecondaryForEdit ? { borderColor: `${selectedAreaSecondaryForEdit.color}60` } : undefined}
                      >
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent className="bg-mystic-purple border-white/10">
                        <SelectItem value="none">Nenhuma</SelectItem>
                        {dynamicSubareasSecondaryForEdit.map((subarea) => (
                          <SelectItem key={subarea.id} value={subarea.id}>
                            <span className="flex items-center gap-2">
                              <span
                                className="w-2.5 h-2.5 rounded-full opacity-70"
                                style={{ backgroundColor: selectedAreaSecondaryForEdit?.color || '#FFFFFF' }}
                              />
                              <span style={{ color: selectedAreaSecondaryForEdit?.color || '#FFFFFF' }}>{subarea.name}</span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>

            {enableSecondary && (
              <>
            {/* Área Terciária e Subárea Terciária */}
            <div className="space-y-3 pt-4">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="enableTertiary"
                  checked={enableTertiary}
                  onChange={(e) => {
                    const isEnabled = e.target.checked;
                    setEnableTertiary(isEnabled);
                    if (!isEnabled) {
                      setEditAreaTertiary('none');
                      setEditSubareaTertiary('none');
                    }
                  }}
                  disabled={isAggregatorLocked || !enableSecondary || editAreaSecondary === 'none'}
                  className="w-4 h-4 rounded cursor-pointer"
                />
                <label htmlFor="enableTertiary" className={`text-sm cursor-pointer ${(isAggregatorLocked || !enableSecondary || editAreaSecondary === 'none') ? 'text-white/40' : 'text-white/70'}`}>
                  Ativar área terciária
                </label>
              </div>

              {enableTertiary && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm text-white/70 mb-2 block">Área Terciária</label>
                    <Select 
                      value={editAreaTertiary} 
                      onValueChange={(value) => {
                        setEditAreaTertiary(value);
                        if (value === 'none') setEditSubareaTertiary('none');
                      }}
                      disabled={isAggregatorLocked}
                    >
                      <SelectTrigger
                        className="bg-white/5 border-white/10"
                        style={selectedAreaTertiaryForEdit ? { borderColor: `${selectedAreaTertiaryForEdit.color}80` } : undefined}
                      >
                        <SelectValue placeholder="Nenhuma" />
                      </SelectTrigger>
                      <SelectContent className="bg-mystic-purple border-white/10">
                        <SelectItem value="none">Nenhuma</SelectItem>
                        {allAreasForEdit.map((area) => (
                          <SelectItem key={area.id} value={area.id}>
                            <span className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: area.color }} />
                              <span style={{ color: area.color }}>{area.name}</span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm text-white/70 mb-2 block">Subárea Terciária</label>
                    <Select
                      value={editSubareaTertiary}
                      onValueChange={setEditSubareaTertiary}
                      disabled={isAggregatorLocked || !editAreaTertiary || editAreaTertiary === 'none'}
                    >
                      <SelectTrigger
                        className="bg-white/5 border-white/10"
                        style={selectedAreaTertiaryForEdit ? { borderColor: `${selectedAreaTertiaryForEdit.color}60` } : undefined}
                      >
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent className="bg-mystic-purple border-white/10">
                        <SelectItem value="none">Nenhuma</SelectItem>
                        {dynamicSubareasTertiaryForEdit.map((subarea) => (
                          <SelectItem key={subarea.id} value={subarea.id}>
                            <span className="flex items-center gap-2">
                              <span
                                className="w-2.5 h-2.5 rounded-full opacity-70"
                                style={{ backgroundColor: selectedAreaTertiaryForEdit?.color || '#FFFFFF' }}
                              />
                              <span style={{ color: selectedAreaTertiaryForEdit?.color || '#FFFFFF' }}>{subarea.name}</span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>
              </>
            )}

            {/* Pontuação */}
            <div>
              <label className="text-sm text-white/70 mb-2 block">Pontuação Base</label>
              <Input
                type="number"
                min="1"
                max="100"
                value={editPoints}
                onChange={(e) => setEditPoints(Math.max(1, parseInt(e.target.value) || 1))}
                disabled={isAggregatorLocked}
                className="bg-white/5 border-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
              />
              {isAggregatorLocked && (
                <p className="text-xs text-yellow-400/70 mt-1">
                  ⚠️ Este item é agregador (tem filhos). Pontuação vem dos subitens.
                </p>
              )}
            </div>

            {/* Tempo */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="hasTime"
                  checked={hasTime}
                  onChange={(e) => setHasTime(e.target.checked)}
                  disabled={isAggregatorLocked}
                  className="w-4 h-4 rounded cursor-pointer"
                />
                <label htmlFor="hasTime" className={`text-sm cursor-pointer flex-1 ${isAggregatorLocked ? 'text-white/40' : 'text-white/70'}`}>
                  Adicionar tempo estimado
                </label>
              </div>

              {hasTime && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm text-white/70 mb-2 block">Minutos</label>
                    <Input
                      type="number"
                      min="0"
                      max="300"
                      placeholder="Ex: 30"
                      value={editTimeMinutes === 0 ? '' : editTimeMinutes}
                      onChange={(e) => {
                        const value = e.target.value === '' ? 0 : parseInt(e.target.value) || 0;
                        setEditTimeMinutes(Math.max(0, Math.min(300, value)));
                      }}
                      onFocus={(e) => {
                        if (editTimeMinutes === 0) {
                          e.target.select();
                        }
                      }}
                      disabled={isAggregatorLocked}
                      className="bg-white/5 border-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-white/70 mb-2 block">Segundos</label>
                    <Input
                      type="number"
                      min="0"
                      max="59"
                      placeholder="Ex: 30"
                      value={editTimeSeconds === 0 ? '' : editTimeSeconds}
                      onChange={(e) => {
                        const value = e.target.value === '' ? 0 : parseInt(e.target.value) || 0;
                        setEditTimeSeconds(Math.max(0, Math.min(59, value)));
                      }}
                      onFocus={(e) => {
                        if (editTimeSeconds === 0) {
                          e.target.select();
                        }
                      }}
                      disabled={isAggregatorLocked}
                      className="bg-white/5 border-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <Button 
                variant="outline" 
                onClick={() => setShowQuickEdit(false)}
                className="flex-1 border-white/20"
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleSaveEdit}
                disabled={!editName.trim()}
                className="flex-1 bg-mystic-arcane hover:bg-mystic-arcane/80"
              >
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

interface TaskCardProps {
  task: Task;
  customAreas: Area[];
  customSubareas: Record<string, Area[]>;
  completed?: boolean;
  onStart?: () => void;
  onComplete?: () => void;
  onUncomplete?: () => void;
  onDelete?: () => void;
    onDuplicate?: () => void;
    onConvertToCycle?: () => void;
  onToggleExpand?: () => void;
  onStartAddItem?: (parentItemId: string | null) => void;
  onCancelAddItem?: () => void;
  onSubmitItem?: (parentItemId: string | null) => void;
  addItemTarget?: { taskId: string; parentItemId: string | null } | null;
  newItemTitle?: string;
  setNewItemTitle?: (value: string) => void;
  newItemValue?: number;
  setNewItemValue?: (value: number) => void;
  newItemMinutes?: string;
  setNewItemMinutes?: (value: string) => void;
  onCompleteItem?: (itemId: string) => void;
  onUncompleteItem?: (itemId: string) => void;
  onDeleteItem?: (itemId: string) => void;
  onToggleItemExpand?: (itemId: string) => void;
  onMoveItemUp?: (itemId: string) => void;
  onMoveItemDown?: (itemId: string) => void;
  onOpenEdit?: () => void;
  onOpenEditItem?: (taskId: string, itemId: string) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  draggable?: boolean;
  isDragOver?: boolean;
  onDragStart?: () => void;
  onDragOver?: () => void;
  onDrop?: () => void;
  onDragEnd?: () => void;
}

const TaskCard: React.FC<TaskCardProps> = ({
  task,
  customAreas,
  customSubareas,
  completed = false,
  onStart,
  onComplete,
  onUncomplete,
  onDelete,
    onDuplicate,
    onConvertToCycle,
  onToggleExpand,
  onStartAddItem,
  onCancelAddItem,
  onSubmitItem,
  addItemTarget,
  newItemTitle = '',
  setNewItemTitle,
  newItemValue = 1,
  setNewItemValue,
  newItemMinutes = '',
  setNewItemMinutes,
  onCompleteItem,
  onUncompleteItem,
  onDeleteItem,
  onOpenEditItem,
  onToggleItemExpand,
  onMoveItemUp,
  onMoveItemDown,
  onOpenEdit,
  onMoveUp,
  onMoveDown,
  draggable = false,
  isDragOver = false,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}) => {
  const topAreasForDisplay = useMemo(() => [...AREAS, ...customAreas], [customAreas]);
  const areaLookup = useMemo(() => {
    const map = new Map<string, Area>();

    topAreasForDisplay.forEach((area) => {
      map.set(area.id, area);
      (area.subareas || []).forEach((subarea) => map.set(subarea.id, subarea));
    });

    Object.values(customSubareas).forEach((subareas) => {
      subareas.forEach((subarea) => map.set(subarea.id, subarea));
    });

    return map;
  }, [topAreasForDisplay, customSubareas]);

  const area = task.areaPrimaryId ? areaLookup.get(task.areaPrimaryId) : null;
  const element = area ? ELEMENTS[area.elementId] : ELEMENTS[task.elementId];
  const primarySubareaId = task.subareaPrimaryId
    || (task.areaSecondaryId1?.startsWith('subarea-') ? task.areaSecondaryId1 : null);
  const subarea = primarySubareaId ? areaLookup.get(primarySubareaId) : null;
  const secondaryAreaId = task.areaSecondaryId1 && !task.areaSecondaryId1.startsWith('subarea-')
    ? task.areaSecondaryId1
    : null;
  const tertiaryAreaId = task.areaSecondaryId2 && !task.areaSecondaryId2.startsWith('subarea-')
    ? task.areaSecondaryId2
    : null;
  const secondaryArea = secondaryAreaId ? areaLookup.get(secondaryAreaId) : null;
  const tertiaryArea = tertiaryAreaId ? areaLookup.get(tertiaryAreaId) : null;
  const secondarySubarea = task.subareaSecondaryId1 ? areaLookup.get(task.subareaSecondaryId1) : null;
  const tertiarySubarea = task.subareaSecondaryId2 ? areaLookup.get(task.subareaSecondaryId2) : null;

  // 🎯 Calcular score a partir dos filhos quando é agregador
  const getTotalValueFromChildren = (items: TaskItem[]): number => {
    return items.reduce((total, item) => {
      if (item.childItems.length > 0) {
        return total + getTotalValueFromChildren(item.childItems);
      }
      return total + (item.semanticType === 'valuable' ? (item.baseValue || 0) : 0);
    }, 0);
  };

  const totalItems = task.childItems.length;
  const isAggregator = totalItems > 0;
  const aggregatedValue = isAggregator ? getTotalValueFromChildren(task.childItems) : 0;
  const score = isAggregator 
    ? aggregatedValue // Para agregador, usar valor total dos filhos
    : (task.baseValue || 1) * (task.effortLevel ? [1, 1.2, 1.5, 2, 2.8][task.effortLevel - 1] : 1);

  const completedItems = task.childItems.filter(i => i.isCompleted).length;

  // Display names with fallback for legacy IDs and unclassified items
  const areaDisplayName = area?.name || 'Sem Categoria';
  const subareaDisplayName = subarea?.name || null;
  const secondaryAreaDisplayName = secondaryArea?.name || null;
  const tertiaryAreaDisplayName = tertiaryArea?.name || null;
  const secondarySubareaDisplayName = secondarySubarea?.name || null;
  const tertiarySubareaDisplayName = tertiarySubarea?.name || null;

  // 🎯 Badge label com pontuação correta (agregada se for agregador)
  // Se não for agregador, mostrar seu próprio score
  // Se for agregador, será calculado depois baseado nos filhos
  const primaryAreaBadgeLabel = task.areaPrimaryId && !isAggregator
    ? `+${Math.round(score)} ${areaDisplayName}${subareaDisplayName ? ` | ${subareaDisplayName}` : ''}`
    : null;
  const secondaryAreaBadgeLabel = secondaryAreaDisplayName && !isAggregator
    ? `+2 ${secondaryAreaDisplayName}${secondarySubareaDisplayName ? ` | ${secondarySubareaDisplayName}` : ''}`
    : null;
  const tertiaryAreaBadgeLabel = tertiaryAreaDisplayName && !isAggregator
    ? `+3 ${tertiaryAreaDisplayName}${tertiarySubareaDisplayName ? ` | ${tertiarySubareaDisplayName}` : ''}`
    : null;

  // 🎯 Calcular áreas agregadas dos filhos
  const getAggregatedAreas = (items: TaskItem[]): Record<string, { points: number; subareaId?: string | null }> => {
    const areaTotals: Record<string, { points: number; subareaIds: Set<string | null> }> = {};
    const processItem = (item: TaskItem) => {
      if (item.childItems.length > 0) {
        // Se tem filhos, processar recursivamente
        item.childItems.forEach(processItem);
      } else {
        // Leaf node - contar área se tiver valor
        const itemValue = item.semanticType === 'valuable' ? (item.baseValue || 0) : 0;
        if (item.areaPrimaryId && itemValue > 0) {
          if (!areaTotals[item.areaPrimaryId]) {
            areaTotals[item.areaPrimaryId] = { points: 0, subareaIds: new Set() };
          }
          areaTotals[item.areaPrimaryId].points += itemValue;
          areaTotals[item.areaPrimaryId].subareaIds.add(item.subareaPrimaryId || null);
        }
      }
    };
    items.forEach(processItem);
    
    // Converter para formato final: se há apenas uma subarea única, incluir; senão, sem subarea
    const result: Record<string, { points: number; subareaId?: string | null }> = {};
    for (const [areaId, data] of Object.entries(areaTotals)) {
      result[areaId] = {
        points: data.points,
        subareaId: data.subareaIds.size === 1 ? Array.from(data.subareaIds)[0] : undefined
      };
    }
    return result;
  };

  const aggregatedAreas = totalItems > 0 ? getAggregatedAreas(task.childItems) : {};
  const aggregatedAreaList = Object.entries(aggregatedAreas)
    .sort((a, b) => {
      // Colocar "sem-categoria" por último
      if (a[0] === 'sem-categoria') return 1;
      if (b[0] === 'sem-categoria') return -1;
      // Demais: ordenar por valor (maior primeiro)
      return b[1].points - a[1].points;
    });

  const isAddTargetFor = (parentItemId: string | null) =>
    addItemTarget?.taskId === task.id && addItemTarget?.parentItemId === parentItemId;

  const getItemAggregate = (item: TaskItem): { value: number; time: number } => {
    if (item.childItems.length > 0) {
      return item.childItems.reduce(
        (acc, child) => {
          const childAgg = getItemAggregate(child);
          return {
            value: acc.value + childAgg.value,
            time: acc.time + childAgg.time,
          };
        },
        { value: 0, time: 0 }
      );
    }

    return {
      value: item.semanticType === 'valuable' ? (item.baseValue || 0) : 0,
      time: item.plannedTimeMinutes || 0,
    };
  };

  const renderTaskItems = (items: TaskItem[], depth = 0, parentItemId: string | null = null) => {
    const sortedItems = [...items].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

    return (
      <div className={depth > 0 ? 'ml-4 border-l border-white/10 pl-3' : ''}>
        {sortedItems.map((item) => {
          const hasChildren = item.childItems.length > 0;
          const isExpanded = item.isExpanded ?? false;
          const showAddInput = isAddTargetFor(item.id);
          const itemAggregate = getItemAggregate(item);
          
          // Badge unificado de área para filhos/netos (mesmo padrão do pai)
          const itemArea = item.areaPrimaryId ? areaLookup.get(item.areaPrimaryId) : null;
          const itemSubarea = item.subareaPrimaryId ? areaLookup.get(item.subareaPrimaryId) : null;
          const itemAreaDisplayName = itemArea?.name || 'Sem Categoria';
          const itemSubareaDisplayName = itemSubarea?.name || null;
          
          // Se é agregador (tem filhos), não mostra seu próprio badge, só os agregados dos netos
          const itemPrimaryBadgeLabel = item.areaPrimaryId && !hasChildren
            ? `+${Math.round(itemAggregate.value)} ${itemAreaDisplayName}${itemSubareaDisplayName ? ` | ${itemSubareaDisplayName}` : ''}`
            : null;
          
          // 🎯 Calcular badges agregados dos netos (se for agregador)
          const itemAggregatedAreas = hasChildren ? getAggregatedAreas(item.childItems) : {};
          const itemAggregatedAreaList = Object.entries(itemAggregatedAreas)
            .sort((a, b) => {
              // Colocar "sem-categoria" por último
              if (a[0] === 'sem-categoria') return 1;
              if (b[0] === 'sem-categoria') return -1;
              // Demais: ordenar por valor (maior primeiro)
              return b[1].points - a[1].points;
            });

          return (
            <div key={item.id} className="space-y-2">
              <div className="flex items-center gap-2 p-2 rounded-lg bg-black/20">
                {!item.isCompleted ? (
                  <button
                    onClick={() => onCompleteItem?.(item.id)}
                    className="w-5 h-5 rounded border flex items-center justify-center border-white/30 hover:border-white/50"
                  >
                    <Check className="w-3 h-3" />
                  </button>
                ) : (
                  <button
                    onClick={() => onUncompleteItem?.(item.id)}
                    className="w-5 h-5 rounded border flex items-center justify-center bg-mystic-gold border-mystic-gold hover:bg-mystic-gold/80"
                    title="Desmarcar"
                  >
                    <X className="w-3 h-3 text-black" />
                  </button>
                )}

                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${item.isCompleted ? 'line-through text-white/40' : ''}`}>
                    {item.title}
                  </p>
                  <div className="flex items-center gap-2 mt-1 text-[10px] flex-wrap">
                    {itemArea && itemPrimaryBadgeLabel && (
                      <Badge 
                        style={{ 
                          backgroundColor: `${itemArea.color}20`, 
                          color: itemArea.color,
                          borderColor: `${itemArea.color}80`
                        }}
                        className="text-[9px] px-1.5 py-0 border"
                      >
                        {itemPrimaryBadgeLabel}
                      </Badge>
                    )}
                    {/* 🎯 Badges agregados dos netos (se for agregador) */}
                    {hasChildren && itemAggregatedAreaList.map(([areaId, data]) => {
                      const aggArea = areaLookup.get(areaId);
                      const aggSubarea = data.subareaId ? areaLookup.get(data.subareaId) : undefined;
                      const aggAreaName = aggArea?.name || (areaId === 'sem-categoria' ? 'Sem Categoria' : null);
                      if (!aggAreaName) return null;
                      return (
                        <Badge 
                          key={areaId}
                          style={{ 
                            backgroundColor: `${aggArea?.color || '#9CA3AF'}10`, 
                            color: aggArea?.color || '#D1D5DB',
                            borderColor: `${aggArea?.color || '#9CA3AF'}50`
                          }}
                          className="text-[9px] px-1.5 py-0 border"
                        >
                          +{Math.round(data.points)} {aggAreaName}
                          {aggSubarea ? ` | ${aggSubarea.name}` : ''}
                        </Badge>
                      );
                    })}
                    {itemAggregate.time > 0 && (
                      <span className="flex items-center gap-1 text-white/50">
                        <Clock className="w-3 h-3" />
                        {itemAggregate.time < 1 
                          ? `${Math.round(itemAggregate.time * 60)}s`
                          : `${itemAggregate.time}min`
                        }
                      </span>
                    )}
                  </div>
                </div>

                {hasChildren && (
                  <button
                    onClick={() => onToggleItemExpand?.(item.id)}
                    className="text-white/40 hover:text-white/70"
                  >
                    {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                )}

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onStartAddItem?.(item.id)}
                    className="text-white/40 hover:text-white/70"
                    title="Adicionar subitem"
                  >
                    <PlusCircle className="w-3 h-3" />
                  </button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        className="text-white/40 hover:text-white/70"
                        title="Mais opções"
                      >
                        <MoreVertical className="w-3 h-3" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={() => onOpenEditItem?.(task.id, item.id)}>
                        <Edit2 className="w-3 h-3 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onMoveItemUp?.(item.id)}>
                        <ArrowUp className="w-3 h-3 mr-2" />
                        Mover para cima
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onMoveItemDown?.(item.id)}>
                        <ArrowDown className="w-3 h-3 mr-2" />
                        Mover para baixo
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => onDeleteItem?.(item.id)}
                        className="text-red-400 focus:text-red-400"
                      >
                        <Trash2 className="w-3 h-3 mr-2" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {showAddInput && (
                <div className="flex flex-nowrap items-center gap-2 pl-7 min-w-0">
                  <Input
                    value={newItemTitle}
                    onChange={(e) => setNewItemTitle?.(e.target.value)}
                    placeholder="Novo subitem..."
                    className="flex-1 min-w-0 h-8 text-sm bg-white/5 border-white/10"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') onSubmitItem?.(item.id);
                      if (e.key === 'Escape') onCancelAddItem?.();
                    }}
                  />
                  <Input
                    type="number"
                    min={1}
                    value={newItemValue}
                    onChange={(e) => setNewItemValue?.(Number(e.target.value))}
                    placeholder="Pts"
                    className="w-14 h-8 text-sm bg-white/5 border-white/10"
                  />
                  <Input
                    type="number"
                    min={0}
                    value={newItemMinutes}
                    onChange={(e) => setNewItemMinutes?.(e.target.value)}
                    placeholder="Min"
                    className="w-14 h-8 text-sm bg-white/5 border-white/10"
                  />
                  <button
                    onClick={() => onCancelAddItem?.()}
                    className="h-8 px-2 text-white/40 hover:text-white/70 hover:bg-white/5 rounded"
                    title="Cancelar"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <Button size="sm" className="h-8 px-2" onClick={() => onSubmitItem?.(item.id)}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              )}

              {hasChildren && isExpanded && (
                <div className="mt-2">
                  {renderTaskItems(item.childItems, depth + 1, item.id)}
                </div>
              )}
            </div>
          );
        })}

        {parentItemId === null && (
          isAddTargetFor(parentItemId) && (
            <div className="flex flex-nowrap items-center gap-2 mt-2 min-w-0">
              <Input
                value={newItemTitle}
                onChange={(e) => setNewItemTitle?.(e.target.value)}
                placeholder="Novo item..."
                className="flex-1 min-w-0 h-8 text-sm bg-white/5 border-white/10"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onSubmitItem?.(null);
                  if (e.key === 'Escape') onCancelAddItem?.();
                }}
              />
              <Input
                type="number"
                min={1}
                value={newItemValue}
                onChange={(e) => setNewItemValue?.(Number(e.target.value))}
                placeholder="Pts"
                className="w-14 h-8 text-sm bg-white/5 border-white/10"
              />
              <Input
                type="number"
                min={0}
                value={newItemMinutes}
                onChange={(e) => setNewItemMinutes?.(e.target.value)}
                placeholder="Min"
                className="w-14 h-8 text-sm bg-white/5 border-white/10"
              />
              <button
                onClick={() => onCancelAddItem?.()}
                className="h-8 px-2 text-white/40 hover:text-white/70 hover:bg-white/5 rounded"
                title="Cancelar"
              >
                <X className="w-4 h-4" />
              </button>
              <Button size="sm" className="h-8 px-2" onClick={() => onSubmitItem?.(null)}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          )
        )}
      </div>
    );
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={(event) => {
        event.preventDefault();
        onDragOver?.();
      }}
      onDrop={(event) => {
        event.preventDefault();
        onDrop?.();
      }}
      onDragEnd={onDragEnd}
      className={`relative p-4 rounded-2xl border transition-all ${
        completed 
          ? 'bg-mystic-gold/5 border-mystic-gold/20' 
          : 'bg-white/5 border-white/10 hover:border-white/20'
      } ${isDragOver ? 'border-mystic-gold/60 bg-mystic-gold/10' : ''}`}
    >
      <div className="flex items-start gap-3">
        {/* Completion button */}
        {!completed && onComplete && (
          <button
            onClick={onComplete}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-mystic-gold/20 
                      flex items-center justify-center flex-shrink-0 transition-colors"
          >
            <Check className="w-4 h-4" />
          </button>
        )}
        {completed && (
          <button
            onClick={onUncomplete}
            className="w-8 h-8 rounded-lg bg-mystic-gold/20 hover:bg-mystic-gold/30 
                      flex items-center justify-center flex-shrink-0 transition-colors"
            title="Desmarcar"
          >
            <X className="w-4 h-4 text-mystic-gold" />
          </button>
        )}

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <p className={`font-medium ${completed ? 'line-through text-white/50' : 'text-white'}`}>
                {task.title}
              </p>
              {task.description && (
                <p className="text-xs text-white/40 mt-0.5 line-clamp-1">{task.description}</p>
              )}
            </div>
            
            {!completed && (
              <div className="flex items-center gap-1">
                <span
                  className="w-7 h-7 rounded-full border flex items-center justify-center text-base leading-none"
                  style={{
                    backgroundColor: `${element.color}1f`,
                    borderColor: `${element.color}66`,
                  }}
                  title={element.name}
                >
                  {element.icon}
                </span>

                <button
                  onClick={() => onStartAddItem?.(null)}
                  className="p-1 rounded-lg hover:bg-white/10 text-white/40 hover:text-white/70"
                  title="Adicionar item"
                >
                  <PlusCircle className="w-4 h-4" />
                </button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="p-1 rounded-lg hover:bg-white/10">
                      <MoreVertical className="w-4 h-4 text-white/40" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-mystic-purple border-white/10">
                    <DropdownMenuItem onClick={onMoveUp}>
                      <ArrowUp className="w-4 h-4 mr-2" />
                      Mover para cima
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={onMoveDown}>
                      <ArrowDown className="w-4 h-4 mr-2" />
                      Mover para baixo
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={onDuplicate}>
                      <ListTodo className="w-4 h-4 mr-2" />
                      Duplicar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={onConvertToCycle}>
                      <PlusCircle className="w-4 h-4 mr-2" />
                      Transformar em Ciclo
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={onOpenEdit}>
                      <Edit2 className="w-4 h-4 mr-2" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={onDelete} className="text-red-400">
                      <Trash2 className="w-4 h-4 mr-2" />
                      Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>

          {/* Badges + Start */}
          <div className="mt-2 flex items-start justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              {/* 🎯 Badge principal com nome da área e pontuação */}
              {primaryAreaBadgeLabel && (
                <Badge 
                  variant="outline"
                  className="text-[10px]"
                  style={{ 
                    backgroundColor: task.areaPrimaryId ? `${(area?.color || element.color)}15` : 'rgba(255,255,255,0.05)', 
                    borderColor: task.areaPrimaryId ? `${(area?.color || element.color)}40` : 'rgba(255,255,255,0.1)',
                    color: task.areaPrimaryId ? (area?.color || element.color) : '#ffffff'
                  }}
                >
                  {primaryAreaBadgeLabel}
                </Badge>
              )}

              {secondaryAreaBadgeLabel && (
                <Badge 
                  variant="outline"
                  className="text-[10px]"
                  style={{ 
                    backgroundColor: `${(secondaryArea?.color || element.color)}12`, 
                    borderColor: `${(secondaryArea?.color || element.color)}30`,
                    color: secondaryArea?.color || element.color 
                  }}
                >
                  {secondaryAreaBadgeLabel}
                </Badge>
              )}

              {tertiaryAreaBadgeLabel && (
                <Badge 
                  variant="outline"
                  className="text-[10px]"
                  style={{ 
                    backgroundColor: `${(tertiaryArea?.color || element.color)}12`, 
                    borderColor: `${(tertiaryArea?.color || element.color)}30`,
                    color: tertiaryArea?.color || element.color 
                  }}
                >
                  {tertiaryAreaBadgeLabel}
                </Badge>
              )}
              
              {/* 🎯 Badges de áreas agregadas dos filhos (formato unificado: +X AreaName) */}
              {totalItems > 0 && aggregatedAreaList.map(([areaId, data]) => {
                const aggArea = AREAS.find(a => a.id === areaId);
                const aggSubarea = data.subareaId ? getAreaById(data.subareaId) : undefined;
                if (!aggArea) return null;
                return (
                  <Badge 
                    key={areaId}
                    variant="outline"
                    className="text-[10px]"
                    style={{ 
                      backgroundColor: `${aggArea.color}10`, 
                      borderColor: `${aggArea.color}50`,
                      color: aggArea.color 
                    }}
                  >
                    +{Math.round(data.points)} {aggArea.name}
                    {aggSubarea ? ` | ${aggSubarea.name}` : ''}
                  </Badge>
                );
              })}
              
              {task.plannedTimeMinutes != null && task.plannedTimeMinutes > 0 && (
                <Badge variant="outline" className="bg-white/5 text-white/60 text-[10px]">
                  <Clock className="w-3 h-3 mr-1" />
                  {formatDuration(task.plannedTimeMinutes)}
                </Badge>
              )}
            </div>

            {!completed && onStart && (
              <Button
                size="sm"
                onClick={onStart}
                className="h-7 px-2 text-xs bg-mystic-arcane hover:bg-mystic-arcane/80 shrink-0"
              >
                <Play className="w-3 h-3 mr-1" />
                Iniciar
              </Button>
            )}
          </div>

          {totalItems === 0 && (
            <div className="mt-2">
              {isAddTargetFor(null) && (
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    value={newItemTitle}
                    onChange={(e) => setNewItemTitle?.(e.target.value)}
                    placeholder="Novo item..."
                    className="flex-1 h-8 text-sm bg-white/5 border-white/10"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') onSubmitItem?.(null);
                      if (e.key === 'Escape') onCancelAddItem?.();
                    }}
                  />
                  <Input
                    type="number"
                    min={1}
                    value={newItemValue}
                    onChange={(e) => setNewItemValue?.(Number(e.target.value))}
                    placeholder="Pts"
                    className="w-20 h-8 text-sm bg-white/5 border-white/10"
                  />
                  <Input
                    type="number"
                    min={0}
                    value={newItemMinutes}
                    onChange={(e) => setNewItemMinutes?.(e.target.value)}
                    placeholder="Min"
                    className="w-20 h-8 text-sm bg-white/5 border-white/10"
                  />
                  <Button size="sm" className="h-8 px-2" onClick={() => onSubmitItem?.(null)}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Child items summary */}
          {totalItems > 0 && (
            <div className="mt-2 flex items-center gap-2">
              <button
                onClick={onToggleExpand}
                className="flex items-center gap-1 text-xs text-white/50 hover:text-white/70"
              >
                {task.isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                {completedItems}/{totalItems} itens
              </button>
              <div className="flex-1 h-1 bg-black/30 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-mystic-arcane rounded-full"
                  style={{ width: `${totalItems > 0 ? (completedItems / totalItems) * 100 : 0}%` }}
                />
              </div>
            </div>
          )}

          {/* Expanded child items */}
          <AnimatePresence>
            {task.isExpanded && totalItems > 0 && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mt-3 space-y-2 overflow-hidden"
              >
                {renderTaskItems(task.childItems)}
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>
    </motion.div>
  );
};

interface EmptyStateProps {
  type: 'pending' | 'completed';
  onCreate?: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({ type, onCreate }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="glass-card p-8 text-center"
  >
    <div className="text-4xl mb-3">{type === 'pending' ? '📜' : '✨'}</div>
    <h3 className="font-mystic text-lg mb-2">
      {type === 'pending' ? 'Nenhum ritual pendente' : 'Nenhum ritual concluído'}
    </h3>
    <p className="text-white/50 text-sm mb-4">
      {type === 'pending' 
        ? 'Que tal invocar um novo ritual?' 
        : 'Complete seus rituais para vê-los aqui.'}
    </p>
    {type === 'pending' && onCreate && (
      <Button onClick={onCreate}>
        <Plus className="w-4 h-4 mr-2" />
        Invocar Ritual
      </Button>
    )}
  </motion.div>
);
