
import React, { useEffect, useState } from 'react';
import { Child } from '../types';
import { Sparkles, TrendingUp, BrainCircuit, Lightbulb, Loader2 } from 'lucide-react';
import { getChildInsights } from '../services/gemini';

interface Props {
  child: Child;
}

const AIAssistant: React.FC<Props> = ({ child }) => {
  const [insight, setInsight] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchInsight = async () => {
      setIsLoading(true);
      const res = await getChildInsights(
        child.name, 
        child.missions.length, 
        child.activities[0]?.description || 'Только начинаем'
      );
      setInsight(res);
      setIsLoading(false);
    };
    fetchInsight();
  }, [child]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="relative bg-gradient-to-r from-[var(--primary)] to-indigo-500 rounded-[2.5rem] p-8 text-white overflow-hidden shadow-xl shadow-[var(--primary)]/20">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl">
              <Sparkles size={24} />
            </div>
            <h2 className="text-2xl font-black">Аналитика ИИ</h2>
          </div>
          
          <div className="min-h-[80px]">
            {isLoading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="animate-spin" />
                <span className="text-white/80 font-medium">ИИ анализирует прогресс {child.name}...</span>
              </div>
            ) : (
              <p className="text-lg font-bold leading-relaxed opacity-95">
                "{insight}"
              </p>
            )}
          </div>
        </div>
        {/* Background blobs */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full blur-3xl -ml-24 -mb-24" />
      </div>

      <div className="grid gap-4">
        <InsightCard 
          icon={<TrendingUp className="text-emerald-500" />} 
          title="Итоги роста" 
          value="+20% Эффективности"
          description={`${child.name} выполнил(а) на 2 задачи больше, чем на прошлой неделе! Дисциплина растет.`}
        />
        <InsightCard 
          icon={<BrainCircuit className="text-amber-500" />} 
          title="Тренды обучения" 
          value="Магистр наук"
          description="Большинство наград связаны с образованием. Попробуйте добавить больше спортивных миссий."
        />
        <InsightCard 
          icon={<Lightbulb className="text-blue-500" />} 
          title="Цель накопления" 
          value="В графике"
          description={`При текущем темпе цель "${child.dream.title}" будет достигнута примерно через 5 недель.`}
        />
      </div>
    </div>
  );
};

interface CardProps {
  icon: React.ReactNode;
  title: string;
  value: string;
  description: string;
}

const InsightCard: React.FC<CardProps> = ({ icon, title, value, description }) => (
  <div className="bg-[var(--bg-card)] rounded-[2rem] p-6 border border-[var(--border)] group hover:border-[var(--primary)] transition-all">
    <div className="flex items-start justify-between mb-4">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-black/10 rounded-2xl">
          {icon}
        </div>
        <h4 className="font-bold text-[var(--text-muted)] uppercase tracking-widest text-[10px]">{title}</h4>
      </div>
      <span className="text-xs font-black bg-white/5 px-3 py-1 rounded-full">{value}</span>
    </div>
    <p className="text-sm font-bold leading-snug group-hover:text-[var(--text-main)] text-[var(--text-muted)] transition-colors">
      {description}
    </p>
  </div>
);

export default AIAssistant;
