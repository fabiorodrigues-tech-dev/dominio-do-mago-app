import { supabase, isSupabaseAuthEnabled } from '@/lib/supabase';
import { useAppStore } from '@/stores/appStore';
import { AREAS } from '@/constants';

type AnyRecord = Record<string, unknown>;
let isSchemaReady: boolean | null = null;
const CLOUD_EMERGENCY_BACKUP_PREFIX = 'ce:cloud-emergency-backup:';

const saveEmergencyCloudBackup = (userId: string, snapshot: CloudSnapshot) => {
  try {
    if (typeof localStorage === 'undefined') return;
    const key = `${CLOUD_EMERGENCY_BACKUP_PREFIX}${userId}`;
    const payload = {
      savedAt: new Date().toISOString(),
      snapshot,
    };
    localStorage.setItem(key, JSON.stringify(payload));
  } catch {
    // Best-effort backup; ignore storage quota/privacy mode errors.
  }
};

const isMissingTableError = (error: { message?: string; details?: string } | null, table: string): boolean => {
  if (!error) return false;
  const text = `${error.message ?? ''} ${error.details ?? ''}`.toLowerCase();
  return (
    text.includes(table.toLowerCase()) &&
    (text.includes('not found') || text.includes('does not exist') || text.includes('relation'))
  );
};

const ensureSchemaReady = async (): Promise<boolean> => {
  if (!supabase) return false;
  if (isSchemaReady != null) return isSchemaReady;

  const { error } = await supabase.from('tasks').select('id').limit(1);

  if (error) {
    if (isMissingTableError(error, 'tasks')) {
      isSchemaReady = false;
      return false;
    }

    throw new Error(`Falha ao validar schema cloud: ${error.message}`);
  }

  isSchemaReady = true;
  return true;
};

type CloudSnapshot = {
  profile: { display_name: string | null; avatar: string | null } | null;
  linkedSubareasByAreaId: Record<string, string[]>;
  customAreas: AnyRecord[];
  customSubareasRecord: Record<string, AnyRecord[]>;
  tasks: AnyRecord[];
  habits: AnyRecord[];
  projects: AnyRecord[];
  quests: AnyRecord[];
  drafts: AnyRecord[];
  cycleSequences: AnyRecord[];
  sequenceMemberships: AnyRecord[];
};

const hasAnyCloudData = (snapshot: CloudSnapshot): boolean => {
  return (
    snapshot.customAreas.length > 0 ||
    Object.values(snapshot.customSubareasRecord).some((entries) => entries.length > 0) ||
    snapshot.tasks.length > 0 ||
    snapshot.habits.length > 0 ||
    snapshot.projects.length > 0 ||
    snapshot.quests.length > 0 ||
    snapshot.drafts.length > 0 ||
    snapshot.cycleSequences.length > 0 ||
    snapshot.sequenceMemberships.length > 0
  );
};

const dedupeById = (items: AnyRecord[]): AnyRecord[] => {
  const byId = new Map<string, AnyRecord>();

  items.forEach((item, index) => {
    const key = String(item.local_id ?? item.id ?? `row-${index}`);
    byId.set(key, item);
  });

  return Array.from(byId.values());
};

const dedupeCustomSubareasRecord = (record: Record<string, AnyRecord[]>): Record<string, AnyRecord[]> => {
  const entries = Object.entries(record).map(([areaId, items]) => [areaId, dedupeById(items)] as const);
  return Object.fromEntries(entries);
};

type SnapshotSource = {
  customAreas?: AnyRecord[];
  customSubareas?: Record<string, AnyRecord[]>;
  linkedSubareasByAreaId?: Record<string, string[]>;
  tasks?: AnyRecord[];
  habits?: AnyRecord[];
  projects?: AnyRecord[];
  quests?: AnyRecord[];
  drafts?: AnyRecord[];
  cycleSequences?: AnyRecord[];
  sequenceMemberships?: AnyRecord[];
  onboarding?: { selectedAreas?: string[] };
};

const collectIds = (record: AnyRecord, keys: string[]): string[] => {
  return keys.flatMap((key) => {
    const value = record[key];
    if (typeof value !== 'string') return [];
    const trimmed = value.trim();
    return trimmed ? [trimmed] : [];
  });
};

const collectHabitAreaIdsDeep = (habit: AnyRecord): string[] => {
  const ownAreaIds = collectIds(habit, ['areaId']);
  const children = Array.isArray(habit.childHabits) ? (habit.childHabits as AnyRecord[]) : [];
  return [...ownAreaIds, ...children.flatMap((child) => collectHabitAreaIdsDeep(child))];
};

const normalizeSource = (source: SnapshotSource) => {
  const selectedAreas = source.onboarding?.selectedAreas ?? [];
  const inferredAreaIds = new Set<string>();

  (source.tasks ?? []).forEach((task) => {
    collectIds(task, ['areaPrimaryId', 'areaSecondaryId1', 'areaSecondaryId2']).forEach((id) => inferredAreaIds.add(id));
  });

  (source.habits ?? []).forEach((habit) => {
    collectHabitAreaIdsDeep(habit).forEach((id) => inferredAreaIds.add(id));
  });

  (source.projects ?? []).forEach((project) => {
    collectIds(project, ['areaId']).forEach((id) => inferredAreaIds.add(id));
  });

  (source.quests ?? []).forEach((quest) => {
    collectIds(quest, ['areaId']).forEach((id) => inferredAreaIds.add(id));
  });

  return {
    customAreas: source.customAreas ?? [],
    customSubareas: source.customSubareas ?? {},
    linkedSubareasByAreaId: source.linkedSubareasByAreaId ?? {},
    tasks: source.tasks ?? [],
    habits: source.habits ?? [],
    projects: source.projects ?? [],
    quests: source.quests ?? [],
    drafts: source.drafts ?? [],
    cycleSequences: source.cycleSequences ?? [],
    sequenceMemberships: source.sequenceMemberships ?? [],
    selectedAreas,
    inferredAreaIds: Array.from(inferredAreaIds),
  };
};

const buildSnapshotFromCurrentState = (state: SnapshotSource) => {
  const source = normalizeSource(state);

  return {
    customAreas: dedupeById(source.customAreas),
    customSubareas: dedupeCustomSubareasRecord(source.customSubareas),
    linkedSubareasByAreaId: source.linkedSubareasByAreaId,
    tasks: dedupeById(source.tasks),
    habits: dedupeById(source.habits),
    projects: dedupeById(source.projects),
    quests: dedupeById(source.quests),
    drafts: dedupeById(source.drafts),
    cycleSequences: dedupeById(source.cycleSequences),
    sequenceMemberships: dedupeById(source.sequenceMemberships),
    selectedAreas: source.selectedAreas,
    inferredAreaIds: source.inferredAreaIds,
  };
};

const hasAnyLocalData = (entry: {
  customAreas?: unknown[];
  customSubareas?: Record<string, unknown[]>;
  tasks?: unknown[];
  habits?: unknown[];
  projects?: unknown[];
  quests?: unknown[];
  drafts?: unknown[];
  cycleSequences?: unknown[];
  sequenceMemberships?: unknown[];
}): boolean => {
  return (
    (entry.customAreas?.length ?? 0) > 0 ||
    Object.values(entry.customSubareas ?? {}).some((subareas) => (subareas?.length ?? 0) > 0) ||
    (entry.tasks?.length ?? 0) > 0 ||
    (entry.habits?.length ?? 0) > 0 ||
    (entry.projects?.length ?? 0) > 0 ||
    (entry.quests?.length ?? 0) > 0 ||
    (entry.drafts?.length ?? 0) > 0 ||
    (entry.cycleSequences?.length ?? 0) > 0 ||
    (entry.sequenceMemberships?.length ?? 0) > 0
  );
};

const sanitizeSequenceSnapshot = (
  cycleSequences: AnyRecord[],
  habits: AnyRecord[],
  sequenceMemberships: AnyRecord[]
): { sequences: AnyRecord[]; memberships: AnyRecord[] } => {
  const sequenceIds = new Set(
    cycleSequences
      .map((sequence) => sequence.id)
      .filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
  );

  const habitIds = new Set(
    habits
      .map((habit) => habit.id)
      .filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
  );

  const filteredMemberships = sequenceMemberships.filter((membership) => {
    const sequenceId = typeof membership.sequenceId === 'string' ? membership.sequenceId : null;
    const habitId = typeof membership.habitId === 'string' ? membership.habitId : null;
    if (!sequenceId || !habitId) return false;
    return sequenceIds.has(sequenceId) && habitIds.has(habitId);
  });

  const membershipsBySequence = filteredMemberships.reduce<Record<string, AnyRecord[]>>((acc, membership) => {
    const sequenceId = String(membership.sequenceId);
    if (!acc[sequenceId]) acc[sequenceId] = [];
    acc[sequenceId].push(membership);
    return acc;
  }, {});

  const normalizedMemberships = Object.values(membershipsBySequence).flatMap((memberships) =>
    memberships
      .sort((a, b) => Number(a.position ?? 0) - Number(b.position ?? 0))
      .map((membership, index) => ({
        ...membership,
        position: index,
      }))
  );

  // Keep sequences even when they become empty; only clean dangling links.
  return {
    sequences: cycleSequences,
    memberships: normalizedMemberships,
  };
};

const applyDomainSnapshotToStore = (snapshot: {
  customAreas: AnyRecord[];
  customSubareasRecord: Record<string, AnyRecord[]>;
  linkedSubareasByAreaId: Record<string, string[]>;
  tasks: AnyRecord[];
  habits: AnyRecord[];
  projects: AnyRecord[];
  quests: AnyRecord[];
  drafts: AnyRecord[];
  cycleSequences: AnyRecord[];
  sequenceMemberships: AnyRecord[];
}) => {
  const sanitized = sanitizeSequenceSnapshot(
    dedupeById(snapshot.cycleSequences),
    dedupeById(snapshot.habits),
    dedupeById(snapshot.sequenceMemberships)
  );

  useAppStore.setState(() => ({
    customAreas: dedupeById(snapshot.customAreas) as never,
    customSubareas: dedupeCustomSubareasRecord(snapshot.customSubareasRecord) as never,
    linkedSubareasByAreaId: snapshot.linkedSubareasByAreaId as never,
    tasks: dedupeById(snapshot.tasks) as never,
    habits: dedupeById(snapshot.habits) as never,
    projects: dedupeById(snapshot.projects) as never,
    quests: dedupeById(snapshot.quests) as never,
    drafts: dedupeById(snapshot.drafts) as never,
    cycleSequences: sanitized.sequences as never,
    sequenceMemberships: sanitized.memberships as never,
  }));

  useAppStore.getState().recomputeUserProgress();
};

export const recoverDomainDataFromLocalBackup = (): boolean => {
  const state = useAppStore.getState() as unknown as {
    customAreas: AnyRecord[];
    customSubareas: Record<string, AnyRecord[]>;
    linkedSubareasByAreaId: Record<string, string[]>;
    tasks: AnyRecord[];
    habits: AnyRecord[];
    projects: AnyRecord[];
    quests: AnyRecord[];
    drafts: AnyRecord[];
    cycleSequences: AnyRecord[];
    sequenceMemberships: AnyRecord[];
    accountDataById?: Record<string, {
      customAreas?: AnyRecord[];
      customSubareas?: Record<string, AnyRecord[]>;
      linkedSubareasByAreaId?: Record<string, string[]>;
      tasks?: AnyRecord[];
      habits?: AnyRecord[];
      projects?: AnyRecord[];
      quests?: AnyRecord[];
      drafts?: AnyRecord[];
      cycleSequences?: AnyRecord[];
      sequenceMemberships?: AnyRecord[];
    }>;
  };

  if (hasAnyLocalData(state)) {
    return true;
  }

  const candidates = Object.values(state.accountDataById ?? {});
  const backup = candidates.find((entry) => hasAnyLocalData(entry));
  if (!backup) {
    return false;
  }

  applyDomainSnapshotToStore({
    customAreas: backup.customAreas ?? [],
    customSubareasRecord: backup.customSubareas ?? {},
    linkedSubareasByAreaId: backup.linkedSubareasByAreaId ?? {},
    tasks: backup.tasks ?? [],
    habits: backup.habits ?? [],
    projects: backup.projects ?? [],
    quests: backup.quests ?? [],
    drafts: backup.drafts ?? [],
    cycleSequences: backup.cycleSequences ?? [],
    sequenceMemberships: backup.sequenceMemberships ?? [],
  });

  return true;
};

const chunk = <T,>(items: T[], size = 200): T[][] => {
  if (items.length === 0) return [];
  const out: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    out.push(items.slice(index, index + size));
  }
  return out;
};

const getDataColumnForTable = (table: string): 'payload' | 'metadata' => {
  if (table === 'custom_areas' || table === 'custom_subareas') {
    return 'metadata';
  }

  return 'payload';
};

const fetchPayloadRows = async (table: string, userId: string): Promise<AnyRecord[]> => {
  if (!supabase) return [];

  const dataColumn = getDataColumnForTable(table);
  const selectColumns =
    table === 'sequence_memberships'
      ? `local_id, sequence_id, habit_id, ${dataColumn}`
      : `local_id, ${dataColumn}`;
  const { data, error } = await supabase
    .from(table)
    .select(selectColumns)
    .eq('user_id', userId);
  if (error) throw new Error(`Falha ao ler ${table}: ${error.message}`);

  return (data ?? []).map((row) => {
    const record = row as unknown as Record<string, unknown>;
    const payload = ((record[dataColumn] as AnyRecord) ?? {}) as AnyRecord;
    const localId = typeof record.local_id === 'string' ? record.local_id : undefined;

    // Preserve DB row identity during hydration to avoid collapsing distinct rows
    // that accidentally share payload.id.
    if (!localId) return payload;

    const normalized: AnyRecord = {
      ...payload,
      local_id: localId,
      id: localId,
    };

    if (table === 'sequence_memberships') {
      const sequenceLocalId =
        typeof record.sequence_id === 'string' ? record.sequence_id : undefined;
      const habitLocalId = typeof record.habit_id === 'string' ? record.habit_id : undefined;

      if (sequenceLocalId) {
        normalized.sequenceId = sequenceLocalId;
      }

      if (habitLocalId) {
        normalized.habitId = habitLocalId;
      }
    }

    return normalized;
  });
};

const fetchProfile = async (userId: string): Promise<{ display_name: string | null; avatar: string | null } | null> => {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('display_name, avatar')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    if (isMissingTableError(error, 'profiles')) {
      return null;
    }
    throw new Error(`Falha ao ler perfil: ${error.message}`);
  }

  return data ?? null;
};

const fetchCloudSnapshot = async (userId: string): Promise<CloudSnapshot> => {
  const [
    profile,
    customAreas,
    customSubareas,
    tasks,
    habits,
    projects,
    quests,
    drafts,
    cycleSequences,
    sequenceMemberships,
  ] = await Promise.all([
    fetchProfile(userId),
    fetchPayloadRows('custom_areas', userId),
    fetchPayloadRows('custom_subareas', userId),
    fetchPayloadRows('tasks', userId),
    fetchPayloadRows('habits', userId),
    fetchPayloadRows('projects', userId),
    fetchPayloadRows('quests', userId),
    fetchPayloadRows('drafts', userId),
    fetchPayloadRows('cycle_sequences', userId),
    fetchPayloadRows('sequence_memberships', userId),
  ]);

  const linkedSubareasByAreaId = customAreas.reduce<Record<string, string[]>>((acc, item) => {
    const source = String(item.syncSource ?? '');
    if (source !== 'base-catalog' && source !== 'onboarding-selection') {
      return acc;
    }

    const sourceAreaId = typeof item.sourceAreaId === 'string' ? item.sourceAreaId : '';
    const linkedSubareaIds = Array.isArray(item.linkedSubareaIds)
      ? item.linkedSubareaIds.filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      : [];

    if (!sourceAreaId) return acc;
    acc[sourceAreaId] = linkedSubareaIds;
    return acc;
  }, {});

  const customAreasWithoutSyntheticRows = customAreas.filter((item) => {
    const source = String(item.syncSource ?? '');
    return source !== 'onboarding-selection' && source !== 'base-catalog';
  });

  const customSubareasWithoutSyntheticRows = customSubareas.filter((item) => {
    const source = String(item.syncSource ?? '');
    return source !== 'onboarding-selection' && source !== 'base-catalog';
  });

  const customSubareasRecord = customSubareasWithoutSyntheticRows.reduce<Record<string, AnyRecord[]>>((acc, item) => {
    const parentId = String(item.parentId || item.area_id || 'unknown');
    if (!acc[parentId]) acc[parentId] = [];
    acc[parentId].push(item);
    return acc;
  }, {});

  const dedupedSnapshot: CloudSnapshot = {
    profile,
    linkedSubareasByAreaId,
    customAreas: dedupeById(customAreasWithoutSyntheticRows),
    customSubareasRecord: dedupeCustomSubareasRecord(customSubareasRecord),
    tasks: dedupeById(tasks),
    habits: dedupeById(habits),
    projects: dedupeById(projects),
    quests: dedupeById(quests),
    drafts: dedupeById(drafts),
    cycleSequences: dedupeById(cycleSequences),
    sequenceMemberships: dedupeById(sequenceMemberships),
  };

  return dedupedSnapshot;
};

const deleteUserRows = async (table: string, userId: string) => {
  if (!supabase) return;
  const { error } = await supabase.from(table).delete().eq('user_id', userId);
  if (error) throw new Error(`Falha ao limpar ${table}: ${error.message}`);
};

const insertInChunks = async (table: string, rows: AnyRecord[]) => {
  if (!supabase || rows.length === 0) return;

  for (const batch of chunk(rows)) {
    const { error } = await supabase.from(table).insert(batch);
    if (error) throw new Error(`Falha ao inserir ${table}: ${error.message}`);
  }
};

const buildRowsFromStore = (userId: string) => {
  const state = useAppStore.getState() as unknown as SnapshotSource & {
    user: { name?: string | null; avatar?: string | null };
    accountDataById?: Record<string, SnapshotSource>;
  };

  const merged = buildSnapshotFromCurrentState(state);

  const customAreaRows = merged.customAreas.map((area) => ({
    user_id: userId,
    local_id: String(area.id),
    name: String(area.name),
    element_id: String(area.elementId),
    color: area.color ? String(area.color) : null,
    parent_id: area.parentId ? String(area.parentId) : null,
    metadata: area,
  }));

  // Persist a full base catalog per user so onboarding defaults exist in cloud
  // independently of explicit selection/import state.
  const baseCatalogAreas = AREAS;

  const baseCatalogAreaRows = baseCatalogAreas.map((area) => {
    const localId = `base-area-${area.id}`;
    const linkedSubareaIds =
      state.linkedSubareasByAreaId?.[area.id] ??
      (area.subareas ?? []).map((subarea) => subarea.id);
    const metadata = {
      id: localId,
      name: area.name,
      description: area.description,
      elementId: area.elementId,
      color: area.color,
      parentId: null,
      subareas: [],
      isUserSelected: false,
      isCustom: false,
      syncSource: 'base-catalog',
      sourceAreaId: area.id,
      linkedSubareaIds,
    };

    return {
      user_id: userId,
      local_id: localId,
      name: area.name,
      element_id: area.elementId,
      color: area.color ?? null,
      parent_id: null,
      metadata,
    };
  });

  const allCustomAreaRows = Array.from(
    new Map(
      [...customAreaRows, ...baseCatalogAreaRows].map((row) => [String(row.local_id), row] as const)
    ).values()
  );

  const customSubareaRows = Object.entries(merged.customSubareas).flatMap(([areaId, entries]) =>
    entries.map((subarea) => ({
      user_id: userId,
      local_id: String(subarea.id),
      area_id: String(subarea.parentId || areaId),
      name: String(subarea.name),
      element_id: String(subarea.elementId),
      color: subarea.color ? String(subarea.color) : null,
      metadata: subarea,
    }))
  );

  const baseCatalogSubareaRows = baseCatalogAreas.flatMap((area) =>
    (area.subareas ?? []).map((subarea) => {
      const localId = `base-subarea-${subarea.id}`;
      const metadata = {
        id: localId,
        name: subarea.name,
        description: subarea.description,
        elementId: subarea.elementId,
        color: subarea.color,
        parentId: area.id,
        subareas: [],
        isUserSelected: false,
        isCustom: false,
        syncSource: 'base-catalog',
        sourceSubareaId: subarea.id,
        sourceAreaId: area.id,
      };

      return {
        user_id: userId,
        local_id: localId,
        area_id: area.id,
        name: subarea.name,
        element_id: subarea.elementId,
        color: subarea.color ?? null,
        metadata,
      };
    })
  );

  const allCustomSubareaRows = Array.from(
    new Map(
      [...customSubareaRows, ...baseCatalogSubareaRows].map((row) => [String(row.local_id), row] as const)
    ).values()
  );

  const taskRows = merged.tasks.map((task) => ({
    user_id: userId,
    local_id: String(task.id),
    title: String(task.title),
    status: task.isCompleted ? 'completed' : 'active',
    element_id: task.elementId ? String(task.elementId) : null,
    area_primary_id: task.areaPrimaryId ? String(task.areaPrimaryId) : null,
    due_date: null,
    payload: task,
  }));

  const habitRows = merged.habits.map((habit) => ({
    user_id: userId,
    local_id: String(habit.id),
    name: String(habit.name),
    element_id: habit.elementId ? String(habit.elementId) : null,
    area_id: habit.areaId ? String(habit.areaId) : null,
    recurrence_type: habit.recurrenceType ? String(habit.recurrenceType) : null,
    payload: habit,
  }));

  const projectRows = merged.projects.map((project) => ({
    user_id: userId,
    local_id: String(project.id),
    title: String(project.title),
    status: String(project.status || 'active'),
    element_id: project.elementId ? String(project.elementId) : null,
    area_id: project.areaId ? String(project.areaId) : null,
    payload: project,
  }));

  const questRows = merged.quests.map((quest) => ({
    user_id: userId,
    local_id: String(quest.id),
    title: String(quest.title),
    status: String(quest.status || 'active'),
    element_id: quest.elementId ? String(quest.elementId) : null,
    area_id: quest.areaId ? String(quest.areaId) : null,
    payload: quest,
  }));

  const draftRows = merged.drafts.map((draft) => ({
    user_id: userId,
    local_id: String(draft.id),
    title: String(draft.title),
    payload: draft,
  }));

  const cycleSequenceRows = merged.cycleSequences.map((sequence) => ({
    user_id: userId,
    local_id: String(sequence.id),
    name: String(sequence.name),
    is_active: Boolean(sequence.isActive ?? true),
    payload: sequence,
  }));

  const sequenceMembershipRows = merged.sequenceMemberships.map((membership) => ({
    user_id: userId,
    local_id: String(membership.id),
    sequence_id: membership.sequenceId ? String(membership.sequenceId) : null,
    habit_id: membership.habitId ? String(membership.habitId) : null,
    position: Number(membership.position ?? 0),
    payload: membership,
  }));

  return {
    profile: {
      id: userId,
      display_name: state.user.name || null,
      avatar: state.user.avatar || null,
    },
    customAreaRows: allCustomAreaRows,
    customSubareaRows: allCustomSubareaRows,
    taskRows,
    habitRows,
    projectRows,
    questRows,
    draftRows,
    cycleSequenceRows,
    sequenceMembershipRows,
  };
};

export const getCloudSyncFingerprint = (): string => {
  const state = useAppStore.getState();

  return JSON.stringify({
    user: {
      name: state.user.name,
      avatar: state.user.avatar,
    },
    customAreas: state.customAreas,
    customSubareas: state.customSubareas,
    tasks: state.tasks,
    habits: state.habits,
    projects: state.projects,
    quests: state.quests,
    drafts: state.drafts,
    cycleSequences: state.cycleSequences,
    sequenceMemberships: state.sequenceMemberships,
    onboarding: {
      selectedAreas: state.onboarding.selectedAreas,
    },
  });
};

export const hydrateAppStoreFromCloud = async (userId: string): Promise<{ hadCloudData: boolean; hasProfile: boolean }> => {
  if (!isSupabaseAuthEnabled || !supabase) return { hadCloudData: false, hasProfile: false };
  if (!(await ensureSchemaReady())) return { hadCloudData: false, hasProfile: false };

  const snapshot = await fetchCloudSnapshot(userId);
  const hadCloudData = hasAnyCloudData(snapshot);
  const hasProfile = Boolean(snapshot.profile);

  useAppStore.setState((state) => ({
    user: {
      ...state.user,
      id: `user-${userId}`,
      name: snapshot.profile?.display_name || state.user.name,
      avatar: snapshot.profile?.avatar || state.user.avatar,
    },
  }));

  if (hadCloudData) {
    applyDomainSnapshotToStore({
      customAreas: snapshot.customAreas,
      customSubareasRecord: snapshot.customSubareasRecord,
      linkedSubareasByAreaId: snapshot.linkedSubareasByAreaId,
      tasks: snapshot.tasks,
      habits: snapshot.habits,
      projects: snapshot.projects,
      quests: snapshot.quests,
      drafts: snapshot.drafts,
      cycleSequences: snapshot.cycleSequences,
      sequenceMemberships: snapshot.sequenceMemberships,
    });
  }

  return { hadCloudData, hasProfile };
};

export const persistAppStoreToCloud = async (userId: string): Promise<void> => {
  if (!isSupabaseAuthEnabled || !supabase) return;
  if (!(await ensureSchemaReady())) return;

  const preSyncCloudSnapshot = await fetchCloudSnapshot(userId);
  if (hasAnyCloudData(preSyncCloudSnapshot)) {
    saveEmergencyCloudBackup(userId, preSyncCloudSnapshot);
  }

  const rows = buildRowsFromStore(userId);
  const hasLocalDomainRows =
    rows.taskRows.length > 0 ||
    rows.habitRows.length > 0 ||
    rows.projectRows.length > 0 ||
    rows.questRows.length > 0 ||
    rows.draftRows.length > 0 ||
    rows.cycleSequenceRows.length > 0 ||
    rows.sequenceMembershipRows.length > 0;

  // Safety net: never replace non-empty cloud domain data with an empty local snapshot.
  if (!hasLocalDomainRows) {
    const cloudSnapshot = await fetchCloudSnapshot(userId);
    const cloudHasDomainRows =
      cloudSnapshot.tasks.length > 0 ||
      cloudSnapshot.habits.length > 0 ||
      cloudSnapshot.projects.length > 0 ||
      cloudSnapshot.quests.length > 0 ||
      cloudSnapshot.drafts.length > 0 ||
      cloudSnapshot.cycleSequences.length > 0 ||
      cloudSnapshot.sequenceMemberships.length > 0;

    if (cloudHasDomainRows) {
      throw new Error(
        'Proteção de sincronização: estado local vazio e nuvem com dados. Sincronização bloqueada para evitar perda.'
      );
    }
  }

  const { error: profileError } = await supabase.from('profiles').upsert(rows.profile);
  if (profileError && !isMissingTableError(profileError, 'profiles')) {
    throw new Error(`Falha ao sincronizar perfil: ${profileError.message}`);
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

  await insertInChunks('custom_areas', rows.customAreaRows);
  await insertInChunks('custom_subareas', rows.customSubareaRows);
  await insertInChunks('tasks', rows.taskRows);
  await insertInChunks('habits', rows.habitRows);
  await insertInChunks('projects', rows.projectRows);
  await insertInChunks('quests', rows.questRows);
  await insertInChunks('drafts', rows.draftRows);
  await insertInChunks('cycle_sequences', rows.cycleSequenceRows);
  await insertInChunks('sequence_memberships', rows.sequenceMembershipRows);
};
