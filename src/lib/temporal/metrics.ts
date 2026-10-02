import {
  addDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  endOfYear,
  fromDayStamp,
  startOfMonth,
  startOfWeek,
  startOfYear,
  toDayStamp,
  type WeekStartsOn,
} from '@/lib/temporal/date';
import type { TemporalCommitment, TemporalEvent } from '@/lib/temporal/selectors';

export interface DayAggregate {
  dayStamp: number;
  date: Date;
  completedTasks: number;
  completedHabits: number;
  commitmentsCount: number;
  totalCompleted: number;
  score: number;
}

export interface IntervalMetrics {
  start: Date;
  end: Date;
  days: DayAggregate[];
  totals: {
    completedTasks: number;
    completedHabits: number;
    commitments: number;
    totalCompleted: number;
    score: number;
    activeDays: number;
  };
}

const createEmptyAggregate = (dayStamp: number): DayAggregate => ({
  dayStamp,
  date: fromDayStamp(dayStamp),
  completedTasks: 0,
  completedHabits: 0,
  commitmentsCount: 0,
  totalCompleted: 0,
  score: 0,
});

export const buildDayAggregates = (
  events: TemporalEvent[],
  commitments: TemporalCommitment[],
  start: Date,
  end: Date
): DayAggregate[] => {
  const map = new Map<number, DayAggregate>();

  eachDayOfInterval(start, end).forEach((day) => {
    const stamp = toDayStamp(day);
    if (stamp == null) return;
    map.set(stamp, createEmptyAggregate(stamp));
  });

  events.forEach((event) => {
    const target = map.get(event.dayStamp);
    if (!target) return;

    if (event.sourceType === 'task') {
      target.completedTasks += 1;
    }

    if (event.sourceType === 'habit') {
      target.completedHabits += 1;
    }

    target.totalCompleted += 1;
    target.score += event.score;
  });

  commitments.forEach((commitment) => {
    const target = map.get(commitment.dayStamp);
    if (!target) return;
    target.commitmentsCount += 1;
  });

  return Array.from(map.values()).sort((left, right) => left.dayStamp - right.dayStamp);
};

export const summarizeInterval = (start: Date, end: Date, days: DayAggregate[]): IntervalMetrics => {
  const totals = days.reduce(
    (acc, day) => {
      acc.completedTasks += day.completedTasks;
      acc.completedHabits += day.completedHabits;
      acc.commitments += day.commitmentsCount;
      acc.totalCompleted += day.totalCompleted;
      acc.score += day.score;
      if (day.totalCompleted > 0) {
        acc.activeDays += 1;
      }
      return acc;
    },
    {
      completedTasks: 0,
      completedHabits: 0,
      commitments: 0,
      totalCompleted: 0,
      score: 0,
      activeDays: 0,
    }
  );

  return {
    start,
    end,
    days,
    totals,
  };
};

export const getWeekMetrics = (
  events: TemporalEvent[],
  commitments: TemporalCommitment[],
  anchorDate: Date,
  weekStartsOn: WeekStartsOn
): IntervalMetrics => {
  const start = startOfWeek(anchorDate, weekStartsOn);
  const end = endOfWeek(anchorDate, weekStartsOn);
  const days = buildDayAggregates(events, commitments, start, end);
  return summarizeInterval(start, end, days);
};

export const getMonthMetrics = (
  events: TemporalEvent[],
  commitments: TemporalCommitment[],
  anchorDate: Date
): IntervalMetrics => {
  const start = startOfMonth(anchorDate);
  const end = endOfMonth(anchorDate);
  const days = buildDayAggregates(events, commitments, start, end);
  return summarizeInterval(start, end, days);
};

export const getYearMetrics = (
  events: TemporalEvent[],
  commitments: TemporalCommitment[],
  anchorDate: Date
): IntervalMetrics => {
  const start = startOfYear(anchorDate);
  const end = endOfYear(anchorDate);
  const days = buildDayAggregates(events, commitments, start, end);
  return summarizeInterval(start, end, days);
};

export interface MonthGridCell extends DayAggregate {
  isCurrentMonth: boolean;
}

export const getMonthGrid = (
  days: DayAggregate[],
  anchorDate: Date,
  weekStartsOn: WeekStartsOn
): MonthGridCell[] => {
  const monthStart = startOfMonth(anchorDate);
  const monthEnd = endOfMonth(anchorDate);
  const gridStart = startOfWeek(monthStart, weekStartsOn);
  const gridEnd = addDays(endOfWeek(monthEnd, weekStartsOn), 7);

  const map = new Map(days.map((day) => [day.dayStamp, day]));

  return eachDayOfInterval(gridStart, gridEnd).map((date) => {
    const stamp = toDayStamp(date);
    const monthIndex = anchorDate.getMonth();

    if (stamp == null) {
      return {
        ...createEmptyAggregate(0),
        isCurrentMonth: false,
      };
    }

    const aggregate = map.get(stamp) ?? createEmptyAggregate(stamp);
    return {
      ...aggregate,
      isCurrentMonth: date.getMonth() === monthIndex,
    };
  });
};
