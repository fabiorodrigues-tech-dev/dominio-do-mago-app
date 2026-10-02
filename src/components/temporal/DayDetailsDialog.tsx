import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { DayAggregate, TemporalCommitment, TemporalEvent } from '@/lib/temporal';

interface DayDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: Date | null;
  aggregate: DayAggregate | null;
  events: TemporalEvent[];
  commitments: TemporalCommitment[];
}

export const DayDetailsDialog: React.FC<DayDetailsDialogProps> = ({
  open,
  onOpenChange,
  date,
  aggregate,
  events,
  commitments,
}) => {
  const getCommitmentSourceLabel = (sourceType: TemporalCommitment['sourceType']) => {
    if (sourceType === 'commitment') return 'Compromisso';
    if (sourceType === 'habit') return 'Hábito';
    if (sourceType === 'sequence') return 'Sequência';
    if (sourceType === 'project') return 'Projeto';
    if (sourceType === 'quest') return 'Jornada';
    if (sourceType === 'mission') return 'Missão';
    if (sourceType === 'google') return 'Google Agenda';
    return sourceType;
  };

  const getCommitmentKindLabel = (kind: TemporalCommitment['kind']) => {
    if (kind === 'due') return 'Vencimento';
    if (kind === 'external') return 'Evento externo';
    return 'Recorrente';
  };

  const dateLabel = date
    ? date.toLocaleDateString('pt-BR', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : 'Dia selecionado';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto border-white/20 bg-void/95 text-white backdrop-blur-xl sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="capitalize">{dateLabel}</DialogTitle>
        </DialogHeader>

        {aggregate ? (
          <section className="grid grid-cols-2 gap-2 text-sm">
            <article className="rounded-lg border border-white/15 bg-black/20 p-2">
              <p className="text-white/60">Concluidos</p>
              <p className="text-lg font-semibold text-white">{aggregate.totalCompleted}</p>
            </article>
            <article className="rounded-lg border border-white/15 bg-black/20 p-2">
              <p className="text-white/60">Compromissos</p>
              <p className="text-lg font-semibold text-white">{aggregate.commitmentsCount}</p>
            </article>
            <article className="rounded-lg border border-white/15 bg-black/20 p-2">
              <p className="text-white/60">Tarefas</p>
              <p className="text-lg font-semibold text-white">{aggregate.completedTasks}</p>
            </article>
            <article className="rounded-lg border border-white/15 bg-black/20 p-2">
              <p className="text-white/60">Pontos</p>
              <p className="text-lg font-semibold text-white">{aggregate.score}</p>
            </article>
          </section>
        ) : null}

        <section className="space-y-2">
          <h4 className="text-xs uppercase tracking-[0.18em] text-white/60">Eventos concluídos</h4>
          {events.length === 0 ? (
            <p className="text-sm text-white/60">Sem conclusões neste dia.</p>
          ) : (
            events.map((event) => (
              <article key={event.id} className="rounded-lg border border-white/10 bg-black/15 px-3 py-2">
                <p className="text-sm text-white">{event.title}</p>
                <p className="text-xs text-white/60">
                  {event.sourceType === 'task' ? 'Tarefa' : 'Hábito'} • {event.score} pontos
                </p>
              </article>
            ))
          )}
        </section>

        <section className="space-y-2">
          <h4 className="text-xs uppercase tracking-[0.18em] text-white/60">Compromissos</h4>
          {commitments.length === 0 ? (
            <p className="text-sm text-white/60">Sem compromissos para esta data.</p>
          ) : (
            commitments.map((item) => (
              <article key={item.id} className="rounded-lg border border-white/10 bg-black/15 px-3 py-2">
                <p className="text-sm text-white">{item.title}</p>
                <p className="text-xs text-white/60">
                  {getCommitmentSourceLabel(item.sourceType)} • {getCommitmentKindLabel(item.kind)}
                </p>
              </article>
            ))
          )}
        </section>
      </DialogContent>
    </Dialog>
  );
};
