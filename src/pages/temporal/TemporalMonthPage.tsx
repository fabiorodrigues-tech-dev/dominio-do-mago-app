import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useAppStore } from '@/stores/appStore';
import {
  buildTemporalCommitments,
  buildTemporalEvents,
  endOfMonth,
  getMonthMetrics,
  startOfMonth,
  toDayStamp,
  useWeekStartsOnPreference,
} from '@/lib/temporal';
import { TemporalLayout } from '@/pages/temporal/TemporalLayout';
import { DayDetailsDialog } from '@/components/temporal/DayDetailsDialog';

const summaryCardClass = 'rounded-2xl border border-white/10 bg-white/[0.03] p-4';

const formatMonthLabel = (date: Date): string => {
  return date.toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  });
};

export const TemporalMonthPage: React.FC = () => {
  const [anchorDate, setAnchorDate] = useState(new Date());
  const { weekStartsOn } = useWeekStartsOnPreference();
  const [selectedDayStamp, setSelectedDayStamp] = useState<number | null>(null);

  const tasks = useAppStore((state) => state.tasks);
  const habits = useAppStore((state) => state.habits);
  const cycleSequences = useAppStore((state) => state.cycleSequences);
  const projects = useAppStore((state) => state.projects);
  const quests = useAppStore((state) => state.quests);

  const snapshot = useMemo(
    () => ({ tasks, habits, cycleSequences, projects, quests }),
    [tasks, habits, cycleSequences, projects, quests]
  );

  const events = useMemo(() => buildTemporalEvents(snapshot), [snapshot]);

  const interval = useMemo(() => {
    const start = startOfMonth(anchorDate);
    const end = endOfMonth(anchorDate);
    const commitments = buildTemporalCommitments(snapshot, start, end);
    return getMonthMetrics(events, commitments, anchorDate);
  }, [anchorDate, events, snapshot]);

  const monthCommitments = useMemo(() => {
    const start = startOfMonth(anchorDate);
    const end = endOfMonth(anchorDate);
    return buildTemporalCommitments(snapshot, start, end);
  }, [anchorDate, snapshot]);

  const bestDay = useMemo(() => {
    return interval.days.reduce((best, current) => {
      if (!best) return current;
      if (current.score > best.score) return current;
      return best;
    }, null as (typeof interval.days)[number] | null);
  }, [interval.days]);

  const selectedDayAggregate = useMemo(
    () => interval.days.find((day) => day.dayStamp === selectedDayStamp) ?? null,
    [interval.days, selectedDayStamp]
  );

  const selectedDayEvents = useMemo(
    () => events.filter((event) => event.dayStamp === selectedDayStamp),
    [events, selectedDayStamp]
  );

  const selectedDayCommitments = useMemo(
    () => monthCommitments.filter((item) => item.dayStamp === selectedDayStamp),
    [monthCommitments, selectedDayStamp]
  );

  return (
    <TemporalLayout
      title="Temporal - Mês"
      subtitle={`Visão operacional mensal (semana inicia em ${weekStartsOn === 0 ? 'domingo' : 'segunda'})`}
    >
      <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-3">
        <button
          type="button"
          onClick={() => setAnchorDate((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}
          className="rounded-lg border border-white/20 p-2 text-white/80 hover:bg-white/10"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <p className="text-sm font-medium text-white capitalize">{formatMonthLabel(anchorDate)}</p>
        <button
          type="button"
          onClick={() => setAnchorDate((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}
          className="rounded-lg border border-white/20 p-2 text-white/80 hover:bg-white/10"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <article className={summaryCardClass}>
          <p className="text-xs uppercase tracking-[0.16em] text-white/55">Concluído</p>
          <p className="mt-2 text-2xl font-semibold text-white">{interval.totals.totalCompleted}</p>
        </article>
        <article className={summaryCardClass}>
          <p className="text-xs uppercase tracking-[0.16em] text-white/55">Compromissos</p>
          <p className="mt-2 text-2xl font-semibold text-white">{interval.totals.commitments}</p>
        </article>
        <article className={summaryCardClass}>
          <p className="text-xs uppercase tracking-[0.16em] text-white/55">Pontuação</p>
          <p className="mt-2 text-2xl font-semibold text-white">{interval.totals.score}</p>
        </article>
        <article className={summaryCardClass}>
          <p className="text-xs uppercase tracking-[0.16em] text-white/55">Dias ativos</p>
          <p className="mt-2 text-2xl font-semibold text-white">{interval.totals.activeDays}</p>
        </article>
      </div>

      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <h3 className="text-sm uppercase tracking-[0.2em] text-white/60">Resumo diário do mês</h3>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {interval.days.map((day) => {
            const date = new Date(day.dayStamp);
            const intensity = day.totalCompleted > 0 ? 'border-emerald-400/40 bg-emerald-500/10' : 'border-white/10 bg-black/10';
            return (
              <button
                type="button"
                key={day.dayStamp}
                onClick={() => setSelectedDayStamp(day.dayStamp)}
                className={`rounded-xl border p-3 text-left transition-colors hover:border-mystic-gold/40 ${intensity}`}
              >
                <p className="text-xs text-white/55">{date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</p>
                <p className="mt-1 text-sm text-white">{day.totalCompleted} concluídos</p>
                <p className="text-xs text-white/70">{day.commitmentsCount} compromissos</p>
              </button>
            );
          })}
        </div>
      </section>

      {bestDay && toDayStamp(bestDay.date) != null ? (
        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <h3 className="text-sm uppercase tracking-[0.2em] text-white/60">Melhor dia do mês</h3>
          <p className="mt-2 text-white">
            {bestDay.date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} com {bestDay.score} pontos.
          </p>
        </section>
      ) : null}

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
