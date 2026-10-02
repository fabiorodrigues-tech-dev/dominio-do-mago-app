import React, { useState } from 'react';
import { AppLayout } from '@/components/layout';
import { getSeason, getHemisphereFromLatitude } from '@/constants';

export const Estacoes: React.FC = () => {
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

  const season = getSeason(selectedDate, { latitude: userLatitude });
  const hemisphere = getHemisphereFromLatitude(userLatitude);

  return (
    <AppLayout>
      <div className="space-y-4">
        <h2 className="font-mystic text-xl">Estacao</h2>
        <p className="text-sm text-white/70">Estacao calculada automaticamente por hemisferio.</p>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-sm text-white/60">Estacao atual</p>
          <p className="text-lg">{season.icon} {season.name}</p>
          <p className="text-xs text-white/50 mt-2">Hemisferio: {hemisphere === 'south' ? 'Sul' : 'Norte'}</p>
          {userLatitude != null && (
            <p className="text-xs text-white/45 mt-1">Latitude detectada: {userLatitude.toFixed(4)}</p>
          )}
        </div>
      </div>
    </AppLayout>
  );
};
