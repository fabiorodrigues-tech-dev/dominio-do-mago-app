import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useAppStore } from '@/stores/appStore';
import {
  addDays,
  buildTemporalCommitments,
  buildTemporalEvents,
  endOfWeek,
  getWeekMetrics,
  startOfWeek,
  useWeekStartsOnPreference,
} from '@/lib/temporal';
import { WEEKDAYS_SHORT } from '@/constants';
import { TemporalLayout } from '@/pages/temporal/TemporalLayout';
import { DayDetailsDialog } from '@/components/temporal/DayDetailsDialog';

const formatDate = (date: Date): string => {
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
};

const summaryCardClass = 'rounded-2xl border border-white/10 bg-white/[0.03] p-4';

export const TemporalWeekPage: React.FC = () => {
  const [anchorDate, setAnchorDate] = useState(new Date());
  const { weekStartsOn, setWeekStartsOn } = useWeekStartsOnPreference();
  const [selectedDayStamp, setSelectedDayStamp] = useState<number | null>(null);

  const tasks = useAppStore((state) => state.tasks);
  const habits = useAppStore((state) => state.habits);
  const cycleSequences = useAppStore((state) => state.cycleSequences);
  const projects = useAppStore((state) => state.projects);
  const quests = useAppStore((state) => state.quests);
  const streak = useAppStore((state) => state.user.streak);

  const snapshot = useMemo(
    () => ({ tasks, habits, cycleSequences, projects, quests }),
    [tasks, habits, cycleSequences, projects, quests]
  );

  const events = useMemo(() => buildTemporalEvents(snapshot), [snapshot]);

  const weekCommitments = useMemo(() => {
    const start = startOfWeek(anchorDate, weekStartsOn);
    const end = endOfWeek(anchorDate, weekStartsOn);
    return buildTemporalCommitments(snapshot, start, end);
  }, [anchorDate, snapshot, weekStartsOn]);

  const interval = useMemo(() => {
    return getWeekMetrics(events, weekCommitments, anchorDate, weekStartsOn);
  }, [anchorDate, events, weekCommitments, weekStartsOn]);

  const selectedDayAggregate = useMemo(
    () => interval.days.find((day) => day.dayStamp === selectedDayStamp) ?? null,
    [interval.days, selectedDayStamp]
  );

  const selectedDayEvents = useMemo(
    () => events.filter((event) => event.dayStamp === selectedDayStamp),
    [events, selectedDayStamp]
  );

  const selectedDayCommitments = useMemo(
    () => weekCommitments.filter((item) => item.dayStamp === selectedDayStamp),
    [selectedDayStamp, weekCommitments]
  );

  return (
    <TemporalLayout
      title="Temporal - Semana"
      subtitle="Operacional semanal com progresso diário e compromissos"
      actions={
        <div className="inline-flex rounded-lg border border-white/20 bg-white/5 p-1 text-xs">
          <button
            type="button"
            onClick={() => setWeekStartsOn(0)}
            className={`rounded-md px-2 py-1 ${weekStartsOn === 0 ? 'bg-mystic-gold/20 text-mystic-gold' : 'text-white/70'}`}
          >
            Dom
          </button>
          <button
            type="button"
            onClick={() => setWeekStartsOn(1)}
            className={`rounded-md px-2 py-1 ${weekStartsOn === 1 ? 'bg-mystic-gold/20 text-mystic-gold' : 'text-white/70'}`}
          >
            Seg
          </button>
        </div>
      }
    >
      <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-3">
        <button
          type="button"
          onClick={() => setAnchorDate((current) => addDays(current, -7))}
          className="rounded-lg border border-white/20 p-2 text-white/80 hover:bg-white/10"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div className="text-center">
          <p className="text-xs uppercase tracking-[0.2em] text-white/50">Semana atual</p>
          <p className="text-sm text-white">
            {formatDate(interval.start)} ate {formatDate(interval.end)}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setAnchorDate((current) => addDays(current, 7))}
          className="rounded-lg border border-white/20 p-2 text-white/80 hover:bg-white/10"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <article className={summaryCardClass}>
          <p className="text-xs uppercase tracking-[0.16em] text-white/55">Tarefas</p>
          <p className="mt-2 text-2xl font-semibold text-white">{interval.totals.completedTasks}</p>
        </article>
        <article className={summaryCardClass}>
          <p className="text-xs uppercase tracking-[0.16em] text-white/55">Hábitos</p>
          <p className="mt-2 text-2xl font-semibold text-white">{interval.totals.completedHabits}</p>
        </article>
        <article className={summaryCardClass}>
          <p className="text-xs uppercase tracking-[0.16em] text-white/55">Pontuação</p>
          <p className="mt-2 text-2xl font-semibold text-white">{interval.totals.score}</p>
        </article>
        <article className={summaryCardClass}>
          <p className="text-xs uppercase tracking-[0.16em] text-white/55">Streak</p>
          <p className="mt-2 text-2xl font-semibold text-white">{streak}</p>
        </article>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {interval.days.map((day) => {
          const intensity = Math.min(day.totalCompleted, 6);
          const intensityClass = ['bg-white/10', 'bg-emerald-500/25', 'bg-emerald-500/35', 'bg-emerald-500/50', 'bg-emerald-500/65', 'bg-emerald-500/75', 'bg-emerald-500/90'][intensity] || 'bg-white/10';

          return (
            <button
              type="button"
              key={day.dayStamp}
              onClick={() => setSelectedDayStamp(day.dayStamp)}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left transition-colors hover:border-mystic-gold/40"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-white/55">{WEEKDAYS_SHORT[new Date(day.dayStamp).getDay()]}</p>
                  <p className="text-lg font-semibold text-white">{formatDate(new Date(day.dayStamp))}</p>
                </div>
                <span className={`h-3 w-3 rounded-full ${intensityClass}`} />
              </div>

              <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-lg border border-white/10 bg-black/20 px-2 py-1.5">
                  <dt className="text-white/55">Concluído</dt>
                  <dd className="font-medium text-white">{day.totalCompleted}</dd>
                </div>
                <div className="rounded-lg border border-white/10 bg-black/20 px-2 py-1.5">
                  <dt className="text-white/55">Compromissos</dt>
                  <dd className="font-medium text-white">{day.commitmentsCount}</dd>
                </div>
                <div className="rounded-lg border border-white/10 bg-black/20 px-2 py-1.5">
                  <dt className="text-white/55">Tarefas</dt>
                  <dd className="font-medium text-white">{day.completedTasks}</dd>
                </div>
                <div className="rounded-lg border border-white/10 bg-black/20 px-2 py-1.5">
                  <dt className="text-white/55">Pontos</dt>
                  <dd className="font-medium text-white">{day.score}</dd>
                </div>
              </dl>
            </button>
          );
        })}
      </div>

      <DayDetailsDialog
        open={selectedDayStamp != null}
        onOpenChange={(open) => {
          if (!open) setSelectedDayStamp(null);
        }}
        date={selectedDayAggregate?.date ?? null}
        aggregate={selectedDayAggregate}
        events={selectedDayEvents}
        commitments={selectedDayCommitments}
      />
    </TemporalLayout>
  );
};
