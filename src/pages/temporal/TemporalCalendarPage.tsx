import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useAppStore } from '@/stores/appStore';
import {
  addDays,
  buildDayAggregates,
  buildOwnTemporalCommitments,
  buildTemporalEvents,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  startOfDay,
  startOfMonth,
  startOfWeek,
  toDayStamp,
  useWeekStartsOnPreference,
} from '@/lib/temporal';
import type { TemporalCommitment } from '@/lib/temporal';
import type { Commitment, CommitmentRecurrence } from '@/types';
import { WEEKDAYS_SHORT, getMoonPhase, getMeteorShowerPeak, getZodiacIngress, getZodiacIngresses, getZodiacSign } from '@/constants';
import { TemporalLayout } from '@/pages/temporal/TemporalLayout';
import { DayDetailsDialog } from '@/components/temporal/DayDetailsDialog';
import {
  isGoogleCalendarIntegrationEnabled,
  listGoogleCalendarEventsCache,
} from '@/services/googleCalendarIntegration';

const getCommitmentDots = (count: number): number[] => {
  if (count <= 0) return [];
  if (count === 1) return [1];
  if (count === 2) return [1, 2];
  return [1, 2, 3];
};

type ZodiacIngressEntry = {
  date: Date;
  name: string;
  icon: string;
  planet: string;
};

const ZODIAC_PLANETS = ['Todos', 'Sol', 'Lua', 'Mercúrio', 'Vênus', 'Marte', 'Júpiter', 'Saturno', 'Urano', 'Netuno', 'Plutão'];

export const TemporalCalendarPage: React.FC = () => {
  const [anchorDate, setAnchorDate] = useState(new Date());
  const { weekStartsOn } = useWeekStartsOnPreference();
  const [selectedDayStamp, setSelectedDayStamp] = useState<number | null>(null);
  const [selectedIngressPlanet, setSelectedIngressPlanet] = useState('Todos');
  const [showCommitmentForm, setShowCommitmentForm] = useState(false);
  const [editingCommitmentId, setEditingCommitmentId] = useState<string | null>(null);
  const [commitmentTitle, setCommitmentTitle] = useState('');
  const [commitmentDate, setCommitmentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [commitmentRecurrence, setCommitmentRecurrence] = useState<CommitmentRecurrence>('ONCE');
  const [googleCommitments, setGoogleCommitments] = useState<TemporalCommitment[]>([]);

  const tasks = useAppStore((state) => state.tasks);
  const habits = useAppStore((state) => state.habits);
  const cycleSequences = useAppStore((state) => state.cycleSequences);
  const projects = useAppStore((state) => state.projects);
  const quests = useAppStore((state) => state.quests);
  const commitments = useAppStore((state) => state.commitments);
  const addCommitment = useAppStore((state) => state.addCommitment);
  const updateCommitment = useAppStore((state) => state.updateCommitment);
  const deleteCommitment = useAppStore((state) => state.deleteCommitment);

  const snapshot = useMemo(
    () => ({ tasks, habits, cycleSequences, projects, quests }),
    [tasks, habits, cycleSequences, projects, quests]
  );

  const events = useMemo(() => buildTemporalEvents(snapshot), [snapshot]);

  const gridWindow = useMemo(() => {
    const monthStart = startOfMonth(anchorDate);
    const monthEnd = endOfMonth(anchorDate);
    const gridStart = startOfWeek(monthStart, weekStartsOn);
    const gridEnd = endOfWeek(addDays(monthEnd, 7), weekStartsOn);

    return {
      monthStart,
      monthEnd,
      gridStart,
      gridEnd,
    };
  }, [anchorDate, weekStartsOn]);

  const internalCommitments = useMemo(
    () => buildOwnTemporalCommitments(commitments, gridWindow.gridStart, gridWindow.gridEnd),
    [commitments, gridWindow.gridStart, gridWindow.gridEnd]
  );

  const resetCommitmentForm = () => {
    setCommitmentTitle('');
    setCommitmentDate(new Date().toISOString().slice(0, 10));
    setCommitmentRecurrence('ONCE');
    setEditingCommitmentId(null);
    setShowCommitmentForm(false);
  };

  const handleCommitmentSubmit = () => {
    if (!commitmentTitle.trim() || !commitmentDate) return;
    const input = { title: commitmentTitle, date: new Date(`${commitmentDate}T12:00:00`), recurrence: commitmentRecurrence };
    if (editingCommitmentId) {
      updateCommitment(editingCommitmentId, input);
    } else {
      addCommitment(input);
    }
    resetCommitmentForm();
  };

  const startEditingCommitment = (commitment: Commitment) => {
    setEditingCommitmentId(commitment.id);
    setCommitmentTitle(commitment.title);
    setCommitmentDate(new Date(commitment.date).toISOString().slice(0, 10));
    setCommitmentRecurrence(commitment.recurrence);
    setShowCommitmentForm(true);
  };

  useEffect(() => {
    let isCancelled = false;

    const loadGoogleCommitments = async () => {
      if (!isGoogleCalendarIntegrationEnabled()) {
        if (!isCancelled) setGoogleCommitments([]);
        return;
      }

      try {
        const rows = await listGoogleCalendarEventsCache({
          startIso: gridWindow.gridStart.toISOString(),
          endIso: gridWindow.gridEnd.toISOString(),
        });

        if (isCancelled) return;

        const mapped: TemporalCommitment[] = rows
          .map((row) => {
            if (!row.starts_at) return null;
            const startsAt = new Date(row.starts_at);
            if (Number.isNaN(startsAt.getTime())) return null;

            const dayStamp = toDayStamp(startsAt);
            if (dayStamp == null) return null;

            return {
              id: `google:${row.id}`,
              sourceType: 'google',
              sourceId: row.id,
              title: row.title ?? 'Evento Google Agenda',
              date: startOfDay(startsAt),
              dayStamp,
              kind: 'external',
            };
          })
          .filter((item): item is TemporalCommitment => item != null);

        setGoogleCommitments(mapped);
      } catch {
        if (!isCancelled) {
          setGoogleCommitments([]);
        }
      }
    };

    void loadGoogleCommitments();

    return () => {
      isCancelled = true;
    };
  }, [gridWindow.gridEnd, gridWindow.gridStart]);

  const combinedCommitments = useMemo(
    () => [...internalCommitments, ...googleCommitments],
    [internalCommitments, googleCommitments]
  );

  const grid = useMemo(() => {
    const days = buildDayAggregates(events, combinedCommitments, gridWindow.gridStart, gridWindow.gridEnd);

    return {
      monthStart: gridWindow.monthStart,
      monthEnd: gridWindow.monthEnd,
      days,
      gridStart: gridWindow.gridStart,
      gridEnd: gridWindow.gridEnd,
    };
  }, [combinedCommitments, events, gridWindow.gridEnd, gridWindow.gridStart, gridWindow.monthEnd, gridWindow.monthStart]);

  const selectedMonthCommitments = useMemo(() => {
    const monthCommitments = combinedCommitments.filter((item) => {
      const month = item.date.getMonth();
      const year = item.date.getFullYear();
      return month === grid.monthStart.getMonth() && year === grid.monthStart.getFullYear();
    });
    return monthCommitments;
  }, [combinedCommitments, grid.monthStart]);

  const ownMonthCommitments = useMemo(
    () => selectedMonthCommitments.filter((item) => item.sourceType === 'commitment'),
    [selectedMonthCommitments]
  );

  const zodiacIngressesInMonth = useMemo(() => {
    return getZodiacIngresses(grid.monthStart, grid.monthEnd) satisfies ZodiacIngressEntry[];
  }, [grid.monthEnd, grid.monthStart]);

  const filteredZodiacIngresses = useMemo(
    () => selectedIngressPlanet === 'Todos'
      ? zodiacIngressesInMonth
      : zodiacIngressesInMonth.filter((entry) => entry.planet === selectedIngressPlanet),
    [selectedIngressPlanet, zodiacIngressesInMonth]
  );

  const daysByStamp = useMemo(() => new Map(grid.days.map((day) => [day.dayStamp, day])), [grid.days]);

  const selectedDayAggregate = useMemo(
    () => grid.days.find((day) => day.dayStamp === selectedDayStamp) ?? null,
    [grid.days, selectedDayStamp]
  );

  const selectedDayEvents = useMemo(
    () => events.filter((event) => event.dayStamp === selectedDayStamp),
    [events, selectedDayStamp]
  );

  const selectedDayCommitments = useMemo(
    () => selectedMonthCommitments.filter((item) => item.dayStamp === selectedDayStamp),
    [selectedDayStamp, selectedMonthCommitments]
  );

  const weeks = useMemo(() => {
    const rows: Date[][] = [];
    let cursor = new Date(grid.gridStart);

    while (cursor <= grid.gridEnd) {
      const row = eachDayOfInterval(cursor, addDays(cursor, 6));
      rows.push(row);
      cursor = addDays(cursor, 7);
    }

    return rows;
  }, [grid.gridEnd, grid.gridStart]);

  return (
    <TemporalLayout
      title="Temporal - Calendário"
      subtitle="Meses com bolinhas de compromissos por data"
    >
      <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-3">
        <button
          type="button"
          onClick={() => setAnchorDate((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}
          className="rounded-lg border border-white/20 p-2 text-white/80 hover:bg-white/10"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <p className="text-sm font-medium text-white capitalize">
          {anchorDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
        </p>
        <button
          type="button"
          onClick={() => setAnchorDate((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}
          className="rounded-lg border border-white/20 p-2 text-white/80 hover:bg-white/10"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 sm:p-4">
        <div className="mb-2 grid grid-cols-7 gap-1">
          {WEEKDAYS_SHORT.map((label) => (
            <p key={label} className="text-center text-xs uppercase tracking-[0.14em] text-white/55">
              {label}
            </p>
          ))}
        </div>

        <div className="space-y-1">
          {weeks.map((week, rowIndex) => (
            <div key={rowIndex} className="grid grid-cols-7 gap-1">
              {week.map((date) => {
                const stamp = toDayStamp(date);
                if (stamp == null) return null;
                const day = daysByStamp.get(stamp);
                const isCurrentMonth = date.getMonth() === anchorDate.getMonth();
                const dots = getCommitmentDots(day?.commitmentsCount ?? 0);
                const moonPhase = getMoonPhase(date);
                const meteorPeak = getMeteorShowerPeak(date);
                const zodiacIngress = getZodiacIngress(date);
                const zodiacSign = getZodiacSign(date);

                return (
                  <button
                    type="button"
                    key={stamp}
                    onClick={() => setSelectedDayStamp(stamp)}
                    className={`min-h-[72px] rounded-lg border p-1.5 ${
                      isCurrentMonth ? 'border-white/15 bg-black/20' : 'border-white/5 bg-black/10'
                    } text-left transition-colors hover:border-mystic-gold/40`}
                  >
                    <p className={`text-right text-xs ${isCurrentMonth ? 'text-white/80' : 'text-white/35'}`}>
                      {date.getDate()}
                    </p>

                    <div
                      className="mt-1 flex justify-center gap-1"
                      title={
                        `${moonPhase.name} • Signo: ${zodiacSign.name}` +
                        (meteorPeak ? ` • ${meteorPeak.name}` : '') +
                        (zodiacIngress ? ` • ${zodiacIngress.name}` : '')
                      }
                      aria-label={
                        `${moonPhase.name}. Signo: ${zodiacSign.name}.` +
                        (meteorPeak ? ` ${meteorPeak.name}.` : '') +
                        (zodiacIngress ? ` ${zodiacIngress.name}.` : '')
                      }
                    >
                      <span className={`text-sm ${isCurrentMonth ? 'opacity-95' : 'opacity-50'}`}>{moonPhase.icon}</span>
                      {meteorPeak ? (
                        <span className={`text-sm ${isCurrentMonth ? 'opacity-95' : 'opacity-50'}`}>{meteorPeak.icon}</span>
                      ) : null}
                      {zodiacIngress ? (
                        <span className={`text-sm ${isCurrentMonth ? 'opacity-95' : 'opacity-50'}`}>{zodiacIngress.icon}</span>
                      ) : null}
                    </div>

                    <div className="mt-2 flex items-center justify-center gap-1">
                      {dots.map((dot) => (
                        <span key={`${stamp}-${dot}`} className="h-1.5 w-1.5 rounded-full bg-mystic-gold/90" />
                      ))}
                    </div>

                    <p className="mt-2 text-center text-[10px] text-white/45">
                      {day?.totalCompleted ?? 0} done
                    </p>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm uppercase tracking-[0.2em] text-white/60">Entradas de signo no mês</h3>
            <p className="mt-1 text-xs text-white/45">Filtre as entradas pelo planeta em trânsito.</p>
          </div>
          <label className="flex items-center gap-2 text-xs text-white/60">
            <span>Planeta</span>
            <select
              value={selectedIngressPlanet}
              onChange={(event) => setSelectedIngressPlanet(event.target.value)}
              className="rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-mystic-gold/60"
            >
              {ZODIAC_PLANETS.map((planet) => (
                <option key={planet} value={planet} className="bg-slate-900 text-white">
                  {planet}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
          {filteredZodiacIngresses.length === 0 ? (
            <p className="text-sm text-white/60">
              {zodiacIngressesInMonth.length === 0
                ? 'Sem entradas de signo mapeadas neste mês.'
                : `Nenhuma entrada de ${selectedIngressPlanet} neste mês.`}
            </p>
          ) : (
            filteredZodiacIngresses.map((entry) => (
              <article key={entry.date.toISOString()} className="rounded-xl border border-white/10 bg-black/15 px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm text-white">{entry.icon} {entry.name}</p>
                  <span className="rounded-full border border-mystic-gold/30 px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-mystic-gold/80">
                    {entry.planet}
                  </span>
                </div>
                <p className="text-xs text-white/60">{entry.date.toLocaleDateString('pt-BR')}</p>
              </article>
            ))
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm uppercase tracking-[0.2em] text-white/60">Compromissos do mês</h3>
            <p className="mt-1 text-xs text-white/45">Compromissos independentes de treinos, hábitos e ciclos.</p>
          </div>
          <button
            type="button"
            onClick={() => setShowCommitmentForm((current) => !current)}
            className="rounded-lg border border-mystic-gold/40 px-3 py-2 text-sm text-mystic-gold hover:bg-mystic-gold/10"
          >
            {showCommitmentForm ? 'Fechar' : 'Novo compromisso'}
          </button>
        </div>

        {showCommitmentForm ? (
          <div className="mt-4 grid gap-3 rounded-xl border border-white/10 bg-black/20 p-3 md:grid-cols-[1fr_auto_auto_auto] md:items-end">
            <label className="text-xs text-white/60">
              Nome
              <input value={commitmentTitle} onChange={(event) => setCommitmentTitle(event.target.value)} placeholder="Ex.: Consulta médica" className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-mystic-gold/60" />
            </label>
            <label className="text-xs text-white/60">
              Data
              <input type="date" value={commitmentDate} onChange={(event) => setCommitmentDate(event.target.value)} className="mt-1 rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-mystic-gold/60" />
            </label>
            <label className="text-xs text-white/60">
              Recorrência
              <select value={commitmentRecurrence} onChange={(event) => setCommitmentRecurrence(event.target.value as CommitmentRecurrence)} className="mt-1 rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-mystic-gold/60">
                <option value="ONCE" className="bg-slate-900">Não recorrente</option>
                <option value="DAILY" className="bg-slate-900">Diária</option>
                <option value="WEEKLY" className="bg-slate-900">Semanal</option>
                <option value="MONTHLY" className="bg-slate-900">Mensal</option>
              </select>
            </label>
            <button type="button" onClick={handleCommitmentSubmit} className="rounded-lg bg-mystic-gold px-3 py-2 text-sm font-medium text-black hover:bg-mystic-gold/80">
              {editingCommitmentId ? 'Salvar' : 'Adicionar'}
            </button>
          </div>
        ) : null}

        <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
          {ownMonthCommitments.length === 0 ? (
            <p className="text-sm text-white/60">Nenhum compromisso próprio neste mês.</p>
          ) : (
            ownMonthCommitments.map((item) => {
              const source = commitments.find((commitment) => commitment.id === item.sourceId);
              return (
                <article key={item.id} className="rounded-xl border border-white/10 bg-black/15 px-3 py-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm text-white">{item.title}</p>
                      <p className="text-xs text-white/60">
                        {item.date.toLocaleDateString('pt-BR')} • {source?.recurrence === 'ONCE' ? 'não recorrente' : 'recorrente'}
                      </p>
                    </div>
                    {source ? (
                      <div className="flex gap-1">
                        <button type="button" onClick={() => startEditingCommitment(source)} className="rounded-md border border-white/15 px-2 py-1 text-xs text-white/70 hover:bg-white/10">Editar</button>
                        <button type="button" onClick={() => deleteCommitment(source.id)} className="rounded-md border border-red-400/30 px-2 py-1 text-xs text-red-300 hover:bg-red-400/10">Excluir</button>
                      </div>
                    ) : null}
                  </div>
                </article>
              );
            })
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <h3 className="text-sm uppercase tracking-[0.2em] text-white/60">Outros prazos e eventos</h3>
        <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
          {selectedMonthCommitments.length === 0 ? (
            <p className="text-sm text-white/60">Nenhum compromisso encontrado para este mês.</p>
          ) : (
            selectedMonthCommitments.slice(0, 16).map((item) => (
              <article key={item.id} className="rounded-xl border border-white/10 bg-black/15 px-3 py-2">
                <p className="text-sm text-white">{item.title}</p>
                <p className="text-xs text-white/60">
                  {item.date.toLocaleDateString('pt-BR')} • {item.kind === 'due' ? 'vencimento' : 'recorrente'}
                </p>
              </article>
            ))
          )}
        </div>
      </section>

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
