
import React, { useState } from 'react';
import { Child } from '../types';
import { Sparkles, TrendingUp, BrainCircuit, Lightbulb, Loader2, RefreshCw, MessageSquareQuote, Target, Gift } from 'lucide-react';
import { getChildInsights, getAIContent } from '../services/gemini';

interface Props {
  child: Child;
}

const AIAssistant: React.FC<Props> = ({ child }) => {
  const [insight, setInsight] = useState<string>('');
  const [advice, setAdvice] = useState<string>('');
  const [missionIdeas, setMissionIdeas] = useState<string>('');
  const [prizeIdeas, setPrizeIdeas] = useState<string>('');
  
  const [isMainLoading, setIsMainLoading] = useState(false);
  const [isMissionsLoading, setIsMissionsLoading] = useState(false);
  const [isPrizesLoading, setIsPrizesLoading] = useState(false);

  // Обновление всей основной аналитики
  const handleRefreshMain = async () => {
    setIsMainLoading(true);
    const context = `${child.name}, миссий: ${child.missions.length}, последнее: ${child.activities[0]?.description || 'старт'}`;
    
    const [resInsight, resAdvice] = await Promise.all([
      getChildInsights(child.name, child.missions.length, child.activities[0]?.description || 'Только начинаем'),
      getAIContent('advice', context)
    ]);
    
    setInsight(resInsight);
    setAdvice(resAdvice);
    setIsMainLoading(false);
  };

  const handleRefreshMissions = async () => {
    setIsMissionsLoading(true);
    const res = await getAIContent('missions', child.name);
    setMissionIdeas(res);
    setIsMissionsLoading(false);
  };

  const handleRefreshPrizes = async () => {
    setIsPrizesLoading(true);
    const res = await getAIContent('prizes', child.name);
    setPrizeIdeas(res);
    setIsPrizesLoading(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24">
      {/* Главный блок Аналитики */}
      <div className="relative bg-gradient-to-br from-[var(--primary)] via-indigo-500 to-purple-600 rounded-[2.5rem] p-8 text-white overflow-hidden shadow-2xl shadow-[var(--primary)]/20">
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/20 backdrop-blur-xl rounded-2xl border border-white/20">
                <Sparkles size={24} />
              </div>
              <h2 className="text-2xl font-black uppercase tracking-tight">Аналитика ИИ</h2>
            </div>
            <button 
              onClick={handleRefreshMain}
              disabled={isMainLoading}
              className="flex items-center gap-2 px-5 py-2.5 bg-black/30 hover:bg-black/50 backdrop-blur-md rounded-xl border border-white/10 transition-all active:scale-95 disabled:opacity-50"
            >
              {isMainLoading ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
              <span className="text-[11px] font-black uppercase tracking-widest">Обновить</span>
            </button>
          </div>
          
          <div className="min-h-[100px] flex items-center">
            {!insight && !isMainLoading ? (
              <div className="w-full text-center py-4 space-y-3">
                <p className="text-white/60 font-bold uppercase tracking-widest text-xs">Аналитика готова к запуску</p>
                <p className="text-white/40 text-[10px] uppercase font-medium">Нажмите обновить для получения отчета</p>
              </div>
            ) : isMainLoading ? (
              <div className="flex flex-col items-center gap-3 w-full">
                <Loader2 className="animate-spin text-white/40" size={32} />
                <span className="text-white/60 font-black text-[10px] uppercase tracking-[0.2em]">ИИ изучает прогресс {child.name}...</span>
              </div>
            ) : (
              <p className="text-xl font-bold leading-relaxed text-white drop-shadow-sm">
                "{insight}"
              </p>
            )}
          </div>
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-[80px] -mr-32 -mt-32 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/20 rounded-full blur-[60px] -ml-24 -mb-24 pointer-events-none" />
      </div>

      {/* Основные статус-карты */}
      <div className="grid gap-4">
        <InsightCard 
          icon={<TrendingUp className="text-emerald-400" />} 
          title="Итоги роста" 
          value={insight ? "Анализ завершен" : "Ожидание"}
          description={insight ? `Эффективность ${child.name} выросла на основе последних выполненных задач.` : "Нажмите кнопку обновить выше."}
          isLoading={isMainLoading}
        />
        <InsightCard 
          icon={<BrainCircuit className="text-amber-400" />} 
          title="Тренды обучения" 
          value={insight ? "Фокус определен" : "Ожидание"}
          description={insight ? "ИИ зафиксировал интерес к текущим категориям миссий. Рекомендуется диверсификация." : "Нажмите кнопку обновить выше."}
          isLoading={isMainLoading}
        />
        <InsightCard 
          icon={<Lightbulb className="text-blue-400" />} 
          title="Цель накопления" 
          value={insight ? "В графике" : "Ожидание"}
          description={insight ? `При текущем темпе цель "${child.dream.title}" достижима в обозримые сроки.` : "Нажмите кнопку обновить выше."}
          isLoading={isMainLoading}
        />
      </div>

      {/* Блок: Совет */}
      {advice && !isMainLoading && (
        <div className="bg-white/5 rounded-[2rem] p-7 border border-white/10 animate-in zoom-in-95 duration-500">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-indigo-500/20 text-indigo-400 rounded-xl">
              <MessageSquareQuote size={20} />
            </div>
            <h4 className="text-[12px] font-black text-white/60 uppercase tracking-[0.2em]">Совет эксперта</h4>
          </div>
          <p className="text-base font-bold text-white/90 leading-relaxed italic">
            "{advice}"
          </p>
        </div>
      )}

      {/* Блоки идей с индивидуальным обновлением */}
      <div className="space-y-4">
        <IdeaCard 
          icon={<Target size={22} className="text-[var(--primary)]" />}
          title="Идея миссий"
          ideas={missionIdeas}
          isLoading={isMissionsLoading}
          onRefresh={handleRefreshMissions}
        />
        <IdeaCard 
          icon={<Gift size={22} className="text-orange-400" />}
          title="Идея наград"
          ideas={prizeIdeas}
          isLoading={isPrizesLoading}
          onRefresh={handleRefreshPrizes}
        />
      </div>
    </div>
  );
};

/* Компонент: Карточка инсайта (Статус) */
const InsightCard = ({ icon, title, value, description, isLoading }: any) => (
  <div className="bg-[var(--bg-card)] rounded-[2rem] p-6 border border-[var(--border)] group hover:border-[var(--primary)]/40 transition-all">
    <div className="flex items-start justify-between mb-3">
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-black/20 rounded-xl border border-white/5">
          {icon}
        </div>
        <h4 className="font-black text-[var(--text-muted)] uppercase tracking-widest text-[10px]">{title}</h4>
      </div>
      <span className="text-[10px] font-black bg-white/5 px-3 py-1 rounded-full text-white/50">{value}</span>
    </div>
    {isLoading ? (
      <div className="h-12 flex items-center">
        <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
          <div className="h-full bg-[var(--primary)]/30 animate-shimmer" style={{width: '60%'}} />
        </div>
      </div>
    ) : (
      <p className="text-sm font-bold leading-snug text-[var(--text-muted)] group-hover:text-white/80 transition-colors">
        {description}
      </p>
    )}
  </div>
);

/* Компонент: Карточка идей с кнопкой Sparkles */
const IdeaCard = ({ icon, title, ideas, isLoading, onRefresh }: any) => (
  <div className="bg-[var(--bg-card)] rounded-[2.5rem] p-8 border border-[var(--border)] relative overflow-hidden group">
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-white/5 rounded-2xl border border-white/5">
          {icon}
        </div>
        <h4 className="text-lg font-black text-white uppercase tracking-wider">{title}</h4>
      </div>
      <button 
        onClick={onRefresh}
        disabled={isLoading}
        className="w-12 h-12 flex items-center justify-center bg-[var(--primary)]/10 text-[var(--primary)] rounded-2xl hover:bg-[var(--primary)] hover:text-white transition-all active:scale-90 border border-[var(--primary)]/20 shadow-lg shadow-[var(--primary)]/5"
      >
        {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Sparkles size={20} />}
      </button>
    </div>

    <div className="min-h-[60px]">
      {isLoading ? (
        <div className="space-y-2">
          <div className="h-4 bg-white/5 rounded-full animate-pulse w-3/4" />
          <div className="h-4 bg-white/5 rounded-full animate-pulse w-1/2" />
        </div>
      ) : ideas ? (
        <ul className="grid grid-cols-1 gap-3">
          {ideas.split(',').map((item: string, idx: number) => (
            <li key={idx} className="flex items-center gap-3 text-white/80 font-bold text-sm bg-white/[0.02] p-3 rounded-xl border border-white/5">
              <span className="w-6 h-6 rounded-lg bg-[var(--primary)]/20 text-[var(--primary)] flex items-center justify-center text-[10px] font-black">{idx + 1}</span>
              {item.trim()}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs font-black text-[var(--text-muted)] uppercase tracking-widest text-center py-4 opacity-40">Нажмите Sparkles для генерации</p>
      )}
    </div>
  </div>
);

export default AIAssistant;
