import React, { useState } from 'react';
import { AppLayout } from '@/components/layout';
import { getMoonPhase } from '@/constants';

export const Lua: React.FC = () => {
  const [selectedDate] = useState(new Date());
  const [userLatitude] = useState<number | null>(() => {
    const cachedLatitude = localStorage.getItem('ce:user-latitude');
    if (cachedLatitude) {
      const parsed = Number(cachedLatitude);
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }
    return null;
  });

  const moon = getMoonPhase(selectedDate);

  return (
    <AppLayout>
      <div className="space-y-4">
        <h2 className="font-mystic text-xl">Lua</h2>
        <p className="text-sm text-white/70">Fase atual para a data selecionada no app.</p>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-sm text-white/60">Fase</p>
          <p className="text-lg">{moon.icon} {moon.name}</p>
          <p className="text-xs text-white/50 mt-2">
            Em breve: horarios lunares locais, culminacao e dados mais detalhados por localidade.
          </p>
          {userLatitude != null && (
            <p className="text-xs text-white/45 mt-1">Latitude detectada: {userLatitude.toFixed(4)}</p>
          )}
        </div>
      </div>
    </AppLayout>
  );
};
