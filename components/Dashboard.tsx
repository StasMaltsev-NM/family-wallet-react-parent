
import React, { useEffect, useState } from 'react';
import { Child, Activity } from '../types';
import { 
  Sparkles, 
  Loader2, 
  ArrowUpRight, 
  Timer, 
  Gift, 
  Star, 
  Check, 
  X, 
  ClipboardCheck, 
  ChevronDown, 
  History, 
  Hourglass,
  MapPin,
  ShieldCheck
} from 'lucide-react';
import { editImageWithAI } from '../services/gemini';
import { useInstantAction } from '../hooks/useInstantAction';

type PendingDream = {
  id: string;
  title: string;
  child_id: string;
  child_name?: string;
  status?: string;
  created_at?: string;
};

interface Props {
  child: Child;
  onUpdateChild: (child: Child) => void;

  // API-экшен из App.tsx
  onTaskAction: (taskId: string, action: "confirm" | "reject") => Promise<void>;
  pendingPurchases?: any[];
  pendingDream?: PendingDream | null;
  onSetDreamGoal?: (dreamId: string, targetAmount: number) => Promise<void>;
}

function resolveDreamImageSrc(image: string | undefined): string {
  const src = String(image || '').trim();
  if (!src) return 'https://api.dicebear.com/7.x/shapes/svg?seed=dream';
  return src;
}

function resolvePendingRewardImageSrc(purchase: any): string {
  const variants = [
    purchase?.reward_image_url,
    purchase?.reward_image,
    purchase?.image_url,
    purchase?.image,
  ];
  for (const value of variants) {
    const src = String(value || '').trim();
    if (src) return src;
  }
  return '';
}

function formatCompactStars(value: number): string {
  const abs = Math.abs(value);
  const compact = (num: number) => {
    const shown = num >= 10 ? num.toFixed(0) : num.toFixed(1);
    return shown.replace(/\.0$/, "");
  };

  if (abs >= 1_000_000_000) return `${compact(value / 1_000_000_000)}млрд`;
  if (abs >= 1_000_000) return `${compact(value / 1_000_000)}м`;
  if (abs >= 1_000) return `${compact(value / 1_000)}к`;
  return String(Math.trunc(value));
}

const Dashboard: React.FC<Props> = ({
  child,
  onUpdateChild,
  onTaskAction,
  pendingPurchases = [],
  pendingDream = null,
  onSetDreamGoal,
}) => {
  const [isEditingDream, setIsEditingDream] = useState(false);
  const [editPrompt, setEditPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [dreamGoalInput, setDreamGoalInput] = useState('');
  const [dreamGoalError, setDreamGoalError] = useState<string | null>(null);
  const [isDreamGoalSaving, setIsDreamGoalSaving] = useState(false);
  const { runInstant, isPending } = useInstantAction();
  
  const pendingMissions = child.missions.filter(m => m.status === 'pending');
  const [isMissionsExpanded, setIsMissionsExpanded] = useState(pendingMissions.length > 0);
  const [isPrizesExpanded, setIsPrizesExpanded] = useState(pendingPurchases.length > 0);
  const [isActivityExpanded, setIsActivityExpanded] = useState(false);

  const dreamCurrent = Number(child?.dream?.current ?? 0) || 0;
  const dreamPrice = Math.max(1, Number(child?.dream?.price ?? 0) || 0);
  const dreamRemaining = Math.max(0, dreamPrice - dreamCurrent);
  const progress = Math.min(100, (dreamCurrent / dreamPrice) * 100);
  const hasPendingDream = Boolean(pendingDream?.id);
  const dreamImageSrc = resolveDreamImageSrc(child?.dream?.image);
  const confirmedBalance = Math.trunc(Number(child?.balance?.confirmed ?? 0) || 0);
  const compactBalance = formatCompactStars(confirmedBalance);

  useEffect(() => {
    if (hasPendingDream) {
      setDreamGoalInput('');
      setDreamGoalError(null);
      setIsEditingDream(false);
    }
  }, [hasPendingDream, pendingDream?.id]);

  const handleAIEdit = async () => {
    if (!editPrompt) return;
    setIsGenerating(true);
    const result = await editImageWithAI(child.dream.image, `Примени эти визуальные изменения к изображению мечты: ${editPrompt}`);
    if (result) {
      onUpdateChild({
        ...child,
        dream: { ...child.dream, image: result }
      });
      setEditPrompt('');
      setIsEditingDream(false);
    }
    setIsGenerating(false);
  };

  const handleMissionAction = (missionId: string, action: 'confirm' | 'reject') => {
    let updatedMissions = [...child.missions];
    const index = updatedMissions.findIndex(m => m.id === missionId);
    if (index === -1) return;

    const mission = updatedMissions[index];
    const childCopy = { ...child };

    if (action === 'confirm') {
      childCopy.balance.confirmed += mission.reward;
      childCopy.balance.pending = Math.max(0, childCopy.balance.pending - mission.reward);
      
      const newActivity: Activity = {
        id: Math.random().toString(36).substr(2, 9),
        type: 'mission',
        description: `Миссия: ${mission.title}`,
        amount: mission.reward,
        date: 'Сегодня, ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      childCopy.activities = [newActivity, ...childCopy.activities];

      if (mission.isRecurring) {
        updatedMissions[index] = { ...mission, status: 'active' };
      } else {
        updatedMissions.splice(index, 1);
      }
    } else {
      updatedMissions[index] = { ...mission, status: 'active' };
      childCopy.balance.pending = Math.max(0, childCopy.balance.pending - mission.reward);
    }

    onUpdateChild({ ...childCopy, missions: updatedMissions });
  };

  const runTaskAction = async (missionId: string, action: 'confirm' | 'reject') => {
    const key = `dashboard-task:${action}:${missionId}`;
    if (isPending(key)) return;
    handleMissionAction(missionId, action);
    try {
      const started = await runInstant(key, async () => onTaskAction(missionId, action));
      if (started === null) return;
    } catch (err) {
      console.error('[Dashboard task action] error:', err);
    }
  };

  const handleDreamGoalSubmit = async () => {
    if (!pendingDream?.id || !onSetDreamGoal || isDreamGoalSaving) return;
    const amount = Number(dreamGoalInput);
    if (!Number.isFinite(amount) || amount <= 0) {
      setDreamGoalError('Введите сумму цели больше 0.');
      return;
    }
    setDreamGoalError(null);
    setIsDreamGoalSaving(true);
    try {
      await onSetDreamGoal(pendingDream.id, Math.round(amount));
    } catch (err: any) {
      setDreamGoalError(err?.message || 'Не удалось установить сумму мечты.');
    } finally {
      setIsDreamGoalSaving(false);
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-6 duration-700 pb-20">
      
      {/* 1. Блок «Детская мечта» / одобрение новой мечты */}
      {hasPendingDream ? (
        <div className="bg-[var(--bg-card)] rounded-[2.5rem] border border-amber-400/40 shadow-2xl p-6 sm:p-7">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-amber-300 mb-2">Новая мечта от ребенка</p>
          <h3 className="text-2xl font-black text-white leading-tight mb-5 truncate">{pendingDream?.title}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-start">
            <div>
              <input
                type="number"
                min={1}
                inputMode="numeric"
                placeholder="Введите сумму цели в звёздах"
                value={dreamGoalInput}
                onChange={(e) => setDreamGoalInput(e.target.value)}
                className="w-full rounded-2xl bg-black/50 border border-white/10 px-4 py-3 text-white font-black outline-none focus:border-amber-300/70"
              />
              {dreamGoalError ? (
                <p className="mt-2 text-[12px] text-rose-300 font-bold">{dreamGoalError}</p>
              ) : (
                <p className="mt-2 text-[11px] uppercase tracking-widest text-[var(--text-muted)] font-bold">Родитель задаёт цель накопления</p>
              )}
            </div>
            <button
              onClick={handleDreamGoalSubmit}
              disabled={isDreamGoalSaving}
              className="h-12 px-6 rounded-2xl bg-amber-400 text-black font-black uppercase tracking-wide shadow-xl shadow-amber-500/20 disabled:opacity-60 min-w-[170px]"
            >
              {isDreamGoalSaving ? 'Сохраняем…' : 'Установить сумму'}
            </button>
          </div>
        </div>
      ) : (
        child.dream.title && child.dream.title !== "Мечта" && (
          <div className="bg-[var(--bg-card)] rounded-[2.5rem] overflow-hidden border border-[var(--primary)]/30 shadow-2xl flex flex-row items-stretch h-36 sm:h-40 group w-full max-w-full">
            <div className="relative w-36 sm:w-40 flex-shrink-0 overflow-hidden">
              <img
                src={dreamImageSrc}
                alt={child.dream.title}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
                loading="lazy"
                decoding="async"
              />
              <div className="absolute inset-0 bg-black/30" />
              <button
                onClick={() => setIsEditingDream(true)}
                className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-lg p-2.5 rounded-xl text-white/90 hover:text-white transition-all border border-white/10"
              >
                <Sparkles size={20} />
              </button>
            </div>

            <div className="flex-1 p-5 sm:p-6 flex flex-col justify-between min-w-0">
              <div className="mb-2 min-w-0">
                <div className="flex items-baseline gap-2 min-w-0">
                  <h3 className="text-lg sm:text-xl font-black text-white truncate">{child.dream.title}</h3>
                  <span className="text-[11px] font-bold text-[var(--text-muted)] whitespace-nowrap">мечта ребенка</span>
                </div>
              </div>
              <div className="flex justify-end mb-3">
                <p className="text-[22px] sm:text-2xl font-black text-[var(--primary)] flex items-center gap-1.5 whitespace-nowrap">
                  <span>{dreamRemaining}</span>
                  <span className="text-white/50">/</span>
                  <span>{dreamPrice}</span>
                  <Star size={18} fill="currentColor" />
                </p>
              </div>
              <div className="relative h-2.5 bg-black/50 rounded-full overflow-hidden border border-white/5">
                <div
                  className="absolute h-full bg-gradient-to-r from-[var(--primary)] to-indigo-400 transition-all duration-1000"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>
        )
      )}

      {/* 2. Баланс */}
      <div className="grid grid-cols-2 gap-5 w-full max-w-full">
        <div className="relative bg-[var(--bg-card)] p-6 rounded-[2.2rem] border border-[var(--border)] shadow-xl w-full max-w-full min-w-0">
          <div className="absolute top-4 right-4 w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-400">
            <ArrowUpRight size={18} />
          </div>
          <div className="min-w-0 pr-12">
            <p className="text-[var(--text-muted)] text-[10px] font-black uppercase tracking-[0.2em] mb-2">Баланс</p>
            <p className="text-[34px] sm:text-[42px] leading-none font-black text-white flex items-center gap-1 min-w-0 whitespace-nowrap">
              <span title={String(confirmedBalance)}>{compactBalance}</span>
              <Star size={16} className="text-emerald-400 shrink-0" fill="currentColor" />
            </p>
          </div>
        </div>

        <div className="relative bg-[var(--bg-card)] p-6 rounded-[2.2rem] border border-[var(--border)] shadow-xl w-full max-w-full min-w-0">
          <div className="absolute top-4 right-4 w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-400">
            <Timer size={18} />
          </div>
          <div className="pr-12">
            <p className="text-[var(--text-muted)] text-[10px] font-black uppercase tracking-[0.2em] mb-2">Проверка</p>
            <p className="text-[34px] sm:text-[42px] leading-none font-black text-white/90 flex items-center gap-1 whitespace-nowrap">
              <span>{child.balance.pending}</span>
              <Star size={16} className="text-amber-500/60 shrink-0" fill="currentColor" />
            </p>
          </div>
        </div>
      </div>

      {/* 3. Дашборд миссий */}
      <div className={`bg-[var(--bg-card)] rounded-[2.5rem] border transition-all duration-300 ${isMissionsExpanded ? 'border-amber-400/50 shadow-xl' : 'border-[var(--border)] shadow-lg'}`}>
        <button onClick={() => setIsMissionsExpanded(!isMissionsExpanded)} className="w-full flex items-center justify-between p-7">
          <div className="basis-[88px] shrink-0 flex justify-start">
            <div className={`p-3.5 rounded-2xl ${isMissionsExpanded ? 'bg-amber-400/20 text-amber-400 shadow-inner' : 'bg-white/5 text-[var(--text-muted)]'}`}>
              <ClipboardCheck size={26} />
            </div>
          </div>
          <h4 className="text-lg font-black uppercase tracking-[0.2em] text-white flex-1 text-center px-2">Миссии на проверку</h4>
          <div className="basis-[88px] shrink-0 flex items-center justify-end gap-2">
            {pendingMissions.length > 0 && (
              <span className="inline-flex items-center justify-center min-w-11 h-11 bg-amber-400 text-black text-[12px] font-black px-3 py-1.5 rounded-full shadow-lg">
                {pendingMissions.length}
              </span>
            )}
            <ChevronDown size={24} className={`text-[var(--text-muted)] transition-transform duration-500 ${isMissionsExpanded ? 'rotate-180' : ''}`} />
          </div>
        </button>

        {isMissionsExpanded && (
          <div className="p-7 pt-0 space-y-4 animate-in fade-in slide-in-from-top-2">
            {pendingMissions.length === 0 ? (
              <p className="text-center py-6 text-[12px] font-black text-[var(--text-muted)] uppercase tracking-widest">Нет задач на проверку</p>
            ) : (
              pendingMissions.map(m => (
                <div key={m.id} className="flex items-center justify-between p-6 bg-white/[0.03] rounded-[2.2rem] border border-white/10 shadow-lg">
                  <div className="min-w-0 pr-4">
                    <p className="text-xl font-black text-white truncate mb-2 leading-tight">{m.title}</p>
                    <p className="text-lg text-amber-400 font-black">+{m.reward} <Star size={16} fill="currentColor" className="inline mb-1" /></p>
                  </div>
                  <div className="flex gap-4">
<button
  onClick={() => runTaskAction(m.id, "confirm")}
  disabled={isPending(`dashboard-task:confirm:${m.id}`)}
  className="w-14 h-14 bg-emerald-500 text-black rounded-[1.3rem] flex items-center justify-center shadow-xl shadow-emerald-500/20 active:scale-95 transition-all disabled:opacity-50"
>
  <Check size={30} strokeWidth={3} />
</button>

<button
  onClick={() => runTaskAction(m.id, "reject")}
  disabled={isPending(`dashboard-task:reject:${m.id}`)}
  className="w-14 h-14 bg-rose-500/10 text-rose-500 rounded-[1.3rem] flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all border border-rose-500/20 disabled:opacity-50"
>
  <X size={24} strokeWidth={3} />
</button>                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* 4. Награды */}
      <div className={`bg-[var(--bg-card)] rounded-[2.5rem] border transition-all duration-300 ${isPrizesExpanded ? 'border-[var(--primary)]/50 shadow-xl' : 'border-[var(--border)] shadow-lg'}`}>
        <button onClick={() => setIsPrizesExpanded(!isPrizesExpanded)} className="w-full flex items-center justify-between p-7">
          <div className="basis-[88px] shrink-0 flex justify-start">
            <div className={`p-3.5 rounded-2xl ${isPrizesExpanded ? 'bg-[var(--primary)]/20 text-[var(--primary)] shadow-inner' : 'bg-white/5 text-[var(--text-muted)]'}`}>
              <Gift size={26} />
            </div>
          </div>
          <h4 className="text-lg font-black uppercase tracking-[0.2em] text-white flex-1 text-center leading-tight px-2">
            Вручить<br/>награды
          </h4>
          <div className="basis-[88px] shrink-0 flex items-center justify-end gap-2">
            {pendingPurchases.length > 0 && (
              <span className="inline-flex items-center justify-center min-w-11 h-11 bg-[var(--primary)] text-black text-[12px] font-black px-3 py-1.5 rounded-full shadow-lg">
                {pendingPurchases.length}
              </span>
            )}
            <ChevronDown size={24} className={`text-[var(--text-muted)] transition-transform duration-500 ${isPrizesExpanded ? 'rotate-180' : ''}`} />
          </div>
        </button>
        
        {isPrizesExpanded && (
          <div className="p-7 pt-0 space-y-4 animate-in fade-in slide-in-from-top-2">
            {pendingPurchases.length === 0 ? (
              <p className="text-center py-6 text-[12px] font-black text-[var(--text-muted)] uppercase tracking-widest">Нет наград к выдаче</p>
            ) : (
              pendingPurchases.map((p) => {
                const rewardImageSrc = resolvePendingRewardImageSrc(p);
                return (
                <div key={p.id} className="flex items-center gap-5 p-6 bg-white/[0.03] rounded-[2.2rem] border border-white/10 shadow-lg hover:bg-white/[0.05] transition-all">
                  <div className="relative flex-shrink-0">
                    <div className="w-14 h-14 rounded-[1.1rem] flex items-center justify-center border border-white/10 shadow-lg bg-white/5 overflow-hidden">
                      {rewardImageSrc ? (
                        <img
                          src={rewardImageSrc}
                          alt={p.reward_title || 'reward'}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          decoding="async"
                        />
                      ) : (
                        <span className="text-3xl leading-none">{p.reward_icon || '🎁'}</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h5 className="text-xl font-black text-white truncate leading-tight mb-2">{p.reward_title}</h5>
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-2 text-lg text-[var(--text-muted)] font-black">
                        <span>{p.price}</span>
                        <Star size={18} fill="currentColor" className="text-amber-400" />
                      </div>
                      <div className="flex items-center gap-2 text-amber-400/90 font-black animate-pulse mt-1">
                        <Hourglass size={14} />
                        <span className="text-[11px] font-black uppercase tracking-[0.15em]">Ожидает вручения</span>
                      </div>
                    </div>
                  </div>
                </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* 5. Активность (Выпадающий список) */}
      <div className={`bg-[var(--bg-card)] rounded-[2.5rem] border transition-all duration-300 ${isActivityExpanded ? 'border-white/20 shadow-xl' : 'border-[var(--border)] shadow-sm'}`}>
        <button onClick={() => setIsActivityExpanded(!isActivityExpanded)} className="w-full flex items-center justify-between p-7">
          <div className="basis-[88px] shrink-0 flex justify-start">
            <div className={`p-3.5 rounded-2xl ${isActivityExpanded ? 'bg-white/10 text-white shadow-inner' : 'bg-white/5 text-[var(--text-muted)]'}`}>
              <History size={26} />
            </div>
          </div>
          <h4 className="text-lg font-black uppercase tracking-[0.2em] text-white flex-1 text-center px-2">Активность</h4>
          <div className="basis-[88px] shrink-0 flex items-center justify-end gap-2">
            <span
              className="inline-flex items-center justify-center min-w-11 h-11 bg-[var(--primary)] text-black text-[12px] font-black px-3 py-1.5 rounded-full shadow-lg opacity-0 pointer-events-none select-none"
              aria-hidden="true"
            >
              0
            </span>
            <ChevronDown size={24} className={`text-[var(--text-muted)] transition-transform duration-500 ${isActivityExpanded ? 'rotate-180' : ''}`} />
          </div>
        </button>

        {isActivityExpanded && (
          <div className="p-7 pt-0 space-y-6 animate-in fade-in slide-in-from-top-2">
            {child.activities.length === 0 ? (
              <p className="text-center py-6 text-[12px] font-black text-[var(--text-muted)] uppercase tracking-widest">
                Истории пока нет
              </p>
            ) : (
              [...child.activities]
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .slice(0, 7)
                .map((a) => (
                  <div key={a.id} className="flex items-center justify-between gap-6 px-2">
                    <div className="flex items-center gap-5 min-w-0">
                      <div
                        className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-lg border border-white/5 
                          ${a.amount >= 0 ? "bg-emerald-500/10" : "bg-rose-500/10"}`}
                      >
                        {a.type === "mission" ? "🎯" : "🎁"}
                      </div>

                      <div className="min-w-0">
                        <p className="text-lg font-black text-white/95 truncate leading-tight">
                          {a.description}
                        </p>
                        <p className="text-[11px] text-[var(--text-muted)] uppercase font-bold tracking-[0.1em] mt-1.5">
                          {a.date}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`text-xl font-black flex items-center gap-1.5 flex-shrink-0 
                        ${a.amount >= 0 ? "text-emerald-500" : "text-rose-500"}`}
                    >
                      {a.amount >= 0 ? `+${a.amount}` : `${a.amount}`}
                      <Star size={16} fill="currentColor" />
                    </span>
                  </div>
                ))
            )}          
</div>
        )}
      </div>

      {/* 6. Где мой ребенок (Скоро) */}
      <div className="bg-[var(--bg-card)] rounded-[2.5rem] border border-[var(--border)] overflow-hidden shadow-xl relative">
        <div className="p-7 bg-black/20">
          <div className="flex items-center justify-between gap-4">
            <div className="basis-[88px] shrink-0 flex justify-start">
              <div className="p-3.5 rounded-2xl bg-indigo-500/10 text-indigo-400">
                <MapPin size={26} />
              </div>
            </div>
            <div className="flex-1 min-w-0 text-center px-2">
              <h4 className="text-lg font-black uppercase tracking-[0.2em] text-white">Где мой ребенок</h4>
              <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mt-1 max-w-[320px] mx-auto">
                Геолокация и маршрут скоро появятся
              </p>
            </div>
            <div className="basis-[88px] shrink-0 flex justify-end">
              <span className="px-3 py-1.5 rounded-full bg-indigo-500/15 text-indigo-300 text-[10px] font-black uppercase tracking-widest border border-indigo-400/30">
                Скоро
              </span>
            </div>
          </div>
        </div>

        <div className="px-7 pb-7 pt-3">
          <div className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-indigo-500/10 via-black/20 to-black/40 px-5 py-6">
            <div className="flex items-start gap-3">
              <ShieldCheck size={18} className="text-emerald-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm leading-relaxed text-white/80">
                Мы готовим безопасный модуль геолокации для родителей: текущая точка ребенка, история перемещений и уведомления о выходе из безопасной зоны.
              </p>
            </div>
          </div>
        </div>
      </div>

      {isEditingDream && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-2xl">
          <div className="bg-[var(--bg-card)] w-full max-sm rounded-[3rem] p-10 border border-[var(--primary)]/40 shadow-2xl animate-in zoom-in-95 duration-300">
            <h3 className="text-2xl font-black mb-6 flex items-center gap-4 text-white">
              <Sparkles className="text-[var(--primary)]" />
              ИИ-Редактор
            </h3>
            <textarea
              className="w-full rounded-2xl p-6 text-lg font-bold bg-black/50 border border-white/10 outline-none transition-all mb-8 h-48 resize-none focus:ring-2 focus:ring-[var(--primary)] focus:bg-black/70 shadow-inner"
              placeholder="Как изменим мечту?"
              value={editPrompt}
              onChange={(e) => setEditPrompt(e.target.value)}
            />
            <div className="flex gap-4">
              <button onClick={() => setIsEditingDream(false)} className="flex-1 py-5 text-sm font-black text-[var(--text-muted)] hover:text-white transition-colors uppercase tracking-widest">Отмена</button>
              <button disabled={isGenerating || !editPrompt} onClick={handleAIEdit} className="btn-primary flex-[2] py-5 text-lg font-black rounded-2xl shadow-xl shadow-[var(--primary)]/30">
                {isGenerating ? <Loader2 className="animate-spin mx-auto" /> : 'Обновить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
