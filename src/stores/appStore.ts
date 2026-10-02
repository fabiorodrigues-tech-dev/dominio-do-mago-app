// ============================================
// CONSELHO ELEMENTAL - STORE ZUSTAND
// ============================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Area,
  Task,
  Habit,
  CycleSequence,
  Commitment,
  SequenceMembership,
  Project,
  Quest,
  Draft,
  User,
  ElementScore,
  AreaScore,
  TimerState,
  ElementId,
  OnboardingState,
  HabitCompletion,
  TaskItem,
  Mission,
} from '@/types';
import { AREAS, AVATARS, DEFAULT_SCORES, EFFORT_MULTIPLIERS, ELEMENTS, calculateTaskScore, getAreaById } from '@/constants';
import { moveNodeUp, moveNodeDown, calculateNextSortOrder } from '@/lib/tree-helpers';

// ============================================
// ESTADO INICIAL
// ============================================

const initialUser: User = {
  id: 'user-1',
  name: 'Mago Iniciante',
  avatar: AVATARS[0],
  level: 1,
  experience: 0,
  experienceToNextLevel: 100,
  totalScore: 0,
  streak: 0,
  longestStreak: 0,
  joinedAt: new Date(),
};

const initialOnboarding: OnboardingState = {
  step: 0,
  selectedAreas: [],
  avatar: AVATARS[0],
  isComplete: false,
};

const initialTimer: TimerState = {
  entityId: null,
  entityType: null,
  isRunning: false,
  elapsedSeconds: 0,
  startedAt: null,
};

const getDefaultAreaIdForElement = (elementId: ElementId): string => {
  const areaForElement = AREAS.find((area) => area.elementId === elementId);
  return areaForElement?.id || AREAS[0].id;
};

const toValidDate = (value: Date | string | number | null | undefined): Date | null => {
  if (value == null) return null;

  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const toDayStamp = (date: Date | string | number | null | undefined): number | null => {
  const parsed = toValidDate(date);
  if (!parsed) return null;
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()).getTime();
};

const isSameDay = (
  left: Date | string | number | null | undefined,
  right: Date | string | number | null | undefined
): boolean => {
  const leftStamp = toDayStamp(left);
  const rightStamp = toDayStamp(right);
  if (leftStamp == null || rightStamp == null) return false;
  return leftStamp === rightStamp;
};

const isHabitCompletedOnDate = (
  habit: Habit,
  date: Date | string | number | null | undefined
): boolean => {
  const targetDay = toDayStamp(date);
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

const getHabitPlannedPoints = (habit: Habit): number => {
  const livePlannedPoints = sanitizeNonNegativeNumber(habit.plannedPoints);
  if (livePlannedPoints != null) return livePlannedPoints;

  const backupPlannedPoints = sanitizeNonNegativeNumber(habit.semanticValueBackup?.plannedPoints);
  if (backupPlannedPoints != null) return backupPlannedPoints;

  return 0;
};

const getHabitPlannedMinutes = (habit: Habit): number => {
  const livePlannedMinutes = sanitizeNonNegativeNumber(habit.plannedTimeMinutes);
  if (livePlannedMinutes != null) return livePlannedMinutes;

  const backupPlannedMinutes = sanitizeNonNegativeNumber(habit.semanticValueBackup?.plannedTimeMinutes);
  if (backupPlannedMinutes != null) return backupPlannedMinutes;

  return 0;
};

const syncHabitSemanticBackups = (habit: Habit): Habit => {
  const semanticType = habit.semanticType ?? 'valuable';
  if (semanticType !== 'valuable') return habit;

  const plannedPoints = getHabitPlannedPoints(habit);
  const plannedTimeMinutes = getHabitPlannedMinutes(habit);

  return {
    ...habit,
    plannedPoints,
    plannedTimeMinutes,
    semanticValueBackup: {
      plannedPoints,
      plannedTimeMinutes,
    },
  };
};

const getHabitBasePoints = (habit: Habit): number => {
  const semanticType = habit.semanticType ?? 'valuable';
  if (semanticType !== 'valuable') return 0;

  if (habit.childHabits.length > 0) {
    // Aggregators never contribute direct base points.
    return 0;
  }

  const points = getHabitPlannedPoints(habit);
  return points;
};

const calculateHabitPlannedScore = (habit: Habit): number => {
  const basePoints = getHabitBasePoints(habit);
  if (basePoints <= 0) return 0;

  const plannedMinutes = getHabitPlannedMinutes(habit);
  return Math.max(0, Math.round(calculateTaskScore(basePoints, 1, plannedMinutes, true)));
};

const calculateHabitExecutedScore = (habit: Habit, timeSpentMinutes: number): number => {
  const basePoints = getHabitBasePoints(habit);
  if (basePoints <= 0) return 0;

  const minutes = sanitizeNonNegativeNumber(timeSpentMinutes) ?? 0;
  return Math.max(0, Math.round(calculateTaskScore(basePoints, 1, minutes, true)));
};

const calculateCompletedDescendantsScoreForDate = (
  habits: Habit[],
  completionDate: Date | string | number
): number => {
  return habits.reduce((sum, habit) => {
    const ownScore = isHabitCompletedOnDate(habit, completionDate) ? getHabitBasePoints(habit) : 0;
    const descendantsScore = calculateCompletedDescendantsScoreForDate(habit.childHabits, completionDate);
    return sum + ownScore + descendantsScore;
  }, 0);
};

const calculateRootHabitScoreForDate = (
  habit: Habit,
  completionDate: Date | string | number
): number => {
  const ownBaseScore = isHabitCompletedOnDate(habit, completionDate) 
    ? getHabitBasePoints(habit) 
    : 0;
  const descendantsScore = calculateCompletedDescendantsScoreForDate(habit.childHabits, completionDate);
  const total = ownBaseScore + descendantsScore;
  return total;
};

const accumulateCompletedHabitContributionsForDate = (
  habit: Habit,
  completionDate: Date | string | number,
  onContribution: (completedHabit: Habit, points: number) => void
) => {
  const ownPoints = isHabitCompletedOnDate(habit, completionDate) ? getHabitBasePoints(habit) : 0;
  if (ownPoints > 0) {
    onContribution(habit, ownPoints);
  }

  habit.childHabits.forEach((child) => {
    accumulateCompletedHabitContributionsForDate(child, completionDate, onContribution);
  });
};

const collectHabitScoresAndCompletionDays = (habits: Habit[]) => {
  let totalHabitScore = 0;
  const completionDays = new Set<number>();

  const walk = (habit: Habit, isRoot: boolean) => {
    habit.completions.forEach((completion) => {
      if (isRoot) {
        const completionScore = sanitizeNonNegativeNumber(completion.executedScore)
          ?? sanitizeNonNegativeNumber(completion.scoreEarned);

        totalHabitScore += completionScore != null
          ? completionScore
          : calculateRootHabitScoreForDate(habit, completion.completionDate);
      }

      const completionDay = toDayStamp(completion.completionDate);
      if (completionDay != null) {
        completionDays.add(completionDay);
      }
    });

    if (habit.childHabits.length > 0) {
      habit.childHabits.forEach((child) => walk(child, false));
    }
  };

  habits.forEach((habit) => walk(habit, true));

  return { totalHabitScore, completionDays };
};

const calculateStreakFromCompletionDays = (completionDays: Set<number>) => {
  if (completionDays.size === 0) {
    return { streak: 0, longestStreak: 0 };
  }

  const orderedDays = Array.from(completionDays).sort((a, b) => a - b);
  const oneDayMs = 24 * 60 * 60 * 1000;

  let longestStreak = 1;
  let currentRun = 1;
  for (let index = 1; index < orderedDays.length; index += 1) {
    if (orderedDays[index] - orderedDays[index - 1] === oneDayMs) {
      currentRun += 1;
    } else {
      currentRun = 1;
    }
    longestStreak = Math.max(longestStreak, currentRun);
  }

  const today = new Date();
  const todayStamp = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  let streak = 0;

  if (completionDays.has(todayStamp)) {
    streak = 1;
    let cursor = todayStamp - oneDayMs;
    while (completionDays.has(cursor)) {
      streak += 1;
      cursor -= oneDayMs;
    }
  }

  return { streak, longestStreak };
};

const calculateLevelProgressFromExperience = (experience: number) => {
  let level = 1;
  let experienceToNextLevel = 100;
  let remainingExperience = Math.max(0, Math.round(experience));

  while (remainingExperience >= experienceToNextLevel) {
    remainingExperience -= experienceToNextLevel;
    level += 1;
    experienceToNextLevel = Math.floor(experienceToNextLevel * 1.5);
  }

  return {
    level,
    experience: remainingExperience,
    experienceToNextLevel,
  };
};

const calculateUserProgressFromState = (state: Pick<AppState, 'tasks' | 'habits' | 'projects' | 'quests'>) => {
  const taskScore = state.tasks.reduce((sum, task) => {
    if (!task.isCompleted) return sum;
    const baseValue = task.baseValue || 1;
    const effortMultiplier = EFFORT_MULTIPLIERS[task.effortLevel || 1];
    return sum + Math.round(baseValue * effortMultiplier);
  }, 0);

  const { totalHabitScore, completionDays } = collectHabitScoresAndCompletionDays(state.habits);

  state.tasks.forEach((task) => {
    if (!task.isCompleted) return;
    const completedDay = toDayStamp(task.updatedAt);
    if (completedDay != null) {
      completionDays.add(completedDay);
    }
  });

  const projectScore = state.projects.reduce((sum, project) => {
    return project.isCompleted ? sum + (project.xpBonus || 0) : sum;
  }, 0);

  const questScore = state.quests.reduce((sum, quest) => {
    return quest.isCompleted ? sum + (quest.xpBonus || 0) : sum;
  }, 0);

  const totalScore = taskScore + totalHabitScore + projectScore + questScore;
  const { streak, longestStreak } = calculateStreakFromCompletionDays(completionDays);
  const experienceTotal = Math.max(0, Math.round(totalScore / 2));
  const levelProgress = calculateLevelProgressFromExperience(experienceTotal);

  return {
    totalScore,
    streak,
    longestStreak,
    level: levelProgress.level,
    experience: levelProgress.experience,
    experienceToNextLevel: levelProgress.experienceToNextLevel,
  };
};

const habitMatchesDate = (habit: Habit, date: Date | string | number): boolean => {
  const targetDate = toValidDate(date);
  if (!targetDate) return false;

  const dayOfWeek = targetDate.getDay();
  const dayOfMonth = targetDate.getDate();
  const targetDay = toDayStamp(targetDate);
  const startDay = toDayStamp(habit.startDate ?? habit.createdAt);

  if (targetDay == null || startDay == null) return false;

  if (targetDay < startDay) return false;

  if (habit.recurrenceType === 'DAILY' || habit.recurrenceType === 'WEEKLY') {
    return habit.recurrenceConfig.daysOfWeek?.includes(dayOfWeek) ?? true;
  }
  if (habit.recurrenceType === 'MONTHLY') {
    return habit.recurrenceConfig.daysOfMonth?.includes(dayOfMonth) ?? true;
  }
  return true;
};

const habitHasStartedByDate = (habit: Habit, date: Date | string | number): boolean => {
  const targetDay = toDayStamp(date);
  const startDay = toDayStamp(habit.startDate ?? habit.createdAt);
  if (targetDay == null || startDay == null) return false;
  return targetDay >= startDay;
};

const sequenceMatchesDate = (sequence: CycleSequence, date: Date | string | number): boolean => {
  const targetDate = toValidDate(date);
  if (!targetDate) return false;

  const targetDay = toDayStamp(targetDate);
  const sequenceStartDay = toDayStamp(sequence.createdAt);
  if (targetDay == null || sequenceStartDay == null) return false;
  if (targetDay < sequenceStartDay) return false;

  const dayOfWeek = targetDate.getDay();
  const dayOfMonth = targetDate.getDate();

  if (sequence.recurrenceType === 'DAILY' || sequence.recurrenceType === 'WEEKLY') {
    return sequence.recurrenceConfig.daysOfWeek?.includes(dayOfWeek) ?? true;
  }
  if (sequence.recurrenceType === 'MONTHLY') {
    return sequence.recurrenceConfig.daysOfMonth?.includes(dayOfMonth) ?? true;
  }
  return true;
};

const getSequencePositionForDate = (
  sequence: CycleSequence,
  totalMembers: number,
  date: Date | string | number
): number => {
  if (totalMembers <= 0) return 0;

  const basePosition = ((sequence.currentPosition % totalMembers) + totalMembers) % totalMembers;
  const lastCompletedStamp = toDayStamp(sequence.lastCompletedDate);
  const targetStamp = toDayStamp(date);

  if (lastCompletedStamp == null || targetStamp == null) return basePosition;
  if (targetStamp > lastCompletedStamp) {
    return (basePosition + 1) % totalMembers;
  }

  return basePosition;
};

const findHabitByIdDeep = (habits: Habit[], habitId: string): Habit | null => {
  for (const habit of habits) {
    if (habit.id === habitId) return habit;
    if (habit.childHabits.length > 0) {
      const found = findHabitByIdDeep(habit.childHabits, habitId);
      if (found) return found;
    }
  }
  return null;
};

const updateHabitByIdDeep = (habits: Habit[], habitId: string, updater: (habit: Habit) => Habit): Habit[] => {
  return habits.map((habit) => {
    if (habit.id === habitId) {
      return updater(habit);
    }
    if (habit.childHabits.length > 0) {
      return {
        ...habit,
        childHabits: updateHabitByIdDeep(habit.childHabits, habitId, updater),
      };
    }
    return habit;
  });
};

const collectHabitIdsDeep = (habit: Habit): string[] => {
  return [habit.id, ...habit.childHabits.flatMap((child) => collectHabitIdsDeep(child))];
};

const normalizeSequenceState = (
  sequences: CycleSequence[],
  memberships: SequenceMembership[]
): { sequences: CycleSequence[]; memberships: SequenceMembership[] } => {
  const clonedMemberships = memberships.map((membership) => ({ ...membership }));

  sequences.forEach((sequence) => {
    const items = clonedMemberships
      .filter((membership) => membership.sequenceId === sequence.id)
      .sort((a, b) => a.position - b.position);

    items.forEach((membership, index) => {
      membership.position = index;
    });
  });

  const nextSequences = sequences.map((sequence) => {
    const count = clonedMemberships.filter((membership) => membership.sequenceId === sequence.id).length;
    if (count === 0) {
      return sequence.currentPosition === 0
        ? sequence
        : { ...sequence, currentPosition: 0, updatedAt: new Date() };
    }

    const maxPosition = count - 1;
    const clampedPosition = Math.min(sequence.currentPosition, maxPosition);
    return clampedPosition === sequence.currentPosition
      ? sequence
      : { ...sequence, currentPosition: clampedPosition, updatedAt: new Date() };
  });

  return {
    sequences: nextSequences,
    memberships: clonedMemberships,
  };
};

// ============================================
// INTERFACE DA STORE
// ============================================

interface AppState {
  // ========== CONTAS ==========
  accounts: AccountProfile[];
  currentAccountId: string | null;
  accountDataById: Record<string, AccountScopedData>;
  createAccount: (name: string, importCurrentData?: boolean) => AccountProfile;
  switchAccount: (accountId: string) => void;

  // ========== USUÁRIO ==========
  user: User;
  updateUser: (updates: Partial<User>) => void;
  addExperience: (amount: number) => void;
  addScore: (amount: number) => void;
  recomputeUserProgress: () => void;
  
  // ========== ONBOARDING ==========
  onboarding: OnboardingState;
  setOnboardingStep: (step: number) => void;
  selectArea: (areaId: string) => void;
  deselectArea: (areaId: string) => void;
  setAvatar: (avatar: string) => void;
  completeOnboarding: () => void;

  // ========== AREAS CUSTOMIZADAS ==========
  customAreas: Area[];
  addCustomArea: (name: string, elementId: ElementId) => Area;
  customSubareas: Record<string, Area[]>;
  linkedSubareasByAreaId: Record<string, string[]>;
  addCustomSubarea: (parentAreaId: string, name: string, elementId: ElementId, color: string) => Area;
  linkSubarea: (parentAreaId: string, subareaId: string) => void;
  unlinkSubarea: (parentAreaId: string, subareaId: string) => void;
  removeCustomSubarea: (parentAreaId: string, subareaId: string) => void;
  
  // ========== TAREFAS (RITUAIS) ==========
  tasks: Task[];
  addTask: (task: Partial<Task>) => Task;
  updateTask: (taskId: string, updates: Partial<Task>) => void;
  deleteTask: (taskId: string) => void;
  completeTask: (taskId: string, actualTimeMinutes?: number) => number;
  uncompleteTask: (taskId: string) => void;
  toggleTaskExpansion: (taskId: string) => void;
  moveTaskUp: (taskId: string) => void;
  moveTaskDown: (taskId: string) => void;
  reorderTasks: (orderedTaskIds: string[]) => void;
  duplicateTask: (taskId: string) => Task;
  createHabitFromTask: (taskId: string, effectiveStartDate?: Date) => Habit;
  
  // ========== ITENS DE TAREFA (FILHOS) ==========
  addTaskItem: (taskId: string, item: Partial<TaskItem>, parentItemId?: string | null) => void;
  updateTaskItem: (taskId: string, itemId: string, updates: Partial<TaskItem>) => void;
  deleteTaskItem: (taskId: string, itemId: string) => void;
  completeTaskItem: (taskId: string, itemId: string) => void;
  uncompleteTaskItem: (taskId: string, itemId: string) => void;
  toggleTaskItemExpansion: (taskId: string, itemId: string) => void;
  moveTaskItemUp: (taskId: string, itemId: string) => void;
  moveTaskItemDown: (taskId: string, itemId: string) => void;
  calculateTaskAggregation: (taskId: string) => void;
  
  // ========== HÁBITOS (CICLOS) ==========
  habits: Habit[];
  addHabit: (habit: Partial<Habit>) => Habit;
  updateHabit: (habitId: string, updates: Partial<Habit>) => void;
  deleteHabit: (habitId: string) => void;
  completeHabit: (
    habitId: string,
    timeSpentMinutes: number,
    completionDate?: Date,
    metadata?: { startedAtCycleSeconds?: number; endedAtCycleSeconds?: number }
  ) => number;
  uncompleteHabit: (habitId: string, completionDate: Date) => void;
  duplicateHabit: (habitId: string) => Habit;
  moveHabitUp: (habitId: string) => void;
  moveHabitDown: (habitId: string) => void;
  reorderHabits: (orderedHabitIds: string[]) => void;
  addHabitChild: (parentHabitId: string, habit: Partial<Habit>) => void;
  updateHabitChild: (habitId: string, updates: Partial<Habit>) => void;
  deleteHabitChild: (habitId: string) => void;
  completeHabitChild: (
    habitId: string,
    timeSpentMinutes: number,
    completionDate?: Date,
    metadata?: { startedAtCycleSeconds?: number; endedAtCycleSeconds?: number }
  ) => number;
  uncompleteHabitChild: (habitId: string, completionDate: Date) => void;
  toggleHabitChildExpansion: (habitId: string) => void;
  moveHabitChildUp: (habitId: string) => void;
  moveHabitChildDown: (habitId: string) => void;
  reorderHabitChildren: (parentHabitId: string, orderedChildHabitIds: string[]) => void;
  promoteHabitChildLevel: (habitId: string) => void;
  calculateHabitAggregation: (habitId: string) => void;
  getHabitsForDate: (date: Date) => Habit[];

  // ========== SEQUENCIAS DE CICLOS ==========
  cycleSequences: CycleSequence[];
  sequenceMemberships: SequenceMembership[];
  commitments: Commitment[];
  addCommitment: (input: { title: string; date: Date; recurrence?: Commitment['recurrence'] }) => Commitment;
  updateCommitment: (commitmentId: string, updates: Partial<Omit<Commitment, 'id' | 'createdAt'>>) => void;
  deleteCommitment: (commitmentId: string) => void;
  createCycleSequence: (input: {
    name: string;
    startDate?: Date;
    recurrenceType?: CycleSequence['recurrenceType'];
    recurrenceConfig?: CycleSequence['recurrenceConfig'];
  }) => CycleSequence;
  updateCycleSequence: (sequenceId: string, updates: Partial<Omit<CycleSequence, 'id' | 'createdAt'>>) => void;
  deleteCycleSequence: (sequenceId: string) => void;
  reorderCycleSequences: (orderedSequenceIds: string[]) => void;
  toggleCycleSequenceActive: (sequenceId: string) => void;
  moveHabitInSequence: (sequenceId: string, habitId: string, direction: 'up' | 'down') => void;
  reorderHabitsInSequence: (sequenceId: string, orderedHabitIds: string[]) => void;
  resetCycleSequenceToStart: (sequenceId: string) => void;
  addHabitToSequence: (sequenceId: string, habitId: string) => void;
  removeHabitFromSequence: (sequenceId: string, habitId: string) => void;
  
  // ========== PROJETOS (GRANDES OBRAS) ==========
  projects: Project[];
  addProject: (project: Partial<Project>) => Project;
  updateProject: (projectId: string, updates: Partial<Project>) => void;
  deleteProject: (projectId: string) => void;
  addMissionToProject: (projectId: string, mission: Partial<Mission>) => void;
  updateProjectProgress: (projectId: string) => void;
  
  // ========== MISSÕES ==========
  addTaskToMission: (projectId: string, missionId: string, task: Partial<Task>) => void;
  addHabitToMission: (projectId: string, missionId: string, habit: Partial<Habit>) => void;
  
  // ========== QUESTS (JORNADAS) ==========
  quests: Quest[];
  addQuest: (quest: Partial<Quest>) => Quest;
  updateQuest: (questId: string, updates: Partial<Quest>) => void;
  deleteQuest: (questId: string) => void;
  addTaskToQuest: (questId: string, task: Partial<Task>) => void;
  addHabitToQuest: (questId: string, habit: Partial<Habit>) => void;
  updateQuestProgress: (questId: string) => void;
  
  // ========== RAScUNHOS (FORJA) ==========
  drafts: Draft[];
  addDraft: (title: string, notes?: string) => Draft;
  updateDraft: (draftId: string, updates: Partial<Draft>) => void;
  deleteDraft: (draftId: string) => void;
  convertDraft: (draftId: string, type: 'ACTION' | 'HABIT' | 'QUEST' | 'PROJECT') => string | null;
  
  // ========== TIMER ==========
  timer: TimerState;
  startTimer: (entityId: string, entityType: 'TASK' | 'HABIT') => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  stopTimer: () => number; // retorna segundos decorridos
  tickTimer: () => void;
  
  // ========== PONTUAÇÕES ==========
  getElementScores: () => ElementScore[];
  getAreaScores: () => AreaScore[];
  getTotalScore: () => number;
  
  // ========== ESTATÍSTICAS ==========
  getCompletedTasksToday: () => number;
  getCompletedTasksThisWeek: () => number;
  getCompletedHabitsToday: () => number;
  getStreak: () => number;
  updateStreak: () => void;
  
  // ========== CRIAÇÃO RÁPIDA ==========
  quickCreate: (title: string, type: 'ACTION' | 'HABIT' | 'DRAFT') => string;
}

interface AccountProfile {
  id: string;
  name: string;
  avatar: string;
  createdAt: Date;
  lastLoginAt: Date;
}

interface AccountScopedData {
  user: User;
  onboarding: OnboardingState;
  customAreas: Area[];
  customSubareas: Record<string, Area[]>;
  linkedSubareasByAreaId: Record<string, string[]>;
  tasks: Task[];
  habits: Habit[];
  cycleSequences: CycleSequence[];
  sequenceMemberships: SequenceMembership[];
  commitments: Commitment[];
  projects: Project[];
  quests: Quest[];
  drafts: Draft[];
}

const createEmptyAccountData = (profile: AccountProfile): AccountScopedData => ({
  user: {
    ...initialUser,
    id: `user-${profile.id}`,
    name: profile.name,
    avatar: profile.avatar,
    joinedAt: profile.createdAt,
  },
  onboarding: {
    ...initialOnboarding,
    avatar: profile.avatar,
  },
  customAreas: [],
  customSubareas: {},
  linkedSubareasByAreaId: {},
  tasks: [],
  habits: [],
  cycleSequences: [],
  sequenceMemberships: [],
  commitments: [],
  projects: [],
  quests: [],
  drafts: [],
});

const captureAccountData = (state: AppState, profile: AccountProfile): AccountScopedData => ({
  user: {
    ...state.user,
    id: `user-${profile.id}`,
    name: profile.name,
    avatar: profile.avatar,
  },
  onboarding: {
    ...state.onboarding,
    avatar: profile.avatar,
  },
  customAreas: state.customAreas,
  customSubareas: state.customSubareas,
  linkedSubareasByAreaId: state.linkedSubareasByAreaId,
  tasks: state.tasks,
  habits: state.habits,
  cycleSequences: state.cycleSequences,
  sequenceMemberships: state.sequenceMemberships,
  commitments: state.commitments,
  projects: state.projects,
  quests: state.quests,
  drafts: state.drafts,
});

// ============================================
// STORE
// ============================================

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // ========== CONTAS ==========
      accounts: [],
      currentAccountId: null,
      accountDataById: {},

      createAccount: (name, importCurrentData = true) => {
        const trimmedName = name.trim();
        if (!trimmedName) {
          throw new Error('Nome da conta e obrigatorio');
        }

        const profile: AccountProfile = {
          id: `account-${Date.now()}`,
          name: trimmedName,
          avatar: AVATARS[Math.floor(Math.random() * AVATARS.length)] || AVATARS[0],
          createdAt: new Date(),
          lastLoginAt: new Date(),
        };

        set((state) => {
          const accountData = importCurrentData
            ? captureAccountData(state, profile)
            : createEmptyAccountData(profile);

          return {
            accounts: [...state.accounts, profile],
            currentAccountId: profile.id,
            accountDataById: {
              ...state.accountDataById,
              [profile.id]: accountData,
            },
            ...accountData,
            timer: initialTimer,
          };
        });

        return profile;
      },

      switchAccount: (accountId) => {
        set((state) => {
          const targetProfile = state.accounts.find((account) => account.id === accountId);
          if (!targetProfile) {
            return state;
          }

          const accountDataById = { ...state.accountDataById };
          if (state.currentAccountId) {
            const currentProfile = state.accounts.find((account) => account.id === state.currentAccountId);
            if (currentProfile) {
              accountDataById[state.currentAccountId] = captureAccountData(state, currentProfile);
            }
          }

          const nextAccountData = accountDataById[accountId] || createEmptyAccountData(targetProfile);

          return {
            accounts: state.accounts.map((account) =>
              account.id === accountId
                ? { ...account, lastLoginAt: new Date() }
                : account
            ),
            currentAccountId: accountId,
            accountDataById: {
              ...accountDataById,
              [accountId]: nextAccountData,
            },
            ...nextAccountData,
            timer: initialTimer,
          };
        });
      },

      // ========== USUÁRIO ==========
      user: initialUser,
      
      updateUser: (updates) => {
        set((state) => ({
          user: { ...state.user, ...updates },
        }));
      },
      
      addExperience: (amount) => {
        set((state) => {
          const newExperience = state.user.experience + amount;
          let newLevel = state.user.level;
          let newExperienceToNext = state.user.experienceToNextLevel;
          let remainingExp = newExperience;
          
          // Level up logic
          while (remainingExp >= newExperienceToNext) {
            remainingExp -= newExperienceToNext;
            newLevel++;
            newExperienceToNext = Math.floor(newExperienceToNext * 1.5);
          }
          
          return {
            user: {
              ...state.user,
              level: newLevel,
              experience: remainingExp,
              experienceToNextLevel: newExperienceToNext,
            },
          };
        });
      },
      
      addScore: (amount) => {
        set((state) => ({
          user: {
            ...state.user,
            totalScore: state.user.totalScore + amount,
          },
        }));
      },

      recomputeUserProgress: () => {
        set((state) => {
          const metrics = calculateUserProgressFromState(state);
          return {
            user: {
              ...state.user,
              level: metrics.level,
              experience: metrics.experience,
              experienceToNextLevel: metrics.experienceToNextLevel,
              totalScore: metrics.totalScore,
              streak: metrics.streak,
              longestStreak: metrics.longestStreak,
            },
          };
        });
      },
      
      // ========== ONBOARDING ==========
      onboarding: initialOnboarding,
      
      setOnboardingStep: (step) => {
        set((state) => ({
          onboarding: { ...state.onboarding, step },
        }));
      },
      
      selectArea: (areaId) => {
        set((state) => ({
          onboarding: {
            ...state.onboarding,
            selectedAreas: state.onboarding.selectedAreas.includes(areaId)
              ? state.onboarding.selectedAreas
              : [...state.onboarding.selectedAreas, areaId],
          },
        }));
      },
      
      deselectArea: (areaId) => {
        set((state) => ({
          onboarding: {
            ...state.onboarding,
            selectedAreas: state.onboarding.selectedAreas.filter((id) => id !== areaId),
          },
        }));
      },
      
      setAvatar: (avatar) => {
        set((state) => ({
          onboarding: { ...state.onboarding, avatar },
        }));
      },
      
      completeOnboarding: () => {
        set((state) => ({
          onboarding: { ...state.onboarding, isComplete: true },
          user: {
            ...state.user,
            avatar: state.onboarding.avatar,
          },
        }));
      },

      // ========== AREAS CUSTOMIZADAS ==========
      customAreas: [],
      customSubareas: {},
      linkedSubareasByAreaId: {},

      addCustomArea: (name, elementId) => {
        const trimmedName = name.trim();
        if (!trimmedName) {
          throw new Error('Nome da area e obrigatorio');
        }

        const customArea: Area = {
          id: `custom-area-${Date.now()}`,
          name: trimmedName,
          description: 'Area personalizada criada pelo usuario',
          elementId,
          color: ELEMENTS[elementId].color,
          parentId: null,
          subareas: [],
          isUserSelected: true,
          isCustom: true,
        };

        set((state) => ({
          customAreas: [customArea, ...state.customAreas],
          onboarding: {
            ...state.onboarding,
            selectedAreas: state.onboarding.selectedAreas.includes(customArea.id)
              ? state.onboarding.selectedAreas
              : [...state.onboarding.selectedAreas, customArea.id],
          },
        }));

        return customArea;
      },

      addCustomSubarea: (parentAreaId, name, elementId, color) => {
        const trimmedName = name.trim();
        if (!trimmedName) {
          throw new Error('Nome da subarea e obrigatorio');
        }

        const customSubarea: Area = {
          id: `custom-subarea-${parentAreaId}-${Date.now()}`,
          name: trimmedName,
          description: 'Subarea personalizada criada pelo usuario',
          elementId,
          color,
          parentId: parentAreaId,
          subareas: [],
          isUserSelected: true,
          isCustom: true,
        };

        set((state) => ({
          customSubareas: {
            ...state.customSubareas,
            [parentAreaId]: [customSubarea, ...(state.customSubareas[parentAreaId] || [])],
          },
          linkedSubareasByAreaId: {
            ...state.linkedSubareasByAreaId,
            [parentAreaId]: [
              customSubarea.id,
              ...(state.linkedSubareasByAreaId[parentAreaId] || []),
            ],
          },
        }));

        return customSubarea;
      },

      linkSubarea: (parentAreaId, subareaId) => {
        const trimmedId = subareaId.trim();
        if (!trimmedId) return;

        set((state) => {
          const current = state.linkedSubareasByAreaId[parentAreaId] || [];
          if (current.includes(trimmedId)) return state;

          return {
            linkedSubareasByAreaId: {
              ...state.linkedSubareasByAreaId,
              [parentAreaId]: [...current, trimmedId],
            },
          };
        });
      },

      unlinkSubarea: (parentAreaId, subareaId) => {
        set((state) => ({
          linkedSubareasByAreaId: {
            ...state.linkedSubareasByAreaId,
            [parentAreaId]: (state.linkedSubareasByAreaId[parentAreaId] || []).filter((id) => id !== subareaId),
          },
        }));
      },

      removeCustomSubarea: (parentAreaId, subareaId) => {
        set((state) => ({
          customSubareas: {
            ...state.customSubareas,
            [parentAreaId]: (state.customSubareas[parentAreaId] || []).filter((subarea) => subarea.id !== subareaId),
          },
          linkedSubareasByAreaId: {
            ...state.linkedSubareasByAreaId,
            [parentAreaId]: (state.linkedSubareasByAreaId[parentAreaId] || []).filter((id) => id !== subareaId),
          },
        }));
      },
      
      // ========== TAREFAS ==========
      tasks: [],
      
      addTask: (taskData) => {
        const state = get();
        // Calcular o próximo displayOrder (maior existente + 1)
        const maxOrder = state.tasks.reduce((max, task) => Math.max(max, task.displayOrder || 0), 0);
        
        const newTask: Task = {
          id: `task-${Date.now()}`,
          title: taskData.title || 'Novo Ritual',
          description: taskData.description || '',
          lifecycleType: 'ACTION',
          type: 'TASK',
          baseValue: taskData.baseValue ?? DEFAULT_SCORES.RITUAL.baseValue,
          effortLevel: taskData.effortLevel ?? DEFAULT_SCORES.RITUAL.effortLevel,
           plannedTimeMinutes: 'plannedTimeMinutes' in taskData ? (taskData.plannedTimeMinutes ?? null) : (DEFAULT_SCORES.RITUAL.plannedTimeMinutes ?? null),
          actualTimeMinutes: null,
          completedScore: null,
          completedAt: null,
          areaPrimaryId: taskData.areaPrimaryId || null,
          areaSecondaryId1: taskData.areaSecondaryId1 || null,
          areaSecondaryId2: taskData.areaSecondaryId2 || null,
          subareaPrimaryId: taskData.subareaPrimaryId || null,
          subareaSecondaryId1: taskData.subareaSecondaryId1 || null,
          subareaSecondaryId2: taskData.subareaSecondaryId2 || null,
          elementId: taskData.elementId || 'terra',
          isCompleted: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          parentId: taskData.parentId || null,
          children: [],
          isAggregator: false,
          aggregatedScore: 0,
          isInProgress: false,
          elapsedSeconds: 0,
          lastStartedAt: null,
          childItems: [],
          isExpanded: false,
          displayOrder: taskData.displayOrder ?? (maxOrder + 1),
        };
        set((state) => ({
          tasks: [newTask, ...state.tasks],
        }));
        return newTask;
      },
      
      updateTask: (taskId, updates) => {
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === taskId
              ? { ...task, ...updates, updatedAt: new Date() }
              : task
          ),
        }));
      },
      
      deleteTask: (taskId) => {
        set((state) => ({
          tasks: state.tasks.filter((task) => task.id !== taskId),
        }));
      },
      
      completeTask: (taskId, actualTimeMinutes) => {
        const state = get();
        const task = state.tasks.find((t) => t.id === taskId);
        if (!task || task.isCompleted) return 0;
        
        // Helper: Contar descendentes completos recursivamente
        const countCompletedDescendants = (items: TaskItem[]): { completed: number; total: number } => {
          let completed = 0;
          let total = 0;
          
          for (const item of items) {
            if (item.childItems && item.childItems.length > 0) {
              const childCounts = countCompletedDescendants(item.childItems);
              completed += childCounts.completed;
              total += childCounts.total;
            } else {
              total++;
              if (item.isCompleted) completed++;
            }
          }
          
          return { completed, total };
        };
        
        // Helper: Marcar todos recursivamente (Case A)
        const markAllCompleteRecursively = (items: TaskItem[]): TaskItem[] => {
          return items.map(item => {
            if (item.childItems && item.childItems.length > 0) {
              return {
                ...item,
                isCompleted: true,
                childItems: markAllCompleteRecursively(item.childItems)
              };
            } else {
              return { ...item, isCompleted: true };
            }
          });
        };
        
        // Helper: Calcular score apenas das folhas completas (Case B)
        const calculateCompletedChildrenScore = (items: TaskItem[]): number => {
          let totalScore = 0;
          
          for (const item of items) {
            if (item.childItems && item.childItems.length > 0) {
              totalScore += calculateCompletedChildrenScore(item.childItems);
            } else if (item.isCompleted) {
              const itemScore = (item.baseValue || 1) * EFFORT_MULTIPLIERS[2]; // Esforço leve padrão
              totalScore += itemScore;
            }
          }
          
          return totalScore;
        };
        
        // Helper: Obter todas as folhas da árvore
        const getAllLeafItems = (items: TaskItem[]): TaskItem[] => {
          const leaves: TaskItem[] = [];
          for (const item of items) {
            if (item.childItems && item.childItems.length > 0) {
              leaves.push(...getAllLeafItems(item.childItems));
            } else {
              leaves.push(item);
            }
          }
          return leaves;
        };
        
        // Verificar se é agregador (tem filhos)
        const hasChildren = task.childItems && task.childItems.length > 0;
        
        if (!hasChildren) {
          // FOLHA: comportamento normal
          const timeMinutes = actualTimeMinutes ?? (task.elapsedSeconds / 60);
          const hasCategory = !!task.areaPrimaryId;
          
          const score = calculateTaskScore(
            task.baseValue || 1,
            task.effortLevel || 1,
            timeMinutes,
            hasCategory
          );
          
          const roundedScore = Math.round(score);

          set((s) => ({
            tasks: s.tasks.map((t) =>
              t.id === taskId 
                ? { 
                    ...t, 
                    isCompleted: true, 
                    actualTimeMinutes: timeMinutes,
                    completedScore: roundedScore,
                    completedAt: new Date(),
                    updatedAt: new Date(),
                    isInProgress: false,
                    elapsedSeconds: 0,
                  } 
                : t
            ),
            user: {
              ...s.user,
              totalScore: s.user.totalScore + roundedScore,
            },
          }));
          
          get().addExperience(Math.round(roundedScore / 2));
          return roundedScore;
        }
        
        // AGREGADOR: Case A ou Case B
        const counts = countCompletedDescendants(task.childItems);
        
        if (counts.completed === 0) {
          // **CASE A**: Nenhum filho completo → auto-completar todos
          const updatedChildItems = markAllCompleteRecursively(task.childItems);
          
          // Calcular score de todos os filhos agora completos
          const allLeaves = getAllLeafItems(updatedChildItems);
          const totalScore = allLeaves.reduce((sum, leaf) => {
            const itemScore = (leaf.baseValue || 1) * EFFORT_MULTIPLIERS[2];
            return sum + itemScore;
          }, 0);
          
          const roundedScore = Math.round(totalScore);

          set((s) => ({
            tasks: s.tasks.map((t) =>
              t.id === taskId 
                ? { 
                    ...t, 
                    isCompleted: true,
                    completedScore: roundedScore,
                    completedAt: new Date(),
                    childItems: updatedChildItems,
                    updatedAt: new Date(),
                  } 
                : t
            ),
            user: {
              ...s.user,
              totalScore: s.user.totalScore + roundedScore,
            },
          }));
          
          get().addExperience(Math.round(roundedScore / 2));
          return roundedScore;
        } else {
          // **CASE B**: Alguns filhos completos → completar apenas o pai, somar apenas os completos
          const partialScore = calculateCompletedChildrenScore(task.childItems);
          
          const roundedScore = Math.round(partialScore);

          set((s) => ({
            tasks: s.tasks.map((t) =>
              t.id === taskId 
                ? { 
                    ...t, 
                    isCompleted: true,
                    completedScore: roundedScore,
                    completedAt: new Date(),
                    updatedAt: new Date(),
                  } 
                : t
            ),
            user: {
              ...s.user,
              totalScore: s.user.totalScore + roundedScore,
            },
          }));
          
          get().addExperience(Math.round(roundedScore / 2));
          return roundedScore;
        }
      },

      uncompleteTask: (taskId) => {
        const state = get();
        const task = state.tasks.find((t) => t.id === taskId);
        if (!task || !task.isCompleted) return;

        // Helper: Contar descendentes completos
        const countCompletedDescendants = (items: TaskItem[]): { completed: number; total: number } => {
          let completed = 0;
          let total = 0;
          
          for (const item of items) {
            if (item.childItems && item.childItems.length > 0) {
              const childCounts = countCompletedDescendants(item.childItems);
              completed += childCounts.completed;
              total += childCounts.total;
            } else {
              total++;
              if (item.isCompleted) completed++;
            }
          }
          
          return { completed, total };
        };

        // Helper: Desmarcar todos recursivamente (usado em Case A)
        const unmarkAllRecursively = (items: TaskItem[]): TaskItem[] => {
          return items.map((item) => ({
            ...item,
            isCompleted: false,
            updatedAt: new Date(),
            childItems: item.childItems && item.childItems.length > 0 
              ? unmarkAllRecursively(item.childItems)
              : item.childItems
          }));
        };

        // Verificar se é agregador
        const hasChildren = task.childItems && task.childItems.length > 0;
        let updatedChildItems = task.childItems;

        const calculateCompletedChildrenScore = (items: TaskItem[]): number => {
          let totalScore = 0;
          for (const item of items) {
            if (item.childItems && item.childItems.length > 0) {
              totalScore += calculateCompletedChildrenScore(item.childItems);
            } else if (item.isCompleted) {
              totalScore += (item.baseValue || 1) * EFFORT_MULTIPLIERS[2];
            }
          }
          return totalScore;
        };

        const calculateAllLeavesScore = (items: TaskItem[]): number => {
          let totalScore = 0;
          for (const item of items) {
            if (item.childItems && item.childItems.length > 0) {
              totalScore += calculateAllLeavesScore(item.childItems);
            } else {
              totalScore += (item.baseValue || 1) * EFFORT_MULTIPLIERS[2];
            }
          }
          return totalScore;
        };

        const fallbackScore = () => {
          if (!hasChildren) {
            const score = calculateTaskScore(
              task.baseValue || 1,
              task.effortLevel || 1,
              task.actualTimeMinutes ?? 0,
              !!task.areaPrimaryId
            );
            return Math.round(score);
          }

          const counts = countCompletedDescendants(task.childItems);
          if (counts.completed === counts.total) {
            return Math.round(calculateAllLeavesScore(task.childItems));
          }
          return Math.round(calculateCompletedChildrenScore(task.childItems));
        };

        const removedScore = Math.max(0, task.completedScore ?? fallbackScore());

        if (hasChildren) {
          // Detectar se foi Case A ou B
          const counts = countCompletedDescendants(task.childItems);
          
          if (counts.completed === counts.total) {
            // **Case A**: Todos os filhos estão completos → unmar todos
            updatedChildItems = unmarkAllRecursively(task.childItems);
          }
          // **Case B**: Nem todos completos → desmarcar apenas o pai (updatedChildItems permanece inalterado)
        }

        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  isCompleted: false,
                  actualTimeMinutes: null,
                  completedScore: null,
                  completedAt: null,
                  updatedAt: new Date(),
                  childItems: updatedChildItems,
                }
              : t
          ),
          user: {
            ...state.user,
            totalScore: Math.max(0, state.user.totalScore - removedScore),
          },
        }));
      },
      
      toggleTaskExpansion: (taskId) => {
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === taskId ? { ...task, isExpanded: !task.isExpanded } : task
          ),
        }));
      },
      
      moveTaskUp: (taskId) => {
        const state = get();
        const tasks = [...state.tasks].sort((a, b) => a.displayOrder - b.displayOrder);
        const currentIndex = tasks.findIndex(t => t.id === taskId);
        
        if (currentIndex > 0) {
          const current = tasks[currentIndex];
          const previous = tasks[currentIndex - 1];
          
          // Trocar displayOrder
          const tempOrder = current.displayOrder;
          current.displayOrder = previous.displayOrder;
          previous.displayOrder = tempOrder;
          
          set((state) => ({
            tasks: state.tasks.map(task => {
              if (task.id === current.id) return current;
              if (task.id === previous.id) return previous;
              return task;
            }),
          }));
        }
      },
      
      moveTaskDown: (taskId) => {
        const state = get();
        const tasks = [...state.tasks].sort((a, b) => a.displayOrder - b.displayOrder);
        const currentIndex = tasks.findIndex(t => t.id === taskId);
        
        if (currentIndex < tasks.length - 1 && currentIndex >= 0) {
          const current = tasks[currentIndex];
          const next = tasks[currentIndex + 1];
          
          // Trocar displayOrder
          const tempOrder = current.displayOrder;
          current.displayOrder = next.displayOrder;
          next.displayOrder = tempOrder;
          
          set((state) => ({
            tasks: state.tasks.map(task => {
              if (task.id === current.id) return current;
              if (task.id === next.id) return next;
              return task;
            }),
          }));
        }
      },

      reorderTasks: (orderedTaskIds) => {
        set((state) => {
          const orderMap = new Map<string, number>();
          orderedTaskIds.forEach((id, index) => {
            orderMap.set(id, index + 1);
          });

          return {
            tasks: state.tasks.map((task) => {
              const nextOrder = orderMap.get(task.id);
              return nextOrder != null
                ? { ...task, displayOrder: nextOrder }
                : task;
            }),
          };
        });
      },

      duplicateTask: (taskId) => {
        const state = get();
        const taskToDuplicate = state.tasks.find((t) => t.id === taskId);
        if (!taskToDuplicate) throw new Error('Task not found');

        // Clone recursively including all childItems
        const cloneItems = (items: TaskItem[]): TaskItem[] => {
          return items.map(item => ({
            ...item,
            id: `item-${Date.now()}-${Math.random()}`,
            updatedAt: new Date(),
            childItems: item.childItems.length > 0 ? cloneItems(item.childItems) : [],
          }));
        };

        const duplicatedTask: Task = {
          ...taskToDuplicate,
          id: `task-${Date.now()}`,
          title: `${taskToDuplicate.title} (cópia)`,
          createdAt: new Date(),
          updatedAt: new Date(),
          isCompleted: false,
          actualTimeMinutes: null,
          isInProgress: false,
          elapsedSeconds: 0,
          lastStartedAt: null,
          childItems: cloneItems(taskToDuplicate.childItems),
        };

        set((state) => ({
          tasks: [...state.tasks, duplicatedTask],
        }));

        return duplicatedTask;
      },

      createHabitFromTask: (taskId, effectiveStartDate) => {
        const state = get();
        const task = state.tasks.find((t) => t.id === taskId);
        if (!task) throw new Error('Task not found');
        const habitStartDate = effectiveStartDate ? new Date(effectiveStartDate) : new Date();

        const mapTaskItemToHabit = (item: TaskItem, parentElementId: ElementId): Habit => {
          const childHabits = item.childItems.map((child) => mapTaskItemToHabit(child, parentElementId));
          const hasChildren = childHabits.length > 0;
          const semanticType = item.semanticType || 'valuable';
          const plannedPoints = semanticType === 'valuable' ? (item.baseValue ?? 0) : 0;
          const plannedTimeMinutes = semanticType === 'valuable' ? (item.plannedTimeMinutes ?? 0) : 0;

          return {
            id: `habit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            title: item.title,
            name: item.title,
            description: item.description || '',
            type: 'HABIT',
            lifecycleType: 'HABIT',
            areaId: item.areaPrimaryId || task.areaPrimaryId || getDefaultAreaIdForElement(parentElementId),
            subareaId: item.subareaPrimaryId || null,
            elementId: parentElementId,
            semanticType,
            semanticValueBackup: semanticType === 'valuable'
              ? {
                  plannedPoints,
                  plannedTimeMinutes,
                }
              : null,
            semanticStructuralBackup: semanticType === 'structural'
              ? {
                  plannedPoints,
                  plannedTimeMinutes,
                }
              : null,
            plannedTimeMinutes,
            plannedPoints,
            recurrenceType: 'DAILY',
            recurrenceConfig: {},
            startDate: new Date(habitStartDate),
            createdAt: new Date(),
            updatedAt: new Date(),
            streak: 0,
            longestStreak: 0,
            lastCompletedAt: null,
            completions: [],
            parentId: null,
            children: [],
            isAggregator: hasChildren,
            aggregatedScore: 0,
            isCompleted: false,
            childHabits,
            isInProgress: false,
            elapsedSeconds: 0,
            sortOrder: item.sortOrder ?? 0,
            isExpanded: false,
            controlledBySequenceId: null,
          };
        };

        const mappedChildHabits = task.childItems.map((item) => mapTaskItemToHabit(item, task.elementId));
        const hasChildren = mappedChildHabits.length > 0;
        const maxHabitOrder = state.habits.reduce((max, h) => Math.max(max, h.sortOrder || 0), 0);
        const maxSequenceOrder = state.cycleSequences.reduce((max, sequence) => Math.max(max, sequence.displayOrder || 0), 0);

        const newHabit: Habit = {
          id: `habit-${Date.now()}`,
          title: task.title,
          name: task.title,
          description: task.description || '',
          type: 'HABIT',
          lifecycleType: 'HABIT',
          areaId: task.areaPrimaryId || getDefaultAreaIdForElement(task.elementId),
          subareaId: task.subareaPrimaryId || null,
          elementId: task.elementId,
          semanticType: 'valuable',
          semanticValueBackup: {
            plannedPoints: hasChildren ? 0 : (task.baseValue ?? 0),
            plannedTimeMinutes: task.plannedTimeMinutes ?? 0,
          },
          semanticStructuralBackup: null,
          plannedTimeMinutes: task.plannedTimeMinutes ?? 0,
          plannedPoints: hasChildren ? 0 : (task.baseValue ?? 0),
          recurrenceType: 'DAILY',
          recurrenceConfig: {},
          startDate: new Date(habitStartDate),
          createdAt: new Date(),
          updatedAt: new Date(),
          streak: 0,
          longestStreak: 0,
          lastCompletedAt: null,
          completions: [],
          parentId: null,
          children: [],
          isAggregator: hasChildren,
          aggregatedScore: 0,
          isCompleted: false,
          childHabits: mappedChildHabits,
          isInProgress: false,
          elapsedSeconds: 0,
          sortOrder: Math.max(maxHabitOrder, maxSequenceOrder) + 1,
          isExpanded: false,
          controlledBySequenceId: null,
        };

        set((state) => ({
          habits: [...state.habits, newHabit],
        }));

        if (hasChildren) {
          get().calculateHabitAggregation(newHabit.id);
        }

        return newHabit;
      },

      // ========== ITENS DE TAREFA ==========
      addTaskItem: (taskId, itemData, parentItemId = null) => {
        const findItemById = (items: TaskItem[], itemId: string): TaskItem | null => {
          for (const item of items) {
            if (item.id === itemId) return item;
            if (item.childItems.length > 0) {
              const found = findItemById(item.childItems, itemId);
              if (found) return found;
            }
          }
          return null;
        };

        const getSiblingItems = (task: Task): TaskItem[] => {
          if (!parentItemId) return task.childItems;
          const parentItem = findItemById(task.childItems, parentItemId);
          return parentItem ? parentItem.childItems : [];
        };

        const state = get();
        const task = state.tasks.find((t) => t.id === taskId);
        const parentItem = task && parentItemId ? findItemById(task.childItems, parentItemId) : null;
        const siblings = task ? getSiblingItems(task) : [];
        const nextSortOrder = siblings.reduce((max, item) => Math.max(max, item.sortOrder || 0), 0) + 1;

        const newItem: TaskItem = {
          id: `item-${Date.now()}`,
          taskId,
          type: 'TASK_ITEM',
          title: itemData.title || 'Novo Item',
          semanticType: itemData.semanticType || 'valuable',
          isCompleted: false,
          baseValue: itemData.baseValue ?? 1,
          plannedTimeMinutes: itemData.plannedTimeMinutes ?? null,
          actualTimeMinutes: null,
          sortOrder: itemData.sortOrder ?? nextSortOrder,
          createdAt: new Date(),
          updatedAt: new Date(),
          parentId: parentItemId,
          children: [],
          isAggregator: false,
          aggregatedScore: 0,
          // Herança completa de áreas (primária + secundária + terciária)
          areaPrimaryId:
            itemData.areaPrimaryId ?? parentItem?.areaPrimaryId ?? task?.areaPrimaryId ?? null,
          subareaPrimaryId:
            itemData.subareaPrimaryId ?? parentItem?.subareaPrimaryId ?? task?.subareaPrimaryId ?? null,
          areaSecondaryId1:
            itemData.areaSecondaryId1 ?? parentItem?.areaSecondaryId1 ?? task?.areaSecondaryId1 ?? null,
          subareaSecondaryId1:
            itemData.subareaSecondaryId1 ?? parentItem?.subareaSecondaryId1 ?? task?.subareaSecondaryId1 ?? null,
          areaSecondaryId2:
            itemData.areaSecondaryId2 ?? parentItem?.areaSecondaryId2 ?? task?.areaSecondaryId2 ?? null,
          subareaSecondaryId2:
            itemData.subareaSecondaryId2 ?? parentItem?.subareaSecondaryId2 ?? task?.subareaSecondaryId2 ?? null,
          childItems: [], // Suporta recursão!
          isExpanded: false,
        };
        
        // Função auxiliar para adicionar item recursivamente
        const addItemRecursively = (items: TaskItem[]): TaskItem[] => {
          return items.map(item => {
            if (item.id === parentItemId) {
              const isFirstChild = item.childItems.length === 0; // 🎯 Primeiro filho deste item?
              return {
                ...item,
                childItems: [...item.childItems, newItem],
                isAggregator: true,
                baseValue: isFirstChild ? 0 : item.baseValue, // 🎯 Item perde pontuação própria ao ganhar primeiro filho
              };
            } else if (item.childItems.length > 0) {
              return {
                ...item,
                childItems: addItemRecursively(item.childItems),
              };
            }
            return item;
          });
        };
        
        set((state) => ({
          tasks: state.tasks.map((task) => {
            if (task.id === taskId) {
              const isFirstChild = task.childItems.length === 0 && !parentItemId;
              if (parentItemId) {
                // Adiciona ao item pai recursivamente
                return {
                  ...task,
                  childItems: addItemRecursively(task.childItems),
                };
              } else {
                // Adiciona direto na raiz - SE FOR O PRIMEIRO FILHO, PAI PERDE baseValue (vira agregador puro)
                return { 
                  ...task, 
                  childItems: [...task.childItems, newItem],
                  isAggregator: true,
                  baseValue: isFirstChild ? 0 : task.baseValue, // 🎯 Pai perde pontuação própria ao ganhar primeiro filho
                };
              }
            }
            return task;
          }),
        }));

        get().calculateTaskAggregation(taskId);
      },
      
      updateTaskItem: (taskId, itemId, updates) => {
        // Função auxiliar para atualizar item recursivamente
        const updateItemRecursively = (items: TaskItem[]): TaskItem[] => {
          return items.map(item => {
            if (item.id === itemId) {
              return { ...item, ...updates, updatedAt: new Date() };
            } else if (item.childItems.length > 0) {
              return {
                ...item,
                childItems: updateItemRecursively(item.childItems),
              };
            }
            return item;
          });
        };
        
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === taskId
              ? {
                  ...task,
                  childItems: updateItemRecursively(task.childItems),
                }
              : task
          ),
        }));

        get().calculateTaskAggregation(taskId);
      },
      
      deleteTaskItem: (taskId, itemId) => {
        // Função auxiliar para deletar item recursivamente
        const deleteItemRecursively = (items: TaskItem[]): TaskItem[] => {
          return items
            .filter(item => item.id !== itemId)
            .map(item => ({
              ...item,
              childItems: deleteItemRecursively(item.childItems),
            }));
        };
        
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === taskId
              ? {
                  ...task,
                  childItems: deleteItemRecursively(task.childItems),
                  isAggregator: deleteItemRecursively(task.childItems).length > 0,
                }
              : task
          ),
        }));

        get().calculateTaskAggregation(taskId);
      },
      
      completeTaskItem: (taskId, itemId) => {
        const state = get();
        const task = state.tasks.find((t) => t.id === taskId);
        if (!task) return;
        
        const findItemById = (items: TaskItem[], searchId: string): TaskItem | null => {
          for (const item of items) {
            if (item.id === searchId) return item;
            if (item.childItems.length > 0) {
              const found = findItemById(item.childItems, searchId);
              if (found) return found;
            }
          }
          return null;
        };

        // Helper: Contar descendentes completos recursivamente
        const countCompletedDescendants = (items: TaskItem[]): { completed: number; total: number } => {
          let completed = 0;
          let total = 0;
          
          for (const item of items) {
            if (item.childItems && item.childItems.length > 0) {
              const childCounts = countCompletedDescendants(item.childItems);
              completed += childCounts.completed;
              total += childCounts.total;
            } else {
              total++;
              if (item.isCompleted) completed++;
            }
          }
          
          return { completed, total };
        };

        // Helper: Marcar todos recursivamente (Case A)
        const markAllCompleteRecursively = (items: TaskItem[]): TaskItem[] => {
          return items.map(item => {
            if (item.childItems && item.childItems.length > 0) {
              return {
                ...item,
                isCompleted: true,
                childItems: markAllCompleteRecursively(item.childItems)
              };
            } else {
              return { ...item, isCompleted: true };
            }
          });
        };

        // Helper: Calcular score apenas das folhas completas (Case B)
        const calculateCompletedChildrenScore = (items: TaskItem[]): number => {
          let totalScore = 0;
          
          for (const item of items) {
            if (item.childItems && item.childItems.length > 0) {
              totalScore += calculateCompletedChildrenScore(item.childItems);
            } else if (item.isCompleted) {
              const itemScore = (item.baseValue || 1) * EFFORT_MULTIPLIERS[2];
              totalScore += itemScore;
            }
          }
          
          return totalScore;
        };

        // Helper: Obter todas as folhas da árvore
        const getAllLeafItems = (items: TaskItem[]): TaskItem[] => {
          const leaves: TaskItem[] = [];
          for (const item of items) {
            if (item.childItems && item.childItems.length > 0) {
              leaves.push(...getAllLeafItems(item.childItems));
            } else {
              leaves.push(item);
            }
          }
          return leaves;
        };

        const item = findItemById(task.childItems, itemId);
        if (!item || item.isCompleted) return;

        // Verificar se é agregador (tem filhos)
        const hasChildren = item.childItems && item.childItems.length > 0;
        
        let scoreToAdd = 0;
        let updatedChildItems = task.childItems;

        if (!hasChildren) {
          // FOLHA: comportamento normal
          scoreToAdd = (item.baseValue || 1) * EFFORT_MULTIPLIERS[2];
          
          const markCompleteRecursively = (items: TaskItem[]): TaskItem[] => {
            return items.map((child) => {
              if (child.id === itemId) {
                return { ...child, isCompleted: true, updatedAt: new Date() };
              }
              if (child.childItems.length > 0) {
                return { ...child, childItems: markCompleteRecursively(child.childItems) };
              }
              return child;
            });
          };

          updatedChildItems = markCompleteRecursively(task.childItems);
        } else {
          // AGREGADOR: Case A ou Case B
          const counts = countCompletedDescendants(item.childItems);
          
          if (counts.completed === 0) {
            // **CASE A**: Nenhum filho completo → auto-completar todos
            const updatedItem = {
              ...item,
              isCompleted: true,
              childItems: markAllCompleteRecursively(item.childItems)
            };
            
            // Calcular score de todos os filhos agora completos
            const allLeaves = getAllLeafItems(updatedItem.childItems);
            scoreToAdd = allLeaves.reduce((sum, leaf) => {
              const leafScore = (leaf.baseValue || 1) * EFFORT_MULTIPLIERS[2];
              return sum + leafScore;
            }, 0);

            // Atualizar a árvore com o item agregador atualizado
            updatedChildItems = task.childItems.map(child => {
              if (child.id === itemId) return updatedItem;
              if (child.childItems && child.childItems.length > 0) {
                const updateInTree = (items: TaskItem[]): TaskItem[] => {
                  return items.map(subItem => {
                    if (subItem.id === itemId) return updatedItem;
                    if (subItem.childItems && subItem.childItems.length > 0) {
                      return { ...subItem, childItems: updateInTree(subItem.childItems) };
                    }
                    return subItem;
                  });
                };
                return { ...child, childItems: updateInTree(child.childItems) };
              }
              return child;
            });
          } else {
            // **CASE B**: Alguns filhos completos → completar apenas o item, somar apenas os completos
            scoreToAdd = calculateCompletedChildrenScore(item.childItems);

            const markItemCompleteOnly = (items: TaskItem[]): TaskItem[] => {
              return items.map(child => {
                if (child.id === itemId) {
                  return { ...child, isCompleted: true, updatedAt: new Date() };
                }
                if (child.childItems && child.childItems.length > 0) {
                  return { ...child, childItems: markItemCompleteOnly(child.childItems) };
                }
                return child;
              });
            };

            updatedChildItems = markItemCompleteOnly(task.childItems);
          }
        }

        // Helper: Encontrar pai de um item recursivamente
        const findParentOfItem = (items: TaskItem[], searchId: string, parent: TaskItem | null = null): TaskItem | null => {
          for (const item of items) {
            if (item.id === searchId) return parent;
            if (item.childItems && item.childItems.length > 0) {
              const found = findParentOfItem(item.childItems, searchId, item);
              if (found !== null) return found;
            }
          }
          return null;
        };

        // Helper: Auto-completar pai se todos os filhos estão completos
        const autoCompleteParentIfNeeded = (items: TaskItem[], parentId: string): TaskItem[] => {
          return items.map(item => {
            if (item.id === parentId) {
              // Verificar se TODOS os filhos estão completos
              const allChildrenComplete = item.childItems.every(child => {
                if (child.childItems && child.childItems.length > 0) {
                  // Filho agregador - verificar recursivamente
                  const counts = countCompletedDescendants(child.childItems);
                  return child.isCompleted && counts.completed === counts.total;
                }
                return child.isCompleted;
              });

              if (allChildrenComplete && !item.isCompleted) {
                return { ...item, isCompleted: true, updatedAt: new Date() };
              }
              return item;
            }
            if (item.childItems && item.childItems.length > 0) {
              return { ...item, childItems: autoCompleteParentIfNeeded(item.childItems, parentId) };
            }
            return item;
          });
        };

        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  childItems: updatedChildItems,
                  aggregatedScore: t.aggregatedScore + Math.round(scoreToAdd),
                }
              : t
          ),
        }));

        // Adicionar pontuação ao usuário
        get().addScore(Math.round(scoreToAdd));
        get().calculateTaskAggregation(taskId);

        // Propagar completamento para cima se todos os irmãos estão completos
        let currentItemId = itemId;
        let shouldContinue = true;
        
        while (shouldContinue) {
          const currentState = get();
          const currentTask = currentState.tasks.find((t) => t.id === taskId);
          if (!currentTask) break;

          const parent = findParentOfItem(currentTask.childItems, currentItemId);
          if (!parent) break; // Não há pai (é filho direto da task)

          // Verificar se TODOS os filhos do pai estão completos
          const allChildrenComplete = parent.childItems.every(child => {
            if (child.childItems && child.childItems.length > 0) {
              // Filho agregador
              const counts = countCompletedDescendants(child.childItems);
              return child.isCompleted && counts.completed === counts.total;
            }
            return child.isCompleted;
          });

          if (allChildrenComplete && !parent.isCompleted) {
            // Marcar o pai
            set((s) => ({
              tasks: s.tasks.map((t) =>
                t.id === taskId
                  ? { ...t, childItems: autoCompleteParentIfNeeded(t.childItems, parent.id) }
                  : t
              ),
            }));
            // Continuar para verificar o avô
            currentItemId = parent.id;
          } else {
            shouldContinue = false;
          }
        }
      },
      
      uncompleteTaskItem: (taskId, itemId) => {
        const state = get();
        const task = state.tasks.find((t) => t.id === taskId);
        if (!task) return;
        
        const findItemById = (items: TaskItem[], searchId: string): TaskItem | null => {
          for (const item of items) {
            if (item.id === searchId) return item;
            if (item.childItems.length > 0) {
              const found = findItemById(item.childItems, searchId);
              if (found) return found;
            }
          }
          return null;
        };

        // Helper: Contar descendentes completos
        const countCompletedDescendants = (items: TaskItem[]): { completed: number; total: number } => {
          let completed = 0;
          let total = 0;
          
          for (const item of items) {
            if (item.childItems && item.childItems.length > 0) {
              const childCounts = countCompletedDescendants(item.childItems);
              completed += childCounts.completed;
              total += childCounts.total;
            } else {
              total++;
              if (item.isCompleted) completed++;
            }
          }
          
          return { completed, total };
        };

        // Helper: Calcular score apenas das folhas completas
        const calculateCompletedChildrenScore = (items: TaskItem[]): number => {
          let totalScore = 0;
          
          for (const item of items) {
            if (item.childItems && item.childItems.length > 0) {
              totalScore += calculateCompletedChildrenScore(item.childItems);
            } else if (item.isCompleted) {
              const itemScore = (item.baseValue || 1) * EFFORT_MULTIPLIERS[2];
              totalScore += itemScore;
            }
          }
          
          return totalScore;
        };

        // Helper: Desmarcar TODOS os descendentes recursivamente
        const unmarkAllDescendants = (items: TaskItem[]): TaskItem[] => {
          return items.map((item) => ({
            ...item,
            isCompleted: false,
            updatedAt: new Date(),
            childItems: item.childItems && item.childItems.length > 0
              ? unmarkAllDescendants(item.childItems)
              : item.childItems
          }));
        };

        // Helper: Procurar itemId, encontrar e desmarcar ele + todos descendentes
        const unmarkItemAndDescendants = (items: TaskItem[]): TaskItem[] => {
          return items.map((item) => {
            if (item.id === itemId) {
              // Encontramos - desmarcar este item E todos seus descendentes
              return {
                ...item,
                isCompleted: false,
                updatedAt: new Date(),
                childItems: item.childItems && item.childItems.length > 0
                  ? unmarkAllDescendants(item.childItems)
                  : item.childItems
              };
            }
            // Não é o item procurado - procurar nos filhos
            if (item.childItems && item.childItems.length > 0) {
              return { ...item, childItems: unmarkItemAndDescendants(item.childItems) };
            }
            return item;
          });
        };

        // Helper: Desmarcar apenas o item (usado em Case B)
        const unmarkItemOnly = (items: TaskItem[]): TaskItem[] => {
          return items.map((item) => {
            if (item.id === itemId) {
              return { ...item, isCompleted: false, updatedAt: new Date() };
            }
            if (item.childItems.length > 0) {
              return { ...item, childItems: unmarkItemOnly(item.childItems) };
            }
            return item;
          });
        };

        const item = findItemById(task.childItems, itemId);
        if (!item || !item.isCompleted) return;

        // Verificar se é agregador (tem filhos)
        const hasChildren = item.childItems && item.childItems.length > 0;
        
        let scoreToRemove = 0;
        let updatedChildItems = task.childItems;
        
        if (!hasChildren) {
          // FOLHA: deducao simples e desmarcar só o item
          scoreToRemove = (item.baseValue || 1) * EFFORT_MULTIPLIERS[2];
          updatedChildItems = unmarkItemOnly(task.childItems);
        } else {
          // AGREGADOR: detectar se foi Case A ou B
          const counts = countCompletedDescendants(item.childItems);
          
          if (counts.completed === counts.total) {
            // **Case A**: Todos os filhos estão completos → foi auto-completamento
            // Ao desmarcar, desmarcar TODOS os filhos
            scoreToRemove = calculateCompletedChildrenScore(item.childItems);
            updatedChildItems = unmarkItemAndDescendants(task.childItems);
          } else {
            // **Case B**: Nem todos completos → foi completamento parcial
            // Ao desmarcar, manter filhos como estão
            scoreToRemove = calculateCompletedChildrenScore(item.childItems);
            updatedChildItems = unmarkItemOnly(task.childItems);
          }
        }

        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  childItems: updatedChildItems,
                  aggregatedScore: Math.max(0, t.aggregatedScore - Math.round(scoreToRemove)),
                }
              : t
          ),
        }));

        // Remover pontuação do usuário
        get().addScore(-Math.round(scoreToRemove));
        get().calculateTaskAggregation(taskId);

        // Helper: Encontrar pai de um item
        const findParentOfItem = (items: TaskItem[], searchId: string, parent: TaskItem | null = null): TaskItem | null => {
          for (const item of items) {
            if (item.id === searchId) return parent;
            if (item.childItems && item.childItems.length > 0) {
              const found = findParentOfItem(item.childItems, searchId, item);
              if (found !== null) return found;
            }
          }
          return null;
        };

        // Helper: Desmarcar pai se estava completo
        const unmarkParentIfNeeded = (items: TaskItem[], parentId: string): TaskItem[] => {
          return items.map(item => {
            if (item.id === parentId && item.isCompleted) {
              return { ...item, isCompleted: false, updatedAt: new Date() };
            }
            if (item.childItems && item.childItems.length > 0) {
              return { ...item, childItems: unmarkParentIfNeeded(item.childItems, parentId) };
            }
            return item;
          });
        };

        // Propagar desmarcação para cima
        let currentItemId = itemId;
        let shouldContinue = true;
        
        while (shouldContinue) {
          const currentState = get();
          const currentTask = currentState.tasks.find((t) => t.id === taskId);
          if (!currentTask) break;

          const parent = findParentOfItem(currentTask.childItems, currentItemId);
          if (!parent) break; // Não há pai

          if (parent.isCompleted) {
            // Desmarcar o pai
            set((s) => ({
              tasks: s.tasks.map((t) =>
                t.id === taskId
                  ? { ...t, childItems: unmarkParentIfNeeded(t.childItems, parent.id) }
                  : t
              ),
            }));
            // Continuar para verificar o avô
            currentItemId = parent.id;
          } else {
            shouldContinue = false;
          }
        }
      },
      
      toggleTaskItemExpansion: (taskId, itemId) => {
        // Função auxiliar para toggle recursivo
        const toggleItemRecursively = (items: TaskItem[]): TaskItem[] => {
          return items.map(item => {
            if (item.id === itemId) {
              return { ...item, isExpanded: !item.isExpanded };
            } else if (item.childItems.length > 0) {
              return {
                ...item,
                childItems: toggleItemRecursively(item.childItems),
              };
            }
            return item;
          });
        };
        
        set((state) => ({
          tasks: state.tasks.map(task =>
            task.id === taskId
              ? {
                  ...task,
                  childItems: toggleItemRecursively(task.childItems),
                }
              : task
          ),
        }));
      },

      moveTaskItemUp: (taskId, itemId) => {
        const reorderItems = (items: TaskItem[]): TaskItem[] => {
          const index = items.findIndex((item) => item.id === itemId);
          if (index === -1) {
            return items.map((item) => ({
              ...item,
              childItems: reorderItems(item.childItems),
            }));
          }

          const sorted = [...items].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
          const sortedIndex = sorted.findIndex((item) => item.id === itemId);
          if (sortedIndex <= 0) return items;

          const current = sorted[sortedIndex];
          const previous = sorted[sortedIndex - 1];
          const currentOrder = current.sortOrder ?? sortedIndex + 1;
          const previousOrder = previous.sortOrder ?? sortedIndex;

          return sorted.map((item) => {
            if (item.id === current.id) return { ...item, sortOrder: previousOrder };
            if (item.id === previous.id) return { ...item, sortOrder: currentOrder };
            return item;
          });
        };

        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === taskId
              ? { ...task, childItems: reorderItems(task.childItems) }
              : task
          ),
        }));
      },

      moveTaskItemDown: (taskId, itemId) => {
        const reorderItems = (items: TaskItem[]): TaskItem[] => {
          const index = items.findIndex((item) => item.id === itemId);
          if (index === -1) {
            return items.map((item) => ({
              ...item,
              childItems: reorderItems(item.childItems),
            }));
          }

          const sorted = [...items].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
          const sortedIndex = sorted.findIndex((item) => item.id === itemId);
          if (sortedIndex === -1 || sortedIndex >= sorted.length - 1) return items;

          const current = sorted[sortedIndex];
          const next = sorted[sortedIndex + 1];
          const currentOrder = current.sortOrder ?? sortedIndex + 1;
          const nextOrder = next.sortOrder ?? sortedIndex + 2;

          return sorted.map((item) => {
            if (item.id === current.id) return { ...item, sortOrder: nextOrder };
            if (item.id === next.id) return { ...item, sortOrder: currentOrder };
            return item;
          });
        };

        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === taskId
              ? { ...task, childItems: reorderItems(task.childItems) }
              : task
          ),
        }));
      },
      
      calculateTaskAggregation: (taskId) => {
        type TaskAggregation = {
          totalValue: number;
          totalTime: number;
          areaTotals: Record<string, number>;
        };

        const aggregateItems = (items: TaskItem[]): TaskAggregation => {
          return items.reduce(
            (acc: TaskAggregation, item: TaskItem): TaskAggregation => {
              const childAgg = item.childItems.length > 0 ? aggregateItems(item.childItems) : null;
              const itemValue = item.semanticType === 'valuable' ? (item.baseValue || 0) : 0;
              const itemTime = item.plannedTimeMinutes || 0;

              const value = childAgg ? childAgg.totalValue : itemValue;
              const time = childAgg ? childAgg.totalTime : itemTime;

              const areaTotals = { ...acc.areaTotals };
              if (childAgg) {
                Object.entries(childAgg.areaTotals).forEach(([areaId, areaValue]: [string, number]) => {
                  areaTotals[areaId] = (areaTotals[areaId] || 0) + areaValue;
                });
              } else {
                // Agregar área primária
                if (item.areaPrimaryId && value > 0) {
                  areaTotals[item.areaPrimaryId] = (areaTotals[item.areaPrimaryId] || 0) + value;
                }
                // Agregar áreas secundárias
                if (item.areaSecondaryId1 && value > 0) {
                  areaTotals[item.areaSecondaryId1] = (areaTotals[item.areaSecondaryId1] || 0) + value;
                }
                if (item.areaSecondaryId2 && value > 0) {
                  areaTotals[item.areaSecondaryId2] = (areaTotals[item.areaSecondaryId2] || 0) + value;
                }
                // Agregar áreas terciárias
                if (item.areaTertiaryId1 && value > 0) {
                  areaTotals[item.areaTertiaryId1] = (areaTotals[item.areaTertiaryId1] || 0) + value;
                }
                if (item.areaTertiaryId2 && value > 0) {
                  areaTotals[item.areaTertiaryId2] = (areaTotals[item.areaTertiaryId2] || 0) + value;
                }
              }

              return {
                totalValue: acc.totalValue + value,
                totalTime: acc.totalTime + time,
                areaTotals,
              };
            },
            { totalValue: 0, totalTime: 0, areaTotals: {} }
          );
        };

        set((state) => ({
          tasks: state.tasks.map(task => {
            if (task.id === taskId) {
              const aggregated = aggregateItems(task.childItems);
              const hasChildren = task.childItems.length > 0;
              const topAreaEntry = (Object.entries(aggregated.areaTotals) as Array<[string, number]>)
                .sort((a, b) => b[1] - a[1])[0];
              const topAreaId = topAreaEntry ? topAreaEntry[0] : null;

              return {
                ...task,
                // 🎯 Agregador SEMPRE tem baseValue = 0 (não copiar totalValue para baseValue)
                baseValue: hasChildren ? 0 : task.baseValue,
                plannedTimeMinutes: hasChildren && aggregated.totalTime > 0 ? aggregated.totalTime : task.plannedTimeMinutes,
                areaPrimaryId: hasChildren && topAreaId ? topAreaId : task.areaPrimaryId,
                isAggregator: hasChildren,
              };
            }
            return task;
          }),
        }));
      },
      
      // ========== HÁBITOS ==========
      habits: [],
      
      addHabit: (habitData) => {
        const state = get();
        const maxHabitOrder = state.habits.reduce((max, h) => Math.max(max, h.sortOrder || 0), 0);
        const maxSequenceOrder = state.cycleSequences.reduce((max, sequence) => Math.max(max, sequence.displayOrder || 0), 0);
        const nextSortOrder = habitData.sortOrder ?? Math.max(maxHabitOrder, maxSequenceOrder) + 1;
        
        const areaForElement = habitData.areaId ? getAreaById(habitData.areaId) : undefined;
        const resolvedElementId = habitData.elementId ?? areaForElement?.elementId ?? 'terra';
        const newHabit: Habit = {
          id: `habit-${Date.now()}`,
          title: habitData.title || habitData.name || 'Novo Ciclo',
          name: habitData.name || habitData.title || 'Novo Ciclo',
          description: habitData.description || '',
          type: 'HABIT',
          lifecycleType: 'HABIT',
          areaId: habitData.areaId || 'sem-categoria',
          subareaId: habitData.subareaId ?? null,
          elementId: resolvedElementId,
          semanticType: habitData.semanticType || 'valuable',
          semanticValueBackup: {
            plannedPoints: habitData.plannedPoints ?? DEFAULT_SCORES.CICLO.plannedPoints,
            plannedTimeMinutes: habitData.plannedTimeMinutes ?? 0,
          },
          semanticStructuralBackup: null,
          plannedTimeMinutes: habitData.plannedTimeMinutes ?? 0,
          plannedPoints: habitData.plannedPoints ?? DEFAULT_SCORES.CICLO.plannedPoints,
          recurrenceType: habitData.recurrenceType || 'DAILY',
          recurrenceConfig: habitData.recurrenceConfig || {},
          startDate: habitData.startDate ? new Date(habitData.startDate) : new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
          streak: 0,
          longestStreak: 0,
          lastCompletedAt: null,
          completions: [],
          parentId: habitData.parentId || null,
          children: [],
          isAggregator: false,
          aggregatedScore: 0,
          isCompleted: false,
          childHabits: [],
          isInProgress: false,
          elapsedSeconds: 0,
          sortOrder: nextSortOrder,
          isExpanded: false,
          controlledBySequenceId: null,
        };
        set((state) => ({
          habits: [...state.habits, newHabit],
        }));
        return newHabit;
      },
      
      updateHabit: (habitId, updates) => {
        set((state) => ({
          habits: state.habits.map((habit) =>
            habit.id === habitId
              ? syncHabitSemanticBackups({ ...habit, ...updates, updatedAt: new Date() })
              : habit
          ),
        }));
      },
      
      deleteHabit: (habitId) => {
        set((state) => {
          const rootHabit = state.habits.find((habit) => habit.id === habitId);
          if (!rootHabit) return state;

          const idsToRemove = new Set(collectHabitIdsDeep(rootHabit));
          const nextMemberships = state.sequenceMemberships.filter(
            (membership) => !idsToRemove.has(membership.habitId)
          );
          const normalized = normalizeSequenceState(state.cycleSequences, nextMemberships);

          return {
            habits: state.habits.filter((habit) => habit.id !== habitId),
            sequenceMemberships: normalized.memberships,
            cycleSequences: normalized.sequences,
          };
        });
      },
      
      completeHabit: (habitId, timeSpentMinutes, completionDate, metadata) => {
        return get().completeHabitChild(habitId, timeSpentMinutes, completionDate ?? new Date(), metadata);
      },

      uncompleteHabit: (habitId, completionDate) => {
        // Reutiliza as mesmas regras de desmarcar de subitens,
        // inclusive para agregadores e descendentes no dia selecionado.
        get().uncompleteHabitChild(habitId, completionDate);
      },

      duplicateHabit: (habitId) => {
        const state = get();
        const habitToDuplicate = state.habits.find((h) => h.id === habitId);
        if (!habitToDuplicate) throw new Error('Habit not found');

        // Clone recursively including all childHabits
        const cloneHabits = (habits: Habit[]): Habit[] => {
          return habits.map(habit => ({
            ...habit,
            id: `habit-${Date.now()}-${Math.random()}`,
            createdAt: new Date(),
            updatedAt: new Date(),
            completions: [],
            lastCompletedAt: null,
            streak: 0,
            longestStreak: 0,
            isCompleted: false,
            // Cópia passa a valer a partir do momento em que foi criada.
            startDate: new Date(),
            isInProgress: false,
            elapsedSeconds: 0,
            childHabits: habit.childHabits.length > 0 ? cloneHabits(habit.childHabits) : [],
            controlledBySequenceId: null,
          }));
        };

        const duplicatedHabit: Habit = {
          ...habitToDuplicate,
          id: `habit-${Date.now()}`,
          name: `${habitToDuplicate.name} (cópia)`,
          title: `${habitToDuplicate.title} (cópia)`,
          createdAt: new Date(),
          updatedAt: new Date(),
          completions: [],
          lastCompletedAt: null,
          streak: 0,
          longestStreak: 0,
          isCompleted: false,
          // Cópia passa a valer a partir do momento em que foi criada.
          startDate: new Date(),
          isInProgress: false,
          elapsedSeconds: 0,
          semanticType: habitToDuplicate.semanticType || 'valuable',
          semanticValueBackup: habitToDuplicate.semanticValueBackup || {
            plannedPoints: habitToDuplicate.plannedPoints,
            plannedTimeMinutes: habitToDuplicate.plannedTimeMinutes,
          },
          semanticStructuralBackup: habitToDuplicate.semanticStructuralBackup || null,
          childHabits: habitToDuplicate.childHabits.length > 0 ? cloneHabits(habitToDuplicate.childHabits) : [],
          controlledBySequenceId: null,
        };

        set((state) => ({
          habits: [...state.habits, duplicatedHabit],
        }));

        return duplicatedHabit;
      },

      moveHabitUp: (habitId) => {
        set((state) => ({
          habits: moveNodeUp(state.habits, habitId),
        }));
      },
      
      moveHabitDown: (habitId) => {
        set((state) => ({
          habits: moveNodeDown(state.habits, habitId),
        }));
      },

      reorderHabits: (orderedHabitIds) => {
        set((state) => {
          const orderMap = new Map<string, number>();
          orderedHabitIds.forEach((id, index) => {
            orderMap.set(id, index + 1);
          });

          return {
            habits: state.habits.map((habit) => {
              const nextOrder = orderMap.get(habit.id);
              return nextOrder != null
                ? { ...habit, sortOrder: nextOrder }
                : habit;
            }),
          };
        });
      },

      addHabitChild: (parentHabitId, habitData) => {
        const state = get();
        const findHabitById = (habits: Habit[], id: string): Habit | null => {
          for (const habit of habits) {
            if (habit.id === id) return habit;
            if (habit.childHabits.length > 0) {
              const found = findHabitById(habit.childHabits, id);
              if (found) return found;
            }
          }
          return null;
        };

        const parentHabit = findHabitById(state.habits, parentHabitId);
        const siblingHabits = parentHabit ? parentHabit.childHabits : [];
        const nextSortOrder = calculateNextSortOrder(siblingHabits);

        const areaForElement = habitData.areaId ? getAreaById(habitData.areaId) : undefined;
        const resolvedElementId = habitData.elementId
          ?? areaForElement?.elementId
          ?? parentHabit?.elementId
          ?? 'terra';

        const newHabit: Habit = {
          id: `habit-${Date.now()}`,
          title: habitData.title || habitData.name || 'Novo Subciclo',
          name: habitData.name || habitData.title || 'Novo Subciclo',
          description: habitData.description || '',
          type: 'HABIT',
          lifecycleType: 'HABIT',
          areaId: habitData.areaId ?? parentHabit?.areaId ?? 'sem-categoria',
          subareaId: habitData.subareaId ?? parentHabit?.subareaId ?? null,
          elementId: resolvedElementId,
          semanticType: habitData.semanticType || 'valuable',
          semanticValueBackup: {
            plannedPoints: habitData.plannedPoints ?? DEFAULT_SCORES.CICLO.plannedPoints,
            plannedTimeMinutes: habitData.plannedTimeMinutes ?? 0,
          },
          semanticStructuralBackup: null,
          plannedTimeMinutes: habitData.plannedTimeMinutes ?? 0,
          plannedPoints: habitData.plannedPoints ?? DEFAULT_SCORES.CICLO.plannedPoints,
          recurrenceType: habitData.recurrenceType || parentHabit?.recurrenceType || 'DAILY',
          recurrenceConfig: habitData.recurrenceConfig || parentHabit?.recurrenceConfig || {},
          startDate: habitData.startDate
            ? new Date(habitData.startDate)
            : (parentHabit?.startDate ? new Date(parentHabit.startDate) : new Date()),
          createdAt: new Date(),
          updatedAt: new Date(),
          streak: 0,
          longestStreak: 0,
          lastCompletedAt: null,
          completions: [],
          parentId: parentHabitId,
          children: [],
          isAggregator: false,
          aggregatedScore: 0,
          isCompleted: false,
          childHabits: [],
          isInProgress: false,
          elapsedSeconds: 0,
          sortOrder: habitData.sortOrder ?? nextSortOrder,
          isExpanded: false,
          controlledBySequenceId: null,
        };

        const addChildRecursively = (habits: Habit[]): Habit[] => {
          return habits.map((habit) => {
            if (habit.id === parentHabitId) {
              const isFirstChild = habit.childHabits.length === 0;
              return {
                ...habit,
                childHabits: [...habit.childHabits, newHabit],
                isAggregator: true,
                 semanticValueBackup: {
                   plannedPoints: isFirstChild 
                     ? (habit.plannedPoints ?? habit.semanticValueBackup?.plannedPoints ?? DEFAULT_SCORES.CICLO.plannedPoints)
                     : habit.semanticValueBackup?.plannedPoints ?? habit.plannedPoints,
                   plannedTimeMinutes: habit.semanticValueBackup?.plannedTimeMinutes ?? habit.plannedTimeMinutes,
                 },
                 plannedPoints: 0,
              };
            }
            if (habit.childHabits.length > 0) {
              return {
                ...habit,
                childHabits: addChildRecursively(habit.childHabits),
              };
            }
            return habit;
          });
        };

        set((current) => ({
          habits: addChildRecursively(current.habits),
        }));

        get().calculateHabitAggregation(parentHabitId);
      },

      updateHabitChild: (habitId, updates) => {
        const findParentId = (habits: Habit[], targetId: string): string | null => {
          for (const habit of habits) {
            if (habit.childHabits.some((child) => child.id === targetId)) {
              return habit.id;
            }
            if (habit.childHabits.length > 0) {
              const parentId = findParentId(habit.childHabits, targetId);
              if (parentId) return parentId;
            }
          }
          return null;
        };

        const parentId = findParentId(get().habits, habitId);

        const updateRecursively = (habits: Habit[]): Habit[] => {
          return habits.map((habit) => {
            if (habit.id === habitId) {
              return syncHabitSemanticBackups({ ...habit, ...updates, updatedAt: new Date() });
            }
            if (habit.childHabits.length > 0) {
              return {
                ...habit,
                childHabits: updateRecursively(habit.childHabits),
              };
            }
            return habit;
          });
        };

        set((current) => ({
          habits: updateRecursively(current.habits),
        }));

        if (parentId) {
          get().calculateHabitAggregation(parentId);
        }
      },

      deleteHabitChild: (habitId) => {
        const findParentId = (habits: Habit[], targetId: string): string | null => {
          for (const habit of habits) {
            if (habit.childHabits.some((child) => child.id === targetId)) {
              return habit.id;
            }
            if (habit.childHabits.length > 0) {
              const parentId = findParentId(habit.childHabits, targetId);
              if (parentId) return parentId;
            }
          }
          return null;
        };

        const parentId = findParentId(get().habits, habitId);

        const deleteRecursively = (habits: Habit[]): Habit[] => {
          return habits
            .filter((habit) => habit.id !== habitId)
            .map((habit) => ({
              ...habit,
              childHabits: deleteRecursively(habit.childHabits),
            }));
        };

        set((current) => {
          const targetHabit = findHabitByIdDeep(current.habits, habitId);
          const idsToRemove = new Set(targetHabit ? collectHabitIdsDeep(targetHabit) : [habitId]);
          const nextMemberships = current.sequenceMemberships.filter(
            (membership) => !idsToRemove.has(membership.habitId)
          );
          const normalized = normalizeSequenceState(current.cycleSequences, nextMemberships);

          return {
            habits: deleteRecursively(current.habits),
            sequenceMemberships: normalized.memberships,
            cycleSequences: normalized.sequences,
          };
        });

        if (parentId) {
          get().calculateHabitAggregation(parentId);
        }
      },

      completeHabitChild: (habitId, timeSpentMinutes, completionDate, metadata) => {
        const state = get();
        const previousTotalScore = state.user.totalScore;
        const completionAt = completionDate ? new Date(completionDate) : new Date();

        const findHabitById = (habits: Habit[], id: string): Habit | null => {
          for (const habit of habits) {
            if (habit.id === id) return habit;
            if (habit.childHabits.length > 0) {
              const found = findHabitById(habit.childHabits, id);
              if (found) return found;
            }
          }
          return null;
        };

        const computeStreakData = (completions: HabitCompletion[]) => {
          if (completions.length === 0) {
            return { streak: 0, longestStreak: 0, lastCompletedAt: null as Date | null };
          }

          const uniqueDates = Array.from(
            new Set(completions.map((c) => new Date(c.completionDate).toDateString()))
          )
            .map((d) => new Date(d))
            .sort((a, b) => b.getTime() - a.getTime());

          const lastCompletedAt = uniqueDates[0];

          let streak = 1;
          for (let i = 1; i < uniqueDates.length; i += 1) {
            const prev = new Date(uniqueDates[i - 1]);
            prev.setDate(prev.getDate() - 1);
            if (uniqueDates[i].toDateString() === prev.toDateString()) {
              streak += 1;
            } else {
              break;
            }
          }

          let longestStreak = 1;
          let currentRun = 1;
          for (let i = 1; i < uniqueDates.length; i += 1) {
            const prev = new Date(uniqueDates[i - 1]);
            prev.setDate(prev.getDate() - 1);
            if (uniqueDates[i].toDateString() === prev.toDateString()) {
              currentRun += 1;
            } else {
              currentRun = 1;
            }
            longestStreak = Math.max(longestStreak, currentRun);
          }

          return { streak, longestStreak, lastCompletedAt };
        };

        const findParentId = (habits: Habit[], targetId: string): string | null => {
          for (const habit of habits) {
            if (habit.childHabits.some((child) => child.id === targetId)) {
              return habit.id;
            }
            if (habit.childHabits.length > 0) {
              const parentId = findParentId(habit.childHabits, targetId);
              if (parentId) return parentId;
            }
          }
          return null;
        };

        const isCompletedOnDateOrPredicted = (habit: Habit, predictedIds: Set<string>) => {
          return predictedIds.has(habit.id) || isHabitCompletedOnDate(habit, completionAt);
        };

        const areAllDescendantsCompleted = (habit: Habit, predictedIds: Set<string>): boolean => {
          if (habit.childHabits.length === 0) {
            return isCompletedOnDateOrPredicted(habit, predictedIds);
          }

          return habit.childHabits.every((child) => areAllDescendantsCompleted(child, predictedIds));
        };

        const collectDescendantIds = (habit: Habit): string[] => {
          return habit.childHabits.flatMap((child) => [child.id, ...collectDescendantIds(child)]);
        };

        const countCompletedDescendantsOnDate = (habit: Habit): number => {
          return habit.childHabits.reduce((count, child) => {
            const ownCount = isHabitCompletedOnDate(child, completionAt) ? 1 : 0;
            return count + ownCount + countCompletedDescendantsOnDate(child);
          }, 0);
        };

        const targetHabit = findHabitById(state.habits, habitId);
        if (!targetHabit || isHabitCompletedOnDate(targetHabit, completionAt)) {
          return 0;
        }

        const targetPlannedScore = calculateHabitPlannedScore(targetHabit);
        const targetExecutedScore = calculateHabitExecutedScore(targetHabit, timeSpentMinutes);

        // Case A (doc): parent with no descendants completed on this date auto-completes all descendants.
        const targetHasDescendants = targetHabit.childHabits.length > 0;
        const completedDescendantsCount = countCompletedDescendantsOnDate(targetHabit);
        const shouldAutocompleteDescendants = targetHasDescendants && completedDescendantsCount === 0;
        const descendantIdsToComplete = shouldAutocompleteDescendants
          ? new Set(collectDescendantIds(targetHabit))
          : new Set<string>();

        // Upward propagation: if a parent has all descendants completed on the same date,
        // it is auto-marked as completed (status only).
        const parentIdsToComplete = new Set<string>();
        const predictedCompletedIds = new Set<string>([habitId]);
        descendantIdsToComplete.forEach((id) => predictedCompletedIds.add(id));
        let currentId: string | null = habitId;
        while (currentId) {
          const parentId = findParentId(state.habits, currentId);
          if (!parentId) break;

          const parentHabit = findHabitById(state.habits, parentId);
          if (!parentHabit) break;

          if (areAllDescendantsCompleted(parentHabit, predictedCompletedIds)) {
            parentIdsToComplete.add(parentId);
            predictedCompletedIds.add(parentId);
            currentId = parentId;
          } else {
            break;
          }
        }

        const completion: HabitCompletion = {
          id: `completion-${Date.now()}`,
          habitId,
          completionDate: completionAt,
          timeSpentMinutes,
          // Score ledger fields: used to keep cross-device/user progress deterministic.
          scoreEarned: targetExecutedScore,
          plannedScoreAtCompletion: targetPlannedScore,
          executedScore: targetExecutedScore,
          actualEffortLevel: 1,
          formulaVersion: 'habit-v1',
          startedAtCycleSeconds: metadata?.startedAtCycleSeconds,
          endedAtCycleSeconds: metadata?.endedAtCycleSeconds,
        };

        const completeRecursively = (habits: Habit[]): Habit[] => {
          return habits.map((habit) => {
            const updatedChildren = habit.childHabits.length > 0
              ? completeRecursively(habit.childHabits)
              : habit.childHabits;

            const baseHabit = habit.childHabits.length > 0
              ? { ...habit, childHabits: updatedChildren }
              : habit;

            const shouldAddTargetCompletion = habit.id === habitId;
            const shouldAutoCompleteDescendant =
              descendantIdsToComplete.has(habit.id) && !isHabitCompletedOnDate(baseHabit, completionAt);
            const shouldAutoCompleteParent =
              parentIdsToComplete.has(habit.id) && !isHabitCompletedOnDate(baseHabit, completionAt);

            if (shouldAddTargetCompletion || shouldAutoCompleteDescendant || shouldAutoCompleteParent) {
              const completionToApply = shouldAddTargetCompletion
                ? completion
                : {
                    id: `completion-${Date.now()}-${Math.random()}`,
                    habitId: habit.id,
                    completionDate: completionAt,
                    timeSpentMinutes: 0,
                    scoreEarned: 0,
                  };
              const updatedCompletions = [...baseHabit.completions, completionToApply];
              const streakData = computeStreakData(updatedCompletions);
              return {
                ...baseHabit,
                completions: updatedCompletions,
                lastCompletedAt: streakData.lastCompletedAt,
                streak: streakData.streak,
                longestStreak: Math.max(streakData.longestStreak, baseHabit.longestStreak || 0),
                isInProgress: shouldAddTargetCompletion ? false : baseHabit.isInProgress,
                elapsedSeconds: shouldAddTargetCompletion ? 0 : baseHabit.elapsedSeconds,
              };
            }

            return baseHabit;
          });
        };

        set((current) => ({
          habits: completeRecursively(current.habits),
        }));

        // Sequencia: marca o item do dia como concluido e so avanca visualmente no proximo dia disponivel.
        const latestState = get();
        const membership = latestState.sequenceMemberships.find((item) => item.habitId === habitId);
        if (membership) {
          const sequence = latestState.cycleSequences.find((item) => item.id === membership.sequenceId);
          if (sequence && sequence.isActive) {
            const sameDayCompleted = sequence.lastCompletedDate
              ? isSameDay(sequence.lastCompletedDate, completionAt)
              : false;

            const members = latestState.sequenceMemberships
              .filter((item) => item.sequenceId === sequence.id)
              .sort((a, b) => a.position - b.position);

            if (members.length > 0) {
              const effectivePosition = getSequencePositionForDate(sequence, members.length, completionAt);

              if (!sameDayCompleted && membership.position === effectivePosition) {
                set((current) => ({
                  cycleSequences: current.cycleSequences.map((item) =>
                    item.id === sequence.id
                      ? {
                          ...item,
                          // Mantem a posicao no item concluido do dia.
                          // O avanço para o proximo item é calculado por data.
                          currentPosition: effectivePosition,
                          lastCompletedDate: new Date(completionAt),
                          updatedAt: new Date(),
                        }
                      : item
                  ),
                }));
              }
            }
          }
        }

        get().recomputeUserProgress();
        const updatedTotalScore = get().user.totalScore;
        const awardedScore = Math.max(0, updatedTotalScore - previousTotalScore);

        return awardedScore;
      },

      uncompleteHabitChild: (habitId, completionDate) => {
        const targetDate = new Date(completionDate).toDateString();
        let didUncomplete = false;
        const isCompletedOnTargetDate = (habit: Habit) =>
          habit.completions.some(
            (c) => new Date(c.completionDate).toDateString() === targetDate
          );

        const areAllDescendantsCompletedOnTargetDate = (habit: Habit): boolean => {
          if (habit.childHabits.length === 0) {
            return isCompletedOnTargetDate(habit);
          }
          return habit.childHabits.every((child) => areAllDescendantsCompletedOnTargetDate(child));
        };

        const computeStreakData = (completions: HabitCompletion[]) => {
          if (completions.length === 0) {
            return { streak: 0, longestStreak: 0, lastCompletedAt: null as Date | null };
          }

          const uniqueDates = Array.from(
            new Set(completions.map((c) => new Date(c.completionDate).toDateString()))
          )
            .map((d) => new Date(d))
            .sort((a, b) => b.getTime() - a.getTime());

          const lastCompletedAt = uniqueDates[0];

          let streak = 1;
          for (let i = 1; i < uniqueDates.length; i += 1) {
            const prev = new Date(uniqueDates[i - 1]);
            prev.setDate(prev.getDate() - 1);
            if (uniqueDates[i].toDateString() === prev.toDateString()) {
              streak += 1;
            } else {
              break;
            }
          }

          let longestStreak = 1;
          let current = 1;
          for (let i = 1; i < uniqueDates.length; i += 1) {
            const prev = new Date(uniqueDates[i - 1]);
            prev.setDate(prev.getDate() - 1);
            if (uniqueDates[i].toDateString() === prev.toDateString()) {
              current += 1;
            } else {
              current = 1;
            }
            longestStreak = Math.max(longestStreak, current);
          }

          return { streak, longestStreak, lastCompletedAt };
        };

        const uncompleteHabitAndDescendants = (habit: Habit): { habit: Habit; removedScore: number } => {
          const removedCompletions = habit.completions.filter(
            (c) => new Date(c.completionDate).toDateString() === targetDate
          );
          const remainingCompletions = habit.completions.filter(
            (c) => new Date(c.completionDate).toDateString() !== targetDate
          );
          const removedScore = removedCompletions.reduce(
            (sum, c) => sum + (c.scoreEarned ?? habit.plannedPoints),
            0
          );

          const streakData = computeStreakData(remainingCompletions);

          const shouldUncompleteDescendants =
            habit.childHabits.length > 0 && areAllDescendantsCompletedOnTargetDate(habit);

          let totalRemoved = removedScore;
          const updatedChildren = shouldUncompleteDescendants
            ? habit.childHabits.map((child) => {
                const result = uncompleteHabitAndDescendants(child);
                totalRemoved += result.removedScore;
                return result.habit;
              })
            : habit.childHabits;

          return {
            habit: {
              ...habit,
              completions: remainingCompletions,
              lastCompletedAt: streakData.lastCompletedAt,
              streak: streakData.streak,
              longestStreak: Math.max(streakData.longestStreak, habit.longestStreak || 0),
              updatedAt: new Date(),
              childHabits: updatedChildren,
            },
            removedScore: totalRemoved,
          };
        };

        const uncompleteRecursively = (habits: Habit[]): { habits: Habit[]; removedScore: number; found: boolean } => {
          let removedScore = 0;
          let found = false;

          const updatedHabits = habits.map((habit) => {
            if (habit.id === habitId) {
              const result = uncompleteHabitAndDescendants(habit);
              removedScore += result.removedScore;
              found = true;
              return result.habit;
            }

            if (habit.childHabits.length > 0) {
              const result = uncompleteRecursively(habit.childHabits);
              if (result.found) {
                const parentRemovedCompletions = habit.completions.filter(
                  (c) => new Date(c.completionDate).toDateString() === targetDate
                );
                const parentRemainingCompletions = habit.completions.filter(
                  (c) => new Date(c.completionDate).toDateString() !== targetDate
                );
                const parentRemovedScore = parentRemovedCompletions.reduce(
                  (sum, c) => sum + (c.scoreEarned ?? habit.plannedPoints),
                  0
                );
                const parentStreakData = computeStreakData(parentRemainingCompletions);

                removedScore += result.removedScore + parentRemovedScore;
                found = true;
                return {
                  ...habit,
                  completions: parentRemainingCompletions,
                  lastCompletedAt: parentStreakData.lastCompletedAt,
                  streak: parentStreakData.streak,
                  longestStreak: Math.max(parentStreakData.longestStreak, habit.longestStreak || 0),
                  updatedAt: new Date(),
                  childHabits: result.habits,
                };
              }
            }

            return habit;
          });

          return { habits: updatedHabits, removedScore, found };
        };

        set((current) => {
          const result = uncompleteRecursively(current.habits);
          if (!result.found) {
            return current;
          }

          didUncomplete = true;

          return {
            ...current,
            habits: result.habits,
          };
        });

        // Se o item da sequencia foi desmarcado no mesmo dia da conclusao da sequencia,
        // remove a trava diaria para manter a simetria com o complete.
        if (didUncomplete) {
          const latest = get();
          const membership = latest.sequenceMemberships.find((item) => item.habitId === habitId);

          if (membership) {
            const sequence = latest.cycleSequences.find((item) => item.id === membership.sequenceId);

            if (sequence?.lastCompletedDate && isSameDay(sequence.lastCompletedDate, completionDate)) {
              const members = latest.sequenceMemberships
                .filter((item) => item.sequenceId === sequence.id)
                .sort((a, b) => a.position - b.position);

              const effectivePosition = getSequencePositionForDate(sequence, members.length, completionDate);

              if (membership.position === effectivePosition) {
                set((current) => ({
                  cycleSequences: current.cycleSequences.map((item) =>
                    item.id === sequence.id
                      ? {
                          ...item,
                          lastCompletedDate: null,
                          updatedAt: new Date(),
                        }
                      : item
                  ),
                }));
              }
            }
          }
        }

        get().recomputeUserProgress();
      },

      toggleHabitChildExpansion: (habitId) => {
        const toggleRecursively = (habits: Habit[]): Habit[] => {
          return habits.map((habit) => {
            if (habit.id === habitId) {
              return { ...habit, isExpanded: !habit.isExpanded };
            }
            if (habit.childHabits.length > 0) {
              return {
                ...habit,
                childHabits: toggleRecursively(habit.childHabits),
              };
            }
            return habit;
          });
        };

        set((current) => ({
          habits: toggleRecursively(current.habits),
        }));
      },

      moveHabitChildUp: (habitId) => {
        const reorderRecursively = (habits: Habit[]): Habit[] => {
          const index = habits.findIndex((habit) => habit.id === habitId);
          if (index === -1) {
            return habits.map((habit) => ({
              ...habit,
              childHabits: reorderRecursively(habit.childHabits),
            }));
          }

          const sorted = [...habits].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
          const sortedIndex = sorted.findIndex((habit) => habit.id === habitId);
          if (sortedIndex <= 0) return habits;

          const current = sorted[sortedIndex];
          const previous = sorted[sortedIndex - 1];
          const currentOrder = current.sortOrder ?? sortedIndex + 1;
          const previousOrder = previous.sortOrder ?? sortedIndex;

          return sorted.map((habit) => {
            if (habit.id === current.id) return { ...habit, sortOrder: previousOrder };
            if (habit.id === previous.id) return { ...habit, sortOrder: currentOrder };
            return habit;
          });
        };

        set((current) => ({
          habits: reorderRecursively(current.habits),
        }));
      },

      moveHabitChildDown: (habitId) => {
        const reorderRecursively = (habits: Habit[]): Habit[] => {
          const index = habits.findIndex((habit) => habit.id === habitId);
          if (index === -1) {
            return habits.map((habit) => ({
              ...habit,
              childHabits: reorderRecursively(habit.childHabits),
            }));
          }

          const sorted = [...habits].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
          const sortedIndex = sorted.findIndex((habit) => habit.id === habitId);
          if (sortedIndex === -1 || sortedIndex >= sorted.length - 1) return habits;

          const current = sorted[sortedIndex];
          const next = sorted[sortedIndex + 1];
          const currentOrder = current.sortOrder ?? sortedIndex + 1;
          const nextOrder = next.sortOrder ?? sortedIndex + 2;

          return sorted.map((habit) => {
            if (habit.id === current.id) return { ...habit, sortOrder: nextOrder };
            if (habit.id === next.id) return { ...habit, sortOrder: currentOrder };
            return habit;
          });
        };

        set((current) => ({
          habits: reorderRecursively(current.habits),
        }));
      },

      reorderHabitChildren: (parentHabitId, orderedChildHabitIds) => {
        const normalizeSort = (items: Habit[]): Habit[] => {
          return items.map((item, index) => ({ ...item, sortOrder: index + 1 }));
        };

        const reorderChildren = (items: Habit[]): Habit[] => {
          return items.map((habit) => {
            if (habit.id === parentHabitId) {
              const byId = new Map(habit.childHabits.map((child) => [child.id, child]));
              const seen = new Set<string>();

              const ordered = orderedChildHabitIds
                .map((id) => {
                  const child = byId.get(id);
                  if (!child) return null;
                  seen.add(id);
                  return child;
                })
                .filter((child): child is Habit => child !== null);

              habit.childHabits.forEach((child) => {
                if (!seen.has(child.id)) ordered.push(child);
              });

              return {
                ...habit,
                childHabits: normalizeSort(ordered),
                updatedAt: new Date(),
              };
            }

            if (habit.childHabits.length === 0) return habit;
            return {
              ...habit,
              childHabits: reorderChildren(habit.childHabits),
            };
          });
        };

        set((current) => ({
          habits: reorderChildren(current.habits),
        }));
      },

      promoteHabitChildLevel: (habitId) => {
        const normalizeSort = (items: Habit[]): Habit[] => {
          return items.map((item, index) => ({ ...item, sortOrder: index + 1 }));
        };

        const findParentInfo = (
          items: Habit[],
          targetId: string,
          parentId: string | null = null,
          grandParentId: string | null = null
        ): { parentId: string | null; grandParentId: string | null } | null => {
          for (const item of items) {
            if (item.id === targetId) {
              return { parentId, grandParentId };
            }

            if (item.childHabits.length > 0) {
              const found = findParentInfo(item.childHabits, targetId, item.id, parentId);
              if (found) return found;
            }
          }

          return null;
        };

        const extractFromParent = (
          items: Habit[],
          parentId: string,
          targetId: string
        ): { nextItems: Habit[]; extracted: Habit | null } => {
          let extracted: Habit | null = null;

          const walk = (nodes: Habit[]): Habit[] => {
            return nodes.map((node) => {
              if (node.id === parentId) {
                const remaining = node.childHabits.filter((child) => {
                  if (child.id === targetId) {
                    extracted = child;
                    return false;
                  }
                  return true;
                });

                return {
                  ...node,
                  childHabits: normalizeSort(remaining),
                  updatedAt: new Date(),
                };
              }

              if (node.childHabits.length === 0) return node;
              return {
                ...node,
                childHabits: walk(node.childHabits),
              };
            });
          };

          return { nextItems: walk(items), extracted };
        };

        const insertAfterInSiblings = (
          siblings: Habit[],
          anchorId: string,
          moving: Habit,
          newParentId: string | null
        ): Habit[] => {
          const normalizedSiblings = [...siblings].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
          const anchorIndex = normalizedSiblings.findIndex((item) => item.id === anchorId);
          if (anchorIndex < 0) return normalizeSort(normalizedSiblings);

          const movedItem: Habit = {
            ...moving,
            parentId: newParentId,
            updatedAt: new Date(),
          };

          const next = [...normalizedSiblings];
          next.splice(anchorIndex + 1, 0, movedItem);
          return normalizeSort(next);
        };

        set((current) => {
          const parentInfo = findParentInfo(current.habits, habitId);
          if (!parentInfo?.parentId) return current;

          const sourceParentId = parentInfo.parentId;
          const destinationParentId = parentInfo.grandParentId;

          const extractedResult = extractFromParent(current.habits, sourceParentId, habitId);
          const movingHabit = extractedResult.extracted;
          if (!movingHabit) return current;

          if (!destinationParentId) {
            const updatedRoot = insertAfterInSiblings(
              extractedResult.nextItems,
              sourceParentId,
              movingHabit,
              null
            );

            return { habits: updatedRoot };
          }

          const insertIntoGrandParent = (items: Habit[]): Habit[] => {
            return items.map((item) => {
              if (item.id === destinationParentId) {
                return {
                  ...item,
                  childHabits: insertAfterInSiblings(
                    item.childHabits,
                    sourceParentId,
                    movingHabit,
                    destinationParentId
                  ),
                  updatedAt: new Date(),
                };
              }

              if (item.childHabits.length === 0) return item;
              return {
                ...item,
                childHabits: insertIntoGrandParent(item.childHabits),
              };
            });
          };

          return {
            habits: insertIntoGrandParent(extractedResult.nextItems),
          };
        });
      },

      calculateHabitAggregation: (habitId) => {
        type HabitAggregation = {
          totalPoints: number;
          totalTime: number;
          areaTotals: Record<string, number>;
        };

        const aggregateHabits = (habits: Habit[]): HabitAggregation => {
          return habits.reduce(
            (acc: HabitAggregation, habit: Habit): HabitAggregation => {
              const childAgg = habit.childHabits.length > 0 ? aggregateHabits(habit.childHabits) : null;
              const value = childAgg ? childAgg.totalPoints : habit.plannedPoints;
              const time = childAgg ? childAgg.totalTime : habit.plannedTimeMinutes;

              const areaTotals = { ...acc.areaTotals };
              if (childAgg) {
                Object.entries(childAgg.areaTotals).forEach(([areaId, areaValue]: [string, number]) => {
                  areaTotals[areaId] = (areaTotals[areaId] || 0) + areaValue;
                });
              } else if (habit.areaId) {
                areaTotals[habit.areaId] = (areaTotals[habit.areaId] || 0) + value;
              }

              return {
                totalPoints: acc.totalPoints + value,
                totalTime: acc.totalTime + time,
                areaTotals,
              };
            },
            { totalPoints: 0, totalTime: 0, areaTotals: {} }
          );
        };

        set((current) => ({
          habits: current.habits.map((habit) => {
            const updateRecursively = (h: Habit): Habit => {
              if (h.id !== habitId && h.childHabits.length > 0) {
                return { ...h, childHabits: h.childHabits.map(updateRecursively) };
              }
              if (h.id !== habitId) return h;

              const aggregated = aggregateHabits(h.childHabits);
              const hasChildren = h.childHabits.length > 0;
              const topAreaEntry = (Object.entries(aggregated.areaTotals) as Array<[string, number]>)
                .sort((a, b) => b[1] - a[1])[0];
              const topAreaId = topAreaEntry ? topAreaEntry[0] : null;

              return {
                ...h,
                 plannedPoints: hasChildren 
                   ? (aggregated.totalPoints || 0) 
                   : (h.semanticValueBackup?.plannedPoints ?? h.plannedPoints),
                plannedTimeMinutes: hasChildren ? (aggregated.totalTime || 0) : h.plannedTimeMinutes,
                areaId: hasChildren && topAreaId ? topAreaId : h.areaId,
                isAggregator: hasChildren,
              };
            };

            return updateRecursively(habit);
          }),
        }));
      },
      
      getHabitsForDate: (date) => {
        const { habits, cycleSequences, sequenceMemberships } = get();

        const standalone = habits.filter((habit) => {
          if (habit.controlledBySequenceId) return false;
          return habitMatchesDate(habit, date);
        });

        const sequenceHabits: Habit[] = [];
        cycleSequences
          .filter((sequence) => sequence.isActive)
          .forEach((sequence) => {
            if (!sequenceMatchesDate(sequence, date)) return;

            const members = sequenceMemberships
              .filter((membership) => membership.sequenceId === sequence.id)
              .sort((a, b) => a.position - b.position);

            if (members.length === 0) return;

            const displayPosition = getSequencePositionForDate(sequence, members.length, date);
            const currentMember = members[displayPosition];
            const currentHabit = findHabitByIdDeep(habits, currentMember.habitId);
            if (!currentHabit) return;
            if (!habitHasStartedByDate(currentHabit, date)) return;

            sequenceHabits.push(currentHabit);
          });

        return [...standalone, ...sequenceHabits];
      },

      // ========== SEQUENCIAS DE CICLOS ==========
      cycleSequences: [],
      sequenceMemberships: [],
      commitments: [],

      addCommitment: (input) => {
        const now = new Date();
        const commitment: Commitment = {
          id: `commitment-${Date.now()}`,
          title: input.title.trim() || 'Novo compromisso',
          date: new Date(input.date),
          recurrence: input.recurrence ?? 'ONCE',
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({ commitments: [...state.commitments, commitment] }));
        return commitment;
      },

      updateCommitment: (commitmentId, updates) => {
        set((state) => ({
          commitments: state.commitments.map((commitment) => commitment.id === commitmentId
            ? { ...commitment, ...updates, updatedAt: new Date() }
            : commitment),
        }));
      },

      deleteCommitment: (commitmentId) => {
        set((state) => ({ commitments: state.commitments.filter((commitment) => commitment.id !== commitmentId) }));
      },

      createCycleSequence: (input) => {
        const now = input.startDate ? new Date(input.startDate) : new Date();
        const state = get();
        const maxHabitOrder = state.habits.reduce((max, h) => Math.max(max, h.sortOrder || 0), 0);
        const maxSequenceOrder = state.cycleSequences.reduce((max, sequence) => Math.max(max, sequence.displayOrder || 0), 0);
        const newSequence: CycleSequence = {
          id: `sequence-${Date.now()}`,
          name: input.name.trim() || 'Nova Sequencia',
          displayOrder: Math.max(maxHabitOrder, maxSequenceOrder) + 1,
          recurrenceType: input.recurrenceType ?? 'DAILY',
          recurrenceConfig: input.recurrenceConfig ?? {},
          currentPosition: 0,
          lastCompletedDate: null,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({
          cycleSequences: [...state.cycleSequences, newSequence],
        }));

        return newSequence;
      },

      updateCycleSequence: (sequenceId, updates) => {
        set((state) => ({
          cycleSequences: state.cycleSequences.map((sequence) =>
            sequence.id === sequenceId
              ? { ...sequence, ...updates, updatedAt: new Date() }
              : sequence
          ),
        }));
      },

      deleteCycleSequence: (sequenceId) => {
        set((state) => {
          const releasedHabitIds = new Set(
            state.sequenceMemberships
              .filter((membership) => membership.sequenceId === sequenceId)
              .map((membership) => membership.habitId)
          );

          const releaseHabitOwnership = (items: Habit[]): Habit[] => {
            return items.map((habit) => {
              const shouldRelease = releasedHabitIds.has(habit.id);
              const updatedChildren = habit.childHabits.length > 0
                ? releaseHabitOwnership(habit.childHabits)
                : habit.childHabits;

              return shouldRelease || updatedChildren !== habit.childHabits
                ? {
                    ...habit,
                    controlledBySequenceId: shouldRelease ? null : habit.controlledBySequenceId ?? null,
                    updatedAt: shouldRelease ? new Date() : habit.updatedAt,
                    childHabits: updatedChildren,
                  }
                : habit;
            });
          };

          return {
            cycleSequences: state.cycleSequences.filter((sequence) => sequence.id !== sequenceId),
            sequenceMemberships: state.sequenceMemberships.filter((membership) => membership.sequenceId !== sequenceId),
            habits: releaseHabitOwnership(state.habits),
          };
        });
      },

      reorderCycleSequences: (orderedSequenceIds) => {
        set((state) => {
          if (orderedSequenceIds.length === 0) return state;

          const byId = new Map(state.cycleSequences.map((sequence) => [sequence.id, sequence]));
          const seen = new Set<string>();

          const ordered = orderedSequenceIds
            .map((id) => {
              const sequence = byId.get(id);
              if (!sequence) return null;
              seen.add(id);
              return sequence;
            })
            .filter((sequence): sequence is CycleSequence => sequence !== null);

          // Mantem qualquer sequencia nao incluida no array ao final para resiliencia.
          state.cycleSequences.forEach((sequence) => {
            if (!seen.has(sequence.id)) ordered.push(sequence);
          });

          return {
            cycleSequences: ordered.map((sequence, index) => ({
              ...sequence,
              displayOrder: index + 1,
              updatedAt: new Date(),
            })),
          };
        });
      },

      toggleCycleSequenceActive: (sequenceId) => {
        set((state) => ({
          cycleSequences: state.cycleSequences.map((sequence) =>
            sequence.id === sequenceId
              ? {
                  ...sequence,
                  isActive: !sequence.isActive,
                  updatedAt: new Date(),
                }
              : sequence
          ),
        }));
      },

      moveHabitInSequence: (sequenceId, habitId, direction) => {
        set((state) => {
          const members = state.sequenceMemberships
            .filter((membership) => membership.sequenceId === sequenceId)
            .sort((a, b) => a.position - b.position);

          const index = members.findIndex((membership) => membership.habitId === habitId);
          if (index === -1) return state;

          const targetIndex = direction === 'up' ? index - 1 : index + 1;
          if (targetIndex < 0 || targetIndex >= members.length) return state;

          const reordered = [...members];
          const [moved] = reordered.splice(index, 1);
          reordered.splice(targetIndex, 0, moved);

          const updatedById = new Map<string, SequenceMembership>();
          reordered.forEach((membership, nextPosition) => {
            updatedById.set(membership.id, {
              ...membership,
              position: nextPosition,
            });
          });

          const nextMemberships = state.sequenceMemberships.map((membership) =>
            updatedById.get(membership.id) ?? membership
          );

          const nextSequences = state.cycleSequences.map((sequence) => {
            if (sequence.id !== sequenceId) return sequence;
            return {
              ...sequence,
              currentPosition: Math.min(sequence.currentPosition, reordered.length - 1),
              updatedAt: new Date(),
            };
          });

          return {
            sequenceMemberships: nextMemberships,
            cycleSequences: nextSequences,
          };
        });
      },

      reorderHabitsInSequence: (sequenceId, orderedHabitIds) => {
        set((state) => {
          const members = state.sequenceMemberships
            .filter((membership) => membership.sequenceId === sequenceId)
            .sort((a, b) => a.position - b.position);

          if (members.length <= 1) return state;

          const orderedSet = new Set(orderedHabitIds);
          const allPresent = members.every((member) => orderedSet.has(member.habitId));
          if (!allPresent || orderedHabitIds.length !== members.length) return state;

          const byHabitId = new Map<string, SequenceMembership>();
          members.forEach((member) => byHabitId.set(member.habitId, member));

          const sequence = state.cycleSequences.find((item) => item.id === sequenceId);
          if (!sequence) return state;

          const currentMember = members[sequence.currentPosition % members.length];
          const currentHabitId = currentMember?.habitId;

          const updatedMembershipsForSequence = orderedHabitIds.map((habitId, index) => {
            const existing = byHabitId.get(habitId);
            if (!existing) return null;
            return {
              ...existing,
              position: index,
            };
          }).filter((item): item is SequenceMembership => item !== null);

          const updatedById = new Map(updatedMembershipsForSequence.map((m) => [m.id, m]));
          const nextMemberships = state.sequenceMemberships.map((membership) =>
            updatedById.get(membership.id) ?? membership
          );

          const newCurrentPosition = currentHabitId
            ? Math.max(0, orderedHabitIds.findIndex((id) => id === currentHabitId))
            : 0;

          const nextSequences = state.cycleSequences.map((item) =>
            item.id === sequenceId
              ? {
                  ...item,
                  currentPosition: newCurrentPosition,
                  updatedAt: new Date(),
                }
              : item
          );

          return {
            sequenceMemberships: nextMemberships,
            cycleSequences: nextSequences,
          };
        });
      },

      resetCycleSequenceToStart: (sequenceId) => {
        set((state) => ({
          cycleSequences: state.cycleSequences.map((sequence) =>
            sequence.id === sequenceId
              ? {
                  ...sequence,
                  currentPosition: 0,
                  lastCompletedDate: null,
                  updatedAt: new Date(),
                }
              : sequence
          ),
        }));
      },

      addHabitToSequence: (sequenceId, habitId) => {
        const state = get();
        const sequence = state.cycleSequences.find((item) => item.id === sequenceId);
        if (!sequence) throw new Error('Sequencia nao encontrada');

        const existingMembership = state.sequenceMemberships.find((membership) => membership.habitId === habitId);
        if (existingMembership) {
          if (existingMembership.sequenceId === sequenceId) return;
          throw new Error('Este ciclo ja pertence a outra sequencia');
        }

        const habit = findHabitByIdDeep(state.habits, habitId);
        if (!habit) throw new Error('Ciclo nao encontrado');

        const nextPosition = state.sequenceMemberships
          .filter((membership) => membership.sequenceId === sequenceId)
          .length;

        const membership: SequenceMembership = {
          id: `sequence-membership-${Date.now()}`,
          sequenceId,
          habitId,
          position: nextPosition,
          addedAt: new Date(),
        };

        set((current) => ({
          sequenceMemberships: [...current.sequenceMemberships, membership],
          habits: updateHabitByIdDeep(current.habits, habitId, (item) => ({
            ...item,
            controlledBySequenceId: sequenceId,
            updatedAt: new Date(),
          })),
        }));
      },

      removeHabitFromSequence: (sequenceId, habitId) => {
        set((state) => {
          const target = state.sequenceMemberships.find(
            (membership) => membership.sequenceId === sequenceId && membership.habitId === habitId
          );
          if (!target) return state;

          const nextMemberships = state.sequenceMemberships
            .filter((membership) => membership.id !== target.id)
            .map((membership) => ({ ...membership }));

          const remainingForSequence = nextMemberships
            .filter((membership) => membership.sequenceId === sequenceId)
            .sort((a, b) => a.position - b.position);

          remainingForSequence.forEach((membership, index) => {
            membership.position = index;
          });

          const nextSequences = state.cycleSequences.map((sequence) => {
            if (sequence.id !== sequenceId) return sequence;

            if (remainingForSequence.length === 0) {
              return {
                ...sequence,
                currentPosition: 0,
                updatedAt: new Date(),
              };
            }

            const maxPosition = remainingForSequence.length - 1;
            return {
              ...sequence,
              currentPosition: Math.min(sequence.currentPosition, maxPosition),
              updatedAt: new Date(),
            };
          });

          return {
            sequenceMemberships: nextMemberships,
            cycleSequences: nextSequences,
            habits: updateHabitByIdDeep(state.habits, habitId, (habit) => ({
              ...habit,
              controlledBySequenceId: null,
              updatedAt: new Date(),
            })),
          };
        });
      },
      
      // ========== PROJETOS ==========
      projects: [],
      
      addProject: (projectData) => {
        const newProject: Project = {
          id: `project-${Date.now()}`,
          title: projectData.title || 'Nova Grande Obra',
          description: projectData.description || '',
          type: 'PROJECT',
          lifecycleType: 'PROJECT',
          areaId: projectData.areaId || AREAS[0].id,
          elementId: projectData.elementId || 'terra',
          status: projectData.status || 'active',
          progress: 0,
          missions: [],
          quests: [],
          tasks: [],
          habits: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          parentId: null,
          children: [],
          isAggregator: true,
          aggregatedScore: 0,
          isCompleted: false,
          dueDate: projectData.dueDate || null,
          reward: projectData.reward,
          xpBonus: projectData.xpBonus || 0,
        };
        set((state) => ({
          projects: [newProject, ...state.projects],
        }));
        return newProject;
      },
      
      updateProject: (projectId, updates) => {
        set((state) => ({
          projects: state.projects.map((project) =>
            project.id === projectId ? { ...project, ...updates, updatedAt: new Date() } : project
          ),
        }));
      },
      
      deleteProject: (projectId) => {
        set((state) => ({
          projects: state.projects.filter((project) => project.id !== projectId),
        }));
      },
      
      addMissionToProject: (projectId, missionData) => {
        const newMission: Mission = {
          id: `mission-${Date.now()}`,
          projectId,
          title: missionData.title || 'Nova Campanha',
          description: missionData.description || '',
          type: 'MISSION',
          lifecycleType: 'MISSION',
          elementId: missionData.elementId || 'terra',
          areaId: missionData.areaId || AREAS[0].id,
          status: missionData.status || 'active',
          progress: 0,
          tasks: [],
          habits: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          parentId: projectId,
          children: [],
          isAggregator: true,
          aggregatedScore: 0,
          isCompleted: false,
          dueDate: missionData.dueDate || null,
        };
        
        set((state) => ({
          projects: state.projects.map((project) =>
            project.id === projectId
              ? { ...project, missions: [...project.missions, newMission] }
              : project
          ),
        }));
      },
      
      updateProjectProgress: (projectId) => {
        set((state) => {
          const project = state.projects.find((p) => p.id === projectId);
          if (!project) return state;
          
          const totalItems = project.missions.length + project.quests.length + 
                            project.tasks.length + project.habits.length;
          
          if (totalItems === 0) return state;
          
          const completedItems = 
            project.missions.filter((m) => m.isCompleted).length +
            project.quests.filter((q) => q.isCompleted).length +
            project.tasks.filter((t) => t.isCompleted).length +
            project.habits.filter((h) => h.isCompleted).length;
          
          const progress = Math.round((completedItems / totalItems) * 100);
          
          return {
            projects: state.projects.map((p) =>
              p.id === projectId ? { ...p, progress } : p
            ),
          };
        });
      },
      
      // ========== MISSÕES ==========
      addTaskToMission: (projectId, missionId, taskData) => {
        const newTask = get().addTask({
          ...taskData,
          parentId: missionId,
        });
        
        set((state) => ({
          projects: state.projects.map((project) =>
            project.id === projectId
              ? {
                  ...project,
                  missions: project.missions.map((mission) =>
                    mission.id === missionId
                      ? { ...mission, tasks: [...mission.tasks, newTask] }
                      : mission
                  ),
                }
              : project
          ),
        }));
      },
      
      addHabitToMission: (projectId, missionId, habitData) => {
        const newHabit = get().addHabit({
          ...habitData,
          parentId: missionId,
        });
        
        set((state) => ({
          projects: state.projects.map((project) =>
            project.id === projectId
              ? {
                  ...project,
                  missions: project.missions.map((mission) =>
                    mission.id === missionId
                      ? { ...mission, habits: [...mission.habits, newHabit] }
                      : mission
                  ),
                }
              : project
          ),
        }));
      },
      
      // ========== QUESTS ==========
      quests: [],
      
      addQuest: (questData) => {
        const newQuest: Quest = {
          id: `quest-${Date.now()}`,
          title: questData.title || 'Nova Jornada',
          description: questData.description || '',
          type: 'QUEST',
          lifecycleType: 'QUEST',
          areaId: questData.areaId || AREAS[0].id,
          elementId: questData.elementId || 'terra',
          status: questData.status || 'active',
          progress: 0,
          tasks: [],
          habits: [],
          itemOrder: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          parentId: null,
          children: [],
          isAggregator: true,
          aggregatedScore: 0,
          isCompleted: false,
          dueDate: questData.dueDate || null,
          reward: questData.reward,
          xpBonus: questData.xpBonus || 0,
        };
        set((state) => ({
          quests: [newQuest, ...state.quests],
        }));
        return newQuest;
      },
      
      updateQuest: (questId, updates) => {
        set((state) => ({
          quests: state.quests.map((quest) =>
            quest.id === questId ? { ...quest, ...updates, updatedAt: new Date() } : quest
          ),
        }));
      },
      
      deleteQuest: (questId) => {
        set((state) => ({
          quests: state.quests.filter((quest) => quest.id !== questId),
        }));
      },
      
      addTaskToQuest: (questId, taskData) => {
        const newTask = get().addTask({
          ...taskData,
          parentId: questId,
        });
        
        set((state) => ({
          quests: state.quests.map((quest) =>
            quest.id === questId
              ? { 
                  ...quest, 
                  tasks: [...quest.tasks, newTask],
                  itemOrder: [...quest.itemOrder, newTask.id],
                }
              : quest
          ),
        }));
      },
      
      addHabitToQuest: (questId, habitData) => {
        const newHabit = get().addHabit({
          ...habitData,
          parentId: questId,
        });
        
        set((state) => ({
          quests: state.quests.map((quest) =>
            quest.id === questId
              ? { 
                  ...quest, 
                  habits: [...quest.habits, newHabit],
                  itemOrder: [...quest.itemOrder, newHabit.id],
                }
              : quest
          ),
        }));
      },
      
      updateQuestProgress: (questId) => {
        set((state) => {
          const quest = state.quests.find((q) => q.id === questId);
          if (!quest) return state;
          
          const totalItems = quest.tasks.length + quest.habits.length;
          if (totalItems === 0) return state;
          
          const completedItems = 
            quest.tasks.filter((t) => t.isCompleted).length +
            quest.habits.filter((h) => h.isCompleted).length;
          
          const progress = Math.round((completedItems / totalItems) * 100);
          
          return {
            quests: state.quests.map((q) =>
              q.id === questId ? { ...q, progress } : q
            ),
          };
        });
      },
      
      // ========== RAScUNHOS ==========
      drafts: [],
      
      addDraft: (title, notes) => {
        const newDraft: Draft = {
          id: `draft-${Date.now()}`,
          title,
          notes,
          createdAt: new Date(),
        };
        set((state) => ({
          drafts: [newDraft, ...state.drafts],
        }));
        return newDraft;
      },
      
      updateDraft: (draftId, updates) => {
        set((state) => ({
          drafts: state.drafts.map((draft) =>
            draft.id === draftId ? { ...draft, ...updates } : draft
          ),
        }));
      },
      
      deleteDraft: (draftId) => {
        set((state) => ({
          drafts: state.drafts.filter((draft) => draft.id !== draftId),
        }));
      },
      
      convertDraft: (draftId, type) => {
        const { drafts } = get();
        const draft = drafts.find((d) => d.id === draftId);
        if (!draft) return null;
        
        let newId: string | null = null;
        
        // Converter baseado no tipo
        switch (type) {
          case 'ACTION': {
            const task = get().addTask({
              title: draft.title,
              description: draft.notes || '',
              lifecycleType: 'ACTION',
              baseValue: DEFAULT_SCORES.RITUAL.baseValue,
              effortLevel: DEFAULT_SCORES.RITUAL.effortLevel,
              plannedTimeMinutes: DEFAULT_SCORES.RITUAL.plannedTimeMinutes,
              areaPrimaryId: null, // Sem categoria = +1 ponto
              elementId: 'terra',
            });
            newId = task.id;
            break;
          }
          case 'HABIT': {
            const habit = get().addHabit({
              name: draft.title,
              description: draft.notes || '',
              areaId: 'sem-categoria',
              elementId: 'terra',
              plannedTimeMinutes: DEFAULT_SCORES.CICLO.plannedTimeMinutes,
              plannedPoints: DEFAULT_SCORES.CICLO.plannedPoints,
              recurrenceType: 'DAILY',
            });
            newId = habit.id;
            break;
          }
          case 'QUEST': {
            const quest = get().addQuest({
              title: draft.title,
              description: draft.notes || '',
              areaId: AREAS[0].id,
              elementId: 'terra',
              status: 'active',
            });
            newId = quest.id;
            break;
          }
          case 'PROJECT': {
            const project = get().addProject({
              title: draft.title,
              description: draft.notes || '',
              areaId: AREAS[0].id,
              elementId: 'terra',
              status: 'active',
            });
            newId = project.id;
            break;
          }
        }
        
        // Remover rascunho
        set((state) => ({
          drafts: state.drafts.filter((d) => d.id !== draftId),
        }));
        
        return newId;
      },
      
      // ========== TIMER ==========
      timer: initialTimer,
      
      startTimer: (entityId, entityType) => {
        set(() => ({
          timer: {
            entityId,
            entityType,
            isRunning: true,
            elapsedSeconds: 0,
            startedAt: new Date(),
          },
        }));
        
        // Marcar como em progresso
        if (entityType === 'TASK') {
          set((state) => ({
            tasks: state.tasks.map((task) =>
              task.id === entityId 
                ? { ...task, isInProgress: true, lastStartedAt: new Date() } 
                : task
            ),
          }));
        } else if (entityType === 'HABIT') {
          set((state) => ({
            habits: state.habits.map((habit) =>
              habit.id === entityId 
                ? { ...habit, isInProgress: true } 
                : habit
            ),
          }));
        }
      },
      
      pauseTimer: () => {
        set((state) => ({
          timer: { ...state.timer, isRunning: false },
        }));
      },
      
      resumeTimer: () => {
        set((state) => ({
          timer: { ...state.timer, isRunning: true },
        }));
      },
      
      stopTimer: () => {
        const { timer } = get();
        const elapsedSeconds = timer.elapsedSeconds;
        
        set((state) => ({
          timer: initialTimer,
          tasks: state.tasks.map((task) =>
            task.id === timer.entityId && timer.entityType === 'TASK'
              ? { ...task, isInProgress: false, elapsedSeconds }
              : task
          ),
          habits: state.habits.map((habit) =>
            habit.id === timer.entityId && timer.entityType === 'HABIT'
              ? { ...habit, isInProgress: false, elapsedSeconds }
              : habit
          ),
        }));
        
        return elapsedSeconds;
      },
      
      tickTimer: () => {
        set((state) => ({
          timer: state.timer.isRunning
            ? { ...state.timer, elapsedSeconds: state.timer.elapsedSeconds + 1 }
            : state.timer,
        }));
      },
      
      // ========== PONTUAÇÕES ==========
      getElementScores: () => {
        const { tasks, habits, projects, quests } = get();
        const scores: Record<ElementId, { score: number; taskCount: number; habitCount: number }> = {
          terra: { score: 0, taskCount: 0, habitCount: 0 },
          fogo: { score: 0, taskCount: 0, habitCount: 0 },
          agua: { score: 0, taskCount: 0, habitCount: 0 },
          ar: { score: 0, taskCount: 0, habitCount: 0 },
        };
        
        // Somar pontos de tarefas completadas
        tasks.forEach((task) => {
          if (task.isCompleted) {
            const baseValue = task.baseValue || 1;
            const effortMultiplier = EFFORT_MULTIPLIERS[task.effortLevel || 1];
            const points = Math.round(baseValue * effortMultiplier);
            scores[task.elementId].score += points;
            scores[task.elementId].taskCount++;
          }
        });
        
        // Somar pontos de hábitos com a mesma regra do progresso do usuário:
        // apenas ciclos raiz concluídos geram pontuação, distribuída entre nós concluídos nessa data.
        habits.forEach((rootHabit) => {
          rootHabit.completions.forEach((completion) => {
            accumulateCompletedHabitContributionsForDate(
              rootHabit,
              completion.completionDate,
              (completedHabit, points) => {
                scores[completedHabit.elementId].score += points;
                scores[completedHabit.elementId].habitCount += 1;
              }
            );
          });
        });
        
        // Somar pontos de projetos
        projects.forEach((project) => {
          if (project.isCompleted) {
            scores[project.elementId].score += project.xpBonus;
          }
        });
        
        // Somar pontos de quests
        quests.forEach((quest) => {
          if (quest.isCompleted) {
            scores[quest.elementId].score += quest.xpBonus;
          }
        });
        
        const total = Object.values(scores).reduce((a, b) => a + b.score, 0);
        
        return (Object.keys(scores) as ElementId[]).map((elementId) => ({
          elementId,
          score: scores[elementId].score,
          percentage: total > 0 ? Math.round((scores[elementId].score / total) * 100) : 25,
          taskCount: scores[elementId].taskCount,
          habitCount: scores[elementId].habitCount,
        }));
      },
      
      getAreaScores: () => {
        const { tasks, habits } = get();
        const areaMap: Record<string, { score: number; taskCount: number; habitCount: number }> = {};
        
        tasks.forEach((task) => {
          if (task.isCompleted && task.areaPrimaryId) {
            if (!areaMap[task.areaPrimaryId]) {
              areaMap[task.areaPrimaryId] = { score: 0, taskCount: 0, habitCount: 0 };
            }
            const baseValue = task.baseValue || 1;
            const effortMultiplier = EFFORT_MULTIPLIERS[task.effortLevel || 1];
            areaMap[task.areaPrimaryId].score += Math.round(baseValue * effortMultiplier);
            areaMap[task.areaPrimaryId].taskCount++;
          }
        });
        
        habits.forEach((rootHabit) => {
          rootHabit.completions.forEach((completion) => {
            accumulateCompletedHabitContributionsForDate(
              rootHabit,
              completion.completionDate,
              (completedHabit, points) => {
                if (!completedHabit.areaId) return;

                if (!areaMap[completedHabit.areaId]) {
                  areaMap[completedHabit.areaId] = { score: 0, taskCount: 0, habitCount: 0 };
                }
                areaMap[completedHabit.areaId].score += points;
                areaMap[completedHabit.areaId].habitCount += 1;
              }
            );
          });
        });
        
        return Object.entries(areaMap).map(([areaId, data]) => ({
          areaId,
          score: data.score,
          taskCount: data.taskCount,
          habitCount: data.habitCount,
        }));
      },
      
      getTotalScore: () => {
        return get().user.totalScore;
      },
      
      // ========== ESTATÍSTICAS ==========
      getCompletedTasksToday: () => {
        const { tasks } = get();
        const today = new Date().toDateString();
        return tasks.filter(
          (task) => {
            const updatedAt = toValidDate(task.updatedAt);
            return task.isCompleted && updatedAt?.toDateString() === today;
          }
        ).length;
      },
      
      getCompletedTasksThisWeek: () => {
        const { tasks } = get();
        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return tasks.filter(
          (task) => {
            const updatedAt = toValidDate(task.updatedAt);
            return task.isCompleted && Boolean(updatedAt && updatedAt >= weekAgo);
          }
        ).length;
      },
      
      getCompletedHabitsToday: () => {
        const { habits } = get();
        const today = new Date().toDateString();
        return habits.filter(
          (habit) => toValidDate(habit.lastCompletedAt)?.toDateString() === today
        ).length;
      },
      
      getStreak: () => {
        return get().user.streak;
      },
      
      updateStreak: () => {
        set((state) => {
          const today = new Date().toDateString();
          const hasCompletedToday = state.habits.some(
            (h) => toValidDate(h.lastCompletedAt)?.toDateString() === today
          ) || state.tasks.some(
            (t) => {
              const updatedAt = toValidDate(t.updatedAt);
              return t.isCompleted && updatedAt?.toDateString() === today;
            }
          );
          
          if (hasCompletedToday) {
            return {
              user: {
                ...state.user,
                streak: state.user.streak + 1,
                longestStreak: Math.max(state.user.streak + 1, state.user.longestStreak),
              },
            };
          }
          
          return state;
        });
      },
      
      // ========== CRIAÇÃO RÁPIDA ==========
      quickCreate: (title, type) => {
        if (!title.trim()) return '';
        
        switch (type) {
          case 'ACTION': {
            const task = get().addTask({
              title: title.trim(),
              baseValue: DEFAULT_SCORES.RITUAL.baseValue,
              effortLevel: DEFAULT_SCORES.RITUAL.effortLevel,
              plannedTimeMinutes: DEFAULT_SCORES.RITUAL.plannedTimeMinutes,
              areaPrimaryId: null, // Sem categoria = +1 ponto
              elementId: 'terra',
            });
            return task.id;
          }
          case 'HABIT': {
            const habit = get().addHabit({
              name: title.trim(),
              plannedTimeMinutes: DEFAULT_SCORES.CICLO.plannedTimeMinutes,
              plannedPoints: DEFAULT_SCORES.CICLO.plannedPoints,
              recurrenceType: 'DAILY',
              areaId: 'sem-categoria',
              elementId: 'terra',
            });
            return habit.id;
          }
          case 'DRAFT': {
            const draft = get().addDraft(title.trim());
            return draft.id;
          }
          default:
            return '';
        }
      },
    }),
    {
      name: 'conselho-elemental-storage',
      onRehydrateStorage: () => (state) => {
        state?.recomputeUserProgress();
      },
      partialize: (state) => ({
        accounts: state.accounts,
        currentAccountId: state.currentAccountId,
        accountDataById: state.accountDataById,
        user: state.user,
        onboarding: state.onboarding,
        customAreas: state.customAreas,
        customSubareas: state.customSubareas,
        linkedSubareasByAreaId: state.linkedSubareasByAreaId,
        tasks: state.tasks,
        habits: state.habits,
        cycleSequences: state.cycleSequences,
        sequenceMemberships: state.sequenceMemberships,
        commitments: state.commitments,
        projects: state.projects,
        quests: state.quests,
        drafts: state.drafts,
      }),
    }
  )
);
