import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout';

type TemporalTab = {
  label: string;
  route: string;
};

const TABS: TemporalTab[] = [
  { label: 'Semana', route: '/temporal/semana' },
  { label: 'Mês', route: '/temporal/mes' },
  { label: 'Ano', route: '/temporal/ano' },
  { label: 'Calendário', route: '/temporal/calendario' },
];

interface TemporalLayoutProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}

export const TemporalLayout: React.FC<TemporalLayoutProps> = ({
  title,
  subtitle,
  children,
  actions,
}) => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <AppLayout title={title}>
      <section className="space-y-4">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-white/60">Módulo Temporal</p>
              <h2 className="mt-1 font-mystic text-lg text-white">{title}</h2>
              <p className="text-sm text-white/65">{subtitle}</p>
            </div>
            {actions ? <div className="sm:text-right">{actions}</div> : null}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
            {TABS.map((tab) => {
              const isActive = location.pathname === tab.route;

              return (
                <button
                  key={tab.route}
                  type="button"
                  onClick={() => navigate(tab.route)}
                  className={`rounded-xl border px-3 py-2 text-sm transition-colors ${
                    isActive
                      ? 'border-mystic-gold/70 bg-mystic-gold/15 text-mystic-gold'
                      : 'border-white/15 bg-white/[0.02] text-white/70 hover:border-white/30 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {children}
      </section>
    </AppLayout>
  );
};
