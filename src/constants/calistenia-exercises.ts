export type CalisteniaExercise = {
  id: string;
  namePt: string;
  category: string;
  focus: string;
  level: 'Iniciante' | 'Intermediário';
  benefits: string[];
  technique: string[];
  breathing: string;
  contraindications?: string[];
  duration?: string;
  variations?: string[];
};

export const CALISTENIA_EXERCISES: CalisteniaExercise[] = [
  {
    id: 'incline-push-up',
    namePt: 'Flexão Inclinada',
    category: 'Empurrar',
    focus: 'peitoral, tríceps e base técnica',
    level: 'Iniciante',
    benefits: [
      'Desenvolve força de empurrar com menor carga inicial',
      'Fortalece peitoral, ombros e tríceps',
      'Melhora estabilidade de escápulas e core',
      'Prepara para progressões de flexão no solo',
    ],
    technique: [
      'Mãos apoiadas em superfície elevada e estável',
      'Corpo em linha reta da cabeça aos calcanhares',
      'Cotovelos descendo em ângulo confortável',
      'Empurre o chão mantendo abdômen ativo',
    ],
    breathing: 'Inspire ao descer, expire ao empurrar para cima.',
    duration: '3-4 séries de 8-15 repetições',
    variations: ['Flexão na parede', 'Flexão no banco', 'Flexão tradicional'],
  },
  {
    id: 'push-up',
    namePt: 'Flexão Tradicional',
    category: 'Empurrar',
    focus: 'força de empurrar horizontal',
    level: 'Intermediário',
    benefits: [
      'Fortalece peitoral, deltoide anterior e tríceps',
      'Aprimora estabilidade de core e cintura escapular',
      'Melhora controle corporal global',
      'Serve de base para variações avançadas',
    ],
    technique: [
      'Mãos abaixo dos ombros com dedos ativos',
      'Coluna neutra e glúteos contraídos',
      'Desça com controle sem colapsar lombar',
      'Empurre o solo até extensão confortável dos braços',
    ],
    breathing: 'Inspire na fase excêntrica e expire na concêntrica.',
    duration: '3-5 séries de 6-12 repetições',
    variations: ['Flexão diamante', 'Flexão arqueiro', 'Pseudo planche push-up'],
  },
  {
    id: 'pike-push-up',
    namePt: 'Flexão Pike',
    category: 'Empurrar',
    focus: 'ombros e transição para empurrar vertical',
    level: 'Intermediário',
    benefits: [
      'Fortalece deltoides e tríceps',
      'Prepara para handstand push-up',
      'Desenvolve consciência de alinhamento overhead',
      'Aumenta resistência de ombros',
    ],
    technique: [
      'Quadris elevados formando um V invertido',
      'Mãos firmes no chão e ombros ativos',
      'Leve a cabeça em direção ao solo entre as mãos',
      'Empurre para cima mantendo controle escapular',
    ],
    breathing: 'Inspire ao descer e expire ao retornar.',
    duration: '3-4 séries de 5-10 repetições',
    contraindications: ['Dor aguda no ombro', 'Lesão cervical não reabilitada'],
    variations: ['Pike com pés elevados', 'Negativa de HSPU'],
  },
  {
    id: 'australian-row',
    namePt: 'Remada Australiana',
    category: 'Puxar',
    focus: 'costas, bíceps e retração escapular',
    level: 'Iniciante',
    benefits: [
      'Fortalece dorsais e romboides',
      'Melhora postura e controle escapular',
      'Constrói base para barra fixa',
      'Trabalha pegada com segurança',
    ],
    technique: [
      'Corpo alinhado em prancha sob barra baixa',
      'Puxe o peito em direção à barra',
      'Cotovelos próximos ao tronco',
      'Desça com controle sem perder tensão',
    ],
    breathing: 'Expire ao puxar, inspire ao retornar.',
    duration: '3-5 séries de 8-15 repetições',
    variations: ['Com joelhos flexionados', 'Com pés elevados', 'Pegada supinada'],
  },
  {
    id: 'pull-up',
    namePt: 'Barra Fixa',
    category: 'Puxar',
    focus: 'puxada vertical e força relativa',
    level: 'Intermediário',
    benefits: [
      'Fortalece dorsais, bíceps e antebraços',
      'Aumenta força de tração vertical',
      'Desenvolve pegada e controle do tronco',
      'Melhora composição corporal funcional',
    ],
    technique: [
      'Pendure-se com ombros ativos e core firme',
      'Inicie com depressão escapular',
      'Puxe até queixo ultrapassar a barra',
      'Desça de forma controlada até extensão total',
    ],
    breathing: 'Expire durante a subida, inspire na descida.',
    duration: '4-6 séries de 3-8 repetições',
    contraindications: ['Tendinite aguda em cotovelo/ombro'],
    variations: ['Barra com elástico', 'Chin-up', 'Barra com pausa isométrica'],
  },
  {
    id: 'bodyweight-squat',
    namePt: 'Agachamento Livre',
    category: 'Pernas',
    focus: 'força de pernas e padrão de joelho',
    level: 'Iniciante',
    benefits: [
      'Fortalece quadríceps, glúteos e adutores',
      'Melhora mobilidade de quadril e tornozelos',
      'Desenvolve coordenação e controle postural',
      'Base para progressões unilaterais',
    ],
    technique: [
      'Pés na largura confortável e coluna neutra',
      'Desça mantendo joelhos alinhados com os pés',
      'Distribua o peso no médio-pé',
      'Suba empurrando o chão com estabilidade',
    ],
    breathing: 'Inspire ao descer e expire na subida.',
    duration: '3-5 séries de 12-20 repetições',
    variations: ['Agachamento com pausa', 'Agachamento salto', 'Pistol squat progressão'],
  },
  {
    id: 'walking-lunge',
    namePt: 'Avanço Caminhando',
    category: 'Pernas',
    focus: 'força unilateral e estabilidade',
    level: 'Intermediário',
    benefits: [
      'Corrige assimetrias entre pernas',
      'Fortalece glúteos e quadríceps',
      'Melhora equilíbrio dinâmico',
      'Aprimora estabilidade de quadril',
    ],
    technique: [
      'Dê um passo longo e controlado',
      'Joelho da frente alinhado ao tornozelo',
      'Desça o joelho de trás sem colidir no chão',
      'Empurre com a perna da frente para avançar',
    ],
    breathing: 'Mantenha respiração ritmada, expirando na subida.',
    duration: '3-4 séries de 8-12 repetições por perna',
    variations: ['Avanço reverso', 'Avanço com pausa', 'Avanço explosivo'],
  },
  {
    id: 'hollow-body-hold',
    namePt: 'Hollow Body Hold',
    category: 'Core',
    focus: 'anti-extensão e rigidez do tronco',
    level: 'Iniciante',
    benefits: [
      'Fortalece abdômen profundo',
      'Melhora transferência de força para movimentos compostos',
      'Protege lombar em exercícios dinâmicos',
      'Base para skills de ginástica',
    ],
    technique: [
      'Lombar pressionada no chão',
      'Braços e pernas elevados conforme capacidade',
      'Costelas para baixo e abdômen ativo',
      'Sustente sem perder alinhamento',
    ],
    breathing: 'Respiração curta e controlada, sem perder tensão.',
    duration: '3-5 séries de 20-40 segundos',
    contraindications: ['Dor lombar sem avaliação profissional'],
    variations: ['Tuck hollow', 'Hollow rocks', 'Hollow completo'],
  },
  {
    id: 'plank',
    namePt: 'Prancha Frontal',
    category: 'Core',
    focus: 'estabilidade global e resistência isométrica',
    level: 'Iniciante',
    benefits: [
      'Fortalece core, ombros e glúteos',
      'Melhora postura e resistência isométrica',
      'Aumenta consciência corporal',
      'Apoia prevenção de dor lombar',
    ],
    technique: [
      'Antebraços no chão e cotovelos sob ombros',
      'Corpo alinhado em linha reta',
      'Abdômen e glúteos contraídos',
      'Evite elevar ou afundar quadril',
    ],
    breathing: 'Respire de forma contínua mantendo o brace abdominal.',
    duration: '3-5 séries de 30-90 segundos',
    variations: ['Prancha com alcance', 'Prancha RKC', 'Prancha com carga'],
  },
  {
    id: 'hanging-knee-raise',
    namePt: 'Elevação de Joelhos na Barra',
    category: 'Core',
    focus: 'flexão de quadril e controle abdominal',
    level: 'Intermediário',
    benefits: [
      'Fortalece abdômen inferior e flexores de quadril',
      'Melhora controle pélvico',
      'Desenvolve pegada e estabilidade de ombros',
      'Prepara para elevação de pernas',
    ],
    technique: [
      'Pendure-se com escápulas ativas',
      'Eleve os joelhos sem balançar o tronco',
      'Controle a descida mantendo tensão',
      'Evite usar impulso excessivo',
    ],
    breathing: 'Expire ao elevar joelhos e inspire ao descer.',
    duration: '3-4 séries de 8-15 repetições',
    contraindications: ['Dor aguda no ombro ou cotovelo'],
    variations: ['Knee raise com pausa', 'Leg raise parcial', 'Toes to bar progressão'],
  },
  {
    id: 'l-sit-tuck',
    namePt: 'L-Sit (Progressão Tuck)',
    category: 'Isometrias e Skills',
    focus: 'compressão de core e força de ombros',
    level: 'Intermediário',
    benefits: [
      'Fortalece core e flexores de quadril',
      'Melhora suporte de ombros',
      'Desenvolve coordenação para skills avançadas',
      'Aprimora consciência de linha corporal',
    ],
    technique: [
      'Apoie mãos em paralelas ou blocos',
      'Empurre o chão e eleve quadris',
      'Mantenha joelhos recolhidos (tuck) inicialmente',
      'Progrida para extensão gradual das pernas',
    ],
    breathing: 'Respire curto e controlado durante a sustentação.',
    duration: '4-6 séries de 10-25 segundos',
    contraindications: ['Dor em punho sem adaptação de apoio'],
    variations: ['Tuck hold', 'One-leg L-sit', 'L-sit completo'],
  },
  {
    id: 'burpee-controlled',
    namePt: 'Burpee Controlado',
    category: 'Condicionamento',
    focus: 'capacidade cardiorrespiratória e corpo inteiro',
    level: 'Intermediário',
    benefits: [
      'Aumenta condicionamento metabólico',
      'Integra empurrar, agachar e estabilizar',
      'Melhora resistência geral',
      'Eleva gasto energético',
    ],
    technique: [
      'Agache com coluna neutra',
      'Leve pés para trás com controle',
      'Execute flexão opcional conforme nível',
      'Retorne e estenda quadris com postura firme',
    ],
    breathing: 'Mantenha ritmo respiratório constante sem apneia.',
    duration: '6-12 minutos em blocos (ex: EMOM ou intervalado)',
    contraindications: ['Condição cardíaca sem liberação médica'],
    variations: ['Burpee sem salto', 'Burpee com salto', 'Burpee lateral'],
  },
];

export const CALISTENIA_GROUP_ORDER = [
  'Empurrar',
  'Puxar',
  'Pernas',
  'Core',
  'Isometrias e Skills',
  'Condicionamento',
] as const;

export const getCalisteniaExerciseById = (id: string): CalisteniaExercise | undefined => {
  return CALISTENIA_EXERCISES.find((exercise) => exercise.id === id);
};
