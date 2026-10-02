import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, TrendingUp, BarChart3, Activity } from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { useAppStore } from '@/stores/appStore';
import { ELEMENTS, type ElementId } from '@/constants';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
} from 'recharts';

export const Astrolabio: React.FC = () => {
  const { getElementScores, tasks, habits, user } = useAppStore();
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('week');

  const elementScores = getElementScores();

  // Generate mock historical data
  const generateHistoryData = () => {
    const days = timeRange === 'week' ? 7 : timeRange === 'month' ? 30 : 365;
    const data = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      data.push({
        date: date.toLocaleDateString('pt-BR', { 
          day: days > 30 ? undefined : '2-digit',
          month: 'short' 
        }),
        terra: Math.floor(Math.random() * 50) + 10,
        fogo: Math.floor(Math.random() * 50) + 10,
        agua: Math.floor(Math.random() * 50) + 10,
        ar: Math.floor(Math.random() * 50) + 10,
      });
    }
    return data;
  };

  const historyData = generateHistoryData();

  // Pie chart data
  const pieData = elementScores.map(score => ({
    name: ELEMENTS[score.elementId].name,
    value: score.score,
    color: ELEMENTS[score.elementId].color,
  }));

  // Task completion by element
  const taskByElement = (Object.keys(ELEMENTS) as ElementId[]).map((elementId) => {
    const elementTasks = tasks.filter(t => t.elementId === elementId && t.isCompleted);
    return {
      element: ELEMENTS[elementId].name,
      count: elementTasks.length,
      color: ELEMENTS[elementId].color,
    };
  });

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <AppLayout>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-6"
      >
        {/* Header */}
        <motion.div variants={itemVariants} className="text-center">
          <div className="text-4xl mb-2">🔮</div>
          <h2 className="font-mystic text-xl mb-1">Astrolábio</h2>
          <p className="text-sm text-white/50">
            Análise do seu equilíbrio elemental
          </p>
        </motion.div>

        {/* Time Range Selector */}
        <motion.div variants={itemVariants}>
          <div className="flex justify-center gap-2">
            {(['week', 'month', 'year'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-4 py-2 rounded-lg text-sm transition-all ${
                  timeRange === range
                    ? 'bg-mystic-arcane text-white'
                    : 'bg-white/5 text-white/60 hover:bg-white/10'
                }`}
              >
                {range === 'week' ? 'Semana' : range === 'month' ? 'Mês' : 'Ano'}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Overview Cards */}
        <motion.div variants={itemVariants}>
          <div className="grid grid-cols-2 gap-3">
            <OverviewCard
              icon={<Activity className="w-5 h-5" />}
              label="Total de Rituais"
              value={tasks.length.toString()}
              sublabel={`${tasks.filter(t => t.isCompleted).length} concluídos`}
            />
            <OverviewCard
              icon={<TrendingUp className="w-5 h-5" />}
              label="Pontuação"
              value={user.totalScore.toLocaleString()}
              sublabel="pontos totais"
            />
            <OverviewCard
              icon={<Calendar className="w-5 h-5" />}
              label="Ciclos Ativos"
              value={habits.length.toString()}
              sublabel="hábitos"
            />
            <OverviewCard
              icon={<BarChart3 className="w-5 h-5" />}
              label="Streak"
              value={user.streak.toString()}
              sublabel="dias"
            />
          </div>
        </motion.div>

        {/* Tabs */}
        <motion.div variants={itemVariants}>
          <Tabs defaultValue="evolution" className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-white/5">
              <TabsTrigger value="evolution" className="data-[state=active]:bg-mystic-arcane">
                Evolução
              </TabsTrigger>
              <TabsTrigger value="distribution" className="data-[state=active]:bg-mystic-arcane">
                Distribuição
              </TabsTrigger>
              <TabsTrigger value="elements" className="data-[state=active]:bg-mystic-arcane">
                Elementos
              </TabsTrigger>
            </TabsList>

            {/* Evolution Chart */}
            <TabsContent value="evolution" className="mt-4">
              <div className="glass-card p-4">
                <h3 className="font-mystic text-sm mb-4">Evolução por Elemento</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={historyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                      <XAxis 
                        dataKey="date" 
                        stroke="rgba(255,255,255,0.3)"
                        tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }}
                      />
                      <YAxis 
                        stroke="rgba(255,255,255,0.3)"
                        tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#1A1025', 
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '8px'
                        }}
                      />
                      <Line type="monotone" dataKey="terra" stroke={ELEMENTS.terra.color} strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="fogo" stroke={ELEMENTS.fogo.color} strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="agua" stroke={ELEMENTS.agua.color} strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="ar" stroke={ELEMENTS.ar.color} strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-center gap-4 mt-4">
                  {Object.values(ELEMENTS).map((element) => (
                    <div key={element.id} className="flex items-center gap-1">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: element.color }}
                      />
                      <span className="text-xs text-white/60">{element.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* Distribution Chart */}
            <TabsContent value="distribution" className="mt-4">
              <div className="glass-card p-4">
                <h3 className="font-mystic text-sm mb-4">Distribuição de Pontos</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#1A1025', 
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '8px'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-4">
                  {pieData.map((entry) => (
                    <div key={entry.name} className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: entry.color }}
                      />
                      <span className="text-xs text-white/60">{entry.name}</span>
                      <span className="text-xs text-mystic-gold ml-auto">{entry.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* Elements Detail */}
            <TabsContent value="elements" className="mt-4">
              <div className="space-y-3">
                {elementScores.map((score) => (
                  <ElementDetailCard key={score.elementId} score={score} />
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </motion.div>

        {/* Tasks by Element */}
        <motion.div variants={itemVariants}>
          <h3 className="font-mystic text-lg mb-3">Rituais por Elemento</h3>
          <div className="glass-card p-4">
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={taskByElement}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis 
                    dataKey="element" 
                    stroke="rgba(255,255,255,0.3)"
                    tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }}
                  />
                  <YAxis 
                    stroke="rgba(255,255,255,0.3)"
                    tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1A1025', 
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {taskByElement.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </motion.div>

      </motion.div>
    </AppLayout>
  );
};

interface OverviewCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  sublabel: string;
}

const OverviewCard: React.FC<OverviewCardProps> = ({ icon, label, value, sublabel }) => (
  <div className="glass-card p-3">
    <div className="flex items-center gap-2 text-white/60 mb-1">
      {icon}
      <span className="text-xs">{label}</span>
    </div>
    <div className="text-xl font-bold text-mystic-gold">{value}</div>
    <div className="text-[10px] text-white/40">{sublabel}</div>
  </div>
);

interface ElementDetailCardProps {
  score: { elementId: ElementId; score: number; percentage: number };
}

const ElementDetailCard: React.FC<ElementDetailCardProps> = ({ score }) => {
  const element = ELEMENTS[score.elementId];
  
  return (
    <div 
      className="p-4 rounded-xl border border-white/10"
      style={{ background: `linear-gradient(135deg, ${element.color}10 0%, rgba(26, 16, 37, 0.9) 100%)` }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-2xl">{element.icon}</div>
          <div>
            <h4 className="font-medium">{element.name}</h4>
            <p className="text-xs text-white/50">{element.domain}</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xl font-bold" style={{ color: element.color }}>
            {score.score}
          </div>
          <div className="text-xs text-white/40">{score.percentage}%</div>
        </div>
      </div>
      <div className="mt-3 h-1.5 bg-black/30 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${score.percentage}%` }}
          transition={{ duration: 0.5 }}
          className="h-full rounded-full"
          style={{ backgroundColor: element.color }}
        />
      </div>
    </div>
  );
};
