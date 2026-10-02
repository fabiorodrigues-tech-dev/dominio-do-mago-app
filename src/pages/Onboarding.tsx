import { useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { ELEMENTS, getAreasByElement } from '@/constants';
import type { ElementId } from '@/types';
import { useAppStore } from '@/stores/appStore';
import { useAuthStore } from '@/stores/authStore';

const ELEMENT_ORDER: ElementId[] = ['terra', 'fogo', 'agua', 'ar'];

const Onboarding = () => {
  const authUser = useAuthStore((state) => state.user);
  const onboarding = useAppStore((state) => state.onboarding);
  const tasks = useAppStore((state) => state.tasks.length);
  const habits = useAppStore((state) => state.habits.length);
  const projects = useAppStore((state) => state.projects.length);
  const quests = useAppStore((state) => state.quests.length);
  const drafts = useAppStore((state) => state.drafts.length);
  const cycleSequences = useAppStore((state) => state.cycleSequences.length);
  const setOnboardingStep = useAppStore((state) => state.setOnboardingStep);
  const selectArea = useAppStore((state) => state.selectArea);
  const deselectArea = useAppStore((state) => state.deselectArea);
  const completeOnboarding = useAppStore((state) => state.completeOnboarding);

  const hasDomainData = tasks + habits + projects + quests + drafts + cycleSequences > 0;
  const shouldShowOnboarding = !onboarding.isComplete && !hasDomainData;

  const selectedAreaSet = useMemo(() => new Set(onboarding.selectedAreas), [onboarding.selectedAreas]);

  if (!authUser) {
    return <Navigate to="/auth" replace />;
  }

  if (!shouldShowOnboarding) {
    return <Navigate to="/santuario" replace />;
  }

  const handleToggleArea = (areaId: string) => {
    if (selectedAreaSet.has(areaId)) {
      deselectArea(areaId);
      return;
    }

    selectArea(areaId);
  };

  const canFinish = onboarding.selectedAreas.length > 0;

  return (
    <div className="min-h-screen bg-void text-white px-4 py-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="font-mystic text-3xl md:text-4xl text-mystic-gold">Despertar Elemental</h1>
        <p className="mt-2 text-white/70">
          Configure seu caminho inicial: entenda os elementos e escolha as areas que quer priorizar.
        </p>

        <div className="mt-6 flex items-center gap-2 text-xs text-white/60">
          <div className={`h-1.5 w-16 rounded-full ${onboarding.step >= 0 ? 'bg-mystic-gold' : 'bg-white/20'}`} />
          <div className={`h-1.5 w-16 rounded-full ${onboarding.step >= 1 ? 'bg-mystic-gold' : 'bg-white/20'}`} />
          <span className="ml-2">Etapa {Math.min(onboarding.step + 1, 2)} de 2</span>
        </div>

        {onboarding.step === 0 && (
          <section className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-xl font-semibold">Os 4 Elementos</h2>
            <p className="text-white/70 mt-1">
              Terra estrutura, Fogo realiza, Agua conecta e Ar expande. Eles guiam a forma como voce organiza suas areas.
            </p>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              {ELEMENT_ORDER.map((elementId) => {
                const element = ELEMENTS[elementId];
                return (
                  <article
                    key={element.id}
                    className="rounded-xl border border-white/10 p-4"
                    style={{ backgroundColor: `${element.color}14` }}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{element.icon}</span>
                      <div>
                        <p className="font-semibold">{element.name}</p>
                        <p className="text-sm text-white/65">{element.description}</p>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setOnboardingStep(1)}
                className="rounded-lg bg-mystic-gold text-black px-4 py-2 font-medium hover:opacity-90"
              >
                Continuar para seleção de áreas
              </button>
            </div>
          </section>
        )}

        {onboarding.step >= 1 && (
          <section className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-xl font-semibold">Selecione suas areas iniciais</h2>
            <p className="text-white/70 mt-1">
              Escolha ao menos uma area para iniciar. Isso ajuda no foco inicial do seu Santuario.
            </p>

            <div className="mt-6 space-y-6">
              {ELEMENT_ORDER.map((elementId) => {
                const element = ELEMENTS[elementId];
                const areas = getAreasByElement(elementId);

                return (
                  <div key={element.id}>
                    <p className="font-semibold mb-2" style={{ color: element.color }}>
                      {element.icon} {element.name}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {areas.map((area) => {
                        const active = selectedAreaSet.has(area.id);

                        return (
                          <button
                            key={area.id}
                            onClick={() => handleToggleArea(area.id)}
                            className={`px-3 py-1.5 rounded-full border text-sm transition ${
                              active
                                ? 'bg-mystic-gold text-black border-mystic-gold'
                                : 'bg-transparent text-white border-white/30 hover:border-white/60'
                            }`}
                            title={area.description}
                          >
                            {area.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <button
                onClick={() => setOnboardingStep(0)}
                className="rounded-lg border border-white/25 px-4 py-2 text-white/80 hover:text-white hover:border-white/50"
              >
                Voltar
              </button>

              <button
                onClick={completeOnboarding}
                disabled={!canFinish}
                className="rounded-lg bg-mystic-gold text-black px-4 py-2 font-medium disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Concluir onboarding
              </button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export { Onboarding };
