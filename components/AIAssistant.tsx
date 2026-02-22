import React, { useEffect, useState } from 'react';
import { Child } from '../types';
import {
  Sparkles,
  TrendingUp,
  BrainCircuit,
  Lightbulb,
  Loader2,
  RefreshCw,
  MessageSquareQuote,
  Target,
  Gift,
} from 'lucide-react';
import { getAIContent, getAIReportBlock, type AssistantReportBlock } from '../services/gemini';

interface Props {
  child: Child;
  inviteCode: string;
}

const EMPTY_BLOCKS: Record<AssistantReportBlock, string> = {
  analytics: '',
  expert_advice: '',
  execution_dynamics: '',
  learning_trends: '',
  saving_strategy: '',
};

const EMPTY_LOADING: Record<AssistantReportBlock, boolean> = {
  analytics: false,
  expert_advice: false,
  execution_dynamics: false,
  learning_trends: false,
  saving_strategy: false,
};

const CORE_BLOCKS: AssistantReportBlock[] = [
  'analytics',
  'expert_advice',
  'execution_dynamics',
  'learning_trends',
  'saving_strategy',
];

const AIAssistant: React.FC<Props> = ({ child, inviteCode }) => {
  const [reportBlocks, setReportBlocks] = useState<Record<AssistantReportBlock, string>>(EMPTY_BLOCKS);
  const [loadingBlocks, setLoadingBlocks] = useState<Record<AssistantReportBlock, boolean>>(EMPTY_LOADING);

  const [isMainLoading, setIsMainLoading] = useState(false);
  const [missionIdeas, setMissionIdeas] = useState<string>('');
  const [prizeIdeas, setPrizeIdeas] = useState<string>('');
  const [isMissionsLoading, setIsMissionsLoading] = useState(false);
  const [isPrizesLoading, setIsPrizesLoading] = useState(false);

  const setBlockLoading = (block: AssistantReportBlock, value: boolean) => {
    setLoadingBlocks((prev) => ({ ...prev, [block]: value }));
  };

  const handleRefreshBlock = async (block: AssistantReportBlock) => {
    setBlockLoading(block, true);
    const text = await getAIReportBlock(block, child, inviteCode);
    setReportBlocks((prev) => ({ ...prev, [block]: text }));
    setBlockLoading(block, false);
  };

  const handleRefreshMain = async () => {
    if (isMainLoading) return;

    setIsMainLoading(true);
    setLoadingBlocks({
      analytics: true,
      expert_advice: true,
      execution_dynamics: true,
      learning_trends: true,
      saving_strategy: true,
    });

    const results = await Promise.all(
      CORE_BLOCKS.map(async (block) => ({
        block,
        text: await getAIReportBlock(block, child, inviteCode),
      }))
    );

    setReportBlocks((prev) => {
      const next = { ...prev };
      for (const item of results) {
        next[item.block] = item.text;
      }
      return next;
    });

    setLoadingBlocks(EMPTY_LOADING);
    setIsMainLoading(false);
  };

  const handleRefreshMissions = async () => {
    setIsMissionsLoading(true);
    const res = await getAIContent('missions', child, inviteCode);
    setMissionIdeas(res);
    setIsMissionsLoading(false);
  };

  const handleRefreshPrizes = async () => {
    setIsPrizesLoading(true);
    const res = await getAIContent('prizes', child, inviteCode);
    setPrizeIdeas(res);
    setIsPrizesLoading(false);
  };

  useEffect(() => {
    setReportBlocks(EMPTY_BLOCKS);
    setMissionIdeas('');
    setPrizeIdeas('');
    void handleRefreshMain();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [child.id, inviteCode]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24">
      <div className="relative rounded-[2.5rem] p-8 text-white overflow-hidden shadow-2xl shadow-black/30 border border-white/10 [background:linear-gradient(145deg,#111425_0%,#0d1020_55%,#080b18_100%)]">
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/15">
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
            {!reportBlocks.analytics && !isMainLoading ? (
              <div className="w-full text-center py-4 space-y-3">
                <p className="text-white/60 font-bold uppercase tracking-widest text-xs">Аналитика готова к запуску</p>
                <p className="text-white/40 text-[10px] uppercase font-medium">Нажмите обновить для получения отчета</p>
              </div>
            ) : isMainLoading ? (
              <div className="flex flex-col items-center gap-3 w-full">
                <Loader2 className="animate-spin text-white/40" size={32} />
                <span className="text-white/60 font-black text-[10px] uppercase tracking-[0.2em]">ИИ анализирует данные {child.name}...</span>
              </div>
            ) : (
              <p className="w-full text-sm sm:text-base font-bold leading-relaxed text-white/95 whitespace-pre-line">
                {reportBlocks.analytics}
              </p>
            )}
          </div>
        </div>

        <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--primary)]/20 rounded-full blur-[95px] -mr-32 -mt-32 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-56 h-56 bg-[var(--primary)]/10 rounded-full blur-[80px] -ml-24 -mb-24 pointer-events-none" />
      </div>

      <div className="grid gap-4">
        <InsightCard
          icon={<TrendingUp className="text-emerald-400" />}
          title="Динамика выполнения"
          description={reportBlocks.execution_dynamics || 'Нажмите обновить для генерации'}
          isLoading={loadingBlocks.execution_dynamics}
          onRefresh={() => handleRefreshBlock('execution_dynamics')}
        />
        <InsightCard
          icon={<BrainCircuit className="text-amber-400" />}
          title="Тренды обучения"
          description={reportBlocks.learning_trends || 'Нажмите обновить для генерации'}
          isLoading={loadingBlocks.learning_trends}
          onRefresh={() => handleRefreshBlock('learning_trends')}
        />
        <InsightCard
          icon={<Lightbulb className="text-blue-400" />}
          title="Стратегия накопления"
          description={reportBlocks.saving_strategy || 'Нажмите обновить для генерации'}
          isLoading={loadingBlocks.saving_strategy}
          onRefresh={() => handleRefreshBlock('saving_strategy')}
        />
      </div>

      <div className="bg-white/5 rounded-[2rem] p-7 border border-white/10 animate-in zoom-in-95 duration-500">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-500/20 text-indigo-400 rounded-xl">
              <MessageSquareQuote size={20} />
            </div>
            <h4 className="text-[12px] font-black text-white/60 uppercase tracking-[0.2em]">Совет эксперта</h4>
          </div>
          <button
            onClick={() => handleRefreshBlock('expert_advice')}
            disabled={loadingBlocks.expert_advice}
            className="w-10 h-10 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-all active:scale-95 disabled:opacity-50"
            title="Обновить блок"
          >
            {loadingBlocks.expert_advice ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
          </button>
        </div>

        {loadingBlocks.expert_advice ? (
          <div className="space-y-2">
            <div className="h-4 bg-white/5 rounded-full animate-pulse w-5/6" />
            <div className="h-4 bg-white/5 rounded-full animate-pulse w-4/6" />
          </div>
        ) : (
          <p className="text-base font-bold text-white/90 leading-relaxed whitespace-pre-line">
            {reportBlocks.expert_advice || 'Нажмите обновить для генерации совета.'}
          </p>
        )}
      </div>

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

const InsightCard = ({
  icon,
  title,
  description,
  isLoading,
  onRefresh,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  isLoading: boolean;
  onRefresh: () => void;
}) => (
  <div className="bg-[var(--bg-card)] rounded-[2rem] p-6 border border-[var(--border)] group hover:border-[var(--primary)]/40 transition-all">
    <div className="flex items-start justify-between mb-3 gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className="p-2.5 bg-black/20 rounded-xl border border-white/5 shrink-0">{icon}</div>
        <h4 className="font-black text-[var(--text-muted)] uppercase tracking-widest text-[10px]">{title}</h4>
      </div>
      <button
        onClick={onRefresh}
        disabled={isLoading}
        className="w-9 h-9 shrink-0 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 transition-all active:scale-95 disabled:opacity-50"
        title="Обновить блок"
      >
        {isLoading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} className="text-white/70" />}
      </button>
    </div>
    {isLoading ? (
      <div className="h-12 flex items-center">
        <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
          <div className="h-full bg-[var(--primary)]/30 animate-shimmer" style={{ width: '60%' }} />
        </div>
      </div>
    ) : (
      <p className="text-sm font-bold leading-snug text-[var(--text-muted)] group-hover:text-white/85 transition-colors whitespace-pre-line">
        {description}
      </p>
    )}
  </div>
);

const IdeaCard = ({ icon, title, ideas, isLoading, onRefresh }: any) => (
  <div className="bg-[var(--bg-card)] rounded-[2.5rem] p-8 border border-[var(--border)] relative overflow-hidden group">
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-white/5 rounded-2xl border border-white/5">{icon}</div>
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
          {parseIdeaItems(ideas).map((item: string, idx: number) => (
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

const parseIdeaItems = (raw: string): string[] => {
  const text = String(raw || '').trim();
  if (!text) return [];

  const byLines = text
    .split('\n')
    .map((line) => line.replace(/^[-*•\d.)\s]+/, '').trim())
    .filter(Boolean);

  if (byLines.length >= 3) return byLines.slice(0, 10);

  return text
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 10);
};

export default AIAssistant;
