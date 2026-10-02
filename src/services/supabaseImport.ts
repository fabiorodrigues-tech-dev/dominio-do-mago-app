import { supabase, isSupabaseAuthEnabled } from '@/lib/supabase';

const LOCAL_STORE_KEY = 'conselho-elemental-storage';
const MIGRATION_MARKER_PREFIX = 'ce:supabase-imported:';
const MIGRATION_OWNER_KEY = 'ce:supabase-import-owner-user-id';
const isLocalImportEnabled =
  (import.meta.env.VITE_ENABLE_LOCAL_IMPORT as string | undefined) === 'true';

type AnyRecord = Record<string, unknown>;

interface PersistEnvelope {
  state?: AnyRecord;
}

interface ImportResult {
  imported: boolean;
  message: string;
  counts?: Record<string, number>;
}

const toIsoOrNull = (value: unknown): string | null => {
  if (!value) return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const parsePersistedState = (): AnyRecord | null => {
  const raw = localStorage.getItem(LOCAL_STORE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as PersistEnvelope | AnyRecord;
    if ('state' in (parsed as PersistEnvelope) && (parsed as PersistEnvelope).state) {
      return (parsed as PersistEnvelope).state as AnyRecord;
    }
    return parsed as AnyRecord;
  } catch {
    return null;
  }
};

const hasImportMarker = (userId: string): boolean => {
  return localStorage.getItem(`${MIGRATION_MARKER_PREFIX}${userId}`) === '1';
};

const getImportOwner = (): string | null => {
  return localStorage.getItem(MIGRATION_OWNER_KEY);
};

const setImportMarker = (userId: string): void => {
  localStorage.setItem(`${MIGRATION_MARKER_PREFIX}${userId}`, '1');
  localStorage.setItem(MIGRATION_OWNER_KEY, userId);
};

export const getLocalImportStatus = (userId: string): {
  doneForCurrentUser: boolean;
  ownerUserId: string | null;
  canImportForCurrentUser: boolean;
} => {
  const ownerUserId = getImportOwner();
  const doneForCurrentUser = hasImportMarker(userId);

  return {
    doneForCurrentUser,
    ownerUserId,
    canImportForCurrentUser: !ownerUserId || ownerUserId === userId,
  };
};

const chunk = <T,>(items: T[], size = 200): T[][] => {
  if (items.length === 0) return [];
  const out: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    out.push(items.slice(index, index + size));
  }
  return out;
};

const deleteUserRows = async (table: string, userId: string) => {
  if (!supabase) return;
  const { error } = await supabase.from(table).delete().eq('user_id', userId);
  if (error) throw new Error(`Falha ao limpar ${table}: ${error.message}`);
};

const insertInChunks = async (table: string, rows: AnyRecord[]) => {
  if (!supabase || rows.length === 0) return;

  const batches = chunk(rows);
  for (const batch of batches) {
    const { error } = await supabase.from(table).insert(batch);
    if (error) throw new Error(`Falha ao inserir ${table}: ${error.message}`);
  }
};

export const importLocalStateToSupabase = async (
  userId: string,
  options?: { force?: boolean }
): Promise<ImportResult> => {
  if (!isLocalImportEnabled) {
    return { imported: false, message: 'Importacao local desabilitada neste ambiente.' };
  }

  if (!isSupabaseAuthEnabled || !supabase) {
    return { imported: false, message: 'Supabase auth nao esta habilitado.' };
  }

  const ownerUserId = getImportOwner();
  if (ownerUserId && ownerUserId !== userId && !options?.force) {
    return {
      imported: false,
      message:
        'Dados locais deste navegador ja foram associados a outra conta. Para evitar mistura, a importacao foi bloqueada.',
    };
  }

  if (!options?.force && hasImportMarker(userId)) {
    return { imported: false, message: 'Importacao local ja realizada para este usuario.' };
  }

  const localState = parsePersistedState();
  if (!localState) {
    return { imported: false, message: 'Nenhum estado local encontrado para importar.' };
  }

  const user = (localState.user || {}) as AnyRecord;
  const customAreas = Array.isArray(localState.customAreas) ? (localState.customAreas as AnyRecord[]) : [];
  const tasks = Array.isArray(localState.tasks) ? (localState.tasks as AnyRecord[]) : [];
  const habits = Array.isArray(localState.habits) ? (localState.habits as AnyRecord[]) : [];
  const projects = Array.isArray(localState.projects) ? (localState.projects as AnyRecord[]) : [];
  const quests = Array.isArray(localState.quests) ? (localState.quests as AnyRecord[]) : [];
  const drafts = Array.isArray(localState.drafts) ? (localState.drafts as AnyRecord[]) : [];
  const cycleSequences = Array.isArray(localState.cycleSequences)
    ? (localState.cycleSequences as AnyRecord[])
    : [];
  const sequenceMemberships = Array.isArray(localState.sequenceMemberships)
    ? (localState.sequenceMemberships as AnyRecord[])
    : [];

  const customSubareasRecord =
    localState.customSubareas && typeof localState.customSubareas === 'object'
      ? (localState.customSubareas as Record<string, AnyRecord[]>)
      : {};

  const customSubareas = Object.entries(customSubareasRecord).flatMap(([areaId, entries]) => {
    if (!Array.isArray(entries)) return [];

    return entries.map((subarea) => ({
      user_id: userId,
      local_id: String(subarea.id || `${areaId}-${subarea.name || Date.now()}`),
      area_id: String(subarea.parentId || areaId),
      name: String(subarea.name || 'Subarea sem nome'),
      element_id: String(subarea.elementId || 'terra'),
      color: subarea.color ? String(subarea.color) : null,
      metadata: subarea,
    }));
  });

  const customAreaRows = customAreas.map((area) => ({
    user_id: userId,
    local_id: String(area.id || `area-${Date.now()}`),
    name: String(area.name || 'Area sem nome'),
    element_id: String(area.elementId || 'terra'),
    color: area.color ? String(area.color) : null,
    parent_id: area.parentId ? String(area.parentId) : null,
    metadata: area,
  }));

  const taskRows = tasks.map((task) => ({
    user_id: userId,
    local_id: String(task.id || `task-${Date.now()}`),
    title: String(task.title || 'Tarefa sem titulo'),
    status: String(task.status || (task.isCompleted ? 'completed' : 'active')),
    element_id: task.elementId ? String(task.elementId) : null,
    area_primary_id: task.areaPrimaryId ? String(task.areaPrimaryId) : null,
    due_date: toIsoOrNull(task.dueDate),
    payload: task,
  }));

  const habitRows = habits.map((habit) => ({
    user_id: userId,
    local_id: String(habit.id || `habit-${Date.now()}`),
    name: String(habit.name || 'Ciclo sem nome'),
    element_id: habit.elementId ? String(habit.elementId) : null,
    area_id: habit.areaId ? String(habit.areaId) : null,
    recurrence_type: habit.recurrenceType ? String(habit.recurrenceType) : null,
    payload: habit,
  }));

  const projectRows = projects.map((project) => ({
    user_id: userId,
    local_id: String(project.id || `project-${Date.now()}`),
    title: String(project.title || 'Projeto sem titulo'),
    status: String(project.status || 'active'),
    element_id: project.elementId ? String(project.elementId) : null,
    area_id: project.areaId ? String(project.areaId) : null,
    payload: project,
  }));

  const questRows = quests.map((quest) => ({
    user_id: userId,
    local_id: String(quest.id || `quest-${Date.now()}`),
    title: String(quest.title || 'Jornada sem titulo'),
    status: String(quest.status || 'active'),
    element_id: quest.elementId ? String(quest.elementId) : null,
    area_id: quest.areaId ? String(quest.areaId) : null,
    payload: quest,
  }));

  const draftRows = drafts.map((draft) => ({
    user_id: userId,
    local_id: String(draft.id || `draft-${Date.now()}`),
    title: String(draft.title || 'Rascunho sem titulo'),
    payload: draft,
  }));

  const cycleSequenceRows = cycleSequences.map((sequence) => ({
    user_id: userId,
    local_id: String(sequence.id || `sequence-${Date.now()}`),
    name: String(sequence.name || 'Sequencia sem nome'),
    is_active: Boolean(sequence.isActive ?? true),
    payload: sequence,
  }));

  const sequenceMembershipRows = sequenceMemberships.map((membership) => ({
    user_id: userId,
    local_id: String(membership.id || `membership-${Date.now()}`),
    sequence_id: membership.sequenceId ? String(membership.sequenceId) : null,
    habit_id: membership.habitId ? String(membership.habitId) : null,
    position: Number(membership.position ?? 0),
    payload: membership,
  }));

  const { error: profileError } = await supabase.from('profiles').upsert({
    id: userId,
    display_name: user.name ? String(user.name) : null,
    avatar: user.avatar ? String(user.avatar) : null,
  });

  if (profileError) {
    throw new Error(`Falha ao criar/atualizar perfil: ${profileError.message}`);
  }

  await deleteUserRows('custom_areas', userId);
  await deleteUserRows('custom_subareas', userId);
  await deleteUserRows('tasks', userId);
  await deleteUserRows('habits', userId);
  await deleteUserRows('projects', userId);
  await deleteUserRows('quests', userId);
  await deleteUserRows('drafts', userId);
  await deleteUserRows('cycle_sequences', userId);
  await deleteUserRows('sequence_memberships', userId);

  await insertInChunks('custom_areas', customAreaRows);
  await insertInChunks('custom_subareas', customSubareas);
  await insertInChunks('tasks', taskRows);
  await insertInChunks('habits', habitRows);
  await insertInChunks('projects', projectRows);
  await insertInChunks('quests', questRows);
  await insertInChunks('drafts', draftRows);
  await insertInChunks('cycle_sequences', cycleSequenceRows);
  await insertInChunks('sequence_memberships', sequenceMembershipRows);

  setImportMarker(userId);

  return {
    imported: true,
    message: 'Dados locais importados para Supabase com sucesso.',
    counts: {
      custom_areas: customAreaRows.length,
      custom_subareas: customSubareas.length,
      tasks: taskRows.length,
      habits: habitRows.length,
      projects: projectRows.length,
      quests: questRows.length,
      drafts: draftRows.length,
      cycle_sequences: cycleSequenceRows.length,
      sequence_memberships: sequenceMembershipRows.length,
    },
  };
};
