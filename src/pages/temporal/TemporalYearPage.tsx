import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useAppStore } from '@/stores/appStore';
import {
  buildTemporalCommitments,
  buildTemporalEvents,
  endOfYear,
  getMonthMetrics,
  getYearMetrics,
  startOfYear,
} from '@/lib/temporal';
import { TemporalLayout } from '@/pages/temporal/TemporalLayout';

const cardClass = 'rounded-2xl border border-white/10 bg-white/[0.03] p-4';
const ANNUAL_ENTRY_MARKER = '[ANUAL_ENTRY]';
const LEGACY_ANNUAL_TASK_MARKER = '[ANUAL_TASK]';
const ANNUAL_CATEGORY_PREFIX = '[ANUAL_CATEGORY:';
const ANNUAL_REPEAT_PREFIX = '[ANUAL_REPEAT:';
const ANNUAL_END_PREFIX = '[ANUAL_END:';

const toValidDate = (value: Date | string | number | null | undefined): Date | null => {
  if (value == null) return null;
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

type AnnualEntryCategory = 'task' | 'birthday';
type AnnualEntryRepeat = 'infinite' | 'until';

type ParsedAnnualEntry = {
  category: AnnualEntryCategory;
  repeat: AnnualEntryRepeat;
  endDate: Date | null;
  notes: string;
};

const parseMarkerValue = (description: string, prefix: string): string | null => {
  const line = description
    .split('\n')
    .map((item) => item.trim())
    .find((item) => item.startsWith(prefix) && item.endsWith(']'));

  if (!line) return null;
  return line.slice(prefix.length, -1).trim();
};

const isAnnualTask = (description: string | undefined): boolean => {
  return (
    description?.includes(ANNUAL_ENTRY_MARKER)
    || description?.includes(LEGACY_ANNUAL_TASK_MARKER)
    || false
  );
};

const parseAnnualEntry = (description: string | undefined): ParsedAnnualEntry => {
  const raw = description ?? '';

  const categoryRaw = parseMarkerValue(raw, ANNUAL_CATEGORY_PREFIX);
  const category: AnnualEntryCategory = categoryRaw === 'birthday' ? 'birthday' : 'task';

  const repeatRaw = parseMarkerValue(raw, ANNUAL_REPEAT_PREFIX);
  const repeat: AnnualEntryRepeat = repeatRaw === 'until' ? 'until' : 'infinite';

  const endRaw = parseMarkerValue(raw, ANNUAL_END_PREFIX);
  const endDate = endRaw ? toValidDate(endRaw) : null;

  const notes = raw
    .split('\n')
    .map((item) => item.trim())
    .filter((item) => {
      if (!item) return false;
      if (item === ANNUAL_ENTRY_MARKER) return false;
      if (item === LEGACY_ANNUAL_TASK_MARKER) return false;
      if (item.startsWith(ANNUAL_CATEGORY_PREFIX) && item.endsWith(']')) return false;
      if (item.startsWith(ANNUAL_REPEAT_PREFIX) && item.endsWith(']')) return false;
      if (item.startsWith(ANNUAL_END_PREFIX) && item.endsWith(']')) return false;
      return true;
    })
    .join('\n')
    .trim();

  return {
    category,
    repeat,
    endDate,
    notes,
  };
};

const buildAnnualTaskDescription = (input: {
  category: AnnualEntryCategory;
  repeat: AnnualEntryRepeat;
  endDate: Date | null;
  notes: string;
}): string => {
  const lines = [
    ANNUAL_ENTRY_MARKER,
    `${ANNUAL_CATEGORY_PREFIX}${input.category}]`,
    `${ANNUAL_REPEAT_PREFIX}${input.repeat}]`,
  ];

  if (input.repeat === 'until' && input.endDate) {
    const isoDate = input.endDate.toISOString().slice(0, 10);
    lines.push(`${ANNUAL_END_PREFIX}${isoDate}]`);
  }

  if (input.notes.trim()) {
    lines.push(input.notes.trim());
  }

  return lines.join('\n');
};

export const TemporalYearPage: React.FC = () => {
  const [year, setYear] = useState(() => new Date().getFullYear());
  const today = useMemo(() => new Date(), []);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDraggingCloseHandle, setIsDraggingCloseHandle] = useState(false);
  const [dragStartY, setDragStartY] = useState<number | null>(null);
  const [dragOffsetY, setDragOffsetY] = useState(0);
  const [annualCategory, setAnnualCategory] = useState<AnnualEntryCategory>('task');
  const [annualTaskTitle, setAnnualTaskTitle] = useState('');
  const [annualTaskNotes, setAnnualTaskNotes] = useState('');
  const [annualTaskMonth, setAnnualTaskMonth] = useState<number>(today.getMonth());
  const [annualTaskDay, setAnnualTaskDay] = useState<number>(today.getDate());
  const [showDescriptionField, setShowDescriptionField] = useState(false);
  const [isInfiniteRepeat, setIsInfiniteRepeat] = useState(true);
  const [repeatUntilYear, setRepeatUntilYear] = useState(year);
  const [repeatUntilMonth, setRepeatUntilMonth] = useState<number>(today.getMonth());
  const [repeatUntilDay, setRepeatUntilDay] = useState<number>(today.getDate());
  const [isRepeatUntilModalOpen, setIsRepeatUntilModalOpen] = useState(false);
  const [draftRepeatUntilMonth, setDraftRepeatUntilMonth] = useState<number>(today.getMonth());
  const [draftRepeatUntilDay, setDraftRepeatUntilDay] = useState<number>(today.getDate());
  const monthWheelDragRef = useRef<{ isActive: boolean; startY: number }>({ isActive: false, startY: 0 });
  const dayWheelDragRef = useRef<{ isActive: boolean; startY: number }>({ isActive: false, startY: 0 });
  const dragCloseThreshold = 120;
  const wheelStepPx = 24;

  const addTask = useAppStore((state) => state.addTask);
  const updateTask = useAppStore((state) => state.updateTask);
  const completeTask = useAppStore((state) => state.completeTask);
  const uncompleteTask = useAppStore((state) => state.uncompleteTask);
  const tasks = useAppStore((state) => state.tasks);
  const habits = useAppStore((state) => state.habits);
  const cycleSequences = useAppStore((state) => state.cycleSequences);
  const projects = useAppStore((state) => state.projects);
  const quests = useAppStore((state) => state.quests);

  const snapshot = useMemo(
    () => ({ tasks, habits, cycleSequences, projects, quests }),
    [tasks, habits, cycleSequences, projects, quests]
  );

  const anchorDate = useMemo(() => new Date(year, 0, 1), [year]);
  const events = useMemo(() => buildTemporalEvents(snapshot), [snapshot]);

  const yearMetrics = useMemo(() => {
    const start = startOfYear(anchorDate);
    const end = endOfYear(anchorDate);
    const commitments = buildTemporalCommitments(snapshot, start, end);
    return getYearMetrics(events, commitments, anchorDate);
  }, [anchorDate, events, snapshot]);

  const months = useMemo(() => {
    return Array.from({ length: 12 }, (_, index) => {
      const monthDate = new Date(year, index, 1);
      const monthStart = new Date(year, index, 1);
      const monthEnd = new Date(year, index + 1, 0);
      const commitments = buildTemporalCommitments(snapshot, monthStart, monthEnd);
      const metrics = getMonthMetrics(events, commitments, monthDate);

      return {
        monthDate,
        metrics,
      };
    });
  }, [events, snapshot, year]);

  const recurrenceGroups = useMemo(() => {
    const yearly: string[] = [];
    const monthly: string[] = [];
    const weekly: string[] = [];

    const walk = (habits: typeof snapshot.habits): void => {
      habits.forEach((habit) => {
        if (habit.recurrenceType === 'YEARLY') yearly.push(habit.name);
        if (habit.recurrenceType === 'MONTHLY') monthly.push(habit.name);
        if (habit.recurrenceType === 'WEEKLY') weekly.push(habit.name);
        if (habit.childHabits.length > 0) walk(habit.childHabits);
      });
    };

    walk(snapshot.habits);

    return {
      yearly,
      monthly,
      weekly,
    };
  }, [snapshot.habits]);

  useEffect(() => {
    setRepeatUntilYear(year);
  }, [year]);

  useEffect(() => {
    if (!isCreateModalOpen) return;

    const previousBodyOverflow = document.body.style.overflow;
    const previousBodyTouchAction = document.body.style.touchAction;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
    document.documentElement.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.body.style.touchAction = previousBodyTouchAction;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [isCreateModalOpen]);

  const annualTaskMaxDay = useMemo(() => new Date(year, annualTaskMonth + 1, 0).getDate(), [annualTaskMonth, year]);
  const repeatUntilMaxDay = useMemo(
    () => new Date(repeatUntilYear, repeatUntilMonth + 1, 0).getDate(),
    [repeatUntilMonth, repeatUntilYear]
  );
  const draftRepeatUntilMaxDay = useMemo(
    () => new Date(repeatUntilYear, draftRepeatUntilMonth + 1, 0).getDate(),
    [draftRepeatUntilMonth, repeatUntilYear]
  );

  useEffect(() => {
    if (annualTaskDay > annualTaskMaxDay) {
      setAnnualTaskDay(annualTaskMaxDay);
    }
  }, [annualTaskDay, annualTaskMaxDay]);

  useEffect(() => {
    if (repeatUntilDay > repeatUntilMaxDay) {
      setRepeatUntilDay(repeatUntilMaxDay);
    }
  }, [repeatUntilDay, repeatUntilMaxDay]);

  useEffect(() => {
    if (draftRepeatUntilDay > draftRepeatUntilMaxDay) {
      setDraftRepeatUntilDay(draftRepeatUntilMaxDay);
    }
  }, [draftRepeatUntilDay, draftRepeatUntilMaxDay]);

  const annualTasks = useMemo(() => {
    return tasks
      .filter((task) => {
        if (!isAnnualTask(task.description)) return false;
        const createdAt = toValidDate(task.createdAt);
        if (!createdAt) return false;
        return createdAt.getFullYear() === year;
      })
      .sort((left, right) => {
        const leftDate = toValidDate(left.createdAt)?.getTime() ?? 0;
        const rightDate = toValidDate(right.createdAt)?.getTime() ?? 0;
        return leftDate - rightDate;
      });
  }, [tasks, year]);

  const closeCreateModal = () => {
    setIsCreateModalOpen(false);
    setIsDraggingCloseHandle(false);
    setDragStartY(null);
    setDragOffsetY(0);
  };

  const openCreateModal = () => {
    setIsCreateModalOpen(true);
    setIsDraggingCloseHandle(false);
    setDragStartY(null);
    setDragOffsetY(0);
  };

  const startCloseHandleDrag = (clientY: number) => {
    setIsDraggingCloseHandle(true);
    setDragStartY(clientY);
    setDragOffsetY(0);
  };

  const moveCloseHandleDrag = (clientY: number) => {
    if (!isDraggingCloseHandle || dragStartY == null) return;
    const delta = Math.max(0, clientY - dragStartY);
    setDragOffsetY(delta);
  };

  const endCloseHandleDrag = () => {
    if (!isDraggingCloseHandle) return;

    const shouldClose = dragOffsetY >= dragCloseThreshold;
    setIsDraggingCloseHandle(false);
    setDragStartY(null);

    if (shouldClose) {
      closeCreateModal();
      return;
    }

    setDragOffsetY(0);
  };

  const handleCreateAnnualTask = () => {
    const normalizedTitle = annualTaskTitle.trim();
    if (!normalizedTitle) return;

    const plannedDate = new Date(year, annualTaskMonth, Math.min(annualTaskDay, annualTaskMaxDay));

    const repeat: AnnualEntryRepeat = isInfiniteRepeat ? 'infinite' : 'until';
    let endDate: Date | null = null;

    if (repeat === 'until') {
      const rawEndDate = new Date(
        repeatUntilYear,
        repeatUntilMonth,
        Math.min(repeatUntilDay, repeatUntilMaxDay)
      );
      endDate = rawEndDate < plannedDate ? plannedDate : rawEndDate;
    }

    const descriptionWithMarker = buildAnnualTaskDescription({
      category: annualCategory,
      repeat,
      endDate,
      notes: showDescriptionField ? annualTaskNotes : '',
    });

    const created = addTask({
      title: normalizedTitle,
      description: descriptionWithMarker,
      baseValue: 1,
      effortLevel: 2,
      plannedTimeMinutes: 30,
    });

    updateTask(created.id, { createdAt: plannedDate });

    setAnnualTaskTitle('');
    setAnnualTaskNotes('');
    setShowDescriptionField(false);
    setIsInfiniteRepeat(true);
    closeCreateModal();
  };

  const openRepeatUntilModal = () => {
    setDraftRepeatUntilMonth(repeatUntilMonth);
    setDraftRepeatUntilDay(repeatUntilDay);
    setIsRepeatUntilModalOpen(true);
  };

  const confirmRepeatUntilModal = () => {
    setRepeatUntilMonth(draftRepeatUntilMonth);
    setRepeatUntilDay(Math.min(draftRepeatUntilDay, draftRepeatUntilMaxDay));
    setRepeatUntilYear(year);
    setIsRepeatUntilModalOpen(false);
  };

  const repeatUntilPreviewDate = useMemo(
    () => new Date(repeatUntilYear, repeatUntilMonth, Math.min(repeatUntilDay, repeatUntilMaxDay)),
    [repeatUntilDay, repeatUntilMaxDay, repeatUntilMonth, repeatUntilYear]
  );
  const repeatUntilPreviewAbbr = useMemo(() => {
    return repeatUntilPreviewDate
      .toLocaleDateString('pt-BR', { month: 'short' })
      .replace('.', '')
      .toUpperCase();
  }, [repeatUntilPreviewDate]);

  const shiftDraftMonth = (direction: 1 | -1) => {
    setDraftRepeatUntilMonth((currentMonth) => {
      const nextMonth = (currentMonth + direction + 12) % 12;
      const maxDayInNextMonth = new Date(repeatUntilYear, nextMonth + 1, 0).getDate();
      setDraftRepeatUntilDay((currentDay) => Math.min(currentDay, maxDayInNextMonth));
      return nextMonth;
    });
  };

  const shiftDraftDay = (direction: 1 | -1) => {
    setDraftRepeatUntilDay((currentDay) => {
      const max = new Date(repeatUntilYear, draftRepeatUntilMonth + 1, 0).getDate();
      if (direction > 0) {
        return currentDay >= max ? 1 : currentDay + 1;
      }
      return currentDay <= 1 ? max : currentDay - 1;
    });
  };

  const applyWheelDragStep = (
    dragRef: React.MutableRefObject<{ isActive: boolean; startY: number }>,
    clientY: number,
    onStep: (direction: 1 | -1) => void
  ) => {
    if (!dragRef.current.isActive) return;
    const delta = clientY - dragRef.current.startY;
    if (Math.abs(delta) < wheelStepPx) return;

    const stepCount = Math.trunc(delta / wheelStepPx);
    const direction = stepCount > 0 ? -1 : 1;
    for (let index = 0; index < Math.abs(stepCount); index += 1) {
      onStep(direction);
    }

    dragRef.current.startY += stepCount * wheelStepPx;
  };

  const monthLabel = (monthIndex: number) => {
    return new Date(repeatUntilYear, monthIndex, 1)
      .toLocaleDateString('pt-BR', { month: 'short' })
      .replace('.', '')
      .toUpperCase();
  };

  const prevDraftMonth = (draftRepeatUntilMonth + 11) % 12;
  const nextDraftMonth = (draftRepeatUntilMonth + 1) % 12;
  const prevDraftDay = draftRepeatUntilDay <= 1 ? draftRepeatUntilMaxDay : draftRepeatUntilDay - 1;
  const nextDraftDay = draftRepeatUntilDay >= draftRepeatUntilMaxDay ? 1 : draftRepeatUntilDay + 1;

  return (
    <TemporalLayout
      title="Temporal - Ano"
      subtitle="Visão operacional anual com meses e frequências de atividade"
    >
      <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-3">
        <button
          type="button"
          onClick={() => setYear((current) => current - 1)}
          className="rounded-lg border border-white/20 p-2 text-white/80 hover:bg-white/10"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <p className="text-base font-semibold text-white">{year}</p>
        <button
          type="button"
          onClick={() => setYear((current) => current + 1)}
          className="rounded-lg border border-white/20 p-2 text-white/80 hover:bg-white/10"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <h3 className="text-sm uppercase tracking-[0.2em] text-white/60">Tarefas anuais e aniversários</h3>

        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={openCreateModal}
            aria-label="Adicionar entrada anual"
            className="flex h-12 min-w-12 items-center justify-center rounded-xl border border-mystic-gold/45 bg-mystic-gold/20 px-4 text-2xl leading-none text-mystic-gold hover:bg-mystic-gold/30"
          >
            +
          </button>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
          {annualTasks.length === 0 ? (
            <div className="md:col-span-2">
              <div className="flex min-h-[280px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/20 bg-black/20 px-6 py-8 text-center">
                <p className="text-lg font-semibold text-white">Nenhuma entrada anual cadastrada para {year}</p>
                <p className="mt-2 text-sm text-white/65">Crie tarefas recorrentes e aniversários para organizar o ano.</p>
                <button
                  type="button"
                  onClick={openCreateModal}
                  className="mt-6 flex h-20 w-20 items-center justify-center rounded-2xl border border-mystic-gold/50 bg-mystic-gold/20 text-5xl leading-none text-mystic-gold hover:bg-mystic-gold/30"
                >
                  +
                </button>
              </div>
            </div>
          ) : (
            annualTasks.map((task) => {
              const plannedDate = toValidDate(task.createdAt);
              const parsed = parseAnnualEntry(task.description);

              return (
                <article key={task.id} className="rounded-xl border border-white/10 bg-black/15 px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-sm ${task.isCompleted ? 'text-white/55 line-through' : 'text-white'}`}>
                      {parsed.category === 'birthday' ? 'Aniversário: ' : ''}
                      {task.title}
                    </p>
                    <button
                      type="button"
                      onClick={() => (task.isCompleted ? uncompleteTask(task.id) : completeTask(task.id))}
                      className="rounded-md border border-white/15 px-2 py-1 text-xs text-white/80 hover:bg-white/10"
                    >
                      {task.isCompleted ? 'Reabrir' : 'Concluir'}
                    </button>
                  </div>

                  <p className="mt-1 text-xs text-white/60">
                    {plannedDate
                      ? `Data configurada: ${plannedDate.toLocaleDateString('pt-BR')}`
                      : 'Data configurada: não definida'}
                  </p>

                  <p className="mt-1 text-xs text-white/60">
                    {parsed.repeat === 'until' && parsed.endDate
                      ? `Repete até ${parsed.endDate.toLocaleDateString('pt-BR')}`
                      : 'Repetição infinita'}
                  </p>

                  {parsed.notes ? (
                    <p className="mt-1 whitespace-pre-line text-xs text-white/65">{parsed.notes}</p>
                  ) : null}
                </article>
              );
            })
          )}
        </div>
      </section>

      {isCreateModalOpen ? (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm"
          onWheel={(event) => {
            // Prevent wheel scroll from reaching the page behind the modal.
            event.stopPropagation();
          }}
        >
          <div
            className={`h-full w-full overflow-hidden bg-gradient-to-b from-[#110b1f] via-[#120f24] to-[#0c0a16] ${isDraggingCloseHandle ? '' : 'transition-transform duration-200'}`}
            style={{ transform: `translateY(${dragOffsetY}px)` }}
          >
            <div
              className="flex cursor-grab items-center justify-center border-b border-white/10 px-4 py-4 active:cursor-grabbing"
              style={{ touchAction: 'none' }}
              onPointerDown={(event) => {
                event.preventDefault();
                event.currentTarget.setPointerCapture(event.pointerId);
                startCloseHandleDrag(event.clientY);
              }}
              onPointerMove={(event) => {
                event.preventDefault();
                moveCloseHandleDrag(event.clientY);
              }}
              onPointerUp={(event) => {
                event.preventDefault();
                if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                  event.currentTarget.releasePointerCapture(event.pointerId);
                }
                endCloseHandleDrag();
              }}
              onPointerCancel={(event) => {
                event.preventDefault();
                if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                  event.currentTarget.releasePointerCapture(event.pointerId);
                }
                endCloseHandleDrag();
              }}
            >
              <span className="h-1.5 w-16 rounded-full bg-white/40" />
            </div>

            <div className="mx-auto flex h-[calc(100%-60px)] w-full max-w-3xl flex-col px-4 py-5">
              <div className="flex items-center justify-between gap-3">
                <h4 className="text-lg font-semibold text-white">Nova entrada anual</h4>
                <button
                  type="button"
                  onClick={closeCreateModal}
                  className="rounded-lg border border-white/20 px-3 py-1.5 text-xs text-white/85 hover:bg-white/10"
                >
                  Fechar
                </button>
              </div>

              <div className="mt-4 overflow-y-auto pb-8">
                <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
                  <select
                    value={annualCategory}
                    onChange={(event) => setAnnualCategory(event.target.value as AnnualEntryCategory)}
                    className="rounded-lg border border-white/15 bg-black/25 px-3 py-2 text-sm text-white"
                  >
                    <option value="task" className="bg-zinc-900 text-white">Tarefa anual</option>
                    <option value="birthday" className="bg-zinc-900 text-white">Aniversário</option>
                  </select>

                  <input
                    type="text"
                    value={annualTaskTitle}
                    onChange={(event) => setAnnualTaskTitle(event.target.value)}
                    placeholder={annualCategory === 'birthday' ? 'Nome da pessoa' : 'Nome da tarefa'}
                    className="rounded-lg border border-white/15 bg-black/25 px-3 py-2 text-sm text-white placeholder:text-white/40 md:col-span-3"
                  />
                </div>

                <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-3">
                  <select
                    value={annualTaskDay}
                    onChange={(event) => setAnnualTaskDay(Number(event.target.value))}
                    className="rounded-lg border border-white/15 bg-black/25 px-3 py-2 text-sm text-white"
                  >
                    {Array.from({ length: annualTaskMaxDay }, (_, index) => index + 1).map((day) => (
                      <option key={day} value={day} className="bg-zinc-900 text-white">
                        Dia {day}
                      </option>
                    ))}
                  </select>

                  <select
                    value={annualTaskMonth}
                    onChange={(event) => setAnnualTaskMonth(Number(event.target.value))}
                    className="rounded-lg border border-white/15 bg-black/25 px-3 py-2 text-sm text-white"
                  >
                    {Array.from({ length: 12 }, (_, index) => {
                      const monthDate = new Date(year, index, 1);
                      return (
                        <option key={index} value={index} className="bg-zinc-900 text-white">
                          {monthDate.toLocaleDateString('pt-BR', { month: 'long' })}
                        </option>
                      );
                    })}
                  </select>

                  <button
                    type="button"
                    onClick={() => setShowDescriptionField((current) => !current)}
                    className="rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-white/90 hover:bg-white/10"
                  >
                    {showDescriptionField ? 'Remover descrição' : 'Adicionar descrição'}
                  </button>
                </div>

                {showDescriptionField ? (
                  <textarea
                    value={annualTaskNotes}
                    onChange={(event) => setAnnualTaskNotes(event.target.value)}
                    placeholder="Descreva sua tarefa..."
                    className="mt-2 min-h-[140px] w-full rounded-lg border border-white/15 bg-black/25 px-3 py-2 text-sm text-white placeholder:text-white/40"
                  />
                ) : null}

                <div className="mt-3 rounded-xl border border-white/10 bg-black/15 p-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsInfiniteRepeat((current) => {
                        const next = !current;
                        if (next) setIsRepeatUntilModalOpen(false);
                        return next;
                      });
                    }}
                    className="rounded-md border border-white/20 px-3 py-1.5 text-xs text-white/90 hover:bg-white/10"
                  >
                    {isInfiniteRepeat ? 'Repetição infinita: ativada' : 'Repetição infinita: desativada'}
                  </button>
                  <p className="mt-1 text-xs text-white/60">Permite repetir esta tarefa sem limite.</p>

                  {!isInfiniteRepeat ? (
                    <div className="mt-2">
                      <button
                        type="button"
                        onClick={openRepeatUntilModal}
                        className="w-full rounded-xl border border-mystic-gold/45 bg-mystic-gold/10 px-3 py-3 text-left hover:bg-mystic-gold/20"
                      >
                        <p className="text-xs uppercase tracking-[0.14em] text-mystic-gold/80">Repetir em</p>
                        <p className="mt-1 text-base font-semibold text-mystic-gold">
                          {repeatUntilPreviewAbbr} {repeatUntilPreviewDate.getDate()}
                        </p>
                        <p className="text-xs text-mystic-gold/85">
                          {repeatUntilPreviewDate.toLocaleDateString('pt-BR', { month: 'long' })} {repeatUntilPreviewDate.getDate()}
                        </p>
                      </button>
                    </div>
                  ) : null}
                </div>

                {isRepeatUntilModalOpen ? (
                  <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm">
                    <div className="mx-auto flex h-full w-full max-w-2xl flex-col bg-[#0f0b1d]">
                      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                        <button
                          type="button"
                          onClick={() => setIsRepeatUntilModalOpen(false)}
                          className="rounded-md border border-white/20 px-3 py-1.5 text-xs text-white/85 hover:bg-white/10"
                        >
                          Cancelar
                        </button>
                        <p className="text-sm font-medium text-white">Repetir em</p>
                        <button
                          type="button"
                          onClick={confirmRepeatUntilModal}
                          className="rounded-md border border-mystic-gold/45 bg-mystic-gold/20 px-3 py-1.5 text-xs font-medium text-mystic-gold hover:bg-mystic-gold/30"
                        >
                          Repetir em
                        </button>
                      </div>

                      <div className="grid flex-1 grid-cols-2 gap-3 px-4 py-4">
                        <div
                          className="rounded-xl border border-white/10 bg-black/20 p-2"
                          style={{ touchAction: 'none' }}
                          onWheel={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            shiftDraftMonth(event.deltaY > 0 ? 1 : -1);
                          }}
                          onPointerDown={(event) => {
                            event.preventDefault();
                            event.currentTarget.setPointerCapture(event.pointerId);
                            monthWheelDragRef.current = { isActive: true, startY: event.clientY };
                          }}
                          onPointerMove={(event) => {
                            event.preventDefault();
                            applyWheelDragStep(monthWheelDragRef, event.clientY, shiftDraftMonth);
                          }}
                          onPointerUp={(event) => {
                            event.preventDefault();
                            if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                              event.currentTarget.releasePointerCapture(event.pointerId);
                            }
                            monthWheelDragRef.current.isActive = false;
                          }}
                          onPointerCancel={(event) => {
                            event.preventDefault();
                            if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                              event.currentTarget.releasePointerCapture(event.pointerId);
                            }
                            monthWheelDragRef.current.isActive = false;
                          }}
                        >
                          <p className="px-2 pb-2 text-xs uppercase tracking-[0.14em] text-white/55">Mês</p>
                          <div className="flex h-28 flex-col items-center justify-center rounded-lg border border-white/10 bg-black/25">
                            <p className="text-xs text-white/45">{monthLabel(prevDraftMonth)}</p>
                            <p className="my-1 rounded-md border border-mystic-gold/45 bg-mystic-gold/20 px-4 py-1 text-lg font-semibold text-mystic-gold">
                              {monthLabel(draftRepeatUntilMonth)}
                            </p>
                            <p className="text-xs text-white/45">{monthLabel(nextDraftMonth)}</p>
                          </div>
                        </div>

                        <div
                          className="rounded-xl border border-white/10 bg-black/20 p-2"
                          style={{ touchAction: 'none' }}
                          onWheel={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            shiftDraftDay(event.deltaY > 0 ? 1 : -1);
                          }}
                          onPointerDown={(event) => {
                            event.preventDefault();
                            event.currentTarget.setPointerCapture(event.pointerId);
                            dayWheelDragRef.current = { isActive: true, startY: event.clientY };
                          }}
                          onPointerMove={(event) => {
                            event.preventDefault();
                            applyWheelDragStep(dayWheelDragRef, event.clientY, shiftDraftDay);
                          }}
                          onPointerUp={(event) => {
                            event.preventDefault();
                            if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                              event.currentTarget.releasePointerCapture(event.pointerId);
                            }
                            dayWheelDragRef.current.isActive = false;
                          }}
                          onPointerCancel={(event) => {
                            event.preventDefault();
                            if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                              event.currentTarget.releasePointerCapture(event.pointerId);
                            }
                            dayWheelDragRef.current.isActive = false;
                          }}
                        >
                          <p className="px-2 pb-2 text-xs uppercase tracking-[0.14em] text-white/55">Dia</p>
                          <div className="flex h-28 flex-col items-center justify-center rounded-lg border border-white/10 bg-black/25">
                            <p className="text-xs text-white/45">{prevDraftDay}</p>
                            <p className="my-1 rounded-md border border-mystic-gold/45 bg-mystic-gold/20 px-6 py-1 text-lg font-semibold text-mystic-gold">
                              {draftRepeatUntilDay}
                            </p>
                            <p className="text-xs text-white/45">{nextDraftDay}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}

                <div className="mt-4">
                  <button
                    type="button"
                    onClick={handleCreateAnnualTask}
                    className="rounded-lg border border-mystic-gold/45 bg-mystic-gold/20 px-4 py-2 text-sm font-medium text-mystic-gold hover:bg-mystic-gold/30"
                  >
                    Criar entrada anual
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <article className={cardClass}>
          <p className="text-xs uppercase tracking-[0.16em] text-white/55">Concluído</p>
          <p className="mt-2 text-2xl font-semibold text-white">{yearMetrics.totals.totalCompleted}</p>
        </article>
        <article className={cardClass}>
          <p className="text-xs uppercase tracking-[0.16em] text-white/55">Compromissos</p>
          <p className="mt-2 text-2xl font-semibold text-white">{yearMetrics.totals.commitments}</p>
        </article>
        <article className={cardClass}>
          <p className="text-xs uppercase tracking-[0.16em] text-white/55">Pontos</p>
          <p className="mt-2 text-2xl font-semibold text-white">{yearMetrics.totals.score}</p>
        </article>
        <article className={cardClass}>
          <p className="text-xs uppercase tracking-[0.16em] text-white/55">Dias ativos</p>
          <p className="mt-2 text-2xl font-semibold text-white">{yearMetrics.totals.activeDays}</p>
        </article>
        <article className={cardClass}>
          <p className="text-xs uppercase tracking-[0.16em] text-white/55">Média mensal</p>
          <p className="mt-2 text-2xl font-semibold text-white">{Math.round(yearMetrics.totals.score / 12)}</p>
        </article>
      </div>

      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <h3 className="text-sm uppercase tracking-[0.2em] text-white/60">Atividades operacionais por frequência</h3>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-white/10 bg-black/15 p-3">
            <p className="text-sm text-white">Anuais</p>
            <p className="mt-1 text-xs text-white/70">{recurrenceGroups.yearly.length} atividades</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/15 p-3">
            <p className="text-sm text-white">Mensais</p>
            <p className="mt-1 text-xs text-white/70">{recurrenceGroups.monthly.length} atividades</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/15 p-3">
            <p className="text-sm text-white">Semanais</p>
            <p className="mt-1 text-xs text-white/70">{recurrenceGroups.weekly.length} atividades</p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <h3 className="text-sm uppercase tracking-[0.2em] text-white/60">Meses do ano</h3>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {months.map(({ monthDate, metrics }) => (
            <article key={monthDate.getMonth()} className="rounded-xl border border-white/10 bg-black/15 p-3">
              <p className="text-sm font-medium text-white capitalize">
                {monthDate.toLocaleDateString('pt-BR', { month: 'long' })}
              </p>
              <p className="mt-1 text-xs text-white/65">{metrics.totals.totalCompleted} concluídos</p>
              <p className="text-xs text-white/65">{metrics.totals.commitments} compromissos</p>
              <p className="mt-2 text-sm text-mystic-gold">{metrics.totals.score} pontos</p>
            </article>
          ))}
        </div>
      </section>
    </TemporalLayout>
  );
};
