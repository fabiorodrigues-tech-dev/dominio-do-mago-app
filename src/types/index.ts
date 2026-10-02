// ============================================
// CONSELHO ELEMENTAL - TIPOS TYPESCRIPT
// ============================================

// ============================================
// ELEMENTOS
// ============================================
export type ElementId = 'terra' | 'fogo' | 'agua' | 'ar';

export interface Element {
  id: ElementId;
  name: string;
  nameEn: string;
  icon: string;
  color: string;
  glow: string;
  lightColor: string;
  domain: string;
  description: string;
}

// ============================================
// ÁREAS
// ============================================
export interface Area {
  id: string;
  name: string;
  description: string;
  elementId: ElementId;
  color: string;
  parentId: string | null;
  subareas: Area[];
  isUserSelected: boolean;
  isCustom: boolean;
}

// ============================================
// TIPOS DE LIFECYCLE
// ============================================
export type LifecycleType = 'ACTION' | 'HABIT' | 'QUEST' | 'PROJECT' | 'MISSION' | 'DRAFT';

// ============================================
// TIPOS SEMÂNTICOS DE ITENS
// ============================================
export type SemanticType = 'valuable' | 'structural' | 'text';

// ============================================
// STATUS
// ============================================
export type Status = 'active' | 'completed' | 'archived';

// ============================================
// ITEM BASE (para hierarquia)
// ============================================
export interface BaseItem {
  id: string;
  title: string;
  description?: string;
  isCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
  
  // Hierarquia
  parentId: string | null;
  children: string[]; // IDs dos filhos
  
  // Agregação
  isAggregator: boolean;
  aggregatedScore: number;
}

// ============================================
// TASK ITEM (filho de Task - pode ter filhos recursivos)
// ============================================
export interface TaskItem extends BaseItem {
  type: 'TASK_ITEM';
  taskId: string;
  semanticType: SemanticType;
  baseValue: number | null;
  plannedTimeMinutes: number | null;
  actualTimeMinutes: number | null;
  sortOrder: number;
  isExpanded?: boolean;
  areaPrimaryId: string | null;
  subareaPrimaryId: string | null;
  areaSecondaryId1: string | null;
  subareaSecondaryId1: string | null;
  areaSecondaryId2: string | null;
  subareaSecondaryId2: string | null;
  areaTertiaryId1?: string | null;
  subareaTertiaryId1?: string | null;
  areaTertiaryId2?: string | null;
  subareaTertiaryId2?: string | null;
  
  // Recursão: TaskItem pode ter childItems
  childItems: TaskItem[];
}

// ============================================
// TASK / RITUAL (AÇÃO)
// ============================================
export interface Task extends BaseItem {
  type: 'TASK';
  lifecycleType: 'ACTION';
  
  // Pontuação
  baseValue: number | null;
  effortLevel: number | null;
  plannedTimeMinutes: number | null;
  actualTimeMinutes: number | null;
  completedScore?: number | null;
  completedAt?: Date | null;
  
  // Áreas (herdadas do pai se for filho)
  areaPrimaryId: string | null;
  areaSecondaryId1: string | null;
  areaSecondaryId2: string | null;
  
  // Subareas - novas! 🎯
  subareaPrimaryId: string | null;
  subareaSecondaryId1: string | null;
  subareaSecondaryId2: string | null;
  
  // Elemento (herdado do pai se for filho)
  elementId: ElementId;
  
  // Execução
  isInProgress: boolean;
  elapsedSeconds: number;
  lastStartedAt: Date | null;
  
  // Agregação
  childItems: TaskItem[];
  
  // Visual
  isExpanded: boolean;
  
  // Ordenação manual - nova! 🎯
  displayOrder: number;
}

// ============================================
// HÁBITO / CICLO
// ============================================
export interface Habit extends BaseItem {
  type: 'HABIT';
  lifecycleType: 'HABIT';

  // Tipo semantico para subitens: valuable | structural | text (nota)
  semanticType?: SemanticType;
  semanticValueBackup?: {
    plannedPoints: number;
    plannedTimeMinutes: number;
  } | null;
  semanticStructuralBackup?: {
    plannedPoints: number;
    plannedTimeMinutes: number;
  } | null;
  
  // Habit usa 'name' em vez de 'title'
  name: string;
  
  // Áreas
  areaId: string;
  subareaId?: string | null;
  elementId: ElementId;
  
  // Pontuação
  plannedTimeMinutes: number;
  plannedPoints: number;
  
  // Recorrência
  recurrenceType: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  recurrenceConfig: {
    daysOfWeek?: number[]; // 0-6 (domingo-sábado)
    daysOfMonth?: number[]; // 1-31
  };
  startDate?: Date;
  
  // Estado
  streak: number;
  longestStreak: number;
  lastCompletedAt: Date | null;
  completions: HabitCompletion[];
  
  // Agregação - Hábitos podem ter filhos (sub-hábitos)
  childHabits: Habit[];
  
  // Execução
  isInProgress: boolean;
  elapsedSeconds: number;

  // Ordenação e UI
  sortOrder: number;
  isExpanded?: boolean;

  // Ownership de sequencia: evita exibir o mesmo ciclo como standalone e dentro de sequencia ao mesmo tempo
  controlledBySequenceId?: string | null;
}

// ============================================
// SEQUENCIA DE CICLOS
// ============================================
export interface CycleSequence {
  id: string;
  name: string;
  displayOrder: number;
  recurrenceType: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  recurrenceConfig: {
    daysOfWeek?: number[];
    daysOfMonth?: number[];
  };
  currentPosition: number;
  lastCompletedDate: Date | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type CommitmentRecurrence = 'ONCE' | 'DAILY' | 'WEEKLY' | 'MONTHLY';

export interface Commitment {
  id: string;
  title: string;
  date: Date;
  recurrence: CommitmentRecurrence;
  createdAt: Date;
  updatedAt: Date;
}

export interface SequenceMembership {
  id: string;
  sequenceId: string;
  habitId: string;
  position: number;
  addedAt: Date;
}

// ============================================
// COMPLETION DE HÁBITO
// ============================================
export interface HabitCompletion {
  id: string;
  habitId: string;
  completionDate: Date;
  timeSpentMinutes: number;
  scoreEarned: number;
  plannedScoreAtCompletion?: number;
  executedScore?: number;
  actualEffortLevel?: number;
  presenceBonusApplied?: number;
  timeMultiplierApplied?: number;
  formulaVersion?: string;
  startedAtCycleSeconds?: number;
  endedAtCycleSeconds?: number;
}

// ============================================
// MISSÃO (fase de projeto)
// ============================================
export interface Mission extends BaseItem {
  type: 'MISSION';
  lifecycleType: 'MISSION';
  projectId: string;
  
  // Elemento e Área (herdados do projeto)
  elementId: ElementId;
  areaId: string;
  
  // Status - missões usam isCompleted
  status: 'active' | 'completed';
  
  // Progresso
  progress: number;
  
  // Conteúdo
  tasks: Task[];
  habits: Habit[];
  
  // Data limite opcional
  dueDate: Date | null;
}

// ============================================
// QUEST / JORNADA
// ============================================
export interface Quest extends BaseItem {
  type: 'QUEST';
  lifecycleType: 'QUEST';
  
  // Elemento e Área
  elementId: ElementId;
  areaId: string;
  
  // Status
  status: 'active' | 'completed';
  
  // Progresso
  progress: number;
  
  // Conteúdo (ordenado)
  tasks: Task[];
  habits: Habit[];
  itemOrder: string[]; // IDs na ordem de exibição
  
  // Data limite opcional
  dueDate: Date | null;
  
  // Recompensa
  reward?: string;
  xpBonus: number;
}

// ============================================
// PROJETO / GRANDE OBRA
// ============================================
export interface Project extends BaseItem {
  type: 'PROJECT';
  lifecycleType: 'PROJECT';
  
  // Elemento e Área
  elementId: ElementId;
  areaId: string;
  
  // Status
  status: Status;
  
  // Progresso
  progress: number;
  
  // Conteúdo
  missions: Mission[];
  quests: Quest[];
  tasks: Task[];
  habits: Habit[];
  
  // Data limite opcional
  dueDate: Date | null;
  
  // Recompensa
  reward?: string;
  xpBonus: number;
}

// ============================================
// RAScUNHO / FORJA
// ============================================
export interface Draft {
  id: string;
  title: string;
  notes?: string;
  createdAt: Date;
  
  // Para triagem posterior
  suggestedType?: LifecycleType;
  suggestedElementId?: ElementId;
}

// ============================================
// LOG DE EXECUÇÃO
// ============================================
export interface ExecutionLog {
  id: string;
  entityId: string;
  entityType: LifecycleType;
  timestamp: Date;
  actualTimeMinutes: number;
  actualEffortLevel: number;
  completedItemIds: string[];
  executedValue: number;
  fullCompletion: boolean;
  bonusApplied: number;
}

// ============================================
// USUÁRIO
// ============================================
export interface User {
  id: string;
  name: string;
  avatar: string;
  level: number;
  experience: number;
  experienceToNextLevel: number;
  totalScore: number;
  streak: number;
  longestStreak: number;
  joinedAt: Date;
}

// ============================================
// PONTUAÇÃO POR ELEMENTO
// ============================================
export interface ElementScore {
  elementId: ElementId;
  score: number;
  percentage: number;
  taskCount: number;
  habitCount: number;
}

// ============================================
// PONTUAÇÃO POR ÁREA
// ============================================
export interface AreaScore {
  areaId: string;
  score: number;
  taskCount: number;
  habitCount: number;
}

// ============================================
// ESTADO DO TIMER
// ============================================
export interface TimerState {
  entityId: string | null;
  entityType: 'TASK' | 'HABIT' | null;
  isRunning: boolean;
  elapsedSeconds: number;
  startedAt: Date | null;
}

// ============================================
// NAVEGAÇÃO
// ============================================
export interface NavItem {
  icon: string;
  label: string;
  route: string;
  isAction?: boolean;
}

// ============================================
// FILTROS
// ============================================
export interface TaskFilters {
  elementId?: ElementId;
  areaId?: string;
  status?: 'pending' | 'completed' | 'all';
  search?: string;
}

// ============================================
// ONBOARDING
// ============================================
export interface OnboardingState {
  step: number;
  selectedAreas: string[];
  avatar: string;
  isComplete: boolean;
}

// ============================================
// CARD DO DIA (Ciclos)
// ============================================
export interface DayCard {
  date: Date;
  dayOfWeek: string;
  moonPhase: string;
  season: string;
  habits: Habit[];
  completedHabitIds: string[];
}

// ============================================
// TIPO UNION PARA ENTIDADES
// ============================================
export type Entity = Task | Habit | Mission | Quest | Project | Draft;

// ============================================
// TIPO PARA CRIAÇÃO RÁPIDA
// ============================================
export interface QuickCreateInput {
  title: string;
  type: 'ACTION' | 'HABIT' | 'DRAFT';
}
