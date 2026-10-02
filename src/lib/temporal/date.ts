export type WeekStartsOn = 0 | 1;

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export const toValidDate = (value: Date | string | number | null | undefined): Date | null => {
  if (value == null) return null;
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const startOfDay = (date: Date): Date => {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
};

export const toDayStamp = (value: Date | string | number | null | undefined): number | null => {
  const parsed = toValidDate(value);
  if (!parsed) return null;
  return startOfDay(parsed).getTime();
};

export const fromDayStamp = (dayStamp: number): Date => {
  const date = new Date(dayStamp);
  date.setHours(0, 0, 0, 0);
  return date;
};

export const addDays = (date: Date, amount: number): Date => {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
};

export const startOfWeek = (date: Date, weekStartsOn: WeekStartsOn): Date => {
  const normalized = startOfDay(date);
  const day = normalized.getDay();
  const diff = (day - weekStartsOn + 7) % 7;
  return addDays(normalized, -diff);
};

export const endOfWeek = (date: Date, weekStartsOn: WeekStartsOn): Date => {
  return addDays(startOfWeek(date, weekStartsOn), 6);
};

export const startOfMonth = (date: Date): Date => {
  return new Date(date.getFullYear(), date.getMonth(), 1);
};

export const endOfMonth = (date: Date): Date => {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
};

export const startOfYear = (date: Date): Date => {
  return new Date(date.getFullYear(), 0, 1);
};

export const endOfYear = (date: Date): Date => {
  return new Date(date.getFullYear(), 11, 31);
};

export const eachDayOfInterval = (start: Date, end: Date): Date[] => {
  const normalizedStart = startOfDay(start);
  const normalizedEnd = startOfDay(end);
  const totalDays = Math.floor((normalizedEnd.getTime() - normalizedStart.getTime()) / ONE_DAY_MS);

  if (totalDays < 0) return [];

  const days: Date[] = [];
  for (let index = 0; index <= totalDays; index += 1) {
    days.push(addDays(normalizedStart, index));
  }

  return days;
};

export const isWithinInterval = (value: Date, start: Date, end: Date): boolean => {
  const stamp = startOfDay(value).getTime();
  return stamp >= startOfDay(start).getTime() && stamp <= startOfDay(end).getTime();
};
