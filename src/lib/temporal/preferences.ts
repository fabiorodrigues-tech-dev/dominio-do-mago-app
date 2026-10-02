import { useEffect, useState } from 'react';
import type { WeekStartsOn } from '@/lib/temporal/date';

const WEEK_STARTS_ON_KEY = 'ce:temporal:week-starts-on';
const WEEK_STARTS_ON_EVENT = 'ce:temporal:week-starts-on:changed';

const isWeekStartsOn = (value: unknown): value is WeekStartsOn => {
  return value === 0 || value === 1;
};

export const getWeekStartsOnPreference = (): WeekStartsOn => {
  if (typeof window === 'undefined') return 0;

  const raw = window.localStorage.getItem(WEEK_STARTS_ON_KEY);
  if (raw == null) return 0;

  const parsed = Number(raw);
  return isWeekStartsOn(parsed) ? parsed : 0;
};

export const setWeekStartsOnPreference = (value: WeekStartsOn): void => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(WEEK_STARTS_ON_KEY, String(value));
  window.dispatchEvent(new CustomEvent<WeekStartsOn>(WEEK_STARTS_ON_EVENT, { detail: value }));
};

export const useWeekStartsOnPreference = () => {
  const [weekStartsOn, setWeekStartsOn] = useState<WeekStartsOn>(() => getWeekStartsOnPreference());

  useEffect(() => {
    const syncFromStorage = () => {
      setWeekStartsOn(getWeekStartsOnPreference());
    };

    const onCustomEvent = (event: Event) => {
      const customEvent = event as CustomEvent<WeekStartsOn>;
      if (customEvent.detail === 0 || customEvent.detail === 1) {
        setWeekStartsOn(customEvent.detail);
        return;
      }
      syncFromStorage();
    };

    window.addEventListener('storage', syncFromStorage);
    window.addEventListener(WEEK_STARTS_ON_EVENT, onCustomEvent);

    return () => {
      window.removeEventListener('storage', syncFromStorage);
      window.removeEventListener(WEEK_STARTS_ON_EVENT, onCustomEvent);
    };
  }, []);

  const updatePreference = (value: WeekStartsOn) => {
    setWeekStartsOnPreference(value);
    setWeekStartsOn(value);
  };

  return {
    weekStartsOn,
    setWeekStartsOn: updatePreference,
  };
};
