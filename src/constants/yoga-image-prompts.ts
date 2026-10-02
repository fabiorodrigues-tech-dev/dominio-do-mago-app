import { YOGA_POSES, type YogaPose } from './yoga-poses';

export const YOGA_ILLUSTRATION_STYLE_BASE = [
  'ilustracao digital vetorial premium',
  'linha limpa e elegante',
  'estilo editorial místico minimalista',
  'personagem central em postura de yoga',
  'fundo abstrato suave com formas organicas',
  'paleta fixa: azul-petroleo, dourado suave, creme quente, verde desaturado',
  'luz difusa cinematografica',
  'sombra suave sem alto contraste',
  'anatomia humana correta e proporcoes naturais',
  'composicao centralizada',
  'mesma lente e enquadramento para serie completa',
  'qualidade alta, detalhes limpos, sem ruido visual',
].join(', ');

export const YOGA_ILLUSTRATION_NEGATIVE_PROMPT = [
  'sem texto',
  'sem tipografia',
  'sem logotipo',
  'sem marca d agua',
  'sem fundo fotorealista',
  'sem estilo anime',
  'sem estilo 3D plastico',
  'sem membros extras',
  'sem dedos extras',
  'sem anatomia quebrada',
  'sem borrado',
  'sem ruido',
].join(', ');

const getPoseDirection = (pose: YogaPose): string => {
  const byId: Record<string, string> = {
    tadasana: 'figura em pe, coluna neutra, bracos ao lado do corpo, estabilidade e aterramento',
    vrksasana: 'apoio em uma perna, pe oposto na coxa interna, maos em anjali mudra, equilibrio sereno',
    'virabhadrasana-ii': 'base ampla, joelho dianteiro flexionado, bracos abertos em linha horizontal, olhar lateral',
    'adho-mukha-svanasana': 'postura em V invertido, quadris elevados, calcanhares em direcao ao solo, ombros ativos',
    uttanasana: 'flexao em pe com tronco sobre as pernas, pescoco relaxado, alongamento posterior',
    bhujangasana: 'deitado de barriga para baixo, peito elevado com apoio das maos, abertura toracica suave',
    ustrasana: 'ajoelhado, extensao de coluna para tras com peito aberto, postura de camelo com controle',
    'ardha-matsyendrasana': 'torcao sentada com coluna ereta, uma mao apoiada atras e outra no joelho oposto',
    'eka-pada-rajakapotasana': 'abertura de quadris em pombo preparatorio, perna da frente flexionada e perna de tras estendida',
    balasana: 'ajoelhado em repouso, testa apoiada, tronco relaxado sobre as coxas, gestual de descanso',
    'setu-bandhasana': 'deitado de costas, quadris elevados em ponte, pes e ombros ancorados',
    savasana: 'deitado em relaxamento completo, bracos afastados do corpo com palmas para cima',
  };

  return byId[pose.id] ?? `${pose.namePt} em execucao tecnica correta`;
};

export const buildYogaIllustrationPrompt = (pose: YogaPose): string => {
  const poseBlock = [
    `asana: ${pose.nameSanskrit}`,
    `nome em portugues: ${pose.namePt}`,
    `familia: ${pose.family}`,
    `foco corporal: ${pose.focus}`,
    `direcao da pose: ${getPoseDirection(pose)}`,
    `nivel: ${pose.level}`,
  ].join(', ');

  return `${YOGA_ILLUSTRATION_STYLE_BASE}, ${poseBlock}`;
};

export const YOGA_ILLUSTRATION_PROMPTS_BY_ID: Record<string, { prompt: string; negativePrompt: string }> =
  Object.fromEntries(
    YOGA_POSES.map((pose) => [
      pose.id,
      {
        prompt: buildYogaIllustrationPrompt(pose),
        negativePrompt: YOGA_ILLUSTRATION_NEGATIVE_PROMPT,
      },
    ]),
  );

export const getYogaIllustrationThumbSrc = (poseId: string): string => {
  return `/yoga/poses/thumb/${poseId}.webp`;
};

export const getYogaIllustrationFullSrc = (poseId: string): string => {
  return `/yoga/poses/full/${poseId}.webp`;
};

export const getYogaIllustrationFallbackSrc = (poseId: string): string => {
  return `/yoga/poses/${poseId}.png`;
};

export const getYogaIllustrationPrompts = (poseId: string): { prompt: string; negativePrompt: string } | undefined => {
  return YOGA_ILLUSTRATION_PROMPTS_BY_ID[poseId];
};
